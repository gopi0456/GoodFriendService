import { useState } from 'react'
import KundliView from './KundliView'
import { birthFromProfile } from './kundli'

// Always visible at the top of "My Profile"
export default function MyKundliCard({ me }) {
  const [open, setOpen] = useState(false)
  if (!me) return null
  const ready = !!me.birth_time && !!me.dob
  return (
    <div className="card">
      <div className="mm-status-row">
        <h3>📜 My Kundli</h3>
        <span className={`mm-status mm-status-${me.status}`}>{me.status === 'approved' ? '✓ Approved' : me.status === 'pending' ? '⏳ Pending' : me.status === 'married' ? '💍 Married' : me.status}</span>
      </div>
      {ready ? (
        <>
          <p className="text-sm" style={{ marginBottom: 8 }}>View your kundli and download it as a PDF in English, Hindi, Telugu, Tamil, Kannada or Malayalam.</p>
          <button className="btn mm-btn-pink" onClick={() => setOpen(true)}>📜 View / download kundli</button>
        </>
      ) : (
        <p className="text-sm">Add your <b>time of birth</b> in the form below (Horoscope section) and tap Update Profile. Your kundli will then appear here.</p>
      )}
      {open && <KundliView birth={birthFromProfile(me)} onClose={() => setOpen(false)} />}
    </div>
  )
}
