import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AuthContext from './auth-context'
import { authApi } from '../services/api/authApi'
import { profileApi } from '../services/api/profileApi'

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, error: null, notice: null })
  const requestVersion = useRef(0)

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current
    try {
      const { user } = await authApi.me()
      if (version === requestVersion.current) {
        setState({ status: 'authenticated', user, error: null })
      }
    } catch (error) {
      if (version === requestVersion.current) {
        setState((current) => {
          if (error.status === 401) {
            return { status: 'unauthenticated', user: null, error: null }
          }
          if (current.user) return { ...current, status: 'authenticated', error: null }
          return { status: 'error', user: null, error }
        })
      }
    }
  }, [])

  useEffect(() => {
    const version = ++requestVersion.current
    authApi.me().then(
      ({ user }) => {
        if (version === requestVersion.current) {
          setState({ status: 'authenticated', user, error: null })
        }
      },
      (error) => {
        if (version === requestVersion.current) {
          setState((current) => {
            if (error.status === 401) {
              return { status: 'unauthenticated', user: null, error: null }
            }
            if (current.user) return { ...current, status: 'authenticated', error: null }
            return { status: 'error', user: null, error }
          })
        }
      },
    )
    return () => {
      if (requestVersion.current === version) requestVersion.current += 1
    }
  }, [])

  const register = useCallback(async (details) => {
    const version = ++requestVersion.current
    try {
      const result = await authApi.register(details)
      if (version === requestVersion.current) {
        setState({ status: 'authenticated', user: result.user, error: null })
      }
      return result.user
    } catch (error) {
      if (version === requestVersion.current) void refresh()
      throw error
    }
  }, [refresh])

  const login = useCallback(async (credentials) => {
    const version = ++requestVersion.current
    try {
      const result = await authApi.login(credentials)
      if (version === requestVersion.current) {
        setState({ status: 'authenticated', user: result.user, error: null })
      }
      return result.user
    } catch (error) {
      if (version === requestVersion.current) void refresh()
      throw error
    }
  }, [refresh])

  const logout = useCallback(async () => {
    const version = ++requestVersion.current
    await authApi.logout()
    if (version === requestVersion.current) {
      setState({
        status: 'unauthenticated',
        user: null,
        error: null,
        notice: 'আপনি সফলভাবে লগ আউট করেছেন।',
      })
    }
  }, [])

  const deleteAccount = useCallback(async () => {
    const version = ++requestVersion.current
    await profileApi.delete()
    if (version === requestVersion.current) {
      setState({
        status: 'unauthenticated',
        user: null,
        error: null,
        notice: 'আপনার অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে।',
      })
    }
  }, [])

  const updateUser = useCallback((user) => {
    setState((current) => ({ ...current, status: 'authenticated', user, error: null }))
  }, [])

  const clearNotice = useCallback(() => {
    setState((current) => ({ ...current, notice: null }))
  }, [])

  const value = useMemo(
    () => ({ ...state, clearNotice, deleteAccount, login, logout, refresh, register, updateUser }),
    [state, clearNotice, deleteAccount, login, logout, refresh, register, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
