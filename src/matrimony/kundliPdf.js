import { Pdf, PAGE_W, PAGE_H } from './pdf'
import { CanvasSurface } from './canvasPdf'
import { CHART_LINES, chartTexts } from './chartSpec'
import { localize } from './localize'

const M = 36
const MAROON = [0.45, 0.1, 0.2]
const GRAY = [0.45, 0.45, 0.45]
const LIGHT = [0.96, 0.93, 0.9]

function layout(s, L, indic) {
  const u = L.ui
  const RH = indic ? 18 : 15
  let top = 0
  let pageNo = 1
  const Y = (t) => PAGE_H - t
  const bottomLimit = PAGE_H - 68

  // shrink text until it fits the width
  const fit = (str, size, bold, maxW) => {
    let sz = size
    while (sz > 6 && s.width(str, sz, bold) > maxW) sz -= 0.5
    return sz
  }
  // word-wrap for the footer note (long in some languages)
  const wrap = (str, size, maxW) => {
    const lines = []
    let cur = ''
    str.split(' ').forEach(w => {
      const t = cur ? `${cur} ${w}` : w
      if (cur && s.width(t, size, false) > maxW) { lines.push(cur); cur = w } else cur = t
    })
    if (cur) lines.push(cur)
    return lines
  }
  const footer = () => {
    s.line(M, 60, PAGE_W - M, 60, 0.5, GRAY)
    wrap(u.note, 7.5, PAGE_W - 2 * M).slice(0, 3).forEach((ln, i) => s.text(M, 50 - i * 9.5, ln, 7.5, false, GRAY))
    s.text(M, 18, u.generated, 8, false, GRAY)
    const pg = `${u.page} ${pageNo}`
    s.text(PAGE_W - M - s.width(pg, 8), 18, pg, 8, false, GRAY)
  }
  const ensure = (h) => { if (top + h > bottomLimit) { footer(); s.addPage(); pageNo++; top = M } }
  const heading = (t) => {
    ensure(34)
    s.rect(M, Y(top + 18), PAGE_W - 2 * M, 20, LIGHT, null)
    s.text(M + 6, Y(top + 12), t, fit(t, 10.5, true, PAGE_W - 2 * M - 12), true, MAROON)
    top += 28
  }
  const pairs = (rows) => {
    const colW = (PAGE_W - 2 * M) / 2
    const lw = indic ? 96 : 84
    for (let i = 0; i < rows.length; i += 2) {
      ensure(RH + 2)
      for (let c = 0; c < 2 && i + c < rows.length; c++) {
        const [a, b] = rows[i + c]
        const x = M + c * colW + 4
        s.text(x, Y(top + 11), `${a}:`, fit(`${a}:`, 9, true, lw - 4), true, GRAY)
        const v = String(b)
        s.text(x + lw, Y(top + 11), v, fit(v, 9.5, false, colW - lw - 8), false)
      }
      top += RH
    }
    top += 4
  }
  const table = (headers, widths, rows) => {
    const total = widths.reduce((a, c) => a + c, 0)
    const scale = (PAGE_W - 2 * M) / total
    const xs = []
    let x = M
    widths.forEach(w => { xs.push(x); x += w * scale })
    ensure(RH + 4)
    s.rect(M, Y(top + RH), PAGE_W - 2 * M, RH, MAROON, null)
    headers.forEach((h, i) => s.text(xs[i] + 4, Y(top + 12), h, fit(h, 9, true, widths[i] * scale - 8), true, [1, 1, 1]))
    top += RH
    rows.forEach((r, ri) => {
      ensure(RH + 2)
      if (ri % 2 === 1) s.rect(M, Y(top + RH - 1), PAGE_W - 2 * M, RH, LIGHT, null)
      r.forEach((v, i) => { const t = String(v); s.text(xs[i] + 4, Y(top + 12), t, fit(t, 9, false, widths[i] * scale - 8), false) })
      top += RH
    })
    top += 8
  }
  const chart = (x0, t0, size, houses, title) => {
    const sc = size / 300
    s.text(x0 + size / 2 - s.width(title, 9.5, true) / 2, Y(t0 - 6), title, fit(title, 9.5, true, size), true, MAROON)
    CHART_LINES.forEach(([a, b, c, d]) => s.line(x0 + a * sc, Y(t0 + b * sc), x0 + c * sc, Y(t0 + d * sc), 1, MAROON))
    chartTexts(houses).forEach(t => {
      const fs = t.size * Math.max(0.78, sc)
      s.text(x0 + t.x * sc - s.width(t.text, fs, t.bold) / 2, Y(t0 + t.y * sc + 3), t.text, fs, t.bold, t.gray ? GRAY : [0, 0, 0])
    })
  }

  // ---------- header
  s.rect(0, PAGE_H - 70, PAGE_W, 70, MAROON, null)
  s.text(M, PAGE_H - 34, L.title, fit(L.title, 20, true, PAGE_W - 2 * M), true, [1, 1, 1])
  s.text(M, PAGE_H - 56, L.name, fit(L.name, 12, false, PAGE_W - 2 * M), false, [1, 0.9, 0.8])
  top = 88

  heading(u.birth); pairs(L.birthRows)
  heading(u.panchang); pairs(L.panchangRows)
  heading(u.moonAttr); pairs(L.moonRows)

  if (L.full) {
    heading(u.charts)
    ensure(300)
    chart(M + 4, top + 14, 250, L.rashiChart, L.rashiTitle)
    chart(PAGE_W - M - 254, top + 14, 250, L.navamsaChart, L.navamsaTitle)
    top += 276
    if (L.noLagnaNote) {
      s.text(M, Y(top), L.noLagnaNote, fit(L.noLagnaNote, 8.5, false, PAGE_W - 2 * M), false, GRAY)
      top += 16
    }
    ensure(40 + RH * (L.planetRows.length + 1))
    heading(u.planets)
    table(L.planetHeaders, [70, 80, 80, 140, 50, 50], L.planetRows)

    heading(u.manglik)
    s.text(M + 4, Y(top + 11), L.manglikText, fit(L.manglikText, 10, true, PAGE_W - 2 * M - 8), true)
    top += RH + 2
    s.text(M + 4, Y(top + 11), L.marsText, fit(L.marsText, 9, false, PAGE_W - 2 * M - 8), false, GRAY)
    top += RH + 8
  }

  ensure(60 + RH * 10)
  heading(u.dasha)
  s.text(M + 4, Y(top + 11), L.dashaBalance, fit(L.dashaBalance, 9.5, true, PAGE_W - 2 * M - 8), true)
  top += RH + 1
  if (L.dashaRunning) {
    s.text(M + 4, Y(top + 11), L.dashaRunning, fit(L.dashaRunning, 9, false, PAGE_W - 2 * M - 8), false, GRAY)
    top += RH + 3
  }
  table([u.mahadasha, u.from, u.to, u.years], [120, 110, 110, 60], L.dashaRows)

  footer()
}

// English = real PDF text. Other languages = pages drawn with the device fonts and stored as images.
export function kundliPdf(k, lang = 'en') {
  const L = localize(k, lang)
  const indic = lang !== 'en'
  const surface = indic ? new CanvasSurface(lang) : new Pdf()
  layout(surface, L, indic)
  return surface.build()
}
