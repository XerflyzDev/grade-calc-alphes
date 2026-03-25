import { useState } from 'react'
import { supabase } from './supabase'
import { calcSubjectScore, getGrade } from './gradeUtils'
import s from './SubjectDetail.module.css'

export default function SubjectDetail({ subject, components, onBack, onAnalysis, onRefresh }) {
  const [editingId, setEditingId] = useState(null)
  const [editVals, setEditVals] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newComp, setNewComp] = useState({ name: '', weight: '', max_score: '100', score: '' })
  const [saving, setSaving] = useState(false)
  const [pendingEdits, setPendingEdits] = useState({}) // id -> score value

  const { earnedPoints, totalWeight, remainingWeight } = calcSubjectScore(components)
  const pct = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : null
  const grade = pct != null ? getGrade(pct) : null
  const weightCaptured = totalWeight > 0 ? ((totalWeight - remainingWeight) / totalWeight * 100).toFixed(0) : 0

  function startEdit(comp) {
    setEditingId(comp.id)
    setEditVals(v => ({ ...v, [comp.id]: comp.score ?? '' }))
  }

  async function saveAll() {
    setSaving(true)
    for (const [id, score] of Object.entries(pendingEdits)) {
      const val = score === '' ? null : parseFloat(score)
      await supabase.from('score_components').update({ score: val }).eq('id', id)
    }
    setPendingEdits({})
    setSaving(false)
    onRefresh()
  }

  async function addComponent() {
    if (!newComp.name || !newComp.weight) return
    setSaving(true)
    await supabase.from('score_components').insert({
      subject_id: subject.id,
      name: newComp.name,
      weight: parseFloat(newComp.weight),
      max_score: parseFloat(newComp.max_score) || 100,
      score: newComp.score !== '' ? parseFloat(newComp.score) : null,
    })
    setNewComp({ name: '', weight: '', max_score: '100', score: '' })
    setShowAdd(false)
    setSaving(false)
    onRefresh()
  }

  async function deleteComp(id) {
    await supabase.from('score_components').delete().eq('id', id)
    onRefresh()
  }

  function setPending(id, val) {
    setPendingEdits(p => ({ ...p, [id]: val }))
  }

  const hasUnsaved = Object.keys(pendingEdits).length > 0

  return (
    <div className={s.page}>
      {/* Breadcrumb */}
      <div className={s.breadcrumb}>
        <button onClick={onBack} className={s.breadLink}>Subjects</button>
        <span className={s.breadSep}>›</span>
        <span className={s.breadCurrent}>Current Semester</span>
      </div>

      {/* Title row */}
      <div className={s.titleRow}>
        <div className={s.titleLeft}>
          <h1 className={s.title}>{subject.name}</h1>
          <div className={s.titleMeta}>
            <span>📋 {components.length} assessments</span>
            <span>⚖ {totalWeight.toFixed(0)}% total weight</span>
          </div>
        </div>
        <div className={s.gradeCard}>
          <div className={s.gradeCardLabel}>CURRENT GRADE</div>
          <div className={s.gradeCardNum}>
            {pct != null ? pct.toFixed(1) : '--'}
            {pct != null && <span className={s.gradeCardOf}> / 100</span>}
          </div>
          <div className={s.gradeCardProgress}>
            <span className={s.gradeCardProgressLabel}>WEIGHT PROGRESS</span>
            <span className={s.gradeCardProgressPct} style={{color:'var(--primary)'}}>{weightCaptured}% Captured</span>
          </div>
          <div className={s.gradeCardBar}>
            <div className={s.gradeCardBarFill} style={{ width: `${weightCaptured}%` }} />
          </div>
        </div>
      </div>

      {/* Assessment table */}
      <div className={s.tableSection}>
        <div className={s.tableHeader}>
          <h2>Grade Assessment</h2>
          <button className={s.addCatBtn} onClick={() => setShowAdd(true)}>⊕ Add Category</button>
        </div>

        <div className={s.table}>
          <div className={s.tableHead}>
            <div className={s.colName}>CATEGORY NAME</div>
            <div className={s.colWeight}>WEIGHT (%)</div>
            <div className={s.colFull}>FULL SCORE</div>
            <div className={s.colObtained}>OBTAINED</div>
            <div className={s.colWeighted}>WEIGHTED %</div>
            <div className={s.colAction}></div>
          </div>

          {components.map(comp => {
            const currentScore = pendingEdits[comp.id] !== undefined ? pendingEdits[comp.id] : comp.score
            const filled = currentScore != null && currentScore !== ''
            const weightedPct = filled
              ? ((parseFloat(currentScore) / parseFloat(comp.max_score)) * comp.weight).toFixed(2) + '%'
              : 'Pending'
            return (
              <div key={comp.id} className={s.tableRow}>
                <div className={s.colName}>
                  <span className={s.compIcon}>📝</span>
                  <span className={s.compName}>{comp.name}</span>
                </div>
                <div className={s.colWeight}>
                  <span className={s.pill}>{comp.weight}</span>
                </div>
                <div className={s.colFull}>
                  <span className={s.pill}>{comp.max_score}</span>
                </div>
                <div className={s.colObtained}>
                  <input
                    type="number"
                    className={`${s.scoreInput} ${filled ? s.scoreInputFilled : ''}`}
                    value={pendingEdits[comp.id] !== undefined ? pendingEdits[comp.id] : (comp.score ?? '')}
                    placeholder="--"
                    min={0} max={comp.max_score} step="0.01"
                    onChange={e => setPending(comp.id, e.target.value)}
                  />
                </div>
                <div className={s.colWeighted}>
                  <span className={filled ? s.weightedFilled : s.weightedPending}>{weightedPct}</span>
                </div>
                <div className={s.colAction}>
                  <button className={s.deleteRowBtn} onClick={() => deleteComp(comp.id)}>🗑</button>
                </div>
              </div>
            )
          })}

          {/* Add row form */}
          {showAdd && (
            <div className={s.addRow}>
              <div className={s.colName}>
                <span className={s.compIcon}>📝</span>
                <input placeholder="Category name" value={newComp.name} onChange={e => setNewComp(p => ({...p, name: e.target.value}))} className={s.addRowInput} autoFocus />
              </div>
              <div className={s.colWeight}>
                <input type="number" placeholder="%" value={newComp.weight} onChange={e => setNewComp(p => ({...p, weight: e.target.value}))} className={s.addRowInput} />
              </div>
              <div className={s.colFull}>
                <input type="number" placeholder="100" value={newComp.max_score} onChange={e => setNewComp(p => ({...p, max_score: e.target.value}))} className={s.addRowInput} />
              </div>
              <div className={s.colObtained}>
                <input type="number" placeholder="--" value={newComp.score} onChange={e => setNewComp(p => ({...p, score: e.target.value}))} className={s.addRowInput} />
              </div>
              <div className={s.colWeighted}><span className={s.weightedPending}>—</span></div>
              <div className={s.colAction}>
                <button className={s.confirmAddBtn} onClick={addComponent} disabled={!newComp.name || !newComp.weight}>✓</button>
                <button className={s.cancelAddBtn} onClick={() => setShowAdd(false)}>✕</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer bar */}
        <div className={s.tableFooter}>
          <div className={s.footerLegend}>
            <span className={s.legendDot} style={{background:'var(--primary)'}} /> Completed Assessments
            <span className={s.legendDot} style={{background:'var(--text3)',marginLeft:'1rem'}} /> Upcoming
          </div>
          <div className={s.footerActions}>
            <button className={s.btnGhost} onClick={() => { setPendingEdits({}); onRefresh() }}>Reset All</button>
            <button className={s.btnPrimary} onClick={saveAll} disabled={saving || !hasUnsaved}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Analysis CTA */}
      <div className={s.analysisCTA}>
        <div>
          <strong>View detailed analysis</strong>
          <p>See grade thresholds, predictions, and exactly what you need to score.</p>
        </div>
        <button className={s.btnPrimary} onClick={onAnalysis}>Open Analysis →</button>
      </div>
    </div>
  )
}
