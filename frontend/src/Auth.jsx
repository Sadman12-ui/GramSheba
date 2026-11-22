import { useState, useEffect } from 'react'
import './Auth.css'
import API_BASE from './api'

function Auth({ onBack, onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unions, setUnions] = useState([])

  // লগইন স্টেট
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // নাগরিক নিবন্ধন স্টেট
  const [regData, setRegData] = useState({
    full_name: '',
    email: '',
    phone: '',
    area: '',
    password: '',
    union_code: 'RAMPUR01',
  })

  // ব্যাকএন্ড থেকে নিবন্ধিত ইউনিয়নের তালিকা লোড করা
  useEffect(() => {
    fetch(`${API_BASE}/api/public/unions`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setUnions(data)
          setRegData((prev) => ({ ...prev, union_code: data[0].code }))
        }
      })
      .catch(() => {})
  }, [])

  function handleRegChange(e) {
    setRegData({ ...regData, [e.target.name]: e.target.value })
    setError('')
  }

  async function handleLoginSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।')
      }

      sessionStorage.setItem('gramsheba_token', data.access_token)
      sessionStorage.setItem('gramsheba_user', JSON.stringify(data.user))
      onLogin(data.user)
    } catch (err) {
      setError(err.message || 'লগইন করতে সমস্যা হচ্ছে।')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault()
    setError('')

    const strongPassRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[!-~]{8,}$/
    if (!strongPassRegex.test(regData.password)) {
      setError('পাসওয়ার্ড অবশ্যই ইংরেজিতে কমপক্ষে ৮ অক্ষরের হতে হবে এবং বড় হাতের অক্ষর (A-Z), ছোট হাতের অক্ষর (a-z), সংখ্যা (0-9) ও স্পেশাল চিহ্ন (@#$!) থাকতে হবে। যেমন: 12Sa@hbf')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: regData.full_name.trim(),
          email: regData.email.trim().toLowerCase(),
          phone: regData.phone.trim(),
          area: regData.area.trim(),
          password: regData.password,
          union_code: regData.union_code.trim().toUpperCase(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'নিবন্ধন সম্পন্ন করা যায়নি। তথ্যগুলো পুনরায় যাচাই করুন।'
        )
      }

      alert('অভিনন্দন! নাগরিক অ্যাকাউন্ট নিবন্ধন সফল হয়েছে। এখন লগইন করুন।')
      setIsLogin(true)
      setLoginEmail(regData.email.trim().toLowerCase())
    } catch (err) {
      setError(err.message || 'সার্ভার সংযোগ বিচ্ছিন্ন।')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay">
      <div className="auth-box" style={{ maxWidth: '480px', padding: 0, overflow: 'hidden', position: 'relative' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '12px',
            right: '16px',
            background: 'rgba(0,0,0,0.15)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            fontSize: '1rem',
            cursor: 'pointer',
            color: '#fff',
            zIndex: 10,
          }}
        >
          ✕
        </button>

        {/* হেডার ব্যানার */}
        <div style={{ background: 'linear-gradient(180deg, #2ea879 0%, #208a61 100%)', padding: '1.8rem 1.5rem 1.4rem', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '4px' }}>🌿</div>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.55rem', fontWeight: 800 }}>
            {isLogin ? 'গ্রামসেবা পোর্টাল লগইন' : 'নতুন নাগরিক অ্যাকাউন্ট নিবন্ধন'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#d1fae5' }}>
            {isLogin
              ? 'নাগরিক, ইউনিয়ন অ্যাডমিন ও সুপার অ্যাডমিন লগইন'
              : 'ডিজিটাল নাগরিক সেবা পেতে নিচের তথ্যগুলো পূরণ করুন'}
          </p>
        </div>

        {/* লগইন / নিবন্ধন ট্যাব */}
        <div style={{ display: 'flex', padding: '1rem 1.5rem 0', background: '#fff' }}>
          <div style={{ display: 'flex', width: '100%', background: '#f1f5f9', borderRadius: '12px', padding: '4px' }}>
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              style={{
                flex: 1,
                padding: '0.65rem',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                background: isLogin ? '#fff' : 'transparent',
                color: isLogin ? '#1b734e' : '#64748b',
                boxShadow: isLogin ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              লগইন
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              style={{
                flex: 1,
                padding: '0.65rem',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                background: !isLogin ? '#fff' : 'transparent',
                color: !isLogin ? '#1b734e' : '#64748b',
                boxShadow: !isLogin ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              নাগরিক নিবন্ধন
            </button>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  ই-মেইল ঠিকানা
                </label>
                <input
                  type="email"
                  placeholder="citizen@gramsheba.gov.bd"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  পাসওয়ার্ড
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', outline: 'none' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.82rem' }}
                  >
                    {showPassword ? 'লুকান' : 'দেখুন'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ background: '#1b734e', color: '#fff', border: 'none', padding: '0.85rem', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: '0.4rem' }}
              >
                {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  পূর্ণ নাম *
                </label>
                <input
                  type="text"
                  name="full_name"
                  placeholder="আপনার পূর্ণ নাম লিখুন"
                  value={regData.full_name}
                  onChange={handleRegChange}
                  style={{ width: '100%', padding: '0.68rem 0.9rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.92rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    ই-মেইল *
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="name@example.com"
                    value={regData.email}
                    onChange={handleRegChange}
                    style={{ width: '100%', padding: '0.68rem 0.9rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.92rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    মোবাইল নম্বর *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="01XXXXXXXXX"
                    value={regData.phone}
                    onChange={handleRegChange}
                    style={{ width: '100%', padding: '0.68rem 0.9rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.92rem' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  গ্রাম ও ওয়ার্ড নং (ঠিকানা) *
                </label>
                <input
                  type="text"
                  name="area"
                  placeholder="যেমন: গ্রাম: রামপুর, ওয়ার্ড নং ০৪"
                  value={regData.area}
                  onChange={handleRegChange}
                  style={{ width: '100%', padding: '0.68rem 0.9rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.92rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  পাসওয়ার্ড (ইংরেজিতে কমপক্ষে ৮ অক্ষর) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="যেমন: 12Sa@hbf"
                    minLength={8}
                    value={regData.password}
                    onChange={handleRegChange}
                    style={{ width: '100%', padding: '0.68rem 2.8rem 0.68rem 0.9rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.92rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center' }}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
                  ইংরেজিতে বড় হাতের (A-Z), ছোট হাতের (a-z), সংখ্যা (0-9) ও চিহ্ন (@#$!) থাকতে হবে (যেমন: 12Sa@hbf)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ background: '#1b734e', color: '#fff', border: 'none', padding: '0.8rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.98rem', cursor: 'pointer', marginTop: '0.3rem' }}
              >
                {loading ? 'নিবন্ধন হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন ✓'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Auth
