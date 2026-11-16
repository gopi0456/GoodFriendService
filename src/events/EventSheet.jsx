import { useState } from 'react'
import Portal from '../matrimony/Portal'
import { Carousel, Lightbox } from './Gallery'
import ContactButtons from '../engage/ContactButtons'
import ChatRequestButton from '../engage/ChatRequestButton'
import { hueVars, photoUrl, tagsOf } from './eventApi'

// full detail of one event service, with its own gallery
export default function EventSheet({ ev, cat, photos, phone, locked, onClose }) {
  const [lb, setLb] = useState(null)
  const tags = tagsOf(ev.tags)

  const share = async () => {
    const text = `${ev.name} - ${cat?.name || 'Event service'}${ev.area ? `, ${ev.area}` : ''}${phone && !locked ? `\n📞 ${phone}` : ''}`
    try {
      if (navigator.share) await navigator.share({ title: ev.name, text })
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } catch { /* the user closed the share sheet */ }
  }

  return (
    <Portal onEscape={onClose}>
      <div className="ev ev-sheet-root">
        <div className="ev-sheet-overlay" onClick={onClose}>
          <div className="ev-sheet" style={hueVars(cat?.name || ev.name)} onClick={e => e.stopPropagation()}>
            <button className="ev-sheet-x" onClick={onClose} aria-label="Close">✕</button>
            {photos.length ? <Carousel photos={photos} onOpen={setLb} /> : <div className="ev-cover-ph big">{cat?.icon || '🎉'}</div>}
            <div className="ev-sheet-body">
              <div className="ev-name big">{ev.name}</div>
              <div className="ev-row">
                <span className="ev-pill">{cat?.icon} {cat?.name}</span>
                {ev.verified && <span className="ev-b ok inline">✔ Verified</span>}
                {ev.featured && <span className="ev-b star inline">⭐ Featured</span>}
              </div>

              <div className="ev-info">
                {ev.area && <div><span>📍 Area</span><b>{ev.area}</b></div>}
                {ev.address && <div><span>🏠 Address</span><b>{ev.address}</b></div>}
                {ev.price_text && <div><span>💰 Price</span><b>{ev.price_text}</b></div>}
                {ev.capacity_text && <div><span>👥 Capacity</span><b>{ev.capacity_text}</b></div>}
                {ev.experience_years != null && <div><span>⏱ Experience</span><b>{ev.experience_years} years</b></div>}
              </div>
              {tags.length > 0 && <div className="ev-tags big">{tags.map(t => <span key={t}>{t}</span>)}</div>}
              {ev.about && <p className="ev-about">{ev.about}</p>}

              {photos.length > 1 && (
                <>
                  <div className="ev-h">📷 Gallery ({photos.length})</div>
                  <div className="ev-thumbs">{photos.map((p, i) => <img key={p.id || p.photo_path} src={photoUrl(p.photo_path)} alt="" loading="lazy" onClick={() => setLb(i)} />)}</div>
                </>
              )}

              <div className="ev-actions"><ContactButtons prefix="ev" kind="event" id={ev.id} name={ev.name} phone={phone} locked={locked} /></div>
              <ChatRequestButton otherId={ev.owner_id} otherName={ev.name} context={`Event service: ${ev.name}`} />
              <button className="ev-share" onClick={share}>↗ Share this service</button>
              <button className="ev-close" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
        {lb !== null && <Lightbox photos={photos} start={lb} onClose={() => setLb(null)} />}
      </div>
    </Portal>
  )
}
