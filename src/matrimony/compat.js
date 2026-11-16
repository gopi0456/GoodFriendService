import { ageOf } from './utils'

const EDU_LEVEL = { 'High school': 0, Diploma: 1, "Bachelor's": 2, "Master's": 3, Doctorate: 4 }
const same = (a, b) => a && b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase()

// The directory view returns "cmp_*" answers (same/different as the viewer) instead of the raw values,
// so scores work even for profiles whose details are still hidden. Admin screens pass full rows instead.
const cmpSame = (me, other, field, flag) => {
  if (other[flag] !== undefined) return other[flag]
  if (!me[field] || !other[field]) return null
  return same(me[field], other[field]) ? 'same' : 'diff'
}
const cmpLocation = (me, other) => {
  if (other.cmp_location !== undefined) return other.cmp_location
  if (!me.city || !other.city) return null
  if (same(me.city, other.city)) return 'city'
  return same(me.state, other.state) ? 'state' : 'far'
}
const cmpMarital = (me, other) => {
  if (other.cmp_marital !== undefined) return other.cmp_marital
  const a = me.marital_status, b = other.marital_status
  if (!a || !b) return null
  if (a === 'awaiting_divorce' || b === 'awaiting_divorce') return 'awaiting'
  if (a === 'never_married' && b === 'never_married') return 'both_never'
  return a === b ? 'same' : 'diff'
}
// bucket of (other height - my height): -2 (<-5cm), -1 (-5..-1), 0, 1 (1..5), 2 (>5cm)
const heightBucket = (me, other) => {
  if (other.cmp_height !== undefined) return other.cmp_height
  if (!me.height_cm || !other.height_cm) return null
  const x = other.height_cm - me.height_cm
  return x < -5 ? -2 : x < 0 ? -1 : x === 0 ? 0 : x <= 5 ? 1 : 2
}

// Indicative match score between my profile and another profile. Only factors with data on BOTH sides count.
export function computeCompat(me, other) {
  if (!me || !other) return null
  if (me.gender === other.gender) return { unsupported: 'Compatibility is calculated for male-female matches.' }

  const meIsGroom = me.gender === 'male'
  const groom = meIsGroom ? me : other
  const bride = meIsGroom ? other : me
  const factors = []
  const add = (label, weight, score, note) => factors.push({ label, weight, score, note })

  // age gap (groom usually a little older)
  const gap = ageOf(groom) - ageOf(bride)
  if (!Number.isNaN(gap)) {
    let s = 0.1
    if (gap >= 0 && gap <= 5) s = 1
    else if (gap > 5 && gap <= 8) s = 0.7
    else if (gap < 0 && gap >= -2) s = 0.6
    else if (gap > 8 && gap <= 12) s = 0.4
    add('Age gap', 25, s, gap >= 0 ? `Groom is ${gap} yr older` : `Bride is ${-gap} yr older`)
  }

  const rel = cmpSame(me, other, 'religion', 'cmp_religion')
  if (rel) add('Religion', 20, rel === 'same' ? 1 : 0, rel === 'same' ? 'Same religion' : 'Different religion')

  const tongue = cmpSame(me, other, 'mother_tongue', 'cmp_tongue')
  if (tongue) add('Mother tongue', 10, tongue === 'same' ? 1 : 0.3, tongue === 'same' ? 'Same language' : 'Different language')

  const caste = cmpSame(me, other, 'caste', 'cmp_caste')
  if (caste) add('Caste / community', 10, caste === 'same' ? 1 : 0, caste === 'same' ? 'Same community' : 'Different community')

  const e1 = EDU_LEVEL[me.education], e2 = EDU_LEVEL[other.education]
  if (e1 !== undefined && e2 !== undefined) {
    const d = Math.abs(e1 - e2)
    add('Education', 10, d === 0 ? 1 : d === 1 ? 0.8 : d === 2 ? 0.5 : 0.3, d === 0 ? 'Same level' : `${d} level${d > 1 ? 's' : ''} apart`)
  }

  const loc = cmpLocation(me, other)
  if (loc === 'city') add('Location', 10, 1, 'Same city')
  else if (loc === 'state') add('Location', 10, 0.6, 'Same state')
  else if (loc === 'far') add('Location', 10, 0.2, 'Different regions')

  const mar = cmpMarital(me, other)
  if (mar) {
    const map = {
      both_never: [1, 'Both never married'],
      same: [0.8, 'Same marital status'],
      diff: [0.3, 'Different marital history'],
      awaiting: [0.1, 'Divorce not finalised'],
    }
    add('Marital status', 10, map[mar][0], map[mar][1])
  }

  const hb = heightBucket(me, other)
  if (hb !== null && hb !== undefined) {
    // groom - bride >= 0 is best
    let s
    if (meIsGroom) s = hb <= 0 ? 1 : hb === 1 ? 0.6 : 0.3
    else s = hb >= 0 ? 1 : hb === -1 ? 0.6 : 0.3
    add('Height', 5, s, s === 1 ? 'Groom is taller' : 'Bride is taller')
  }

  const total = factors.reduce((a, f) => a + f.weight, 0)
  if (!total) return { unsupported: 'Not enough details to calculate.' }
  const percent = Math.round((factors.reduce((a, f) => a + f.weight * f.score, 0) / total) * 100)
  const coverage = total / 100

  let verdict
  if (percent >= 75) verdict = { emoji: '💖', title: 'Highly compatible', text: 'Preferable for marriage', color: '#059669' }
  else if (percent >= 60) verdict = { emoji: '👍', title: 'Good match', text: 'Can be considered for marriage', color: '#2563eb' }
  else if (percent >= 45) verdict = { emoji: '🤔', title: 'Moderate match', text: 'Discuss expectations before deciding', color: '#d97706' }
  else verdict = { emoji: '⚠️', title: 'Low compatibility', text: 'Not preferable on these details', color: '#dc2626' }

  return { percent, verdict, factors, coverage }
}
