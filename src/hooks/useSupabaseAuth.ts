import { useCallback, useEffect, useState } from 'react'
import { getSessionUser, isSupabaseConfigured, supabase, type LandiUser } from '../lib/supabase'

type UseSupabaseAuthOptions = {
  setAuthError: (value: string) => void
}

export function useSupabaseAuth({ setAuthError }: UseSupabaseAuthOptions) {
  const [authUser, setAuthUser] = useState<LandiUser | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setAuthUser(getSessionUser(data.session))
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthUser(getSessionUser(session))
      setAuthReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setAuthError('')
    if (!supabase) {
      setAuthError('Supabase 환경 변수가 설정되지 않았습니다. .env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 추가해주세요.')
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) setAuthError(`구글 로그인에 실패했습니다. ${error.message}`)
  }, [setAuthError])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setAuthError(`로그아웃에 실패했습니다. ${error.message}`)
    setAuthUser(null)
  }, [setAuthError])

  return {
    authUser,
    authReady,
    signInWithGoogle,
    signOut,
  }
}
