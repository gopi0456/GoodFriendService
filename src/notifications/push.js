import { Capacitor, registerPlugin } from '@capacitor/core'
import { supabase } from '../supabaseClient'

// Phone notifications (they work even when the app is closed, and show the count on the app icon).
// Optional: needs  npm i @capacitor/push-notifications  and a Firebase project. See PUSH-SETUP.md.
// Without that setup this does nothing and the app works as before.
const Push = registerPlugin('PushNotifications')

export const pushAvailable = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications')

export async function setupPush({ onReceive, onOpen }) {
  if (!pushAvailable()) return 'unavailable'
  try {
    let perm = await Push.checkPermissions()
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') perm = await Push.requestPermissions()
    if (perm.receive !== 'granted') return 'denied'
    try { await Push.createChannel({ id: 'gfs', name: 'Good Friend Service', description: 'Contacts, chats and replies', importance: 5, visibility: 1, vibration: true, lights: true }) } catch { /* older Android */ }
    await Push.addListener('registration', (t) => { supabase.rpc('register_push_token', { p_token: t.value, p_platform: 'android' }).then(() => {}, () => {}) })
    await Push.addListener('registrationError', () => {})
    await Push.addListener('pushNotificationReceived', (n) => { if (onReceive) onReceive(n) })
    await Push.addListener('pushNotificationActionPerformed', (a) => { if (onOpen) onOpen(a) })
    await Push.register()
    return 'ok'
  } catch {
    return 'error'
  }
}

// removes the notifications (and so the number on the app icon) from the phone's notification shade
export async function clearPhoneBadge() {
  if (!pushAvailable()) return
  try { await Push.removeAllDeliveredNotifications() } catch { /* nothing to clear */ }
}
