import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { APP_VERSION, isNewer } from '../appVersion'

const pollMs = () => (typeof window !== 'undefined' && window.__ALERT_POLL_MS) || 20000

export const ICON = { contact: '📞', chat_message: '💬', chat_approved: '✅', admin_reply: '✉️', interest: '💞', request: '📥', info: '🔔', update: '⬇️' }

// an update alert keeps "version|download link" in ref
export const updateParts = (n) => { const [version, ...rest] = String(n.ref || '').split('|'); return { version, url: rest.join('|') } }

export async function markRead(id) { return supabase.from('app_notifications').update({ read_at: new Date().toISOString() }).eq('id', id) }
export async function markAllRead(uid) { return supabase.from('app_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', uid).is('read_at', null) }

// Looks for alerts every 20 seconds while the app is open (and when it comes back to the front).
// onNew({ kind: 'open' | 'new', rows }) is called: once when the app opens with unread alerts, and whenever new ones arrive.
export function useAlerts(uid, onNew) {
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState(null)
  const seen = useRef(null)
  const cb = useRef(onNew)
  cb.current = onNew

  const refresh = useCallback(async () => {
    if (!uid) return
    const { data, error } = await supabase.from('app_notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).range(0, 59)
    if (error) return                                   // table not created yet: stay silent
    const rows = data || []
    // After the person has installed the new version, its update alert goes away by itself ("back to normal")
    const done = rows.filter(r => r.kind === 'update' && !r.read_at && !isNewer(updateParts(r).version, APP_VERSION))
    if (done.length) {
      const now = new Date().toISOString()
      supabase.from('app_notifications').update({ read_at: now }).in('id', done.map(r => r.id)).then(() => {}, () => {})
      done.forEach(r => { r.read_at = now })
    }
    const unreadRows = rows.filter(r => !r.read_at)
    setItems(rows); setUnread(unreadRows.length)
    const newest = rows[0] ? String(rows[0].created_at) : ''
    if (seen.current === null) {
      seen.current = newest
      if (unreadRows.length && cb.current) cb.current({ kind: 'open', rows: unreadRows })
    } else {
      const fresh = unreadRows.filter(r => String(r.created_at) > seen.current)
      if (newest > seen.current) seen.current = newest
      if (fresh.length && cb.current) cb.current({ kind: 'new', rows: fresh })
    }
  }, [uid])

  useEffect(() => {
    refresh()
    const tick = setInterval(() => { if (!document.hidden) refresh() }, pollMs())
    const vis = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', vis) }
  }, [refresh])

  return { unread, items, refresh }
}
