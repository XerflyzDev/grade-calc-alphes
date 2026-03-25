import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Landing from './Landing'
import AppShell from './AppShell'
import './index.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F0F2F5', fontFamily:'Inter,sans-serif' }}>
      <span style={{ fontSize:'1.5rem', color:'var(--primary)' }}>◈</span>
    </div>
  )

  return session ? <AppShell user={session.user} /> : <Landing />
}
