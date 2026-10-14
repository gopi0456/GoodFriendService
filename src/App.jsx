import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { App as CapApp } from '@capacitor/app'
import './App.css'
import Auth from './components/Auth'
import Home from './components/Home'

function App() {
  const [session, setSession] = useState(null)
  const [resetMode, setResetMode] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setResetMode(true)
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    CapApp.addListener('appUrlOpen', async ({ url }) => {
      console.log('Deep link opened:', url)
      try {
        const urlObj = new URL(url)
        
        // ✅ Check Query Params (?type=recovery&token=...)
        let type = urlObj.searchParams.get('type')
        let token = urlObj.searchParams.get('token')
        let accessToken = urlObj.searchParams.get('access_token')
        let refreshToken = urlObj.searchParams.get('refresh_token')

        // ✅ If not found, check Hash Params (#access_token=...&type=recovery)
        if (!type && urlObj.hash) {
          const hashParams = new URLSearchParams(urlObj.hash.substring(1))
          type = hashParams.get('type')
          token = hashParams.get('token')
          accessToken = hashParams.get('access_token')
          refreshToken = hashParams.get('refresh_token')
        }

        if (type === 'recovery') {
          if (token) {
            console.log('Verifying OTP token...')
            const { error } = await supabase.auth.verifyOtp({ token, type: 'recovery' })
            if (error) alert('Link expired or invalid. Please request a new one.')
            else setResetMode(true)
          } else if (accessToken && refreshToken) {
            console.log('Setting session from hash...')
            const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            if (error) alert('Session error. Please try again.')
            else setResetMode(true)
          } else {
            alert('Invalid reset link format.')
          }
        }
      } catch (e) { console.error('URL parsing error:', e) }
    })
    return () => CapApp.removeAllListeners()
  }, [])

  if (resetMode && session) {
    return <ResetPasswordForm onComplete={() => setResetMode(false)} />
  }

  return (
    <div className="app-container">
      {session ? <Home session={session} /> : <Auth />}
    </div>
  )
}

function ResetPasswordForm({ onComplete }) {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) return alert('Password must be at least 6 characters')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) alert('Error: ' + error.message)
    else {
      alert('✅ Password updated! Please login with your new password.')
      await supabase.auth.signOut()
      onComplete()
    }
    setLoading(false)
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', padding: 28, borderRadius: 24, width: '100%', maxWidth: 420 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>🔑 Set New Password</h2>
        <form onSubmit={handleUpdate}>
          <input className="input" type="password" placeholder="New Password (min 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={loading} style={{marginTop: 16}}>
            {loading ? 'Updating...' : '💾 Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
export default App
