import { supabase } from '@renderer/config/supabase'
import type { User } from '@supabase/supabase-js'
import type { CloudUserProfile } from '@renderer/store/auth-store'

const DEFAULT_REDIRECT = 'http://127.0.0.1:54321/auth/callback'

type DeviceDetails = {
  fingerprint: string
  deviceName: string
  platform: string
  osVersion: string
  arch: string
  appVersion: string
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

export async function ensureCloudUserProfile(user: User): Promise<void> {
  const { error } = await supabase.from('users').upsert(
    {
      id: user.id,
      email: user.email || '',
      name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || 'IRIS User',
      google_id: (user.user_metadata?.sub as string) || null,
      verified: user.email_confirmed_at != null
    },
    { onConflict: 'id' }
  )

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

export async function startGoogleOAuth(): Promise<void> {
  const redirectTo = import.meta.env.VITE_SUPABASE_REDIRECT_URL || DEFAULT_REDIRECT

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { access_type: 'offline', prompt: 'select_account' }
    }
  })

  if (error) {
    throw error
  }

  if (!data?.url) {
    throw new Error('Supabase did not return an OAuth URL.')
  }

  window.open(data.url, '_blank')
}

export async function completeOAuthFromDeepLink(rawUrl: string): Promise<void> {
  const parsed = new URL(rawUrl.replace('iris://', 'http://localhost/'))

  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash
  const hashParams = new URLSearchParams(hash)

  const accessToken = parsed.searchParams.get('access_token') || hashParams.get('access_token')
  const refreshToken = parsed.searchParams.get('refresh_token') || hashParams.get('refresh_token')
  const authCode = parsed.searchParams.get('code') || hashParams.get('code')

  if (authCode) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(authCode)
    if (error) {
      throw error
    }
    if (data?.user?.id) {
      await ensureCloudUserProfile(data.user)
      await enforceSingleDeviceForUser(data.user.id)
    }
    return
  }

  if (!accessToken || !refreshToken) {
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (session?.user?.id) {
      await ensureCloudUserProfile(session.user)
      await enforceSingleDeviceForUser(session.user.id)
      return
    }

    throw new Error('OAuth callback did not contain a session token.')
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  })

  if (error) {
    throw error
  }

  if (data?.user?.id) {
    await ensureCloudUserProfile(data.user)
    await enforceSingleDeviceForUser(data.user.id)
  }
}

export async function fetchCloudUserProfile(userId: string): Promise<CloudUserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id,name,email,tier,verified')
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
    verified: data.verified ?? false
  }
}
