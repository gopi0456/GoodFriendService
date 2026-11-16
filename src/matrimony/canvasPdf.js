import { Pdf, PAGE_W, PAGE_H } from './pdf'
import { FONT_FAMILY } from './fonts'

const SCALE = 2.2 // canvas pixels per PDF point (about 160 dpi)
const rgb = (c) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`
const FONT = '"Noto Sans","Noto Sans Devanagari","Noto Sans Telugu","Noto Sans Tamil","Noto Sans Kannada","Noto Sans Malayalam",sans-serif'

// same drawing calls as Pdf (PDF coordinates, origin bottom-left), but text is drawn by the browser so
// every script is shaped correctly with the phone's system fonts. The pages are stored as JPEG images.
export class CanvasSurface {
  constructor(lang) { this.family = FONT_FAMILY[lang] ? `"${FONT_FAMILY[lang]}",` : ''; this.pages = []; this.addPage() }
  addPage() {
    const c = document.createElement('canvas')
    c.width = Math.round(PAGE_W * SCALE); c.height = Math.round(PAGE_H * SCALE)
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.textBaseline = 'alphabetic'
    this.canvas = c; this.ctx = ctx; this.pages.push(c)
  }
  _font(size, bold) { return `${bold ? '700' : '400'} ${size * SCALE}px ${this.family}${FONT}` }
  width(s, size, bold = false) { this.ctx.font = this._font(size, bold); return this.ctx.measureText(String(s)).width / SCALE }
  text(x, y, s, size = 10, bold = false, color = [0, 0, 0]) {
    this.ctx.font = this._font(size, bold); this.ctx.fillStyle = rgb(color)
    this.ctx.fillText(String(s), x * SCALE, (PAGE_H - y) * SCALE)
  }
  line(x1, y1, x2, y2, w = 0.8, color = [0, 0, 0]) {
    const c = this.ctx
    c.strokeStyle = rgb(color); c.lineWidth = w * SCALE
    c.beginPath(); c.moveTo(x1 * SCALE, (PAGE_H - y1) * SCALE); c.lineTo(x2 * SCALE, (PAGE_H - y2) * SCALE); c.stroke()
  }
  rect(x, y, w, h, fill = null, stroke = null) {
    const c = this.ctx
    const px = x * SCALE, py = (PAGE_H - (y + h)) * SCALE
    if (fill) { c.fillStyle = rgb(fill); c.fillRect(px, py, w * SCALE, h * SCALE) }
    if (stroke) { c.strokeStyle = rgb(stroke); c.strokeRect(px, py, w * SCALE, h * SCALE) }
  }
  build() {
    const pdf = new Pdf()
    pdf.pages = []
    for (const c of this.pages) {
      const b64 = c.toDataURL('image/jpeg', 0.92).split(',')[1]
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      pdf.addImagePage(bytes, c.width, c.height)
    }
    return pdf.build()
  }
}
