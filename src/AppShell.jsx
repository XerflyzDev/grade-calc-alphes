import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Dashboard from './Dashboard'
import SubjectDetail from './SubjectDetail'
import Analysis from './Analysis'
import ScoreConverter from './ScoreConverter'
import { calcSubjectScore, getGrade, calcGPA } from './gradeUtils'
import {
  IconGrid, IconBook, IconBarChart, IconSettings,
  IconCalc, IconHelp, IconLogout, IconBell
} from './Icons'
import s from './AppShell.module.css'

export default function AppShell({ user }) {
  const [page, setPage]           = useState('overview')
  const [subjects, setSubjects]   = useState([])
  const [components, setComponents] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showConverter, setShowConverter] = useState(false)

  async function fetchAll() {
    const { data: subs } = await supabase
      .from('subjects').select('*').eq('user_id', user.id).order('created_at')
    if (!subs) return setLoading(false)
    setSubjects(subs)
    if (subs.length > 0) {
      const { data: comps } = await supabase
        .from('score_components').select('*')
        .in('subject_id', subs.map(s => s.id)).order('created_at')
      const grouped = {}
      subs.forEach(s => grouped[s.id] = [])
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

  const gpa   = calcGPA(subjects, components)
  const email = user.email?.split('@')[0] || 'Student'

  async function signOut() { await supabase.auth.signOut() }

  const navItems = [
    { key: 'overview',  label: 'Overview',  Icon: IconGrid },
    { key: 'subjects',  label: 'Subjects',  Icon: IconBook },
    { key: 'analytics', label: 'Analytics', Icon: IconBarChart },
    { key: 'settings',  label: 'Settings',  Icon: IconSettings },
  ]

  // Which page slug to highlight in nav
  const activeNav = page === 'subject' || page === 'analysis' ? 'subjects' : page

  return (
    <div className={s.shell}>
      {/* Sidebar */}
      <nav className={s.sidebar} aria-label="Main navigation">
        <div className={s.sidebarTop}>
          <button className={s.sidebarBrand} onClick={goHome} aria-label="Go to home dashboard">
            <div className={s.brandTitle}>The Curator</div>
            <div className={s.brandSub}>PRECISION TRACKING</div>
          </button>

          <ul className={s.sideNav} role="list">
            {navItems.map(({ key, label, Icon }) => (
              <li key={key}>
                <button
                  className={activeNav === key ? `${s.navItem} ${s.navActive}` : s.navItem}
                  onClick={() => { if (key === 'overview') goHome(); else setPage(key) }}
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
          <button className={s.sideLink} onClick={() => setShowConverter(true)}>
            <IconCalc size={14} /> Score Converter
          </button>
          <button className={s.sideLink} onClick={() => {}}>
            <IconHelp size={14} /> Help
          </button>
          <button className={s.sideLink} onClick={signOut}>
            <IconLogout size={14} /> Logout
          </button>
        </div>
      </nav>

      {/* Main area */}
      <div className={s.main}>
        {/* Top nav */}
        <header className={s.topNav}>
          <button className={s.topLogo} onClick={goHome} aria-label="Academic Curator — go home">
            Academic Curator
          </button>
          <nav className={s.topLinks} aria-label="Section navigation">
            <button
              className={activeNav === 'overview' ? s.topLinkActive : s.topLink}
              onClick={goHome} aria-current={activeNav === 'overview' ? 'page' : undefined}
            >Dashboard</button>
            <button
              className={page === 'analysis' ? s.topLinkActive : s.topLink}
              onClick={() => selectedId ? setPage('analysis') : setPage('analytics')}
              aria-current={page === 'analysis' ? 'page' : undefined}
            >Analysis</button>
            <button
              className={page === 'settings' ? s.topLinkActive : s.topLink}
              onClick={() => setPage('settings')}
            >Settings</button>
          </nav>
          <div className={s.topRight}>
            <button
              className={s.topIconBtn}
              onClick={() => setShowConverter(true)}
              aria-label="Open score converter"
              title="Score Converter"
            >
              <IconCalc size={16} />
            </button>
            <button className={s.topIconBtn} aria-label="Notifications">
              <IconBell size={16} />
            </button>
            <div className={s.avatar} aria-label={`Signed in as ${email}`}>
              {email[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={s.content} id="main-content">
          {loading ? (
            <div className={s.loadingState} role="status" aria-live="polite">Loading your data…</div>
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
              onBack={goHome}
              onAnalysis={() => openAnalysis(selectedId)}
              onRefresh={fetchAll}
            />
          ) : page === 'analysis' && selectedSubject ? (
            <Analysis
              subject={selectedSubject}
              components={selectedComponents}
              onBack={() => setPage('subject')}
              onHome={goHome}
            />
          ) : (
            <div className={s.emptyState}>
              <p>{page === 'settings' ? 'Settings coming soon.' : 'Select a subject to continue.'}</p>
              <button className={s.btnPrimary} onClick={goHome}>Back to Dashboard</button>
            </div>
          )}
        </main>
      </div>

      {showConverter && <ScoreConverter onClose={() => setShowConverter(false)} />}
    </div>
  )
}