// One clean, widely used font per script for the kundli (screen + PDF):
//   Telugu (Andhra Pradesh, Telangana)  -> Noto Sans Telugu
//   Tamil (Tamil Nadu)                  -> Noto Sans Tamil
//   Kannada (Karnataka)                 -> Noto Sans Kannada
//   Malayalam (Kerala)                  -> Noto Sans Malayalam
//   Hindi (north India)                 -> Noto Sans Devanagari
// Noto is Google's open font family; it is also what Android itself uses for these scripts.
// The font files come from the @fontsource packages and are bundled in the app, so they work offline.
// To use a different font, change the family name and the two imports for that language.
export const FONT_FAMILY = {
  hi: 'Noto Sans Devanagari',
  te: 'Noto Sans Telugu',
  ta: 'Noto Sans Tamil',
  kn: 'Noto Sans Kannada',
  ml: 'Noto Sans Malayalam',
}

const LOADERS = {
  hi: [() => import('@fontsource/noto-sans-devanagari/400.css'), () => import('@fontsource/noto-sans-devanagari/700.css')],
  te: [() => import('@fontsource/noto-sans-telugu/400.css'), () => import('@fontsource/noto-sans-telugu/700.css')],
  ta: [() => import('@fontsource/noto-sans-tamil/400.css'), () => import('@fontsource/noto-sans-tamil/700.css')],
  kn: [() => import('@fontsource/noto-sans-kannada/400.css'), () => import('@fontsource/noto-sans-kannada/700.css')],
  ml: [() => import('@fontsource/noto-sans-malayalam/400.css'), () => import('@fontsource/noto-sans-malayalam/700.css')],
}

const loaded = {}

// Makes sure the font for this language is ready; `text` = the words that will be drawn.
// Never throws: if anything goes wrong the phone's own fonts are used instead.
export async function ensureFont(lang, text = '') {
  const family = FONT_FAMILY[lang]
  if (!family) return
  try {
    if (!loaded[lang]) loaded[lang] = Promise.all(LOADERS[lang].map(f => f()))
    await loaded[lang]
    if (document.fonts && document.fonts.load) {
      await Promise.race([
        Promise.all([document.fonts.load(`400 16px "${family}"`, text), document.fonts.load(`700 16px "${family}"`, text)]),
        new Promise(r => setTimeout(r, 8000)), // never wait longer than 8 s
      ])
    }
  } catch (e) {
    console.warn('Font not loaded, using device fonts:', e && e.message)
  }
}
