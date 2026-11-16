import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { BUCKET, EDUCATION, INCOME, LANGUAGES, MARITAL, RELIGIONS, calcAge, photoUrl, resizeImage } from './utils'
import { CITIES, OUTSIDE, STATES, matchState } from './places'
import { CASTES, CASTE_CATEGORIES } from './castes'
import SearchSelect from './SearchSelect'
import KundliView from './KundliView'
import { birthFromProfile } from './kundli'
import { KNOWN_PLACES } from './cities'
import { NAKSHATRA, RASHI, RASHI_EN, moonSidereal, nakshatraIndex, padaOf, rashiIndex } from './astro'

const Field = ({ label, children }) => (
  <div className="input-group"><label>{label}</label>{children}</div>
)

const EMPTY = {
  full_name: '', gender: '', dob: '', height_cm: '', marital_status: 'never_married',
  religion: '', caste_category: '', caste: '', mother_tongue: '', education: '', occupation: '', annual_income: '',
  city: '', state: '', about: '', partner_expectations: '', photo_path: '', phone: '',
  birth_time: '', birth_place: '', birth_utc_offset: '5.5',
}

export const TIMEZONES = [
  ['5.5', 'India (IST, +5:30)'], ['0', 'UK winter / UTC (+0)'], ['1', 'UK summer (+1)'], ['3', 'Saudi / Kuwait / Qatar (+3)'],
  ['4', 'UAE / Oman (+4)'], ['5.75', 'Nepal (+5:45)'], ['6', 'Bangladesh (+6)'], ['8', 'Singapore / Malaysia (+8)'],
  ['10', 'Australia East (+10)'], ['-5', 'US Eastern winter (-5)'], ['-4', 'US Eastern summer (-4)'],
  ['-6', 'US Central winter (-6)'], ['-8', 'US Pacific winter (-8)'], ['-7', 'US Pacific summer (-7)'],
]

export default function MyProfile({ userId, me, onSaved, adminMode = false }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pin, setPin] = useState('')
  const [pinBusy, setPinBusy] = useState(false)
  const [showKundli, setShowKundli] = useState(false)

  useEffect(() => {
    if (!me) return
    setForm(f => ({
      ...f,
      ...Object.fromEntries(Object.entries(me).map(([k, v]) => [k, v ?? ''])),
      birth_time: me.birth_time ? String(me.birth_time).slice(0, 5) : '',
      birth_utc_offset: String(me.birth_utc_offset ?? 5.5),
    }))
    supabase.from('matrimony_contacts').select('phone').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (data) setForm(f => ({ ...f, phone: data.phone })) })
  }, [me, userId])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const blob = await resizeImage(file)
      const path = `${userId}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      setForm(f => ({ ...f, photo_path: path }))
    } catch (err) {
      alert('Photo upload failed: ' + err.message)
    } finally { setUploading(false); e.target.value = '' }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) return alert('Please enter your name')
    if (!form.gender) return alert('Please select gender')
    if (!form.dob) return alert('Please enter date of birth')
    if (calcAge(form.dob) < 18) return alert('You must be at least 18 years old')
    if (!/^[0-9+\-\s]{10,15}$/.test(form.phone.trim())) return alert('Enter a valid phone number')
    const h = form.height_cm ? Number(form.height_cm) : null
    if (h && (h < 100 || h > 250)) return alert('Height must be between 100 and 250 cm')

    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        full_name: form.full_name.trim(),
        gender: form.gender,
        dob: form.dob,
        height_cm: h,
        marital_status: form.marital_status,
        religion: form.religion || null,
        caste_category: form.caste_category || null,
        caste: form.caste.trim() || null,
        mother_tongue: form.mother_tongue || null,
        education: form.education || null,
        occupation: form.occupation.trim() || null,
        annual_income: form.annual_income || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        about: form.about.trim() || null,
        partner_expectations: form.partner_expectations.trim() || null,
        photo_path: form.photo_path || null,
        birth_time: form.birth_time || null,
        birth_place: form.birth_place.trim() || null,
        birth_utc_offset: Number.isNaN(parseFloat(form.birth_utc_offset)) ? 5.5 : parseFloat(form.birth_utc_offset),
        moon_long: moonLong,
      }
      if (adminMode && !me) payload.status = 'approved' // profiles added by admin/staff are approved
      const a = await supabase.from('matrimony_profiles').upsert(payload, { onConflict: 'user_id' })
      if (a.error) throw a.error
      const b = await supabase.from('matrimony_contacts').upsert({ user_id: userId, phone: form.phone.trim() }, { onConflict: 'user_id' })
      if (b.error) throw b.error
      if (me?.photo_path && me.photo_path !== form.photo_path) {
        supabase.storage.from(BUCKET).remove([me.photo_path]) // best effort cleanup
      }
      alert(adminMode ? (me ? '✅ Profile updated' : '✅ Profile added and approved') : (me ? '✅ Profile updated' : '✅ Profile submitted - it is now visible with basic details'))
      onSaved()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally { setSaving(false) }
  }

  // fill city + state from a 6-digit PIN code (free India Post lookup)
  const lookupPin = async () => {
    if (!/^[0-9]{6}$/.test(pin)) return alert('Enter a 6-digit PIN code')
    setPinBusy(true)
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
      const json = await res.json()
      const po = json?.[0]?.PostOffice?.[0]
      if (json?.[0]?.Status !== 'Success' || !po) return alert('PIN code not found. Please choose the state and city yourself.')
      setForm(f => ({ ...f, city: po.District || po.Name || f.city, state: matchState(po.State) || po.State || f.state }))
    } catch {
      alert('Could not look up the PIN code now. Please choose the state and city yourself.')
    } finally { setPinBusy(false) }
  }

  // Moon position from birth data (stored; only Moon sign + star are visible to others)
  const moonLong = useMemo(
    () => (form.dob && form.birth_time ? moonSidereal(form.dob, form.birth_time, Number(form.birth_utc_offset)) : null),
    [form.dob, form.birth_time, form.birth_utc_offset]
  )

  const stateOptions = form.state && !STATES.includes(form.state) ? [form.state, ...STATES] : STATES
  const cityList = CITIES[form.state] || []
  const casteList = CASTES[form.religion] || []
  const allCastes = [...new Set(Object.values(CASTES).flat())].filter(c => c !== 'Other').sort()
  const url = photoUrl(form.photo_path)

  return (
    <form onSubmit={save}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        {url
          ? <img className="mm-avatar" style={{ width: 110, height: 110 }} src={url} alt="" />
          : <div className="mm-avatar mm-avatar-ph" style={{ width: 110, height: 110, fontSize: 52, margin: '0 auto' }}>{form.gender === 'female' ? '👩' : '👨'}</div>}
        <div style={{ marginTop: 8 }}>
          <label className="btn btn-sm mm-btn-light" style={{ cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : '📷 Choose photo'}
            <input type="file" accept="image/*" onChange={pickPhoto} disabled={uploading} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div className="mm-section-title">Basic</div>
      <Field label="Full name *"><input className="input" value={form.full_name} onChange={set('full_name')} /></Field>
      <div className="mm-row">
        <Field label="Gender *">
          <select className="input mm-select" value={form.gender} onChange={set('gender')}>
            <option value="">Select</option><option value="male">Male</option><option value="female">Female</option>
          </select>
        </Field>
        <Field label="Date of birth *"><input className="input" type="date" value={form.dob} onChange={set('dob')} /></Field>
      </div>
      <div className="mm-row">
        <Field label="Height (cm)"><input className="input" type="number" inputMode="numeric" value={form.height_cm} onChange={set('height_cm')} /></Field>
        <Field label="Marital status">
          <select className="input mm-select" value={form.marital_status} onChange={set('marital_status')}>
            {MARITAL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Phone * (shown only after an interest is accepted)">
        <input className="input" type="tel" value={form.phone} onChange={set('phone')} />
      </Field>

      <div className="mm-section-title">Background</div>
      <div className="mm-row">
        <Field label="Religion">
          <select className="input mm-select" value={form.religion} onChange={set('religion')}>
            <option value="">Select</option>{RELIGIONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Caste category">
          <select className="input mm-select" value={form.caste_category} onChange={set('caste_category')}>
            <option value="">Select (optional)</option>
            {CASTE_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Caste / sub-caste (optional)">
        <SearchSelect value={form.caste} onChange={v => setForm(f => ({ ...f, caste: v }))}
          options={casteList.length ? casteList : allCastes} placeholder="Type or pick, e.g. Kamma, Kapu, Vanniyakula Kshatriya" />
      </Field>
      <Field label="Mother tongue">
        <select className="input mm-select" value={form.mother_tongue} onChange={set('mother_tongue')}>
          <option value="">Select</option>{LANGUAGES.map(r => <option key={r}>{r}</option>)}
        </select>
      </Field>

      <div className="mm-section-title">Education & work</div>
      <div className="mm-row">
        <Field label="Education">
          <select className="input mm-select" value={form.education} onChange={set('education')}>
            <option value="">Select</option>{EDUCATION.map(r => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Annual income">
          <select className="input mm-select" value={form.annual_income} onChange={set('annual_income')}>
            <option value="">Select</option>{INCOME.map(r => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Occupation"><input className="input" value={form.occupation} onChange={set('occupation')} /></Field>

      <div className="mm-section-title">Location</div>
      <Field label="PIN code (optional - fills city and state)">
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
          <button type="button" className="btn btn-sm mm-btn-light" style={{ width: 'auto', whiteSpace: 'nowrap' }} disabled={pinBusy} onClick={lookupPin}>{pinBusy ? '...' : '📍 Fill'}</button>
        </div>
      </Field>
      <Field label="State">
        <select className="input mm-select" value={form.state} onChange={set('state')}>
          <option value="">Select state</option>
          {stateOptions.map(st => <option key={st}>{st}</option>)}
        </select>
      </Field>
      <Field label={form.state === OUTSIDE ? 'City / Country' : 'City'}>
        <SearchSelect value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} options={cityList} placeholder={cityList.length ? 'Type or pick your city' : 'Type your city'} />
      </Field>

      <div className="mm-section-title">🔮 Horoscope (optional)</div>
      <div className="mm-row">
        <Field label="Time of birth"><input className="input" type="time" value={form.birth_time} onChange={set('birth_time')} /></Field>
        <Field label="Place of birth">
          <SearchSelect value={form.birth_place} onChange={v => setForm(f => ({ ...f, birth_place: v }))} options={KNOWN_PLACES} placeholder="Type or pick the nearest big city" />
        </Field>
      </div>
      <Field label="Time zone of birth place">
        <select className="input mm-select" value={form.birth_utc_offset} onChange={set('birth_utc_offset')}>
          {TIMEZONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      {moonLong !== null ? (
        <div className="mm-banner ok">
          🌙 Moon sign: <b>{RASHI[rashiIndex(moonLong)]} ({RASHI_EN[rashiIndex(moonLong)]})</b><br />
          Nakshatra: <b>{NAKSHATRA[nakshatraIndex(moonLong)]}</b> (pada {padaOf(moonLong)})
        </div>
      ) : (
        <p className="text-sm" style={{ marginBottom: 10 }}>Enter your date (above) and time of birth to find your Moon sign and nakshatra.</p>
      )}
      {form.dob && form.birth_time && (
        <button type="button" className="btn mm-btn-light" onClick={() => setShowKundli(true)}>📜 View / download kundli (PDF)</button>
      )}
      {showKundli && <KundliView birth={birthFromProfile(form)} onClose={() => setShowKundli(false)} />}
      <p className="text-sm" style={{ marginBottom: 6 }}>Your birth time and place are never shown to others. Only your Moon sign and nakshatra are used for matching.</p>

      <div className="mm-section-title">About you</div>
      <Field label="About me"><textarea className="input mm-textarea" maxLength={600} value={form.about} onChange={set('about')} /></Field>
      <Field label="What I'm looking for"><textarea className="input mm-textarea" maxLength={600} value={form.partner_expectations} onChange={set('partner_expectations')} /></Field>

      <button className="btn mm-btn-pink" type="submit" disabled={saving || uploading}>
        {saving ? 'Saving...' : me ? '💾 Update Profile' : '📨 Submit Profile'}
      </button>
    </form>
  )
}
