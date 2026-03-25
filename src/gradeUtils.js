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

export function calcSubjectScore(components) {
  const filled = components.filter(c => c.score != null && c.score !== '')
  const unfilled = components.filter(c => c.score == null || c.score === '')
  const totalWeight = components.reduce((s, c) => s + c.weight, 0)
  const filledWeight = filled.reduce((s, c) => s + c.weight, 0)
  const earnedPoints = filled.reduce((s, c) => s + (parseFloat(c.score) / parseFloat(c.max_score)) * c.weight, 0)
  const remainingWeight = unfilled.reduce((s, c) => s + c.weight, 0)
  // current % based on weight captured so far
  const currentPct = filledWeight > 0 ? (earnedPoints / filledWeight) * 100 : null
  // projected if remaining is 0
  const worstCase = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : 0
  // projected if remaining is 100%
  const bestCase = totalWeight > 0 ? ((earnedPoints + remainingWeight) / totalWeight) * 100 : 0
  return { earnedPoints, filledWeight, remainingWeight, totalWeight, currentPct, worstCase, bestCase, filled, unfilled }
}

export function getAnalysis(components) {
  const { earnedPoints, remainingWeight, totalWeight, worstCase, bestCase } = calcSubjectScore(components)
  return GRADE_THRESHOLDS.map(t => {
    const needed = t.min - earnedPoints  // points still needed from remaining
    const secured = worstCase >= t.min   // even with 0 on remaining, still get this grade
    const possible = bestCase >= t.min   // possible to achieve
    const pctOfRemaining = remainingWeight > 0 ? (needed / remainingWeight) * 100 : 0
    const progressPct = totalWeight > 0 ? Math.min(100, (earnedPoints / t.min) * 100) : 0
    return {
      ...t,
      needed: Math.max(0, needed),
      pctOfRemaining: Math.max(0, pctOfRemaining),
      secured,
      possible,
      currentStanding: totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : 0,
      progressPct: Math.min(100, progressPct),
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
