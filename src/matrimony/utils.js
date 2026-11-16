import { supabase } from '../supabaseClient'

export const BUCKET = 'matrimony-photos'

export const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other']
export const MARITAL = [
  ['never_married', 'Never married'],
  ['divorced', 'Divorced'],
  ['widowed', 'Widowed'],
  ['awaiting_divorce', 'Awaiting divorce'],
]
export const EDUCATION = ['High school', 'Diploma', "Bachelor's", "Master's", 'Doctorate', 'Other']
export const INCOME = ['Below 2 LPA', '2-5 LPA', '5-10 LPA', '10-20 LPA', 'Above 20 LPA']
export const LANGUAGES = ['Telugu', 'Tamil', 'Hindi', 'Kannada', 'Malayalam', 'Urdu', 'Marathi', 'Bengali', 'Other']

export const maritalLabel = (v) => (MARITAL.find(m => m[0] === v) || [v, v || ''])[1]

export function calcAge(dob) {
  if (!dob) return ''
  const d = new Date(dob)
  const t = new Date()
  let age = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--
  return age
}

export function heightLabel(cm) {
  if (!cm) return ''
  const totalIn = cm / 2.54
  let ft = Math.floor(totalIn / 12)
  let inch = Math.round(totalIn - ft * 12)
  if (inch === 12) { ft += 1; inch = 0 }
  return `${ft}'${inch}" (${cm} cm)`
}

export function photoUrl(path) {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// date string for "N years ago"
export function yearsAgo(years, plusOneDay = false) {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  if (plusOneDay) d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// shrink a photo before upload (max 900px, JPEG) so mobile uploads stay small
export async function resizeImage(file, max = 900) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', 0.82)
  )
}

export const respondInterest = (fromUser, toUser, status) =>
  supabase.from('matrimony_interests').update({ status }).eq('from_user', fromUser).eq('to_user', toUser)

// age from the directory view (age) or from a full profile row (dob)
export const ageOf = (p) => (p.age != null ? p.age : calcAge(p.dob))

export const MATCH_NOTE = 'Online matching is for reference only. For more accurate guidance, please consult an astrologer.'
