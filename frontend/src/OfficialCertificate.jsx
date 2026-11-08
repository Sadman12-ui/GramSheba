import React, { useRef } from 'react';

export default function OfficialCertificate({ certificateData, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    window.print();
  };

  if (!certificateData) return null;

  const {
    certificateType = "নাগরিকত্ব সনদপত্র",
    trackingId = "GS-2026-NID-8849",
    unionName = "১ নং রামপুর ইউনিয়ন পরিষদ",
    upazila = "চাঁদপুর সদর",
    district = "চাঁদপুর",
    holderName = "শাহ মো. সাদমান সাকিব",
    fatherName = "মো. জালাল আহমদ",
    motherName = "মোসা. সালেহা বেগম",
    nidNumber = "19981324567890123",
    village = "রামপুর",
    wardNo = "০৪",
    issueDate = "০৮ নভেম্বর ২০২৬",
    chairmanName = "মো. আল-আমিন ভূঁইয়া"
  } = certificateData;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 my-8">
        
        {/* Action Controls */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm font-semibold text-emerald-800">অফিশিয়াল ভেরিফাইড সনদ প্রিভিউ</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-medium shadow flex items-center gap-2 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              প্রিন্ট / PDF সংরক্ষণ
            </button>
            <button
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>

        {/* Certificate Sheet Area (A4 Styled Printable Frame) */}
        <div 
          ref={printRef}
          className="border-8 border-double border-emerald-900 p-8 sm:p-12 bg-[#fffdf9] relative text-gray-800 font-serif shadow-inner"
          style={{ minHeight: '800px' }}
        >
          {/* Subtle Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
            <div className="w-96 h-96 rounded-full border-[20px] border-emerald-950 flex items-center justify-center">
              <span className="text-5xl font-extrabold text-emerald-950">গণপ্রজাতন্ত্রী বাংলাদেশ</span>
            </div>
          </div>

          {/* Official Header */}
          <div className="text-center relative z-10 border-b-2 border-emerald-800 pb-5 mb-6">
            <p className="text-sm font-semibold tracking-wide text-gray-700">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-emerald-900 mt-1">{unionName}</h1>
            <p className="text-sm text-gray-600 mt-0.5">উপজেলা: {upazila}, জেলা: {district}</p>
            <div className="inline-block mt-4 bg-emerald-900 text-amber-300 font-bold px-6 py-1.5 rounded-full text-lg shadow-sm">
              {certificateType}
            </div>
          </div>

          {/* Metadata Bar */}
          <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-8 px-2">
            <div><strong>সনদ নং:</strong> <span className="font-mono text-emerald-900 font-bold">{trackingId}</span></div>
            <div><strong>ইস্যুর তারিখ:</strong> {issueDate}</div>
          </div>

          {/* Certificate Body Paragraph */}
          <div className="space-y-5 text-base sm:text-lg leading-relaxed text-justify px-2 relative z-10">
            <p>
              এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, <strong className="text-emerald-950 border-b border-dotted border-gray-600">{holderName}</strong>, 
              পিতা: <strong className="text-emerald-950">{fatherName}</strong>, 
              মাতা: <strong className="text-emerald-950">{motherName}</strong>, 
              গ্রাম: <strong className="text-emerald-950">{village}</strong>, 
              ওয়ার্ড নং: <strong className="text-emerald-950">{wardNo}</strong>, 
              পোস্ট ও উপজেলা: {upazila}, জেলা: {district}—উক্ত ইউনিয়ন পরিষদের একজন স্থায়ী ও নিয়মিত বাসিন্দা।
            </p>
            <p>
              জাতীয় পরিচয়পত্র / নিবন্ধন নম্বর: <span className="font-mono font-bold text-emerald-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{nidNumber}</span>। 
              আমার জানামতে তিনি জন্মসূত্রে বাংলাদেশের নাগরিক এবং রাষ্ট্রবিরোধী বা সমাজবিরোধী কোনো কর্মকাণ্ডের সাথে জড়িত নন।
            </p>
            <p>
              আমি তাঁর সর্বাঙ্গীন সামাজিক, অর্থনৈতিক ও ব্যক্তিগত জীবনের সার্বিক কল্যাণ ও মঙ্গল কামনা করি।
            </p>
          </div>

          {/* Verification QR & Digital Signatures */}
          <div className="mt-16 pt-8 border-t border-gray-300 flex justify-between items-end relative z-10 px-2">
            {/* Live Verification Box */}
            <div className="flex items-center gap-3 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://gramsheba-backend.onrender.com/api/public/verify/${trackingId}`} 
                alt="QR Verification"
                className="w-20 h-20 bg-white p-1 border rounded shadow-sm"
              />
              <div className="text-xs text-emerald-900 leading-tight">
                <p className="font-bold">ডিজিটাল সত্যতা যাচাই</p>
                <p className="text-gray-500 mt-1">স্ক্যান করে পোর্টালে সরাসরি সনদের বৈধতা ও স্ট্যাটাস যাচাই করুন।</p>
              </div>
            </div>

            {/* Authority Signatures */}
            <div className="flex gap-12 text-center">
              <div>
                <div className="w-32 border-b border-gray-600 mb-1"></div>
                <p className="text-xs text-gray-500">ইউপি সচিবের স্বাক্ষর</p>
              </div>
              <div className="relative">
                {/* Official Stamp Vector */}
                <div className="absolute -top-10 left-3 w-20 h-20 rounded-full border-2 border-dashed border-emerald-700/40 flex items-center justify-center rotate-12 pointer-events-none">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-tighter">সিলমোহর অনুমোদিত</span>
                </div>
                <div className="w-36 border-b-2 border-emerald-900 mb-1 text-emerald-900 font-bold text-sm">
                  {chairmanName}
                </div>
                <p className="text-xs font-bold text-emerald-900">চেয়ারম্যান</p>
                <p className="text-[11px] text-gray-500">{unionName}</p>
              </div>
            </div>
          </div>

          {/* Footer Warning */}
          <div className="mt-8 text-center text-[10px] text-gray-400">
            * এটি একটি ইলেকট্রনিকভাবে উৎপন্ন সরকারি ডিজিটাল সনদ। এতে কোনো কাটাকাটি বা ওভাররাইটিং আইনত দণ্ডনীয়।
          </div>
        </div>

      </div>
    </div>
  );
}
