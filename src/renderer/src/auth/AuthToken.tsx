import { useEffect } from 'react'
import { useAuthStore } from '../store/auth-store'
import { supabase } from '@renderer/config/supabase'
import {
  checkUserApprovalStatus,
  enforceSingleDeviceForUser,
  ensureCloudUserProfile,
  fetchCloudUserProfile
} from '@renderer/services/cloud-auth'

export default function AuthInitializer() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setUser = useAuthStore((s) => s.setUser)
  const setIsAuthInitialized = useAuthStore((s: any) => s.setIsAuthInitialized)

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession()

        const accessToken = session?.access_token || null
        setAccessToken(accessToken)

        if (session?.user?.id) {
          // Block unapproved users even if they somehow have an active session.
          const status = await checkUserApprovalStatus(session.user.id)
          if (status !== 'approved') {
            await supabase.auth.signOut()
            throw new Error(
              status === 'rejected'
                ? 'Your account has been rejected.'
                : 'Your account is pending admin approval.'
            )
          }
          try {
            await ensureCloudUserProfile(session.user)
            await enforceSingleDeviceForUser(session.user.id)
          } catch (err: any) {
            const msg: string = err?.message || 'Profile sync failed'
            const isSchema =
              msg.includes('supabase table missing') ||
              msg.includes('rls policy missing') ||
              (msg.includes('relation') && msg.includes('does not exist'))
            if (!isSchema) throw err
          }
          const profile = await fetchCloudUserProfile(session.user.id)
          if (profile) {
            setUser(profile)
          } else {
            setUser({
              id: session.user.id,
              name: (session.user.user_metadata?.full_name as string) || 'IRIS User',
              email: session.user.email || 'Not linked',
              tier: 'FREE',
              status: 'approved' as const,
              verified: session.user.email_confirmed_at != null
            })
          }
        } else {
          setUser(null)
        }
      } catch (err) {
        setAccessToken(null)
        setUser(null)
      } finally {
        if (setIsAuthInitialized) setIsAuthInitialized(true)
      }
    }

    init()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Only enforce device check on active sessions. If the device is blocked
      // we sign out; for any other error (network, IPC glitch) we do NOT clear
      // the token — that would log the user out for a transient failure.
      if (session?.user?.id) {
        try {
          await enforceSingleDeviceForUser(session.user.id)
        } catch (err: any) {
          const msg: string = err?.message || ''
          if (msg.includes('already linked to another')) {
            alert(msg)
            setAccessToken(null)
            setUser(null)
            if (setIsAuthInitialized) setIsAuthInitialized(true)
            return
          }
          // Non-blocking error (schema missing, network, etc.) — allow sign-in.
        }
      }

      // Only update the token if Supabase is providing a new value; don't
      // overwrite a token we already set from completeOAuthFromDeepLink.
      const incoming = session?.access_token || null
      if (incoming !== null || useAuthStore.getState().accessToken === null) {
        setAccessToken(incoming)
      }

      if (session?.user?.id) {
        try {
          const profile = await fetchCloudUserProfile(session.user.id)
          if (profile) {
            setUser(profile)
          } else {
            setUser({
              id: session.user.id,
              name: (session.user.user_metadata?.full_name as string) || 'IRIS User',
              email: session.user.email || 'Not linked',
              tier: 'FREE',
              status: 'approved' as const,
              verified: session.user.email_confirmed_at != null
            })
          }
        } catch {
          // Profile fetch failure is non-fatal; user is still authenticated.
        }
      } else {
        setUser(null)
      }

      if (setIsAuthInitialized) setIsAuthInitialized(true)
    })

    return () => subscription.unsubscribe()
  }, [setAccessToken, setIsAuthInitialized, setUser])

  return null
}
