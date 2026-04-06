## IRIS-AI Supabase Setup

1. Open Supabase SQL Editor and run [`schema.sql`](./schema.sql).
2. In Supabase Dashboard, enable `Google` provider in `Authentication -> Providers`.
3. Add this redirect URL in `Authentication -> URL Configuration`:
`http://127.0.0.1:54321/auth/callback`
4. Optional fallback redirect URL:
`iris://oauth-callback`
4. Keep these values in `IRIS-AI/.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_REDIRECT_URL=http://127.0.0.1:54321/auth/callback`

Notes:
- This setup is only for `IRIS-AI`.
- No files in `IRIS-Web` are used or modified by this setup.
- `user_devices` enforces one-PC binding per account.
- `user_signin_logs` stores sign-in success/blocked events with device details.
- IRIS-AI auth is configured to require a fresh sign-in on each app restart.
- `users` has an INSERT policy so first-time Google users can auto-create profile rows.
