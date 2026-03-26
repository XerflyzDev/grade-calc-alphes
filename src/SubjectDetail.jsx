import { useState } from 'react'
import { supabase } from './supabase'
import { calcSubjectScore, getGrade } from './gradeUtils'
import { IconArrowLeft, IconPlus, IconTrash, IconCheck, IconX, IconTrend } from './Icons'
import s from './SubjectDetail.module.css'

export default function SubjectDetail({ subject, components, onBack, onAnalysis, onRefresh }) {
  const [showAdd,    setShowAdd]    = useState(false)
  const [newComp,    setNewComp]    = useState({ name: '', weight: '', score_received: '', notYet: false })
  const [saving,     setSaving]     = useState(false)
  const [pending,    setPending]    = useState({})   // id -> score_received string
  const [notYetMap,  setNotYetMap]  = useState({})   // id -> bool
  const [toast,      setToast]      = useState(null)

  // Live totals applying pending edits
  const liveComps = components.map(c => ({
    ...c,
    score_received: notYetMap[c.id]
      ? null
      : pending[c.id] !== undefined ? pending[c.id] : c.score_received,
  }))
  const { earnedPoints, totalWeight, remainingWeight, currentPct } = calcSubjectScore(liveComps)
  const grade          = totalWeight > 0 ? getGrade(currentPct) : null
  const weightCaptured = totalWeight > 0 ? ((totalWeight - remainingWeight) / totalWeight * 100).toFixed(0) : 0
  const totalWeightSum = components.reduce((s, c) => s + c.weight, 0)

  function setScore(id, val) {
    setPending(p => ({ ...p, [id]: val }))
    if (val !== '') setNotYetMap(m => ({ ...m, [id]: false }))
  }
  function toggleNotYet(id, checked) {
    setNotYetMap(m => ({ ...m, [id]: checked }))
    if (checked) setPending(p => ({ ...p, [id]: '' }))
  }

  async function saveAll() {
    setSaving(true)
    for (const comp of components) {
      const isNotYet = notYetMap[comp.id] !== undefined ? notYetMap[comp.id] : (comp.score_received == null)
      const raw      = pending[comp.id]
      const changed  = pending[comp.id] !== undefined || notYetMap[comp.id] !== undefined
      if (!changed) continue
      const val = isNotYet || raw === '' || raw == null ? null : parseFloat(raw)
      await supabase.from('score_components').update({ score_received: val }).eq('id', comp.id)
    }
    setPending({}); setNotYetMap({})
    setSaving(false)
    setToast('Changes saved')
    setTimeout(() => setToast(null), 2200)
    onRefresh()
  }

  async function addComponent() {
    if (!newComp.name || !newComp.weight) return
    setSaving(true)
    await supabase.from('score_components').insert({
      subject_id:     subject.id,
      name:           newComp.name,
      weight:         parseFloat(newComp.weight),
      score_received: newComp.notYet || newComp.score_received === '' ? null : parseFloat(newComp.score_received),
    })
    setNewComp({ name: '', weight: '', score_received: '', notYet: false })
    setShowAdd(false); setSaving(false)
    onRefresh()
  }

  async function deleteComp(id, name) {
    if (!confirm(`Remove "${name}"?`)) return
    await supabase.from('score_components').delete().eq('id', id)
    onRefresh()
  }

  const hasUnsaved = Object.keys(pending).length > 0 || Object.keys(notYetMap).length > 0

  return (
    <div className={s.page}>
      {toast && (
        <div className={s.toast} role="status" aria-live="polite">
          <IconCheck size={13} /> {toast}
        </div>
      )}

      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <button className={s.breadLink} onClick={onBack}>
          <IconArrowLeft size={13} /> Subjects
        </button>
        <span className={s.breadSep} aria-hidden="true">›</span>
        <span aria-current="page">Current Semester</span>
      </nav>

      <div className={s.titleRow}>
        <div className={s.titleLeft}>
          <h1 className={s.title}>{subject.name}</h1>
          <div className={s.titleMeta}>
            <span>{components.length} assessment{components.length !== 1 ? 's' : ''}</span>
            <span>{totalWeightSum.toFixed(0)}% total weight</span>
            {subject.academic_year && <span>Year {subject.academic_year} · Semester {subject.semester}</span>}
          </div>
        </div>
        <div className={s.gradeCard} aria-label="Current grade">
          <div className={s.gradeCardLabel}>CURRENT SCORE</div>
          <div className={s.gradeCardNum}>
            {totalWeight > 0 ? earnedPoints.toFixed(2) : '—'}
            {totalWeight > 0 && <span className={s.gradeCardOf}> / {totalWeightSum.toFixed(0)}</span>}
          </div>
          {grade && <div className={s.gradeCardGrade}>{grade.grade}</div>}
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

      <section className={s.tableSection} aria-label="Grade Assessment">
        <div className={s.tableHeader}>
          <h2>Grade Assessment</h2>
          <button className={s.addCatBtn} onClick={() => setShowAdd(true)}>
            <IconPlus size={14} /> Add Assessment
          </button>
        </div>

        <div className={s.tableWrap}>
          {/* Head */}
          <div className={s.tableHead}>
            <div>ASSESSMENT NAME</div>
            <div>WEIGHT (%)</div>
            <div>
              SCORE RECEIVED
              <span className={s.headHint}> (out of weight)</span>
            </div>
            <div>NOT YET TAKEN</div>
            <div>WEIGHTED %</div>
            <div></div>
          </div>

          {/* Rows */}
          {components.map(comp => {
            const liveScore = notYetMap[comp.id]
              ? ''
              : pending[comp.id] !== undefined ? pending[comp.id] : (comp.score_received ?? '')
            const isNotYet  = notYetMap[comp.id] !== undefined ? notYetMap[comp.id] : (comp.score_received == null)
            const filled    = !isNotYet && liveScore !== '' && liveScore != null
            const weightedPct = filled
              ? ((parseFloat(liveScore) / comp.weight) * 100).toFixed(1) + '%'
              : '—'

            return (
              <div key={comp.id} className={s.tableRow}>
                <div className={s.colName}>
                  <span className={s.compName}>{comp.name}</span>
                </div>
                <div>
                  <span className={s.pill}>{comp.weight}%</span>
                </div>
                <div className={s.scoreCell}>
                  <div className={s.scoreInputGroup}>
                    <input
                      type="number" min="0" max={comp.weight} step="0.01"
                      className={`${s.scoreInput} ${filled ? s.scoreInputFilled : ''} ${isNotYet ? s.scoreInputDisabled : ''}`}
                      value={isNotYet ? '' : liveScore}
                      placeholder={isNotYet ? '—' : `0 – ${comp.weight}`}
                      disabled={isNotYet}
                      aria-label={`Score received for ${comp.name} out of ${comp.weight}%`}
                      onChange={e => setScore(comp.id, e.target.value)}
                    />
                    <span className={s.scoreMax}>/ {comp.weight}%</span>
                  </div>
                </div>
                <div className={s.checkCell}>
                  <label className={s.checkLabel}>
                    <input type="checkbox" className={s.checkbox}
                      checked={isNotYet}
                      aria-label={`Mark ${comp.name} as not yet taken`}
                      onChange={e => toggleNotYet(comp.id, e.target.checked)}
                    />
                  </label>
                </div>
                <div>
                  {isNotYet
                    ? <span className={s.pendingTag}>Pending</span>
                    : <span className={filled ? s.weightedFilled : s.weightedEmpty}>{weightedPct}</span>
                  }
                </div>
                <div className={s.actionCell}>
                  <button className={s.deleteRowBtn}
                    onClick={() => deleteComp(comp.id, comp.name)}
                    aria-label={`Delete ${comp.name}`}>
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Add row */}
          {showAdd && (
            <div className={`${s.tableRow} ${s.addRow}`}>
              <div className={s.colName}>
                <input className={s.addInput} placeholder="Assessment name" value={newComp.name}
                  onChange={e => setNewComp(p => ({...p, name: e.target.value}))}
                  aria-label="New assessment name" autoFocus />
              </div>
              <div>
                <input type="number" className={s.addInput} placeholder="e.g. 10" value={newComp.weight}
                  min="0" max="100" aria-label="Weight %"
                  onChange={e => setNewComp(p => ({...p, weight: e.target.value}))} />
              </div>
              <div className={s.scoreCell}>
                <div className={s.scoreInputGroup}>
                  <input type="number" className={`${s.addInput} ${newComp.notYet ? s.scoreInputDisabled : ''}`}
                    placeholder={newComp.weight ? `0 – ${newComp.weight}` : '0 – ?'}
                    value={newComp.notYet ? '' : newComp.score_received}
                    min="0" max={newComp.weight || 100} step="0.01" disabled={newComp.notYet}
                    aria-label="Score received"
                    onChange={e => setNewComp(p => ({...p, score_received: e.target.value}))} />
                  {newComp.weight && <span className={s.scoreMax}>/ {newComp.weight}%</span>}
                </div>
              </div>
              <div className={s.checkCell}>
                <label className={s.checkLabel}>
                  <input type="checkbox" className={s.checkbox} checked={newComp.notYet}
                    aria-label="Not yet taken"
                    onChange={e => setNewComp(p => ({...p, notYet: e.target.checked, score_received: ''}))} />
                </label>
              </div>
              <div><span className={s.weightedEmpty}>—</span></div>
              <div className={s.actionCell}>
                <button className={s.confirmBtn} onClick={addComponent}
                  disabled={!newComp.name || !newComp.weight} aria-label="Confirm">
                  <IconCheck size={13} />
                </button>
                <button className={s.cancelBtn} onClick={() => setShowAdd(false)} aria-label="Cancel">
                  <IconX size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Summary row */}
          {components.length > 0 && (
            <div className={s.summaryRow}>
              <div><span className={s.summaryLabel}>Total</span></div>
              <div><span className={s.summaryValue}>{totalWeightSum.toFixed(0)}%</span></div>
              <div><span className={s.summaryValue}>{earnedPoints.toFixed(2)}</span></div>
              <div></div>
              <div>
                <span className={s.summaryHighlight}>
                  {totalWeight > 0 ? currentPct.toFixed(2) + '%' : '—'}
                </span>
              </div>
              <div></div>
            </div>
          )}
        </div>

        <div className={s.tableFooter}>
          <div className={s.footerLegend}>
            <span className={s.legendDot} style={{background:'var(--primary)'}} aria-hidden="true" />
            <span>Completed</span>
            <span className={s.legendDot} style={{background:'var(--border2)',marginLeft:'0.75rem'}} aria-hidden="true" />
            <span>Upcoming</span>
          </div>
          <div className={s.footerActions}>
            <button className={s.btnGhost}
              onClick={() => { setPending({}); setNotYetMap({}) }}
              disabled={!hasUnsaved}>Reset</button>
            <button className={s.btnPrimary} onClick={saveAll}
              disabled={saving || !hasUnsaved} aria-busy={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </section>

      <div className={s.analysisCTA}>
        <div>
          <strong>Performance Analysis</strong>
          <p>See what score you need on each remaining assessment to reach your target grade.</p>
        </div>
        <button className={s.btnPrimary} onClick={onAnalysis}>
          <IconTrend size={14} /> Open Analysis
        </button>
      </div>
    </div>
  )
}