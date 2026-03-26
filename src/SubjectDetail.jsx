import { useState } from 'react'
import { supabase } from './supabase'
import { calcSubjectScore, getGrade } from './gradeUtils'
import {
  IconArrowLeft, IconPlus, IconTrash, IconCheck, IconX,
  IconTrend, IconPercent, IconHash, IconInfo
} from './Icons'
import s from './SubjectDetail.module.css'

export default function SubjectDetail({ subject, components, onBack, onAnalysis, onRefresh }) {
  const [showAdd,       setShowAdd]       = useState(false)
  const [newComp,       setNewComp]       = useState({ name: '', weight: '', score_pct: '', notYet: false, total_q: '', correct_q: '' })
  const [saving,        setSaving]        = useState(false)
  const [pendingScores, setPendingScores] = useState({})  // id -> score_pct string
  const [pendingNotYet, setPendingNotYet] = useState({})  // id -> bool
  const [pendingQtotal, setPendingQtotal] = useState({})  // id -> total_questions
  const [pendingQcorrect,setPendingQcorrect]= useState({}) // id -> correct_questions
  const [toast,         setToast]         = useState(null)

  const { earnedPoints, totalWeight, remainingWeight } = calcSubjectScore(components)
  const pct           = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : null
  const weightCaptured= totalWeight > 0 ? ((totalWeight - remainingWeight) / totalWeight * 100).toFixed(0) : 0

  // Live totals (applying pending edits)
  const liveComponents = components.map(c => ({
    ...c,
    score_pct: pendingNotYet[c.id] ? null
      : pendingScores[c.id] !== undefined ? pendingScores[c.id]
      : c.score_pct,
  }))
  const { earnedPoints: liveEarned } = calcSubjectScore(liveComponents)

  const totalWeightSum    = components.reduce((s, c) => s + c.weight, 0)
  const totalWeightedEarned = liveComponents.reduce((s, c) => {
    if (c.score_pct == null || c.score_pct === '') return s
    return s + (parseFloat(c.score_pct) / 100) * c.weight
  }, 0)

  function setScore(id, val) {
    setPendingScores(p => ({ ...p, [id]: val }))
    if (val !== '') setPendingNotYet(p => ({ ...p, [id]: false }))
  }
  function toggleNotYet(id, checked) {
    setPendingNotYet(p => ({ ...p, [id]: checked }))
    if (checked) setPendingScores(p => ({ ...p, [id]: '' }))
  }
  // Auto-fill score_pct from questions
  function handleQuestionsChange(id, field, val) {
    if (field === 'total')   setPendingQtotal(p   => ({ ...p, [id]: val }))
    if (field === 'correct') setPendingQcorrect(p => ({ ...p, [id]: val }))
    const total   = field === 'total'   ? val : (pendingQtotal[id]   ?? components.find(c=>c.id===id)?.total_questions ?? '')
    const correct = field === 'correct' ? val : (pendingQcorrect[id] ?? components.find(c=>c.id===id)?.correct_questions ?? '')
    if (total && correct && parseFloat(total) > 0) {
      const pct = ((parseFloat(correct) / parseFloat(total)) * 100).toFixed(2)
      setPendingScores(p => ({ ...p, [id]: pct }))
    }
  }

  async function saveAll() {
    setSaving(true)
    for (const comp of components) {
      const isNotYet  = pendingNotYet[comp.id] !== undefined ? pendingNotYet[comp.id] : (comp.score_pct == null)
      const rawScore  = pendingScores[comp.id] !== undefined ? pendingScores[comp.id] : null
      const qtotal    = pendingQtotal[comp.id]   !== undefined ? pendingQtotal[comp.id]   : null
      const qcorrect  = pendingQcorrect[comp.id] !== undefined ? pendingQcorrect[comp.id] : null
      const changed   = pendingNotYet[comp.id] !== undefined ||
                        pendingScores[comp.id] !== undefined ||
                        pendingQtotal[comp.id] !== undefined ||
                        pendingQcorrect[comp.id] !== undefined
      if (!changed) continue

      const update = { score_pct: isNotYet || rawScore === '' ? null : rawScore !== null ? parseFloat(rawScore) : comp.score_pct }
      if (qtotal   !== null) update.total_questions   = parseInt(qtotal)
      if (qcorrect !== null) update.correct_questions = parseInt(qcorrect)
      await supabase.from('score_components').update(update).eq('id', comp.id)
    }
    setPendingScores({}); setPendingNotYet({}); setPendingQtotal({}); setPendingQcorrect({})
    setSaving(false)
    setToast('Changes saved successfully')
    setTimeout(() => setToast(null), 2500)
    onRefresh()
  }

  async function addComponent() {
    if (!newComp.name || !newComp.weight) return
    setSaving(true)
    let scorePct = newComp.notYet || newComp.score_pct === '' ? null : parseFloat(newComp.score_pct)
    // If questions provided, derive score_pct
    if (!newComp.notYet && newComp.total_q && newComp.correct_q) {
      scorePct = parseFloat(((parseFloat(newComp.correct_q) / parseFloat(newComp.total_q)) * 100).toFixed(2))
    }
    await supabase.from('score_components').insert({
      subject_id:        subject.id,
      name:              newComp.name,
      weight:            parseFloat(newComp.weight),
      score_pct:         scorePct,
      total_questions:   newComp.total_q  ? parseInt(newComp.total_q)  : null,
      correct_questions: newComp.correct_q? parseInt(newComp.correct_q): null,
    })
    setNewComp({ name: '', weight: '', score_pct: '', notYet: false, total_q: '', correct_q: '' })
    setShowAdd(false); setSaving(false)
    onRefresh()
  }

  async function deleteComp(id, name) {
    if (!confirm(`Remove "${name}"?`)) return
    await supabase.from('score_components').delete().eq('id', id)
    onRefresh()
  }

  const hasUnsaved = Object.keys(pendingScores).length > 0 ||
                     Object.keys(pendingNotYet).length > 0 ||
                     Object.keys(pendingQtotal).length > 0 ||
                     Object.keys(pendingQcorrect).length > 0

  return (
    <div className={s.page}>
      {/* Toast */}
      {toast && (
        <div className={s.toast} role="status" aria-live="polite">
          <IconCheck size={14} /> {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <button className={s.breadLink} onClick={onBack} aria-label="Back to Subjects">
          <IconArrowLeft size={13} /> Subjects
        </button>
        <span className={s.breadSep} aria-hidden="true">›</span>
        <span className={s.breadCurrent} aria-current="page">Current Semester</span>
      </nav>

      {/* Title row */}
      <div className={s.titleRow}>
        <div className={s.titleLeft}>
          <h1 className={s.title}>{subject.name}</h1>
          <div className={s.titleMeta} aria-label="Subject info">
            <span>{components.length} assessment{components.length !== 1 ? 's' : ''}</span>
            <span>{totalWeightSum.toFixed(0)}% total weight</span>
          </div>
        </div>
        <div className={s.gradeCard} aria-label="Current grade summary">
          <div className={s.gradeCardLabel}>CURRENT GRADE</div>
          <div className={s.gradeCardNum}>
            {pct != null ? pct.toFixed(1) : '—'}
            {pct != null && <span className={s.gradeCardOf}> / 100</span>}
          </div>
          <div className={s.gradeCardProgress}>
            <span className={s.gradeCardProgressLabel}>WEIGHT CAPTURED</span>
            <span className={s.gradeCardProgressPct}>{weightCaptured}%</span>
          </div>
          <div className={s.gradeCardBar}>
            <div className={s.gradeCardBarFill} style={{ width: `${weightCaptured}%` }}
              role="progressbar" aria-valuenow={weightCaptured} aria-valuemin="0" aria-valuemax="100" />
          </div>
        </div>
      </div>

      {/* Assessment table */}
      <section className={s.tableSection} aria-label="Grade Assessment">
        <div className={s.tableHeader}>
          <h2>Grade Assessment</h2>
          <button className={s.addCatBtn} onClick={() => setShowAdd(true)} aria-expanded={showAdd}>
            <IconPlus size={14} /> Add Assessment
          </button>
        </div>

        <div className={s.table} role="table" aria-label="Assessment scores">
          {/* Column headers */}
          <div className={s.tableHead} role="row">
            <div role="columnheader">ASSESSMENT NAME</div>
            <div role="columnheader">WEIGHT (%)</div>
            <div role="columnheader">SCORE (%)</div>
            <div role="columnheader">
              <span className={s.colWithIcon}><IconHash size={11} /> Questions <span className={s.optBadge}>optional</span></span>
            </div>
            <div role="columnheader">NOT YET TAKEN</div>
            <div role="columnheader">WEIGHTED %</div>
            <div role="columnheader"><span className="sr-only">Actions</span></div>
          </div>

          {/* Data rows */}
          {components.map(comp => {
            const scorePct   = pendingNotYet[comp.id] ? '' : pendingScores[comp.id] !== undefined ? pendingScores[comp.id] : (comp.score_pct ?? '')
            const isNotYet   = pendingNotYet[comp.id] !== undefined ? pendingNotYet[comp.id] : (comp.score_pct == null)
            const qtotal     = pendingQtotal[comp.id]   !== undefined ? pendingQtotal[comp.id]   : (comp.total_questions   ?? '')
            const qcorrect   = pendingQcorrect[comp.id] !== undefined ? pendingQcorrect[comp.id] : (comp.correct_questions ?? '')
            const filled     = !isNotYet && scorePct !== '' && scorePct != null
            const weightedPct= filled ? ((parseFloat(scorePct) / 100) * comp.weight).toFixed(2) + '%' : '—'

            return (
              <div key={comp.id} className={s.tableRow} role="row">
                <div role="cell" className={s.colName}>
                  <span className={s.compName}>{comp.name}</span>
                </div>
                <div role="cell">
                  <span className={s.pill}>{comp.weight}%</span>
                </div>
                <div role="cell">
                  <div className={s.inputWrap}>
                    <input
                      type="number" min="0" max="100" step="0.01"
                      className={`${s.scoreInput} ${filled ? s.scoreInputFilled : ''} ${isNotYet ? s.scoreInputDisabled : ''}`}
                      value={isNotYet ? '' : scorePct}
                      placeholder={isNotYet ? '—' : '0–100'}
                      disabled={isNotYet}
                      aria-label={`Score for ${comp.name} (percentage)`}
                      onChange={e => setScore(comp.id, e.target.value)}
                    />
                    {!isNotYet && <IconPercent size={11} className={s.inputIcon} aria-hidden="true" />}
                  </div>
                </div>
                <div role="cell" className={s.qCell}>
                  <input type="number" min="0" step="1"
                    className={s.qInput} value={qcorrect}
                    placeholder="correct"
                    aria-label={`Correct answers for ${comp.name}`}
                    onChange={e => handleQuestionsChange(comp.id, 'correct', e.target.value)}
                    disabled={isNotYet}
                  />
                  <span className={s.qSlash}>/</span>
                  <input type="number" min="1" step="1"
                    className={s.qInput} value={qtotal}
                    placeholder="total"
                    aria-label={`Total questions for ${comp.name}`}
                    onChange={e => handleQuestionsChange(comp.id, 'total', e.target.value)}
                    disabled={isNotYet}
                  />
                </div>
                <div role="cell" className={s.checkCell}>
                  <label className={s.checkLabel}>
                    <input type="checkbox" className={s.checkbox}
                      checked={isNotYet}
                      aria-label={`Mark ${comp.name} as not yet taken`}
                      onChange={e => toggleNotYet(comp.id, e.target.checked)}
                    />
                  </label>
                </div>
                <div role="cell">
                  {isNotYet
                    ? <span className={s.pendingTag}>Pending</span>
                    : <span className={filled ? s.weightedFilled : s.weightedEmpty}>{weightedPct}</span>
                  }
                </div>
                <div role="cell" className={s.actionCell}>
                  <button className={s.deleteRowBtn} onClick={() => deleteComp(comp.id, comp.name)}
                    aria-label={`Delete ${comp.name}`}>
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Add row */}
          {showAdd && (
            <div className={s.addRow} role="row" aria-label="Add new assessment">
              <div role="cell" className={s.colName}>
                <input className={s.addRowInput} placeholder="Assessment name" value={newComp.name}
                  onChange={e => setNewComp(p => ({...p, name: e.target.value}))}
                  aria-label="New assessment name" autoFocus />
              </div>
              <div role="cell">
                <input type="number" className={s.addRowInput} placeholder="%" value={newComp.weight}
                  min="0" max="100" aria-label="Weight percentage"
                  onChange={e => setNewComp(p => ({...p, weight: e.target.value}))} />
              </div>
              <div role="cell">
                <input type="number" className={`${s.addRowInput} ${newComp.notYet ? s.scoreInputDisabled : ''}`}
                  placeholder="0–100" value={newComp.notYet ? '' : newComp.score_pct}
                  min="0" max="100" step="0.01" disabled={newComp.notYet}
                  aria-label="Score percentage"
                  onChange={e => setNewComp(p => ({...p, score_pct: e.target.value}))} />
              </div>
              <div role="cell" className={s.qCell}>
                <input type="number" className={s.qInput} placeholder="correct" value={newComp.correct_q}
                  disabled={newComp.notYet} aria-label="Correct answers"
                  onChange={e => {
                    const v = e.target.value
                    setNewComp(p => {
                      const total = p.total_q
                      const pct = total && v && parseFloat(total) > 0
                        ? ((parseFloat(v)/parseFloat(total))*100).toFixed(2) : p.score_pct
                      return {...p, correct_q: v, score_pct: pct}
                    })
                  }} />
                <span className={s.qSlash}>/</span>
                <input type="number" className={s.qInput} placeholder="total" value={newComp.total_q}
                  disabled={newComp.notYet} aria-label="Total questions"
                  onChange={e => {
                    const v = e.target.value
                    setNewComp(p => {
                      const correct = p.correct_q
                      const pct = v && correct && parseFloat(v) > 0
                        ? ((parseFloat(correct)/parseFloat(v))*100).toFixed(2) : p.score_pct
                      return {...p, total_q: v, score_pct: pct}
                    })
                  }} />
              </div>
              <div role="cell" className={s.checkCell}>
                <label className={s.checkLabel}>
                  <input type="checkbox" className={s.checkbox} checked={newComp.notYet}
                    aria-label="Not yet taken"
                    onChange={e => setNewComp(p => ({...p, notYet: e.target.checked, score_pct: ''}))} />
                </label>
              </div>
              <div role="cell">
                <span className={s.weightedEmpty}>—</span>
              </div>
              <div role="cell" className={s.actionCell}>
                <button className={s.confirmAddBtn} onClick={addComponent}
                  disabled={!newComp.name || !newComp.weight} aria-label="Confirm add assessment">
                  <IconCheck size={14} />
                </button>
                <button className={s.cancelAddBtn} onClick={() => setShowAdd(false)} aria-label="Cancel">
                  <IconX size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Summary row */}
          {components.length > 0 && (
            <div className={s.summaryRow} role="row" aria-label="Totals">
              <div role="cell"><span className={s.summaryLabel}>Total</span></div>
              <div role="cell"><span className={s.summaryValue}>{totalWeightSum.toFixed(0)}%</span></div>
              <div role="cell"></div>
              <div role="cell"></div>
              <div role="cell"></div>
              <div role="cell"><span className={s.summaryValueHighlight}>{totalWeightedEarned.toFixed(2)}%</span></div>
              <div role="cell"></div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={s.tableFooter}>
          <div className={s.footerLegend}>
            <span className={s.legendDot} style={{background:'var(--primary)'}} aria-hidden="true" />
            <span>Completed</span>
            <span className={s.legendDot} style={{background:'var(--text3)'}} aria-hidden="true" />
            <span>Upcoming</span>
          </div>
          <div className={s.footerActions}>
            <button className={s.btnGhost}
              onClick={() => { setPendingScores({}); setPendingNotYet({}); setPendingQtotal({}); setPendingQcorrect({}) }}
              disabled={!hasUnsaved}>Reset</button>
            <button className={s.btnPrimary} onClick={saveAll} disabled={saving || !hasUnsaved}
              aria-busy={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </section>

      {/* Analysis CTA */}
      <div className={s.analysisCTA}>
        <div>
          <strong>View full analysis</strong>
          <p>See grade thresholds and the score needed per assessment.</p>
        </div>
        <button className={s.btnPrimary} onClick={onAnalysis}>
          <IconTrend size={14} /> Open Analysis
        </button>
      </div>
    </div>
  )
}