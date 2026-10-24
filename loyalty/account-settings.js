// J&G Suki Rewards — P1H-A12 signed-in account settings.
// Account-only changes; no purchase, voucher, profile-role, or stamp mutations.
let accountDialog = null;

const html = `
  <div class="jg-as-panel">
    <div class="jg-as-head">
      <div><div class="jg-as-kicker">J&G SUKI REWARDS</div><h2 id="jg-as-title">Account settings</h2><p>Manage your sign-in email and password securely.</p></div>
      <button type="button" class="jg-as-close" data-jg-close aria-label="Close account settings"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="jg-as-content">
      <section class="jg-as-section" aria-labelledby="jg-as-email-title">
        <h3 id="jg-as-email-title">Change email address</h3>
        <p class="jg-as-help">Current email: <strong id="jg-as-current-email">Checking…</strong></p>
        <form id="jg-as-email-form">
          <label for="jg-as-new-email">New email address</label>
          <input id="jg-as-new-email" name="newEmail" type="email" autocomplete="email" maxlength="254" required placeholder="new@example.com">
          <label for="jg-as-confirm-email">Confirm new email address</label>
          <input id="jg-as-confirm-email" name="confirmEmail" type="email" autocomplete="off" maxlength="254" required placeholder="Repeat your new email">
          <button class="jg-as-submit" type="submit">Send email confirmation</button>
          <div id="jg-as-email-status" class="jg-as-status" role="status" aria-live="polite"></div>
        </form>
        <p class="jg-as-help">Your current email remains active until Supabase verifies the change. If Secure Email Change is enabled, check both your current and new inboxes.</p>
      </section>
      <section class="jg-as-section jg-as-verification" aria-labelledby="jg-as-password-title">
        <h3 id="jg-as-password-title">Change password</h3>
        <div class="jg-as-verify-step"><span class="jg-as-step-number" aria-hidden="true">1</span><div><strong>Verify through your email</strong><p class="jg-as-help">Before you can set a new password, open a secure password verification link in your current confirmed email inbox.</p></div></div>
        <p class="jg-as-help">Verification email will be sent to <strong id="jg-as-password-email">Checking…</strong>.</p>
        <button class="jg-as-submit" id="jg-as-password-link" type="button">Send password verification email</button>
        <div id="jg-as-password-status" class="jg-as-status" role="status" aria-live="polite"></div>
        <div class="jg-as-verify-step"><span class="jg-as-step-number" aria-hidden="true">2</span><div><strong>Set your new password</strong><p class="jg-as-help">Click the link in the email. The verified reset page will ask for your new password and confirmation, both with eye buttons to show or hide what you typed.</p></div></div>
        <p class="jg-as-help">Your existing password will NOT be changed by this button. Do not share verification links or codes. If the link expires, request a new one.</p>
      </section>
    </div>
  </div>`;

function status(el, message, kind = '') {
  el.textContent = message;
  el.dataset.kind = kind;
}
function getField(form, name) {
  return String(new FormData(form).get(name) || '');
}
function strongPassword(password) {
  return password.length >= 8 && password.length <= 128;
}
function hasCurrentSession(api) {
  return Boolean(api?.session?.access_token);
}
export async function openAccountSettings(api) {
  if (!hasCurrentSession(api)) throw new Error('Sign in to manage your account.');
  if (accountDialog?.open) { accountDialog.focus(); return; }
  if (accountDialog) { accountDialog.remove(); accountDialog = null; }

  const dialog = document.createElement('dialog');
  dialog.id = 'jg-account-settings-dialog';
  dialog.className = 'jg-account-dialog';
  dialog.setAttribute('aria-labelledby', 'jg-as-title');
  dialog.innerHTML = html;
  document.body.appendChild(dialog);
  accountDialog = dialog;
  dialog.addEventListener('close', () => {
    dialog.querySelectorAll('input').forEach(input => { input.value = ''; });
    dialog.remove();
    if (accountDialog === dialog) accountDialog = null;
  }, { once: true });
  dialog.querySelector('[data-jg-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.showModal();

  const currentEl = dialog.querySelector('#jg-as-current-email');
  const emailForm = dialog.querySelector('#jg-as-email-form');
  const emailStatus = dialog.querySelector('#jg-as-email-status');
  const passwordStatus = dialog.querySelector('#jg-as-password-status');
  const emailButton = emailForm.querySelector('[type="submit"]');
  const passwordLinkButton = dialog.querySelector('#jg-as-password-link');
  const passwordEmail = dialog.querySelector('#jg-as-password-email');
  let accountEmail = '';
  let busy = false;

  function setBusy(next) {
    busy = next;
    emailButton.disabled = next;
    passwordLinkButton.disabled = next;
  }
  async function guard(fn, stateElement) {
    if (busy) return;
    if (!navigator.onLine) { status(stateElement, 'Reconnect to the internet to update your account.', 'error'); return; }
    if (!hasCurrentSession(api)) { status(stateElement, 'Your session expired. Sign in again.', 'error'); return; }
    setBusy(true);
    try { await fn(); }
    catch (error) { status(stateElement, error?.message || 'Account update failed. Please try again.', 'error'); }
    finally { setBusy(false); }
  }

  try {
    if (!navigator.onLine) throw new Error('Offline: changes are unavailable.');
    const info = await api.accountIdentity();
    if (!dialog.open) return;
    accountEmail = String(info?.email || '').trim();
    currentEl.textContent = accountEmail || 'No email available';
    passwordEmail.textContent = accountEmail || 'No email available';
  } catch (error) {
    if (dialog.open) {
      currentEl.textContent = 'Unable to load';
      passwordEmail.textContent = 'Unable to load';
      status(emailStatus, 'Account identity could not be verified: ' + (error?.message || 'Try again.'), 'error');
    }
  }

  emailForm.addEventListener('submit', event => {
    event.preventDefault();
    void guard(async () => {
      if (!accountEmail) throw new Error('Current account email unavailable. Reopen Account settings.');
      const newEmail = getField(emailForm, 'newEmail').trim().toLowerCase();
      const confirmEmail = getField(emailForm, 'confirmEmail').trim().toLowerCase();
      if (newEmail !== confirmEmail) throw new Error('The new email addresses do not match.');
      if (newEmail === accountEmail.toLowerCase()) throw new Error('Enter a different email address.');
      status(emailStatus, 'Submitting email change…');
      await api.requestAccountEmailChange(newEmail);
      emailForm.reset();
      status(emailStatus, 'Email change requested. Check your old and new inboxes for confirmation links. Your current email stays active until verified.', 'success');
    }, emailStatus);
  });

  // P1H-A15-EMAIL-VERIFIED-PASSWORD-20261024: mandatory confirmation-link first; never call PUT /user here.
  passwordLinkButton.addEventListener('click', () => {
    void guard(async () => {
      if (!accountEmail) throw new Error('Your account email is unavailable. Reopen Account settings.');
      // Fetch from Supabase Auth now, rather than trusting the initially displayed email.
      const latest = await api.accountIdentity();
      const verified = String(latest?.email || '').trim().toLowerCase();
      if (!verified || verified !== accountEmail.toLowerCase()) throw new Error('Account email changed. Reopen settings before requesting verification.');
      if (!latest?.email_confirmed_at) throw new Error('Confirm your current account email before changing your password.');
      status(passwordStatus, 'Sending a password verification link to your email…');
      await api.recover(verified);
      status(passwordStatus, 'Verification email requested. Your password has NOT changed. Open the new email, follow its link, and use the eye buttons on the verified reset page to create your new password.', 'success');
    }, passwordStatus);
  });

}

// P1H-A13-MOBILE-SETTINGS-UI-20261024: accessible centered close icon; dialog/auth handlers unchanged.
