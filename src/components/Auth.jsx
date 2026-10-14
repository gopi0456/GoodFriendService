import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [forgotPassword, setForgotPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!isLogin && !forgotPassword && !name.trim()) errs.name = 'Name is required'
    if (!isLogin && !forgotPassword && !phone.trim()) errs.phone = 'Phone is required'
    else if (!isLogin && !forgotPassword && !/^[0-9]{10}$/.test(phone.replace(/[^0-9]/g, ''))) errs.phone = 'Enter valid 10-digit phone'
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter valid email'
    if (!forgotPassword && !password) errs.password = 'Password is required'
    else if (!forgotPassword && password.length < 6) errs.password = 'Password must be at least 6 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    
    setLoading(true)
    try {
      if (forgotPassword) {
        // ✅ FIX: Use capacitor://localhost so the APK catches the link
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'capacitor://localhost'
        })
        if (error) throw error
        alert('✅ Password reset link sent! Check your email.')
        setForgotPassword(false)
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: 'capacitor://localhost' }
        })
        if (error) throw error
        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id, full_name: name, phone, email,
            is_admin: email === 'scgopi.gopi@gmail.com'
          })
          alert('✅ Registration successful! Check email to confirm.')
        }
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', padding: 28, borderRadius: 24, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 8, fontSize: 26, color: '#1f2937' }}>
          {forgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
        </h2>
        <form onSubmit={handleSubmit}>
          {!isLogin && !forgotPassword && (
            <>
              <div className="input-group">
                <input className={'input ' + (errors.name ? 'error' : '')} placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
                {errors.name && <div className="error-msg">{errors.name}</div>}
              </div>
              <div className="input-group">
                <input className={'input ' + (errors.phone ? 'error' : '')} placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
                {errors.phone && <div className="error-msg">{errors.phone}</div>}
              </div>
            </>
          )}
          <div className="input-group">
            <input className={'input ' + (errors.email ? 'error' : '')} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            {errors.email && <div className="error-msg">{errors.email}</div>}
          </div>
          {!forgotPassword && (
            <div className="input-group">
              <input className={'input ' + (errors.password ? 'error' : '')} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
              {errors.password && <div className="error-msg">{errors.password}</div>}
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{marginTop: 16}}>
            {loading ? 'Please wait...' : (forgotPassword ? ' Send Link' : (isLogin ? ' Login' : '✨ Register'))}
          </button>
        </form>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          {isLogin && !forgotPassword && (
            <button className="btn" style={{ background: 'none', color: '#ef4444', padding: '8px 0', fontWeight: 600 }} onClick={() => setForgotPassword(true)}>
              🔑 Forgot Password?
            </button>
          )}
          {forgotPassword && (
            <button className="btn" style={{ background: 'none', color: '#6366f1', padding: '8px 0' }} onClick={() => setForgotPassword(false)}>← Back to Login</button>
          )}
          {!forgotPassword && (
            <button className="btn" style={{ background: 'none', color: '#6366f1' }} onClick={() => { setIsLogin(!isLogin); setErrors({}) }}>
              {isLogin ? "Need an account? Register" : 'Have an account? Login'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
