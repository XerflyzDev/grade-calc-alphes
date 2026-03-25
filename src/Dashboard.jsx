import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import SubjectCard from './SubjectCard'
import styles from './Dashboard.module.css'

export default function Dashboard({ user }) {
  const [subjects, setSubjects] = useState([])
  const [components, setComponents] = useState({})
  const [loading, setLoading] = useState(true)
  const [newSubject, setNewSubject] = useState('')
  const [adding, setAdding] = useState(false)

  async function fetchData() {
    setLoading(true)
    const { data: subs } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (subs) {
      setSubjects(subs)
      const ids = subs.map(s => s.id)
      if (ids.length > 0) {
        const { data: comps } = await supabase
          .from('score_components')
          .select('*')
          .in('subject_id', ids)
          .order('created_at', { ascending: true })
        const grouped = {}
        subs.forEach(s => { grouped[s.id] = [] })
        comps?.forEach(c => { if (grouped[c.subject_id]) grouped[c.subject_id].push(c) })
        setComponents(grouped)
      } else {
        setComponents({})
      }
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function addSubject(e) {
    e.preventDefault()
    if (!newSubject.trim()) return
    setAdding(true)
    await supabase.from('subjects').insert({ user_id: user.id, name: newSubject.trim() })
    setNewSubject('')
    setAdding(false)
    fetchData()
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const email = user.email?.split('@')[0] || 'นักศึกษา'

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span>GradeCalc</span>
        </div>
        <div className={styles.userArea}>
          <span className={styles.userEmail}>{email}</span>
          <button className={styles.signOutBtn} onClick={signOut}>ออกจากระบบ</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.pageTitle}>
          <h2>รายวิชาของคุณ</h2>
          <span className={styles.subtitle}>ภาคเรียน · {subjects.length} วิชา</span>
        </div>

        {/* Add subject form */}
        <form onSubmit={addSubject} className={styles.addForm}>
          <input
            placeholder="เพิ่มรายวิชาใหม่ เช่น Mathematics for Engineering I"
            value={newSubject}
            onChange={e => setNewSubject(e.target.value)}
            className={styles.addInput}
          />
          <button type="submit" className={styles.addBtn} disabled={adding || !newSubject.trim()}>
            {adding ? '...' : '+ เพิ่มวิชา'}
          </button>
        </form>

        {loading ? (
          <div className={styles.loading}>กำลังโหลด...</div>
        ) : subjects.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>◎</span>
            <p>ยังไม่มีรายวิชา<br />เริ่มต้นโดยเพิ่มวิชาด้านบน</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {subjects.map(s => (
              <SubjectCard
                key={s.id}
                subject={s}
                components={components[s.id] || []}
                onRefresh={fetchData}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
