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

export function getGrade(pct) {
  for (const t of GRADE_THRESHOLDS) {
    if (pct >= t.min) return t
  }
  return GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1]
}

/**
 * score_received = weighted points actually earned (0 … weight)
 * e.g. Quiz worth 10%, student got 6% of total → score_received = 6
 */
export function calcSubjectScore(components) {
  const filled   = components.filter(c => c.score_received != null && c.score_received !== '')
  const unfilled = components.filter(c => c.score_received == null || c.score_received === '')
  const totalWeight     = components.reduce((s, c) => s + c.weight, 0)
  const earnedPoints    = filled.reduce((s, c) => s + parseFloat(c.score_received), 0)
  const remainingWeight = unfilled.reduce((s, c) => s + c.weight, 0)
  const currentPct      = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : 0
  const worstCase       = currentPct
  const bestCase        = totalWeight > 0 ? ((earnedPoints + remainingWeight) / totalWeight) * 100 : 0
  return { earnedPoints, remainingWeight, totalWeight, currentPct, worstCase, bestCase, filled, unfilled }
}

export function getAnalysis(components) {
  const { earnedPoints, remainingWeight, totalWeight, worstCase, bestCase } = calcSubjectScore(components)
  return GRADE_THRESHOLDS.map(t => {
    const needed         = t.min - (earnedPoints / totalWeight) * 100  // % points still needed
    const neededPoints   = totalWeight > 0 ? (needed / 100) * totalWeight : 0  // in weighted points
    const secured        = worstCase >= t.min
    const possible       = bestCase  >= t.min
    const requiredAvgPct = remainingWeight > 0 ? (neededPoints / remainingWeight) * 100 : 0
    const progressPct    = totalWeight > 0 ? Math.min(100, (earnedPoints / totalWeight / t.min) * 10000) : 0
    return {
      ...t,
      neededPoints:    Math.max(0, neededPoints),
      requiredAvgPct:  Math.max(0, requiredAvgPct),
      secured,
      possible,
      progressPct:     Math.min(100, progressPct),
    }
  })
}

export function calcGPA(subjects, componentsMap) {
  const gpas = subjects.map(sub => {
    const comps = componentsMap[sub.id] || []
    const { currentPct, totalWeight } = calcSubjectScore(comps)
    if (totalWeight === 0) return null
    return getGrade(currentPct).gpa
  }).filter(g => g !== null)
  if (!gpas.length) return null
  return gpas.reduce((a, b) => a + b, 0) / gpas.length
}

export function groupBySemester(subjects) {
  const groups = {}
  subjects.forEach(s => {
    const key = `${s.academic_year || 'Unknown'}__${s.semester || '1'}`
    if (!groups[key]) groups[key] = { academic_year: s.academic_year || 'Unknown', semester: s.semester || '1', subjects: [] }
    groups[key].subjects.push(s)
  })
  return Object.values(groups).sort((a, b) => {
    if (b.academic_year !== a.academic_year) return b.academic_year.localeCompare(a.academic_year)
    return a.semester.localeCompare(b.semester)
  })
}