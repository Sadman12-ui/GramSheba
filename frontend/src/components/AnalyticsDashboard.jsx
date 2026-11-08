import React from 'react';

export default function AnalyticsDashboard({ stats }) {
  const defaultStats = {
    totalApplications: 148,
    approvedCount: 112,
    pendingCount: 24,
    rejectedCount: 12,
    avgProcessingHours: "18.4 ঘণ্টা",
    serviceBreakdown: [
      { name: "নাগরিকত্ব সনদ", count: 68, color: "bg-emerald-500" },
      { name: "ট্রেড লাইসেন্স", count: 42, color: "bg-blue-500" },
      { name: "ওয়ারিশ সনদ", count: 26, color: "bg-amber-500" },
      { name: "অন্যান্য সেবা", count: 12, color: "bg-purple-500" }
    ],
    weeklyTrend: [
      { day: "শনি", count: 14 },
      { day: "রবি", count: 28 },
      { day: "সোম", count: 35 },
      { day: "মঙ্গল", count: 22 },
      { day: "বুধ", count: 31 },
      { day: "বৃহ", count: 18 }
    ]
  };

  const data = stats || defaultStats;
  const maxWeekly = Math.max(...data.weeklyTrend.map(d => d.count));

  return (
    <div className="space-y-6">
      {/* Top 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">মোট আবেদন</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{data.totalApplications} টি</h3>
            <span className="text-xs text-emerald-600 font-medium">↑ ১২% চলতি সপ্তাহে বৃদ্ধি</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-xl">
            📋
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">অনুমোদিত ও ইস্যুকৃত</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">{data.approvedCount} টি</h3>
            <span className="text-xs text-gray-400">সফলভাবে সনদ প্রদান</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-xl">
            ✓
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">যাচাইয়ের অপেক্ষায়</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{data.pendingCount} টি</h3>
            <span className="text-xs text-amber-500 font-medium">অফিসার রিভিউ চলমান</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold text-xl">
            ⏳
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">গড় এসএলএ সময় (SLA)</p>
            <h3 className="text-2xl font-bold text-indigo-700 mt-1">{data.avgProcessingHours}</h3>
            <span className="text-xs text-indigo-500">সরকারি লক্ষ্যমাত্রা: ২৪ ঘণ্টা</span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl">
            ⚡
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly Trend Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-gray-900">সাপ্তাহিক আবেদন গ্রহণের প্রবণতা</h4>
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">সর্বশেষ ৭ দিন</span>
          </div>
          
          <div className="flex items-end justify-between gap-4 h-48 pt-6 border-b border-gray-200">
            {data.weeklyTrend.map((item, index) => {
              const heightPct = Math.round((item.count / maxWeekly) * 100);
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[11px] font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition">
                    {item.count}
                  </span>
                  <div 
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all duration-300"
                  ></div>
                  <span className="text-xs text-gray-500 mt-1">{item.day}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">বার-এর উপর মাউস রেখে নির্দিষ্ট দিনের মোট আবেদন দেখুন</p>
        </div>

        {/* Service Type Breakdown Progress Meters */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-gray-900">সেবাভিত্তিক আবেদনের বণ্টন</h4>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">মোট ১৪৮ টি</span>
          </div>

          <div className="space-y-4">
            {data.serviceBreakdown.map((srv, idx) => {
              const pct = Math.round((srv.count / data.totalApplications) * 100);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-700">{srv.name}</span>
                    <span className="text-gray-900 font-bold">{srv.count} টি ({pct}%)</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${srv.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
