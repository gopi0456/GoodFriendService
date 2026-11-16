import { supabase } from '../supabaseClient'

const FN = 'matrimony-admin-create-user'

async function call(body) {
  const { data, error } = await supabase.functions.invoke(FN, { body })
  let msg = data?.error
  if (error) {
    msg = error.message
    try { const j = await error.context.json(); msg = j.error || msg } catch { /* ignore */ }
    if (/Failed to send|not found|404/i.test(msg)) msg = 'The "matrimony-admin-create-user" Edge Function is not deployed yet. Deploy it once in the Supabase dashboard.'
  }
  return { data, msg }
}

export const createLogin = (username, password) => call({ username, password })
export const deleteLogin = (user_id) => call({ action: 'delete', user_id })

export const genPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const a = new Uint32Array(8)
  crypto.getRandomValues(a)
  return Array.from(a, n => chars[n % chars.length]).join('')
}
export const genUsername = () => {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return 'gf' + String(a[0] % 1000000).padStart(6, '0')
}

export const setPassword = (user_id, password) => call({ action: 'set_password', user_id, password })
