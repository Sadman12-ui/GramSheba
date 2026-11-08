import React, { useState } from 'react';

export default function CitizenAccessibility() {
  const [holdingType, setHoldingType] = useState('pucka');
  const [rooms, setRooms] = useState(2);
  const [businessType, setBusinessType] = useState('grocery');
  const [capital, setCapital] = useState(50000);

  // Bangla Text-to-Speech Engine
  const speakInstruction = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'bn-BD';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("আপনার ব্রাউজারে স্পিচ অডিও সাপোর্ট নেই।");
    }
  };

  // Holding Tax Calculation Formula
  const calculateHoldingTax = () => {
    const ratePerRoom = holdingType === 'pucka' ? 250 : holdingType === 'semi' ? 150 : 80;
    return rooms * ratePerRoom;
  };

  // Trade License Calculation Formula
  const calculateTradeFee = () => {
    let base = businessType === 'grocery' ? 500 : businessType === 'pharmacy' ? 1000 : 1500;
    if (capital > 100000) base += 500;
    const vat = Math.round(base * 0.15);
    return { base, vat, total: base + vat };
  };

  const tradeFee = calculateTradeFee();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
      
      {/* 1. Voice Guidance Helper */}
      <div className="bg-gradient-to-br from-emerald-900 to-teal-800 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="p-3 bg-white/10 rounded-xl text-2xl">🔊</span>
            <div>
              <h3 className="font-bold text-lg">ডিজিটাল বাংলা ভয়েস সহকারী</h3>
              <p className="text-xs text-emerald-200">নির্দেশনা শুনতে বাটনে চাপ দিন</p>
            </div>
          </div>
          <p className="text-sm text-emerald-100 leading-relaxed mb-6">
            ফর্ম পূরণের নিয়ম বা প্রয়োজনীয় কাগজপত্র বুঝতে অসুবিধা হলে ডিজিটাল সহকারীর অডিও শুনুন।
          </p>

          <div className="space-y-2">
            <button
              onClick={() => speakInstruction("নাগরিকত্ব সনদের জন্য আপনার ১৭ ডিজিটের জন্ম নিবন্ধন অথবা জাতীয় পরিচয়পত্র নম্বর এবং চেয়ারম্যান বরাবর ছবি আপলোড করতে হবে।")}
              className="w-full bg-white/15 hover:bg-white/25 text-left px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-between"
            >
              <span>১. নাগরিকত্ব সনদের নিয়ম শুনুন</span>
              <span>▶</span>
            </button>
            <button
              onClick={() => speakInstruction("ট্রেড লাইসেন্স আবেদন করতে দোকানের ভাড়ার চুক্তিপত্র, হোল্ডিং ট্যাক্স রশিদ এবং জাতীয় পরিচয়পত্র প্রয়োজন হবে।")}
              className="w-full bg-white/15 hover:bg-white/25 text-left px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-between"
            >
              <span>২. ট্রেড লাইসেন্স নির্দেশিকা শুনুন</span>
              <span>▶</span>
            </button>
            <button
              onClick={() => speakInstruction("ওয়ারিশ সনদের ক্ষেত্রে মৃত ব্যক্তির মৃত্যুর সনদ এবং সকল বৈধ ওয়ারিশগণের জাতীয় পরিচয়পত্র অবশ্যই জমা দিতে হবে।")}
              className="w-full bg-white/15 hover:bg-white/25 text-left px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-between"
            >
              <span>৩. ওয়ারিশ সনদ আবেদনের নিয়ম</span>
              <span>▶</span>
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 text-xs text-emerald-300">
          💡 বিশেষ সহায়ক ফিচার: প্রবীণ ও দৃষ্টিপ্রতিবন্ধী নাগরিকদের সহজে সেবা পাওয়ার জন্য।
        </div>
      </div>

      {/* 2. Automated Fee Calculator */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="p-3 bg-amber-50 text-amber-600 rounded-xl text-2xl font-bold">৳</span>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">সরকারি ফি ক্যালকুলেটর</h3>
            <p className="text-xs text-gray-500">ইউপি প্রবিধানমালা অনুযায়ী সঠিক ফি যাচাই</p>
          </div>
        </div>

        {/* Tabs / Selectors */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">বাড়ির ধরন (হোল্ডিং ট্যাক্স):</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setHoldingType('pucka')} 
                className={`py-1.5 px-3 text-xs rounded-lg border font-medium transition ${holdingType === 'pucka' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700'}`}
              >
                পাকা ভবন
              </button>
              <button 
                onClick={() => setHoldingType('semi')} 
                className={`py-1.5 px-3 text-xs rounded-lg border font-medium transition ${holdingType === 'semi' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700'}`}
              >
                আধা-পাকা
              </button>
              <button 
                onClick={() => setHoldingType('katcha')} 
                className={`py-1.5 px-3 text-xs rounded-lg border font-medium transition ${holdingType === 'katcha' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700'}`}
              >
                কাঁচা ঘর
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div>
              <span className="text-xs text-gray-500 block">কক্ষের সংখ্যা</span>
              <input 
                type="number" 
                min="1" 
                max="20"
                value={rooms} 
                onChange={(e) => setRooms(parseInt(e.target.value) || 1)}
                className="w-16 border rounded px-2 py-1 text-sm font-bold text-gray-800 mt-1"
              />
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">বার্ষিক হোল্ডিং ট্যাক্স</span>
              <span className="text-lg font-bold text-emerald-700">{calculateHoldingTax()} টাকা</span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <label className="text-xs font-semibold text-gray-600 block mb-1">ব্যবসার ধরন (ট্রেড লাইসেন্স ফি):</label>
            <select 
              value={businessType} 
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-xs bg-white text-gray-800"
            >
              <option value="grocery">মুদি ও সাধারণ দোকান (ক্ষুদ্র)</option>
              <option value="pharmacy">ফার্মেসি ও চিকিৎসা সরঞ্জাম</option>
              <option value="contractor">ঠিকাদারি ও পাইকারি সরবরাহ</option>
            </select>
          </div>

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex justify-between items-center text-xs">
            <div>
              <span className="text-amber-900 font-semibold block">ট্রেড লাইসেন্স সরকারি ফি</span>
              <span className="text-amber-700">মূল ফি: {tradeFee.base}৳ + ১৫% ভ্যাট: {tradeFee.vat}৳</span>
            </div>
            <div className="text-right text-base font-bold text-amber-900">
              মোট: {tradeFee.total} ৳
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
