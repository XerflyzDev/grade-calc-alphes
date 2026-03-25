import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import Dashboard from './Dashboard'
import './index.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text2)',
        fontFamily: 'DM Sans, sans-serif',
        background: 'var(--bg)'
      }}>
        <span style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>◈</span>
      </div>
    )
  }

  return session ? <Dashboard user={session.user} /> : <Auth />
}
