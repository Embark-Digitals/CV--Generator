# Initial User Setup

CV Machine is a private application. Public signup is disabled. The initial
account (Paulina) is created administratively.

## Creating the initial account

Option A — Supabase Dashboard:

1. Open the project → Authentication → Users → **Add user**.
2. Choose **Create new user**, enter her email and a strong temporary
   password, and tick **Auto Confirm User**.
3. Share the temporary password through a secure channel (never chat or
   email in plain text) and have her change it immediately via
   the app's password-reset flow or Settings.

Option B — Admin API (server-side only, service-role key required):

```bash
curl -X POST "https://PROJECT_REF.supabase.co/auth/v1/admin/users" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"TEMP_PASSWORD","email_confirm":true}'
```

Run this from a trusted machine only. Never commit or paste the service-role
key into the repository or the browser.

## Disabling public registration

1. Dashboard → Authentication → Sign In / Up → disable **Allow new users to
   sign up**.
2. The application exposes no signup UI.
3. RLS restricts every table to `auth.uid()`-owned rows, so even an
   unexpectedly created user could only ever see their own (empty) data.

## Email (SMTP) — deferred

Password-recovery emails use Supabase's built-in sender, which is
rate-limited and intended for development. Before regular production use,
configure custom SMTP: Dashboard → Project Settings → Authentication →
SMTP. Recommended: a transactional provider (Resend, Postmark, SES) with a
`no-reply@` address on an Embark Digitals domain. This does not block the
private MVP.
