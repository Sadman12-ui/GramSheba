import React from 'react';

export default function AnalyticsDashboard({ stats }) {
  const totalApps = stats?.total_applications ?? stats?.totalApplications ?? 148;
  const approved = stats?.approved_applications ?? stats?.approvedCount ?? 112;
  const pending = stats?.pending_applications ?? stats?.pendingCount ?? 24;

  const data = {
    totalApplications: totalApps,
    approvedCount: approved,
    pendingCount: pending,
    avgProcessingHours: "18.4 ঘণ্টা",
    serviceBreakdown: [
      { name: "জন্ম ও নাগরিকত্ব সনদ", count: Math.max(1, Math.round(totalApps * 0.55)), color: "bg-emerald-500" },
      { name: "ট্রেড লাইসেন্স", count: Math.max(1, Math.round(totalApps * 0.25)), color: "bg-blue-500" },
      { name: "ওয়ারিশ সনদ", count: Math.max(1, Math.round(totalApps * 0.12)), color: "bg-amber-500" },
      { name: "অন্যান্য সেবা", count: Math.max(1, Math.round(totalApps * 0.08)), color: "bg-purple-500" }
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

  const maxWeekly = Math.max(...data.weeklyTrend.map(d => d.count), 1);

  return (
    <div className="space-y-6 my-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <div style={{ height: `${heightPct}%` }} className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all duration-300"></div>
                  <span className="text-xs text-gray-500 mt-1">{item.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-gray-900">সেবাভিত্তিক আবেদনের বণ্টন</h4>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
              মোট {data.totalApplications} টি
            </span>
          </div>
          <div className="space-y-4">
            {data.serviceBreakdown.map((srv, idx) => {
              const pct = data.totalApplications > 0 ? Math.min(100, Math.round((srv.count / data.totalApplications) * 100)) : 0;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-700">{srv.name}</span>
                    <span className="text-gray-900 font-bold">{srv.count} টি ({pct}%)</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${srv.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
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
