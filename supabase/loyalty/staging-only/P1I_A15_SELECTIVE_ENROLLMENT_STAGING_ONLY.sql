-- J&G Suki Rewards P1I-A15: SELECTIVE ENROLLMENT DELTA
-- STAGING ONLY: Supabase project ptolespxxjvbvtzvlapr
-- DO NOT RUN in production cajyvzrcwouxcvchcgdb
-- First review and run as one entire SQL script in staging SQL Editor.
-- Transactional, no data migration; keeps existing loyalty tables and all existing accounts.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $preflight$
DECLARE v_missing text; v_attached boolean;
BEGIN
  SELECT string_agg(x.name, ', ' ORDER BY x.name) INTO v_missing
  FROM (VALUES
    ('jg_profiles'), ('jg_members'), ('jg_cycles'), ('jg_orders'),
    ('jg_stamp_ledger'), ('jg_vouchers'), ('jg_claims'),
    ('jg_notifications'), ('jg_employee_access_audit')
  ) AS x(name)
  WHERE to_regclass('public.' || x.name) IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: Staging loyalty tables missing: %', v_missing;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
    WHERE t.tgrelid = 'auth.users'::regclass
      AND t.tgname = 'jg_on_auth_signup'
      AND t.tgfoid = 'private.jg_after_signup()'::regprocedure
      AND NOT t.tgisinternal
      AND t.tgenabled = 'O'
  ) INTO v_attached;
  IF NOT v_attached THEN
    RAISE EXCEPTION 'STOP: Expected active staging jg_on_auth_signup trigger missing or changed.';
  END IF;
END;
$preflight$;

-- Only an authenticated, email-verified user may explicitly request membership.
-- This routine never accepts a requested role or another user's id.
-- The auth.users lock serializes duplicate enrollment requests by the same user.
CREATE OR REPLACE FUNCTION private.jg_enroll_me()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $enroll$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_meta jsonb;
  v_name text;
  v_member uuid;
  v_created boolean := false;
  v_active boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Sign in before enrolling' USING errcode = '42501';
  END IF;

  SELECT u.email, u.raw_user_meta_data
  INTO v_email, v_meta
  FROM auth.users u
  WHERE u.id = v_actor
    AND u.email_confirmed_at IS NOT NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verify your email before enrolling' USING errcode = '42501';
  END IF;

  v_name := left(
    coalesce(
      nullif(btrim(v_meta ->> 'full_name'), ''),
      nullif(split_part(v_email, '@', 1), ''),
      'Suki Member'
    ),
    100
  );

  IF NOT EXISTS (SELECT 1 FROM public.jg_profiles p WHERE p.user_id = v_actor) THEN
    INSERT INTO public.jg_profiles(user_id, full_name, role, active)
    VALUES (v_actor, v_name, 'customer', true)
    ON CONFLICT (user_id) DO NOTHING;
    v_created := FOUND;
  END IF;

  SELECT p.active INTO v_active
  FROM public.jg_profiles p WHERE p.user_id = v_actor;
  IF NOT COALESCE(v_active, false) THEN
    RAISE EXCEPTION 'Account is disabled or profile unavailable' USING errcode = '42501';
  END IF;

  SELECT m.id INTO v_member
  FROM public.jg_members m WHERE m.user_id = v_actor;
  IF v_member IS NULL THEN
    v_member := gen_random_uuid();
    INSERT INTO public.jg_members (id, user_id, member_code)
    VALUES (v_member, v_actor, 'JG-' || upper(substr(replace(v_member::text, '-', ''), 1, 10)))
    ON CONFLICT (user_id) DO NOTHING;
    SELECT m.id INTO v_member FROM public.jg_members m WHERE m.user_id = v_actor;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.jg_cycles c WHERE c.member_id = v_member) THEN
    INSERT INTO public.jg_cycles(member_id, sequence)
    VALUES (v_member, 1)
    ON CONFLICT (member_id, sequence) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('enrolled', true, 'created', v_created);
END;
$enroll$;

CREATE OR REPLACE FUNCTION public.jg_enroll_me()
RETURNS jsonb
LANGUAGE sql
SET search_path TO ''
AS $wrapper$
  SELECT private.jg_enroll_me();
$wrapper$;

-- Explicit callable roles. PUBLIC receives EXECUTE by default on new functions;
-- revocations occur inside the same transaction before commit.
REVOKE ALL ON FUNCTION private.jg_enroll_me() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.jg_enroll_me() FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.jg_enroll_me() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jg_enroll_me() TO authenticated;

-- Remove ONLY the known staging loyalty automatic trigger. Keep the function
-- definition intact for audit/history; do not change any other auth triggers.
DROP TRIGGER jg_on_auth_signup ON auth.users;
COMMIT;
