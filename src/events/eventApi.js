import { supabase } from '../supabaseClient'
import { resizeImage } from '../matrimony/utils'
export { cleanPhone, validPhone, telHref, waHref, hueVars, hueFor, initials, uuid } from '../workers/workerApi'

export const BUCKET = 'event-photos'
export const MAX_PHOTOS = 20

export const photoUrl = (path) => (path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null)

// resize (max 1280 px) and upload; folder = the user's id (own listing) or the profile's id (admin)
export async function uploadPhoto(folder, file) {
  const blob = await resizeImage(file, 1280)
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}
export const removeFiles = (paths) => (paths.length ? supabase.storage.from(BUCKET).remove(paths) : Promise.resolve())

// "Veg, Non-veg , AC hall" -> ['Veg', 'Non-veg', 'AC hall']
export const tagsOf = (s) => String(s || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 8)

// groups photo rows by profile, cover first
export const groupPhotos = (rows) => {
  const m = {}
  ;(rows || []).slice().sort((a, b) => a.sort_order - b.sort_order).forEach(r => { (m[r.event_id] = m[r.event_id] || []).push(r) })
  return m
}
