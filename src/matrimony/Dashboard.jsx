import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Avatar } from './ProfileView'

const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '')
const num = (v) => (v == null ? '-' : Number(v))

// Landing screen of the Matrimonial section
export default function Dashboard({ me, onGo }) {
  const [stats, setStats] = useState(null)
  const [stories, setStories] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.rpc('matrimony_stats').then(({ data, error }) => {
      if (error) { setErr(error.message); return }
      setStats(Array.isArray(data) ? data[0] : data)
    })
    supabase.from('matrimony_success').select('*').order('married_on', { ascending: false }).limit(60)
      .then(({ data }) => setStories(data || []))
  }, [])

  const first = (me.full_name || '').split(' ')[0]

  return (
    <div>
      <div className="mm-welcome">Welcome, <b>{first}</b> 👋</div>
      {err && <div className="mm-banner bad">Could not load the counts: {err}. Run <b>matrimony-update7.sql</b> in Supabase.</div>}

      <div className="mm-dash">
        <div className="mm-dash-main"><b>{num(stats?.total)}</b><span>👥 Total registrations</span></div>
        <div className="mm-dash-row">
          <div><b>{num(stats?.male)}</b><span>🤵 Male</span></div>
          <div><b>{num(stats?.female)}</b><span>👰 Female</span></div>
          <div><b>{num(stats?.couples)}</b><span>💍 Couples</span></div>
        </div>
      </div>

      <div className="mm-section-title">💍 Successfully completed profiles ({stats?.couples ?? (stories ? stories.length : 0)})</div>
      {stories === null && <div className="mm-empty">Loading...</div>}
      {stories && stories.length === 0 && (
        <div className="mm-empty">Our happy couples will appear here once a match is completed. 💐</div>
      )}
      {stories && stories.map(s => (
        <div className="card mm-story" key={s.id}>
          <div className="mm-story-photos">
            <div className="mm-theme-male"><Avatar profile={{ photo_path: s.groom_photo, gender: 'male' }} size={78} /></div>
            <span className="mm-story-heart">💞</span>
            <div className="mm-theme-female"><Avatar profile={{ photo_path: s.bride_photo, gender: 'female' }} size={78} /></div>
          </div>
          <div className="text-bold">{s.groom_name} &amp; {s.bride_name}</div>
          <div className="text-sm">💍 Married {fmt(s.married_on)}</div>
          {s.note && <div className="text-sm">{s.note}</div>}
        </div>
      ))}

      <div className="mm-row" style={{ marginTop: 14 }}>
        <button className="btn mm-btn-pink" onClick={() => onGo('browse')}>🔍 Browse profiles</button>
        <button className="btn mm-btn-light" onClick={() => onGo('profile')}>👤 My profile</button>
      </div>
      <button className="btn mm-btn-light" style={{ marginTop: 10 }} onClick={() => onGo('messages')}>✉️ Message the admin</button>
    </div>
  )
}
