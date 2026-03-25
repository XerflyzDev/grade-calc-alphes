import { useState } from 'react'
import { calcSubjectScore, getGrade, getAnalysis, GRADE_THRESHOLDS } from './gradeUtils'
import s from './Analysis.module.css'

export default function Analysis({ subject, components, onBack }) {
  const [expandedGrade, setExpandedGrade] = useState(null)

  const analysis = getAnalysis(components)
  const { earnedPoints, totalWeight, remainingWeight, worstCase } = calcSubjectScore(components)
  const currentPct = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : 0
  const currentGrade = getGrade(currentPct)
  const unfilled = components.filter(c => c.score == null || c.score === '')
  const filled = components.filter(c => c.score != null && c.score !== '')
  const consistencyPct = components.length > 0 ? Math.round((filled.length / components.length) * 100) : 0
  const onTrack = worstCase >= 50

  // For each grade threshold, compute per-assessment needed scores
  function getPerAssessmentBreakdown(targetMin) {
    const needed = targetMin - earnedPoints  // total points still needed
    if (needed <= 0 || remainingWeight === 0) return null

    // Strategy: distribute proportionally to each unfilled assessment's weight
    return unfilled.map(comp => {
      const share = (comp.weight / remainingWeight) * needed
      const neededScore = (share / comp.weight) * comp.max_score
      return {
        ...comp,
        neededScore: Math.max(0, Math.min(comp.max_score, neededScore)),
        neededPct: Math.max(0, Math.min(100, (neededScore / comp.max_score) * 100)),
        possible: neededScore <= comp.max_score,
      }
    })
  }

  return (
    <div className={s.page}>
      <div className={s.performanceLabel}>PERFORMANCE ANALYSIS</div>

      <div className={s.titleRow}>
        <div className={s.titleLeft}>
          <button className={s.backBtn} onClick={onBack}>← Back</button>
          <h1 className={s.title}>{subject.name}</h1>
        </div>
        <div className={s.currentGradeCard}>
          <div className={s.cgLabel}>CURRENT GRADE</div>
          <div className={s.cgGrade}>{currentGrade.grade}</div>
          <div className={s.cgSub}>{currentPct.toFixed(1)}% standing</div>
        </div>
      </div>

      <div className={s.layout}>
        {/* Left: thresholds */}
        <div className={s.mainCol}>
          <div className={s.threshCard}>
            <div className={s.threshHeader}>
              <div>
                <h2>Points needed for the next grade</h2>
                <p>คลิกที่เกรดเพื่อดู breakdown ต่อ assessment · {unfilled.length} รายการยังไม่ได้สอบ</p>
              </div>
              <span className={s.trendIcon}>📈</span>
            </div>

            <div className={s.threshList}>
              {analysis.map(item => {
                const isCurrent = currentGrade.grade === item.grade
                const isLower = item.min < currentGrade.min
                const isImpossible = !item.possible && !isLower
                const isExpanded = expandedGrade === item.grade
                const breakdown = (!isCurrent && !isLower && !isImpossible) ? getPerAssessmentBreakdown(item.min) : null
                const canExpand = breakdown && breakdown.length > 0

                let rowStyle = s.threshRow
                if (isCurrent) rowStyle = `${s.threshRow} ${s.threshRowCurrent}`
                else if (isImpossible) rowStyle = `${s.threshRow} ${s.threshRowImpossible}`

                return (
                  <div key={item.grade}>
                    <div
                      className={rowStyle}
                      onClick={() => canExpand && setExpandedGrade(isExpanded ? null : item.grade)}
                      style={{ cursor: canExpand ? 'pointer' : 'default' }}
                    >
                      <div className={s.threshLeft}>
                        <div className={`${s.gradeBadge} ${isCurrent ? s.gradeBadgeCurrent : ''} ${isLower ? s.gradeBadgeLower : ''} ${isImpossible ? s.gradeBadgeImpossible : ''}`}>
                          {item.grade}
                        </div>
                        <div className={s.threshInfo}>
                          {isCurrent ? (
                            <>
                              <div className={s.threshTitle} style={{color:'var(--primary)'}}>Currently achieved</div>
                              <div className={s.threshSub}>CURRENT STANDING: {currentPct.toFixed(1)}%</div>
                            </>
                          ) : isLower ? (
                            <>
                              <div className={s.threshTitle}>Achieved</div>
                              <div className={s.threshSub}>BASELINE: {item.min}.0%</div>
                            </>
                          ) : isImpossible ? (
                            <>
                              <div className={s.threshTitle}>Not achievable</div>
                              <div className={s.threshSub}>REQUIRES: {item.min}.0%</div>
                            </>
                          ) : (
                            <>
                              <div className={s.threshTitle}>
                                Needs {item.needed.toFixed(1)} more weighted points
                                {canExpand && <span className={s.expandHint}> {isExpanded ? '▴' : '▾'} ดู breakdown</span>}
                              </div>
                              <div className={s.threshSub}>TARGET: {item.min}.0% · เหลือ {remainingWeight.toFixed(0)}% weight</div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className={s.threshRight}>
                        {isCurrent && <span className={s.securedBadge}>✓ SECURED</span>}
                        {!isCurrent && !isLower && !isImpossible && (
                          <span className={s.neededPill}>+{item.needed.toFixed(1)} pts</span>
                        )}
                      </div>
                      <div className={s.threshBarWrap}>
                        <div className={s.threshBar}>
                          <div
                            className={`${s.threshBarFill} ${isCurrent ? s.threshBarFillCurrent : isLower ? s.threshBarFillLower : ''}`}
                            style={{ width: `${isCurrent || isLower ? 100 : Math.min(100, item.progressPct)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Per-assessment breakdown */}
                    {isExpanded && breakdown && (
                      <div className={s.breakdown}>
                        <div className={s.breakdownTitle}>
                          📋 ต้องทำคะแนนต่อ Assessment เพื่อให้ได้เกรด <strong>{item.grade}</strong>
                        </div>
                        <div className={s.breakdownTable}>
                          <div className={s.breakdownHead}>
                            <span>Assessment</span>
                            <span>Weight</span>
                            <span>Full Score</span>
                            <span>ต้องทำได้</span>
                            <span>คิดเป็น %</span>
                          </div>
                          {breakdown.map(b => (
                            <div key={b.id} className={`${s.breakdownRow} ${!b.possible ? s.breakdownRowImpossible : ''}`}>
                              <span className={s.breakdownName}>
                                {!b.possible && <span className={s.impossibleDot}>⚠</span>}
                                {b.name}
                              </span>
                              <span>{b.weight}%</span>
                              <span>{b.max_score}</span>
                              <span className={`${s.breakdownScore} ${b.neededPct > 85 ? s.scoreHard : b.neededPct > 60 ? s.scoreMedium : s.scoreEasy}`}>
                                {b.possible ? b.neededScore.toFixed(1) : 'เต็ม 100% ก็ไม่พอ'}
                              </span>
                              <span className={s.breakdownPct}>
                                {b.possible ? `${b.neededPct.toFixed(1)}%` : '—'}
                              </span>
                            </div>
                          ))}
                          {/* Summary */}
                          <div className={s.breakdownSummary}>
                            <span>รวมทั้งหมด</span>
                            <span>{remainingWeight.toFixed(0)}%</span>
                            <span>—</span>
                            <span className={s.breakdownScore}>+{item.needed.toFixed(1)} pts</span>
                            <span className={s.breakdownPct}>{((item.needed / remainingWeight) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* F Protection */}
              <div className={s.fProtectionRow}>
                <div className={s.fProtIcon}>🛡</div>
                <div className={s.fProtInfo}>
                  <div className={s.fProtTitle}>F-Protection</div>
                  <div className={s.fProtSub}>
                    {onTrack
                      ? 'ปลอดภัย! แม้ทำ 0 คะแนนในที่เหลือ ก็ยังไม่ติด F'
                      : `ต้องทำอีก ${Math.max(0, 50 - earnedPoints).toFixed(1)} คะแนน เพื่อไม่ติด F`}
                  </div>
                </div>
                <div className={s.fProtPoints}>
                  {onTrack
                    ? <span className={s.safeBadge}>✓ SAFE</span>
                    : <>
                        <span className={s.fProtNum}>{Math.max(0, 50 - earnedPoints).toFixed(1)}</span>
                        <span className={s.fProtLabel}>POINTS TO GO</span>
                      </>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={s.sidebar}>
          <div className={s.sideCard}>
            <h3 className={s.sideTitle}>🎯 Predicted Outcome</h3>
            <div className={s.outcomeRow}>
              <span className={s.outcomeLabel}>Consistency</span>
              <span className={s.outcomeValue} style={{color: consistencyPct >= 70 ? 'var(--success)' : 'var(--warn)'}}>
                {consistencyPct >= 80 ? 'High' : consistencyPct >= 50 ? 'Medium' : 'Low'} ({consistencyPct}%)
              </span>
            </div>
            <div className={s.outcomeBarWrap}>
              <div className={s.outcomeBar}><div className={s.outcomeBarFill} style={{width:`${consistencyPct}%`, background: consistencyPct >= 70 ? 'var(--primary)' : 'var(--warn)'}} /></div>
            </div>
            <div className={s.outcomeRow} style={{marginTop:'0.75rem'}}>
              <span className={s.outcomeLabel}>Effort vs. Goal</span>
              <span className={s.outcomeValue} style={{color: onTrack ? 'var(--success)' : 'var(--danger)'}}>
                {onTrack ? 'On Track' : 'At Risk'}
              </span>
            </div>
            <div className={s.outcomeBarWrap}>
              <div className={s.outcomeBar}><div className={s.outcomeBarFill} style={{width:`${Math.min(100,(worstCase/50)*100)}%`, background: onTrack ? 'var(--success)' : 'var(--danger)'}} /></div>
            </div>
          </div>

          {unfilled.length > 0 && (
            <div className={s.sideCard}>
              <h3 className={s.sideTitle}>Upcoming Impact</h3>
              <div className={s.upcomingList}>
                {unfilled.map(c => (
                  <div key={c.id} className={s.upcomingItem}>
                    <span className={s.upcomingIcon}>📋</span>
                    <div>
                      <div className={s.upcomingName}>{c.name}</div>
                      <div className={s.upcomingWeight}>Worth {c.weight}% of Total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={s.trendCard}>
            <div className={s.trendLabel}>TREND ANALYSIS</div>
            <div className={s.trendText}>
              {filled.length > 0
                ? `${filled.length} assessment${filled.length > 1 ? 's' : ''} completed · ${currentPct.toFixed(1)}% current score`
                : 'No scores entered yet. Add your scores to see trends.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}