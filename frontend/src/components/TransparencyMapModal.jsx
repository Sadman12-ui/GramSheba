import { useState, useEffect } from 'react'
import API_BASE from '../api'

export default function TransparencyMapModal({ currentUser, onClose }) {
  const [activeTab, setActiveTab] = useState('map')
  const [complaints, setComplaints] = useState([])
  const [selectedPin, setSelectedPin] = useState(null)
  const [transparency, setTransparency] = useState(null)
  const [loading, setLoading] = useState(true)
  const [upvotedIds, setUpvotedIds] = useState({})

  // অ্যাডমিন নোটিশ ফর্ম স্টেট
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeBody, setNoticeBody] = useState('')
  const [noticeCategory, setNoticeCategory] = useState('জরুরি সতর্কতা')
  const [noticeBudget, setNoticeBudget] = useState('')
  const [noticeProgress, setNoticeProgress] = useState(0)
  const [publishing, setPublishing] = useState(false)

  const isAdmin = currentUser && ['union_admin', 'union_officer', 'super_admin'].includes(currentUser.role)

  async function loadAll() {
    setLoading(true)
    try {
      const [mapRes, transRes] = await Promise.all([
        fetch(`${API_BASE}/api/public/complaints-map`),
        fetch(`${API_BASE}/api/public/transparency`),
      ])
      if (mapRes.ok) {
        const mData = await mapRes.json()
        setComplaints(mData)
        if (mData.length > 0 && !selectedPin) setSelectedPin(mData[0])
      }
      if (transRes.ok) {
        setTransparency(await transRes.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleUpvote(complaintId) {
    if (upvotedIds[complaintId]) return
    try {
      const res = await fetch(`${API_BASE}/api/public/complaints/${complaintId}/upvote`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        setUpvotedIds((prev) => ({ ...prev, [complaintId]: true }))
        setComplaints((prev) =>
          prev.map((c) => (c.complaint_id === complaintId ? { ...c, upvotes: data.upvotes } : c))
        )
        if (selectedPin?.complaint_id === complaintId) {
          setSelectedPin((prev) => ({ ...prev, upvotes: data.upvotes }))
        }
      }
    } catch {
      // ignore
    }
  }

  async function handlePublishNotice(e) {
    e.preventDefault()
    setPublishing(true)
    try {
      const token = sessionStorage.getItem('gramsheba_token')
      const res = await fetch(`${API_BASE}/api/admin/notices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: noticeTitle,
          body: noticeBody,
          category: noticeCategory,
          budget_info: noticeBudget,
          progress_percent: Number(noticeProgress) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'নোটিশ প্রকাশ করা যায়নি।')
      alert('✅ নোটিশ / উন্নয়ন প্রকল্প সফলভাবে প্রকাশিত হয়েছে!')
      setNoticeTitle('')
      setNoticeBody('')
      setNoticeBudget('')
      setNoticeProgress(0)
      loadAll()
    } catch (err) {
      alert(`⚠️ ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  function getStatusMeta(statusText = '') {
    const s = statusText.toLowerCase()
    if (s.includes('সমাধান') || s.includes('resolved') || s.includes('সম্পন্ন')) {
      return { color: '#15803d', bg: '#dcfce7', dot: '🟢', label: statusText || 'সমাধানকৃত' }
    }
    if (s.includes('চলমান') || s.includes('progress') || s.includes('প্রক্রিয়া')) {
      return { color: '#b45309', bg: '#fef3c7', dot: '🟡', label: statusText || 'চলমান' }
    }
    return { color: '#b91c1c', bg: '#fee2e2', dot: '🔴', label: statusText || 'অপেক্ষমাণ' }
  }

  const mapLat = selectedPin?.latitude ?? 23.2333
  const mapLng = selectedPin?.longitude ?? 90.6713
  const bbox = `${mapLng - 0.03},${mapLat - 0.02},${mapLng + 0.03},${mapLat + 0.02}`
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${mapLat},${mapLng}`

  return (
    <div className="cert-modal-overlay" style={{ alignItems: 'flex-start', overflowY: 'auto', padding: '1.2rem 0.8rem', zIndex: 1200 }}>
      <div className="cert-modal-container" style={{ maxWidth: '980px', width: '100%', padding: '1.5rem', margin: '0 auto' }}>
        {/* হেডার */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.28rem', color: '#0f172a', fontWeight: 800 }}>
              🌐 স্মার্ট ইউনিয়ন লাইভ ম্যাপ, স্বচ্ছতা ও নোটিশ পোর্টাল
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              সকল নাগরিকের জন্য উন্মুক্ত — এলাকার সমস্যা, উন্নয়ন প্রকল্পের অগ্রগতি ও ইউনিয়নের স্বচ্ছতা রিপোর্ট
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        {/* ট্যাব বার */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.1rem', flexWrap: 'wrap' }}>
          {[
            { id: 'map', label: `🗺️ লাইভ অভিযোগ ম্যাপ (${complaints.length})` },
            { id: 'transparency', label: '📊 স্বচ্ছতা ড্যাশবোর্ড' },
            { id: 'notices', label: `📢 নোটিশ ও প্রকল্প (${transparency?.notices?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '10px',
                border: activeTab === tab.id ? '1.5px solid #1b734e' : '1px solid #cbd5e1',
                background: activeTab === tab.id ? '#1b734e' : '#f8fafc',
                color: activeTab === tab.id ? '#fff' : '#334155',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>⏳ লাইভ ডেটা লোড হচ্ছে...</div>
        ) : (
          <>
            {/* ট্যাব ১: লাইভ অভিযোগ ম্যাপ */}
            {activeTab === 'map' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #cbd5e1', background: '#e2e8f0', height: '360px' }}>
                    <iframe
                      title="GramSheba Live Union Map"
                      src={osmUrl}
                      style={{ width: '100%', height: '100%', border: 0 }}
                      loading="lazy"
                    />
                  </div>
                  {selectedPin && (
                    <div style={{ marginTop: '0.75rem', padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#0f172a', fontSize: '0.94rem' }}>{selectedPin.subject}</strong>
                        <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '999px', background: getStatusMeta(selectedPin.status).bg, color: getStatusMeta(selectedPin.status).color, fontWeight: 700 }}>
                          {getStatusMeta(selectedPin.status).dot} {getStatusMeta(selectedPin.status).label}
                        </span>
                      </div>
                      <p style={{ margin: '6px 0', fontSize: '0.83rem', color: '#475569' }}>{selectedPin.description}</p>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <span>📍 {selectedPin.area} ({selectedPin.union_name})</span>
                        <button
                          type="button"
                          onClick={() => handleUpvote(selectedPin.complaint_id)}
                          disabled={upvotedIds[selectedPin.complaint_id]}
                          style={{
                            background: upvotedIds[selectedPin.complaint_id] ? '#16a34a' : '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.35rem 0.75rem',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          👍 আমিও ভুক্তভোগী ({selectedPin.upvotes})
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ maxHeight: '470px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingRight: '4px' }}>
                  {complaints.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.88rem' }}>
                      এখনো কোনো নাগরিক অভিযোগ নথিভুক্ত হয়নি। "অভিযোগ ও পরামর্শ" সেবা থেকে GPS লোকেশনসহ অভিযোগ দিন!
                    </div>
                  ) : (
                    complaints.map((c) => {
                      const st = getStatusMeta(c.status)
                      const isSel = selectedPin?.complaint_id === c.complaint_id
                      return (
                        <div
                          key={c.complaint_id}
                          onClick={() => setSelectedPin(c)}
                          style={{
                            padding: '0.8rem',
                            borderRadius: '10px',
                            border: isSel ? '2px solid #1b734e' : '1px solid #e2e8f0',
                            background: isSel ? '#f0fdf4' : '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{st.dot} {c.subject}</strong>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, background: st.bg, color: st.color, padding: '2px 7px', borderRadius: '999px' }}>
                              {st.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                            📍 {c.area} • {c.has_exact_gps ? 'GPS পিনযুক্ত' : c.union_name}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <code style={{ fontSize: '0.72rem', color: '#475569' }}>{c.complaint_id}</code>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUpvote(c.complaint_id)
                              }}
                              disabled={upvotedIds[c.complaint_id]}
                              style={{
                                background: upvotedIds[c.complaint_id] ? '#dcfce7' : '#eff6ff',
                                color: upvotedIds[c.complaint_id] ? '#15803d' : '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                padding: '3px 9px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              👍 আমিও ভুক্তভোগী ({c.upvotes})
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* ট্যাব ২: স্বচ্ছতা ড্যাশবোর্ড */}
            {activeTab === 'transparency' && transparency && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '0.8rem' }}>
                  {[
                    { label: 'মোট নিবন্ধিত ইউনিয়ন', value: transparency.summary.total_unions, icon: '🏛️', bg: '#eff6ff', color: '#1d4ed8' },
                    { label: 'অনুমোদিত ডিজিটাল সনদ', value: transparency.summary.approved_certificates, icon: '📜', bg: '#ecfdf5', color: '#047857' },
                    { label: 'আবেদন অনুমোদনের হার', value: `${transparency.summary.approval_rate}%`, icon: '✅', bg: '#f0fdf4', color: '#15803d' },
                    { label: 'গড় সনদ প্রদানের সময়', value: transparency.summary.avg_processing_days, icon: '⚡', bg: '#fefce8', color: '#a16207' },
                    { label: 'অভিযোগ (সমাধান / মোট)', value: `${transparency.summary.resolved_complaints} / ${transparency.summary.total_complaints}`, icon: '🛠️', bg: '#fff1f2', color: '#be123c' },
                  ].map((card) => (
                    <div key={card.label} style={{ background: card.bg, borderRadius: '12px', padding: '1rem', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: '1.4rem' }}>{card.icon}</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: card.color, marginTop: '4px' }}>{card.value}</div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* ইউনিয়নভিত্তিক পারফরম্যান্স টেবিল */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.7rem', color: '#0f172a' }}>🏛️ ইউনিয়নভিত্তিক সেবা স্বচ্ছতা তালিকা</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ background: '#e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '0.55rem 0.7rem' }}>ইউনিয়ন পরিষদ</th>
                          <th style={{ padding: '0.55rem 0.7rem' }}>কোড</th>
                          <th style={{ padding: '0.55rem 0.7rem' }}>মোট আবেদন</th>
                          <th style={{ padding: '0.55rem 0.7rem' }}>অনুমোদিত সনদ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transparency.unions.map((u) => (
                          <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                            <td style={{ padding: '0.55rem 0.7rem', fontWeight: 700 }}>{u.name}</td>
                            <td style={{ padding: '0.55rem 0.7rem', fontFamily: 'monospace' }}>{u.code}</td>
                            <td style={{ padding: '0.55rem 0.7rem' }}>{u.total_applications}</td>
                            <td style={{ padding: '0.55rem 0.7rem', color: '#15803d', fontWeight: 700 }}>{u.approved_applications}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ট্যাব ৩: ডিজিটাল নোটিশ বোর্ড ও উন্নয়ন প্রকল্প */}
            {activeTab === 'notices' && transparency && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {isAdmin && (
                  <form onSubmit={handlePublishNotice} style={{ background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    <h4 style={{ margin: 0, color: '#065f46' }}>📣 নতুন জরুরি নোটিশ বা উন্নয়ন প্রকল্প প্রকাশ করুন (অ্যাডমিন)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                      <input
                        type="text"
                        placeholder="শিরোনাম (যেমন: বন্যা সতর্কতা / রাস্তা মেরামত)"
                        value={noticeTitle}
                        onChange={(e) => setNoticeTitle(e.target.value)}
                        required
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                      <select
                        value={noticeCategory}
                        onChange={(e) => setNoticeCategory(e.target.value)}
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                      >
                        <option value="জরুরি সতর্কতা">🚨 জরুরি সতর্কতা</option>
                        <option value="উন্নয়ন প্রকল্প">🏗️ উন্নয়ন প্রকল্প</option>
                        <option value="সামাজিক নিরাপত্তা">🤝 সামাজিক নিরাপত্তা (VGD/ভাতা)</option>
                        <option value="সাধারণ নোটিশ">📢 সাধারণ নোটিশ</option>
                      </select>
                      <input
                        type="text"
                        placeholder="বাজেট / উপকারভোগী (ঐচ্ছিক)"
                        value={noticeBudget}
                        onChange={(e) => setNoticeBudget(e.target.value)}
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="অগ্রগতি % (0-100)"
                        value={noticeProgress}
                        onChange={(e) => setNoticeProgress(e.target.value)}
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="বিস্তারিত বিবরণ লিখুন..."
                      value={noticeBody}
                      onChange={(e) => setNoticeBody(e.target.value)}
                      required
                      style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                    />
                    <button type="submit" disabled={publishing} className="primary-button" style={{ alignSelf: 'flex-start', padding: '0.55rem 1.2rem' }}>
                      {publishing ? 'প্রকাশ হচ্ছে...' : 'নোটিশ প্রকাশ করুন →'}
                    </button>
                  </form>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                  {transparency.notices.map((n) => (
                    <div key={n.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.73rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: n.category.includes('জরুরি') ? '#fee2e2' : '#ecfdf5', color: n.category.includes('জরুরি') ? '#b91c1c' : '#047857' }}>
                          {n.category}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{n.union_name}</span>
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: '#0f172a' }}>{n.title}</h4>
                      <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>{n.body}</p>
                      {n.budget_info && (
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '6px' }}>
                          💰 {n.budget_info}
                        </div>
                      )}
                      {n.progress_percent > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#334155', marginBottom: '3px' }}>
                            <span>অগ্রগতি</span>
                            <strong>{n.progress_percent}%</strong>
                          </div>
                          <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${n.progress_percent}%`, height: '100%', background: '#1b734e', borderRadius: '999px' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
