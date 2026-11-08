import { useState } from 'react'
import './Auth.css'

const API_URL = 'http://127.0.0.1:8000'

function Auth({ onBack, onLogin }) {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')

  const isLogin = mode === 'login'

  function changeMode(nextMode) {
    setMode(nextMode)
    setMessage('')
    setShowPassword(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const form = event.currentTarget
    const formData = new FormData(form)

    const payload = {
      email: String(formData.get('email')).trim().toLowerCase(),
      password: String(formData.get('password')),
    }

    if (!isLogin) {
      payload.full_name = String(formData.get('full_name')).trim()
      payload.phone = String(formData.get('phone')).trim()
      payload.area = String(formData.get('area')).trim()
      payload.union_code = String(formData.get('union_code')).trim().toUpperCase()
    }

    try {
      const response = await fetch(
        `${API_URL}/api/${isLogin ? 'login' : 'register'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'তথ্য যাচাই করতে সমস্যা হয়েছে। ইনপুটগুলো পরীক্ষা করুন।'
        )
      }

      if (isLogin) {
        sessionStorage.setItem('gramsheba_token', data.access_token)
        sessionStorage.setItem('gramsheba_user', JSON.stringify(data.user))
        onLogin(data.user)
        setMessageType('success')
        setMessage(`স্বাগতম, ${data.user.full_name}! লগইন সফল হয়েছে।`)
      } else {
        setMessageType('success')
        setMessage('নিবন্ধন সফল হয়েছে! এখন আপনার ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।')
        changeMode('login')
        form.reset()
      }
    } catch (error) {
      setMessageType('error')
      if (error instanceof TypeError) {
        setMessage(
          'Backend-এর সঙ্গে সংযোগ হচ্ছে না। Backend server চালু আছে কি না পরীক্ষা করুন।'
        )
      } else {
        setMessage(error.message || 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <button className="auth-back" type="button" onClick={onBack}>
          ← হোমপেজে ফিরে যান
        </button>

        <div className="auth-logo">🌿</div>

        <h1>{isLogin ? 'স্বাগতম!' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}</h1>

        <p className="auth-subtitle">
          {isLogin
            ? 'আপনার GramSheba অ্যাকাউন্টে প্রবেশ করুন'
            : 'সহজে স্থানীয় সেবা পেতে নিবন্ধন করুন'}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={isLogin ? 'active' : ''}
            onClick={() => changeMode('login')}
          >
            লগইন
          </button>

          <button
            type="button"
            className={!isLogin ? 'active' : ''}
            onClick={() => changeMode('register')}
          >
            নিবন্ধন
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <label>
              পূর্ণ নাম
              <input
                name="full_name"
                type="text"
                placeholder="আপনার সম্পূর্ণ নাম"
                minLength={2}
                maxLength={120}
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            ইমেইল ঠিকানা
            <input
              name="email"
              type="email"
              placeholder="example@email.com"
              autoComplete="email"
              required
            />
          </label>

          {!isLogin && (
            <label>
              মোবাইল নম্বর
              <input
                name="phone"
                type="tel"
                placeholder="আপনার মোবাইল নম্বর (যেমন: 017xxxxxxxx)"
                minLength={7}
                maxLength={20}
                autoComplete="tel"
                required
              />
            </label>
          )}

          <label>
            পাসওয়ার্ড
            <div className="password-field">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="কমপক্ষে ৮ অক্ষর"
                minLength={8}
                maxLength={128}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'লুকান' : 'দেখুন'}
              </button>
            </div>
          </label>

          {!isLogin && (
            <>
              <label>
                ইউনিয়ন বা এলাকার নাম
                <input
                  name="area"
                  type="text"
                  placeholder="যেমন: বিষ্ণুপুর, ওয়ার্ড ১"
                  minLength={2}
                  maxLength={150}
                  required
                />
              </label>

              <label>
                ইউনিয়ন কোড
                <input
                  name="union_code"
                  type="text"
                  placeholder="যেমন: BISHNUPUR_01 বা HQ_CENTRAL"
                  required
                />
              </label>
            </>
          )}

          {isLogin && (
            <div className="auth-options">
              <label className="remember-option">
                <input type="checkbox" />
                আমাকে মনে রাখুন
              </label>

              <button
                type="button"
                className="text-button"
                onClick={() =>
                  alert('পাসওয়ার্ড পুনরুদ্ধার সুবিধাটি শীঘ্রই যুক্ত হবে।')
                }
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>
          )}

          {message && (
            <div className={`auth-alert ${messageType === 'success' ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? 'অপেক্ষা করুন...'
              : isLogin
                ? 'লগইন করুন →'
                : 'অ্যাকাউন্ট তৈরি করুন →'}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? 'নতুন ব্যবহারকারী?' : 'আগে থেকেই অ্যাকাউন্ট আছে?'}

          <button
            type="button"
            onClick={() => changeMode(isLogin ? 'register' : 'login')}
          >
            {isLogin ? ' নিবন্ধন করুন' : ' লগইন করুন'}
          </button>
        </p>

        <p className="auth-security">
          🔒 আপনার তথ্যের নিরাপত্তা আমাদের কাছে অগ্রাধিকারপ্রাপ্ত।
        </p>
      </section>
    </main>
  )
}

export default Auth
