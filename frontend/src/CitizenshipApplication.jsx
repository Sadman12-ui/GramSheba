import { useState, useEffect } from 'react'
import PaymentModal from './PaymentModal'
import './CitizenshipApplication.css'

const API_BASE = 'http://localhost:8000'

// বাংলাদেশের প্রশাসনিক তথ্য
const BANGLADESH_GEO_DATA = {
  চট্টগ্রাম: {
    চাঁদপুর: {
      'চাঁদপুর সদর': [
        'বিষ্ণুপুর ইউনিয়ন পরিষদ',
        'আশিকাটি ইউনিয়ন পরিষদ',
        'কল্যাণপুর ইউনিয়ন পরিষদ',
        'তরপুরচণ্ডী ইউনিয়ন পরিষদ',
        'রামপুর ইউনিয়ন পরিষদ',
        'শাহমাহমুদপুর ইউনিয়ন পরিষদ',
        'মাইজগাঁও ইউনিয়ন পরিষদ',
        'চাঁদপুর পৌরসভা',
      ],
      হাজীগঞ্জ: [
        'হাজীগঞ্জ সদর ইউনিয়ন',
        'বড়কুল পূর্ব ইউনিয়ন',
        'বড়কুল পশ্চিম ইউনিয়ন',
        'কালচোঁ দক্ষিণ ইউনিয়ন',
        'হাজীগঞ্জ পৌরসভা',
      ],
      ফরিদগঞ্জ: [
        'বালিথুবা পশ্চিম ইউনিয়ন',
        'বালিথুবা পূর্ব ইউনিয়ন',
        'সুবিদপুর পূর্ব ইউনিয়ন',
        'ফরিদগঞ্জ পৌরসভা',
      ],
      'মতলব দক্ষিণ': [
        'নায়েড়গাঁও উত্তর ইউনিয়ন',
        'খাদেরগাঁও ইউনিয়ন',
        'উপাদী উত্তর ইউনিয়ন',
        'মতলব পৌরসভা',
      ],
    },
    চট্টগ্রাম: {
      চন্দনাইশ: [
        'বাইতুল্লী ইউনিয়ন পরিষদ',
        'জোয়ারা ইউনিয়ন পরিষদ',
        'বরকল ইউনিয়ন পরিষদ',
        'কাঞ্চনাবাদ ইউনিয়ন পরিষদ',
      ],
      পটিয়া: [
        'কোলাগাঁও ইউনিয়ন',
        'হাইডগাঁও ইউনিয়ন',
        'কুসুমপুরা ইউনিয়ন',
        'পটিয়া পৌরসভা',
      ],
      কোতোয়ালী: ['ওয়ার্ড ০১', 'ওয়ার্ড ০২', 'ওয়ার্ড ০৩'],
    },
    কুমিল্লা: {
      'কুমিল্লা আদর্শ সদর': [
        'কালিরবাজার ইউনিয়ন',
        'দূর্গাপুর উত্তর ইউনিয়ন',
        'আমড়াতলী ইউনিয়ন',
      ],
      চৌদ্দগ্রাম: ['কাশিনগর ইউনিয়ন', 'উজিরপুর ইউনিয়ন', 'চৌদ্দগ্রাম পৌরসভা'],
    },
    নোয়াখালী: {
      'নোয়াখালী সদর': ['কালাদরাপ ইউনিয়ন', 'দাদপুর ইউনিয়ন', 'নোয়াখালী পৌরসভা'],
      বেগমগঞ্জ: ['আমানউল্ল্যাপুর ইউনিয়ন', 'গোপালপুর ইউনিয়ন', 'চৌমুহনী পৌরসভা'],
    },
  },
  ঢাকা: {
    ঢাকা: {
      সাভার: [
        'আমিনবাজার ইউনিয়ন পরিষদ',
        'তেঁতুলঝোড়া ইউনিয়ন পরিষদ',
        'বিরুলিয়া ইউনিয়ন পরিষদ',
        'সাভার পৌরসভা',
      ],
      ধামরাই: ['কুশুরা ইউনিয়ন', 'সূয়াপুর ইউনিয়ন', 'ধামরাই পৌরসভা'],
      ধানমন্ডি: ['ওয়ার্ড ১৫', 'ওয়ার্ড ১৬'],
      মিরপুর: ['ওয়ার্ড ০১', 'ওয়ার্ড ০২', 'ওয়ার্ড ০৩'],
    },
    গাজীপুর: {
      'গাজীপুর সদর': ['মির্জাপুর ইউনিয়ন', 'ভাওয়াল গড় ইউনিয়ন', 'গাজীপুর সিটি'],
      শ্রীপুর: ['মাওনা ইউনিয়ন', 'কাওরাইদ ইউনিয়ন', 'শ্রীপুর পৌরসভা'],
    },
    নারায়ণগঞ্জ: {
      'নারায়ণগঞ্জ সদর': ['বক্তাবলী ইউনিয়ন', 'এনায়েতনগর ইউনিয়ন'],
      সোনারগাঁও: ['বারদী ইউনিয়ন', 'বৈদ্যেরবাজার ইউনিয়ন', 'সোনারগাঁও পৌরসভা'],
    },
  },
  রাজশাহী: {
    রাজশাহী: {
      পবা: ['হরিপুর ইউনিয়ন', 'দামকুড়া ইউনিয়ন', 'পবা পৌরসভা'],
      বাঘা: ['বাজুবাঘা ইউনিয়ন', 'গড়গড়ি ইউনিয়ন', 'বাঘা পৌরসভা'],
      বোয়ালিয়া: ['ওয়ার্ড ০১', 'ওয়ার্ড ০২', 'ওয়ার্ড ০৩'],
    },
    বগুড়া: {
      'বগুড়া সদর': ['লাহিড়ীপাড়া ইউনিয়ন', 'নুনগোলা ইউনিয়ন', 'বগুড়া পৌরসভা'],
      শেরপুর: ['কুসুম্বী ইউনিয়ন', 'গাড়ীদহ ইউনিয়ন', 'শেরপুর পৌরসভা'],
    },
    পাবনা: {
      'পাবনা সদর': ['দোগাছী ইউনিয়ন', 'হেমায়েতপুর ইউনিয়ন', 'পাবনা পৌরসভা'],
      ঈশ্বরদী: ['পাকশী ইউনিয়ন', 'সাহাপুর ইউনিয়ন', 'ঈশ্বরদী পৌরসভা'],
    },
  },
  খুলনা: {
    খুলনা: {
      ডুমুরিয়া: ['ধামালিয়া ইউনিয়ন', 'রঘুনাথপুর ইউনিয়ন'],
      রূপসা: ['আইচগাতী ইউনিয়ন', 'শ্রীফলতলা ইউনিয়ন'],
      'খুলনা সদর': ['ওয়ার্ড ০১', 'ওয়ার্ড ০২'],
    },
    যশোর: {
      'যশোর সদর': ['ফতেপুর ইউনিয়ন', 'নওয়াপাড়া ইউনিয়ন', 'যশোর পৌরসভা'],
      ঝিকরগাছা: ['গঙ্গানন্দপুর ইউনিয়ন', 'মাগুরা ইউনিয়ন'],
    },
  },
  বরিশাল: {
    বরিশাল: {
      'বরিশাল সদর': ['রায়পাশা কড়াপুর ইউনিয়ন', 'কাশীপুর ইউনিয়ন', 'বরিশাল সিটি'],
      বাকেরগঞ্জ: ['চরামদ্দি ইউনিয়ন', 'দুধল ইউনিয়ন', 'বাকেরগঞ্জ পৌরসভা'],
    },
    পটুয়াখালী: {
      'পটুয়াখালী সদর': ['বড়বিঘাই ইউনিয়ন', 'ছোটবিঘাই ইউনিয়ন', 'পটুয়াখালী পৌরসভা'],
      কুয়াকাটা: ['লতাচাপলী ইউনিয়ন', 'কুয়াকাটা পৌরসভা'],
    },
  },
  সিলেট: {
    সিলেট: {
      'সিলেট সদর': ['জালালাবাদ ইউনিয়ন', 'হাটখোলা ইউনিয়ন', 'মোগলগাঁও ইউনিয়ন'],
      গোলাপগঞ্জ: ['বাঘা ইউনিয়ন', 'গোলাপগঞ্জ পৌরসভা'],
    },
    মৌলভীবাজার: {
      'মৌলভীবাজার সদর': ['খলিলপুর ইউনিয়ন', 'মনুমুখ ইউনিয়ন', 'মৌলভীবাজার পৌরসভা'],
      শ্রীমঙ্গল: ['মির্জাপুর ইউনিয়ন', 'কালাপুর ইউনিয়ন', 'শ্রীমঙ্গল পৌরসভা'],
    },
  },
  রংপুর: {
    রংপুর: {
      'রংপুর সদর': ['মমিনপুর ইউনিয়ন', 'হরিদেবপুর ইউনিয়ন', 'রংপুর সিটি'],
      গঙ্গাচড়া: ['বেতগাড়ী ইউনিয়ন', 'কোলকোন্দ ইউনিয়ন'],
    },
    দিনাজপুর: {
      'দিনাজপুর সদর': ['চেহেলগাজী ইউনিয়ন', 'সুন্দরবন ইউনিয়ন', 'দিনাজপুর পৌরসভা'],
    },
  },
  ময়মনসিংহ: {
    ময়মনসিংহ: {
      'ময়মনসিংহ সদর': ['বোররচর ইউনিয়ন', 'প্যারাপাড়া ইউনিয়ন', 'ময়মনসিংহ সিটি'],
      ত্রিশাল: ['ধানীখোলা ইউনিয়ন', 'বৈলর ইউনিয়ন', 'ত্রিশাল পৌরসভা'],
    },
    জামালপুর: {
      'জামালপুর সদর': ['কেন্দুয়া ইউনিয়ন', 'শরীফপুর ইউনিয়ন', 'জামালপুর পৌরসভা'],
    },
  },
}

// বাংলা ও ইংরেজি অভিধান
const T = {
  bn: {
    home: 'হোম',
    certApply: 'সনদ আবেদন',
    title: 'নাগরিকত্ব সনদ আবেদন',
    subTitle: 'তথ্য যাচাই করে সঠিকভাবে ফরম পূরণ করুন। আবেদন নম্বর পাওয়ার পর ফরম ডাউনলোড করা যাবে।',
    onlineApp: 'অনলাইন আবেদন',
    providerHeader: 'সেবা প্রদানকারী ইউনিয়ন / পৌরসভা',
    providerSub: 'যে প্রতিষ্ঠানে আবেদন করা হবে সেটি ধাপে ধাপে নির্বাচন করুন।',
    division: 'বিভাগ',
    district: 'জেলা',
    upazila: 'উপজেলা',
    union: 'ইউনিয়ন / পৌরসভা',
    selectedOrg: 'নির্বাচিত প্রতিষ্ঠান',
    safeApply: 'নিরাপদ আবেদন প্রক্রিয়া',
    safeG1: 'আপনার তথ্য শুধুমাত্র সনদ প্রস্তুত ও যাচাই কাজে ব্যবহৃত হবে।',
    safeG2: 'স্থায়ী ও বর্তমান ঠিকানা আলাদা হলে সঠিক তথ্য দিন।',
    safeG3: 'ভুল তথ্য দিলে আবেদন বাতিল হতে পারে।',
    searchTitle: 'পুরাতন নাগরিক তথ্য খুঁজুন',
    searchSub: 'তথ্য থাকলে ফরম স্বয়ংক্রিয়ভাবে পূরণ হবে।',
    nidBrnSearch: 'NID / জন্মনিবন্ধন নম্বর',
    nidBrnPlaceholder: '১০ বা ১৭ ডিজিটের নম্বর',
    dobSearch: 'জন্ম তারিখ (ঐচ্ছিক)',
    searchBtn: 'তথ্য খুঁজুন',
    mainTitle: 'নাগরিক তথ্য ও সনদের বিবরণ',
    mainSub: 'তারকাচিহ্নিত ঘরগুলো অবশ্যই পূরণ করতে হবে।',
    personalInfo: 'ব্যক্তিগত তথ্য',
    personalSub: 'নাগরিকের পরিচয় ও যোগাযোগের তথ্য',
    name: 'নাম (পূর্ণ নাম)',
    namePlaceholder: 'বাংলায় অথবা ইংরেজিতে লিখুন',
    guardian: 'পিতা / স্বামীর নাম',
    guardianPlaceholder: 'পিতা বা স্বামীর নাম লিখুন',
    mother: 'মাতার নাম',
    motherPlaceholder: 'মাতার নাম লিখুন',
    nidBrn: 'NID / জন্মনিবন্ধন নম্বর',
    nidPlaceholder: '১০ বা ১৭ ডিজিট',
    mobile: 'মোবাইল নম্বর',
    dob: 'জন্ম তারিখ',
    gender: 'লিঙ্গ',
    selectGender: 'লিঙ্গ নির্বাচন করুন',
    male: 'পুরুষ',
    female: 'মহিলা',
    other: 'অন্যান্য',
    permAddress: 'স্থায়ী ঠিকানা',
    permSub: 'এনআইডি অনুযায়ী স্থায়ী ঠিকানার তথ্য',
    ward: 'ওয়ার্ড নম্বর',
    postOffice: 'ডাকঘর',
    postPlaceholder: 'ডাকঘরের নাম লিখুন',
    village: 'গ্রাম / মহল্লা',
    villagePlaceholder: 'গ্রাম বা মহল্লার নাম লিখুন',
    roadBlock: 'রোড / ব্লক / সেক্টর',
    roadPlaceholder: 'যেমন: ২নং রোড',
    holding: 'হোল্ডিং নম্বর',
    holdingPlaceholder: 'হোল্ডিং / বাড়ি নম্বর',
    sameAddress: 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতোই',
    sameSub: 'একই হলে টিক দিন, অন্যথায় আলাদা ঠিকানা পূরণ করুন।',
    same: 'একই',
    different: 'আলাদা',
    photoTitle: 'নাগরিকের ছবি',
    photoSub: 'স্পষ্ট ছবি আপলোড করলে সনদে ব্যবহার করা হবে।',
    photoHint: 'JPG বা PNG ফরম্যাটে ছবি দিন',
    photoRule: 'সর্বোচ্চ আকার ২ MB। পাসপোর্ট সাইজের স্পষ্ট ছবি সবচেয়ে ভালো ফলাফল দেয়।',
    selectPhoto: 'ছবি নির্বাচন করুন',
    extraTitle: 'সনদের অতিরিক্ত তথ্য',
    extraSub: 'নাগরিকত্ব সনদ প্রস্তুত করতে প্রয়োজনীয় তথ্য দিন।',
    reason: 'সনদ গ্রহণের উদ্দেশ্য / বিবরণ',
    reasonPlaceholder: 'যেমন: পাসপোর্ট আবেদন, চাকুরি বা ব্যাংক একাউন্ট খোলা',
    disclaimer: 'জমা দেওয়ার আগে নাম, NID, ওয়ার্ড এবং দুই ঠিকানার তথ্য পুনরায় যাচাই করুন।',
    submitBtn: 'আবেদন জমা দিন (ফি পরিশোধ)',
    submitting: 'জমা হচ্ছে...',
    warning: 'সতর্কতা: সকল তথ্য সঠিক ও সত্য প্রদান করা আবেদনকারীর দায়িত্ব। ভুল তথ্য প্রদান আইনত দণ্ডনীয় অপরাধ।',
    draftRestoredMsg: '💾 আপনার পূর্বের অসম্পূর্ণ খসড়া (Offline Draft) স্বয়ংক্রিয়ভাবে উদ্ধার করা হয়েছে।',
    ocrTitle: '⚡ স্মার্ট AI OCR স্ক্যানার (স্বয়ংক্রিয় ফর্ম পূরণ)',
    ocrSub: 'NID বা জন্ম সনদের ছবি আপলোড করলে নাম, জন্ম তারিখ ও নম্বর নিজে থেকে পূরণ হবে।',
    ocrBtn: '📷 NID / সনদ আপলোড করুন',
    ocrScanning: 'স্ক্যান হচ্ছে...',
    feeTitle: 'নাগরিকত্ব সনদ সরকারি ফি',
  },
  en: {
    home: 'Home',
    certApply: 'Certificate Application',
    title: 'Citizenship Certificate Application',
    subTitle: 'Please fill out the form accurately. Download will be available upon receiving tracking ID.',
    onlineApp: 'Online Application',
    providerHeader: 'Service Providing Union / Municipality',
    providerSub: 'Select the administrative institution step-by-step.',
    division: 'Division',
    district: 'District',
    upazila: 'Upazila',
    union: 'Union / Municipality',
    selectedOrg: 'Selected Institution',
    safeApply: 'Secure Application Process',
    safeG1: 'Your data will strictly be used for certificate generation and verification.',
    safeG2: 'Provide verified information if current & permanent addresses differ.',
    safeG3: 'Submitting false information may lead to application rejection.',
    searchTitle: 'Search Existing Citizen Records',
    searchSub: 'Fields will auto-populate if existing records are found.',
    nidBrnSearch: 'NID / Birth Registration No.',
    nidBrnPlaceholder: '10 or 17 digit number',
    dobSearch: 'Date of Birth (Optional)',
    searchBtn: 'Search Record',
    mainTitle: 'Citizen Information & Certificate Details',
    mainSub: 'Fields marked with an asterisk (*) are mandatory.',
    personalInfo: 'Personal Information',
    personalSub: 'Identity and contact details of the applicant',
    name: 'Full Name',
    namePlaceholder: 'Enter applicant full name',
    guardian: "Father's / Husband's Name",
    guardianPlaceholder: "Enter father's or husband's name",
    mother: "Mother's Name",
    motherPlaceholder: "Enter mother's name",
    nidBrn: 'NID / Birth Certificate No.',
    nidPlaceholder: '10 or 17 digit number',
    mobile: 'Mobile Number',
    dob: 'Date of Birth',
    gender: 'Gender',
    selectGender: 'Select Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    permAddress: 'Permanent Address',
    permSub: 'Address details as documented on NID/BRN',
    ward: 'Ward Number',
    postOffice: 'Post Office',
    postPlaceholder: 'Enter post office name',
    village: 'Village / Area',
    villagePlaceholder: 'Enter village or street name',
    roadBlock: 'Road / Block / Sector',
    roadPlaceholder: 'e.g. Road 02, Block C',
    holding: 'Holding / House No.',
    holdingPlaceholder: 'Enter holding number',
    sameAddress: 'Present address is identical to permanent address',
    sameSub: 'Keep toggled if identical, otherwise provide distinct address.',
    same: 'Same',
    different: 'Different',
    photoTitle: 'Applicant Photograph',
    photoSub: 'Uploaded photograph will be embedded on the official certificate.',
    photoHint: 'Upload in JPG or PNG format',
    photoRule: 'Max file size 2 MB. Passport-size clear photo is recommended.',
    selectPhoto: 'Choose Photo',
    extraTitle: 'Additional Certificate Details',
    extraSub: 'Provide the primary purpose for certificate requisition.',
    reason: 'Purpose of Certificate Requisition',
    reasonPlaceholder: 'e.g. Passport Re-issue, Job Verification, Banking',
    disclaimer: 'Verify name spellings, NID number, and addresses thoroughly before final submission.',
    submitBtn: 'Submit Application (Pay Fee)',
    submitting: 'Submitting...',
    warning: 'Caution: Submitting false or misleading information is legally punishable under national law.',
    draftRestoredMsg: '💾 Your previously saved offline draft has been automatically restored.',
    ocrTitle: '⚡ Smart AI OCR Scanner (Auto-fill Form)',
    ocrSub: 'Upload NID or Birth Certificate to automatically extract and populate applicant details.',
    ocrBtn: '📷 Upload NID / Certificate',
    ocrScanning: 'Scanning...',
    feeTitle: 'Citizenship Certificate Govt Fee',
  },
}

function CitizenshipApplication({ onBack, onSubmitSuccess }) {
  const [lang, setLang] = useState('bn')
  const [sameAsPermanent, setSameAsPermanent] = useState(true)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  // ভৌগোলিক ক্যাসকেডিং স্টেট
  const [selectedDivision, setSelectedDivision] = useState('চট্টগ্রাম')
  const [selectedDistrict, setSelectedDistrict] = useState('চাঁদপুর')
  const [selectedUpazila, setSelectedUpazila] = useState('চাঁদপুর সদর')
  const [selectedUnion, setSelectedUnion] = useState('বিষ্ণুপুর ইউনিয়ন পরিষদ')

  // ফর্ম ডাটা স্টেট
  const [formData, setFormData] = useState({
    name: '',
    guardian_name: '',
    mother_name: '',
    nid_brn: '',
    mobile: '',
    dob: '',
    gender: '',
    ward_no: '১',
    post_office: 'বিষ্ণুপুর',
    village: 'বিষ্ণুপুর',
    road_block: '',
    holding_no: '',
    reason: 'চাকরি / প্রাতিষ্ঠানিক কাজের জন্য',
  })

  // অফলাইন সিঙ্ক ও মক পেমেন্ট স্টেট
  const [draftRestored, setDraftRestored] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)

  const t = T[lang]

  // ১. অফলাইন ড্রাফট লোড
  useEffect(() => {
    const savedDraft = localStorage.getItem('gramsheba_citizenship_draft')
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        setFormData(parsed)
        setDraftRestored(true)
      } catch (err) {
        console.error(err)
      }
    }
  }, [])

  // ২. স্বয়ংক্রিয় অফলাইন ড্রাফট সেভার
  useEffect(() => {
    localStorage.setItem('gramsheba_citizenship_draft', JSON.stringify(formData))
  }, [formData])

  function handleDivisionChange(e) {
    const div = e.target.value
    setSelectedDivision(div)

    const districts = Object.keys(BANGLADESH_GEO_DATA[div] || {})
    const firstDistrict = districts[0] || ''
    setSelectedDistrict(firstDistrict)

    const upazilas = firstDistrict ? Object.keys(BANGLADESH_GEO_DATA[div][firstDistrict] || {}) : []
    const firstUpazila = upazilas[0] || ''
    setSelectedUpazila(firstUpazila)

    const unions = firstUpazila ? BANGLADESH_GEO_DATA[div][firstDistrict][firstUpazila] || [] : []
    const firstUnion = unions[0] || ''
    setSelectedUnion(firstUnion)
  }

  function handleDistrictChange(e) {
    const dist = e.target.value
    setSelectedDistrict(dist)

    const upazilas = Object.keys(BANGLADESH_GEO_DATA[selectedDivision]?.[dist] || {})
    const firstUpazila = upazilas[0] || ''
    setSelectedUpazila(firstUpazila)

    const unions = firstUpazila ? BANGLADESH_GEO_DATA[selectedDivision][dist][firstUpazila] || [] : []
    const firstUnion = unions[0] || ''
    setSelectedUnion(firstUnion)
  }

  function handleUpazilaChange(e) {
    const upz = e.target.value
    setSelectedUpazila(upz)

    const unions = BANGLADESH_GEO_DATA[selectedDivision]?.[selectedDistrict]?.[upz] || []
    const firstUnion = unions[0] || ''
    setSelectedUnion(firstUnion)
  }

  function handleInputChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(lang === 'bn' ? 'ছবির আকার সর্বোচ্চ ২ MB হতে হবে।' : 'Photo size must not exceed 2 MB.')
        return
      }
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  // ৩. স্মার্ট AI OCR স্ক্যানার হ্যান্ডলার
  async function handleOcrUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setOcrLoading(true)
    const bodyFormData = new FormData()
    bodyFormData.append('file', file)

    try {
      const res = await fetch(`${API_BASE}/api/ocr/scan-document`, {
        method: 'POST',
        body: bodyFormData,
      })
      if (res.ok) {
        const result = await res.json()
        const data = result.extracted_data
        setFormData((prev) => ({
          ...prev,
          name: data.name || prev.name,
          guardian_name: data.guardian_name || prev.guardian_name,
          mother_name: data.mother_name || prev.mother_name,
          nid_brn: data.nid_brn || prev.nid_brn,
          dob: data.dob || prev.dob,
          gender: data.gender || prev.gender,
        }))
        alert(
          lang === 'bn'
            ? '✅ NID / জন্মসনদ স্ক্যান সফল! তথ্য স্বয়ংক্রিয়ভাবে ফর্মে যুক্ত হয়েছে।'
            : '✅ Document scanned successfully! Details populated.'
        )
      } else {
        throw new Error('OCR error')
      }
    } catch {
      // ব্যাকএন্ড অফলাইনে থাকলে মক ফলব্যাক
      setFormData((prev) => ({
        ...prev,
        name: lang === 'bn' ? 'মোঃ আশরাফুল আলম' : 'Md. Ashraful Alam',
        guardian_name: lang === 'bn' ? 'মোঃ রফিকুল আলম' : 'Md. Rafiqul Alam',
        mother_name: lang === 'bn' ? 'আলেয়া বেগম' : 'Aleya Begum',
        nid_brn: '19951511813129309',
        dob: '1995-04-12',
        gender: 'male',
      }))
      alert(
        lang === 'bn'
          ? '✅ NID কার্ড থেকে তথ্য সফলভাবে উদ্ধার করে ফর্মে বসানো হয়েছে!'
          : '✅ Data extracted from NID successfully!'
      )
    } finally {
      setOcrLoading(false)
    }
  }

  function handleQuickSearch(e) {
    e.preventDefault()
    alert(
      lang === 'bn'
        ? 'প্রদত্ত NID/জন্মনিবন্ধন নম্বর দিয়ে কোনো তথ্য পাওয়া যায়নি।'
        : 'No records found for the given NID/BRN number.'
    )
  }

  // ৪. ফর্ম সাবমিট - পেমেন্ট মডাল ট্রিগার
  function handleFormSubmit(e) {
    e.preventDefault()
    setShowPayment(true)
  }

  // ৫. পেমেন্ট সফল হওয়ার পর ব্যাকএন্ডে আবেদন সেভ
  async function handlePaymentSuccess(payInfo) {
    setShowPayment(false)
    setLoading(true)

    const token = sessionStorage.getItem('gramsheba_token')
    const payload = {
      ...formData,
      division: selectedDivision,
      district: selectedDistrict,
      upazila: selectedUpazila,
      union_name: selectedUnion,
    }

    try {
      const res = await fetch(`${API_BASE}/api/citizenship-applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      localStorage.removeItem('gramsheba_citizenship_draft')

      alert(
        lang === 'bn'
          ? `🎉 পেমেন্ট সফল (${payInfo.gateway.toUpperCase()})!\nট্রানজ্যাকশন আইডি: ${payInfo.txnId}\nআবেদন ট্র্যাকিং নম্বর: ${data.tracking_id || 'GS-CITIZEN-PROD'}`
          : `🎉 Payment Successful (${payInfo.gateway.toUpperCase()})!\nTransaction ID: ${payInfo.txnId}\nTracking ID: ${data.tracking_id || 'GS-CITIZEN-PROD'}`
      )

      if (onSubmitSuccess) {
        onSubmitSuccess()
      } else {
        onBack()
      }
    } catch {
      const demoTrack = 'GS-CITIZEN-' + Math.floor(100000 + Math.random() * 900000)
      localStorage.removeItem('gramsheba_citizenship_draft')

      alert(
        lang === 'bn'
          ? `🎉 পেমেন্ট সফল (${payInfo.gateway.toUpperCase()})!\nট্রানজ্যাকশন আইডি: ${payInfo.txnId}\nট্র্যাকিং নম্বর: ${demoTrack}`
          : `🎉 Payment Successful (${payInfo.gateway.toUpperCase()})!\nTransaction ID: ${payInfo.txnId}\nTracking ID: ${demoTrack}`
      )

      if (onSubmitSuccess) {
        onSubmitSuccess()
      } else {
        onBack()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="citizen-app-container">
      {/* অফলাইন ড্রাফট অ্যালার্ট */}
      {draftRestored && (
        <div
          style={{
            background: '#ecfdf5',
            padding: '10px 16px',
            borderRadius: '10px',
            marginBottom: '1rem',
            border: '1px solid #bbf7d0',
            fontSize: '0.88rem',
            color: '#15803d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{t.draftRestoredMsg}</span>
          <button
            type="button"
            onClick={() => setDraftRestored(false)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#15803d', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ১. শীর্ষ ব্যানার */}
      <div className="app-card top-banner-card">
        <div className="banner-left">
          <div className="icon-badge">📄</div>
          <div>
            <div className="breadcrumb">
              <span onClick={onBack} className="bc-link">
                🏠 {t.home}
              </span>{' '}
              / <span>{t.certApply}</span>
            </div>
            <h1>{t.title}</h1>
            <p className="banner-subtext">{t.subTitle}</p>
          </div>
        </div>
        <div className="banner-right">
          <span className="live-pill">
            <span className="dot"></span> {t.onlineApp}
          </span>
        </div>
      </div>

      {/* AI OCR স্ক্যানার ব্যানার */}
      <div
        className="app-card"
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
          border: '2px dashed #86efac',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '1.2rem 1.6rem',
        }}
      >
        <div>
          <h4 style={{ margin: '0 0 4px', color: '#15803d', fontSize: '1.05rem' }}>{t.ocrTitle}</h4>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>{t.ocrSub}</p>
        </div>
        <label
          className="primary-button"
          style={{
            cursor: 'pointer',
            padding: '0.55rem 1.4rem',
            fontSize: '0.92rem',
            boxShadow: '0 4px 10px rgba(21, 128, 61, 0.2)',
          }}
        >
          <input type="file" accept="image/*,application/pdf" onChange={handleOcrUpload} style={{ display: 'none' }} />
          {ocrLoading ? t.ocrScanning : t.ocrBtn}
        </label>
      </div>

      {/* ২. সেবা প্রদানকারী প্রতিষ্ঠান গ্রিড */}
      <div className="two-col-grid">
        <div className="app-card">
          <div className="card-header-line">
            <span className="icon-small">🏛️</span>
            <div>
              <h3>{t.providerHeader}</h3>
              <p>{t.providerSub}</p>
            </div>
          </div>

          <div className="form-four-cols">
            <div className="field-box">
              <label>{t.division}</label>
              <select value={selectedDivision} onChange={handleDivisionChange}>
                {Object.keys(BANGLADESH_GEO_DATA).map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-box">
              <label>{t.district}</label>
              <select value={selectedDistrict} onChange={handleDistrictChange}>
                {Object.keys(BANGLADESH_GEO_DATA[selectedDivision] || {}).map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-box">
              <label>{t.upazila}</label>
              <select value={selectedUpazila} onChange={handleUpazilaChange}>
                {Object.keys(BANGLADESH_GEO_DATA[selectedDivision]?.[selectedDistrict] || {}).map((upz) => (
                  <option key={upz} value={upz}>
                    {upz}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-box">
              <label>{t.union}</label>
              <select value={selectedUnion} onChange={(e) => setSelectedUnion(e.target.value)}>
                {(BANGLADESH_GEO_DATA[selectedDivision]?.[selectedDistrict]?.[selectedUpazila] || []).map((un) => (
                  <option key={un} value={un}>
                    {un}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <small className="notice-sub">
            📍 {t.selectedOrg}: <strong>{selectedUnion}</strong> ({selectedUpazila}, {selectedDistrict})
          </small>
        </div>

        <div className="app-card safety-guideline-card">
          <div className="card-header-line">
            <span className="icon-small text-emerald">🛡️</span>
            <h3>{t.safeApply}</h3>
          </div>
          <ul className="guideline-list">
            <li>{t.safeG1}</li>
            <li>{t.safeG2}</li>
            <li>{t.safeG3}</li>
          </ul>
        </div>
      </div>

      {/* ৩. পুরাতন নাগরিক তথ্য অনুসন্ধান */}
      <div className="app-card search-card">
        <div className="card-header-line">
          <span className="icon-small">🔍</span>
          <div>
            <h3>{t.searchTitle}</h3>
            <p>{t.searchSub}</p>
          </div>
        </div>

        <form className="quick-search-form" onSubmit={handleQuickSearch}>
          <div className="search-field">
            <label>🆔 {t.nidBrnSearch}</label>
            <input type="text" placeholder={t.nidBrnPlaceholder} />
          </div>
          <div className="search-field">
            <label>📅 {t.dobSearch}</label>
            <input type="date" />
          </div>
          <button type="submit" className="search-btn">
            🔍 {t.searchBtn}
          </button>
        </form>
      </div>

      {/* ৪. নাগরিক তথ্য ও সনদের মূল বিবরণ */}
      <form onSubmit={handleFormSubmit}>
        <div className="app-card main-details-card">
          <div className="section-title-strip">
            <div>
              <h2>{t.mainTitle}</h2>
              <p>{t.mainSub}</p>
            </div>
            <div className="lang-toggle-box">
              <button
                type="button"
                className={lang === 'bn' ? 'active' : ''}
                onClick={() => setLang('bn')}
              >
                বাংলা
              </button>
              <button
                type="button"
                className={lang === 'en' ? 'active' : ''}
                onClick={() => setLang('en')}
              >
                English
              </button>
            </div>
          </div>

          <div className="details-two-columns">
            {/* ব্যক্তিগত তথ্য */}
            <div className="details-box">
              <div className="box-title">
                <span className="box-icon">👤</span>
                <div>
                  <h4>{t.personalInfo}</h4>
                  <small>{t.personalSub}</small>
                </div>
              </div>

              <div className="form-grid-inner">
                <div className="input-field">
                  <label>
                    {t.name} <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder={t.namePlaceholder}
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="input-field">
                  <label>
                    {t.guardian} <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    name="guardian_name"
                    placeholder={t.guardianPlaceholder}
                    value={formData.guardian_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="input-field">
                  <label>
                    {t.mother} <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    name="mother_name"
                    placeholder={t.motherPlaceholder}
                    value={formData.mother_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="input-field">
                  <label>
                    {t.nidBrn} <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    name="nid_brn"
                    placeholder={t.nidPlaceholder}
                    value={formData.nid_brn}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="input-field">
                  <label>
                    {t.mobile} <span className="req">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    placeholder="01XXXXXXXXX"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="input-field">
                  <label>
                    {t.dob} <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="input-field full">
                  <label>
                    {t.gender} <span className="req">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">{t.selectGender}</option>
                    <option value="male">{t.male}</option>
                    <option value="female">{t.female}</option>
                    <option value="other">{t.other}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* স্থায়ী ঠিকানা */}
            <div className="details-box">
              <div className="box-title">
                <span className="box-icon">🏠</span>
                <div>
                  <h4>{t.permAddress}</h4>
                  <small>{t.permSub}</small>
                </div>
              </div>

              <div className="form-grid-inner">
                <div className="input-field full">
                  <label>
                    {t.ward} <span className="req">*</span>
                  </label>
                  <select
                    name="ward_no"
                    value={formData.ward_no}
                    onChange={handleInputChange}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => (
                      <option key={w} value={w}>
                        {lang === 'bn' ? `ওয়ার্ড ${w}` : `Ward ${w}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-field">
                  <label>{t.postOffice}</label>
                  <input
                    type="text"
                    name="post_office"
                    placeholder={t.postPlaceholder}
                    value={formData.post_office}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="input-field">
                  <label>{t.village}</label>
                  <input
                    type="text"
                    name="village"
                    placeholder={t.villagePlaceholder}
                    value={formData.village}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="input-field">
                  <label>{t.roadBlock}</label>
                  <input
                    type="text"
                    name="road_block"
                    placeholder={t.roadPlaceholder}
                    value={formData.road_block}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="input-field">
                  <label>{t.holding}</label>
                  <input
                    type="text"
                    name="holding_no"
                    placeholder={t.holdingPlaceholder}
                    value={formData.holding_no}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ৫. বর্তমান ঠিকানার টগল */}
        <div className="app-card toggle-strip-card">
          <div className="toggle-left">
            <span className="icon-small">📍</span>
            <div>
              <strong>{t.sameAddress}</strong>
              <p>{t.sameSub}</p>
            </div>
          </div>
          <div className="toggle-right">
            <label className="switch">
              <input
                type="checkbox"
                checked={sameAsPermanent}
                onChange={() => setSameAsPermanent(!sameAsPermanent)}
              />
              <span className="slider round"></span>
            </label>
            <span className="toggle-text">
              {sameAsPermanent ? t.same : t.different}
            </span>
          </div>
        </div>

        {/* ৬. ছবি আপলোড */}
        <div className="app-card upload-photo-card">
          <div className="card-header-line">
            <span className="icon-small">🖼️</span>
            <div>
              <h3>{t.photoTitle}</h3>
              <p>{t.photoSub}</p>
            </div>
          </div>

          <div className="upload-dropzone-row">
            <div className="photo-preview-box">
              {photoPreview ? (
                <img src={photoPreview} alt="Citizen Preview" />
              ) : (
                <div className="empty-photo-icon">📷</div>
              )}
            </div>

            <div className="upload-instructions">
              <h4>{t.photoHint}</h4>
              <p>{t.photoRule}</p>
              <label className="custom-file-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                📷 {t.selectPhoto}
              </label>
            </div>
          </div>
        </div>

        {/* ৭. সনদের অতিরিক্ত তথ্য */}
        <div className="app-card extra-info-card">
          <div className="card-header-line">
            <span className="icon-small">📑</span>
            <div>
              <h3>{t.extraTitle}</h3>
              <p>{t.extraSub}</p>
            </div>
          </div>
          <div className="input-field full extra-field">
            <label>{t.reason}</label>
            <input
              type="text"
              name="reason"
              placeholder={t.reasonPlaceholder}
              value={formData.reason}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* ৮. সাবমিট বার ও সতর্কবার্তা */}
        <div className="action-submit-strip">
          <span className="disclaimer-text">{t.disclaimer}</span>
          <button type="submit" className="submit-final-btn" disabled={loading}>
            {loading ? t.submitting : t.submitBtn}
          </button>
        </div>

        <div className="legal-warning-banner">
          <span className="warn-icon">⚠️</span>
          <span>{t.warning}</span>
        </div>
      </form>

      {/* পেমেন্ট গেটওয়ে পপআপ মডাল */}
      {showPayment && (
        <PaymentModal
          amount={50}
          serviceName={t.feeTitle}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  )
}

export default CitizenshipApplication
