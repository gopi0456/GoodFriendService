// Sends a PHONE notification (with the unread count for the app icon) whenever a row is added to app_notifications.
// Called by a Supabase Database Webhook. Setup steps: PUSH-SETUP.md
// Secrets needed:  FCM_SERVICE_ACCOUNT  (the Firebase service-account JSON)   PUSH_WEBHOOK_SECRET  (any long random text)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const enc = new TextEncoder()

const b64url = (input: ArrayBuffer | string) => {
  const bytes = typeof input === 'string' ? enc.encode(input) : new Uint8Array(input)
  let s = ''
  bytes.forEach((b) => { s += String.fromCharCode(b) })
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const pemToBuffer = (pem: string) => {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

// Google OAuth access token from the service account (signed JWT)
async function accessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const unsigned =
    b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' +
    b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))
  const key = await crypto.subtle.importKey('pkcs8', pemToBuffer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned))
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + b64url(signature) }),
  })
  const json = await res.json()
  if (!json.access_token) throw new Error('Google sign-in failed: ' + JSON.stringify(json))
  return json.access_token
}

// "Good morning" / "Good afternoon" / "Good evening" by Indian time
const greeting = () => {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }), 10) % 24
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('PUSH_WEBHOOK_SECRET')) return new Response('forbidden', { status: 403 })
  try {
    const payload = await req.json()
    const rec = payload.record
    if (!rec || !rec.user_id) return new Response('no record', { status: 400 })

    const sa = JSON.parse(Deno.env.get('FCM_SERVICE_ACCOUNT')!)
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: tokens } = await db.from('push_tokens').select('token').eq('user_id', rec.user_id)
    if (!tokens || tokens.length === 0) return new Response('no phone registered', { status: 200 })
    const { count } = await db.from('app_notifications').select('id', { count: 'exact', head: true }).eq('user_id', rec.user_id).is('read_at', null)

    const thanks = ['contact', 'interest'].includes(rec.kind) ? '\nThank you for using Good Friend Service. Good luck!' : ''
    const access = await accessToken(sa)
    const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`

    for (const { token } of tokens) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: `${greeting()}! ${rec.title}`, body: `${rec.body}${thanks}` },
            data: { kind: String(rec.kind ?? ''), ref: String(rec.ref ?? '') },
            // notification_count = the number shown on the app icon (on phones whose launcher supports it)
            android: { priority: 'HIGH', notification: { channel_id: 'gfs', sound: 'default', notification_count: Math.max(1, count ?? 1) } },
          },
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        if (text.includes('UNREGISTERED') || text.includes('NOT_FOUND')) await db.from('push_tokens').delete().eq('token', token)   // phone no longer has the app
      }
    }
    return new Response('ok', { status: 200 })
  } catch (e) {
    return new Response('error: ' + (e as Error).message, { status: 500 })
  }
})
