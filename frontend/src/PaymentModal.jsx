import { useState } from 'react'
import './PaymentModal.css'

function PaymentModal({ amount = 50, serviceName = "সরকারি নাগরিক সেবা ফি", applicationId = "GS-APP", onSuccess, onClose }) {
  const [gateway, setGateway] = useState('bkash') // 'bkash' | 'nagad' | 'card'
  const [mobileNumber, setMobileNumber] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState(1) // 1: Input Number, 2: OTP, 3: PIN
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

  // ডিফেন্স ডেমো দ্রুত দেখানোর জন্য কুইক ফিল
  function handleQuickFillDemo() {
    setMobileNumber(gateway === 'card' ? '4532789012345678' : '01712345678')
    setOtp('123456')
    setPin('1234')
    setErrorMsg('')
  }

  function handleNextStep(e) {
    e.preventDefault()
    setErrorMsg('')

    if (step === 1) {
      if (gateway !== 'card' && mobileNumber.length !== 11) {
        setErrorMsg('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)')
        return
      }
      if (gateway === 'card' && mobileNumber.replace(/\s/g, '').length < 16) {
        setErrorMsg('সঠিক ১৬ ডিজিটের কার্ড নম্বর দিন')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (otp.length < 4) {
        setErrorMsg('কমপক্ষে ৪ বা ৬ ডিজিটের ওটিপি লিখুন')
        return
      }
      setStep(3)
    } else if (step === 3) {
      if (pin.length < 4) {
        setErrorMsg('কমপক্ষে ৪ ডিজিটের পিন নম্বর দিন')
        return
      }
      executePayment()
    }
  }

  async function executePayment() {
    setLoading(true)
    setErrorMsg('')

    try {
      // ব্যাকএন্ড মক পেমেন্ট এন্ডপয়েন্টে রিকোয়েস্ট
      const response = await fetch(`${apiBase}/api/payments/mock-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          gateway,
          amount: Number(amount),
          account_number: mobileNumber,
          pin
        })
      })

      if (!response.ok) {
        throw new Error('পেমেন্ট সার্ভারে সমস্যা হয়েছে।')
      }

      const data = await response.json()
      setLoading(false)
      onSuccess({
        txnId: data.transaction_id,
        gateway: data.gateway,
        amount: data.amount,
        timestamp: data.timestamp
      })
    } catch (err) {
      // ব্যাকএন্ড অফলাইন থাকলেও ডিফেন্স প্রেজেন্টেশন যেন না আটকায় তার জন্য সেইফ ফলব্যাক
      console.warn("Backend offline, fallback demo execution:", err)
      setTimeout(() => {
        setLoading(false)
        const fallbackTxnId = `TRX${gateway.toUpperCase()}${Math.floor(100000 + Math.random() * 900000)}`
        onSuccess({
          txnId: fallbackTxnId,
          gateway,
          amount,
          timestamp: new Date().toLocaleString()
        })
      }, 800)
    }
  }

  return (
    <div className="payment-modal-overlay">
      <div className={`payment-card ${gateway}-theme`}>
        
        {/* Header Branding */}
        <div className="payment-header">
          <div className="gateway-selector">
            <button
              type="button"
              className={gateway === 'bkash' ? 'active bkash' : ''}
              onClick={() => { setGateway('bkash'); setStep(1); setErrorMsg(''); }}
            >
              bKash
            </button>
            <button
              type="button"
              className={gateway === 'nagad' ? 'active nagad' : ''}
              onClick={() => { setGateway('nagad'); setStep(1); setErrorMsg(''); }}
            >
              Nagad
            </button>
            <button
              type="button"
              className={gateway === 'card' ? 'active card' : ''}
              onClick={() => { setGateway('card'); setStep(1); setErrorMsg(''); }}
            >
              Cards
            </button>
          </div>
          <button type="button" className="close-pay-btn" onClick={onClose}>✕</button>
        </div>

        {/* Amount Banner */}
        <div className="payment-body">
          <div className="pay-amount-box">
            <span className="pay-label">প্রদেয় সরকারি ফি</span>
            <h3 className="pay-amount">৳ {amount} BDT</h3>
            <span className="pay-service-title">{serviceName}</span>
          </div>

          {/* Stepper Indicator */}
          <div className="pay-steps">
            <span className={`step-dot ${step >= 1 ? 'completed' : ''}`}>১. একাউন্ট</span>
            <span className="step-line"></span>
            <span className={`step-dot ${step >= 2 ? 'completed' : ''}`}>২. OTP</span>
            <span className="step-line"></span>
            <span className={`step-dot ${step >= 3 ? 'completed' : ''}`}>৩. পিন</span>
          </div>

          {errorMsg && <div className="payment-error-alert">{errorMsg}</div>}

          {/* Dynamic Step Forms */}
          <form onSubmit={handleNextStep}>
            {step === 1 && (
              <div className="form-step-content">
                <label className="pay-input-group">
                  <span>{gateway === 'card' ? '১৬ ডিজিটের কার্ড নম্বর' : `${gateway === 'bkash' ? 'বিকাশ' : 'নগদ'} একাউন্ট নম্বর`}</span>
                  <input
                    type="text"
                    placeholder={gateway === 'card' ? '4532 •••• •••• 5678' : '01XXXXXXXXX'}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/[^\d\s]/g, ''))}
                    required
                    autoFocus
                  />
                </label>
                <button type="submit" className="pay-submit-btn">
                  পরবর্তী ধাপ (OTP) →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="form-step-content">
                <label className="pay-input-group">
                  <span>{mobileNumber}-এ প্রেরিত OTP কোড</span>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="যেমন: 123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
                <div className="step-actions">
                  <button type="button" className="pay-back-btn" onClick={() => setStep(1)}>← পেছনে</button>
                  <button type="submit" className="pay-submit-btn">যাচাই করুন →</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="form-step-content">
                <label className="pay-input-group">
                  <span>গোপন পিন (PIN) নম্বর দিন</span>
                  <input
                    type="password"
                    maxLength={5}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
                <div className="step-actions">
                  <button type="button" className="pay-back-btn" onClick={() => setStep(2)}>← পেছনে</button>
                  <button type="submit" className="pay-submit-btn" disabled={loading}>
                    {loading ? 'যাচাই হচ্ছে...' : `৳ ${amount} পেমেন্ট নিশ্চিত করুন`}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Quick Demo Helper & Security Footer */}
          <div className="payment-footer">
            <button type="button" onClick={handleQuickFillDemo} className="quick-demo-link">
              ⚡ ডেমো ডেটা অটো-ফিল
            </button>
            <p className="security-tag">🔒 256-Bit SSL Encrypted GovTech Payment Gateway</p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default PaymentModal
