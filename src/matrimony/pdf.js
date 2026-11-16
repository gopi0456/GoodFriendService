// Minimal PDF writer: text (Helvetica / Helvetica-Bold), lines, rectangles, and full-page JPEG images
// (images are used for Indian-language pages, drawn with the phone's own fonts). No external library.
const latin1 = (s) => String(s)
  .replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
  .replace(/[^\x00-\xFF]/g, '?')
const esc = (s) => latin1(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
const n = (x) => Number(x).toFixed(2)

export const PAGE_W = 595
export const PAGE_H = 842
// rough Helvetica width (avg 0.5 em) for centering / fitting text
export const textWidth = (s, size, bold = false) => latin1(s).length * size * (bold ? 0.55 : 0.5)

const bytesToString = (bytes) => {
  let out = ''
  for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192))
  return out
}

export class Pdf {
  constructor() { this.pages = []; this.addPage() }
  addPage() { this.cur = []; this.pages.push(this.cur) }
  addImagePage(jpegBytes, w, h) { this.pages.push({ img: { bytes: jpegBytes, w, h } }) }
  width(s, size, bold = false) { return textWidth(s, size, bold) }
  text(x, y, s, size = 10, bold = false, color = [0, 0, 0]) {
    this.cur.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color.map(n).join(' ')} rg ${n(x)} ${n(y)} Td (${esc(s)}) Tj ET`)
  }
  line(x1, y1, x2, y2, w = 0.8, color = [0, 0, 0]) {
    this.cur.push(`${n(w)} w ${color.map(n).join(' ')} RG ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`)
  }
  rect(x, y, w, h, fill = null, stroke = null) {
    const parts = []
    if (fill) parts.push(`${fill.map(n).join(' ')} rg`)
    if (stroke) parts.push(`${stroke.map(n).join(' ')} RG`)
    parts.push(`${n(x)} ${n(y)} ${n(w)} ${n(h)} re ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`)
    this.cur.push(parts.join(' '))
  }
  build() {
    const objs = []
    const add = (body) => { objs.push(body); return objs.length }
    add('<< /Type /Catalog /Pages 2 0 R >>')            // 1
    add('')                                              // 2 (filled later)
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')        // 3
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')   // 4
    const kids = []
    for (const page of this.pages) {
      if (Array.isArray(page)) {
        const stream = page.join('\n')
        const contentNo = objs.length + 2
        const pageNo = add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNo} 0 R >>`)
        kids.push(`${pageNo} 0 R`)
        add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
      } else {
        const { bytes, w, h } = page.img
        const bin = bytesToString(bytes)
        const imgNo = add(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bin.length} >>\nstream\n${bin}\nendstream`)
        const contentNo = objs.length + 2
        const pageNo = add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /XObject << /Im0 ${imgNo} 0 R >> >> /Contents ${contentNo} 0 R >>`)
        kids.push(`${pageNo} 0 R`)
        const draw = `q ${PAGE_W} 0 0 ${PAGE_H} 0 0 cm /Im0 Do Q`
        add(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`)
      }
    }
    objs[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`

    let out = '%PDF-1.4\n'
    const offs = []
    objs.forEach((body, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n` })
    const xref = out.length
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
    offs.forEach(o => { out += `${String(o).padStart(10, '0')} 00000 n \n` })
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
    return Uint8Array.from(out, c => c.charCodeAt(0) & 255)
  }
}
