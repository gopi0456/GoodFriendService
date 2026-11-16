// Name compatibility by simplified Pythagorean numerology (for reference only).
const MAP = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9, J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9, S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8 }
const VOWELS = 'AEIOU'
const clean = (s) => String(s || '').toUpperCase().replace(/[^A-Z]/g, '')
const reduce = (n) => { while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n }
const sum = (arr) => arr.reduce((a, c) => a + MAP[c], 0)

// expression (all letters), soul urge (vowels), personality (consonants)
export function nameNumbers(name) {
  const letters = clean(name).split('')
  if (!letters.length) return null
  const vowels = letters.filter(c => VOWELS.includes(c))
  const cons = letters.filter(c => !VOWELS.includes(c))
  return {
    expression: reduce(sum(letters)),
    soul: vowels.length ? reduce(sum(vowels)) : null,
    personality: cons.length ? reduce(sum(cons)) : null,
  }
}

const GROUP = { 1: 0, 5: 0, 7: 0, 2: 1, 4: 1, 8: 1, 3: 2, 6: 2, 9: 2 }
const BONUS = [[1, 3], [2, 6], [3, 5], [4, 6], [5, 9], [7, 9]]
function pairScore(a, b) {
  if (a == null || b == null) return null
  if (a === b) return 100
  if (GROUP[a] === GROUP[b]) return 85
  if (BONUS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return 70
  return 55
}

export function nameMatch(name1, name2) {
  const x = nameNumbers(name1), y = nameNumbers(name2)
  if (!x || !y) return null
  const parts = [
    ['Expression', x.expression, y.expression, pairScore(x.expression, y.expression), 0.5],
    ['Soul urge', x.soul, y.soul, pairScore(x.soul, y.soul), 0.3],
    ['Personality', x.personality, y.personality, pairScore(x.personality, y.personality), 0.2],
  ].filter(p => p[3] !== null)
  const w = parts.reduce((a, p) => a + p[4], 0)
  const percent = Math.round(parts.reduce((a, p) => a + p[3] * p[4], 0) / w)
  let verdict
  if (percent >= 80) verdict = { emoji: '💖', title: 'Harmonious names', color: '#059669' }
  else if (percent >= 65) verdict = { emoji: '👍', title: 'Good name match', color: '#2563eb' }
  else if (percent >= 50) verdict = { emoji: '🤔', title: 'Average name match', color: '#d97706' }
  else verdict = { emoji: '⚠️', title: 'Weak name match', color: '#dc2626' }
  return { percent, verdict, parts: parts.map(p => ({ label: p[0], a: p[1], b: p[2], score: p[3] })) }
}
