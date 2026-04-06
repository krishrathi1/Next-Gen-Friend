import { useEffect } from 'react'
import { useAuthStore } from '../store/auth-store'
import { supabase } from '@renderer/config/supabase'
import {
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
        // Force fresh login every time the app starts.
        await supabase.auth.signOut()

        const {
          data: { session }
        } = await supabase.auth.getSession()

        const accessToken = session?.access_token || null
        setAccessToken(accessToken)

        if (session?.user?.id) {
          await ensureCloudUserProfile(session.user)
          await enforceSingleDeviceForUser(session.user.id)
          const profile = await fetchCloudUserProfile(session.user.id)
          if (profile) {
            setUser(profile)
          } else {
            setUser({
              id: session.user.id,
              name: (session.user.user_metadata?.full_name as string) || 'IRIS User',
              email: session.user.email || 'Not linked',
              tier: 'FREE',
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
      try {
        if (session?.user?.id) {
          await ensureCloudUserProfile(session.user)
          await enforceSingleDeviceForUser(session.user.id)
        }
      } catch (err: any) {
        alert(err?.message || 'Sign-in blocked on this device.')
        setAccessToken(null)
        setUser(null)
        if (setIsAuthInitialized) setIsAuthInitialized(true)
        return
      }

      setAccessToken(session?.access_token || null)

      if (session?.user?.id) {
        const profile = await fetchCloudUserProfile(session.user.id)
        if (profile) {
          setUser(profile)
        } else {
          setUser({
            id: session.user.id,
            name: (session.user.user_metadata?.full_name as string) || 'IRIS User',
            email: session.user.email || 'Not linked',
            tier: 'FREE',
            verified: session.user.email_confirmed_at != null
          })
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
