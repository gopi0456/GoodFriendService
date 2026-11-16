import { hueVars, initials, photoUrl } from './workerApi'
import ContactButtons from '../engage/ContactButtons'

export function WorkerAvatar({ worker, type, size = 60 }) {
  const url = photoUrl(worker.photo_path)
  const style = { width: size, height: size, ...hueVars(type?.name || worker.name) }
  if (url) return <img className="wk-avatar" style={style} src={url} alt="" loading="lazy" />
  return <div className="wk-avatar wk-avatar-ph" style={{ ...style, fontSize: size * 0.42 }}>{type?.icon || initials(worker.name)}</div>
}

// one worker in the list. `phone` is empty when the admin keeps contacts hidden.
export default function WorkerCard({ worker, type, phone, locked, onOpen }) {
  const hues = hueVars(type?.name || worker.name)
  return (
    <div className="wk-card" style={hues} onClick={onOpen}>
      <WorkerAvatar worker={worker} type={type} />
      <div className="wk-card-body">
        <div className="wk-name">{worker.name}</div>
        <div className="wk-row">
          <span className="wk-pill">{type?.icon} {type?.name || 'Worker'}</span>
          {worker.experience_years != null && <span className="wk-exp">⏱ {worker.experience_years} yr</span>}
        </div>
        {worker.address && <div className="wk-meta">📍 {worker.address}</div>}
        <div className="wk-actions" onClick={e => e.stopPropagation()}>
          <ContactButtons prefix="wk" kind="worker" id={worker.id} name={worker.name} phone={phone} locked={locked} />
        </div>
      </div>
    </div>
  )
}
