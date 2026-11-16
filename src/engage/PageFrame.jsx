import './engage.css'

// the common frame of the dashboard pages (history, chats, enquiries...)
export default function PageFrame({ title, icon, onBack, children }) {
  return (
    <div className="eg-page">
      <div className="eg-page-head">
        <button className="eg-back" onClick={onBack}>← Back</button>
        <div className="eg-page-title">{icon} {title}</div>
        <span style={{ width: 62 }} />
      </div>
      <div className="eg-page-body">{children}</div>
    </div>
  )
}
