// Colour schemes. The "Theme" button on the dashboard cycles through them and remembers the choice.
//   Sunset (default) / Emerald / Violet / Gold / Ruby / Lagoon / Orchid / Lime / Rose /
//   Surprise me (a different colour every time the app opens) / Classic
// Needs the font package:  npm i @fontsource/outfit
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import '@fontsource/outfit/800.css'
import './violet.css'

const KEY = 'gfs-theme'
const LAST = 'gfs-theme-last'
// key, name, preview of the colour (used by the colour picker)
export const THEMES = [
  ['sunset', 'Sunset', 'linear-gradient(135deg, #ff7a45, #e5387a)'],
  ['emerald', 'Emerald', 'linear-gradient(135deg, #2dd4bf, #0fa37f)'],
  ['violet', 'Violet', 'linear-gradient(135deg, #8a68ff, #471fa4)'],
  ['gold', 'Gold', 'linear-gradient(135deg, #facc15, #d98200)'],
  ['ruby', 'Ruby', 'linear-gradient(135deg, #ff4d5e, #a3122f)'],
  ['lagoon', 'Lagoon', 'linear-gradient(135deg, #22d3ee, #0b5566)'],
  ['orchid', 'Orchid', 'linear-gradient(135deg, #e879f9, #6b1480)'],
  ['lime', 'Lime', 'linear-gradient(135deg, #a3e635, #35620f)'],
  ['rose', 'Rose', 'linear-gradient(135deg, #ffb199, #cf4f74)'],
  ['auto', 'Surprise me', 'conic-gradient(#e5387a, #facc15, #0fa37f, #22d3ee, #8a68ff, #e5387a)'],
  ['classic', 'Classic', 'linear-gradient(135deg, #e5e7eb, #9ca3af)'],
]
const NAMES = THEMES.map(t => t[0])
const PALETTES = NAMES.filter(n => n !== 'auto' && n !== 'classic')

const read = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* private mode: nothing to remember */ } }

// "Surprise me": one colour per app launch, never the same one as the launch before
let launchPick = null
const pickForLaunch = () => {
  if (launchPick) return launchPick
  const options = PALETTES.filter(p => p !== read(LAST))
  launchPick = options[Math.floor(Math.random() * options.length)]
  write(LAST, launchPick)
  return launchPick
}

export const getTheme = () => { const v = read(KEY); return NAMES.includes(v) ? v : 'sunset' }
export const effectiveTheme = (t = getTheme()) => (t === 'auto' ? pickForLaunch() : t)

export const applyTheme = (t = getTheme()) => {
  const e = effectiveTheme(t)
  const c = document.body.classList
  c.toggle('vio', e !== 'classic')
  NAMES.filter(n => n !== 'auto').forEach(n => c.toggle('pal-' + n, n === e))
}
export const setTheme = (t) => { write(KEY, t); applyTheme(t) }
export const nextTheme = (t) => NAMES[(NAMES.indexOf(t) + 1) % NAMES.length]
