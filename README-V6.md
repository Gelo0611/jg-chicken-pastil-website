# J&G Chicken Pastil V6 — Owner Website Control Center

New owner-managed features:
- BikeCart location manager
- Product Available / Sold Out toggles
- Website announcement manager
- Customer review add/edit/hide/delete manager
- Current BikeCart location included in prepared Messenger orders

## One-time database upgrade
1. Open `supabase-v6-upgrade.sql`.
2. Replace every `YOUR_OWNER_EMAIL` with the same Supabase owner email you use for the owner dashboard.
3. Copy the whole SQL file.
4. Supabase → SQL Editor → New query → Paste → Run.
5. After it succeeds, deploy the V6 website files.

## Files to copy into the website root
- index.html
- styles.css
- script.js
- location.js
- location-config.js
- owner-location.html
- owner-location.css
- owner-location.js

Keep the existing `assets` folder.

Owner page:
`https://jg-chicken-pastil-website.vercel.app/owner-location.html`
