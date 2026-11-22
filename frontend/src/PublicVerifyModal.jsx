import { useState, useEffect } from 'react'
import './App.css'
import API_BASE from './api'

function PublicVerifyModal({ initialTrackingId = '', initialHash = '', onClose }) {
  const [trackingId, setTrackingId] = useState(initialTrackingId)
  const [hashInput, setHashInput] = useState(initialHash)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialTrackingId) {
      executeVerification(initialTrackingId, initialHash)
    }
  }, [initialTrackingId, initialHash])

  async function executeVerification(searchId, hashVal = '') {
    const id = (searchId || '').trim().toUpperCase()
    const cleanHash = (hashVal || '').trim().toUpperCase()
    if (!id) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const qs = cleanHash ? `?h=${encodeURIComponent(cleanHash)}` : ''
      const res = await fetch(`${API_BASE}/api/public/verify/${encodeURIComponent(id)}${qs}`)
      if (res.ok) {
        const data = await res.json()
        setResult(data)
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.detail || 'প্রদত্ত ট্র্যাকিং নম্বরে কোনো সরকারি সনদ পাওয়া যায়নি বা সনদটি ভুয়া।')
      }
    } catch {
      setError('ভেরিফিকেশন সার্ভারের সাথে সংযোগ করা যায়নি। একটু পর আবার চেষ্টা করুন।')
    } finally {
      setLoading(false)
    }
  }

  function handleVerify(e) {
    e.preventDefault()
    executeVerification(trackingId, hashInput)
  }

  const isApproved = result && result.valid === true
  const isTampered = result && result.tampered === true

  return (
    <div className="cert-modal-overlay">
      <div className="cert-modal-container" style={{ maxWidth: '580px', padding: '1.8rem', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }}>🛡️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.22rem', color: '#0f172a', fontWeight: 800 }}>
                অনলাইন ডিজিটাল সনদ যাচাই (SHA-256)
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                গণপ্রজাতন্ত্রী বাংলাদেশ সরকার — গ্রামসেবা টেম্পার-প্রুফ সুরক্ষা পোর্টাল
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '1rem', cursor: 'pointer', color: '#475569' }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: '0 0 0.9rem', fontSize: '0.86rem', color: '#475569' }}>
          সনদপত্রে মুদ্রিত <strong>ট্র্যাকিং নম্বর</strong> (এবং চাইলে <strong>SHA-256 ডিজিটাল সিল কোড</strong>) দিয়ে যাচাই করুন:
        </p>

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="ট্র্যাকিং নম্বর (যেমন: GS-BIRTH-... বা GS-CITIZEN-...)"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              style={{ flex: 1, padding: '0.72rem 0.95rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', fontFamily: 'monospace', fontWeight: 600 }}
              required
            />
            <button
              type="submit"
              className="primary-button"
              disabled={loading}
              style={{ padding: '0.72rem 1.35rem', whiteSpace: 'nowrap', borderRadius: '10px', fontWeight: 700 }}
            >
              {loading ? 'যাচাই হচ্ছে...' : 'যাচাই করুন'}
            </button>
          </div>

          <input
            type="text"
            placeholder="ঐচ্ছিক: SHA-256 ডিজিটাল সিল কোড (QR স্ক্যানে অটো বসে)"
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.82rem', fontFamily: 'monospace', background: '#f8fafc', boxSizing: 'border-box' }}
          />
        </form>

        {error && (
          <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '0.85rem 1rem', borderRadius: '10px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div
            style={{
              background: isTampered ? '#fef2f2' : isApproved ? '#f0fdf4' : '#fffbeb',
              border: `1.5px solid ${isTampered ? '#f87171' : isApproved ? '#86efac' : '#fde68a'}`,
              borderRadius: '14px',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${isTampered ? '#fecaca' : isApproved ? '#bbf7d0' : '#fde68a'}`, paddingBottom: '0.75rem', marginBottom: '0.85rem', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isTampered ? '#b91c1c' : isApproved ? '#15803d' : '#b45309', fontWeight: 800, fontSize: '0.98rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{isTampered ? '🚨' : isApproved ? '✓' : '⏳'}</span>
                <span>
                  {isTampered
                    ? 'জাল বা পরিবর্তিত সনদ শনাক্ত হয়েছে!'
                    : isApproved
                    ? 'সনদটি বৈধ ও সরকার কর্তৃক অনুমোদিত'
                    : (result.message || 'আবেদনটি এখনো চূড়ান্ত অনুমোদিত নয়')}
                </span>
              </div>
              <span style={{ background: isTampered ? '#fee2e2' : isApproved ? '#dcfce7' : '#fef3c7', color: isTampered ? '#991b1b' : isApproved ? '#166534' : '#92400e', padding: '3px 10px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 700 }}>
                {isTampered ? 'TAMPERED / INVALID' : result.hash_verified ? 'SHA-256 Seal Matched' : isApproved ? 'Verified Authentic' : `Status: ${result.status}`}
              </span>
            </div>

            {isTampered && (
              <p style={{ margin: '0 0 0.8rem', fontSize: '0.84rem', color: '#991b1b', fontWeight: 600 }}>
                {result.message}
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.88rem', color: '#334155' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>সনদের ধরন:</span>
                <strong>{result.type}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>নাগরিকের নাম:</span>
                <strong style={{ color: '#0f172a' }}>{result.beneficiary}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>ডিজিটাল ট্র্যাকিং কোড:</span>
                <code style={{ background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#047857' }}>
                  {result.tracking_id}
                </code>
              </div>
              {result.verification_hash && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>SHA-256 ক্রিপ্টোগ্রাফিক সিল:</span>
                  <code style={{ background: '#ffffff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #86efac', fontWeight: 700, color: '#166534', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                    {result.verification_hash}
                  </code>
                </div>
              )}
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>ইস্যুকৃত প্রতিষ্ঠান:</span>
                <strong>{result.union}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>স্ট্যাটাস / তারিখ:</span>
                <strong>{result.issue_date || result.status}</strong>
              </div>
            </div>

            {isApproved && (
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#15803d' }}>
                <span>🔒 কেন্দ্রীয় ডাটাবেসে SHA-256 সুরক্ষিত</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{ background: 'none', border: 'none', color: '#047857', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  প্রিন্ট ভেরিফিকেশন স্লিপ
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PublicVerifyModal
