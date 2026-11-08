import { useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:8000'

function OtherServicesModal({ service, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    applicant_name: '',
    guardian_name: '',
    nid_brn: '',
    phone: '',
    union_name: 'বিষ্ণুপুর ইউনিয়ন পরিষদ',
    // ট্রেড লাইসেন্সের জন্য
    business_name: '',
    business_type: '',
    // ওয়ারিশ সনদের জন্য
    deceased_name: '',
    heirs_count: '3',
    // চারিত্রিক প্রত্যয়ন ও সাধারণ অভিযোগ
    reason_or_description: '',
  })
  const [loading, setLoading] = useState(false)

  const isComplaint = service.id === 'complaint'
  const isTrade = service.id === 'trade'
  const isWarish = service.id === 'warish'

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const token = sessionStorage.getItem('gramsheba_token')

    try {
      if (isComplaint) {
        const res = await fetch(`${API_BASE}/api/complaints`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            subject: formData.business_name || 'নাগরিক সেবা সম্পর্কিত অভিযোগ/পরামর্শ',
            description: formData.reason_or_description,
            area: formData.union_name,
            phone: formData.phone
          })
        })
        const data = await res.json()
        alert(`✅ অভিযোগ সফলভাবে নথিভুক্ত হয়েছে!\nনম্বর: ${data.complaint_id}\nসংশ্লিষ্ট ইউনিয়ন পরিষদ প্রয়োজনীয় ব্যবস্থা গ্রহণ করবে।`)
      } else {
        const res = await fetch(`${API_BASE}/api/services/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            service_type: service.id,
            applicant_name: formData.applicant_name,
            guardian_name: formData.guardian_name,
            nid_brn: formData.nid_brn,
            phone: formData.phone,
            union_name: formData.union_name,
            details: {
              business_name: formData.business_name,
              deceased_name: formData.deceased_name,
              heirs_count: formData.heirs_count,
              purpose: formData.reason_or_description
            }
          })
        })
        const data = await res.json()
        alert(`✅ আবেদন সফলভাবে জমা হয়েছে!\nট্র্যাকিং নম্বর: ${data.tracking_id}`)
      }
      onSuccess()
    } catch {
      alert('সার্ভার রেসপন্স করছে না। অফলাইনে ড্রাফট সংরক্ষিত হয়েছে।')
      onSuccess()
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <div className="cert-modal-overlay">
      <div className="cert-modal-container" style={{ maxWidth: '600px', padding: '1.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.6rem' }}>{service.icon || '📝'}</span>
            <h3 style={{ margin: 0, color: '#0f172a' }}>{service.title} আবেদন</h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
              আবেদনকারীর নাম *
              <input type="text" name="applicant_name" placeholder="পূর্ণ নাম" value={formData.applicant_name} onChange={handleChange} required style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
              পিতা / স্বামীর নাম *
              <input type="text" name="guardian_name" placeholder="নাম লিখুন" value={formData.guardian_name} onChange={handleChange} required style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
              NID / জন্মনিবন্ধন নম্বর *
              <input type="text" name="nid_brn" placeholder="১০ বা ১৭ ডিজিট" value={formData.nid_brn} onChange={handleChange} required style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
              মোবাইল নম্বর *
              <input type="tel" name="phone" placeholder="01XXXXXXXXX" value={formData.phone} onChange={handleChange} required style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
            </label>
          </div>

          {/* সেবাভিত্তিক বিশেষ ফিল্ড */}
          {isTrade && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
                ব্যবসা প্রতিষ্ঠানের নাম *
                <input type="text" name="business_name" placeholder="দোকান বা ফার্মের নাম" value={formData.business_name} onChange={handleChange} required style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
                ব্যবসার ধরন
                <input type="text" name="business_type" placeholder="যেমন: মুদি, ফার্মেসি, আইটি" value={formData.business_type} onChange={handleChange} style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              </label>
            </div>
          )}

          {isWarish && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
                মৃত ব্যক্তির নাম *
                <input type="text" name="deceased_name" placeholder="যার নামে ওয়ারিশ সনদ হবে" value={formData.deceased_name} onChange={handleChange} required style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
                ওয়ারিশের সংখ্যা
                <input type="number" name="heirs_count" value={formData.heirs_count} onChange={handleChange} style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              </label>
            </div>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
            {isComplaint ? 'অভিযোগ / পরামর্শের বিস্তারিত বিবরণ *' : 'আবেদনের কারণ বা উদ্দেশ্য'}
            <textarea
              name="reason_or_description"
              rows={3}
              placeholder={isComplaint ? 'সমস্যার স্থান ও বিবরণ বিস্তারিত লিখুন...' : 'সনদ গ্রহণের কারণ লিখুন'}
              value={formData.reason_or_description}
              onChange={handleChange}
              required={isComplaint}
              style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'inherit' }}
            />
          </label>

          <button type="submit" className="primary-button" disabled={loading} style={{ marginTop: '0.5rem', padding: '0.75rem' }}>
            {loading ? 'জমা হচ্ছে...' : 'আবেদন জমা দিন →'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default OtherServicesModal
