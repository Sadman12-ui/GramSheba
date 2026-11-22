import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import './App.css'
import API_BASE from './api'
import { bangladeshGeoData } from './bangladeshData'
import VoiceAssistBar from './components/VoiceAssistBar'

const LABELS = {
  bn: {
    onlineApp: 'অনলাইন আবেদন',
    providerHeader: 'সেবা প্রদানকারী ইউনিয়ন / পৌরসভা',
    division: 'বিভাগ',
    district: 'জেলা',
    upazila: 'উপজেলা',
    union: 'ইউনিয়ন / পৌরসভা',
    customUnion: 'আপনার ইউনিয়ন পরিষদের নাম লিখুন',
    ocrTitle: '⚡ স্মার্ট AI OCR স্ক্যানার (স্বয়ংক্রিয় ফর্ম পূরণ)',
    ocrSub: 'NID বা জন্ম সনদের ছবি আপলোড করলে নাম, পিতা-মাতার নাম, জন্ম তারিখ ও নম্বর অটো-ফিল হবে।',
    ocrBtn: '📷 NID / সনদ আপলোড করুন',
    ocrScanning: 'স্ক্যান হচ্ছে...',
    draftMsg: '💾 আপনার পূর্বের অসম্পূর্ণ খসড়া (Offline Draft) স্বয়ংক্রিয়ভাবে উদ্ধার করা হয়েছে।',
    personalInfo: 'ব্যক্তিগত তথ্য',
    name: 'আবেদনকারীর পূর্ণ নাম',
    guardian: 'পিতা / স্বামীর নাম',
    mother: 'মাতার নাম',
    nidBrn: 'NID / জন্মনিবন্ধন নম্বর',
    mobile: 'মোবাইল নম্বর',
    dob: 'জন্ম তারিখ',
    gender: 'লিঙ্গ',
    selectGender: 'নির্বাচন করুন',
    male: 'পুরুষ',
    female: 'মহিলা',
    other: 'অন্যান্য',
    permAddress: 'স্থায়ী ঠিকানা',
    presentAddress: 'বর্তমান ঠিকানা',
    ward: 'ওয়ার্ড নম্বর',
    postOffice: 'ডাকঘর',
    village: 'গ্রাম / মহল্লা',
    roadBlock: 'রোড / ব্লক / সেক্টর',
    holding: 'হোল্ডিং নম্বর',
    sameAddress: 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতোই',
    same: 'একই',
    different: 'আলাদা',
    photoTitle: 'নাগরিকের ছবি (ঐচ্ছিক)',
    photoRule: 'JPG বা PNG ফরম্যাট, সর্বোচ্চ ২ MB।',
    selectPhoto: 'ছবি নির্বাচন করুন',
    extraTitle: 'সেবা সম্পর্কিত অতিরিক্ত তথ্য',
    businessName: 'ব্যবসা প্রতিষ্ঠানের নাম',
    businessType: 'ব্যবসার ধরন',
    deceasedName: 'মৃত ব্যক্তির নাম',
    heirsCount: 'ওয়ারিশের সংখ্যা',
    complaintSubject: 'অভিযোগের বিষয়',
    complaintDesc: 'অভিযোগ / পরামর্শের বিস্তারিত বিবরণ',
    purpose: 'সনদ গ্রহণের উদ্দেশ্য / বিবরণ',
    submitBtn: 'আবেদন জমা দিন →',
    submitting: 'জমা হচ্ছে...',
    warning: 'সতর্কতা: ভুল বা মিথ্যা তথ্য প্রদান করলে আবেদন বাতিল হতে পারে।',
  },
  en: {
    onlineApp: 'Online Application',
    providerHeader: 'Service Providing Union / Municipality',
    division: 'Division',
    district: 'District',
    upazila: 'Upazila',
    union: 'Union / Municipality',
    customUnion: 'Enter your Union Parishad name',
    ocrTitle: '⚡ Smart AI OCR Scanner (Auto-fill Form)',
    ocrSub: 'Upload NID or Birth Certificate to auto-fill name, parents, DOB and ID number.',
    ocrBtn: '📷 Upload NID / Certificate',
    ocrScanning: 'Scanning...',
    draftMsg: '💾 Your previously saved offline draft has been automatically restored.',
    personalInfo: 'Personal Information',
    name: 'Applicant Full Name',
    guardian: "Father's / Husband's Name",
    mother: "Mother's Name",
    nidBrn: 'NID / Birth Registration No.',
    mobile: 'Mobile Number',
    dob: 'Date of Birth',
    gender: 'Gender',
    selectGender: 'Select Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    permAddress: 'Permanent Address',
    presentAddress: 'Present Address',
    ward: 'Ward Number',
    postOffice: 'Post Office',
    village: 'Village / Area',
    roadBlock: 'Road / Block / Sector',
    holding: 'Holding / House No.',
    sameAddress: 'Present address is identical to permanent address',
    same: 'Same',
    different: 'Different',
    photoTitle: 'Applicant Photograph (Optional)',
    photoRule: 'JPG or PNG format, max 2 MB.',
    selectPhoto: 'Choose Photo',
    extraTitle: 'Additional Service Details',
    businessName: 'Business Name',
    businessType: 'Business Type',
    deceasedName: 'Deceased Person Name',
    heirsCount: 'Number of Heirs',
    complaintSubject: 'Complaint Subject',
    complaintDesc: 'Detailed Description of Complaint / Suggestion',
    purpose: 'Purpose of Certificate / Details',
    submitBtn: 'Submit Application →',
    submitting: 'Submitting...',
    warning: 'Caution: Providing false information may result in application rejection.',
  },
}

const inputStyle = {
  width: '100%',
  padding: '0.62rem 0.75rem',
  border: '1.5px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '0.9rem',
  background: '#fff',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontSize: '0.84rem',
  fontWeight: 600,
  color: '#334155',
}

const sectionStyle = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
}

function OtherServicesModal({ service, onClose, onSuccess }) {
  const draftKey = `gramsheba_service_draft_${service.id}`
  const [lang, setLang] = useState('bn')
  const t = LABELS[lang]

  const [selectedDivision, setSelectedDivision] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedUpazila, setSelectedUpazila] = useState('')
  const [selectedUnion, setSelectedUnion] = useState('')
  const [customUnion, setCustomUnion] = useState('')

  const [sameAsPermanent, setSameAsPermanent] = useState(true)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [draftRestored, setDraftRestored] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gpsCoords, setGpsCoords] = useState({ latitude: null, longitude: null })
  const [gpsStatus, setGpsStatus] = useState('')

  function handleDetectGps() {
    if (!navigator.geolocation) {
      setGpsStatus('⚠️ আপনার ব্রাউজার GPS সাপোর্ট করে না।')
      return
    }
    setGpsStatus('📍 আপনার বর্তমান লোকেশন শনাক্ত করা হচ্ছে...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lng = Number(pos.coords.longitude.toFixed(6))
        setGpsCoords({ latitude: lat, longitude: lng })
        setGpsStatus(`✅ GPS লোকেশন যুক্ত হয়েছে (${lat}, ${lng})`)
      },
      () => {
        setGpsStatus('⚠️ লোকেশন অনুমতি (Permission) পাওয়া যায়নি।')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const [formData, setFormData] = useState({
    applicant_name: '',
    guardian_name: '',
    mother_name: '',
    nid_brn: '',
    phone: '',
    dob: '',
    gender: '',
    ward_no: '১',
    post_office: '',
    village: '',
    road_block: '',
    holding_no: '',
    present_ward_no: '১',
    present_post_office: '',
    present_village: '',
    present_road_block: '',
    present_holding_no: '',
    business_name: '',
    business_type: '',
    deceased_name: '',
    heirs_count: '3',
    reason_or_description: '',
  })

  const isComplaint = service.id === 'complaint'
  const isTrade = service.id === 'trade'
  const isWarish = service.id === 'warish'

  // অফলাইন ড্রাফট রিস্টোর
  useEffect(() => {
    const saved = localStorage.getItem(draftKey)
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
  }, [draftKey])

  // অফলাইন ড্রাফট অটো-সেভ
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.applicant_name || formData.nid_brn || formData.reason_or_description) {
        localStorage.setItem(
          draftKey,
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
  }, [draftKey, formData, selectedDivision, selectedDistrict, selectedUpazila, selectedUnion, customUnion])

  function handleChange(e) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('ছবির আকার সর্বোচ্চ ২ MB হতে পারবে।')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result)
    reader.readAsDataURL(file)
  }

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
        applicant_name: ext.name || prev.applicant_name,
        guardian_name: ext.guardian_name || prev.guardian_name,
        mother_name: ext.mother_name || prev.mother_name,
        nid_brn: ext.nid_brn || prev.nid_brn,
        dob: ext.dob || prev.dob,
        gender: ext.gender || prev.gender,
      }))
      alert(data.message || '✅ AI OCR সফলভাবে তথ্য পূরণ করেছে! অনুগ্রহ করে তথ্যগুলো যাচাই করুন।')
    } catch (err) {
      alert(`⚠️ ${err.message || 'OCR স্ক্যান করতে সমস্যা হয়েছে।'}`)
    } finally {
      setOcrLoading(false)
      e.target.value = ''
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const finalUnion = (selectedUnion === '__custom__' ? customUnion : selectedUnion).trim()
    if (!finalUnion) {
      alert('অনুগ্রহ করে বিভাগ, জেলা, উপজেলা ও ইউনিয়ন পরিষদ নির্বাচন করুন।')
      return
    }

    setLoading(true)
    const token = sessionStorage.getItem('gramsheba_token')

    const fullArea = [finalUnion, selectedUpazila, selectedDistrict, selectedDivision]
      .filter(Boolean)
      .join(', ')

    try {
      if (isComplaint) {
        const res = await fetch(`${API_BASE}/api/complaints`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject: formData.business_name || 'নাগরিক সেবা সম্পর্কিত অভিযোগ/পরামর্শ',
            description: formData.reason_or_description,
            area: `${fullArea} (ওয়ার্ড: ${formData.ward_no}, গ্রাম: ${formData.village || 'উল্লেখ নেই'})`,
            phone: formData.phone,
            latitude: gpsCoords.latitude,
            longitude: gpsCoords.longitude,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'অভিযোগ জমা দেওয়া যায়নি।')
        localStorage.removeItem(draftKey)
        alert(`✅ অভিযোগ সফলভাবে নথিভুক্ত হয়েছে!\nনম্বর: ${data.complaint_id}\nসংশ্লিষ্ট ইউনিয়ন পরিষদ প্রয়োজনীয় ব্যবস্থা গ্রহণ করবে।`)
      } else {
        const res = await fetch(`${API_BASE}/api/services/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            service_type: service.id,
            applicant_name: formData.applicant_name.trim(),
            guardian_name: formData.guardian_name.trim(),
            nid_brn: formData.nid_brn.trim(),
            phone: formData.phone.trim(),
            union_name: finalUnion,
            details: {
              division: selectedDivision,
              district: selectedDistrict,
              upazila: selectedUpazila,
              union_name: finalUnion,
              mother_name: formData.mother_name.trim(),
              dob: formData.dob,
              gender: formData.gender,
              permanent_address: {
                ward_no: formData.ward_no,
                post_office: formData.post_office.trim(),
                village: formData.village.trim(),
                road_block: formData.road_block.trim(),
                holding_no: formData.holding_no.trim(),
              },
              same_as_permanent: sameAsPermanent,
              present_address: sameAsPermanent
                ? {
                    ward_no: formData.ward_no,
                    post_office: formData.post_office.trim(),
                    village: formData.village.trim(),
                    road_block: formData.road_block.trim(),
                    holding_no: formData.holding_no.trim(),
                  }
                : {
                    ward_no: formData.present_ward_no,
                    post_office: formData.present_post_office.trim(),
                    village: formData.present_village.trim(),
                    road_block: formData.present_road_block.trim(),
                    holding_no: formData.present_holding_no.trim(),
                  },
              has_photo: Boolean(photoPreview),
              business_name: formData.business_name.trim(),
              business_type: formData.business_type.trim(),
              deceased_name: formData.deceased_name.trim(),
              heirs_count: formData.heirs_count,
              purpose: formData.reason_or_description.trim(),
            },
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'আবেদন জমা দেওয়া যায়নি।')
        localStorage.removeItem(draftKey)
        alert(`✅ আবেদন সফলভাবে জমা হয়েছে!\nট্র্যাকিং নম্বর: ${data.tracking_id}`)
      }
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      alert(`⚠️ ${err.message || 'সার্ভারের সাথে সংযোগ করা যায়নি।'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cert-modal-overlay" style={{ alignItems: 'flex-start', overflowY: 'auto', padding: '1.5rem 1rem' }}>
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="cert-modal-container" style={{ maxWidth: '820px', width: '100%', padding: '1.6rem', margin: '0 auto' }}>
        {/* হেডার ও ভাষা টগল */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.7rem' }}>{service.icon || '📝'}</span>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1b734e', background: '#ecfdf5', padding: '2px 8px', borderRadius: '999px' }}>
                {t.onlineApp}
              </span>
              <h3 style={{ margin: '2px 0 0', color: '#0f172a', fontSize: '1.2rem' }}>{service.title} আবেদন</h3>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.7rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', color: '#1e293b' }}
            >
              {lang === 'bn' ? 'English' : 'বাংলা'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        </div>

        {draftRestored && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '0.65rem 0.9rem', borderRadius: '8px', fontSize: '0.84rem', marginBottom: '1rem' }}>
            {t.draftMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* ১. সেবা প্রদানকারী ইউনিয়ন / পৌরসভা */}
          <div style={sectionStyle}>
            <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.96rem' }}>🏛️ {t.providerHeader}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
              <label style={labelStyle}>
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
                  style={inputStyle}
                  required
                >
                  <option value="">-- {t.division} --</option>
                  {Object.keys(bangladeshGeoData).map((div) => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
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
                  style={inputStyle}
                  required
                >
                  <option value="">-- {t.district} --</option>
                  {selectedDivision && Object.keys(bangladeshGeoData[selectedDivision] || {}).map((dist) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                {t.upazila} *
                <select
                  value={selectedUpazila}
                  disabled={!selectedDistrict}
                  onChange={(e) => {
                    setSelectedUpazila(e.target.value)
                    setSelectedUnion('')
                    setCustomUnion('')
                  }}
                  style={inputStyle}
                  required
                >
                  <option value="">-- {t.upazila} --</option>
                  {selectedDivision && selectedDistrict && Object.keys(bangladeshGeoData[selectedDivision]?.[selectedDistrict] || {}).map((upa) => (
                    <option key={upa} value={upa}>{upa}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                {t.union} *
                <select
                  value={selectedUnion}
                  disabled={!selectedUpazila}
                  onChange={(e) => setSelectedUnion(e.target.value)}
                  style={inputStyle}
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
              <label style={labelStyle}>
                {t.customUnion} *
                <input
                  type="text"
                  placeholder="যেমন: আশুলিয়া ইউনিয়ন পরিষদ"
                  value={customUnion}
                  onChange={(e) => setCustomUnion(e.target.value)}
                  style={inputStyle}
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
                applicant_name: ext.name || prev.applicant_name,
                guardian_name: ext.guardian_name || prev.guardian_name,
                mother_name: ext.mother_name || prev.mother_name,
                nid_brn: ext.nid_brn || prev.nid_brn,
                phone: ext.phone || prev.phone,
                dob: ext.dob || prev.dob,
                gender: ext.gender || prev.gender,
                ward_no: ext.ward_no || prev.ward_no,
                village: ext.village || prev.village,
                post_office: ext.post_office || prev.post_office,
                reason_or_description: ext.reason || prev.reason_or_description,
              }))
            }
          />

          {/* ২. স্মার্ট AI OCR স্ক্যানার */}
          <div style={{ background: '#ecfdf5', border: '1.5px dashed #10b981', borderRadius: '12px', padding: '0.9rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.92rem' }}>{t.ocrTitle}</div>
              <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '2px' }}>{t.ocrSub}</div>
            </div>
            <label style={{ background: '#1b734e', color: '#fff', padding: '0.55rem 0.95rem', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {ocrLoading ? t.ocrScanning : t.ocrBtn}
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleOcrUpload} disabled={ocrLoading} style={{ display: 'none' }} />
            </label>
          </div>

          {/* ৩. ব্যক্তিগত তথ্য */}
          <div style={sectionStyle}>
            <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.96rem' }}>👤 {t.personalInfo}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              <label style={labelStyle}>
                {t.name} *
                <input type="text" name="applicant_name" placeholder="পূর্ণ নাম লিখুন" value={formData.applicant_name} onChange={handleChange} required style={inputStyle} />
              </label>
              <label style={labelStyle}>
                {t.guardian} *
                <input type="text" name="guardian_name" placeholder="পিতা বা স্বামীর নাম" value={formData.guardian_name} onChange={handleChange} required style={inputStyle} />
              </label>
              <label style={labelStyle}>
                {t.mother} *
                <input type="text" name="mother_name" placeholder="মাতার নাম" value={formData.mother_name} onChange={handleChange} required={!isComplaint} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                {t.nidBrn} *
                <input type="text" name="nid_brn" placeholder="১০ বা ১৭ ডিজিট" value={formData.nid_brn} onChange={handleChange} required style={inputStyle} />
              </label>
              <label style={labelStyle}>
                {t.mobile} *
                <input type="tel" name="phone" placeholder="01XXXXXXXXX" value={formData.phone} onChange={handleChange} required style={inputStyle} />
              </label>
              <label style={labelStyle}>
                {t.dob} {!isComplaint && '*'}
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} required={!isComplaint} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                {t.gender} {!isComplaint && '*'}
                <select name="gender" value={formData.gender} onChange={handleChange} required={!isComplaint} style={inputStyle}>
                  <option value="">{t.selectGender}</option>
                  <option value="male">{t.male}</option>
                  <option value="female">{t.female}</option>
                  <option value="other">{t.other}</option>
                </select>
              </label>
            </div>
          </div>

          {/* ৪. স্থায়ী ও বর্তমান ঠিকানা */}
          <div style={sectionStyle}>
            <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.96rem' }}>📍 {t.permAddress}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
              <label style={labelStyle}>
                {t.ward} *
                <select name="ward_no" value={formData.ward_no} onChange={handleChange} style={inputStyle}>
                  {['১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'].map((w) => (
                    <option key={w} value={w}>ওয়ার্ড নং {w}</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                {t.postOffice}
                <input type="text" name="post_office" placeholder="ডাকঘর" value={formData.post_office} onChange={handleChange} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                {t.village} *
                <input type="text" name="village" placeholder="গ্রাম / মহল্লা" value={formData.village} onChange={handleChange} required style={inputStyle} />
              </label>
              <label style={labelStyle}>
                {t.roadBlock}
                <input type="text" name="road_block" placeholder="যেমন: ২নং রোড" value={formData.road_block} onChange={handleChange} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                {t.holding}
                <input type="text" name="holding_no" placeholder="হোল্ডিং নম্বর" value={formData.holding_no} onChange={handleChange} style={inputStyle} />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{t.sameAddress}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSameAsPermanent(true)}
                  style={{ padding: '0.35rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, background: sameAsPermanent ? '#1b734e' : '#fff', color: sameAsPermanent ? '#fff' : '#334155' }}
                >
                  {t.same}
                </button>
                <button
                  type="button"
                  onClick={() => setSameAsPermanent(false)}
                  style={{ padding: '0.35rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, background: !sameAsPermanent ? '#1b734e' : '#fff', color: !sameAsPermanent ? '#fff' : '#334155' }}
                >
                  {t.different}
                </button>
              </div>
            </div>

            {!sameAsPermanent && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', paddingTop: '0.4rem' }}>
                <label style={labelStyle}>
                  {t.ward} ({t.presentAddress})
                  <select name="present_ward_no" value={formData.present_ward_no} onChange={handleChange} style={inputStyle}>
                    {['১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'].map((w) => (
                      <option key={w} value={w}>ওয়ার্ড নং {w}</option>
                    ))}
                  </select>
                </label>
                <label style={labelStyle}>
                  {t.postOffice}
                  <input type="text" name="present_post_office" placeholder="ডাকঘর" value={formData.present_post_office} onChange={handleChange} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  {t.village} *
                  <input type="text" name="present_village" placeholder="গ্রাম / মহল্লা" value={formData.present_village} onChange={handleChange} required style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  {t.roadBlock}
                  <input type="text" name="present_road_block" placeholder="রোড / ব্লক" value={formData.present_road_block} onChange={handleChange} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  {t.holding}
                  <input type="text" name="present_holding_no" placeholder="হোল্ডিং নম্বর" value={formData.present_holding_no} onChange={handleChange} style={inputStyle} />
                </label>
              </div>
            )}
          </div>

          {/* ৫. নাগরিকের ছবি */}
          {!isComplaint && (
            <div style={{ ...sectionStyle, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.94rem' }}>🖼️ {t.photoTitle}</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>{t.photoRule}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {photoPreview && (
                  <img src={photoPreview} alt="Applicant" style={{ width: '54px', height: '54px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                )}
                <label style={{ background: '#fff', border: '1.5px solid #1b734e', color: '#1b734e', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                  {t.selectPhoto}
                  <input type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}

          {/* ৬. সেবাভিত্তিক অতিরিক্ত তথ্য */}
          <div style={sectionStyle}>
            <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.96rem' }}>📋 {t.extraTitle}</h4>

            {isTrade && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <label style={labelStyle}>
                  {t.businessName} *
                  <input type="text" name="business_name" placeholder="দোকান বা ফার্মের নাম" value={formData.business_name} onChange={handleChange} required style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  {t.businessType}
                  <input type="text" name="business_type" placeholder="যেমন: মুদি, ফার্মেসি, আইটি" value={formData.business_type} onChange={handleChange} style={inputStyle} />
                </label>
              </div>
            )}

            {isWarish && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <label style={labelStyle}>
                  {t.deceasedName} *
                  <input type="text" name="deceased_name" placeholder="যার নামে ওয়ারিশ সনদ হবে" value={formData.deceased_name} onChange={handleChange} required style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  {t.heirsCount}
                  <input type="number" name="heirs_count" min="1" value={formData.heirs_count} onChange={handleChange} style={inputStyle} />
                </label>
              </div>
            )}

            {isComplaint && (
              <>
                <label style={labelStyle}>
                  {t.complaintSubject} *
                  <input type="text" name="business_name" placeholder="অভিযোগের সংক্ষিপ্ত শিরোনাম" value={formData.business_name} onChange={handleChange} required style={inputStyle} />
                </label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', background: '#fff', border: '1px dashed #94a3b8', borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                    <strong>📍 জিও-ট্যাগ (লাইভ ম্যাপ পিন):</strong> {gpsStatus || 'ঘটনাস্থলের GPS যুক্ত করলে ম্যাপে সরাসরি পিন দেখাবে।'}
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    📍 GPS যুক্ত করুন
                  </button>
                </div>
              </>
            )}

            <label style={labelStyle}>
              {isComplaint ? `${t.complaintDesc} *` : t.purpose}
              <textarea
                name="reason_or_description"
                rows={3}
                placeholder={isComplaint ? 'সমস্যার স্থান ও বিবরণ বিস্তারিত লিখুন...' : 'সনদ গ্রহণের কারণ বা উদ্দেশ্য লিখুন'}
                value={formData.reason_or_description}
                onChange={handleChange}
                required={isComplaint}
                style={{ ...inputStyle, fontFamily: 'inherit' }}
              />
            </label>
          </div>

          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', textAlign: 'center' }}>
            ⚠️ {t.warning}
          </p>

          <button type="submit" className="primary-button" disabled={loading} style={{ padding: '0.85rem', fontSize: '0.98rem', fontWeight: 700 }}>
            {loading ? t.submitting : t.submitBtn}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

export default OtherServicesModal
