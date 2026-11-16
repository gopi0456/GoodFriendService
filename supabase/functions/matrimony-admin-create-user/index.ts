// Admin helper for logins  <username>@goodfriendservice.app
//   { username, password }                -> create a login        (main admin, or staff with "add users")
//   { action: 'delete', user_id }         -> delete a login + all its data (main admin only)
//   { action: 'set_password', user_id, password } -> set a new password for any user (main admin only)
// Deploy: Supabase Dashboard > Edge Functions > matrimony-admin-create-user > paste this file > Deploy.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_EMAIL = 'scgopi.gopi@gmail.com'
const DOMAIN = 'goodfriendservice.app'
const BUCKET = 'matrimony-photos'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // who is calling?
    const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
    const { data: { user }, error: userErr } = await caller.auth.getUser()
    if (userErr || !user) return json({ error: 'Not signed in' }, 401)

    const admin = createClient(url, service)
    const isMainAdmin = (user.email ?? '').toLowerCase() === ADMIN_EMAIL
    const body = await req.json()

    // ---------------- delete a login (main admin only)
    if (body.action === 'delete') {
      if (!isMainAdmin) return json({ error: 'Only the main admin can delete logins' }, 403)
      const target = String(body.user_id ?? '')
      if (!/^[0-9a-f-]{36}$/i.test(target)) return json({ error: 'Invalid user' }, 400)
      if (target === user.id) return json({ error: 'You cannot delete your own login' }, 400)
      // remove profile photos first (best effort)
      const { data: files } = await admin.storage.from(BUCKET).list(target)
      if (files?.length) await admin.storage.from(BUCKET).remove(files.map((f) => `${target}/${f.name}`))
      const { error } = await admin.auth.admin.deleteUser(target)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    // ---------------- set a user's password (main admin only; staff can never reset the admin's password)
    if (body.action === 'set_password') {
      if (!isMainAdmin) return json({ error: 'Only the main admin can set passwords' }, 403)
      const target = String(body.user_id ?? '')
      const newPassword = String(body.password ?? '')
      if (!/^[0-9a-f-]{36}$/i.test(target)) return json({ error: 'Invalid user' }, 400)
      if (newPassword.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400)
      const { error } = await admin.auth.admin.updateUserById(target, { password: newPassword })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    // ---------------- create a login
    let allowed = isMainAdmin
    if (!allowed) {
      const { data } = await admin.from('matrimony_staff').select('can_add_user').eq('user_id', user.id).maybeSingle()
      allowed = !!data?.can_add_user
    }
    if (!allowed) return json({ error: 'You do not have permission to add users' }, 403)

    const username = String(body.username ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return json({ error: 'Username: 3-30 letters, numbers, . _ -' }, 400)
    if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400)

    const email = `${username}@${DOMAIN}`
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) return json({ error: error.message }, 400)
    return json({ user_id: data.user.id, email })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
