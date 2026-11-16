import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { MATCH_NOTE, ageOf, heightLabel, maritalLabel, photoUrl, respondInterest } from './utils'
import CompatCard from './CompatCard'
import Portal from './Portal'
import KundliView from './KundliView'
import ChatRequestButton from '../engage/ChatRequestButton'
import { birthFromProfile } from './kundli'
import HoroscopeCard from './HoroscopeCard'
import NameMatchCard from './NameMatchCard'
import { ScoreStrip } from './ScoreBadges'

export function Avatar({ profile, size = 64 }) {
  const url = photoUrl(profile.photo_path)
  if (url) return <img className="mm-avatar" style={{ width: size, height: size }} src={url} alt="" loading="lazy" />
  return (
    <div className="mm-avatar mm-avatar-ph" style={{ width: size, height: size, fontSize: size / 2 }}>
      {profile.gender === 'female' ? '👩' : '👨'}
    </div>
  )
}

export function ProfileCard({ profile, onOpen, footer }) {
  const line2 = profile.status === 'approved'
    ? [profile.education, profile.occupation].filter(Boolean).join(' • ')
    : profile.education || ''
  return (
    <div className={`card mm-card mm-theme-${profile.gender}`} onClick={onOpen}>
      <Avatar profile={profile} />
      <div className="mm-card-body">
        <div className="text-bold">{profile.full_name}, {ageOf(profile)}</div>
        {line2 && <div className="text-sm">🎓 {line2}</div>}
        {profile.status === 'approved' && (profile.city || profile.religion) && (
          <div className="text-sm">{[profile.religion, profile.city].filter(Boolean).join(' • ')}</div>
        )}
        {footer}
      </div>
    </div>
  )
}

const Tile = ({ icon, label, value }) => (value ? (
  <div className="mm-tile"><div className="mm-tile-icon">{icon}</div><div><div className="mm-tile-label">{label}</div><div className="mm-tile-value">{value}</div></div></div>
) : null)

export default function ProfileView({ profile, userId, me, rel, onClose }) {
  const [busy, setBusy] = useState(false)
  const [phone, setPhone] = useState(null)
  const [msg, setMsg] = useState('Hi, I am interested in this profile. Please share the contact details.')
  const id = profile.user_id
  const sentStatus = rel.sent[id]
  const recvStatus = rel.received[id]
  const accepted = sentStatus === 'accepted' || recvStatus === 'accepted'
  const saved = rel.shortlist.has(id)
  const req = rel.requests[id]
  const kreq = rel.kundliRequests[id]
  const [kundliBirth, setKundliBirth] = useState(null)
  const targetApproved = profile.status === 'approved'
  const canInterest = me.status === 'approved' && targetApproved
  const url = photoUrl(profile.photo_path)
  const female = profile.gender === 'female'

  // phone is only readable when the admin has granted my request (enforced by the database)
  useEffect(() => {
    if (req?.status !== 'granted') { setPhone(null); return }
    let alive = true
    supabase.from('matrimony_contacts').select('phone').eq('user_id', id).maybeSingle()
      .then(({ data }) => { if (alive) setPhone(data?.phone || '') })
    return () => { alive = false }
  }, [req?.status, id])

  const run = async (fn) => {
    setBusy(true)
    try {
      const { error } = await fn()
      if (error && error.code !== '23505') alert('Error: ' + error.message)
      await rel.reload()
    } finally { setBusy(false) }
  }

  const sendInterest = () => run(() => supabase.from('matrimony_interests').insert({ from_user: userId, to_user: id }))
  const withdraw = () => run(() => supabase.from('matrimony_interests').delete().eq('from_user', userId).eq('to_user', id))
  const respond = (status) => run(() => respondInterest(id, userId, status))
  const toggleSave = () => run(() => saved
    ? supabase.from('matrimony_shortlist').delete().eq('user_id', userId).eq('profile_id', id)
    : supabase.from('matrimony_shortlist').insert({ user_id: userId, profile_id: id }))
  const sendRequest = () => {
    if (!msg.trim()) return alert('Please type a message for the admin')
    run(() => supabase.from('matrimony_contact_requests').insert({ from_user: userId, about_user: id, message: msg.trim() }))
  }
  const requestKundli = () => run(() => supabase.from('matrimony_contact_requests')
    .insert({ from_user: userId, about_user: id, kind: 'kundli', message: 'Please share the kundli of this profile.' }))
  const withdrawKundli = () => run(() => supabase.from('matrimony_contact_requests').delete().eq('from_user', userId).eq('about_user', id).eq('kind', 'kundli'))
  const openKundli = async () => {
    setBusy(true)
    const { data, error } = await supabase.rpc('matrimony_kundli_birth', { target: id })
    setBusy(false)
    const row = Array.isArray(data) ? data[0] : data
    if (error || !row) return alert('Could not open the kundli' + (error ? ': ' + error.message : ''))
    if (!row.birth_time) return alert('This profile has no birth time yet, so a kundli cannot be made.')
    setKundliBirth(birthFromProfile(row))
  }
  const withdrawRequest = () => run(() => supabase.from('matrimony_contact_requests').delete().eq('from_user', userId).eq('about_user', id))

  // ---- interest section
  let interest
  if (!canInterest) {
    interest = <button className="btn mm-btn-light" disabled>🔒 Send interest (after approval)</button>
  } else if (recvStatus === 'pending') {
    interest = (
      <div className="mm-row">
        <button className="btn btn-success" disabled={busy} onClick={() => respond('accepted')}>✅ Accept</button>
        <button className="btn btn-danger" disabled={busy} onClick={() => respond('declined')}>✖ Decline</button>
      </div>
    )
  } else if (sentStatus === 'pending') {
    interest = <button className="btn mm-btn-light" disabled={busy} onClick={withdraw}>⏳ Interest sent - tap to withdraw</button>
  } else if (sentStatus === 'declined' || recvStatus === 'declined') {
    interest = <div className="mm-banner bad">This interest was declined.</div>
  } else if (accepted) {
    interest = <div className="mm-banner ok">🎉 Interest accepted. Use the section below to ask the admin for the mobile number.</div>
  } else {
    interest = <button className="btn mm-btn-theme" disabled={busy} onClick={sendInterest}>{female ? '💌' : '🤝'} Send Interest</button>
  }

  // ---- contact (mobile number) section
  let contact
  if (!req) {
    contact = (
      <>
        <p className="text-sm" style={{ marginBottom: 8 }}>The mobile number is hidden. Send a message to the admin to request it.</p>
        <textarea className="input mm-textarea" maxLength={500} value={msg} onChange={e => setMsg(e.target.value)} />
        <button className="btn mm-btn-theme" disabled={busy} onClick={sendRequest}>📩 Send message to admin</button>
      </>
    )
  } else if (req.status === 'pending') {
    contact = (
      <>
        <div className="mm-banner warn">⏳ Your message was sent to the admin. The number will appear here once the admin releases it.</div>
        <button className="btn mm-btn-light" disabled={busy} onClick={withdrawRequest}>Withdraw request</button>
      </>
    )
  } else if (req.status === 'granted') {
    contact = (
      <div className="mm-banner ok">
        📞 {phone === null ? 'Loading number...' : phone ? <>Mobile: <b>{phone}</b></> : 'No number available.'}
        {req.admin_reply && <><br />Admin: {req.admin_reply}</>}
      </div>
    )
  } else {
    contact = <div className="mm-banner bad">The admin could not release this number.{req.admin_reply ? ` Admin: ${req.admin_reply}` : ''}</div>
  }

  // ---- kundli section: the admin decides who may see another person's kundli
  let kundli
  if (profile.moon_long == null) {
    kundli = <p className="text-sm">This profile has no birth time, so a kundli is not available.</p>
  } else if (!kreq) {
    kundli = (
      <>
        <p className="text-sm" style={{ marginBottom: 8 }}>Birth details are private. Ask the admin to share this kundli with you.</p>
        <button className="btn mm-btn-theme" disabled={busy} onClick={requestKundli}>📜 Request kundli from admin</button>
      </>
    )
  } else if (kreq.status === 'pending') {
    kundli = (
      <>
        <div className="mm-banner warn">⏳ Request sent to the admin.</div>
        <button className="btn mm-btn-light" disabled={busy} onClick={withdrawKundli}>Withdraw request</button>
      </>
    )
  } else if (kreq.status === 'granted') {
    kundli = (
      <>
        <div className="mm-banner ok">✅ The admin has shared this kundli with you.{kreq.admin_reply ? <><br />Admin: {kreq.admin_reply}</> : null}</div>
        <button className="btn mm-btn-theme" disabled={busy} onClick={openKundli}>📜 View / download kundli</button>
      </>
    )
  } else {
    kundli = <div className="mm-banner bad">The admin could not share this kundli.{kreq.admin_reply ? ` Admin: ${kreq.admin_reply}` : ''}</div>
  }

  const subtitle = [profile.education, profile.occupation].filter(Boolean).join(' • ')

  return (
    <>
    <Portal onEscape={onClose}>
    <div className="mm-sheet-overlay" onClick={onClose}>
      <div className={`mm-sheet mm-theme-${profile.gender}`} onClick={e => e.stopPropagation()}>
        <button className="mm-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="mm-hero">
          {url ? <img src={url} alt="" /> : <div className="mm-hero-ph">{female ? '👩' : '👨'}</div>}
          <div className="mm-hero-fade" />
          {!targetApproved && <span className="mm-tag">New</span>}
          <div className="mm-hero-text">
            <h2>{profile.full_name}, {ageOf(profile)}</h2>
            {subtitle && <div>{subtitle}</div>}
          </div>
        </div>

        <div className="mm-body">
          <ScoreStrip me={me} profile={profile} />
          <CompatCard me={me} profile={profile} />
          <HoroscopeCard me={me} profile={profile} />
          <NameMatchCard a={me.full_name} b={profile.full_name} />
          <div className="mm-note">* {MATCH_NOTE}</div>

          {(!targetApproved || me.status !== 'approved') && <div className="mm-lock-chip">🔒 More details after admin approval</div>}

          {profile.about && (<><div className="mm-section-title">{female ? '🌸 About her' : '⚡ About him'}</div><p className="mm-text">{profile.about}</p></>)}

          <div className="mm-section-title">Details</div>
          <div className="mm-grid">
            <Tile icon="🎓" label="Qualification" value={profile.education} />
            <Tile icon="💼" label="Occupation" value={profile.occupation} />
            <Tile icon="💰" label="Income" value={profile.annual_income} />
            <Tile icon="📏" label="Height" value={heightLabel(profile.height_cm)} />
            <Tile icon="💍" label="Marital status" value={maritalLabel(profile.marital_status)} />
            <Tile icon="🙏" label="Religion" value={profile.religion} />
            <Tile icon="🏷️" label="Category" value={profile.caste_category} />
            <Tile icon="👥" label="Caste / sub-caste" value={profile.caste} />
            <Tile icon="🗣️" label="Mother tongue" value={profile.mother_tongue} />
            <Tile icon="📍" label="Location" value={[profile.city, profile.state].filter(Boolean).join(', ')} />
          </div>

          {profile.partner_expectations && (<><div className="mm-section-title">{female ? '💝 Looking for' : '🎯 Looking for'}</div><p className="mm-text">{profile.partner_expectations}</p></>)}

          <div className="mm-section-title">Interest</div>
          {interest}

          <div className="mm-section-title">Mobile number</div>
          {contact}

          <div className="mm-section-title">Kundli</div>
          {kundli}

          {canInterest && (
            <>
              <div className="mm-section-title">Chat</div>
              <ChatRequestButton otherId={id} otherName={profile.full_name} context="Matrimonial profile" />
            </>
          )}
        </div>

        <div className="mm-footer">
          <button className="btn mm-btn-light" disabled={busy} onClick={toggleSave}>{saved ? '★ Saved' : '☆ Save'}</button>
          <button className="btn mm-btn-theme" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
    </Portal>
    {kundliBirth && <KundliView birth={kundliBirth} onClose={() => setKundliBirth(null)} />}
    </>
  )
}
