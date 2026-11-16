import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { BUCKET, cleanPhone, hueVars, photoUrl, uploadPhoto, uuid, validPhone } from './workerApi'

const Field = ({ label, hint, children }) => (
  <div className="wk-field"><label>{label}</label>{children}{hint && <div className="wk-hint">{hint}</div>}</div>
)

// Used by a worker for his own listing, and by the admin for anyone's.
export default function WorkerForm({ uid, types, worker, phone, adminMode, onSaved, onCancel }) {
  const [newId] = useState(uuid)
  const [f, setF] = useState({
    name: worker?.name || '', phone: phone || '', work_type_id: worker?.work_type_id || '', address: worker?.address || '',
    about: worker?.about || '', experience_years: worker?.experience_years ?? '', photo_path: worker?.photo_path || '',
    status: worker?.status || 'approved', hide_phone: !!worker?.hide_phone,
  })
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))
  const type = types.find(t => t.id === f.work_type_id)
  const url = photoUrl(f.photo_path)

  const pick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const folder = adminMode ? (worker?.id || newId) : uid
      setF(x => ({ ...x, photo_path: '' }))
      const path = await uploadPhoto(folder, file)
      setF(x => ({ ...x, photo_path: path }))
    } catch (err) { alert('Photo upload failed: ' + (err.message || err)) } finally { setUploading(false); e.target.value = '' }
  }

  const save = async (e) => {
    e.preventDefault()
    const name = f.name.trim()
    if (name.length < 2) return alert('Please enter the worker name')
    if (!validPhone(f.phone)) return alert('Enter a valid phone number (10 to 15 digits)')
    if (!f.work_type_id) return alert('Please choose the work type')
    if (!f.address.trim()) return alert('Please enter the address or area')
    const exp = f.experience_years === '' ? null : Number(f.experience_years)
    if (exp !== null && (exp < 0 || exp > 70)) return alert('Experience must be between 0 and 70 years')

    setBusy(true)
    try {
      const row = { name, work_type_id: f.work_type_id, address: f.address.trim(), about: f.about.trim() || null, experience_years: exp, photo_path: f.photo_path || null }
      if (adminMode) { row.status = f.status; row.hide_phone = !!f.hide_phone }
      let id = worker?.id
      if (worker) {
        const { error } = await supabase.from('workers').update(row).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('workers').insert(adminMode ? { id: newId, ...row } : row).select('id').single()
        if (error) throw error
        id = data.id
      }
      const c = await supabase.from('worker_contacts').upsert({ worker_id: id, phone: cleanPhone(f.phone) }, { onConflict: 'worker_id' })
      if (c.error) throw c.error
      if (worker?.photo_path && worker.photo_path !== f.photo_path) supabase.storage.from(BUCKET).remove([worker.photo_path])
      onSaved(id)
    } catch (err) {
      alert('Could not save: ' + (err.message || err))
    } finally { setBusy(false) }
  }

  return (
    <form className="wk-form" onSubmit={save} style={hueVars(type?.name || 'x')}>
      <div className="wk-photo">
        <label className="wk-photo-pick">
          {url ? <img src={url} alt="" /> : <span className="wk-photo-ph">{type?.icon || '📷'}</span>}
          <input type="file" accept="image/*" onChange={pick} disabled={uploading} hidden />
          <span className="wk-photo-badge">{uploading ? '...' : '📷'}</span>
        </label>
        <div className="wk-hint">{uploading ? 'Uploading photo...' : 'Photo is optional. Tap to add one.'}</div>
      </div>

      <Field label="Name *"><input className="wk-input" value={f.name} onChange={set('name')} placeholder="Worker's full name" /></Field>
      <Field label="Phone number *" hint="Other users see this only after the admin approves, and only while contacts are switched on.">
        <input className="wk-input" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="10 digit mobile number" />
      </Field>
      <Field label="Work type *">
        <select className="wk-input" value={f.work_type_id} onChange={set('work_type_id')}>
          <option value="">Choose work type</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}{t.active === false ? ' (off)' : ''}</option>)}
        </select>
      </Field>
      <Field label="Address / area *"><input className="wk-input" value={f.address} onChange={set('address')} placeholder="Street, area, city" /></Field>
      <div className="wk-two">
        <Field label="Experience (years)"><input className="wk-input" type="number" inputMode="numeric" min="0" max="70" value={f.experience_years} onChange={set('experience_years')} /></Field>
        {adminMode && (
          <Field label="Status">
            <select className="wk-input" value={f.status} onChange={set('status')}>
              <option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option>
            </select>
          </Field>
        )}
      </div>
      {adminMode && (
        <label className="wk-switchrow">
          <input type="checkbox" checked={f.hide_phone} onChange={e => setF(x => ({ ...x, hide_phone: e.target.checked }))} />
          <span><b>🙈 Hide this worker's phone number</b><small>Users will not see it, even when contacts are switched on.</small></span>
        </label>
      )}
      <Field label="About (optional)"><textarea className="wk-input wk-area" maxLength={400} value={f.about} onChange={set('about')} placeholder="Skills, tools, timing..." /></Field>

      <button className="wk-primary" type="submit" disabled={busy || uploading}>{busy ? 'Saving...' : worker ? '💾 Save changes' : adminMode ? '➕ Add worker' : '📨 Submit for approval'}</button>
      {onCancel && <button type="button" className="wk-ghost" onClick={onCancel}>Cancel</button>}
    </form>
  )
}
