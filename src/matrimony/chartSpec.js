// North Indian chart in a 300 x 300 box. House 1 is the top diamond, houses run anticlockwise.
const CENTERS = { 1: [150, 70], 2: [75, 28], 3: [28, 75], 4: [75, 150], 5: [28, 225], 6: [75, 272], 7: [150, 225], 8: [225, 272], 9: [272, 225], 10: [225, 150], 11: [272, 75], 12: [225, 28] }
const BIG = [1, 4, 7, 10] // diamond houses have more room

export const CHART_LINES = [
  [0, 0, 300, 0], [300, 0, 300, 300], [300, 300, 0, 300], [0, 300, 0, 0], // outer square
  [0, 0, 300, 300], [300, 0, 0, 300],                                       // diagonals
  [150, 0, 300, 150], [300, 150, 150, 300], [150, 300, 0, 150], [0, 150, 150, 0], // inner diamond
]

// -> [{ x, y, text, size, bold, gray }]
export function chartTexts(houses) {
  const out = []
  for (const h of houses) {
    const [cx, cy] = CENTERS[h.house]
    const per = BIG.includes(h.house) ? 3 : 2
    const rows = []
    for (let i = 0; i < h.planets.length; i += per) rows.push(h.planets.slice(i, i + per).join(' '))
    const total = rows.length + 1
    const lineH = 12
    let y = cy - ((total - 1) * lineH) / 2
    out.push({ x: cx, y, text: String(h.sign), size: 9, bold: false, gray: true })
    rows.forEach(r => { y += lineH; out.push({ x: cx, y, text: r, size: 10, bold: true, gray: false }) })
  }
  return out
}
