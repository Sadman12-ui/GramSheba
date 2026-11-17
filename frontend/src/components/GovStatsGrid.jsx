import React, { useState } from 'react';

// বিস্তারিত সরকারি প্রশাসনিক ডেটা
const govDetailedData = {
  ministries: {
    title: "৫৭টি মন্ত্রণালয় ও বিভাগ",
    description: "গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের কেন্দ্রীয় নীতি-নির্ধারণী সচিবালয় শাখা।",
    items: [
      "স্থানীয় সরকার, পল্লী উন্নয়ন ও সমবায় মন্ত্রণালয় (LGRD)",
      "মন্ত্রিপরিষদ বিভাগ (Cabinet Division)",
      "জনপ্রশাসন মন্ত্রণালয় (Ministry of Public Administration)",
      "স্বরাষ্ট্র মন্ত্রণালয় (সুরক্ষা সেবা ও জননিরাপত্তা বিভাগ)",
      "অর্থ মন্ত্রণালয় (অর্থ বিভাগ, অভ্যন্তরীণ সম্পদ বিভাগ, ইআরডি)",
      "তথ্য ও যোগাযোগ প্রযুক্তি বিভাগ (ICT Division)",
      "স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়",
      "শিক্ষা মন্ত্রণালয় (মাধ্যমিক ও উচ্চ শিক্ষা, কারিগরি ও মাদ্রাসা)",
      "ভূমি মন্ত্রণালয় (Ministry of Land)",
      "আইন, বিচার ও সংসদ বিষয়ক মন্ত্রণালয়",
      "পররাষ্ট্র মন্ত্রণালয়",
      "কৃষি মন্ত্রণালয়",
      "বাণিজ্য মন্ত্রণালয়",
      "সমাজকল্যাণ মন্ত্রণালয়",
      "মহিলা ও শিশু বিষয়ক মন্ত্রণালয়",
      "ডাক, টেলিযোগাযোগ ও তথ্যপ্রযুক্তি মন্ত্রণালয়",
      "খাদ্য মন্ত্রণালয়",
      "দুর্যোগ ব্যবস্থাপনা ও ত্রাণ মন্ত্রণালয়",
      "গৃহায়ন ও গণপূর্ত মন্ত্রণালয়",
      "পরিকল্পনা মন্ত্রণালয়"
    ],
    note: "এবং অন্যান্য সকল বিশেষায়িত সাংবিধানিক ও প্রশাসনিক মন্ত্রণালয়।"
  },
  directorates: {
    title: "৭২টি অধিদপ্তর (Directorates)",
    description: "মাঠ পর্যায়ে সরকারি নীতিমালা ও নাগরিক সেবা বাস্তবায়নকারী প্রধান অধিদপ্তরসমূহ।",
    items: [
      "রেজিস্ট্রার জেনারেলের কার্যালয়, জন্ম ও মৃত্যু নিবন্ধন (BDRIS)",
      "স্থানীয় সরকার প্রকৌশল অধিদপ্তর (LGED)",
      "জাতীয় পরিচয় নিবন্ধন অনুবিভাগ (NID Wing)",
      "ভূমি রেকর্ড ও জরিপ অধিদপ্তর (DLRS)",
      "স্বাস্থ্য অধিদপ্তর (DGHS)",
      "মাধ্যমিক ও উচ্চশিক্ষা অধিদপ্তর (DSHE)",
      "প্রাথমিক শিক্ষা অধিদপ্তর (DPE)",
      "সমাজসেবা অধিদপ্তর (DSS)",
      "কৃষি সম্প্রসারণ অধিদপ্তর (DAE)",
      "মৎস্য অধিদপ্তর (DoF)",
      "প্রাণিসম্পদ অধিদপ্তর (DLS)",
      "পরিবার পরিকল্পনা অধিদপ্তর (DGFP)",
      "মাদকদ্রব্য নিয়ন্ত্রণ অধিদপ্তর (DNC)",
      "জাতীয় ভোক্তা-অধিকার সংরক্ষণ অধিদপ্তর (DNCRP)"
    ],
    note: "এবং সরকারের সংশ্লিষ্ট অন্যান্য নির্বাহী দপ্তর ও পরিদপ্তর।"
  },
  other_offices: {
    title: "৫৬৬টি অন্যান্য স্বায়ত্তশাসিত ও বিশেষায়িত অফিস",
    description: "সংবিধিবদ্ধ সংস্থা, বোর্ড, কমিশন ও স্বায়ত্তশাসিত রাষ্ট্রীয় প্রতিষ্ঠান।",
    items: [
      "বাংলাদেশ পরিসংখ্যান ব্যুরো (BBS)",
      "বাংলাদেশ টেলিযোগাযোগ নিয়ন্ত্রণ কমিশন (BTRC)",
      "জাতীয় রাজস্ব বোর্ড (NBR)",
      "বাংলাদেশ নির্বাচন কমিশন সচিবালয়",
      "পল্লী সঞ্চয় ব্যাংক ও ক্ষুদ্রঋণ নিয়ন্ত্রণ কর্তৃপক্ষ (MRA)",
      "বাংলাদেশ পল্লী বিদ্যুতায়ন বোর্ড (BREB)",
      "বাংলাদেশ অর্থনৈতিক অঞ্চল কর্তৃপক্ষ (BEZA)",
      "বাংলাদেশ বিজ্ঞান ও শিল্প গবেষণা পরিষদ (BCSIR)",
      "জাতীয় কম্পিউটার প্রশিক্ষণ ও গবেষণা একাডেমি (NACTAR)",
      "বাংলাদেশ পল্লী উন্নয়ন একাডেমি (BARD, Cumilla)"
    ],
    note: "সহ বিভিন্ন জাতীয় গবেষণা প্রতিষ্ঠান ও উন্নয়ন একাডেমি।"
  },
  divisions: {
    title: "৮টি প্রশাসনিক বিভাগ (Divisions)",
    description: "বাংলাদেশের ভৌগোলিক ও প্রশাসনিক বিভাগীয় পর্যায় (Divisional Commissionerate)।",
    items: [
      "১. ঢাকা বিভাগ (১৩টি জেলা)",
      "২. চট্টগ্রাম বিভাগ (১১টি জেলা — চাঁদপুর, কুমিল্লা, ফেনীসহ)",
      "৩. রাজশাহী বিভাগ (৮টি জেলা)",
      "৪. খুলনা বিভাগ (১০টি জেলা)",
      "৫. বরিশাল বিভাগ (৬টি জেলা)",
      "৬. সিলেট বিভাগ (৪টি জেলা)",
      "৭. রংপুর বিভাগ (৮টি জেলা)",
      "৮. ময়মনসিংহ বিভাগ (৪টি জেলা)"
    ],
    note: "প্রতিটি বিভাগে বিভাগীয় কমিশনার প্রধান প্রশাসনিক সমন্বয়কের দায়িত্ব পালন করেন।"
  },
  districts: {
    title: "৬৪টি জেলা (Districts)",
    description: "উপজেলা ও ইউনিয়ন সমন্বয়ে গঠিত প্রধান জেলা প্রশাসন (Deputy Commissioner Office)।",
    items: [
      "ঢাকা বিভাগ: ঢাকা, গাজীপুর, নারায়ণগঞ্জ, মানিকগঞ্জ, মুন্সিগঞ্জ, নরসিংদী, টাঙ্গাইল, কিশোরগঞ্জ, ফরিদপুর, মাদারীপুর, গোপালগঞ্জ, রাজবাড়ী, শরীয়তপুর।",
      "চট্টগ্রাম বিভাগ: চট্টগ্রাম, চাঁদপুর, কুমিল্লা, ব্রাহ্মণবাড়িয়া, নোয়াখালী, ফেনী, লক্ষ্মীপুর, কক্সবাজার, খাগড়াছড়ি, রাঙ্গামাটি, বান্দরবান।",
      "রাজশাহী বিভাগ: রাজশাহী, বগুড়া, পাবনা, সিরাজগঞ্জ, নওগাঁ, নাটোর, চাঁপাইনবাবগঞ্জ, জয়পুরহাট।",
      "খুলনা বিভাগ: খুলনা, যশোর, বাগেরহাট, কুষ্টিয়া, ঝিনাইদহ, সাতক্ষীরা, চুয়াডাঙ্গা, মেহেরপুর, মাগুরা, নড়াইল।",
      "বরিশাল বিভাগ: বরিশাল, পটুয়াখালী, ভোলা, পিরোজপুর, বরগুনা, ঝালকাঠি।",
      "সিলেট বিভাগ: সিলেট, মৌলভীবাজার, হবিগঞ্জ, সুনামগঞ্জ।",
      "রংপুর বিভাগ: রংপুর, দিনাজপুর, কুড়িগ্রাম, গাইবান্ধা, নীলফামারী, লালমনিরহাট, পঞ্চগড়, ঠাকুরগাঁও।",
      "ময়মনসিংহ বিভাগ: ময়মনসিংহ, জামালপুর, শেরপুর, নেত্রকোণা।"
    ],
    note: "৬৪টি জেলাতেই জেলা প্রশাসক (DC) ও জেলা ম্যাজিস্ট্রেট কার্যালয় কার্যকর।"
  },
  upazilas: {
    title: "৫০০টি উপজেলা পরিষদ (Upazilas)",
    description: "উপজেলা নির্বাহী কর্মকর্তা (UNO) ও নির্বাচিত উপজেলা চেয়ারম্যানের প্রশাসনিক ক্ষেত্র।",
    items: [
      "প্রতিটি উপজেলায় গড়ে ৮ থেকে ১৫টি ইউনিয়ন পরিষদ অন্তর্ভুক্ত থাকে।",
      "চাঁদপুর জেলার উদাহরণ: চাঁদপুর সদর, কচুয়া, শাহরাস্তি, মতলব উত্তর, মতলব দক্ষিণ, ফরিদগঞ্জ, হাজীগঞ্জ, হাইমচর।",
      "উপজেলা পর্যায়ে কৃষি, স্বাস্থ্য, শিক্ষা, ভূমি ও যুব উন্নয়ন দপ্তর নাগরিক সেবা প্রদান করে।"
    ],
    note: "উপজেলা প্রশাসনের আওতায় ইউনিয়ন ডিজিটাল সেন্টারসমূহ কারিগরি সহায়তা পায়।"
  },
  unions: {
    title: "৪,৫৬৮টি ইউনিয়ন পরিষদ (Union Parishads)",
    description: "স্থানীয় সরকার ব্যবস্থার তৃণমূল ভিত্তি — যেখানে সরাসরি গ্রামসেবা (GramSheba) কার্যকর।",
    items: [
      "প্রতিটি ইউনিয়ন পরিষদে ৯টি ওয়ার্ড এবং গড়ে ১৫-২০টি গ্রাম থাকে।",
      "প্রতিটি পরিষদে ১ জন চেয়ারম্যান, ৯ জন সাধারণ সদস্য ও ৩ জন সংরক্ষিত নারী সদস্য থাকেন।",
      "নাগরিকত্ব সনদ, ওয়ারিশ সনদ, ট্রেড লাইসেন্স ও জন্ম-মৃত্যু প্রত্যয়ন ইউনিয়ন পরিষদ থেকেই ইস্যু করা হয়।",
      "ইউনিয়ন ডিজিটাল সেন্টার (UDC)-এর মাধ্যমে অনলাইন সরকারি ই-সেবা নিশ্চিত করা হয়।"
    ],
    note: "গ্রামসেবা প্ল্যাটফর্ম এই ৪,৫৬৮টি ইউনিয়নের সেবা সম্পূর্ণ অটোমেশন করার লক্ষ্যে তৈরি।"
  }
};

export default function GovStatsGrid() {
  const [activeModalKey, setActiveModalKey] = useState(null);

  const stats = [
    { key: 'ministries', count: '৫৭', label: 'মন্ত্রণালয় ও বিভাগ' },
    { key: 'directorates', count: '৭২', label: 'অধিদপ্তর' },
    { key: 'other_offices', count: '৫৬৬', label: 'অন্যান্য অফিস' },
    { key: 'divisions', count: '৮', label: 'বিভাগ' },
    { key: 'districts', count: '৬৪', label: 'জেলা' },
    { key: 'upazilas', count: '৫০০', label: 'উপজেলা' },
    { key: 'unions', count: '৪৫৬৮', label: 'ইউনিয়ন', fullWidth: true }
  ];

  const currentDetail = activeModalKey ? govDetailedData[activeModalKey] : null;

  return (
    <div className="w-full max-w-4xl mx-auto my-6 font-sans">
      
      {/* ক্লিক করার নির্দেশনামূলক ট্যাগ */}
      <div className="text-center mb-2">
        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
          💡 যেকোনো ঘরে ক্লিক করে বিস্তারিত তালিকা দেখুন
        </span>
      </div>

      {/* স্ট্যাটিস্টিক্স গ্রিড */}
      <div className="bg-[#f8faf9] border border-gray-300 rounded-2xl overflow-hidden shadow-sm">
        
        {/* প্রথম সারি: মন্ত্রণালয়, অধিদপ্তর, অন্যান্য */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-300 border-b border-gray-300">
          {stats.slice(0, 3).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveModalKey(item.key)}
              className="py-4 px-3 text-center hover:bg-emerald-50/70 transition-all cursor-pointer group focus:outline-none"
            >
              <h3 className="text-3xl sm:text-4xl font-extrabold text-[#1b734e] group-hover:scale-105 transition-transform font-serif">
                {item.count}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-1 flex items-center justify-center gap-1">
                <span>{item.label}</span>
                <span className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition">↗</span>
              </p>
            </button>
          ))}
        </div>

        {/* দ্বিতীয় সারি: বিভাগ, জেলা, উপজেলা */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-300 border-b border-gray-300">
          {stats.slice(3, 6).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveModalKey(item.key)}
              className="py-4 px-3 text-center hover:bg-emerald-50/70 transition-all cursor-pointer group focus:outline-none"
            >
              <h3 className="text-3xl sm:text-4xl font-extrabold text-[#1b734e] group-hover:scale-105 transition-transform font-serif">
                {item.count}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-1 flex items-center justify-center gap-1">
                <span>{item.label}</span>
                <span className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition">↗</span>
              </p>
            </button>
          ))}
        </div>

        {/* তৃতীয় সারি: ইউনিয়ন পরিষদ (ফুল উইডথ) */}
        <button
          type="button"
          onClick={() => setActiveModalKey(stats[6].key)}
          className="w-full py-4 px-4 text-center bg-[#f1f6f3] hover:bg-emerald-100/60 transition-all cursor-pointer group focus:outline-none"
        >
          <h3 className="text-3xl sm:text-4xl font-extrabold text-[#1b734e] group-hover:scale-105 transition-transform font-serif">
            {stats[6].count}
          </h3>
          <p className="text-xs sm:text-sm font-bold text-gray-800 mt-1 flex items-center justify-center gap-1">
            <span>{stats[6].label}</span>
            <span className="text-[11px] text-emerald-700 opacity-0 group-hover:opacity-100 transition">↗ বিস্তারিত দেখুন</span>
          </p>
        </button>
      </div>

      {/* বিস্তারিত পপআপ মডাল (Click Modal) */}
      {currentDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            
            {/* মডাল হেডার */}
            <div className="bg-gradient-to-r from-[#1b734e] to-[#208a61] p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">{currentDetail.title}</h3>
                <p className="text-xs text-emerald-100 mt-0.5">{currentDetail.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalKey(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* ভেতরের তালিকা */}
            <div className="p-5 max-h-80 overflow-y-auto space-y-2 text-sm text-gray-700">
              {currentDetail.items.map((entry, idx) => (
                <div key={idx} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-2.5">
                  <span className="text-emerald-700 font-bold text-xs mt-0.5">●</span>
                  <span className="leading-snug">{entry}</span>
                </div>
              ))}

              {currentDetail.note && (
                <p className="text-xs text-gray-500 italic pt-2 border-t border-gray-200">
                  📌 {currentDetail.note}
                </p>
              )}
            </div>

            {/* মডাল ফুটার */}
            <div className="bg-gray-50 px-5 py-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModalKey(null)}
                className="bg-[#1b734e] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#145d3e] transition"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
