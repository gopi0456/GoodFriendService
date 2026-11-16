import './matrimony.css'
import PasswordCard from './PasswordCard'

export default function PasswordPage({ session, onBack }) {
  return (
    <div>
      <div className="header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="header-title">🔑 Password</div>
        <div style={{ width: 70 }} />
      </div>
      <div className="content"><PasswordCard userId={session.user.id} /></div>
    </div>
  )
}
