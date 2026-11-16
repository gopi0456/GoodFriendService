import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

let locks = 0
const stack = [] // open popups, last = on top

// Draws a popup directly on <body>, so no card / container style can clip, shrink or move it.
// Stops the page behind from scrolling, and closes ONLY the top-most popup on the Escape key.
export default function Portal({ children, onEscape }) {
  const entry = useRef({ fn: onEscape })
  entry.current.fn = onEscape
  useEffect(() => {
    const me = entry.current
    stack.push(me)
    locks += 1
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape' && stack[stack.length - 1] === me && me.fn) me.fn() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      const i = stack.indexOf(me)
      if (i >= 0) stack.splice(i, 1)
      locks -= 1
      if (locks <= 0) { locks = 0; document.body.style.overflow = '' }
    }
  }, [])
  return createPortal(children, document.body)
}
