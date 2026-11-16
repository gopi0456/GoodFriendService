import { useEffect, useRef, useState } from 'react'
import Portal from '../matrimony/Portal'
import { photoUrl } from './eventApi'

// swipeable photo strip (scroll-snap) with dots and a counter
export function Carousel({ photos, onOpen }) {
  const ref = useRef(null)
  const [i, setI] = useState(0)
  if (!photos.length) return null
  const onScroll = () => { const el = ref.current; if (el && el.clientWidth) setI(Math.round(el.scrollLeft / el.clientWidth)) }
  return (
    <div className="ev-carousel">
      <div className="ev-slides" ref={ref} onScroll={onScroll}>
        {photos.map((p, idx) => <img key={p.id || p.photo_path} src={photoUrl(p.photo_path)} alt="" loading={idx ? 'lazy' : 'eager'} onClick={() => onOpen(idx)} />)}
      </div>
      {photos.length > 1 && <div className="ev-dots">{photos.map((p, idx) => <span key={p.id || p.photo_path} className={idx === i ? 'on' : ''} />)}</div>}
      <span className="ev-counter">{Math.min(i + 1, photos.length)} / {photos.length}</span>
    </div>
  )
}

// full-screen viewer: swipe, arrow buttons, arrow keys, Escape
export function Lightbox({ photos, start = 0, onClose }) {
  const [i, setI] = useState(start)
  const touch = useRef(null)
  const go = (d) => setI(x => (x + d + photos.length) % photos.length)
  useEffect(() => {
    const k = (e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [photos.length])
  const stop = (fn) => (e) => { e.stopPropagation(); fn() }
  return (
    <Portal onEscape={onClose}>
      <div className="ev ev-lb" onClick={onClose}>
        <button className="ev-lb-x" onClick={stop(onClose)} aria-label="Close">✕</button>
        <img src={photoUrl(photos[i].photo_path)} alt="" onClick={e => e.stopPropagation()}
          onTouchStart={e => { touch.current = e.touches[0].clientX }}
          onTouchEnd={e => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1) }} />
        {photos.length > 1 && (
          <>
            <button className="ev-lb-nav prev" onClick={stop(() => go(-1))} aria-label="Previous">‹</button>
            <button className="ev-lb-nav next" onClick={stop(() => go(1))} aria-label="Next">›</button>
          </>
        )}
        <div className="ev-lb-count">{i + 1} / {photos.length}</div>
      </div>
    </Portal>
  )
}
