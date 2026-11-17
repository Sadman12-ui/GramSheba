import { API_BASE } from './api'
import React, { useState } from 'react';

export default function UnionRegistration({ onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ফরম স্টেট (৩টি ধাপের ডেটা)
  const [formData, setFormData] = useState({
    // ধাপ ১: প্রশাসনিক কর্মকর্তা তথ্য
    adminName: '',
    adminPhone: '',
    adminEmail: '',
    adminPassword: '',

    // ধাপ ২: হিসাব সহকারী/উদ্যোক্তার তথ্য
    assistantName: '',
    assistantPhone: '',
    assistantNid: '',
    assistantDesignation: 'হিসাব সহকারী কাম কম্পিউটার অপারেটর',

    // ধাপ ৩: এলাকা ও পরিষদ তথ্য
    division: 'চট্টগ্রাম',
    district: 'চাঁদপুর',
    upazila: 'চাঁদপুর সদর',
    unionName: '',
    unionCode: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleNext = (e) => {
    e.preventDefault();
    setErrorMsg('');

    // ধাপ ১ ভ্যালিডেশন
    if (currentStep === 1) {
      if (!formData.adminName || !formData.adminPhone || !formData.adminEmail || !formData.adminPassword) {
        setErrorMsg('অনুগ্রহ করে সকল তারকাচিহ্নিত (*) ঘরগুলো পূরণ করুন।');
        return;
      }
      if (formData.adminPhone.length < 11) {
        setErrorMsg('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।');
        return;
      }
      if (formData.adminPassword.length < 8) {
        setErrorMsg('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
        return;
      }
      setCurrentStep(2);
    }
    // ধাপ ২ ভ্যালিডেশন
    else if (currentStep === 2) {
      if (!formData.assistantName || !formData.assistantPhone) {
        setErrorMsg('হিসাব সহকারী বা উদ্যোক্তার নাম ও মোবাইল নম্বর প্রদান করুন।');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrorMsg('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.unionName || !formData.unionCode) {
      setErrorMsg('ইউনিয়ন পরিষদের নাম ও ইউনিয়ন কোড দেওয়া আবশ্যক।');
      return;
    }

    setLoading(true);

    try {

      const token = sessionStorage.getItem('gramsheba_token');
      const user = JSON.parse(sessionStorage.getItem('gramsheba_user') || 'null');
      if (!token || user?.role !== 'super_admin') {
        throw new Error('নিরাপত্তার জন্য শুধুমাত্র Super Admin নতুন ইউনিয়ন ও Union Admin তৈরি করতে পারবেন।');
      }
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // Avoid creating a duplicate union if the code already exists.
      const listResponse = await fetch(`${API_BASE}/api/super-admin/unions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listData = await listResponse.json();
      if (!listResponse.ok) throw new Error(listData.detail || 'ইউনিয়নের তালিকা পাওয়া যায়নি।');

      const normalizedCode = formData.unionCode.trim().toUpperCase();
      let union = listData.find((item) => item.code?.toUpperCase() === normalizedCode);
      if (!union) {
        const unionResponse = await fetch(`${API_BASE}/api/super-admin/unions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: formData.unionName.trim(),
            code: normalizedCode,
          }),
        });
        const unionData = await unionResponse.json();
        if (!unionResponse.ok) throw new Error(unionData.detail || 'ইউনিয়ন তৈরি করা যায়নি।');
        union = unionData;
      }

      const adminResponse = await fetch(`${API_BASE}/api/super-admin/create-admin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          full_name: formData.adminName.trim(),
          email: formData.adminEmail.trim().toLowerCase(),
          phone: formData.adminPhone.trim(),
          password: formData.adminPassword,
          area: `${formData.unionName}, ${formData.upazila}, ${formData.district}`,
          union_id: union.id,
        }),
      });
      const adminData = await adminResponse.json();
      if (!adminResponse.ok) throw new Error(adminData.detail || 'Union Admin তৈরি করা যায়নি।');

      alert('অভিনন্দন! ইউনিয়ন পরিষদ ও প্রশাসনিক কর্মকর্তার নিবন্ধন সফল হয়েছে। এখন লগইন করতে পারবেন।');
      if (onSuccess) onSuccess();
      if (onClose) onClose();

    } catch (err) {
      setErrorMsg(err.message || 'সার্ভারে সংযোগ বিচ্ছিন্ন। পরে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-100 my-6">
        
        {/* উপরের সরকারি হেডার ব্যানার */}
        <div className="bg-gradient-to-b from-[#2ea879] to-[#208a61] px-6 py-8 text-center text-white relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-5 text-white/80 hover:text-white text-2xl font-bold transition"
            >
              ✕
            </button>
          )}

          {/* সরকারি মনোগ্রাম / আইকন */}
          <div className="text-4xl mb-3 flex justify-center drop-shadow">
            🏛️
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide mb-3 font-serif">
            ইউনিয়ন পরিষদ নিবন্ধন
          </h2>

          <div className="text-red-300 text-xs sm:text-sm font-semibold max-w-xl mx-auto leading-relaxed bg-black/15 p-3 rounded-xl border border-red-400/30">
            <p>ইউনিয়ন পরিষদ কার্যালয়ের কর্মকর্তা/ কর্মচারী ব্যতীত, অন্য কোন ব্যক্তি/প্রতিষ্ঠান আবেদন করা সম্পূর্ণ নিষিদ্ধ।</p>
            <p className="mt-0.5">কোন ভুল তথ্য প্রদান করিলে আপনার বিরুদ্ধে আইনগত ব্যবস্থা গ্রহণ করা হবে।</p>
          </div>
        </div>

        {/* ৩-ধাপের স্টেপার প্রগ্রেস বার */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            
            {/* ধাপ ১ */}
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base transition-all duration-300 ${
                  currentStep >= 1
                    ? 'bg-[#1b734e] text-white shadow-md ring-4 ring-emerald-100'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                ১
              </div>
              <span
                className={`text-xs sm:text-sm font-bold mt-2 text-center ${
                  currentStep === 1 ? 'text-[#1b734e]' : 'text-gray-500'
                }`}
              >
                প্রশাসনিক কর্মকর্তা
              </span>
            </div>

            <div className={`h-0.5 flex-1 mx-2 transition-all duration-300 ${currentStep >= 2 ? 'bg-[#1b734e]' : 'bg-gray-200'}`}></div>

            {/* ধাপ ২ */}
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base transition-all duration-300 ${
                  currentStep >= 2
                    ? 'bg-[#1b734e] text-white shadow-md ring-4 ring-emerald-100'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                ২
              </div>
              <span
                className={`text-xs sm:text-sm font-bold mt-2 text-center ${
                  currentStep === 2 ? 'text-[#1b734e]' : 'text-gray-500'
                }`}
              >
                হিসাব সহকারী/উদ্যোক্তার তথ্য
              </span>
            </div>

            <div className={`h-0.5 flex-1 mx-2 transition-all duration-300 ${currentStep === 3 ? 'bg-[#1b734e]' : 'bg-gray-200'}`}></div>

            {/* ধাপ ৩ */}
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base transition-all duration-300 ${
                  currentStep === 3
                    ? 'bg-[#1b734e] text-white shadow-md ring-4 ring-emerald-100'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                ৩
              </div>
              <span
                className={`text-xs sm:text-sm font-bold mt-2 text-center ${
                  currentStep === 3 ? 'text-[#1b734e]' : 'text-gray-500'
                }`}
              >
                এলাকা
              </span>
            </div>

          </div>
        </div>

        {/* এরর মেসেজ বক্স */}
        {errorMsg && (
          <div className="mx-8 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ফর্ম কন্টেন্ট */}
        <div className="p-8">
          
          {/* ======================= ধাপ ১ ======================= */}
          {currentStep === 1 && (
            <form onSubmit={handleNext} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-[#1b734e]">প্রশাসনিক কর্মকর্তা তথ্য</h3>
                <p className="text-sm text-gray-500 mt-0.5">লগইনে এই তথ্য ব্যবহার হবে</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    নাম (বাংলায়) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="adminName"
                    value={formData.adminName}
                    onChange={handleChange}
                    placeholder="বাংলা নাম লিখুন"
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    মোবাইল নম্বর <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="adminPhone"
                    value={formData.adminPhone}
                    onChange={handleChange}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    ই-মেইল <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="adminEmail"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    পাসওয়ার্ড <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="adminPassword"
                    value={formData.adminPassword}
                    onChange={handleChange}
                    placeholder="•••••••• (কমপক্ষে ৮ অক্ষর)"
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="bg-[#1b734e] hover:bg-[#145d3e] text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  পরবর্তী →
                </button>
              </div>
            </form>
          )}

          {/* ======================= ধাপ ২ ======================= */}
          {currentStep === 2 && (
            <form onSubmit={handleNext} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-[#1b734e]">হিসাব সহকারী / উদ্যোক্তার তথ্য</h3>
                <p className="text-sm text-gray-500 mt-0.5">ডিজিটাল সেবা সেন্টারের দায়িত্বপ্রাপ্ত ব্যক্তির বিবরণ</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    হিসাব সহকারী / উদ্যোক্তার নাম <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="assistantName"
                    value={formData.assistantName}
                    onChange={handleChange}
                    placeholder="পূর্ণ নাম লিখুন"
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    মোবাইল নম্বর <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="assistantPhone"
                    value={formData.assistantPhone}
                    onChange={handleChange}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    জাতীয় পরিচয়পত্র (NID) নম্বর
                  </label>
                  <input
                    type="text"
                    name="assistantNid"
                    value={formData.assistantNid}
                    onChange={handleChange}
                    placeholder="১০ অথবা ১৭ ডিজিটের এনআইডি"
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    পদবী
                  </label>
                  <select
                    name="assistantDesignation"
                    value={formData.assistantDesignation}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800"
                  >
                    <option value="হিসাব সহকারী কাম কম্পিউটার অপারেটর">হিসাব সহকারী কাম কম্পিউটার অপারেটর</option>
                    <option value="ইউপি ডিজিটাল সেন্টার উদ্যোক্তা">ইউপি ডিজিটাল সেন্টার উদ্যোক্তা</option>
                    <option value="অফিস সহকারী">অফিস সহকারী</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-bold transition"
                >
                  ← পূর্ববর্তী
                </button>
                <button
                  type="submit"
                  className="bg-[#1b734e] hover:bg-[#145d3e] text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  পরবর্তী →
                </button>
              </div>
            </form>
          )}

          {/* ======================= ধাপ ৩ ======================= */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-[#1b734e]">এলাকা ও পরিষদ তথ্য</h3>
                <p className="text-sm text-gray-500 mt-0.5">ইউনিয়ন পরিষদের ভৌগোলিক ঠিকানা ও অফিশিয়াল কোড</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    বিভাগ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="division"
                    value={formData.division}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    জেলা <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    উপজেলা <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="upazila"
                    value={formData.upazila}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    ইউনিয়ন পরিষদের নাম <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="unionName"
                    value={formData.unionName}
                    onChange={handleChange}
                    placeholder="যেমন: ১ নং রামপুর ইউনিয়ন পরিষদ"
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    ইউনিয়ন অফিশিয়াল কোড (Union Code) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="unionCode"
                    value={formData.unionCode}
                    onChange={handleChange}
                    placeholder="যেমন: RAMPUR01"
                    className="w-full px-4 py-3 border border-emerald-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-800 font-mono tracking-wider uppercase font-bold"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    * এই কোডটি সুপার অ্যাডমিন কর্তৃক প্রদত্ত অথবা ডেটাবেসের নিবন্ধিত কোড হতে হবে।
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-bold transition"
                >
                  ← পূর্ববর্তী
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#1b734e] hover:bg-[#145d3e] text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? 'নিবন্ধন সম্পন্ন হচ্ছে...' : 'নিবন্ধন সম্পন্ন করুন ✓'}
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
