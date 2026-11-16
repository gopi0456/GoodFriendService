import './engage.css'
import { supabase } from '../supabaseClient'

export const TOPICS = [['general', 'Other'], ['matrimony', 'Matrimonial'], ['travels', 'Travels'], ['workers', 'Workers'], ['events', 'Events']]
export const TOPIC_ICON = { general: '💬', matrimony: '💍', travels: '🚗', workers: '🛠️', events: '🎉' }
export const TOPIC_NAME = Object.fromEntries(TOPICS)
export const METHOD = { call: ['📞', 'Called'], whatsapp: ['💬', 'WhatsApp'], enquiry: ['✉️', 'Asked the admin'] }
export const RECEIVED = { call: 'Called you', whatsapp: 'Messaged you on WhatsApp', enquiry: 'Asked the admin for your number' }

// id of the signed-in user (read from the local session, no network call)
export async function getUid() {
  const { data } = await supabase.auth.getSession()
  return data && data.session ? data.session.user.id : null
}

// records a Call / WhatsApp tap or an enquiry. Fire and forget: it never blocks the call.
// The database fills in who did it, so it cannot be faked.
export function logContact(kind, targetId, method) {
  supabase.from('contact_log').insert({ kind, target_id: targetId, method }).then(() => {}, () => {})
}

// a message to the admin from any menu
export async function sendEnquiry({ topic, body, refLabel }) {
  const uid = await getUid()
  const row = { from_user: uid, topic, body: String(body).trim() }
  if (refLabel) row.ref_label = String(refLabel).slice(0, 120)
  return supabase.from('matrimony_messages').insert(row)
}

export async function requestChat({ otherId, otherName, context }) {
  return supabase.from('chat_links').insert({ user_b: otherId, b_name: otherName, context }).select('*').single()
}

export const ago = (t) => {
  const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
export const when = (t) => (t ? new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')
