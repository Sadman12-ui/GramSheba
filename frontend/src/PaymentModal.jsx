import { useState } from 'react'
import './PaymentModal.css'

function PaymentModal({ amount, serviceName, onSuccess, onClose }) {
  const [gateway, setGateway] = useState('bkash') // 'bkash' | 'nagad' | 'card'
  const [mobileNumber, setMobileNumber] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState(1) // 1: Input, 2: OTP, 3: Success
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  function handleProceed(e) {
    e.preventDefault()
    if (step === 1) {
      if (mobileNumber.length < 11) {
        alert('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন!')
        return
      }
      setStep(2)
    } else if (step === 2) {
      setLoading(true)
      setTimeout(() => {
        setLoading(false)
        const txnId = `TRX${gateway.toUpperCase()}${Math.floor(100000 + Math.random() * 900000)}`
        onSuccess({ txnId, gateway, amount })
      }, 1000)
    }
  }

  return (
    <div className="payment-modal-overlay">
      <div className={`payment-card ${gateway}-theme`}>
        <div className="payment-header">
          <div className="gateway-selector">
            <button
              type="button"
              className={gateway === 'bkash' ? 'active bkash' : ''}
              onClick={() => { setGateway('bkash'); setStep(1); }}
            >
              bKash
            </button>
            <button
              type="button"
              className={gateway === 'nagad' ? 'active nagad' : ''}
              onClick={() => { setGateway('nagad'); setStep(1); }}
            >
              Nagad
            </button>
            <button
              type="button"
              className={gateway === 'card' ? 'active card' : ''}
              onClick={() => { setGateway('card'); setStep(1); }}
            >
              Card
            </button>
          </div>
          <button type="button" className="close-pay-btn" onClick={onClose}>✕</button>
        </div>

        <div className="payment-body">
          <div className="pay-amount-box">
            <span>প্রদেয় সরকারি ফি</span>
            <h3>৳ {amount} BDT</h3>
            <small>{serviceName}</small>
          </div>

          <form onSubmit={handleProceed}>
            {step === 1 && (
              <>
                <label>
                  {gateway === 'card' ? 'কার্ড নম্বর' : `${gateway === 'bkash' ? 'বিকাশ' : 'নগদ'} একাউন্ট নম্বর`}
                  <input
                    type="text"
                    placeholder="017XXXXXXXX"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" className="pay-submit-btn">পরবর্তী ধাপ (OTP) →</button>
              </>
            )}

            {step === 2 && (
              <>
                <label>
                  মোবাইলে প্রেরিত OTP লিখুন
                  <input
                    type="text"
                    placeholder="যেমন: 123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </label>
                <label>
                  পিন নম্বর দিন
                  <input
                    type="password"
                    placeholder="••••"
                    maxLength={5}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" className="pay-submit-btn" disabled={loading}>
                  {loading ? 'পেমেন্ট সম্পন্ন হচ্ছে...' : 'পেমেন্ট নিশ্চিত করুন ৳'}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default PaymentModal
