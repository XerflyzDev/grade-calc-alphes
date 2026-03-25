import { useState } from 'react'
import { supabase } from './supabase'
import s from './Landing.module.css'

export default function Landing() {
  const [authMode, setAuthMode] = useState('signup')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email: form.email, password: form.password })
      if (error) setMsg({ type: 'error', text: error.message })
      else setMsg({ type: 'success', text: 'Account created! Check your email to confirm.' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (error) setMsg({ type: 'error', text: error.message })
    }
    setLoading(false)
  }

  return (
    <div className={s.page}>
      {/* Header */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <span className={s.logo}>Academic Curator</span>
          <nav className={s.nav}>
            <a href="#features">Dashboard</a>
            <a href="#auth" className={s.navActive}>Analysis</a>
            <a href="#features">Settings</a>
          </nav>
          <div className={s.headerRight}>
            <button className={s.headerBell}>🔔</button>
            <button className={s.btnPrimary} onClick={() => document.getElementById('auth').scrollIntoView({ behavior: 'smooth' })}>
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={s.hero}>
        <div className={s.heroBadge}>
          <span>✦</span> THE FUTURE OF ACADEMIC PLANNING
        </div>
        <h1 className={s.heroTitle}>
          Your Academic Journey,<br />
          <span className={s.heroAccent}>Perfectly Curated.</span>
        </h1>
        <p className={s.heroSub}>
          Transform anxiety-inducing spreadsheets into a calm, editorial<br />
          workspace. Track progress, predict outcomes, and master your<br />
          semester with precision.
        </p>
        <div className={s.heroCTA}>
          <button className={s.btnPrimary} onClick={() => document.getElementById('auth').scrollIntoView({ behavior: 'smooth' })}>
            Start Tracking Now
          </button>
          <button className={s.btnOutlined}>See How It Works</button>
        </div>

        {/* Mock app preview */}
        <div className={s.appPreview}>
          <div className={s.appPreviewInner}>
            <div className={s.mockHeader}>
              <span className={s.mockLogo}>Academic Curator</span>
            </div>
            <div className={s.mockBody}>
              <div className={s.mockSidebar}>
                <div className={s.mockNavItem} style={{background:'var(--primary-light)',color:'var(--primary)'}}>Overview</div>
                <div className={s.mockNavItem}>Subjects</div>
                <div className={s.mockNavItem}>Analytics</div>
              </div>
              <div className={s.mockContent}>
                <div className={s.mockTitle}>Current GPA <span style={{color:'var(--primary)'}}>3.84</span></div>
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  {['MATH 101','COMP SCI','PHYS 305'].map(n => (
                    <div key={n} className={s.mockCard}>
                      <div className={s.mockCardTitle}>{n}</div>
                      <div className={s.mockBar}><div className={s.mockBarFill} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className={s.gpaFloating}>TARGET GPA <strong>3.92</strong></div>
        </div>
      </section>

      {/* Features */}
      <section className={s.features} id="features">
        {[
          { icon: '⏱', title: 'Save Valuable Time', desc: 'Automated weight calculations and GPA forecasting. Stop wrestling with formulas and start studying.' },
          { icon: '📈', title: 'Track Your Progress', desc: 'Visual narratives of your performance across subjects. Identify where you excel and where you need focus.' },
          { icon: '🎯', title: 'Predict Grades', desc: "Know exactly what you need on that final exam to maintain your target GPA. No more guessing games." },
        ].map(f => (
          <div key={f.title} className={s.featureCard}>
            <div className={s.featureIcon}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Auth Section */}
      <section className={s.authSection} id="auth">
        <div className={s.authLeft}>
          <h2>Join the cohort of<br />organized learners.</h2>
          <p>Ready to elevate your academic experience? Create an account in seconds and start curating your future success.</p>
          <ul className={s.authPerks}>
            <li>✓ Free for individual students</li>
            <li>✓ Real-time data synchronization</li>
            <li>✓ Dark mode &amp; accessibility optimized</li>
          </ul>
        </div>
        <div className={s.authCard}>
          <div className={s.authTabs}>
            <button className={authMode==='signup' ? s.tabActive : s.tab} onClick={() => setAuthMode('signup')}>Sign Up</button>
            <button className={authMode==='login' ? s.tabActive : s.tab} onClick={() => setAuthMode('login')}>Login</button>
          </div>
          <form onSubmit={handleAuth} className={s.authForm}>
            {authMode === 'signup' && (
              <div className={s.field}>
                <label>FULL NAME</label>
                <input placeholder="Alex Curator" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
              </div>
            )}
            <div className={s.field}>
              <label>EMAIL ADDRESS</label>
              <input type="email" placeholder="alex@university.edu" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required />
            </div>
            <div className={s.field}>
              <label>PASSWORD</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required minLength={6} />
            </div>
            {msg && <div className={msg.type === 'error' ? s.msgError : s.msgSuccess}>{msg.text}</div>}
            <button type="submit" className={s.btnSubmit} disabled={loading}>
              {loading ? 'Please wait...' : authMode === 'signup' ? 'Create Free Account' : 'Sign In'}
            </button>
            {authMode === 'signup' && <p className={s.terms}>By signing up, you agree to our Terms of Service and Privacy Policy.</p>}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className={s.footer}>
        <span className={s.footerLogo}>The Curator</span>
        <span className={s.footerTagline}>Precision Tracking for Modern Students</span>
        <div className={s.footerLinks}>
          <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Help</a><a href="#">Twitter</a>
        </div>
        <span className={s.footerCopy}>© 2025 Academic Curator. All rights reserved.</span>
      </footer>
    </div>
  )
}
