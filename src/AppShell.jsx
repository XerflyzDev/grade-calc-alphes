import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Dashboard from './Dashboard'
import SubjectDetail from './SubjectDetail'
import Analysis from './Analysis'
import s from './AppShell.module.css'
import { calcSubjectScore, getGrade, calcGPA } from './gradeUtils'

export default function AppShell({ user }) {
  const [page, setPage] = useState('overview') // overview | subject | analysis
  const [subjects, setSubjects] = useState([])
  const [components, setComponents] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    const { data: subs } = await supabase.from('subjects').select('*').eq('user_id', user.id).order('created_at')
    if (!subs) return setLoading(false)
    setSubjects(subs)
    if (subs.length > 0) {
      const { data: comps } = await supabase.from('score_components').select('*').in('subject_id', subs.map(s => s.id)).order('created_at')
      const grouped = {}
      subs.forEach(s => grouped[s.id] = [])
      comps?.forEach(c => { if (grouped[c.subject_id]) grouped[c.subject_id].push(c) })
      setComponents(grouped)
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const selectedSubject = subjects.find(s => s.id === selectedId)
  const selectedComponents = selectedId ? (components[selectedId] || []) : []

  function openSubject(id) { setSelectedId(id); setPage('subject') }
  function openAnalysis(id) { setSelectedId(id); setPage('analysis') }

  const gpa = calcGPA(subjects, components)
  const email = user.email?.split('@')[0] || 'Student'

  async function signOut() { await supabase.auth.signOut() }

  const navItems = [
    { key: 'overview', label: 'Overview', icon: '⊞' },
    { key: 'subject',  label: 'Subjects',  icon: '📖' },
    { key: 'analysis', label: 'Analytics', icon: '📈' },
    { key: 'settings', label: 'Settings',  icon: '⚙' },
  ]

  return (
    <div className={s.shell}>
      {/* Sidebar */}
      <aside className={s.sidebar}>
        <div className={s.sidebarTop}>
          <div className={s.sidebarBrand}>
            <div className={s.brandTitle}>The Curator</div>
            <div className={s.brandSub}>PRECISION TRACKING</div>
          </div>
          <nav className={s.sideNav}>
            {navItems.map(item => (
              <button
                key={item.key}
                className={page === item.key ? `${s.navItem} ${s.navActive}` : s.navItem}
                onClick={() => setPage(item.key)}
              >
                <span className={s.navIcon}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className={s.sidebarBottom}>
          <button className={s.addSubjectBtn} onClick={() => setPage('overview')}>
            + Add New Subject
          </button>
          <button className={s.sideLink} onClick={() => {}}>
            <span>?</span> Help
          </button>
          <button className={s.sideLink} onClick={signOut}>
            <span>→</span> Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className={s.main}>
        {/* Top nav */}
        <header className={s.topNav}>
          <span className={s.topLogo}>Academic Curator</span>
          <nav className={s.topLinks}>
            <button className={page === 'overview' ? s.topLinkActive : s.topLink} onClick={() => setPage('overview')}>Dashboard</button>
            <button className={page === 'analysis' ? s.topLinkActive : s.topLink} onClick={() => setPage('analysis')}>Analysis</button>
            <button className={page === 'settings' ? s.topLinkActive : s.topLink} onClick={() => setPage('settings')}>Settings</button>
          </nav>
          <div className={s.topRight}>
            <button className={s.topIcon}>🔔</button>
            <div className={s.avatar}>{email[0].toUpperCase()}</div>
          </div>
        </header>

        {/* Page content */}
        <div className={s.content}>
          {loading ? (
            <div className={s.loadingState}>Loading your data...</div>
          ) : page === 'overview' || page === 'subjects' ? (
            <Dashboard
              subjects={subjects}
              components={components}
              gpa={gpa}
              onOpenSubject={openSubject}
              onOpenAnalysis={openAnalysis}
              onRefresh={fetchAll}
              userId={user.id}
            />
          ) : page === 'subject' && selectedSubject ? (
            <SubjectDetail
              subject={selectedSubject}
              components={selectedComponents}
              onBack={() => setPage('overview')}
              onAnalysis={() => openAnalysis(selectedId)}
              onRefresh={fetchAll}
            />
          ) : page === 'analysis' && selectedSubject ? (
            <Analysis
              subject={selectedSubject}
              components={selectedComponents}
              onBack={() => setPage('subject')}
            />
          ) : page === 'analysis' && !selectedSubject ? (
            <div className={s.emptyState}>
              <p>Select a subject first to view its analysis.</p>
              <button className={s.btnPrimary} onClick={() => setPage('overview')}>Go to Dashboard</button>
            </div>
          ) : page === 'settings' ? (
            <div className={s.emptyState}>
              <p style={{fontSize:'1.5rem',marginBottom:'0.5rem'}}>⚙️</p>
              <p>Settings coming soon.</p>
            </div>
          ) : (
            <div className={s.emptyState}>
              <button className={s.btnPrimary} onClick={() => setPage('overview')}>Go to Dashboard</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
