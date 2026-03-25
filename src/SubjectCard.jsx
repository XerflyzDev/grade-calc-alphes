import { useState } from 'react'
import { supabase } from './supabase'
import { getGrade, gradeClass, calcScores, getRecommendations, GRADE_THRESHOLDS } from './gradeUtils'
import styles from './SubjectCard.module.css'

export default function SubjectCard({ subject, components, onRefresh }) {
  const [adding, setAdding] = useState(false)
  const [newComp, setNewComp] = useState({ name: '', weight: '', max_score: '100', score: '' })
  const [editingId, setEditingId] = useState(null)
  const [editScore, setEditScore] = useState('')
  const [showRec, setShowRec] = useState(false)
  const [loading, setLoading] = useState(false)

  const scores = calcScores(components)
  const recs = getRecommendations(components)
  const currentGrade = scores.filled_count > 0
    ? getGrade(scores.total_weight > 0 ? scores.current / scores.total_weight * 100 : 0)
    : null

  const displayScore = scores.total_weight > 0
    ? (scores.current / scores.total_weight * 100).toFixed(1)
    : '—'

  async function addComponent() {
    if (!newComp.name || !newComp.weight) return
    setLoading(true)
    await supabase.from('score_components').insert({
      subject_id: subject.id,
      name: newComp.name,
      weight: parseFloat(newComp.weight),
      max_score: parseFloat(newComp.max_score) || 100,
      score: newComp.score !== '' ? parseFloat(newComp.score) : null,
    })
    setNewComp({ name: '', weight: '', max_score: '100', score: '' })
    setAdding(false)
    setLoading(false)
    onRefresh()
  }

  async function updateScore(id, val) {
    const parsed = val === '' ? null : parseFloat(val)
    await supabase.from('score_components').update({ score: parsed }).eq('id', id)
    setEditingId(null)
    onRefresh()
  }

  async function deleteComponent(id) {
    await supabase.from('score_components').delete().eq('id', id)
    onRefresh()
  }

  async function deleteSubject() {
    if (!confirm(`ลบวิชา "${subject.name}" ทั้งหมด?`)) return
    await supabase.from('subjects').delete().eq('id', subject.id)
    onRefresh()
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0)

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{subject.name}</h3>
          <span className={styles.weightInfo}>น้ำหนักรวม {totalWeight.toFixed(0)}%</span>
        </div>
        <div className={styles.headerRight}>
          {currentGrade && (
            <div className={styles.gradeBox}>
              <span className={styles.scoreNum}>{scores.current.toFixed(1)}</span>
              <span className={`${styles.gradeBadge} ${gradeClass(currentGrade.grade)}`}>
                {currentGrade.grade}
              </span>
            </div>
          )}
          <button className={styles.deleteBtn} onClick={deleteSubject} title="ลบวิชา">✕</button>
        </div>
      </div>

      {/* Progress bar */}
      {scores.total_weight > 0 && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(100, scores.current / scores.total_weight * 100)}%` }}
            />
          </div>
          <span className={styles.progressLabel}>
            {scores.current.toFixed(1)} / {scores.total_weight.toFixed(0)} คะแนน
            {scores.unfilled_count > 0 && ` · ยังเหลืออีก ${scores.unfilled_count} หมวด`}
          </span>
        </div>
      )}

      {/* Components list */}
      <div className={styles.compList}>
        {components.map(c => (
          <div key={c.id} className={styles.compRow}>
            <div className={styles.compLeft}>
              <span className={styles.compName}>{c.name}</span>
              <span className={styles.compWeight}>{c.weight}%</span>
            </div>
            <div className={styles.compRight}>
              {editingId === c.id ? (
                <div className={styles.editRow}>
                  <input
                    type="number" step="0.01" min="0" max={c.max_score}
                    value={editScore}
                    onChange={e => setEditScore(e.target.value)}
                    placeholder={`0–${c.max_score}`}
                    className={styles.scoreInput}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') updateScore(c.id, editScore) }}
                  />
                  <button className={styles.saveBtn} onClick={() => updateScore(c.id, editScore)}>✓</button>
                  <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>✕</button>
                </div>
              ) : (
                <div className={styles.scoreDisplay}>
                  <button
                    className={c.score != null ? styles.scoreFilled : styles.scoreEmpty}
                    onClick={() => { setEditingId(c.id); setEditScore(c.score ?? '') }}
                  >
                    {c.score != null ? `${c.score}/${c.max_score}` : 'กรอกคะแนน'}
                  </button>
                  {c.score != null && (
                    <span className={styles.pctEarned}>
                      ({((c.score / c.max_score) * c.weight).toFixed(2)}%)
                    </span>
                  )}
                  <button className={styles.delCompBtn} onClick={() => deleteComponent(c.id)}>🗑</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add component form */}
      {adding ? (
        <div className={styles.addForm}>
          <div className={styles.addFormRow}>
            <input placeholder="ชื่อหมวดคะแนน เช่น Midterm" value={newComp.name}
              onChange={e => setNewComp(p => ({ ...p, name: e.target.value }))} />
            <input type="number" placeholder="น้ำหนัก %" value={newComp.weight} min="0" max="100"
              onChange={e => setNewComp(p => ({ ...p, weight: e.target.value }))} />
          </div>
          <div className={styles.addFormRow}>
            <input type="number" placeholder="คะแนนเต็ม (เช่น 100)" value={newComp.max_score}
              onChange={e => setNewComp(p => ({ ...p, max_score: e.target.value }))} />
            <input type="number" placeholder="คะแนนที่ได้ (ถ้ามี)" value={newComp.score}
              onChange={e => setNewComp(p => ({ ...p, score: e.target.value }))} />
          </div>
          <div className={styles.addFormActions}>
            <button className={styles.btnPrimary} onClick={addComponent} disabled={loading}>
              {loading ? '...' : '+ เพิ่ม'}
            </button>
            <button className={styles.btnGhost} onClick={() => setAdding(false)}>ยกเลิก</button>
          </div>
        </div>
      ) : (
        <button className={styles.addCompBtn} onClick={() => setAdding(true)}>
          + เพิ่มหมวดคะแนน
        </button>
      )}

      {/* Recommendation toggle */}
      {recs && components.length > 0 && (
        <div className={styles.recSection}>
          <button className={styles.recToggle} onClick={() => setShowRec(v => !v)}>
            {showRec ? '▴' : '▾'} คำแนะนำการวางแผน
          </button>
          {showRec && (
            <div className={styles.recGrid}>
              {recs.map(r => (
                <div key={r.grade} className={`${styles.recItem} ${!r.achievable ? styles.recImpossible : ''}`}>
                  <span className={`${styles.recGrade} ${gradeClass(r.grade)}`}>{r.grade}</span>
                  {r.achievable ? (
                    <span className={styles.recNeeded}>
                      ต้องทำ <strong>{r.needed_score.toFixed(1)}%</strong>
                      <br /><span className={styles.recSub}>จากคะแนนที่เหลือ {scores.remaining_weight.toFixed(0)}%</span>
                    </span>
                  ) : (
                    <span className={styles.recImpossibleText}>ไม่สามารถทำได้แล้ว</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
