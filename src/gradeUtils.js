export const GRADE_THRESHOLDS = [
  { grade: 'A',  min: 80, gpa: 4.0 },
  { grade: 'B+', min: 75, gpa: 3.5 },
  { grade: 'B',  min: 70, gpa: 3.0 },
  { grade: 'C+', min: 65, gpa: 2.5 },
  { grade: 'C',  min: 60, gpa: 2.0 },
  { grade: 'D+', min: 55, gpa: 1.5 },
  { grade: 'D',  min: 50, gpa: 1.0 },
  { grade: 'F',  min: 0,  gpa: 0.0 },
]

export function getGrade(score) {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return t
  }
  return GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1]
}

// score_pct is 0-100 directly; weight is the % weight of the assessment
export function calcSubjectScore(components) {
  const filled   = components.filter(c => c.score_pct != null && c.score_pct !== '')
  const unfilled = components.filter(c => c.score_pct == null || c.score_pct === '')
  const totalWeight    = components.reduce((s, c) => s + c.weight, 0)
  const filledWeight   = filled.reduce((s, c) => s + c.weight, 0)
  // earnedPoints = sum of (score_pct/100)*weight — expressed as weighted score out of totalWeight
  const earnedPoints   = filled.reduce((s, c) => s + (parseFloat(c.score_pct) / 100) * c.weight, 0)
  const remainingWeight = unfilled.reduce((s, c) => s + c.weight, 0)
  const worstCase = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : 0
  const bestCase  = totalWeight > 0 ? ((earnedPoints + remainingWeight) / totalWeight) * 100 : 0
  return { earnedPoints, filledWeight, remainingWeight, totalWeight, worstCase, bestCase, filled, unfilled }
}

export function getAnalysis(components) {
  const { earnedPoints, remainingWeight, totalWeight, worstCase, bestCase } = calcSubjectScore(components)
  return GRADE_THRESHOLDS.map(t => {
    const needed          = t.min - earnedPoints          // weighted points still needed
    const secured         = worstCase >= t.min
    const possible        = bestCase  >= t.min
    // avg % student must score across ALL remaining assessments
    const requiredAvgPct  = remainingWeight > 0 ? (needed / remainingWeight) * 100 : 0
    const progressPct     = totalWeight > 0 ? Math.min(100, (earnedPoints / t.min) * 100) : 0
    return {
      ...t,
      needed:           Math.max(0, needed),
      requiredAvgPct:   Math.max(0, requiredAvgPct),
      secured,
      possible,
      progressPct:      Math.min(100, progressPct),
    }
  })
}

export function calcGPA(subjects, componentsMap) {
  const gpas = subjects.map(s => {
    const comps = componentsMap[s.id] || []
    const { earnedPoints, totalWeight } = calcSubjectScore(comps)
    if (totalWeight === 0) return null
    const pct = (earnedPoints / totalWeight) * 100
    return getGrade(pct).gpa
  }).filter(g => g !== null)
  if (gpas.length === 0) return null
  return gpas.reduce((a, b) => a + b, 0) / gpas.length
}