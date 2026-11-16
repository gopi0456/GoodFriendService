// Vedic horoscope helpers (no external library):
//   birth date + time -> Moon's sidereal longitude (Lahiri) -> Rashi + Nakshatra -> Ashtakoot (36 points) match.
// Indicative only. Vashya and Yoni use simplified tables.

export const RASHI = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena']
export const RASHI_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
export const NAKSHATRA = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati']

const rad = Math.PI / 180
export const norm360 = (x) => { const r = x % 360; return r < 0 ? r + 360 : r }

// ---------------------------------------------------------------- Moon position (Meeus, ch. 47)
// [D, M, M', F, longitude coefficient in 1e-6 degrees]
const MOON_TERMS = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116],
  [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758],
  [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720], [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980], [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036], [2, 0, 2, 0, 3994],
  [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689], [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236], [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048],
  [2, 0, 1, -2, -1773], [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810], [4, -1, -2, 0, 759], [0, 2, -1, 0, -713], [2, 2, -1, 0, -700], [2, 1, -2, 0, 691],
  [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537], [4, -1, 0, 0, 520], [1, 0, -2, 0, -487],
]

// geometric tropical longitude of the Moon (degrees) for a Julian Ephemeris Day
export function moonTropicalLongitude(jde, withNutation = true) {
  const T = (jde - 2451545.0) / 36525
  const L = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T ** 3) / 538841 - (T ** 4) / 65194000)
  const D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T ** 3) / 545868 - (T ** 4) / 113065000)
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T ** 3) / 24490000)
  const Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T ** 3) / 69699 - (T ** 4) / 14712000)
  const F = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - (T ** 3) / 3526000 + (T ** 4) / 863310000)
  const A1 = norm360(119.75 + 131.849 * T)
  const A2 = norm360(53.09 + 479264.290 * T)
  const E = 1 - 0.002516 * T - 0.0000074 * T * T

  let sum = 0
  for (const [d, m, mp, f, c] of MOON_TERMS) {
    const arg = (d * D + m * M + mp * Mp + f * F) * rad
    const ef = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1
    sum += c * ef * Math.sin(arg)
  }
  sum += 3958 * Math.sin(A1 * rad) + 1962 * Math.sin((L - F) * rad) + 318 * Math.sin(A2 * rad)

  let lon = L + sum / 1e6
  if (withNutation) {
    const omega = (125.04452 - 1934.136261 * T) * rad
    const Ls = (280.4665 + 36000.7698 * T) * rad
    lon += -0.004778 * Math.sin(omega) - 0.000366 * Math.sin(2 * Ls)
  }
  return norm360(lon)
}

export function julianDay(y, m, d, hoursUT) {
  if (m <= 2) { y -= 1; m += 12 }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + hoursUT / 24
}

// TT - UT in seconds (interpolated table, good enough for birth data)
export function deltaT(year) {
  const pts = [[1900, -3], [1920, 21], [1940, 24], [1950, 29], [1960, 33], [1970, 40], [1980, 51], [1990, 57], [2000, 64], [2010, 66], [2020, 69], [2030, 73], [2050, 93]]
  if (year <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (year <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
      return y0 + ((y1 - y0) * (year - x0)) / (x1 - x0)
    }
  }
  return pts[pts.length - 1][1]
}

// Lahiri (Chitrapaksha) ayanamsa in degrees
export const lahiriAyanamsa = (jd) => 23.85306 + ((jd - 2451545.0) / 365.25) * 0.013970

// Moon's sidereal longitude (0-360) for a local birth date/time. dateStr 'YYYY-MM-DD', timeStr 'HH:MM', utcOffset in hours (IST = 5.5)
export function moonSidereal(dateStr, timeStr, utcOffset = 5.5) {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '')
  const tm = /^(\d{1,2}):(\d{2})/.exec(timeStr || '')
  if (!dm || !tm || Number.isNaN(Number(utcOffset))) return null
  const [y, mo, d] = [Number(dm[1]), Number(dm[2]), Number(dm[3])]
  const hoursUT = Number(tm[1]) + Number(tm[2]) / 60 - Number(utcOffset)
  const jd = julianDay(y, mo, d, hoursUT)
  const jde = jd + deltaT(y + (mo - 0.5) / 12) / 86400
  const sid = norm360(moonTropicalLongitude(jde) - lahiriAyanamsa(jde))
  return Math.round(sid * 100000) / 100000
}

// ---------------------------------------------------------------- Rashi / Nakshatra
const NAK_SPAN = 360 / 27
export const rashiIndex = (lon) => Math.floor(norm360(lon) / 30)
export const nakshatraIndex = (lon) => Math.floor(norm360(lon) / NAK_SPAN)
export const padaOf = (lon) => Math.floor((norm360(lon) % NAK_SPAN) / (NAK_SPAN / 4)) + 1

// {rashi, nakshatra, lon} from any profile row that has moon_long, else null
export function horoOf(p) {
  if (!p || p.moon_long == null || p.moon_long === '') return null
  const lon = Number(p.moon_long)
  if (Number.isNaN(lon)) return null
  return { lon, rashi: rashiIndex(lon), nakshatra: nakshatraIndex(lon), pada: padaOf(lon) }
}

// ---------------------------------------------------------------- Ashtakoot (Guna Milan)
const VARNA_RANK = [2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3] // Brahmin 3, Kshatriya 2, Vaishya 1, Shudra 0 (by Moon sign)

// Vashya group by sign (Sagittarius / Capricorn use the half of the sign): C chatushpada, M manava, J jalachara, W vanachara, K keeta
function vashyaGroup(h) {
  const r = h.rashi
  const firstHalf = (h.lon % 30) < 15
  if (r === 8) return firstHalf ? 'M' : 'C'
  if (r === 9) return firstHalf ? 'C' : 'J'
  return ['C', 'C', 'M', 'J', 'W', 'M', 'M', 'K', 'M', 'C', 'M', 'J'][r]
}

const LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter']
const FRIENDS = {
  Sun: { F: ['Moon', 'Mars', 'Jupiter'], E: ['Venus', 'Saturn'] },
  Moon: { F: ['Sun', 'Mercury'], E: [] },
  Mars: { F: ['Sun', 'Moon', 'Jupiter'], E: ['Mercury'] },
  Mercury: { F: ['Sun', 'Venus'], E: ['Moon'] },
  Jupiter: { F: ['Sun', 'Moon', 'Mars'], E: ['Mercury', 'Venus'] },
  Venus: { F: ['Mercury', 'Saturn'], E: ['Sun', 'Moon'] },
  Saturn: { F: ['Mercury', 'Venus'], E: ['Sun', 'Moon', 'Mars'] },
}
const attitude = (a, b) => (FRIENDS[a].F.includes(b) ? 'F' : FRIENDS[a].E.includes(b) ? 'E' : 'N')

const GANA = ['D', 'M', 'R', 'M', 'D', 'M', 'D', 'D', 'R', 'R', 'M', 'M', 'D', 'R', 'D', 'R', 'D', 'R', 'R', 'M', 'M', 'D', 'R', 'R', 'M', 'M', 'D']
const NADI = [0, 1, 2, 2, 1, 0] // Adi, Madhya, Antya repeating pattern by nakshatra index % 6
const NADI_NAME = ['Adi', 'Madhya', 'Antya']
const YONI = ['Horse', 'Elephant', 'Sheep', 'Serpent', 'Serpent', 'Dog', 'Cat', 'Sheep', 'Cat', 'Rat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Buffalo', 'Tiger', 'Deer', 'Deer', 'Dog', 'Monkey', 'Mongoose', 'Monkey', 'Lion', 'Horse', 'Lion', 'Cow', 'Elephant']
const YONI_ENEMY = [['Cow', 'Tiger'], ['Elephant', 'Lion'], ['Horse', 'Buffalo'], ['Dog', 'Deer'], ['Serpent', 'Mongoose'], ['Monkey', 'Sheep'], ['Cat', 'Rat']]

// groom, bride: results of horoOf()
export function ashtakoot(groom, bride) {
  const k = []
  const add = (name, got, max, note, dosha = false) => k.push({ name, got, max, note, dosha })

  // 1. Varna
  add('Varna', VARNA_RANK[groom.rashi] >= VARNA_RANK[bride.rashi] ? 1 : 0, 1, 'Work and ego compatibility')

  // 2. Vashya
  const vg = vashyaGroup(groom), vb = vashyaGroup(bride)
  let vs
  if (vg === vb) vs = 2
  else if (['C', 'M', 'J'].includes(vg) && ['C', 'M', 'J'].includes(vb)) vs = 1
  else vs = 0.5
  add('Vashya', vs, 2, 'Mutual attraction and influence')

  // 3. Tara
  const bad = (n) => [3, 5, 7].includes(n % 9)
  const c1 = ((groom.nakshatra - bride.nakshatra + 27) % 27) + 1
  const c2 = ((bride.nakshatra - groom.nakshatra + 27) % 27) + 1
  const tara = (bad(c1) ? 0 : 1.5) + (bad(c2) ? 0 : 1.5)
  add('Tara', tara, 3, 'Health and well-being')

  // 4. Yoni
  const yg = YONI[groom.nakshatra], yb = YONI[bride.nakshatra]
  const enemy = YONI_ENEMY.some(([a, b]) => (a === yg && b === yb) || (a === yb && b === yg))
  add('Yoni', yg === yb ? 4 : enemy ? 0 : 2, 4, 'Physical and intimate compatibility')

  // 5. Graha Maitri
  const lg = LORD[groom.rashi], lb = LORD[bride.rashi]
  let gm
  if (lg === lb) gm = 5
  else {
    const pair = [attitude(lg, lb), attitude(lb, lg)].sort().join('')
    gm = { FF: 5, FN: 4, NN: 3, EF: 1, EN: 0.5, EE: 0 }[pair]
  }
  add('Graha Maitri', gm, 5, 'Mental wavelength and friendship')

  // 6. Gana
  const gg = GANA[groom.nakshatra], gb = GANA[bride.nakshatra]
  const gpair = [gg, gb].sort().join('')
  const gs = gg === gb ? 6 : { DM: 5, DR: 1, MR: 0 }[gpair]
  add('Gana', gs, 6, 'Temperament', gs === 0)

  // 7. Bhakoot
  const d = ((groom.rashi - bride.rashi + 12) % 12) + 1
  const bhBad = [2, 12, 5, 9, 6, 8].includes(d)
  add('Bhakoot', bhBad ? 0 : 7, 7, 'Emotional bond, family and prosperity', bhBad)

  // 8. Nadi
  const nadiSame = NADI[groom.nakshatra % 6] === NADI[bride.nakshatra % 6]
  add('Nadi', nadiSame ? 0 : 8, 8, `Health and children (${NADI_NAME[NADI[groom.nakshatra % 6]]} / ${NADI_NAME[NADI[bride.nakshatra % 6]]})`, nadiSame)

  const total = k.reduce((a, x) => a + x.got, 0)
  let verdict
  if (total >= 33) verdict = { emoji: '🌟', title: 'Excellent match', text: 'Highly preferable for marriage', color: '#059669' }
  else if (total >= 25) verdict = { emoji: '💖', title: 'Very good match', text: 'Preferable for marriage', color: '#16a34a' }
  else if (total >= 18) verdict = { emoji: '👍', title: 'Acceptable match', text: 'Can be considered; check with your astrologer', color: '#d97706' }
  else verdict = { emoji: '⚠️', title: 'Low horoscope match', text: 'Not preferable as per Guna Milan', color: '#dc2626' }

  return { kootas: k, total, max: 36, verdict, doshas: k.filter(x => x.dosha && x.got === 0).map(x => x.name) }
}

// ---------------------------------------------------------------- readable Moon-based attributes (for the kundli)
export const VARNA_NAMES = ['Shudra', 'Vaishya', 'Kshatriya', 'Brahmin']
export const VASHYA_NAMES = { C: 'Chatushpada', M: 'Manava', J: 'Jalachara', W: 'Vanachara', K: 'Keeta' }
export const GANA_NAMES = { D: 'Deva', M: 'Manushya', R: 'Rakshasa' }
export const RASHI_LORD = LORD
export function moonAttributes(h) {
  return {
    varna: VARNA_NAMES[VARNA_RANK[h.rashi]],
    vashya: VASHYA_NAMES[vashyaGroup(h)],
    yoni: YONI[h.nakshatra],
    gana: GANA_NAMES[GANA[h.nakshatra]],
    nadi: NADI_NAME[NADI[h.nakshatra % 6]],
    rashiLord: LORD[h.rashi],
  }
}
