import { useState } from 'react'
import './BirthApplication.css'

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const API_URL = 'http://127.0.0.1:8000'

function BirthApplication({ onBack }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [trackingId, setTrackingId] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    setLoading(true)
    setMessage('')
    setTrackingId('')

    const formData = new FormData(form)

    const payload = {
      child_name: String(formData.get('child_name')).trim(),
      birth_date: formData.get('birth_date'),
      gender: formData.get('gender'),
      father_name: String(formData.get('father_name')).trim(),
      mother_name: String(formData.get('mother_name')).trim(),
      birth_place: String(formData.get('birth_place')).trim(),
      address: String(formData.get('address')).trim(),
    }

    const documentFile = formData.get('document_file')
    const documentType = formData.get('document_type')

    const token = sessionStorage.getItem('gramsheba_token')

    if (!token) {
      setMessage('আবেদন করতে প্রথমে লগইন করুন।')
      setLoading(false)
      return
    }

    try {
      // ধাপ ১: জন্ম নিবন্ধন আবেদন তৈরি
      const response = await fetch(`${API_URL}/api/birth-applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('gramsheba_token')
          throw new Error('আপনার লগইন সেশনের মেয়াদ শেষ। আবার লগইন করুন।')
        }

        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'আবেদন জমা হয়নি। তথ্যগুলো পরীক্ষা করে আবার চেষ্টা করুন।'
        )
      }

      const generatedTrackingId = data.tracking_id
      setTrackingId(generatedTrackingId)

      // ধাপ ২: যদি ফাইল সিলেক্ট করা থাকে, তবে আপলোড করা
      if (documentFile && documentFile.size > 0) {
        const uploadData = new FormData()
        uploadData.append('file', documentFile)
        uploadData.append('document_type', documentType || 'nid_or_birth_proof')

        const docResponse = await fetch(
          `${API_URL}/api/birth-applications/${generatedTrackingId}/documents`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: uploadData,
          }
        )

        if (!docResponse.ok) {
          const docError = await docResponse.json()
          setMessage(
            `আবেদন সফলভাবে গৃহীত হয়েছে (Tracking ID: ${generatedTrackingId}), কিন্তু প্রমাণপত্র আপলোডে সমস্যা হয়েছে: ${
              docError.detail || 'ফাইল সেভ করা যায়নি।'
            }`
          )
          form.reset()
          return
        }
      }

      setMessage('আপনার আবেদন ও সংযুক্ত প্রমাণপত্র সফলভাবে জমা হয়েছে!')
      form.reset()
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? 'Backend-এর সঙ্গে সংযোগ হচ্ছে না। Server চালু আছে কি না দেখুন।'
          : error.message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="birth-page">
      <section className="birth-card">
        <button className="birth-back" type="button" onClick={onBack}>
          ← হোমপেজে ফিরে যান
        </button>

        <div className="birth-heading">
          <span>📄</span>
          <h1>জন্ম নিবন্ধনের আবেদন</h1>
          <p>নিচের তথ্যগুলো সঠিকভাবে পূরণ করুন এবং প্রয়োজনীয় প্রমাণপত্র সংযুক্ত করুন।</p>
        </div>

        {message && (
          <div
            className={`birth-message ${trackingId ? 'birth-success' : ''}`}
            role="status"
            aria-live="polite"
          >
            <p>{message}</p>
            {trackingId && (
              <>
                <strong>আপনার Tracking ID</strong>
                <p className="tracking-id">{trackingId}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(trackingId)}
                >
                  Tracking ID কপি করুন
                </button>
              </>
            )}
          </div>
        )}

        <form className="birth-form" onSubmit={handleSubmit}>
          <label>
            শিশুর পূর্ণ নাম
            <input name="child_name" required minLength={2} maxLength={150} />
          </label>

          <label>
            জন্মতারিখ
            <input
              name="birth_date"
              type="date"
              max={getTodayDate()}
              required
            />
          </label>

          <label>
            লিঙ্গ
            <select name="gender" defaultValue="" required>
              <option value="" disabled>নির্বাচন করুন</option>
              <option value="male">পুরুষ</option>
              <option value="female">নারী</option>
              <option value="other">অন্যান্য</option>
            </select>
          </label>

          <label>
            পিতার পূর্ণ নাম
            <input name="father_name" required minLength={2} maxLength={150} />
          </label>

          <label>
            মাতার পূর্ণ নাম
            <input name="mother_name" required minLength={2} maxLength={150} />
          </label>

          <label>
            জন্মস্থান
            <input
              name="birth_place"
              placeholder="হাসপাতাল, ক্লিনিক বা জন্মস্থানের নাম"
              required
              minLength={2}
              maxLength={255}
            />
          </label>

          <label>
            বর্তমান ঠিকানা
            <textarea
              name="address"
              placeholder="গ্রাম, ইউনিয়ন, উপজেলা ও জেলা"
              required
              minLength={5}
              maxLength={2000}
              rows={3}
            />
          </label>

          {/* ডকুমেন্ট আপলোড সেকশন (FR-08) */}
          <div className="form-divider" style={{ margin: '1.5rem 0', borderTop: '1px dashed #cbd5e1' }} />
          
          <h3 style={{ fontSize: '1.05rem', color: '#166534', margin: '0 0 0.8rem 0' }}>
            📎 প্রয়োজনীয় প্রমাণপত্র সংযুক্তি (ঐচ্ছিক)
          </h3>

          <label>
            ডকুমেন্টের ধরন
            <select name="document_type" defaultValue="nid_card">
              <option value="nid_card">পিতা/মাতার জাতীয় পরিচয়পত্র (NID)</option>
              <option value="hospital_slip">হাসপাতালের জন্ম বা ছাড়পত্র রসিদ</option>
              <option value="vaccine_card">টিকাদান কার্ড</option>
              <option value="other">অন্যান্য প্রমাণপত্র</option>
            </select>
          </label>

          <label>
            ফাইল নির্বাচন করুন (PDF, JPG, বা PNG — সর্বোচ্চ ৫ MB)
            <input
              name="document_file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </label>

          <button className="birth-submit" type="submit" disabled={loading}>
            {loading ? 'জমা হচ্ছে...' : 'আবেদন ও প্রমাণপত্র জমা দিন →'}
          </button>
        </form>

        <p className="birth-note">
          এটি GramSheba-এর প্রোটোটাইপ আবেদন ব্যবস্থা; সরকারি জন্ম নিবন্ধন
          কর্তৃপক্ষের কাছে সরাসরি আবেদন জমা হয় না।
        </p>
      </section>
    </main>
  )
}

export default BirthApplication
