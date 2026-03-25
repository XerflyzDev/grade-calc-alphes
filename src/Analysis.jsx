import { calcSubjectScore, getGrade, getAnalysis } from './gradeUtils'
import s from './Analysis.module.css'

export default function Analysis({ subject, components, onBack }) {
  const analysis = getAnalysis(components)
  const { earnedPoints, totalWeight, remainingWeight, bestCase, worstCase } = calcSubjectScore(components)
  const currentPct = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : 0
  const currentGrade = getGrade(currentPct)
  const unfilled = components.filter(c => c.score == null || c.score === '')
  const filled = components.filter(c => c.score != null && c.score !== '')
  const consistencyPct = components.length > 0 ? Math.round((filled.length / components.length) * 100) : 0
  const onTrack = worstCase >= 50

  // F protection: points needed to get at least 50%
  const fThreshold = 50
  const fNeeded = Math.max(0, fThreshold - earnedPoints)
  const fPctOfRemaining = remainingWeight > 0 ? (fNeeded / remainingWeight) * 100 : 0

  return (
    <div className={s.page}>
      {/* Label + title */}
      <div className={s.performanceLabel}>PERFORMANCE ANALYSIS</div>
      <div className={s.titleRow}>
        <div className={s.titleLeft}>
          <h1 className={s.title}>{subject.name}</h1>
        </div>
        <div className={s.currentGradeCard}>
          <div className={s.cgLabel}>CURRENT GRADE</div>
          <div className={s.cgGrade}>{currentGrade.grade}</div>
          <div className={s.cgSub}>
            {currentPct.toFixed(1)}% standing
          </div>
        </div>
      </div>

      <div className={s.layout}>
        {/* Main: Grade thresholds */}
        <div className={s.mainCol}>
          <div className={s.threshCard}>
            <div className={s.threshHeader}>
              <div>
                <h2>Points needed for the next grade</h2>
                <p>Based on upcoming {unfilled.length > 0 ? unfilled.map(c => c.name).join(', ') : 'assessments'}</p>
              </div>
              <span className={s.trendIcon}>📈</span>
            </div>

            <div className={s.threshList}>
              {analysis.map(item => {
                const isCurrent = currentGrade.grade === item.grade
                const isLower = item.min < currentGrade.min
                const isImpossible = !item.possible && !isLower

                let rowStyle = s.threshRow
                if (isCurrent) rowStyle = `${s.threshRow} ${s.threshRowCurrent}`
                else if (isImpossible) rowStyle = `${s.threshRow} ${s.threshRowImpossible}`

                return (
                  <div key={item.grade} className={rowStyle}>
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
                            <div className={s.threshTitle}>Needs {item.needed.toFixed(1)} more points</div>
                            <div className={s.threshSub}>TARGET THRESHOLD: {item.min}.0%</div>
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
                )
              })}

              {/* F Protection row */}
              <div className={s.fProtectionRow}>
                <div className={s.fProtIcon}>🛡</div>
                <div className={s.fProtInfo}>
                  <div className={s.fProtTitle}>F-Protection</div>
                  <div className={s.fProtSub}>
                    {worstCase >= 50
                      ? 'You are safe from failing even with 0 on remaining assessments.'
                      : `Needs at least ${fNeeded.toFixed(1)} more points to pass the course.`}
                  </div>
                </div>
                <div className={s.fProtPoints}>
                  {worstCase < 50 ? (
                    <><span className={s.fProtNum}>{fNeeded.toFixed(1)}</span><span className={s.fProtLabel}>POINTS TO GO</span></>
                  ) : (
                    <span className={s.safeBadge}>✓ SAFE</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={s.sidebar}>
          {/* Predicted Outcome */}
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
            <button className={s.simBtn} onClick={() => {}}>Run Simulator</button>
          </div>

          {/* Upcoming Impact */}
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

          {/* Trend analysis */}
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
