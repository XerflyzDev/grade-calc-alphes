import { useState } from 'react'
import { supabase } from './supabase'
import styles from './Auth.module.css'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg({ type: 'error', text: error.message })
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMsg({ type: 'error', text: error.message })
      else setMsg({ type: 'success', text: 'สมัครสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน' })
    }
    setLoading(false)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <h1>GradeCalc</h1>
        </div>
        <p className={styles.tagline}>คำนวณเกรด · วางแผนการเรียน · ไม่ติด F</p>

        <div className={styles.tabs}>
          <button
            className={mode === 'login' ? styles.tabActive : styles.tab}
            onClick={() => setMode('login')}
          >เข้าสู่ระบบ</button>
          <button
            className={mode === 'signup' ? styles.tabActive : styles.tab}
            onClick={() => setMode('signup')}
          >สมัครสมาชิก</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>อีเมล</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="student@example.com" required />
          </div>
          <div className={styles.field}>
            <label>รหัสผ่าน</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6} />
          </div>
          {msg && (
            <div className={msg.type === 'error' ? styles.error : styles.success}>
              {msg.text}
            </div>
          )}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'กำลังดำเนินการ...' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>
      </div>
    </div>
  )
}
