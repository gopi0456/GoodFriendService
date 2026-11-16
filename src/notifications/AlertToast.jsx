import { createPortal } from 'react-dom'
import './alerts.css'

// the small bar that drops from the top when a new alert arrives while the app is open
export default function AlertToast({ toast, onOpen, onClose }) {
  if (!toast) return null
  return createPortal(
    <div className="al-toast" role="alert" onClick={onOpen}>
      <span className="al-toast-ico">{toast.icon}</span>
      <span className="al-toast-txt"><b>{toast.title}</b><small>{toast.body}</small></span>
      <button className="al-toast-x" aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); onClose() }}>✕</button>
    </div>,
    document.body,
  )
}
