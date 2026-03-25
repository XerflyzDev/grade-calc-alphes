// Grade thresholds (Thai university standard)
export const GRADE_THRESHOLDS = [
  { grade: 'A',  min: 80,  gpa: 4.0 },
  { grade: 'B+', min: 75,  gpa: 3.5 },
  { grade: 'B',  min: 70,  gpa: 3.0 },
  { grade: 'C+', min: 65,  gpa: 2.5 },
  { grade: 'C',  min: 60,  gpa: 2.0 },
  { grade: 'D+', min: 55,  gpa: 1.5 },
  { grade: 'D',  min: 50,  gpa: 1.0 },
  { grade: 'F',  min: 0,   gpa: 0.0 },
]

export function getGrade(score) {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return t
  }
  return GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1]
}

export function gradeClass(grade) {
  const map = { 'A': 'A', 'B+': 'Bp', 'B': 'B', 'C+': 'Cp', 'C': 'C', 'D+': 'Dp', 'D': 'D', 'F': 'F' }
  return 'grade-' + (map[grade] || 'F')
}

export function calcScores(components) {
  const total_weight = components.reduce((s, c) => s + c.weight, 0)
  const filled = components.filter(c => c.score !== null && c.score !== undefined && c.score !== '')
  const unfilled = components.filter(c => c.score === null || c.score === undefined || c.score === '')

  // Current earned score (normalized to 100-point scale based on weight)
  const current = filled.reduce((s, c) => {
    return s + (parseFloat(c.score) / parseFloat(c.max_score)) * c.weight
  }, 0)

  const remaining_weight = unfilled.reduce((s, c) => s + c.weight, 0)

  // If all filled: project full score
  const projected = total_weight > 0 ? (current / total_weight) * 100 : 0

  return { current, remaining_weight, total_weight, filled_count: filled.length, unfilled_count: unfilled.length, projected }
}

export function getRecommendations(components) {
  const { current, remaining_weight } = calcScores(components)
  if (remaining_weight === 0) return null

  return GRADE_THRESHOLDS.map(t => {
    const needed_total = t.min
    const needed_from_remaining = needed_total - current
    // needed as % of remaining weight
    const pct = remaining_weight > 0 ? (needed_from_remaining / remaining_weight) * 100 : 0
    return {
      grade: t.grade,
      gpa: t.gpa,
      needed_score: Math.max(0, pct),
      achievable: pct <= 100,
    }
  })
}
