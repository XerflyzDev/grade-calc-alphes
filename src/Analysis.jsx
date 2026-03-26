import { useState } from 'react'
import { calcSubjectScore, getGrade, getAnalysis } from './gradeUtils'
import {
  IconArrowLeft, IconShield, IconTrend, IconTarget,
  IconCheckCircle, IconAlert, IconChevDown, IconChevUp, IconInfo
} from './Icons'
import s from './Analysis.module.css'

export default function Analysis({ subject, components, onBack, onHome }) {
  const [expandedGrade, setExpandedGrade] = useState(null)

  const analysis = getAnalysis(components)
  const { earnedPoints, totalWeight, remainingWeight, worstCase } = calcSubjectScore(components)
  const currentPct   = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : 0
  const currentGrade = getGrade(currentPct)
  const unfilled     = components.filter(c => c.score_pct == null || c.score_pct === '')
  const filled       = components.filter(c => c.score_pct != null && c.score_pct !== '')
  const consistencyPct = components.length > 0 ? Math.round((filled.length / components.length) * 100) : 0
  const passThreshold  = 50
  const onTrack        = worstCase >= passThreshold

  // Per-assessment breakdown for a target grade
  function getBreakdown(targetMin) {
    const needed = targetMin - earnedPoints
    if (needed <= 0 || remainingWeight === 0 || unfilled.length === 0) return null
    // Required average % across all remaining assessments
    const requiredAvgPct = (needed / remainingWeight) * 100
    return {
      requiredAvgPct,
      items: unfilled.map(comp => ({
        ...comp,
        // Each assessment needs requiredAvgPct (proportional distribution)
        neededPct: Math.min(100, Math.max(0, requiredAvgPct)),
        feasible:  requiredAvgPct <= 100,
      })),
    }
  }

  return (
    <div className={s.page}>
      {/* Breadcrumb nav */}
      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <button className={s.breadLink} onClick={onBack} aria-label="Back to subject">
          <IconArrowLeft size={13} /> {subject.name}
        </button>
        <span className={s.breadSep} aria-hidden="true">›</span>
        <span aria-current="page">Analysis</span>
      </nav>

      <div className={s.sectionLabel}>PERFORMANCE ANALYSIS</div>

      <div className={s.titleRow}>
        <h1 className={s.title}>{subject.name}</h1>
        <div className={s.currentGradeCard} aria-label="Current grade">
          <div className={s.cgLabel}>CURRENT GRADE</div>
          <div className={s.cgGrade}>{currentGrade.grade}</div>
          <div className={s.cgSub}>{currentPct.toFixed(1)}% standing</div>
        </div>
      </div>

      <div className={s.layout}>
        {/* Left column: grade thresholds */}
        <section className={s.mainCol} aria-label="Grade thresholds">
          <div className={s.threshCard}>
            <div className={s.threshHeader}>
              <div>
                <h2>Score needed for each grade</h2>
                <p>
                  {unfilled.length > 0
                    ? `${unfilled.length} assessment${unfilled.length > 1 ? 's' : ''} remaining · Click a grade to see per-assessment targets`
                    : 'All assessments completed'}
                </p>
              </div>
              <IconTrend size={18} className={s.headerIcon} />
            </div>

            <ol className={s.threshList} aria-label="Grade requirements">
              {analysis.map(item => {
                const isCurrent    = currentGrade.grade === item.grade
                const isLower      = item.min < currentGrade.min
                const isImpossible = !item.possible && !isLower
                const isExpanded   = expandedGrade === item.grade
                const breakdown    = (!isCurrent && !isLower && !isImpossible) ? getBreakdown(item.min) : null
                const canExpand    = breakdown && breakdown.items.length > 0

                return (
                  <li key={item.grade}>
                    <div
                      className={[
                        s.threshRow,
                        isCurrent    ? s.threshRowCurrent    : '',
                        isImpossible ? s.threshRowImpossible : '',
                      ].join(' ')}
                      onClick={() => canExpand && setExpandedGrade(isExpanded ? null : item.grade)}
                      style={{ cursor: canExpand ? 'pointer' : 'default' }}
                      role={canExpand ? 'button' : undefined}
                      tabIndex={canExpand ? 0 : undefined}
                      aria-expanded={canExpand ? isExpanded : undefined}
                      aria-label={canExpand ? `${item.grade}: expand breakdown` : undefined}
                      onKeyDown={e => { if (canExpand && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setExpandedGrade(isExpanded ? null : item.grade) } }}
                    >
                      <div className={s.threshLeft}>
                        {/* Grade badge */}
                        <div className={[
                          s.gradeBadge,
                          isCurrent    ? s.gradeBadgeCurrent    : '',
                          isLower      ? s.gradeBadgeLower      : '',
                          isImpossible ? s.gradeBadgeImpossible : '',
                        ].join(' ')} aria-hidden="true">
                          {item.grade}
                        </div>

                        <div className={s.threshInfo}>
                          {isCurrent ? (
                            <>
                              <div className={s.threshTitle} style={{color:'var(--primary)'}}>Currently achieved</div>
                              <div className={s.threshSub}>
                                Secured at {currentPct.toFixed(1)}% — {currentGrade.grade} (GPA {item.gpa.toFixed(1)})
                              </div>
                            </>
                          ) : isLower ? (
                            <>
                              <div className={s.threshTitle}>Achieved</div>
                              <div className={s.threshSub}>Threshold: {item.min}%</div>
                            </>
                          ) : isImpossible ? (
                            <>
                              <div className={s.threshTitle}>Not achievable</div>
                              <div className={s.threshSub}>Requires {item.min}% — not enough weight remaining</div>
                            </>
                          ) : (
                            <>
                              <div className={s.threshTitle}>
                                Average <strong className={s.highlight}>{item.requiredAvgPct.toFixed(1)}%</strong> on remaining assessments
                              </div>
                              <div className={s.threshSub}>
                                Target: {item.min}% total · Need {item.needed.toFixed(2)} more weighted points
                                {canExpand && (
                                  <span className={s.expandHint}>
                                    {isExpanded ? <IconChevUp size={11}/> : <IconChevDown size={11}/>} breakdown
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className={s.threshRight}>
                        {isCurrent && (
                          <span className={s.securedBadge}>
                            <IconCheckCircle size={12} /> Secured
                          </span>
                        )}
                        {!isCurrent && !isLower && !isImpossible && (
                          <span className={s.neededPill}>
                            avg {item.requiredAvgPct.toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className={s.threshBarWrap}>
                        <div className={s.threshBar}>
                          <div
                            className={[
                              s.threshBarFill,
                              isCurrent ? s.threshBarFillCurrent : '',
                              isLower   ? s.threshBarFillLower   : '',
                            ].join(' ')}
                            style={{ width: `${isCurrent || isLower ? 100 : Math.min(100, item.progressPct)}%` }}
                            role="progressbar"
                            aria-valuenow={isCurrent || isLower ? 100 : item.progressPct}
                            aria-valuemin="0" aria-valuemax="100"
                            aria-label={`Progress toward grade ${item.grade}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Per-assessment breakdown */}
                    {isExpanded && breakdown && (
                      <div className={s.breakdown} aria-label={`Breakdown for grade ${item.grade}`}>
                        <div className={s.breakdownIntro}>
                          <IconInfo size={14} />
                          To reach <strong>{item.grade}</strong>, you need to average{' '}
                          <strong className={s.highlight}>{breakdown.requiredAvgPct.toFixed(1)}%</strong>{' '}
                          across the {breakdown.items.length} remaining assessment{breakdown.items.length > 1 ? 's' : ''}.
                          {!breakdown.items[0].feasible && (
                            <span className={s.impossibleNote}> This grade is no longer achievable.</span>
                          )}
                        </div>

                        <table className={s.breakdownTable} aria-label="Per-assessment targets">
                          <thead>
                            <tr>
                              <th scope="col">Assessment</th>
                              <th scope="col">Weight</th>
                              <th scope="col">Required Score</th>
                              <th scope="col">Difficulty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {breakdown.items.map(b => {
                              const diff = b.neededPct > 85 ? 'hard' : b.neededPct > 60 ? 'medium' : 'easy'
                              return (
                                <tr key={b.id} className={!b.feasible ? s.rowImpossible : ''}>
                                  <td className={s.bName}>{b.name}</td>
                                  <td>{b.weight}%</td>
                                  <td className={s.bScore}>
                                    {b.feasible
                                      ? <><strong>{b.neededPct.toFixed(1)}%</strong></>
                                      : <span className={s.impossible}>Impossible</span>
                                    }
                                  </td>
                                  <td>
                                    <span className={`${s.diffBadge} ${s['diff_' + diff]}`}>
                                      {b.feasible ? diff : '—'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr className={s.breakdownSummaryRow}>
                              <th scope="row">Average needed</th>
                              <td>{remainingWeight.toFixed(0)}%</td>
                              <td><strong className={s.highlight}>{breakdown.requiredAvgPct.toFixed(1)}%</strong></td>
                              <td>—</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </li>
                )
              })}

              {/* F-Protection row */}
              <li>
                <div className={s.fProtectionRow} aria-label="Fail protection status">
                  <div className={s.fProtIcon} aria-hidden="true">
                    <IconShield size={16} />
                  </div>
                  <div className={s.fProtInfo}>
                    <div className={s.fProtTitle}>F-Protection</div>
                    <div className={s.fProtSub}>
                      {onTrack
                        ? 'Safe — you pass even if you score 0 on all remaining assessments.'
                        : `Need at least ${Math.max(0, passThreshold - earnedPoints).toFixed(1)} more weighted points to avoid failing.`}
                    </div>
                  </div>
                  <div className={s.fProtStatus}>
                    {onTrack
                      ? <span className={s.safeBadge}><IconCheckCircle size={12} /> Safe</span>
                      : <>
                          <span className={s.fProtNum}>{Math.max(0, passThreshold - earnedPoints).toFixed(1)}</span>
                          <span className={s.fProtLabel}>pts needed</span>
                        </>
                    }
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Right sidebar */}
        <aside className={s.sidebar} aria-label="Performance insights">
          {/* Predicted outcome */}
          <div className={s.sideCard}>
            <h3 className={s.sideTitle}><IconTarget size={15} /> Predicted Outcome</h3>
            <div className={s.outcomeRow}>
              <span className={s.outcomeLabel}>Completion rate</span>
              <span className={s.outcomeValue} style={{color: consistencyPct >= 70 ? 'var(--success)' : 'var(--warn)'}}>
                {consistencyPct >= 80 ? 'High' : consistencyPct >= 50 ? 'Medium' : 'Low'} ({consistencyPct}%)
              </span>
            </div>
            <div className={s.outcomeBarWrap}>
              <div className={s.outcomeBar} role="progressbar" aria-valuenow={consistencyPct} aria-valuemin="0" aria-valuemax="100" aria-label="Completion rate">
                <div className={s.outcomeBarFill} style={{width:`${consistencyPct}%`, background: consistencyPct >= 70 ? 'var(--primary)' : 'var(--warn)'}} />
              </div>
            </div>
            <div className={s.outcomeRow} style={{marginTop:'0.85rem'}}>
              <span className={s.outcomeLabel}>Pass status</span>
              <span className={s.outcomeValue} style={{color: onTrack ? 'var(--success)' : 'var(--danger)'}}>
                {onTrack ? 'On Track' : 'At Risk'}
              </span>
            </div>
            <div className={s.outcomeBarWrap}>
              <div className={s.outcomeBar} role="progressbar" aria-valuenow={Math.min(100,(worstCase/50)*100)} aria-valuemin="0" aria-valuemax="100" aria-label="Pass progress">
                <div className={s.outcomeBarFill} style={{width:`${Math.min(100,(worstCase/50)*100)}%`, background: onTrack ? 'var(--success)' : 'var(--danger)'}} />
              </div>
            </div>
          </div>

          {/* Upcoming assessments */}
          {unfilled.length > 0 && (
            <div className={s.sideCard}>
              <h3 className={s.sideTitle}>Upcoming Impact</h3>
              <ul className={s.upcomingList} aria-label="Remaining assessments">
                {unfilled.map(c => (
                  <li key={c.id} className={s.upcomingItem}>
                    <div className={s.upcomingIconBox} aria-hidden="true">
                      <IconAlert size={13} />
                    </div>
                    <div>
                      <div className={s.upcomingName}>{c.name}</div>
                      <div className={s.upcomingWeight}>Worth {c.weight}% of total</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary card */}
          <div className={s.trendCard}>
            <div className={s.trendLabel}>SUMMARY</div>
            <div className={s.trendText}>
              {filled.length > 0
                ? `${filled.length} of ${components.length} assessments completed · Current score: ${currentPct.toFixed(1)}%`
                : 'No scores entered yet. Add scores to see analysis.'}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}