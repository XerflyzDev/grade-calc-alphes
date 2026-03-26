import { useState } from 'react'
import { supabase } from './supabase'
import { calcSubjectScore, getGrade, calcGPA, groupBySemester } from './gradeUtils'
import { IconTrash, IconPlus, IconChevDown, IconChevUp, IconBarChart } from './Icons'
import s from './Dashboard.module.css'

const CURRENT_YEAR = new Date().getFullYear().toString()
const SEMESTERS = ['1', '2', 'Summer']

function SubjectCard({ subject, components, onClick, onDelete }) {
  const { earnedPoints, totalWeight, currentPct, remainingWeight } = calcSubjectScore(components)
  const hasData = components.some(c => c.score_received != null)
  const grade   = hasData && totalWeight > 0 ? getGrade(currentPct) : null
  const barPct  = totalWeight > 0 ? Math.min(100, (earnedPoints / totalWeight) * 100) : 0

  return (
    <article className={s.subjectCard} onClick={onClick} tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      aria-label={`${subject.name}${grade ? `, grade ${grade.grade}` : ''}`}>
      <div className={s.cardHeader}>
        <span className={s.cardTag}>COURSE</span>
        <button className={s.cardDelete} onClick={e => { e.stopPropagation(); onDelete() }}
          aria-label={`Delete ${subject.name}`}>
          <IconTrash size={12} />
        </button>
      </div>
      <div className={s.cardTitle}>{subject.name}</div>
      <div className={s.cardSub}>{components.length} assessment{components.length !== 1 ? 's' : ''}</div>
      <div className={s.cardFooter}>
        <div>
          <div className={s.cardLabel}>CURRENT GRADE</div>
          <div className={s.cardScore}>{hasData && totalWeight > 0 ? currentPct.toFixed(1) + '%' : '—'}</div>
        </div>
        {grade && <span className={s.cardGradeBadge}>{grade.grade}</span>}
      </div>
      <div className={s.cardBar}>
        <div className={s.cardBarFill} style={{ width: `${barPct}%` }}
          role="progressbar" aria-valuenow={barPct} aria-valuemin="0" aria-valuemax="100" />
      </div>
    </article>
  )
}

function AddSubjectModal({ onAdd, onClose }) {
  const [name,         setName]         = useState('')
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR)
  const [semester,     setSemester]     = useState('1')
  const [loading,      setLoading]      = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onAdd({ name: name.trim(), academic_year: academicYear, semester })
    setLoading(false)
  }

  return (
    <div className={s.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="add-subject-title"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <h2 id="add-subject-title">Enroll New Subject</h2>
          <button className={s.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleAdd} className={s.modalForm}>
          <div className={s.field}>
            <label htmlFor="sub-name">Subject Name</label>
            <input id="sub-name" placeholder="e.g. Mathematics for Engineering I"
              value={name} onChange={e => setName(e.target.value)} autoFocus required />
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label htmlFor="sub-year">Academic Year</label>
              <input id="sub-year" type="number" min="2000" max="2100"
                value={academicYear} onChange={e => setAcademicYear(e.target.value)} />
            </div>
            <div className={s.field}>
              <label htmlFor="sub-sem">Semester</label>
              <select id="sub-sem" value={semester} onChange={e => setSemester(e.target.value)}>
                {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>
          <div className={s.modalActions}>
            <button type="button" className={s.btnGhost} onClick={onClose}>Cancel</button>
            <button type="submit" className={s.btnPrimary} disabled={loading || !name.trim()}>
              {loading ? 'Adding…' : 'Add Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Dashboard({ subjects, components, gpa, onOpenSubject, onRefresh, userId }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [collapsed,    setCollapsed]    = useState({})   // semester key -> bool
  const [filter,       setFilter]       = useState('all') // 'all' | year string

  async function addSubject({ name, academic_year, semester }) {
    await supabase.from('subjects').insert({ user_id: userId, name, academic_year, semester })
    setShowAddModal(false)
    onRefresh()
  }

  async function deleteSubject(id) {
    if (!confirm('Delete this subject and all its scores?')) return
    await supabase.from('subjects').delete().eq('id', id)
    onRefresh()
  }

  const gpaDisplay = gpa != null ? gpa.toFixed(2) : '—'

  // Get unique academic years for filter
  const years = [...new Set(subjects.map(s => s.academic_year).filter(Boolean))].sort((a,b) => b.localeCompare(a))

  // Filter subjects by year
  const filteredSubjects = filter === 'all' ? subjects : subjects.filter(s => s.academic_year === filter)

  // Group by semester
  const semesterGroups = groupBySemester(filteredSubjects)

  function toggleCollapse(key) {
    setCollapsed(c => ({ ...c, [key]: !c[key] }))
  }

  return (
    <div className={s.page}>
      {/* GPA hero */}
      <div className={s.heroRow}>
        <div className={s.heroLeft}>
          <div className={s.heroLabel}>SEMESTER PERFORMANCE</div>
          <h1 className={s.gpaTitle}>
            Current GPA <span className={s.gpaNum}>{gpaDisplay}</span>
          </h1>
          <p className={s.gpaSub}>
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} tracked
            {gpa != null && gpa >= 3.5 ? ' · Excellent standing!' : gpa != null && gpa >= 2.0 ? ' · On track.' : gpa != null ? ' · Let\'s boost those grades.' : ''}
          </p>
        </div>
        <div className={s.targetCard}>
          <div className={s.targetLabel}>TARGET GPA</div>
          <div className={s.targetNum}>4.00</div>
        </div>
      </div>

      {/* Year filter + Add button */}
      <div className={s.toolbar}>
        <div className={s.filterTabs} role="group" aria-label="Filter by academic year">
          <button className={filter === 'all' ? `${s.filterTab} ${s.filterTabActive}` : s.filterTab}
            onClick={() => setFilter('all')}>All Years</button>
          {years.map(y => (
            <button key={y}
              className={filter === y ? `${s.filterTab} ${s.filterTabActive}` : s.filterTab}
              onClick={() => setFilter(y)}>
              {y}
            </button>
          ))}
        </div>
        <button className={s.addBtn} onClick={() => setShowAddModal(true)}>
          <IconPlus size={14} /> Add Subject
        </button>
      </div>

      {/* Semester groups */}
      {semesterGroups.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}><IconBarChart size={28} /></div>
          <p>No subjects yet. Add your first subject to get started.</p>
          <button className={s.btnPrimary} onClick={() => setShowAddModal(true)}>
            <IconPlus size={14} /> Add Subject
          </button>
        </div>
      ) : (
        semesterGroups.map(group => {
          const key       = `${group.academic_year}__${group.semester}`
          const isCollapsed = collapsed[key]
          const groupGPA  = calcGPA(group.subjects, components)

          return (
            <section key={key} className={s.semesterSection} aria-label={`Year ${group.academic_year}, Semester ${group.semester}`}>
              <button className={s.semesterHeader} onClick={() => toggleCollapse(key)}
                aria-expanded={!isCollapsed}>
                <div className={s.semesterLeft}>
                  <span className={s.semesterTitle}>
                    Academic Year {group.academic_year} · Semester {group.semester}
                  </span>
                  <span className={s.semesterMeta}>
                    {group.subjects.length} subject{group.subjects.length !== 1 ? 's' : ''}
                    {groupGPA != null && ` · GPA ${groupGPA.toFixed(2)}`}
                  </span>
                </div>
                {isCollapsed ? <IconChevDown size={15} /> : <IconChevUp size={15} />}
              </button>

              {!isCollapsed && (
                <div className={s.grid}>
                  {group.subjects.map(sub => (
                    <SubjectCard
                      key={sub.id}
                      subject={sub}
                      components={components[sub.id] || []}
                      onClick={() => onOpenSubject(sub.id)}
                      onDelete={() => deleteSubject(sub.id)}
                    />
                  ))}
                  <button className={s.enrollCard} onClick={() => setShowAddModal(true)}>
                    <span className={s.enrollPlus}><IconPlus size={20} /></span>
                    <span>Enroll New Subject</span>
                  </button>
                </div>
              )}
            </section>
          )
        })
      )}

      {/* Grade Predictor */}
      {subjects.length > 0 && (
        <div className={s.predictorBanner}>
          <div className={s.predictorLeft}>
            <h3>Grade Predictor</h3>
            <p>Open any subject's Analysis to see exactly what score you need on each remaining assessment.</p>
            <button className={s.btnOutlined} onClick={() => onOpenSubject(subjects[0].id)}>
              View Subjects
            </button>
          </div>
          <div className={s.predictorRight}>
            {subjects.slice(0, 4).map(sub => {
              const { earnedPoints, totalWeight, currentPct } = calcSubjectScore(components[sub.id] || [])
              const g = totalWeight > 0 ? getGrade(currentPct) : null
              return (
                <div key={sub.id} className={s.predictorRow}>
                  <span>{sub.name.length > 20 ? sub.name.slice(0, 20) + '…' : sub.name}</span>
                  <span className={s.predictorGrade}>{g ? g.grade : '—'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAddModal && <AddSubjectModal onAdd={addSubject} onClose={() => setShowAddModal(false)} />}
    </div>
  )
}