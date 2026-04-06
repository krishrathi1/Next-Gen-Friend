import { supabase } from '@renderer/config/supabase'
import type { Session, User } from '@supabase/supabase-js'
import type { CloudUserProfile } from '@renderer/store/auth-store'

const DEFAULT_REDIRECT = 'http://127.0.0.1:54321/auth/callback'
const OAUTH_INTENT_KEY = 'iris.oauth.intent'
const AUTH_FLASH_KEY = 'iris.auth.flash'

export type OAuthMode = 'signin' | 'signup'
export type AuthFlashMessage = { type: 'error' | 'success'; text: string }
export type OAuthCompletionResult = { status: 'authenticated'; token: string }
export type EmailSignUpResult =
  | { status: 'authenticated'; token: string }
  | { status: 'registered'; message: string }

type DeviceDetails = {
  fingerprint: string
  deviceName: string
  platform: string
  osVersion: string
  arch: string
  appVersion: string
}

function storeOAuthIntent(mode: OAuthMode): void {
  window.localStorage.setItem(OAUTH_INTENT_KEY, mode)
}

function consumeOAuthIntent(): OAuthMode {
  const mode = window.localStorage.getItem(OAUTH_INTENT_KEY)
  window.localStorage.removeItem(OAUTH_INTENT_KEY)
  return mode === 'signup' ? 'signup' : 'signin'
}

export function setAuthFlashMessage(message: AuthFlashMessage): void {
  window.localStorage.setItem(AUTH_FLASH_KEY, JSON.stringify(message))
}

export function consumeAuthFlashMessage(): AuthFlashMessage | null {
  const raw = window.localStorage.getItem(AUTH_FLASH_KEY)
  if (!raw) return null

  window.localStorage.removeItem(AUTH_FLASH_KEY)

  try {
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      (parsed.type === 'error' || parsed.type === 'success') &&
      typeof parsed.text === 'string'
    ) {
      return parsed as AuthFlashMessage
    }
  } catch {
  }

  return null
}

async function getCurrentDeviceDetails(): Promise<DeviceDetails> {
  const details = await window.electron?.ipcRenderer?.invoke('get-device-details')

  if (!details?.fingerprint) {
    throw new Error('Failed to read this device details.')
  }

  return details as DeviceDetails
}

async function appendSignInLog(
  userId: string,
  device: DeviceDetails,
  event: 'SIGN_IN_SUCCESS' | 'SIGN_IN_BLOCKED'
): Promise<void> {
  await supabase.from('user_signin_logs').insert({
    user_id: userId,
    device_fingerprint: device.fingerprint,
    device_name: device.deviceName,
    os: device.osVersion,
    platform: device.platform,
    arch: device.arch,
    event
  })
}

function getUserProfilePayload(user: User, overrides?: Partial<Record<'status' | 'name' | 'email', string>>) {
  return {
    id: user.id,
    email: overrides?.email || user.email || '',
    name:
      overrides?.name ||
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      'IRIS User',
    google_id: (user.user_metadata?.sub as string) || null,
    verified: user.email_confirmed_at != null,
    ...(overrides?.status ? { status: overrides.status } : {})
  }
}

export async function ensureCloudUserProfile(user: User): Promise<void> {
  const { error } = await supabase.from('users').upsert(getUserProfilePayload(user), {
    onConflict: 'id'
  })

  if (error) {
    if ((error as any).code === '42P01') {
      throw new Error(
        'Supabase table missing. Run IRIS-AI/supabase/schema.sql in SQL Editor first.'
      )
    }
    if ((error as any).code === '42501') {
      throw new Error(
        'RLS policy missing for users insert. Re-run IRIS-AI/supabase/schema.sql in SQL Editor.'
      )
    }
    throw new Error(error.message)
  }
}

export async function ensureUserAccessStatus(user: User): Promise<'approved' | 'rejected'> {
  const { data, error } = await supabase
    .from('users')
    .select('status')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    if ((error as any).code === '42P01') {
      throw new Error(
        'Supabase table missing. Run IRIS-AI/supabase/schema.sql in SQL Editor first.'
      )
    }
    if ((error as any).code === '42501') {
      throw new Error(
        'RLS policy missing for users access. Re-run IRIS-AI/supabase/schema.sql in SQL Editor.'
      )
    }
    throw new Error(`Could not read user status: ${error.message}`)
  }

  if (!data || !data.status || data.status === 'pending') {
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({ ...getUserProfilePayload(user), status: 'approved' }, { onConflict: 'id' })

    if (upsertError) {
      if ((upsertError as any).code === '42P01') {
        throw new Error(
          'Supabase table missing. Run IRIS-AI/supabase/schema.sql in SQL Editor first.'
        )
      }
      if ((upsertError as any).code === '42501') {
        throw new Error(
          'RLS policy missing for users upsert. Re-run IRIS-AI/supabase/schema.sql in SQL Editor.'
        )
      }
      throw new Error(upsertError.message)
    }

    return 'approved'
  }

  await ensureCloudUserProfile(user)
  return data.status === 'rejected' ? 'rejected' : 'approved'
}

export async function enforceSingleDeviceForUser(userId: string): Promise<void> {
  const device = await getCurrentDeviceDetails()

  const { data: existing, error: existingError } = await supabase
    .from('user_devices')
    .select('user_id,device_fingerprint')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) {
    if ((existingError as any).code === '42P01') {
      throw new Error(
        'Supabase table missing. Run IRIS-AI/supabase/schema.sql in SQL Editor first.'
      )
    }
    throw new Error(existingError.message)
  }

  if (existing?.device_fingerprint && existing.device_fingerprint !== device.fingerprint) {
    await appendSignInLog(userId, device, 'SIGN_IN_BLOCKED')
    await supabase.auth.signOut()
    throw new Error('This account is already linked to another PC. Only one device is allowed.')
  }

  const { error: upsertError } = await supabase.from('user_devices').upsert(
    {
      user_id: userId,
      device_fingerprint: device.fingerprint,
      device_name: device.deviceName,
      platform: device.platform,
      os: device.osVersion,
      arch: device.arch,
      app_version: device.appVersion,
      last_seen: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  )

  if (upsertError) {
    if ((upsertError as any).code === '42P01') {
      throw new Error(
        'Supabase table missing. Run IRIS-AI/supabase/schema.sql in SQL Editor first.'
      )
    }
    throw new Error(upsertError.message)
  }

  // Keep compatibility with existing "users.hwids" shape.
  await supabase.from('users').update({ hwids: [device.fingerprint] }).eq('id', userId)
  await appendSignInLog(userId, device, 'SIGN_IN_SUCCESS')
}

async function finalizeOAuthSession(
  session: Session | null,
  user: User | null,
  _intent: OAuthMode
): Promise<OAuthCompletionResult> {
  if (!session?.access_token || !user?.id) {
    throw new Error('OAuth callback did not return a valid session.')
  }

  const status = await ensureUserAccessStatus(user)

  if (status === 'rejected') {
    await supabase.auth.signOut()
    throw new Error('Your account has been rejected. Contact support.')
  }

  await enforceSingleDeviceForUser(user.id)

  return {
    status: 'authenticated',
    token: session.access_token
  }
}

export async function startGoogleOAuth(mode: OAuthMode = 'signin'): Promise<void> {
  const redirectTo = import.meta.env.VITE_SUPABASE_REDIRECT_URL || DEFAULT_REDIRECT
  storeOAuthIntent(mode)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: mode === 'signup' ? 'consent' : 'select_account'
      }
    }
  })

  if (error) {
    window.localStorage.removeItem(OAUTH_INTENT_KEY)
    throw error
  }

  if (!data?.url) {
    window.localStorage.removeItem(OAUTH_INTENT_KEY)
    throw new Error('Supabase did not return an OAuth URL.')
  }

  window.open(data.url, '_blank')
}

export async function completeOAuthFromDeepLink(rawUrl: string): Promise<OAuthCompletionResult> {
  const intent = consumeOAuthIntent()
  const parsed = new URL(rawUrl.replace('iris://', 'http://localhost/'))

  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash
  const hashParams = new URLSearchParams(hash)

  const accessToken = parsed.searchParams.get('access_token') || hashParams.get('access_token')
  const refreshToken = parsed.searchParams.get('refresh_token') || hashParams.get('refresh_token')
  const authCode = parsed.searchParams.get('code') || hashParams.get('code')

  if (authCode) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(authCode)
    if (error) throw error

    return finalizeOAuthSession(data.session, data.user, intent)
  }

  if (!accessToken || !refreshToken) {
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (session?.access_token && session?.user?.id) {
      return finalizeOAuthSession(session, session.user, intent)
    }

    throw new Error('OAuth callback did not contain a session token.')
  }

  const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  if (error) throw error

  return finalizeOAuthSession(data.session, data.user, intent)
}

export async function fetchCloudUserProfile(userId: string): Promise<CloudUserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id,name,email,tier,status,verified')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    tier: (data.tier || 'FREE') as 'FREE' | 'PRO',
    status: (data.status || 'approved') as 'pending' | 'approved' | 'rejected',
    verified: data.verified ?? false
  }
}

export async function checkUserApprovalStatus(userId: string): Promise<'pending' | 'approved' | 'rejected'> {
  const { data, error } = await supabase
    .from('users')
    .select('status')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    if ((error as any).code === '42P01') {
      throw new Error(
        'Supabase table missing. Run IRIS-AI/supabase/schema.sql in SQL Editor first.'
      )
    }
    if ((error as any).code === '42501') {
      throw new Error(
        'RLS policy missing for users select. Re-run IRIS-AI/supabase/schema.sql in SQL Editor.'
      )
    }
    throw new Error(`Could not read approval status: ${error.message}`)
  }

  if (!data) return 'approved'
  return (data.status || 'approved') as 'pending' | 'approved' | 'rejected'
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string
): Promise<EmailSignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  })

  if (error) throw error

  // Ensure the profile row exists and is usable immediately.
  if (data.user?.id) {
    await supabase.from('users').upsert(
      {
        id: data.user.id,
        email: data.user.email || email,
        name,
        status: 'approved',
        verified: data.user.email_confirmed_at != null
      },
      { onConflict: 'id' }
    )
  }

  if (data.session?.access_token && data.user?.id) {
    const status = await ensureUserAccessStatus(data.user)
    if (status === 'rejected') {
      await supabase.auth.signOut()
      throw new Error('Your account has been rejected. Contact support.')
    }

    await enforceSingleDeviceForUser(data.user.id)
    return {
      status: 'authenticated',
      token: data.session.access_token
    }
  }

  return {
    status: 'registered',
    message: 'Account created. If email confirmation is enabled in Supabase, confirm your email and then sign in.'
  }
}

export async function signInWithEmail(email: string, password: string): Promise<string> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (!data.session?.access_token) throw new Error('Sign-in failed: no session returned.')

  const status = await ensureUserAccessStatus(data.user)
  if (status === 'rejected') {
    await supabase.auth.signOut()
    throw new Error('Your account has been rejected. Contact support.')
  }

  if (data.user?.id) {
    await enforceSingleDeviceForUser(data.user.id)
  }

  return data.session.access_token
}
