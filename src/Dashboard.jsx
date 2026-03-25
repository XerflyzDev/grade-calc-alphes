import { useState } from 'react'
import { supabase } from './supabase'
import { calcSubjectScore, getGrade, calcGPA } from './gradeUtils'
import s from './Dashboard.module.css'

function SubjectCard({ subject, components, onClick, onAnalysis, onDelete }) {
  const { earnedPoints, totalWeight, currentPct } = calcSubjectScore(components)
  const hasData = totalWeight > 0 && components.some(c => c.score != null)
  const pct = hasData ? (earnedPoints / totalWeight) * 100 : null
  const grade = pct != null ? getGrade(pct) : null
  const tag = subject.tag || 'COURSE'

  return (
    <div className={s.subjectCard} onClick={onClick}>
      <div className={s.cardHeader}>
        <span className={s.cardTag}>{tag}</span>
        <button className={s.cardMenu} onClick={e => { e.stopPropagation(); onDelete() }}>✕</button>
      </div>
      <div className={s.cardTitle}>{subject.name}</div>
      <div className={s.cardSub}>{components.length} assessments</div>
      <div className={s.cardFooter}>
        <div>
          <div className={s.cardLabel}>CURRENT GRADE</div>
          <div className={s.cardGrade}>{pct != null ? `${pct.toFixed(0)}%` : '--'}</div>
        </div>
        {grade && <span className={s.cardGradeBadge}>{grade.grade}</span>}
      </div>
      <div className={s.cardBar}><div className={s.cardBarFill} style={{ width: `${Math.min(100, pct || 0)}%` }} /></div>
    </div>
  )
}

export default function Dashboard({ subjects, components, gpa, onOpenSubject, onOpenAnalysis, onRefresh, userId }) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  async function addSubject(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    await supabase.from('subjects').insert({ user_id: userId, name: newName.trim() })
    setNewName(''); setAdding(false); setShowAdd(false)
    onRefresh()
  }

  async function deleteSubject(id) {
    if (!confirm('Delete this subject?')) return
    await supabase.from('subjects').delete().eq('id', id)
    onRefresh()
  }

  const gpaDisplay = gpa != null ? gpa.toFixed(2) : '--'

  return (
    <div className={s.page}>
      {/* GPA Hero */}
      <div className={s.heroRow}>
        <div className={s.heroLeft}>
          <div className={s.heroLabel}>SEMESTER PERFORMANCE</div>
          <h1 className={s.gpaTitle}>
            Current GPA <span className={s.gpaNum}>{gpaDisplay}</span>
          </h1>
          {subjects.length > 0 && (
            <p className={s.gpaSub}>
              {subjects.length} subject{subjects.length !== 1 ? 's' : ''} tracked this semester.
              {gpa != null && gpa >= 3.5 ? ' Excellent standing! Keep it up.' : gpa != null && gpa >= 2.0 ? ' On track — stay consistent.' : ' Let\'s boost those grades.'}
            </p>
          )}
        </div>
        <div className={s.targetCard}>
          <div className={s.targetLabel}>TARGET GPA</div>
          <div className={s.targetNum}>4.00</div>
        </div>
      </div>

      {/* Subject grid */}
      <div className={s.grid}>
        {subjects.map(sub => (
          <SubjectCard
            key={sub.id}
            subject={sub}
            components={components[sub.id] || []}
            onClick={() => onOpenSubject(sub.id)}
            onAnalysis={() => onOpenAnalysis(sub.id)}
            onDelete={() => deleteSubject(sub.id)}
          />
        ))}

        {/* Add new subject card */}
        {showAdd ? (
          <form className={s.addCard} onSubmit={addSubject}>
            <input
              placeholder="Subject name, e.g. Calculus I"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
              className={s.addInput}
            />
            <div className={s.addActions}>
              <button type="submit" className={s.btnPrimary} disabled={adding || !newName.trim()}>
                {adding ? '...' : 'Add'}
              </button>
              <button type="button" className={s.btnGhost} onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button className={s.enrollCard} onClick={() => setShowAdd(true)}>
            <span className={s.enrollPlus}>+</span>
            <span className={s.enrollLabel}>Enroll New Subject</span>
          </button>
        )}
      </div>

      {/* Grade Predictor banner */}
      {subjects.length > 0 && (
        <div className={s.predictorBanner}>
          <div className={s.predictorLeft}>
            <h3>Grade Predictor</h3>
            <p>Select a subject and open its Analysis to see exactly what scores you need to reach your target grade.</p>
            <button className={s.btnOutlined} onClick={() => subjects[0] && onOpenAnalysis(subjects[0].id)}>
              Run Analysis
            </button>
          </div>
          <div className={s.predictorRight}>
            <div className={s.predictorMockScreen}>
              {subjects.slice(0, 3).map(s_ => (
                <div key={s_.id} className={s.predictorRow}>
                  <span>{s_.name.slice(0, 18)}</span>
                  <span className={s.predictorGrade}>
                    {(() => {
                      const { earnedPoints, totalWeight } = calcSubjectScore(components[s_.id] || [])
                      const pct = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : null
                      return pct != null ? getGrade(pct).grade : '--'
                    })()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
