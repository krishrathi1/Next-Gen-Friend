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

### If Login Works But Data Is Not Saving
Run this patch in Supabase SQL Editor:

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_signin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own profile." ON public.users;
CREATE POLICY "Users can create their own profile."
ON public.users FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own profile." ON public.users;
CREATE POLICY "Users can view their own profile."
ON public.users FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.users;
CREATE POLICY "Users can update their own profile."
ON public.users FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own device." ON public.user_devices;
CREATE POLICY "Users can view their own device."
ON public.user_devices FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own device." ON public.user_devices;
CREATE POLICY "Users can insert their own device."
ON public.user_devices FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own device." ON public.user_devices;
CREATE POLICY "Users can update their own device."
ON public.user_devices FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own signin logs." ON public.user_signin_logs;
CREATE POLICY "Users can view their own signin logs."
ON public.user_signin_logs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own signin logs." ON public.user_signin_logs;
CREATE POLICY "Users can insert their own signin logs."
ON public.user_signin_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);
```
