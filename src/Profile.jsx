import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { IconCheck, IconEdit, IconLogout } from './Icons'
import s from './Profile.module.css'

const AVATAR_COLORS = [
  '#4F46E5', '#7C3AED', '#DB2777', '#DC2626',
  '#D97706', '#059669', '#0891B2', '#0F172A',
]

export default function Profile({ user, onSignOut }) {
  const [profile,  setProfile]  = useState(null)
  const [editing,  setEditing]  = useState(false)
  const [form,     setForm]     = useState({ display_name: '', faculty: '', major: '', student_id: '', avatar_color: '#4F46E5' })
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState(null)
  const [pwForm,   setPwForm]   = useState({ current: '', next: '', confirm: '' })
  const [pwMsg,    setPwMsg]    = useState(null)
  const [changePw, setChangePw] = useState(false)

  useEffect(() => { fetchProfile() }, [])

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setForm({ display_name: data.display_name || '', faculty: data.faculty || '', major: data.major || '', student_id: data.student_id || '', avatar_color: data.avatar_color || '#4F46E5' })
    }
  }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('profiles').upsert({ id: user.id, ...form, updated_at: new Date().toISOString() })
    setSaving(false)
    setEditing(false)
    setToast('Profile updated')
    setTimeout(() => setToast(null), 2200)
    fetchProfile()
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwMsg(null)
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type: 'error', text: 'Passwords do not match.' }); return }
    if (pwForm.next.length < 6) { setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' }); return }
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    if (error) setPwMsg({ type: 'error', text: error.message })
    else {
      setPwMsg({ type: 'success', text: 'Password updated successfully.' })
      setPwForm({ current: '', next: '', confirm: '' })
      setChangePw(false)
    }
  }

  const displayName   = profile?.display_name || user.email?.split('@')[0] || 'Student'
  const avatarColor   = form.avatar_color || '#4F46E5'
  const avatarInitial = displayName[0].toUpperCase()

  return (
    <div className={s.page}>
      {toast && (
        <div className={s.toast} role="status" aria-live="polite">
          <IconCheck size={13} /> {toast}
        </div>
      )}

      <h1 className={s.pageTitle}>Profile & Settings</h1>

      {/* Avatar + name banner */}
      <div className={s.banner}>
        <div className={s.avatar} style={{ background: avatarColor }} aria-hidden="true">
          {avatarInitial}
        </div>
        <div className={s.bannerInfo}>
          <div className={s.bannerName}>{displayName}</div>
          <div className={s.bannerEmail}>{user.email}</div>
          {profile?.student_id && <div className={s.bannerMeta}>Student ID: {profile.student_id}</div>}
          {profile?.faculty    && <div className={s.bannerMeta}>{profile.faculty}{profile?.major ? ` · ${profile.major}` : ''}</div>}
        </div>
        <button className={s.editBtn} onClick={() => setEditing(!editing)}
          aria-pressed={editing} aria-label="Edit profile">
          <IconEdit size={14} /> {editing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {/* Profile form */}
      {editing && (
        <section className={s.card} aria-label="Edit profile">
          <h2 className={s.cardTitle}>Personal Information</h2>

          {/* Avatar color picker */}
          <div className={s.field}>
            <label>Avatar Color</label>
            <div className={s.colorGrid} role="group" aria-label="Choose avatar color">
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button"
                  className={`${s.colorSwatch} ${form.avatar_color === c ? s.colorSwatchActive : ''}`}
                  style={{ background: c }}
                  onClick={() => setForm(p => ({...p, avatar_color: c}))}
                  aria-label={`Color ${c}`}
                  aria-pressed={form.avatar_color === c}
                />
              ))}
            </div>
          </div>

          <form onSubmit={saveProfile} className={s.profileForm}>
            <div className={s.formRow}>
              <div className={s.field}>
                <label htmlFor="pf-name">Display Name</label>
                <input id="pf-name" placeholder="Your name" value={form.display_name}
                  onChange={e => setForm(p => ({...p, display_name: e.target.value}))} />
              </div>
              <div className={s.field}>
                <label htmlFor="pf-sid">Student ID</label>
                <input id="pf-sid" placeholder="e.g. 6512345678" value={form.student_id}
                  onChange={e => setForm(p => ({...p, student_id: e.target.value}))} />
              </div>
            </div>
            <div className={s.formRow}>
              <div className={s.field}>
                <label htmlFor="pf-faculty">Faculty</label>
                <input id="pf-faculty" placeholder="e.g. Engineering" value={form.faculty}
                  onChange={e => setForm(p => ({...p, faculty: e.target.value}))} />
              </div>
              <div className={s.field}>
                <label htmlFor="pf-major">Major</label>
                <input id="pf-major" placeholder="e.g. Computer Science" value={form.major}
                  onChange={e => setForm(p => ({...p, major: e.target.value}))} />
              </div>
            </div>
            <div className={s.formActions}>
              <button type="button" className={s.btnGhost} onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className={s.btnPrimary} disabled={saving} aria-busy={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Account section */}
      <section className={s.card} aria-label="Account settings">
        <h2 className={s.cardTitle}>Account</h2>
        <div className={s.accountRow}>
          <div>
            <div className={s.accountLabel}>Email address</div>
            <div className={s.accountValue}>{user.email}</div>
          </div>
        </div>
        <div className={s.accountRow}>
          <div>
            <div className={s.accountLabel}>Password</div>
            <div className={s.accountValue}>••••••••</div>
          </div>
          <button className={s.btnOutlined} onClick={() => setChangePw(!changePw)}>
            Change Password
          </button>
        </div>

        {changePw && (
          <form onSubmit={changePassword} className={s.pwForm}>
            <div className={s.field}>
              <label htmlFor="pw-new">New Password</label>
              <input id="pw-new" type="password" placeholder="Min 6 characters"
                value={pwForm.next} onChange={e => setPwForm(p => ({...p, next: e.target.value}))}
                minLength={6} required />
            </div>
            <div className={s.field}>
              <label htmlFor="pw-confirm">Confirm New Password</label>
              <input id="pw-confirm" type="password" placeholder="Repeat new password"
                value={pwForm.confirm} onChange={e => setPwForm(p => ({...p, confirm: e.target.value}))}
                required />
            </div>
            {pwMsg && (
              <div className={pwMsg.type === 'error' ? s.msgError : s.msgSuccess} role="alert">
                {pwMsg.text}
              </div>
            )}
            <div className={s.formActions}>
              <button type="button" className={s.btnGhost} onClick={() => { setChangePw(false); setPwMsg(null) }}>Cancel</button>
              <button type="submit" className={s.btnPrimary}>Update Password</button>
            </div>
          </form>
        )}
      </section>

      {/* Danger zone */}
      <section className={s.card} aria-label="Sign out">
        <h2 className={s.cardTitle}>Session</h2>
        <div className={s.accountRow}>
          <div>
            <div className={s.accountLabel}>Signed in as</div>
            <div className={s.accountValue}>{user.email}</div>
          </div>
          <button className={s.signOutBtn} onClick={onSignOut}>
            <IconLogout size={14} /> Sign Out
          </button>
        </div>
      </section>
    </div>
  )
}
