import { supabase } from '../supabaseClient'
import { resizeImage } from '../matrimony/utils'

export const BUCKET = 'worker-photos'

export const photoUrl = (path) => (path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null)

// resize (max 800 px) and upload; folder = the user's id (own listing) or the worker's id (admin)
export async function uploadPhoto(folder, file) {
  const blob = await resizeImage(file, 800)
  const path = `${folder}/${Date.now()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export const cleanPhone = (s) => String(s || '').replace(/[^0-9+]/g, '')
export const validPhone = (s) => /^\+?[0-9]{10,15}$/.test(cleanPhone(s))
export const telHref = (p) => `tel:${cleanPhone(p)}`
export const waHref = (p) => {
  const d = cleanPhone(p).replace(/^\+/, '')
  return `https://wa.me/${d.length === 10 ? '91' + d : d}`
}

// stable colour per work type, so each trade has its own look
export const hueFor = (s) => {
  let h = 0
  for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}
export const hueVars = (s) => {
  const h = hueFor(s)
  return { '--hue': `hsl(${h} 62% 42%)`, '--hue-soft': `hsl(${h} 85% 94%)`, '--hue-ink': `hsl(${h} 60% 26%)` }
}

export const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
