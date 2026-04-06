## IRIS-AI Supabase Setup

1. Open Supabase SQL Editor and run [`schema.sql`](./schema.sql).
2. In Supabase Dashboard, enable `Google` provider in `Authentication -> Providers`.
3. Add this redirect URL in `Authentication -> URL Configuration`:
`iris://oauth-callback`
4. Keep these values in `IRIS-AI/.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_REDIRECT_URL=iris://oauth-callback`

Notes:
- This setup is only for `IRIS-AI`.
- No files in `IRIS-Web` are used or modified by this setup.

