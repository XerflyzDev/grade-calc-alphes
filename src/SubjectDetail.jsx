import { useState } from 'react'
import { supabase } from './supabase'
import { calcSubjectScore, getGrade } from './gradeUtils'
import s from './SubjectDetail.module.css'

export default function SubjectDetail({ subject, components, onBack, onAnalysis, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false)
  const [newComp, setNewComp] = useState({ name: '', weight: '', max_score: '100', score: '', pending: false })
  const [saving, setSaving] = useState(false)
  const [pendingEdits, setPendingEdits] = useState({})   // id -> { score, pending }
  const [pendingFlags, setPendingFlags] = useState({})   // id -> true (ยังไม่ได้สอบ)

  const { earnedPoints, totalWeight, remainingWeight } = calcSubjectScore(components)
  const pct = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : null
  const grade = pct != null ? getGrade(pct) : null
  const weightCaptured = totalWeight > 0 ? ((totalWeight - remainingWeight) / totalWeight * 100).toFixed(0) : 0

  // totals for summary row
  const totalWeightSum = components.reduce((s, c) => s + c.weight, 0)
  const totalWeightedEarned = components.reduce((s, c) => {
    const scoreVal = pendingEdits[c.id] !== undefined ? pendingEdits[c.id] : c.score
    const isPending = pendingFlags[c.id] !== undefined ? pendingFlags[c.id] : (c.score == null)
    if (isPending || scoreVal == null || scoreVal === '') return s
    return s + (parseFloat(scoreVal) / parseFloat(c.max_score)) * c.weight
  }, 0)

  function setPending(id, val) {
    setPendingEdits(p => ({ ...p, [id]: val }))
    // if typing a value, unset the "ยังไม่ได้สอบ" flag
    if (val !== '') setPendingFlags(p => ({ ...p, [id]: false }))
  }

  function toggleNotYet(id, checked) {
    setPendingFlags(p => ({ ...p, [id]: checked }))
    if (checked) setPendingEdits(p => ({ ...p, [id]: '' }))
  }

  async function saveAll() {
    setSaving(true)
    for (const comp of components) {
      const isNotYet = pendingFlags[comp.id] !== undefined ? pendingFlags[comp.id] : (comp.score == null)
      const rawScore = pendingEdits[comp.id] !== undefined ? pendingEdits[comp.id] : comp.score

      let newScore = null
      if (!isNotYet && rawScore !== '' && rawScore != null) {
        newScore = parseFloat(rawScore)
      }

      const changed =
        pendingEdits[comp.id] !== undefined ||
        pendingFlags[comp.id] !== undefined

      if (changed) {
        await supabase.from('score_components').update({ score: newScore }).eq('id', comp.id)
      }
    }
    setPendingEdits({})
    setPendingFlags({})
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
      score: newComp.pending || newComp.score === '' ? null : parseFloat(newComp.score),
    })
    setNewComp({ name: '', weight: '', max_score: '100', score: '', pending: false })
    setShowAdd(false)
    setSaving(false)
    onRefresh()
  }

  async function deleteComp(id) {
    await supabase.from('score_components').delete().eq('id', id)
    onRefresh()
  }

  const hasUnsaved = Object.keys(pendingEdits).length > 0 || Object.keys(pendingFlags).length > 0

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
            <span className={s.gradeCardProgressPct}>{weightCaptured}% Captured</span>
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
          {/* Head */}
          <div className={s.tableHead}>
            <div className={s.colName}>CATEGORY NAME</div>
            <div className={s.colWeight}>WEIGHT (%)</div>
            <div className={s.colFull}>FULL SCORE</div>
            <div className={s.colObtained}>OBTAINED</div>
            <div className={s.colPending}>ยังไม่ได้สอบ</div>
            <div className={s.colWeighted}>WEIGHTED %</div>
            <div className={s.colAction}></div>
          </div>

          {/* Rows */}
          {components.map(comp => {
            const scoreVal = pendingEdits[comp.id] !== undefined ? pendingEdits[comp.id] : (comp.score ?? '')
            const isNotYet = pendingFlags[comp.id] !== undefined ? pendingFlags[comp.id] : (comp.score == null)
            const filled = !isNotYet && scoreVal !== '' && scoreVal != null

            const weightedPct = filled
              ? ((parseFloat(scoreVal) / parseFloat(comp.max_score)) * comp.weight).toFixed(2) + '%'
              : '—'

            return (
              <div key={comp.id} className={s.tableRow}>
                <div className={s.colName}>
                  <span className={s.compIcon}>📝</span>
                  <span className={s.compName}>{comp.name}</span>
                </div>
                <div className={s.colWeight}><span className={s.pill}>{comp.weight}</span></div>
                <div className={s.colFull}><span className={s.pill}>{comp.max_score}</span></div>
                <div className={s.colObtained}>
                  <input
                    type="number"
                    className={`${s.scoreInput} ${filled ? s.scoreInputFilled : ''} ${isNotYet ? s.scoreInputDisabled : ''}`}
                    value={isNotYet ? '' : scoreVal}
                    placeholder={isNotYet ? '—' : '--'}
                    min={0} max={comp.max_score} step="0.01"
                    disabled={isNotYet}
                    onChange={e => setPending(comp.id, e.target.value)}
                  />
                </div>
                <div className={s.colPending}>
                  <label className={s.checkLabel}>
                    <input
                      type="checkbox"
                      className={s.checkbox}
                      checked={isNotYet}
                      onChange={e => toggleNotYet(comp.id, e.target.checked)}
                    />
                  </label>
                </div>
                <div className={s.colWeighted}>
                  {isNotYet
                    ? <span className={s.pendingTag}>Pending</span>
                    : <span className={filled ? s.weightedFilled : s.weightedPending}>{weightedPct}</span>
                  }
                </div>
                <div className={s.colAction}>
                  <button className={s.deleteRowBtn} onClick={() => deleteComp(comp.id)}>🗑</button>
                </div>
              </div>
            )
          })}

          {/* Add row */}
          {showAdd && (
            <div className={s.addRow}>
              <div className={s.colName}>
                <span className={s.compIcon}>📝</span>
                <input placeholder="Category name" value={newComp.name}
                  onChange={e => setNewComp(p => ({...p, name: e.target.value}))}
                  className={s.addRowInput} autoFocus />
              </div>
              <div className={s.colWeight}>
                <input type="number" placeholder="%" value={newComp.weight}
                  onChange={e => setNewComp(p => ({...p, weight: e.target.value}))}
                  className={s.addRowInput} />
              </div>
              <div className={s.colFull}>
                <input type="number" placeholder="100" value={newComp.max_score}
                  onChange={e => setNewComp(p => ({...p, max_score: e.target.value}))}
                  className={s.addRowInput} />
              </div>
              <div className={s.colObtained}>
                <input type="number" placeholder="--" value={newComp.pending ? '' : newComp.score}
                  disabled={newComp.pending}
                  onChange={e => setNewComp(p => ({...p, score: e.target.value}))}
                  className={`${s.addRowInput} ${newComp.pending ? s.scoreInputDisabled : ''}`} />
              </div>
              <div className={s.colPending}>
                <label className={s.checkLabel}>
                  <input type="checkbox" className={s.checkbox} checked={newComp.pending}
                    onChange={e => setNewComp(p => ({...p, pending: e.target.checked, score: ''}))} />
                </label>
              </div>
              <div className={s.colWeighted}><span className={s.weightedPending}>—</span></div>
              <div className={s.colAction}>
                <button className={s.confirmAddBtn} onClick={addComponent} disabled={!newComp.name || !newComp.weight}>✓</button>
                <button className={s.cancelAddBtn} onClick={() => setShowAdd(false)}>✕</button>
              </div>
            </div>
          )}

          {/* Summary row */}
          {components.length > 0 && (
            <div className={s.summaryRow}>
              <div className={s.colName}>
                <span className={s.summaryLabel}>รวมทั้งหมด</span>
              </div>
              <div className={s.colWeight}>
                <span className={s.summaryValue}>{totalWeightSum.toFixed(0)}%</span>
              </div>
              <div className={s.colFull}></div>
              <div className={s.colObtained}></div>
              <div className={s.colPending}></div>
              <div className={s.colWeighted}>
                <span className={s.summaryValueHighlight}>{totalWeightedEarned.toFixed(2)}%</span>
              </div>
              <div className={s.colAction}></div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={s.tableFooter}>
          <div className={s.footerLegend}>
            <span className={s.legendDot} style={{background:'var(--primary)'}} /> Completed Assessments
            <span className={s.legendDot} style={{background:'var(--text3)',marginLeft:'1rem'}} /> Upcoming
          </div>
          <div className={s.footerActions}>
            <button className={s.btnGhost} onClick={() => { setPendingEdits({}); setPendingFlags({}); }}>Reset All</button>
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
          <p>See grade thresholds, predictions, and exactly what you need to score per assessment.</p>
        </div>
        <button className={s.btnPrimary} onClick={onAnalysis}>Open Analysis →</button>
      </div>
    </div>
  )
}