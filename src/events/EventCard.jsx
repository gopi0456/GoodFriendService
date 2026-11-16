import { hueVars, photoUrl, tagsOf } from './eventApi'
import ContactButtons from '../engage/ContactButtons'

// one event service in the list: cover photo, badges, key facts
export default function EventCard({ ev, cat, photos, phone, locked, onOpen }) {
  const cover = photos[0]
  const tags = tagsOf(ev.tags)
  return (
    <div className="ev-card" style={hueVars(cat?.name || ev.name)} onClick={onOpen}>
      <div className="ev-cover">
        {cover ? <img src={photoUrl(cover.photo_path)} alt="" loading="lazy" /> : <div className="ev-cover-ph">{cat?.icon || '🎉'}</div>}
        <div className="ev-badges">
          {ev.featured && <span className="ev-b star">⭐ Featured</span>}
          {ev.verified && <span className="ev-b ok">✔ Verified</span>}
        </div>
        {photos.length > 0 && <span className="ev-count">📷 {photos.length}</span>}
      </div>
      <div className="ev-body">
        <div className="ev-name">{ev.name}</div>
        <div className="ev-row">
          <span className="ev-pill">{cat?.icon} {cat?.name}</span>
          {ev.area && <span className="ev-meta">📍 {ev.area}</span>}
        </div>
        {(ev.price_text || ev.capacity_text) && (
          <div className="ev-facts">{ev.price_text && <span>💰 {ev.price_text}</span>}{ev.capacity_text && <span>👥 {ev.capacity_text}</span>}</div>
        )}
        {tags.length > 0 && <div className="ev-tags">{tags.slice(0, 3).map(t => <span key={t}>{t}</span>)}</div>}
        <div className="ev-actions" onClick={e => e.stopPropagation()}><ContactButtons prefix="ev" kind="event" id={ev.id} name={ev.name} phone={phone} locked={locked} /></div>
      </div>
    </div>
  )
}
