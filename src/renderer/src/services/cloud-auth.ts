import { supabase } from '@renderer/config/supabase'
import type { CloudUserProfile } from '@renderer/store/auth-store'

const DEFAULT_REDIRECT = 'iris://oauth-callback'

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
    const { error } = await supabase.auth.exchangeCodeForSession(authCode)
    if (error) {
      throw error
    }
    return
  }

  if (!accessToken || !refreshToken) {
    throw new Error('OAuth callback did not contain a session token.')
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  })

  if (error) {
    throw error
  }
}

export async function fetchCloudUserProfile(userId: string): Promise<CloudUserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id,name,email,tier,verified')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return null
  }

  if (!data) {
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

