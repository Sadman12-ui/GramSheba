import { useState, useEffect, useRef } from 'react'
import './BirthApplication.css'
import API_BASE from './api'
import { bangladeshGeoData } from './bangladeshData'
import VoiceAssistBar from './components/VoiceAssistBar'

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const DRAFT_KEY = 'gramsheba_birth_draft'

const TEXT = {
  bn: {
    back: '← হোমপেজে ফিরে যান',
    title: 'জন্ম নিবন্ধনের আবেদন',
    subtitle: 'নিচের তথ্যগুলো সঠিকভাবে পূরণ করুন এবং প্রয়োজনীয় প্রমাণপত্র সংযুক্ত করুন।',
    draftRestored: '💾 আপনার পূর্বের অসম্পূর্ণ খসড়া (Offline Draft) স্বয়ংক্রিয়ভাবে উদ্ধার করা হয়েছে।',
    providerTitle: '🏛️ সেবা প্রদানকারী ইউনিয়ন / পৌরসভা',
    division: 'বিভাগ',
    district: 'জেলা',
    upazila: 'উপজেলা',
    union: 'ইউনিয়ন / পৌরসভা',
    customUnion: 'আপনার ইউনিয়ন পরিষদের নাম লিখুন',
    ocrTitle: '⚡ স্মার্ট AI OCR স্ক্যানার (স্বয়ংক্রিয় ফর্ম পূরণ)',
    ocrSub: 'NID, জন্ম সনদ বা হাসপাতালের ছাড়পত্র আপলোড করলে নাম, পিতা-মাতার নাম, জন্মতারিখ ও ঠিকানা অটো-ফিল হবে।',
    ocrBtn: '📷 ডকুমেন্ট স্ক্যান করুন',
    ocrScanning: 'স্ক্যান হচ্ছে...',
    childName: 'শিশুর পূর্ণ নাম',
    birthDate: 'জন্মতারিখ',
    gender: 'লিঙ্গ',
    selectGender: 'নির্বাচন করুন',
    male: 'পুরুষ',
    female: 'নারী',
    other: 'অন্যান্য',
    fatherName: 'পিতার পূর্ণ নাম',
    motherName: 'মাতার পূর্ণ নাম',
    birthPlace: 'জন্মস্থান',
    birthPlacePh: 'হাসপাতাল, ক্লিনিক বা জন্মস্থানের নাম',
    address: 'গ্রাম / মহল্লা / ওয়ার্ড ও বিস্তারিত ঠিকানা',
    addressPh: 'যেমন: গ্রাম: বিষ্ণুপুর, ওয়ার্ড নং: ০৪, ডাকঘর: বিষ্ণুপুর',
    docHeading: '📎 প্রয়োজনীয় প্রমাণপত্র সংযুক্তি (ঐচ্ছিক)',
    docType: 'ডকুমেন্টের ধরন',
    docFile: 'ফাইল নির্বাচন করুন (PDF, JPG, বা PNG — সর্বোচ্চ ৫ MB)',
    submit: 'আবেদন ও প্রমাণপত্র জমা দিন →',
    submitting: 'জমা হচ্ছে...',
    copyId: 'Tracking ID কপি করুন',
    note: 'এটি GramSheba-এর ডিজিটাল ইউনিয়ন আবেদন ব্যবস্থা; অনুমোদনের পর অনলাইন থেকেই সনদ ডাউনলোড করা যাবে।',
  },
  en: {
    back: '← Back to Home',
    title: 'Birth Registration Application',
    subtitle: 'Fill in the details accurately and attach supporting documents.',
    draftRestored: '💾 Your previously saved offline draft has been automatically restored.',
    providerTitle: '🏛️ Service Providing Union / Municipality',
    division: 'Division',
    district: 'District',
    upazila: 'Upazila',
    union: 'Union / Municipality',
    customUnion: 'Enter your Union Parishad name',
    ocrTitle: '⚡ Smart AI OCR Scanner (Auto-fill Form)',
    ocrSub: 'Upload NID, hospital slip, or certificate to auto-fill applicant and parent details.',
    ocrBtn: '📷 Scan Document',
    ocrScanning: 'Scanning...',
    childName: 'Child Full Name',
    birthDate: 'Date of Birth',
    gender: 'Gender',
    selectGender: 'Select Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    fatherName: "Father's Full Name",
    motherName: "Mother's Full Name",
    birthPlace: 'Place of Birth',
    birthPlacePh: 'Hospital, clinic, or birth location',
    address: 'Village / Ward & Detailed Address',
    addressPh: 'e.g. Village, Ward No, Post Office',
    docHeading: '📎 Supporting Document Attachment (Optional)',
    docType: 'Document Type',
    docFile: 'Choose File (PDF, JPG, or PNG — max 5 MB)',
    submit: 'Submit Application & Document →',
    submitting: 'Submitting...',
    copyId: 'Copy Tracking ID',
    note: 'This is the GramSheba digital union application system; certificates can be downloaded once approved.',
  },
}

const initialForm = {
  child_name: '',
  birth_date: '',
  gender: '',
  father_name: '',
  mother_name: '',
  birth_place: '',
  address: '',
  document_type: 'nid_card',
}

function BirthApplication({ onBack }) {
  const [lang, setLang] = useState('bn')
  const t = TEXT[lang]

  const [formData, setFormData] = useState(initialForm)
  const [selectedDivision, setSelectedDivision] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedUpazila, setSelectedUpazila] = useState('')
  const [selectedUnion, setSelectedUnion] = useState('')
  const [customUnion, setCustomUnion] = useState('')

  const [draftRestored, setDraftRestored] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [trackingId, setTrackingId] = useState('')

  const fileInputRef = useRef(null)

  // ১. অফলাইন ড্রাফট রিস্টোর
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }))
        if (parsed.selectedDivision) setSelectedDivision(parsed.selectedDivision)
        if (parsed.selectedDistrict) setSelectedDistrict(parsed.selectedDistrict)
        if (parsed.selectedUpazila) setSelectedUpazila(parsed.selectedUpazila)
        if (parsed.selectedUnion) setSelectedUnion(parsed.selectedUnion)
        if (parsed.customUnion) setCustomUnion(parsed.customUnion)
        setDraftRestored(true)
      } catch {
        // ignore corrupted draft
      }
    }
  }, [])

  // ২. অফলাইন ড্রাফট অটো-সেভ
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.child_name || formData.father_name || formData.birth_place || formData.address) {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            formData,
            selectedDivision,
            selectedDistrict,
            selectedUpazila,
            selectedUnion,
            customUnion,
          })
        )
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [formData, selectedDivision, selectedDistrict, selectedUpazila, selectedUnion, customUnion])

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // ৩. AI OCR স্ক্যানার
  async function handleOcrUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API_BASE}/api/ocr/scan-document`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'ডকুমেন্ট স্ক্যান করা যায়নি।')
      const ext = data.extracted_data || {}
      setFormData((prev) => ({
        ...prev,
        child_name: ext.name || prev.child_name,
        father_name: ext.guardian_name || prev.father_name,
        mother_name: ext.mother_name || prev.mother_name,
        birth_date: ext.dob || prev.birth_date,
        gender: ext.gender || prev.gender,
        address: ext.address || prev.address,
      }))
      alert(data.message || '✅ AI OCR সফলভাবে তথ্য পূরণ করেছে! অনুগ্রহ করে তথ্যগুলো যাচাই করুন।')
    } catch (err) {
      alert(`⚠️ ${err.message || 'OCR স্ক্যান করতে সমস্যা হয়েছে।'}`)
    } finally {
      setOcrLoading(false)
      e.target.value = ''
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setTrackingId('')

    const finalUnion = (selectedUnion === '__custom__' ? customUnion : selectedUnion).trim()
    if (!finalUnion) {
      setMessage('অনুগ্রহ করে বিভাগ, জেলা, উপজেলা ও ইউনিয়ন পরিষদ নির্বাচন করুন।')
      setLoading(false)
      return
    }

    const geoSuffix = [finalUnion, selectedUpazila, selectedDistrict, selectedDivision]
      .filter(Boolean)
      .join(', ')
    const rawAddress = formData.address.trim()
    const combinedAddress = rawAddress.includes(finalUnion)
      ? rawAddress
      : `${rawAddress} (${geoSuffix})`

    const payload = {
      child_name: formData.child_name.trim(),
      birth_date: formData.birth_date,
      gender: formData.gender,
      father_name: formData.father_name.trim(),
      mother_name: formData.mother_name.trim(),
      birth_place: formData.birth_place.trim(),
      address: combinedAddress,
    }

    const documentFile = fileInputRef.current?.files?.[0]
    const documentType = formData.document_type

    const token = sessionStorage.getItem('gramsheba_token')
    if (!token) {
      setMessage('আবেদন করতে প্রথমে লগইন করুন।')
      setLoading(false)
      return
    }

    try {
      // ধাপ ১: জন্ম নিবন্ধন আবেদন তৈরি
      const response = await fetch(`${API_BASE}/api/birth-applications`, {
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

      // ধাপ ২: ফাইল সিলেক্ট করা থাকলে আপলোড করা
      if (documentFile && documentFile.size > 0) {
        const uploadData = new FormData()
        uploadData.append('file', documentFile)
        uploadData.append('document_type', documentType || 'nid_or_birth_proof')

        const docResponse = await fetch(
          `${API_BASE}/api/birth-applications/${generatedTrackingId}/documents`,
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
          localStorage.removeItem(DRAFT_KEY)
          setFormData(initialForm)
          setDraftRestored(false)
          if (fileInputRef.current) fileInputRef.current.value = ''
          return
        }
      }

      localStorage.removeItem(DRAFT_KEY)
      setFormData(initialForm)
      setDraftRestored(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setMessage('আপনার আবেদন ও সংযুক্ত প্রমাণপত্র সফলভাবে জমা হয়েছে!')
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <button className="birth-back" type="button" onClick={onBack} style={{ margin: 0 }}>
            {t.back}
          </button>
          <button
            type="button"
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.75rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', color: '#1e293b' }}
          >
            {lang === 'bn' ? 'English' : 'বাংলা'}
          </button>
        </div>

        <div className="birth-heading">
          <span>📄</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>

        {draftRestored && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '0.7rem 0.9rem', borderRadius: '10px', fontSize: '0.86rem', marginBottom: '1rem' }}>
            {t.draftRestored}
          </div>
        )}

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
                  {t.copyId}
                </button>
              </>
            )}
          </div>
        )}

        <form className="birth-form" onSubmit={handleSubmit}>
          {/* ১. বিভাগ-জেলা-উপজেলা-ইউনিয়ন সিলেক্টর */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.98rem', color: '#0f172a' }}>{t.providerTitle}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <label>
                {t.division} *
                <select
                  value={selectedDivision}
                  onChange={(e) => {
                    setSelectedDivision(e.target.value)
                    setSelectedDistrict('')
                    setSelectedUpazila('')
                    setSelectedUnion('')
                    setCustomUnion('')
                  }}
                  required
                >
                  <option value="">-- {t.division} --</option>
                  {Object.keys(bangladeshGeoData).map((div) => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </label>

              <label>
                {t.district} *
                <select
                  value={selectedDistrict}
                  disabled={!selectedDivision}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value)
                    setSelectedUpazila('')
                    setSelectedUnion('')
                    setCustomUnion('')
                  }}
                  required
                >
                  <option value="">-- {t.district} --</option>
                  {selectedDivision && Object.keys(bangladeshGeoData[selectedDivision] || {}).map((dist) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </label>

              <label>
                {t.upazila} *
                <select
                  value={selectedUpazila}
                  disabled={!selectedDistrict}
                  onChange={(e) => {
                    setSelectedUpazila(e.target.value)
                    setSelectedUnion('')
                    setCustomUnion('')
                  }}
                  required
                >
                  <option value="">-- {t.upazila} --</option>
                  {selectedDivision && selectedDistrict && Object.keys(bangladeshGeoData[selectedDivision]?.[selectedDistrict] || {}).map((upa) => (
                    <option key={upa} value={upa}>{upa}</option>
                  ))}
                </select>
              </label>

              <label>
                {t.union} *
                <select
                  value={selectedUnion}
                  disabled={!selectedUpazila}
                  onChange={(e) => setSelectedUnion(e.target.value)}
                  required
                >
                  <option value="">-- {t.union} --</option>
                  {selectedDivision && selectedDistrict && selectedUpazila && (bangladeshGeoData[selectedDivision]?.[selectedDistrict]?.[selectedUpazila] || []).map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  <option value="__custom__">অন্যান্য (নিজে লিখুন)</option>
                </select>
              </label>
            </div>

            {selectedUnion === '__custom__' && (
              <label>
                {t.customUnion} *
                <input
                  type="text"
                  placeholder="যেমন: আশুলিয়া ইউনিয়ন পরিষদ"
                  value={customUnion}
                  onChange={(e) => setCustomUnion(e.target.value)}
                  required
                />
              </label>
            )}
          </div>

          {/* ১.৫ বাংলা ভয়েস-টু-ফর্ম */}
          <VoiceAssistBar
            lang={lang}
            onExtracted={(ext) =>
              setFormData((prev) => ({
                ...prev,
                child_name: ext.name || prev.child_name,
                father_name: ext.guardian_name || prev.father_name,
                mother_name: ext.mother_name || prev.mother_name,
                birth_date: ext.dob || prev.birth_date,
                gender: ext.gender || prev.gender,
                birth_place: ext.birth_place || prev.birth_place,
                address: ext.address || prev.address,
              }))
            }
          />

          {/* ২. স্মার্ট AI OCR স্ক্যানার */}
          <div style={{ background: '#ecfdf5', border: '1.5px dashed #10b981', borderRadius: '12px', padding: '0.95rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.94rem' }}>{t.ocrTitle}</div>
              <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: '3px' }}>{t.ocrSub}</div>
            </div>
            <label style={{ background: '#1b734e', color: '#fff', padding: '0.55rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', margin: 0, display: 'inline-block' }}>
              {ocrLoading ? t.ocrScanning : t.ocrBtn}
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleOcrUpload} disabled={ocrLoading} style={{ display: 'none' }} />
            </label>
          </div>

          {/* ৩. শিশুর ও পিতা-মাতার তথ্য */}
          <label>
            {t.childName} *
            <input name="child_name" value={formData.child_name} onChange={handleChange} required minLength={2} maxLength={150} />
          </label>

          <label>
            {t.birthDate} *
            <input
              name="birth_date"
              type="date"
              max={getTodayDate()}
              value={formData.birth_date}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            {t.gender} *
            <select name="gender" value={formData.gender} onChange={handleChange} required>
              <option value="" disabled>{t.selectGender}</option>
              <option value="male">{t.male}</option>
              <option value="female">{t.female}</option>
              <option value="other">{t.other}</option>
            </select>
          </label>

          <label>
            {t.fatherName} *
            <input name="father_name" value={formData.father_name} onChange={handleChange} required minLength={2} maxLength={150} />
          </label>

          <label>
            {t.motherName} *
            <input name="mother_name" value={formData.mother_name} onChange={handleChange} required minLength={2} maxLength={150} />
          </label>

          <label>
            {t.birthPlace} *
            <input
              name="birth_place"
              placeholder={t.birthPlacePh}
              value={formData.birth_place}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={255}
            />
          </label>

          <label>
            {t.address} *
            <textarea
              name="address"
              placeholder={t.addressPh}
              value={formData.address}
              onChange={handleChange}
              required
              minLength={5}
              maxLength={2000}
              rows={3}
            />
          </label>

          {/* ডকুমেন্ট আপলোড সেকশন (FR-08) */}
          <div className="form-divider" style={{ margin: '1rem 0', borderTop: '1px dashed #cbd5e1' }} />

          <h3 style={{ fontSize: '1.02rem', color: '#166534', margin: '0 0 0.5rem 0' }}>
            {t.docHeading}
          </h3>

          <label>
            {t.docType}
            <select name="document_type" value={formData.document_type} onChange={handleChange}>
              <option value="nid_card">পিতা/মাতার জাতীয় পরিচয়পত্র (NID)</option>
              <option value="hospital_slip">হাসপাতালের জন্ম বা ছাড়পত্র রসিদ</option>
              <option value="vaccine_card">টিকাদান কার্ড</option>
              <option value="other">অন্যান্য প্রমাণপত্র</option>
            </select>
          </label>

          <label>
            {t.docFile}
            <input
              ref={fileInputRef}
              name="document_file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </label>

          <button className="birth-submit" type="submit" disabled={loading}>
            {loading ? t.submitting : t.submit}
          </button>
        </form>

        <p className="birth-note">{t.note}</p>
      </section>
    </main>
  )
}

export default BirthApplication
