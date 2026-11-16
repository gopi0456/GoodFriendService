import { NAKSHATRA, RASHI, RASHI_EN, RASHI_LORD, deltaT, horoOf, julianDay, lahiriAyanamsa, moonAttributes, norm360, nakshatraIndex, padaOf, rashiIndex } from './astro'
import { ascendantTropical, siderealPlanets, tropicalPositions } from './ephemeris'
import { coordsFor } from './cities'

export const GRAHAS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']
export const ABBR = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' }

const DASHA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']
const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 }
const TITHI = ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi']
const YOGA = ['Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti']
const KARANA = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti']
const VARA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const YEAR_MS = 365.25 * 86400000
const NAK_SPAN = 360 / 27

const fmtDate = (ms) => new Date(ms).toISOString().slice(0, 10)
export const fmtDeg = (x) => {
  const d = Math.floor(x), mf = (x - d) * 60, m = Math.floor(mf), s = Math.round((mf - m) * 60)
  return s === 60 ? `${d}\u00B0${String(m + 1).padStart(2, '0')}'00"` : `${d}\u00B0${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`
}

const KARANA11 = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti', 'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna']
const TITHI16 = [...TITHI, 'Purnima', 'Amavasya']

function panchang(trop, sid, localDate) {
  const elong = norm360(trop.Moon - trop.Sun)
  const t = Math.floor(elong / 12) // 0..29
  const pakshaIdx = t < 15 ? 0 : 1
  const tithiIdx = t === 14 ? 14 : t === 29 ? 15 : t % 15
  const yogaIdx = Math.floor(norm360(sid.Sun.lon + sid.Moon.lon) / NAK_SPAN)
  const kk = Math.floor(elong / 6) // 0..59
  const karanaIdx = kk === 0 ? 10 : kk === 57 ? 7 : kk === 58 ? 8 : kk === 59 ? 9 : (kk - 1) % 7
  const [y, m, d] = localDate
  const varaIdx = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return {
    varaIdx, pakshaIdx, tithiIdx, yogaIdx, karanaIdx,
    vara: VARA[varaIdx], tithi: `${pakshaIdx ? 'Krishna' : 'Shukla'} ${TITHI16[tithiIdx]}`, yoga: YOGA[yogaIdx], karana: KARANA11[karanaIdx],
  }
}

// Vimshottari dasha from the Moon's longitude
function dashas(moonLon, birthMs) {
  const nak = nakshatraIndex(moonLon)
  const lord0 = DASHA_LORDS[nak % 9]
  const elapsed = (moonLon % NAK_SPAN) / NAK_SPAN
  const first = DASHA_YEARS[lord0]
  const startMs = birthMs - elapsed * first * YEAR_MS
  const rows = []
  let t = startMs
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_LORDS[(nak % 9 + i) % 9]
    const end = t + DASHA_YEARS[lord] * YEAR_MS
    rows.push({ lord, years: DASHA_YEARS[lord], start: fmtDate(i === 0 ? birthMs : t), end: fmtDate(end), startMs: t, endMs: end })
    t = end
  }
  const balYears = first * (1 - elapsed)
  const by = Math.floor(balYears), bm = Math.floor((balYears - by) * 12), bd = Math.floor((((balYears - by) * 12) - bm) * 30)
  const nowMs = Date.now()
  const cur = rows.find(r => nowMs >= r.startMs && nowMs < r.endMs) || null
  let antar = null
  if (cur) {
    let s = cur.startMs
    const startIdx = DASHA_LORDS.indexOf(cur.lord)
    for (let i = 0; i < 9; i++) {
      const sub = DASHA_LORDS[(startIdx + i) % 9]
      const e = s + ((DASHA_YEARS[cur.lord] * DASHA_YEARS[sub]) / 120) * YEAR_MS
      if (nowMs >= s && nowMs < e) { antar = { lord: sub, end: fmtDate(e) }; break }
      s = e
    }
  }
  return { lord: lord0, balance: `${by}y ${bm}m ${bd}d`, balanceYMD: { y: by, m: bm, d: bd }, rows, current: cur && { lord: cur.lord, end: cur.end, antar } }
}

const grahaInfo = (lon) => ({ sign: rashiIndex(lon), deg: lon % 30, nak: nakshatraIndex(lon), pada: padaOf(lon), navamsa: Math.floor(lon / (30 / 9)) % 12 })

// birth = { name, gender, dob 'YYYY-MM-DD', time 'HH:MM', place, utcOffset }
export function buildKundli(birth, full = false) {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth.dob || '')
  const tm = /^(\d{1,2}):(\d{2})/.exec(birth.time || '')
  if (!dm || !tm) return null
  const [y, mo, d] = [Number(dm[1]), Number(dm[2]), Number(dm[3])]
  const off = Number.isNaN(Number(birth.utcOffset)) ? 5.5 : Number(birth.utcOffset)
  const hoursUT = Number(tm[1]) + Number(tm[2]) / 60 - off
  const jdUT = julianDay(y, mo, d, hoursUT)
  const jde = jdUT + deltaT(y + (mo - 0.5) / 12) / 86400
  const birthMs = Date.UTC(y, mo - 1, d, Number(tm[1]), Number(tm[2])) - off * 3600000

  const trop = tropicalPositions(jde)
  const { planets, ayanamsa } = siderealPlanets(jde)
  const moonLon = planets.Moon.lon
  const h = horoOf({ moon_long: moonLon })
  const moon = { ...h, name: NAKSHATRA[h.nakshatra], rashiName: `${RASHI[h.rashi]} (${RASHI_EN[h.rashi]})`, lord: DASHA_LORDS[h.nakshatra % 9], attrs: moonAttributes(h) }
  const sunSign = rashiIndex(planets.Sun.lon)

  const k = {
    birth, ayanamsa, moon, sunSign: `${RASHI[sunSign]} (${RASHI_EN[sunSign]})`, sunRashi: sunSign,
    panchang: panchang(trop, planets, [y, mo, d]),
    dasha: dashas(moonLon, birthMs),
    full,
  }
  if (!full) return k

  // ---- full kundli: Lagna, planets, houses, charts
  const coords = coordsFor(birth.place)
  let lagnaLon = null
  if (coords) lagnaLon = norm360(ascendantTropical(jdUT, coords.lat, coords.lon) - ayanamsa)
  const refLon = lagnaLon ?? moonLon
  const refSign = rashiIndex(refLon)
  k.coords = coords
  k.lagna = lagnaLon === null ? null : { lon: lagnaLon, ...grahaInfo(lagnaLon), signName: `${RASHI[rashiIndex(lagnaLon)]} (${RASHI_EN[rashiIndex(lagnaLon)]})` }
  k.refLabel = lagnaLon === null ? 'Moon chart (Chandra Lagna)' : 'Lagna chart (Rashi D1)'

  k.grahas = GRAHAS.map(g => {
    const lon = planets[g].lon
    const info = grahaInfo(lon)
    return { name: g, lon, retro: planets[g].retro, ...info, signName: `${RASHI[info.sign]} (${RASHI_EN[info.sign]})`, nakName: NAKSHATRA[info.nak], house: ((info.sign - refSign + 12) % 12) + 1 }
  })

  const chart = (baseSign, signOf, withAsc) => Array.from({ length: 12 }, (_, i) => {
    const sign = (baseSign + i) % 12
    const list = k.grahas.filter(g => signOf(g) === sign).map(g => ({ k: g.name, retro: g.retro && g.name !== 'Rahu' && g.name !== 'Ketu' }))
    if (i === 0 && withAsc) list.unshift({ k: 'Asc', retro: false })
    return { house: i + 1, sign: sign + 1, planets: list }
  })
  k.rashiChart = chart(refSign, g => g.sign, lagnaLon !== null)
  const refNav = Math.floor(refLon / (30 / 9)) % 12
  k.navamsaChart = chart(refNav, g => g.navamsa, lagnaLon !== null)

  const MANGLIK = [1, 2, 4, 7, 8, 12]
  const mars = k.grahas.find(g => g.name === 'Mars')
  const marsFromMoon = ((mars.sign - rashiIndex(moonLon) + 12) % 12) + 1
  const fromLagna = lagnaLon === null ? null : MANGLIK.includes(mars.house)
  const fromMoon = MANGLIK.includes(marsFromMoon)
  k.manglik = {
    fromLagna, fromMoon, marsHouse: lagnaLon === null ? null : mars.house, marsFromMoon,
    text: fromLagna === null ? (fromMoon ? 'Mars is in a Manglik house from the Moon' : 'No Manglik dosha from the Moon')
      : fromLagna || fromMoon ? `Manglik dosha present (${[fromLagna && 'from Lagna', fromMoon && 'from Moon'].filter(Boolean).join(' and ')})` : 'No Manglik dosha',
  }
  return k
}

// profile row (or form values) -> birth object
export const birthFromProfile = (p) => ({
  name: p.full_name || '',
  gender: p.gender === 'male' ? 'Male' : p.gender === 'female' ? 'Female' : '',
  dob: p.dob || '',
  time: p.birth_time ? String(p.birth_time).slice(0, 5) : '',
  place: p.birth_place || p.city || '',
  utcOffset: p.birth_utc_offset === '' || p.birth_utc_offset == null ? 5.5 : Number(p.birth_utc_offset),
})
