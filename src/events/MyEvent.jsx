import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import EventForm from './EventForm'
import { hueVars, photoUrl } from './eventApi'
import ProfileHistory from '../engage/ProfileHistory'

const STATUS = {
  pending: ['⏳ Waiting for admin approval', 'ev-st-pending'],
  approved: ['✓ Live - visible to everyone', 'ev-st-approved'],
  rejected: ['Not approved - edit and resubmit', 'ev-st-rejected'],
}

// A provider registers his own service (or edits it). A new listing always starts as pending.
export default function MyEvent({ uid }) {
  const [cats, setCats] = useState([])
  const [ev, setEv] = useState(undefined)
  const [phone, setPhone] = useState('')
  const [photos, setPhotos] = useState([])
  const [editing, setEditing] = useState(false)
  const [hist, setHist] = useState(false)

  const load = useCallback(async () => {
    const [c, e] = await Promise.all([
      supabase.from('event_categories').select('*').eq('active', true).order('sort_order').order('name'),
      supabase.from('event_profiles').select('*').eq('owner_id', uid).maybeSingle(),
    ])
    setCats(c.data || [])
    setEv(e.data || null)
    if (e.data) {
      const [ct, ph] = await Promise.all([
        supabase.from('event_contacts').select('phone').eq('event_id', e.data.id).maybeSingle(),
        supabase.from('event_photos').select('*').eq('event_id', e.data.id).order('sort_order'),
      ])
      setPhone(ct.data?.phone || ''); setPhotos(ph.data || [])
    }
  }, [uid])
  useEffect(() => { load() }, [load])

  if (ev === undefined) return <div className="ev-skel" />

  if (editing) {
    return (
      <div className="ev-pad">
        <h3 className="ev-h2">{ev ? 'Edit your listing' : 'List your service'}</h3>
        <EventForm uid={uid} cats={cats} ev={ev} phone={phone} photos={photos}
          onSaved={() => { setEditing(false); load() }} onCancel={() => setEditing(false)} />
      </div>
    )
  }
  if (!ev) {
    return (
      <div className="ev-pad">
        <div className="ev-hero">
          <div className="ev-hero-ico">🎉</div>
          <h3>Reach more customers</h3>
          <p>Halls, catering, decoration, photography, DJ, makeup and more. Add your photos, and after the admin approves, people can find and call you.</p>
          <button className="ev-primary" onClick={() => setEditing(true)}>List your service</button>
        </div>
      </div>
    )
  }
  const cat = cats.find(c => c.id === ev.category_id)
  const [label, cls] = STATUS[ev.status] || STATUS.pending
  return (
    <div className="ev-pad">
      <div className={`ev-status ${cls}`}>{label}</div>
      <div className="ev-card" style={hueVars(cat?.name || ev.name)}>
        <div className="ev-cover">
          {photos[0] ? <img src={photoUrl(photos[0].photo_path)} alt="" /> : <div className="ev-cover-ph">{cat?.icon || '🎉'}</div>}
          {photos.length > 0 && <span className="ev-count">📷 {photos.length}</span>}
        </div>
        <div className="ev-body">
          <div className="ev-name">{ev.name}</div>
          <div className="ev-row"><span className="ev-pill">{cat?.icon} {cat?.name}</span>{ev.area && <span className="ev-meta">📍 {ev.area}</span>}</div>
          <div className="ev-meta">📞 {phone}{ev.hide_phone ? ' · hidden from users by the admin' : ''}</div>
        </div>
      </div>
      <button className="ev-primary" onClick={() => setEditing(true)}>✏️ Edit listing and gallery</button>
      <button className="ev-ghost" onClick={() => setHist(true)}>🕘 Who contacted me</button>
      {hist && <ProfileHistory kind="event" id={ev.id} name={ev.name} onClose={() => setHist(false)} />}
    </div>
  )
}
