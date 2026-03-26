import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Dashboard from './Dashboard'
import SubjectDetail from './SubjectDetail'
import Analysis from './Analysis'
import Profile from './Profile'
import ScoreConverter from './ScoreConverter'
import { calcSubjectScore, getGrade, calcGPA } from './gradeUtils'
import {
  IconGrid, IconBook, IconBarChart, IconSettings,
  IconCalc, IconHelp, IconLogout, IconBell
} from './Icons'
import s from './AppShell.module.css'

export default function AppShell({ user }) {
  const [page,       setPage]       = useState('overview')
  const [subjects,   setSubjects]   = useState([])
  const [components, setComponents] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [profile,    setProfile]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [showConv,   setShowConv]   = useState(false)

  async function fetchAll() {
    const { data: subs } = await supabase
      .from('subjects').select('*').eq('user_id', user.id).order('created_at')
    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    if (prof) setProfile(prof)
    if (!subs) return setLoading(false)
    setSubjects(subs)
    if (subs.length > 0) {
      const { data: comps } = await supabase
        .from('score_components').select('*')
        .in('subject_id', subs.map(s => s.id)).order('created_at')
      const grouped = {}
      subs.forEach(s => { grouped[s.id] = [] })
      comps?.forEach(c => { if (grouped[c.subject_id]) grouped[c.subject_id].push(c) })
      setComponents(grouped)
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const selectedSubject    = subjects.find(s => s.id === selectedId)
  const selectedComponents = selectedId ? (components[selectedId] || []) : []

  function openSubject(id)  { setSelectedId(id); setPage('subject') }
  function openAnalysis(id) { setSelectedId(id); setPage('analysis') }
  function goHome()         { setPage('overview'); setSelectedId(null) }
  async function signOut()  { await supabase.auth.signOut() }

  const gpa          = calcGPA(subjects, components)
  const displayName  = profile?.display_name || user.email?.split('@')[0] || 'S'
  const avatarColor  = profile?.avatar_color || '#4F46E5'
  const avatarLetter = displayName[0].toUpperCase()

  const activeNav = page === 'subject' || page === 'analysis' ? 'subjects' : page

  const navItems = [
    { key: 'overview',  label: 'Overview',  Icon: IconGrid },
    { key: 'subjects',  label: 'Subjects',  Icon: IconBook },
    { key: 'analytics', label: 'Analytics', Icon: IconBarChart },
    { key: 'settings',  label: 'Settings',  Icon: IconSettings },
  ]

  return (
    <div className={s.shell}>
      <nav className={s.sidebar} aria-label="Main navigation">
        <div className={s.sidebarTop}>
          <button className={s.sidebarBrand} onClick={goHome} aria-label="Go to dashboard">
            <div className={s.brandTitle}>The Curator</div>
            <div className={s.brandSub}>PRECISION TRACKING</div>
          </button>
          <ul className={s.sideNav} role="list">
            {navItems.map(({ key, label, Icon }) => (
              <li key={key}>
                <button
                  className={activeNav === key ? `${s.navItem} ${s.navActive}` : s.navItem}
                  onClick={() => key === 'overview' ? goHome() : setPage(key)}
                  aria-current={activeNav === key ? 'page' : undefined}
                >
                  <Icon size={15} className={s.navIcon} />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className={s.sidebarBottom}>
          <button className={s.addSubjectBtn} onClick={goHome}>
            <span aria-hidden="true">+</span> Add New Subject
          </button>
          <button className={s.sideLink} onClick={() => setShowConv(true)}>
            <IconCalc size={14} /> Score Converter
          </button>
          <button className={s.sideLink} onClick={() => setPage('profile')}>
            <IconSettings size={14} /> Profile & Settings
          </button>
          <button className={s.sideLink} onClick={signOut}>
            <IconLogout size={14} /> Logout
          </button>
        </div>
      </nav>

      <div className={s.main}>
        <header className={s.topNav}>
          <button className={s.topLogo} onClick={goHome}>Academic Curator</button>
          <nav className={s.topLinks} aria-label="Sections">
            <button className={activeNav === 'overview' ? s.topLinkActive : s.topLink} onClick={goHome}>Dashboard</button>
            <button className={page === 'analysis' ? s.topLinkActive : s.topLink}
              onClick={() => selectedId ? setPage('analysis') : null}>Analysis</button>
            <button className={page === 'profile' ? s.topLinkActive : s.topLink}
              onClick={() => setPage('profile')}>Settings</button>
          </nav>
          <div className={s.topRight}>
            <button className={s.topIconBtn} onClick={() => setShowConv(true)} aria-label="Score Converter" title="Score Converter">
              <IconCalc size={16} />
            </button>
            <button className={s.topIconBtn} aria-label="Notifications">
              <IconBell size={16} />
            </button>
            <button className={s.avatarBtn} onClick={() => setPage('profile')}
              aria-label="Go to profile" style={{ background: avatarColor }}>
              {avatarLetter}
            </button>
          </div>
        </header>

        <main className={s.content} id="main-content" tabIndex={-1}>
          {loading ? (
            <div className={s.loadingState} role="status">Loading…</div>
          ) : page === 'overview' || page === 'subjects' ? (
            <Dashboard
              subjects={subjects} components={components} gpa={gpa}
              onOpenSubject={openSubject} onRefresh={fetchAll} userId={user.id}
            />
          ) : page === 'subject' && selectedSubject ? (
            <SubjectDetail
              subject={selectedSubject} components={selectedComponents}
              onBack={goHome} onAnalysis={() => openAnalysis(selectedId)} onRefresh={fetchAll}
            />
          ) : page === 'analysis' && selectedSubject ? (
            <Analysis
              subject={selectedSubject} components={selectedComponents}
              onBack={() => setPage('subject')} onHome={goHome}
            />
          ) : page === 'profile' ? (
            <Profile user={user} onSignOut={signOut} onRefresh={fetchAll} />
          ) : (
            <div className={s.emptyState}>
              <p>Select a subject to continue.</p>
              <button className={s.btnPrimary} onClick={goHome}>Back to Dashboard</button>
            </div>
          )}
        </main>
      </div>

      {showConv && <ScoreConverter onClose={() => setShowConv(false)} />}
    </div>
  )
}