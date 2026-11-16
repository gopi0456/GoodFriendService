import { Capacitor, registerPlugin } from '@capacitor/core'

// Spoken alerts. Uses the phone's text-to-speech. Best quality with the optional plugin
//   npm i @capacitor-community/text-to-speech      (see PUSH-SETUP.md); otherwise the built-in browser voice is tried.
const NativeTTS = registerPlugin('TextToSpeech')
const KEY = 'gfs-voice'

export const voiceEnabled = () => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } }
export const setVoiceEnabled = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* nothing to remember */ } }

// "Good morning" until 12:00, "Good afternoon" until 17:00, "Good evening" after that
export const greeting = (d = new Date()) => { const h = d.getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

export const LINE = {
  contact: 'Someone is interested to contact you.',
  chat_message: 'Someone has sent you a chat message.',
  chat_approved: 'Your chat request has been approved.',
  admin_reply: 'The admin has replied to your message.',
  interest: 'Someone is interested in your profile.',
  request: 'There is a new request waiting for you.',
  update: 'A new update of Good Friend Service is available. Please download it.',
  info: 'You have a new notification.',
}

// the full sentence that is spoken
export const speechFor = (rows, d = new Date()) => {
  const n = rows.length
  const line = LINE[rows[0].kind] || LINE.info
  return `${greeting(d)}! ${n > 1 ? `You have ${n} new alerts. ` : ''}${line} Thank you for using Good Friend Service. Good luck!`
}

export async function speak(text, { force = false } = {}) {
  if (!force && !voiceEnabled()) return false
  try {
    if (Capacitor.isPluginAvailable('TextToSpeech')) { await NativeTTS.speak({ text, lang: 'en-IN', rate: 0.95, pitch: 1.0, volume: 1.0 }); return true }
  } catch { /* fall through to the browser voice */ }
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      const u = new SpeechSynthesisUtterance(text); u.lang = 'en-IN'; u.rate = 0.95
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u)
      return true
    }
  } catch { /* no voice available on this phone */ }
  return false
}
