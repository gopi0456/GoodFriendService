import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import EventCard from './EventCard'
import EventSheet from './EventSheet'
import { groupPhotos } from './eventApi'

export default function EventFind({ query }) {
  const [cats, setCats] = useState([])
  const [list, setList] = useState(null)
  const [photos, setPhotos] = useState({})
  const [phones, setPhones] = useState({})
  const [contactsOn, setContactsOn] = useState(true)
  const [catId, setCatId] = useState('all')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [open, setOpen] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('event_categories').select('*').eq('active', true).order('sort_order').order('name'),
      supabase.from('event_profiles').select('*').eq('status', 'approved').order('featured', { ascending: false }).order('created_at', { ascending: false }).range(0, 999),
      supabase.from('event_settings').select('show_contacts').eq('id', 1).maybeSingle(),
      supabase.from('event_contacts').select('event_id,phone').range(0, 999),
      supabase.from('event_photos').select('id,event_id,photo_path,sort_order').order('sort_order').range(0, 1999),
    ]).then(([c, p, s, ct, ph]) => {
      const err = c.error || p.error
      if (err) { setError(err.message); setList([]); return }
      setCats(c.data || [])
      setList(p.data || [])
      setContactsOn(s.data ? s.data.show_contacts : true)
      const pm = {}; (ct.data || []).forEach(x => { pm[x.event_id] = x.phone }); setPhones(pm)
      setPhotos(groupPhotos(ph.data))
    })
  }, [])

  const catById = useMemo(() => Object.fromEntries(cats.map(c => [c.id, c])), [cats])
  const counts = useMemo(() => { const m = {}; (list || []).forEach(e => { m[e.category_id] = (m[e.category_id] || 0) + 1 }); return m }, [list])

  const q = (query || '').trim().toLowerCase()
  const ordered = [...(list || [])].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || String(b.created_at).localeCompare(String(a.created_at)))
  const shown = ordered.filter(e => {
    if (!catById[e.category_id]) return false // category switched off by the admin
    if (catId !== 'all' && e.category_id !== catId) return false
    if (verifiedOnly && !e.verified) return false
    if (!q) return true
    return `${e.name} ${e.area || ''} ${e.tags || ''} ${catById[e.category_id].name}`.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="ev-chips">
        <button className={`ev-chip ${catId === 'all' ? 'on' : ''}`} onClick={() => setCatId('all')}>✨ All <small>{(list || []).filter(e => catById[e.category_id]).length}</small></button>
        {cats.map(c => (
          <button key={c.id} className={`ev-chip ${catId === c.id ? 'on' : ''}`} onClick={() => setCatId(c.id)}>
            {c.icon} {c.name} {counts[c.id] ? <small>{counts[c.id]}</small> : null}
          </button>
        ))}
      </div>
      <label className="ev-toggle"><input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} /><span>✔ Verified only</span></label>

      {error && <div className="ev-note bad">Could not load: {error}. Run <b>events.sql</b> in Supabase.</div>}
      {list === null && [1, 2].map(i => <div className="ev-skel" key={i} />)}

      {list && shown.map(e => (
        <EventCard key={e.id} ev={e} cat={catById[e.category_id]} photos={photos[e.id] || []} phone={phones[e.id]} locked={!contactsOn || !!e.hide_phone} onOpen={() => setOpen(e)} />
      ))}

      {list && shown.length === 0 && !error && (
        <div className="ev-empty">
          <div className="ev-empty-ico">{list.length === 0 ? '🎉' : '🔎'}</div>
          <div className="ev-empty-t">{list.length === 0 ? 'No event services yet' : 'Nothing found'}</div>
          <div className="ev-empty-s">{list.length === 0 ? 'Listings appear here after the admin approves them.' : 'Try another category or a different search.'}</div>
        </div>
      )}

      {open && <EventSheet ev={open} cat={catById[open.category_id]} photos={photos[open.id] || []} phone={phones[open.id]} locked={!contactsOn || !!open.hide_phone} onClose={() => setOpen(null)} />}
    </div>
  )
}
