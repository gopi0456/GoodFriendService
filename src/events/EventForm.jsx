import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { MAX_PHOTOS, cleanPhone, hueVars, photoUrl, removeFiles, uploadPhoto, uuid, validPhone } from './eventApi'

const Field = ({ label, hint, children }) => (
  <div className="ev-field"><label>{label}</label>{children}{hint && <div className="ev-hint">{hint}</div>}</div>
)

// Used by a provider for his own listing, and by the admin for anyone's.
export default function EventForm({ uid, cats, ev, phone, photos: initialPhotos = [], adminMode, onSaved, onCancel }) {
  const [newId] = useState(uuid)
  const [f, setF] = useState({
    name: ev?.name || '', category_id: ev?.category_id || '', phone: phone || '', area: ev?.area || '', address: ev?.address || '',
    about: ev?.about || '', price_text: ev?.price_text || '', capacity_text: ev?.capacity_text || '', tags: ev?.tags || '',
    experience_years: ev?.experience_years ?? '', status: ev?.status || 'approved',
    verified: !!ev?.verified, featured: !!ev?.featured, hide_phone: !!ev?.hide_phone,
  })
  // gallery: existing rows (id, sort) + new uploads (isNew). The first one is the cover.
  const [gallery, setGallery] = useState(() => initialPhotos.map(p => ({ key: p.id, id: p.id, path: p.photo_path, sort: p.sort_order, isNew: false })))
  const [removed, setRemoved] = useState([])
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))
  const cat = cats.find(c => c.id === f.category_id)
  const folder = adminMode ? (ev?.id || newId) : uid

  const pick = async (e) => {
    let files = [...(e.target.files || [])]
    e.target.value = ''
    const room = MAX_PHOTOS - gallery.length
    if (files.length > room) { alert(`A gallery can have at most ${MAX_PHOTOS} photos. Only ${Math.max(room, 0)} more can be added.`); files = files.slice(0, Math.max(room, 0)) }
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      try {
        const path = await uploadPhoto(folder, file)
        setGallery(g => [...g, { key: path, path, isNew: true }])
      } catch (err) { alert('Photo upload failed: ' + (err.message || err)); break }
    }
    setUploading(false)
  }
  const del = (item) => {
    setGallery(g => g.filter(x => x.key !== item.key))
    if (item.isNew) removeFiles([item.path]); else setRemoved(r => [...r, item])
  }
  const makeCover = (item) => setGallery(g => [item, ...g.filter(x => x.key !== item.key)])
  const cancel = () => { removeFiles(gallery.filter(x => x.isNew).map(x => x.path)); onCancel && onCancel() }

  const save = async (e) => {
    e.preventDefault()
    const name = f.name.trim()
    if (name.length < 2) return alert('Please enter the name')
    if (!f.category_id) return alert('Please choose the category')
    if (!validPhone(f.phone)) return alert('Enter a valid phone number (10 to 15 digits)')
    if (!f.area.trim()) return alert('Please enter the city or area')
    const exp = f.experience_years === '' ? null : Number(f.experience_years)
    if (exp !== null && (exp < 0 || exp > 70)) return alert('Experience must be between 0 and 70 years')

    setBusy(true)
    try {
      const row = {
        name, category_id: f.category_id, area: f.area.trim(), address: f.address.trim() || null, about: f.about.trim() || null,
        price_text: f.price_text.trim() || null, capacity_text: f.capacity_text.trim() || null, tags: f.tags.trim() || null, experience_years: exp,
      }
      if (adminMode) Object.assign(row, { status: f.status, verified: f.verified, featured: f.featured, hide_phone: f.hide_phone })
      let id = ev?.id
      if (ev) {
        const { error } = await supabase.from('event_profiles').update(row).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('event_profiles').insert(adminMode ? { id: newId, ...row } : row).select('id').single()
        if (error) throw error
        id = data.id
      }
      const c = await supabase.from('event_contacts').upsert({ event_id: id, phone: cleanPhone(f.phone) }, { onConflict: 'event_id' })
      if (c.error) throw c.error

      // gallery: removals first (keeps us under the 20-photo limit), then order, then new photos
      if (removed.length) {
        const r = await supabase.from('event_photos').delete().in('id', removed.map(x => x.id))
        if (r.error) throw r.error
        removeFiles(removed.map(x => x.path))
      }
      for (let i = 0; i < gallery.length; i++) {
        const g = gallery[i]
        if (!g.isNew && g.sort !== i * 10) {
          const r = await supabase.from('event_photos').update({ sort_order: i * 10 }).eq('id', g.id)
          if (r.error) throw r.error
        }
      }
      const fresh = gallery.map((g, i) => ({ g, i })).filter(x => x.g.isNew).map(x => ({ event_id: id, photo_path: x.g.path, sort_order: x.i * 10 }))
      if (fresh.length) {
        const r = await supabase.from('event_photos').insert(fresh)
        if (r.error) throw r.error
      }
      onSaved(id)
    } catch (err) {
      alert('Could not save: ' + (err.message || err))
    } finally { setBusy(false) }
  }

  return (
    <form className="ev-form" onSubmit={save} style={hueVars(cat?.name || 'x')}>
      <Field label="Name *"><input className="ev-input" value={f.name} onChange={set('name')} placeholder="Business or person name" /></Field>
      <Field label="Category *">
        <select className="ev-input" value={f.category_id} onChange={set('category_id')}>
          <option value="">Choose category</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}{c.active === false ? ' (off)' : ''}</option>)}
        </select>
      </Field>
      <Field label="Phone number *" hint="Shown to others only after the admin approves, and only while contacts are switched on.">
        <input className="ev-input" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="10 digit mobile number" />
      </Field>
      <Field label="City / area *"><input className="ev-input" value={f.area} onChange={set('area')} placeholder="Where you work, e.g. Hyderabad" /></Field>
      <Field label="Address"><input className="ev-input" value={f.address} onChange={set('address')} placeholder="Street, landmark" /></Field>
      <div className="ev-two">
        <Field label="Price"><input className="ev-input" value={f.price_text} maxLength={60} onChange={set('price_text')} placeholder="From Rs 450 / plate" /></Field>
        <Field label="Capacity"><input className="ev-input" value={f.capacity_text} maxLength={60} onChange={set('capacity_text')} placeholder="100 - 1500 guests" /></Field>
      </div>
      <Field label="Highlights" hint="Separate with commas, e.g. Veg, Non-veg, AC hall, Parking">
        <input className="ev-input" value={f.tags} maxLength={200} onChange={set('tags')} />
      </Field>
      <div className="ev-two">
        <Field label="Experience (years)"><input className="ev-input" type="number" inputMode="numeric" min="0" max="70" value={f.experience_years} onChange={set('experience_years')} /></Field>
        {adminMode && (
          <Field label="Status">
            <select className="ev-input" value={f.status} onChange={set('status')}>
              <option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option>
            </select>
          </Field>
        )}
      </div>
      <Field label="About"><textarea className="ev-input ev-area" maxLength={800} value={f.about} onChange={set('about')} placeholder="What you offer, packages, specialities..." /></Field>

      {adminMode && (
        <div className="ev-admin-switches">
          <label className="ev-switchrow"><input type="checkbox" checked={f.verified} onChange={e => setF(x => ({ ...x, verified: e.target.checked }))} /><span><b>✔ Verified</b><small>Shows a trust badge on the profile.</small></span></label>
          <label className="ev-switchrow"><input type="checkbox" checked={f.featured} onChange={e => setF(x => ({ ...x, featured: e.target.checked }))} /><span><b>⭐ Featured</b><small>Shown first in the list.</small></span></label>
          <label className="ev-switchrow"><input type="checkbox" checked={f.hide_phone} onChange={e => setF(x => ({ ...x, hide_phone: e.target.checked }))} /><span><b>🙈 Hide this phone number</b><small>Users will not see it, even when contacts are switched on.</small></span></label>
        </div>
      )}

      <div className="ev-h">📷 Gallery <small>({gallery.length}/{MAX_PHOTOS})</small></div>
      <div className="ev-gal-grid">
        {gallery.map((g, i) => (
          <div className="ev-gal-item" key={g.key}>
            <img src={photoUrl(g.path)} alt="" />
            {i === 0 && <span className="ev-gal-cover">Cover</span>}
            <button type="button" className="ev-gal-x" onClick={() => del(g)} aria-label="Remove photo">✕</button>
            {i !== 0 && <button type="button" className="ev-gal-star" onClick={() => makeCover(g)}>★ Cover</button>}
          </div>
        ))}
        {gallery.length < MAX_PHOTOS && (
          <label className="ev-gal-add">
            <input type="file" accept="image/*" multiple onChange={pick} disabled={uploading} hidden />
            <span>{uploading ? '...' : '＋'}</span><small>{uploading ? 'Uploading' : 'Add photos'}</small>
          </label>
        )}
      </div>
      <div className="ev-hint">The first photo is the cover. You can add several at once.</div>

      <button className="ev-primary" type="submit" disabled={busy || uploading}>{busy ? 'Saving...' : ev ? '💾 Save changes' : adminMode ? '➕ Add profile' : '📨 Submit for approval'}</button>
      {onCancel && <button type="button" className="ev-ghost" onClick={cancel}>Cancel</button>}
    </form>
  )
}
