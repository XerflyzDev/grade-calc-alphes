import { useState } from 'react'
import { IconCalc, IconX, IconPercent, IconHash } from './Icons'
import s from './ScoreConverter.module.css'

export default function ScoreConverter({ onClose }) {
  const [mode, setMode] = useState('pct-to-q')  // 'pct-to-q' | 'q-to-pct'
  const [pct,   setPct]   = useState('')
  const [total, setTotal] = useState('')
  const [correct, setCorrect] = useState('')

  // pct-to-q: given % + total questions → correct answers needed
  const correctNeeded = pct !== '' && total !== ''
    ? Math.ceil((parseFloat(pct) / 100) * parseFloat(total))
    : null

  // q-to-pct: given correct + total → %
  const calcPct = correct !== '' && total !== '' && parseFloat(total) > 0
    ? ((parseFloat(correct) / parseFloat(total)) * 100).toFixed(2)
    : null

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="converter-title">
      <div className={s.panel}>
        <div className={s.panelHeader}>
          <div className={s.panelTitle}>
            <IconCalc size={18} />
            <h2 id="converter-title">Score Converter</h2>
          </div>
          <button className={s.closeBtn} onClick={onClose} aria-label="Close converter">
            <IconX size={16} />
          </button>
        </div>
        <p className={s.desc}>Convert between percentage scores and question counts.</p>

        {/* Mode toggle */}
        <div className={s.modeTabs} role="tablist" aria-label="Conversion mode">
          <button
            role="tab" aria-selected={mode === 'pct-to-q'}
            className={mode === 'pct-to-q' ? `${s.tab} ${s.tabActive}` : s.tab}
            onClick={() => setMode('pct-to-q')}
          >
            <IconPercent size={14} /> % → Questions
          </button>
          <button
            role="tab" aria-selected={mode === 'q-to-pct'}
            className={mode === 'q-to-pct' ? `${s.tab} ${s.tabActive}` : s.tab}
            onClick={() => setMode('q-to-pct')}
          >
            <IconHash size={14} /> Questions → %
          </button>
        </div>

        {mode === 'pct-to-q' ? (
          <div className={s.form}>
            <div className={s.field}>
              <label htmlFor="cv-pct">Target score (%)</label>
              <div className={s.inputWrap}>
                <input id="cv-pct" type="number" min="0" max="100" step="0.01"
                  value={pct} onChange={e => setPct(e.target.value)}
                  placeholder="e.g. 75" aria-describedby="cv-pct-hint" />
                <span className={s.inputUnit}>%</span>
              </div>
              <span id="cv-pct-hint" className={s.hint}>Enter the percentage score you want to achieve</span>
            </div>
            <div className={s.field}>
              <label htmlFor="cv-total1">Total questions</label>
              <div className={s.inputWrap}>
                <input id="cv-total1" type="number" min="1" step="1"
                  value={total} onChange={e => setTotal(e.target.value)}
                  placeholder="e.g. 40" />
                <span className={s.inputUnit}>Q</span>
              </div>
            </div>
            {correctNeeded !== null && !isNaN(correctNeeded) && (
              <div className={s.result} role="status" aria-live="polite">
                <div className={s.resultLabel}>Minimum correct answers needed</div>
                <div className={s.resultValue}>{correctNeeded} <span>/ {total}</span></div>
                <div className={s.resultSub}>
                  Exact: {((parseFloat(pct) / 100) * parseFloat(total)).toFixed(2)} questions
                  · Rounded up to avoid falling below {pct}%
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={s.form}>
            <div className={s.field}>
              <label htmlFor="cv-correct">Correct answers</label>
              <div className={s.inputWrap}>
                <input id="cv-correct" type="number" min="0" step="1"
                  value={correct} onChange={e => setCorrect(e.target.value)}
                  placeholder="e.g. 30" />
                <span className={s.inputUnit}>✓</span>
              </div>
            </div>
            <div className={s.field}>
              <label htmlFor="cv-total2">Total questions</label>
              <div className={s.inputWrap}>
                <input id="cv-total2" type="number" min="1" step="1"
                  value={total} onChange={e => setTotal(e.target.value)}
                  placeholder="e.g. 40" />
                <span className={s.inputUnit}>Q</span>
              </div>
            </div>
            {calcPct !== null && !isNaN(calcPct) && (
              <div className={s.result} role="status" aria-live="polite">
                <div className={s.resultLabel}>Your score</div>
                <div className={s.resultValue}>{calcPct}<span>%</span></div>
                <div className={s.resultSub}>
                  {correct} correct out of {total} questions
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
