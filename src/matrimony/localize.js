import { dict } from './i18n'
import { GRAHAS, fmtDeg } from './kundli'

const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, key) => (o[key] === undefined ? '' : o[key]))

// everything the screen and the PDF show, in the chosen language
export function localize(k, lang) {
  const T = dict(lang)
  const u = T.ui
  const pl = (g) => T.planet[GRAHAS.indexOf(g)]
  const nak = (i) => T.nak[i]
  const b = k.birth
  const p = k.panchang
  const a = k.moon.attrs
  const gender = b.gender === 'Male' ? u.male : b.gender === 'Female' ? u.female : (b.gender || '-')
  const tz = `UTC${Number(b.utcOffset) >= 0 ? '+' : ''}${b.utcOffset}`

  const L = {
    T, lang, full: k.full, hasLagna: !!k.lagna, ui: u,
    title: k.full ? u.titleFull : u.titleMin,
    name: b.name || '',
    birthRows: [[u.name, b.name || '-'], [u.gender, gender], [u.dob, b.dob], [u.tob, b.time], [u.place, b.place || '-'], [u.tz, tz]],
    panchangRows: [
      [u.vara, T.vara[p.varaIdx]],
      [u.tithi, `${T.paksha[p.pakshaIdx]} ${T.tithi[p.tithiIdx]}`],
      [u.nakshatra, `${nak(k.moon.nakshatra)} (${u.pada} ${k.moon.pada})`],
      [u.nakLord, pl(k.moon.lord)],
      [u.yoga, T.yoga[p.yogaIdx]],
      [u.karana, T.karana[p.karanaIdx]],
    ],
    moonRows: [
      [u.moonSign, T.rashi[k.moon.rashi]], [u.sunSign, T.rashi[k.sunRashi]],
      ...(k.full ? [[u.lagna, k.lagna ? T.rashi[k.lagna.sign] : u.notAvail], [u.ayanamsa, `Lahiri ${k.ayanamsa.toFixed(3)}\u00B0`]] : []),
      [u.rashiLord, pl(a.rashiLord)], [u.varna, T.varna[a.varna]],
      [u.vashya, T.vashya[a.vashya]], [u.yoni, T.yoni[a.yoni]],
      [u.gana, T.gana[a.gana]], [u.nadi, T.nadi[a.nadi]],
    ],
  }

  const bal = k.dasha.balanceYMD
  L.dashaBalance = fill(u.dashaBalance, { lord: pl(k.dasha.lord), bal: `${bal.y} ${u.ymd[0]} ${bal.m} ${u.ymd[1]} ${bal.d} ${u.ymd[2]}` })
  const cur = k.dasha.current
  L.dashaRunning = cur
    ? (cur.antar ? fill(u.running, { lord: pl(cur.lord), end: cur.end, sub: pl(cur.antar.lord), end2: cur.antar.end }) : fill(u.runningNoSub, { lord: pl(cur.lord), end: cur.end }))
    : ''
  L.dashaRows = k.dasha.rows.map(r => [pl(r.lord), r.start, r.end, r.years])

  if (k.full) {
    const abbr = (x) => (x.k === 'Asc' ? T.lagnaAbbr : T.abbr[GRAHAS.indexOf(x.k)] + (x.retro ? `(${u.retroMark})` : ''))
    const houses = (list) => list.map(h => ({ house: h.house, sign: h.sign, planets: h.planets.map(abbr) }))
    L.rashiChart = houses(k.rashiChart)
    L.navamsaChart = houses(k.navamsaChart)
    L.rashiTitle = k.lagna ? u.rashiChart : u.moonChart
    L.navamsaTitle = u.navamsa
    L.noLagnaNote = k.lagna ? '' : u.noLagna

    L.planetHeaders = [u.planet, u.sign, u.degrees, u.nakPada, u.house, u.retro]
    L.planetRows = [
      ...(k.lagna ? [[u.lagna, T.rashi[k.lagna.sign], fmtDeg(k.lagna.deg), '-', '1', '']] : []),
      ...k.grahas.map(g => [pl(g.name), T.rashi[g.sign], fmtDeg(g.deg), `${nak(g.nak)} (${g.pada})`, String(g.house), g.retro ? u.retroMark : '']),
    ]

    const mk = k.manglik
    const parts = [mk.fromLagna && u.fromLagna, mk.fromMoon && u.fromMoon].filter(Boolean)
    if (mk.fromLagna === null) L.manglikText = `${mk.fromMoon ? u.manglikYes : u.manglikNo} (${u.fromMoon})`
    else L.manglikText = mk.fromLagna || mk.fromMoon ? `${u.manglikYes} (${parts.join(' + ')})` : u.manglikNo
    L.manglikWarn = !!(mk.fromLagna || mk.fromMoon)
    L.marsText = mk.marsHouse ? fill(u.marsBoth, { h: mk.marsHouse, m: mk.marsFromMoon }) : fill(u.marsMoon, { m: mk.marsFromMoon })
  }
  return L
}
