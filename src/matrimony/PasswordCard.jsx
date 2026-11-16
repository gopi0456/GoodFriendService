import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Password change that needs admin approval: request -> admin approves -> user sets new password (24h, one time)
export default function PasswordCard({ userId }) {
  const [req, setReq] = useState(undefined)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('matrimony_password_requests').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
    setReq(error ? null : (data?.[0] || null))
  }, [userId])
  useEffect(() => { load() }, [load])

  const expired = req?.status === 'approved' && req.expires_at && new Date(req.expires_at) < new Date()
  const state = expired ? 'expired' : req?.status

  const request = async () => {
    setBusy(true)
    const { error } = await supabase.from('matrimony_password_requests').insert({ user_id: userId })
    setBusy(false)
    if (error && error.code !== '23505') return alert('Error: ' + error.message)
    load()
  }
  const cancel = async () => {
    setBusy(true)
    await supabase.from('matrimony_password_requests').delete().eq('id', req.id)
    setBusy(false)
    load()
  }
  const change = async (e) => {
    e.preventDefault()
    if (pw.length < 6) return alert('Password must be at least 6 characters')
    if (pw !== pw2) return alert('The two passwords do not match')
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) return alert('Could not change password: ' + error.message)
      await supabase.rpc('matrimony_password_request_use')
      setPw(''); setPw2('')
      alert('✅ Password changed. Use the new password next time you log in.')
      load()
    } finally { setBusy(false) }
  }

  if (req === undefined) return null

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ marginBottom: 8 }}>🔑 Change password</h3>

      {state === 'pending' && (
        <>
          <div className="mm-banner warn">⏳ Your request is waiting for admin approval.</div>
          <button className="btn mm-btn-light" disabled={busy} onClick={cancel}>Cancel request</button>
        </>
      )}

      {state === 'approved' && (
        <form onSubmit={change}>
          <div className="mm-banner ok">✅ Approved by the admin. You can set a new password until {new Date(req.expires_at).toLocaleString()}.</div>
          <div className="input-group"><label>New password</label>
            <input className="input" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></div>
          <div className="input-group"><label>Confirm new password</label>
            <input className="input" type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} /></div>
          <button className="btn mm-btn-pink" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Set new password'}</button>
        </form>
      )}

      {(state === undefined || state === 'denied' || state === 'used' || state === 'expired') && (
        <>
          {state === 'denied' && <div className="mm-banner bad">Your last request was declined.{req.admin_note ? ` Admin: ${req.admin_note}` : ''}</div>}
          {state === 'used' && <div className="mm-banner ok">Your password was changed successfully.</div>}
          {state === 'expired' && <div className="mm-banner warn">Your approval expired. Please request again.</div>}
          <p className="text-sm" style={{ marginBottom: 8 }}>Password changes need the admin's approval. Send a request and come back after it is approved.</p>
          <button className="btn mm-btn-light" disabled={busy} onClick={request}>📨 Request password change</button>
        </>
      )}
    </div>
  )
}
