import React from 'react'
import { supabase } from '@renderer/config/supabase'

const authMiddleware = async ({ children }: { children: React.ReactNode }): Promise<any> => {
  const getUser = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      return user || null
    } catch (error) {
      return null
    }
  }

  const user = await getUser()

  if (user) {
    return { children }
  }

}

export default authMiddleware
