import { useState } from 'react'
import './Auth.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

// বাংলাদেশের সকল বিভাগ, জেলা ও উপজেলার পূর্ণাঙ্গ ক্যাসকেডিং ডেটাসেট
const BD_LOCATIONS = {
  'চট্টগ্রাম': {
    'চাঁদপুর': ['চাঁদপুর সদর', 'ফরিদগঞ্জ', 'হাজীগঞ্জ', 'কচুয়া', 'মতলব উত্তর', 'মতলব দক্ষিণ', 'শাহরাস্তি', 'হাইমচর'],
    'চট্টগ্রাম': ['কোতোয়ালী', 'পাহাড়তলী', 'পাঁচলাইশ', 'পটিয়া', 'সীতাকুণ্ড', 'মিরসরাই', 'রাঙ্গুনিয়া', 'হাটহাজারী', 'সন্দ্বীপ', 'আনোয়ারা', 'ফটিকছড়ি'],
    'কুমিল্লা': ['কুমিল্লা আদর্শ সদর', 'চৌদ্দগ্রাম', 'লাকসাম', 'দাউদকান্দি', 'বরুড়া', 'মুরাদনগর', 'বুড়িচং', 'হোমনা', 'দেবীদ্বার'],
    'ব্রাহ্মণবাড়িয়া': ['ব্রাহ্মণবাড়িয়া সদর', 'আশুগঞ্জ', 'কসবা', 'নবীনগর', 'সরাইল', 'নাসিরনগর', 'বাঞ্ছারামপুর'],
    'নোয়াখালী': ['নোয়াখালী সদর', 'বেগমগঞ্জ', 'কোম্পানীগঞ্জ', 'সেনবাগ', 'চাটখিল', 'হাতিয়া', 'সুবর্ণচর'],
    'ফেনী': ['ফেনী সদর', 'দাগনভূঞা', 'সোনাগাজী', 'ছাগলনাইয়া', 'পরশুরাম', 'ফুলগাজী'],
    'লক্ষ্মীপুর': ['লক্ষ্মীপুর সদর', 'রায়পুর', 'রামগঞ্জ', 'রামগতি', 'কমলনগর'],
    'কক্সবাজার': ['কক্সবাজার সদর', 'রামু', 'টেকনাফ', 'উখিয়া', 'চকোরিয়া', 'পেকুয়া', 'মহেশখালী', 'কুতুবদিয়া'],
    'খাগড়াছড়ি': ['খাগড়াছড়ি সদর', 'দীঘিনালা', 'পানছড়ি', 'মহালছড়ি', 'মাটিরাঙ্গা', 'মানিকছড়ি', 'রামগড়'],
    'রাঙ্গামাটি': ['রাঙ্গামাটি সদর', 'কাপ্তাই', 'কাউখালী', 'বাঘাইছড়ি', 'বরকল', 'জুরাইছড়ি', 'লংগদু'],
    'বান্দরবান': ['বান্দরবান সদর', 'রুমা', 'থানচি', 'রোয়াংছড়ি', 'লামা', 'আলী কদম', 'নাইক্ষ্যংছড়ি']
  },
  'ঢাকা': {
    'ঢাকা': ['ধানমন্ডি', 'মিরপুর', 'গুলশান', 'সাভার', 'ধামরাই', 'কেরানীগঞ্জ', 'নবাবগঞ্জ', 'দোহার'],
    'গাজীপুর': ['গাজীপুর সদর', 'কালিয়াকৈর', 'শ্রীপুর', 'কাপাসিয়া', 'কালীগঞ্জ'],
    'নারায়ণগঞ্জ': ['নারায়ণগঞ্জ সদর', 'রূপগঞ্জ', 'সোনারগাঁও', 'আড়াইহাজার', 'বন্দর'],
    'টাঙ্গাইল': ['টাঙ্গাইল সদর', 'মির্জাপুর', 'কালিহাতী', 'ঘাটাইল', 'সখীপুর', 'মধুপুর', 'গোপালপুর', 'বাসাইল'],
    'কিশোরগঞ্জ': ['কিশোরগঞ্জ সদর', 'ভৈরব', 'বাজিতপুর', 'হোসেনপুর', 'করিমগঞ্জ', 'কটিয়াদী', 'তাড়াইল', 'অষ্টগ্রাম'],
    'ফরিদপুর': ['ফরিদপুর সদর', 'বোয়ালমারী', 'ভাঙ্গা', 'নগরকান্দা', 'আলফাডাঙ্গা', 'সদরপুর', 'চরভদ্রাসন', 'মধুখালী'],
    'মানিকগঞ্জ': ['মানিকগঞ্জ সদর', 'সিংগাইর', 'শিবালয়', 'সাটুরিয়া', 'হরিরামপুর', 'ঘিওর', 'দৌলতপুর'],
    'মুন্সিগঞ্জ': ['মুন্সিগঞ্জ সদর', 'শ্রীনগর', 'সিরাজদিখান', 'লৌহজং', 'গজারিয়া', 'টংগিবাড়ী'],
    'নরসিংদী': ['নরসিংদী সদর', 'পলাশ', 'বেলাবো', 'মনোহরদী', 'রায়পুরা', 'শিবপুর'],
    'গোপালগঞ্জ': ['গোপালগঞ্জ সদর', 'কাশিয়ানী', 'কোটালীপাড়া', 'মুকসুদপুর', 'টুঙ্গিপাড়া'],
    'মাদারীপুর': ['মাদারীপুর সদর', 'শিবচর', 'কালকিনি', 'রাজৈর'],
    'রাজবাড়ী': ['রাজবাড়ী সদর', 'গোয়ালন্দ', 'পাংশা', 'বালিয়াকান্দি', 'কালুখালী'],
    'শরীয়তপুর': ['শরীয়তপুর সদর', 'জাজিরা', 'নড়িয়া', 'ভেদরগঞ্জ', 'ডামুড্যা', 'গোসাইরহাট']
  },
  'রাজশাহী': {
    'রাজশাহী': ['বোয়ালিয়া', 'মতিহার', 'পবা', 'বাঘা', 'চারঘাট', 'গোদাগাড়ী', 'তানোর', 'মোহনপুর', 'বাগমারা'],
    'বগুড়া': ['বগুড়া সদর', 'শেরপুর', 'শিবগঞ্জ', 'ধুনট', 'সারিয়াকান্দি', 'গাবতলী', 'কাহালু', 'দুপচাঁচিয়া'],
    'পাবনা': ['পাবনা সদর', 'ঈশ্বরদী', 'সাঁথিয়া', 'সুজানগর', 'বেড়া', 'চাটমোহর', 'ফরিদপুর', 'আটঘরিয়া'],
    'সিরাজগঞ্জ': ['সিরাজগঞ্জ সদর', 'শাহজাদপুর', 'উল্লাপাড়া', 'বেলকুচি', 'রায়গঞ্জ', 'তাড়াশ', 'চৌহালী', 'কামারখন্দ'],
    'নওগাঁ': ['নওগাঁ সদর', 'মহাদেবপুর', 'বদলগাছী', 'পত্নীতলা', 'ধামইরহাট', 'নিয়ামতপুর', 'মান্দা', 'আত্রাই'],
    'নাটোর': ['নাটোর সদর', 'সিংড়া', 'বাগাতিপাড়া', 'গুরুদাসপুর', 'বড়াইগ্রাম', 'লালপুর'],
    'চাঁপাইনবাবগঞ্জ': ['চাঁপাইনবাবগঞ্জ সদর', 'শিবগঞ্জ', 'গোমস্তাপুর', 'নাচোল', 'ভোলাহাট'],
    'জয়পুরহাট': ['জয়পুরহাট সদর', 'পাঁচবিবি', 'কালাই', 'ক্ষেতলাল', 'আক্কেলপুর']
  },
  'খুলনা': {
    'খুলনা': ['খুলনা সদর', 'দৌলতপুর', 'ডুমুরিয়া', 'বটিয়াঘাটা', 'পাইকগাছা', 'রূপসা', 'তেরখাদা', 'দিঘলিয়া', 'কয়রা'],
    'যশোর': ['যশোর সদর', 'ঝিকরগাছা', 'অভয়নগর', 'মণিরামপুর', 'কেশবপুর', 'শার্শা', 'বাঘারপাড়া', 'চৌগাছা'],
    'কুষ্টিয়া': ['কুষ্টিয়া সদর', 'কুমারখালী', 'ভেড়ামারা', 'মিরপুর', 'দৌলতপুর', 'খোকসা'],
    'সাতক্ষীরা': ['সাতক্ষীরা সদর', 'কালীগঞ্জ', 'শ্যামনগর', 'তালা', 'আশাশুনি', 'কলারোয়া', 'দেবহাটা'],
    'বাগেরহাট': ['বাগেরহাট সদর', 'ফকিরহাট', 'মোংলা', 'রামপাল', 'কচুয়া', 'মোল্লাহাট', 'চিতলমারী', 'মোরেলগঞ্জ'],
    'ঝিনাইদহ': ['ঝিনাইদহ সদর', 'কালীগঞ্জ', 'কোটচাঁদপুর', 'মহেশপুর', 'শৈলকুপা', 'হরিণাকুণ্ডু'],
    'চুয়াডাঙ্গা': ['চুয়াডাঙ্গা সদর', 'আলমডাঙ্গা', 'দামুড়হুদা', 'জীবননগর'],
    'মেহেরপুর': ['মেহেরপুর সদর', 'গাংনী', 'মুজিবনগর'],
    'মাগুরা': ['মাগুরা সদর', 'শ্রীপুর', 'শালিখা', 'মহম্মদপুর'],
    'নড়াইল': ['নড়াইল সদর', 'লোহাগড়া', 'কালিয়া']
  },
  'বরিশাল': {
    'বরিশাল': ['বরিশাল সদর', 'বাবুগঞ্জ', 'উজিরপুর', 'বাকেরগঞ্জ', 'গৌরনদী', 'মেহেন্দিগঞ্জ', 'মুলাদী', 'হিজলা', 'বানারীপাড়া'],
    'পটুয়াখালী': ['পটুয়াখালী সদর', 'গলাচিপা', 'বাউফল', 'কলাপাড়া', 'দুমকি', 'দশমিনা', 'মির্জাগঞ্জ', 'রাঙ্গাবালী'],
    'ভোলা': ['ভোলা সদর', 'বোরহানউদ্দিন', 'চরফ্যাশন', 'দৌলতখান', 'লালমোহন', 'তজুমদ্দিন', 'মনপুরা'],
    'পিরোজপুর': ['পিরোজপুর সদর', 'নাজিরপুর', 'ভাণ্ডারিয়া', 'মঠবাড়িয়া', 'নেছারাবাদ', 'কাউখালী', 'ইন্দুরকানী'],
    'বরগুনা': ['বরগুনা সদর', 'আমতলী', 'পাথরঘাটা', 'বেতাগী', 'বামনা', 'তালতলী'],
    'ঝালকাঠি': ['ঝালকাঠি সদর', 'নলছিটি', 'রাজাপুর', 'কাঁঠালিয়া']
  },
  'সিলেট': {
    'সিলেট': ['সিলেট সদর', 'গোলাপগঞ্জ', 'বিয়ানীবাজার', 'জৈন্তাপুর', 'বিশ্বনাথ', 'বালাগঞ্জ', 'গোয়াইনঘাট', 'কানাইঘাট', 'কোম্পানীগঞ্জ', 'জকিগঞ্জ'],
    'মৌলভীবাজার': ['মৌলভীবাজার সদর', 'শ্রীমঙ্গল', 'কমলগঞ্জ', 'কুলাউড়া', 'বড়লেখা', 'রাজনগর', 'জুড়ী'],
    'হবিগঞ্জ': ['হবিগঞ্জ সদর', 'মাধবপুর', 'চুনারুঘাট', 'নবীগঞ্জ', 'বাহুবল', 'বানিয়াচং', 'আজমিরীগঞ্জ', 'লাখাই'],
    'সুনামগঞ্জ': ['সুনামগঞ্জ সদর', 'জগন্নাথপুর', 'ছাতক', 'তাহিরপুর', 'দিরাই', 'ধর্মপাশা', 'দোয়ারাবাজার', 'শাল্লা', 'জামালগঞ্জ']
  },
  'রংপুর': {
    'রংপুর': ['রংপুর সদর', 'গঙ্গাচড়া', 'বদরগঞ্জ', 'পীরগাছা', 'মিঠাপুকুর', 'কাউনিয়া', 'পীরগঞ্জ', 'তারাগঞ্জ'],
    'দিনাজপুর': ['দিনাজপুর সদর', 'বিরল', 'বীরগঞ্জ', 'বোচাগঞ্জ', 'ফুলবাড়ী', 'পার্বতীপুর', 'নবাবগঞ্জ', 'ঘোড়াঘাট', 'হাকিমপুর', 'কাহারোল'],
    'কুড়িগ্রাম': ['কুড়িগ্রাম সদর', 'নাগেশ্বরী', 'ভূরুঙ্গামারী', 'উলিপুর', 'চিলমারী', 'রৌমারী', 'রাজিবপুর', 'ফুলবাড়ী'],
    'গাইবান্ধা': ['গাইবান্ধা সদর', 'গোবিন্দগঞ্জ', 'সুন্দরগঞ্জ', 'পলাশবাড়ী', 'সাদুল্লাপুর', 'ফুলছড়ি', 'সাঘাটা'],
    'নীলফামারী': ['নীলফামারী সদর', 'সৈয়দপুর', 'ডোমার', 'ডিমলা', 'জলঢাকা', 'কিশোরগঞ্জ'],
    'লালমনিরহাট': ['লালমনিরহাট সদর', 'হাতীবান্ধা', 'পাটগ্রাম', 'কালীগঞ্জ', 'আদিতমারী'],
    'পঞ্চগড়': ['পঞ্চগড় সদর', 'তেঁতুলিয়া', 'বোদা', 'আটোয়ারী', 'দেবীগঞ্জ'],
    'ঠাকুরগাঁও': ['ঠাকুরগাঁও সদর', 'পীরগঞ্জ', 'বালিয়াডাঙ্গী', 'রানীশংকৈল', 'হরিপুর']
  },
  'ময়মনসিংহ': {
    'ময়মনসিংহ': ['ময়মনসিংহ সদর', 'ত্রিশাল', 'মুক্তাগাছা', 'গফরগাঁও', 'ঈশ্বরগঞ্জ', 'ফুলপুর', 'হালুয়াঘাট', 'নান্দাইল', 'ফুলবাড়িয়া', 'ধোবাউড়া', 'তারাকান্দা'],
    'জামালপুর': ['জামালপুর সদর', 'সরিষাবাড়ী', 'মেলান্দহ', 'ইসলামপুর', 'বকশীগঞ্জ', 'দেওয়ানগঞ্জ', 'মাদারগঞ্জ'],
    'শেরপুর': ['শেরপুর সদর', 'নকলা', 'নালিতাবাড়ী', 'শ্রীবরদী', 'ঝিনাইগাতী'],
    'নেত্রকোণা': ['নেত্রকোণা সদর', 'কেন্দুয়া', 'পূর্বধলা', 'মোহনগঞ্জ', 'বারহাট্টা', 'কলমাকান্দা', 'দুর্গাপুর', 'মদন', 'খালিয়াজুড়ি', 'আটপাড়া']
  }
}

function Auth({ onBack, onLogin }) {
  const [isLogin, setIsLogin] = useState(false)
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // লগইন ফিল্ড
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // ৩-ধাপের নিবন্ধন ফিল্ড
  const [formData, setFormData] = useState({
    // ধাপ ১: প্রশাসনিক কর্মকর্তা
    adminName: '',
    adminPhone: '',
    adminEmail: '',
    adminPassword: '',

    // ধাপ ২: হিসাব সহকারী / উদ্যোক্তা
    assistantName: '',
    assistantPhone: '',
    assistantNid: '',
    assistantRole: 'হিসাব সহকারী কাম কম্পিউটার অপারেটর',

    // ধাপ ৩: এলাকা ও পরিষদ তথ্য
    division: 'চট্টগ্রাম',
    district: 'চাঁদপুর',
    upazila: 'চাঁদপুর সদর',
    unionName: '',
    unionCode: '',
  })

  function handleFormChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  // ক্যাসকেডিং হ্যান্ডলার: বিভাগ পরিবর্তন হলে প্রথম জেলা ও তার প্রথম উপজেলা সেট হবে
  function handleDivisionChange(e) {
    const selectedDiv = e.target.value
    const districts = Object.keys(BD_LOCATIONS[selectedDiv] || {})
    const firstDist = districts[0] || ''
    const upazilas = BD_LOCATIONS[selectedDiv]?.[firstDist] || []
    const firstUpa = upazilas[0] || ''

    setFormData({
      ...formData,
      division: selectedDiv,
      district: firstDist,
      upazila: firstUpa,
    })
    setError('')
  }

  // ক্যাসকেডিং হ্যান্ডলার: জেলা পরিবর্তন হলে তার প্রথম উপজেলা সেট হবে
  function handleDistrictChange(e) {
    const selectedDist = e.target.value
    const upazilas = BD_LOCATIONS[formData.division]?.[selectedDist] || []
    const firstUpa = upazilas[0] || ''

    setFormData({
      ...formData,
      district: selectedDist,
      upazila: firstUpa,
    })
    setError('')
  }

  // ৩-ধাপের নেভিগেশন হ্যান্ডলার
  function handleNextStep(e) {
    e.preventDefault()
    setError('')

    if (step === 1) {
      if (!formData.adminName.trim() || !formData.adminPhone.trim() || !formData.adminEmail.trim() || !formData.adminPassword.trim()) {
        setError('অনুগ্রহ করে সকল তারকাচিহ্নিত (*) ঘরগুলো পূরণ করুন।')
        return
      }
      if (formData.adminPhone.length < 11) {
        setError('সঠিক ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন।')
        return
      }
      if (formData.adminPassword.length < 6) {
        setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!formData.assistantName.trim() || !formData.assistantPhone.trim()) {
        setError('হিসাব সহকারী বা উদ্যোক্তার নাম ও মোবাইল নম্বর পূরণ করুন।')
        return
      }
      setStep(3)
    }
  }

  // ফাইনাল নিবন্ধন সাবমিট (ধাপ ৩)
  async function handleRegisterSubmit(e) {
    e.preventDefault()
    setError('')

    if (!formData.unionName.trim() || !formData.unionCode.trim()) {
      setError('ইউনিয়ন পরিষদের নাম এবং কোড দেওয়া আবশ্যক।')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.adminName.trim(),
          email: formData.adminEmail.trim().toLowerCase(),
          phone: formData.adminPhone.trim(),
          password: formData.adminPassword,
          union_code: formData.unionCode.trim().toUpperCase(),
          area: `${formData.unionName.trim()}, ${formData.upazila}, ${formData.district}`,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'নিবন্ধন সম্পন্ন করা যায়নি। ইউনিয়ন কোড পুনরায় যাচাই করুন।')
      }

      alert('অভিনন্দন! ইউনিয়ন পরিষদ ও প্রশাসনিক কর্মকর্তার নিবন্ধন সফল হয়েছে। অনুগ্রহ করে লগইন করুন।')
      setIsLogin(true)
      setLoginEmail(formData.adminEmail)
      setStep(1)
    } catch (err) {
      setError(err.message || 'সার্ভার সংযোগ বিচ্ছিন্ন।')
    } finally {
      setLoading(false)
    }
  }

  // লগইন হ্যান্ডলার
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

  return (
    <div className="auth-overlay">
      <div className="auth-box" style={{ maxWidth: isLogin ? '460px' : '720px', padding: 0, overflow: 'hidden' }}>
        
        {/* ব্যাক বাটন */}
        <button
          type="button"
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '12px',
            right: '16px',
            background: 'rgba(0,0,0,0.1)',
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
        <div style={{ background: 'linear-gradient(180deg, #2ea879 0%, #208a61 100%)', padding: '2rem 1.5rem 1.5rem', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '6px' }}>🏛️</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.75rem', fontWeight: 800 }}>
            {isLogin ? 'ইউনিয়ন পরিষদ লগইন' : 'ইউনিয়ন পরিষদ নিবন্ধন'}
          </h2>
          
          <div style={{ background: 'rgba(0, 0, 0, 0.18)', border: '1px solid rgba(255, 150, 150, 0.4)', borderRadius: '10px', padding: '10px', maxWidth: '580px', margin: '0 auto', fontSize: '0.82rem', color: '#fecaca', lineHeight: '1.4' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>ইউনিয়ন পরিষদ কার্যালয়ের কর্মকর্তা/ কর্মচারী ব্যতীত, অন্য কোন ব্যক্তি/প্রতিষ্ঠান আবেদন করা সম্পূর্ণ নিষিদ্ধ।</p>
            <p style={{ margin: '2px 0 0' }}>কোন ভুল তথ্য প্রদান করিলে আপনার বিরুদ্ধে আইনগত ব্যবস্থা গ্রহণ করা হবে।</p>
          </div>
        </div>

        {/* লগইন / নিবন্ধন ট্যাব সুইচ */}
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
                transition: 'all 0.2s',
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
                transition: 'all 0.2s',
              }}
            >
              নিবন্ধন
            </button>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.2rem', textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          )}

          {/* ===================== লগইন ভিউ ===================== */}
          {isLogin ? (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  ই-মেইল ঠিকানা
                </label>
                <input
                  type="email"
                  placeholder="admin@gramsheba.gov.bd"
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
                style={{ background: '#1b734e', color: '#fff', border: 'none', padding: '0.85rem', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' }}
              >
                {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন →'}
              </button>
            </form>
          ) : (
            /* ===================== ৩-ধাপের নিবন্ধন ভিউ ===================== */
            <div>
              {/* ৩-ধাপের স্টেপার প্রগ্রেস বার */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.8rem', padding: '0 1rem' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ width: '38px', height: '38px', margin: '0 auto', borderRadius: '50%', background: step >= 1 ? '#1b734e' : '#e2e8f0', color: step >= 1 ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    ১
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: step === 1 ? '#1b734e' : '#64748b', marginTop: '4px', display: 'block' }}>
                    প্রশাসনিক কর্মকর্তা
                  </span>
                </div>

                <div style={{ flex: 1, height: '2px', background: step >= 2 ? '#1b734e' : '#e2e8f0', margin: '0 8px' }}></div>

                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ width: '38px', height: '38px', margin: '0 auto', borderRadius: '50%', background: step >= 2 ? '#1b734e' : '#e2e8f0', color: step >= 2 ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    ২
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: step === 2 ? '#1b734e' : '#64748b', marginTop: '4px', display: 'block' }}>
                    হিসাব সহকারী/উদ্যোক্তা
                  </span>
                </div>

                <div style={{ flex: 1, height: '2px', background: step >= 3 ? '#1b734e' : '#e2e8f0', margin: '0 8px' }}></div>

                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ width: '38px', height: '38px', margin: '0 auto', borderRadius: '50%', background: step >= 3 ? '#1b734e' : '#e2e8f0', color: step >= 3 ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    ৩
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: step === 3 ? '#1b734e' : '#64748b', marginTop: '4px', display: 'block' }}>
                    এলাকা
                  </span>
                </div>
              </div>

              {/* ধাপ ১: প্রশাসনিক কর্মকর্তা তথ্য */}
              {step === 1 && (
                <form onSubmit={handleNextStep}>
                  <div style={{ marginBottom: '1.2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1b734e', fontWeight: 700 }}>প্রশাসনিক কর্মকর্তা তথ্য</h3>
                    <small style={{ color: '#64748b' }}>লগইনে এই তথ্য ব্যবহার হবে</small>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.2rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        নাম (বাংলায়) <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="adminName"
                        placeholder="বাংলা নাম লিখুন"
                        value={formData.adminName}
                        onChange={handleFormChange}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #a7f3d0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        মোবাইল নম্বর <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="adminPhone"
                        placeholder="01XXXXXXXXX"
                        value={formData.adminPhone}
                        onChange={handleFormChange}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #a7f3d0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        ই-মেইল <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="email"
                        name="adminEmail"
                        placeholder="email@example.com"
                        value={formData.adminEmail}
                        onChange={handleFormChange}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #a7f3d0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        পাসওয়ার্ড <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="password"
                        name="adminPassword"
                        placeholder="•••••••• (কমপক্ষে ৬ অক্ষর)"
                        value={formData.adminPassword}
                        onChange={handleFormChange}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #a7f3d0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      style={{ background: '#1b734e', color: '#fff', border: 'none', padding: '0.75rem 1.8rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                    >
                      পরবর্তী →
                    </button>
                  </div>
                </form>
              )}

              {/* ধাপ ২: হিসাব সহকারী / উদ্যোক্তা তথ্য */}
              {step === 2 && (
                <form onSubmit={handleNextStep}>
                  <div style={{ marginBottom: '1.2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1b734e', fontWeight: 700 }}>হিসাব সহকারী / উদ্যোক্তার তথ্য</h3>
                    <small style={{ color: '#64748b' }}>ডিজিটাল সেন্টারের দায়িত্বপ্রাপ্ত ব্যক্তির বিবরণ</small>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.2rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        হিসাব সহকারী / উদ্যোক্তার নাম <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="assistantName"
                        placeholder="পূর্ণ নাম লিখুন"
                        value={formData.assistantName}
                        onChange={handleFormChange}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #a7f3d0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        মোবাইল নম্বর <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="assistantPhone"
                        placeholder="01XXXXXXXXX"
                        value={formData.assistantPhone}
                        onChange={handleFormChange}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #a7f3d0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        জাতীয় পরিচয়পত্র (NID)
                      </label>
                      <input
                        type="text"
                        name="assistantNid"
                        placeholder="১০ বা ১৭ ডিজিট"
                        value={formData.assistantNid}
                        onChange={handleFormChange}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #a7f3d0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        পদবী
                      </label>
                      <select
                        name="assistantRole"
                        value={formData.assistantRole}
                        onChange={handleFormChange}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #a7f3d0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', background: '#fff' }}
                      >
                        <option value="হিসাব সহকারী কাম কম্পিউটার অপারেটর">হিসাব সহকারী কাম কম্পিউটার অপারেটর</option>
                        <option value="ইউপি ডিজিটাল সেন্টার উদ্যোক্তা">ইউপি ডিজিটাল সেন্টার উদ্যোক্তা</option>
                        <option value="অফিস সহকারী">অফিস সহকারী</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '0.75rem 1.4rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ← পূর্ববর্তী
                    </button>
                    <button
                      type="submit"
                      style={{ background: '#1b734e', color: '#fff', border: 'none', padding: '0.75rem 1.8rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                    >
                      পরবর্তী →
                    </button>
                  </div>
                </form>
              )}

              {/* ধাপ ৩: এলাকা ও পরিষদ তথ্য (ক্যাসকেডিং ড্রপডাউন সহ) */}
              {step === 3 && (
                <form onSubmit={handleRegisterSubmit}>
                  <div style={{ marginBottom: '1.2rem', textAlign: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1b734e', fontWeight: 700 }}>
                      এলাকা ও পরিষদ তথ্য
                    </h3>
                    <small style={{ color: '#64748b' }}>ইউনিয়ন পরিষদের ভৌগোলিক ঠিকানা ও অফিশিয়াল কোড</small>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '1.2rem' }}>
                    
                    {/* ১. বিভাগ ড্রপডাউন */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        বিভাগ <span style={{ color: 'red' }}>*</span>
                      </label>
                      <select
                        name="division"
                        value={formData.division}
                        onChange={handleDivisionChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          border: '1.5px solid #a7f3d0',
                          borderRadius: '12px',
                          fontSize: '0.92rem',
                          outline: 'none',
                          background: '#fff',
                          color: '#1f2937',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        required
                      >
                        {Object.keys(BD_LOCATIONS).map((div) => (
                          <option key={div} value={div}>{div} বিভাগ</option>
                        ))}
                      </select>
                    </div>

                    {/* ২. জেলা ড্রপডাউন */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        জেলা <span style={{ color: 'red' }}>*</span>
                      </label>
                      <select
                        name="district"
                        value={formData.district}
                        onChange={handleDistrictChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          border: '1.5px solid #a7f3d0',
                          borderRadius: '12px',
                          fontSize: '0.92rem',
                          outline: 'none',
                          background: '#fff',
                          color: '#1f2937',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        required
                      >
                        {Object.keys(BD_LOCATIONS[formData.division] || {}).map((dist) => (
                          <option key={dist} value={dist}>{dist} জেলা</option>
                        ))}
                      </select>
                    </div>

                    {/* ৩. উপজেলা ড্রপডাউন */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        উপজেলা <span style={{ color: 'red' }}>*</span>
                      </label>
                      <select
                        name="upazila"
                        value={formData.upazila}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          border: '1.5px solid #a7f3d0',
                          borderRadius: '12px',
                          fontSize: '0.92rem',
                          outline: 'none',
                          background: '#fff',
                          color: '#1f2937',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        required
                      >
                        {(BD_LOCATIONS[formData.division]?.[formData.district] || []).map((upa) => (
                          <option key={upa} value={upa}>{upa}</option>
                        ))}
                      </select>
                    </div>

                    {/* ৪. ইউনিয়ন পরিষদের নাম */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        ইউনিয়ন পরিষদের নাম <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="unionName"
                        placeholder="যেমন: বিষ্ণুপুর ইউনিয়ন পরিষদ"
                        value={formData.unionName}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          border: '1.5px solid #a7f3d0',
                          borderRadius: '12px',
                          fontSize: '0.92rem',
                          outline: 'none',
                          color: '#1f2937'
                        }}
                        required
                      />
                    </div>

                    {/* ৫. অনন্য ইউনিয়ন কোড */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        অনন্য ইউনিয়ন কোড (Union Code) <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="unionCode"
                        placeholder="যেমন: BISHNUPUR_01 অথবা RAMPUR01"
                        value={formData.unionCode}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          border: '1.5px solid #a7f3d0',
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          outline: 'none',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: '#065f46'
                        }}
                        required
                      />
                      <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
                        * এই কোডটি দিয়ে পরবর্তীতে নাগরিক ও কর্মকর্তারা আপনার ইউনিয়নে সংযুক্ত হবেন।
                      </small>
                    </div>

                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        padding: '0.75rem 1.4rem',
                        borderRadius: '10px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ← পূর্ববর্তী
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        background: '#1b734e',
                        color: '#fff',
                        border: 'none',
                        padding: '0.75rem 2rem',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                      }}
                    >
                      {loading ? 'নিবন্ধন হচ্ছে...' : 'নিবন্ধন সম্পন্ন করুন ✓'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  )
}

export default Auth
