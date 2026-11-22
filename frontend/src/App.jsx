import { useEffect, useState } from 'react'
import Chatbot from './Chatbot'
import Auth from './Auth'
import BirthApplication from './BirthApplication'
import CitizenshipApplication from './CitizenshipApplication'
import PublicVerifyModal from './PublicVerifyModal'
import TransparencyMapModal from './components/TransparencyMapModal'
import OtherServicesModal from './OtherServicesModal'
import OfficialCertificate from './OfficialCertificate'
import CitizenAccessibility from './components/CitizenAccessibility'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import GovStatsGrid from './components/GovStatsGrid'
import './App.css'

import API_BASE from './api'

const certificateServices = [
  { id: 'birth', title: 'জন্ম নিবন্ধন', price: 'মূল্য: BDT — সরকারি ফি প্রযোজ্য', icon: '📄' },
  { id: 'citizenship', title: 'নাগরিকত্ব সনদ', price: 'মূল্য: ৫০ BDT — সরকারি ফি', icon: '🪪' },
  { id: 'trade', title: 'ট্রেড লাইসেন্স', price: 'মূল্য: BDT — প্রযোজ্য ফি', icon: '📜' },
  { id: 'family', title: 'পারিবারিক সনদ', price: 'মূল্য: BDT — প্রযোজ্য ফি', icon: '👨‍👩‍👧‍👦' },
  { id: 'warish', title: 'ওয়ারিশ সনদ', price: 'মূল্য: BDT — প্রযোজ্য ফি', icon: '👥' },
  { id: 'death', title: 'মৃত্যু সনদ', price: 'মূল্য: BDT — প্রযোজ্য ফি', icon: '📑' },
  { id: 'voter', title: 'নতুন ভোটার প্রত্যয়ন', price: 'মূল্য: BDT — প্রযোজ্য ফি', icon: '🗳️' },
  { id: 'remarriage', title: 'পুনঃবিবাহ সনদ', price: 'মূল্য: BDT — প্রযোজ্য ফি', icon: '💍' },
  { id: 'agri', title: 'কৃষি প্রত্যয়ন', price: 'মূল্য: BDT — প্রযোজ্য ফি', icon: '🌾' },
]

function getSavedUser() {
  try {
    const savedUser = sessionStorage.getItem('gramsheba_user')
    return savedUser ? JSON.parse(savedUser) : null
  } catch {
    return null
  }
}

function App() {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('gramsheba_theme') === 'dark'
  )

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('gramsheba_theme', newMode ? 'dark' : 'light')
  }

  const [selectedGenericService, setSelectedGenericService] = useState(null)
  const [dashboardStats, setDashboardStats] = useState(null)
  const [trackingTimelineApp, setTrackingTimelineApp] = useState(null)

  const [showAuth, setShowAuth] = useState(false)
  const [showBirthForm, setShowBirthForm] = useState(false)
  const [showCitizenshipForm, setShowCitizenshipForm] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [showTransparencyModal, setShowTransparencyModal] = useState(false)

  // ব্রাউজারের Back (←) বাটন দিয়ে যেকোনো সেবা/মডাল থেকে হোমপেজে ফেরার সাপোর্ট
  useEffect(() => {
    const isSubViewOpen =
      showBirthForm ||
      showCitizenshipForm ||
      showVerifyModal ||
      showTransparencyModal ||
      showAuth ||
      currentView !== 'home' || Boolean(selectedGenericService)

    if (isSubViewOpen && !window.history.state?.gramshebaSubView) {
      window.history.pushState({ gramshebaSubView: true }, '')
    }
  }, [showBirthForm, showCitizenshipForm, showVerifyModal, showTransparencyModal, showAuth, currentView, selectedGenericService])

  useEffect(() => {
    const handlePopState = () => {
      setShowBirthForm(false)
      setShowCitizenshipForm(false)
      setShowVerifyModal(false)
      setShowTransparencyModal(false)
      setShowAuth(false)
      setCurrentView('home')
      setSelectedGenericService(null)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const [verifyInitialId, setVerifyInitialId] = useState('')
  const [verifyInitialHash, setVerifyInitialHash] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const vId = params.get('verify')
    const vHash = params.get('h') || ''
    if (vId) {
      setVerifyInitialId(vId)
      setVerifyInitialHash(vHash)
      setShowVerifyModal(true)
    }
  }, [])
  const [showUnionRegister, setShowUnionRegister] = useState(false)
  const [user, setUser] = useState(getSavedUser)

  const [currentView, setCurrentView] = useState('home')
  const [myApplications, setMyApplications] = useState([])
  const [myComplaints, setMyComplaints] = useState([])
  const [adminApplications, setAdminApplications] = useState([])
  const [adminTab, setAdminTab] = useState('birth') // 'birth' | 'citizenship' | 'general' | 'complaints'

  const [selectedCertificate, setSelectedCertificate] = useState(null)
  const [selectedOfficialCert, setSelectedOfficialCert] = useState(null)
  const [loading, setLoading] = useState(false)
  const [statusActionId, setStatusActionId] = useState(null)
  const [remarksInput, setRemarksInput] = useState('')

  const [adminSearch, setAdminSearch] = useState('')
  const [adminStatusFilter, setAdminStatusFilter] = useState('')
  const [inspectingApp, setInspectingApp] = useState(null)
  const [inspectingLogs, setInspectingLogs] = useState([])

  const [analytics, setAnalytics] = useState(null)
  const [unionsList, setUnionsList] = useState([])
  const [citizensList, setCitizensList] = useState([])
  const [newUnionName, setNewUnionName] = useState('')
  const [newUnionCode, setNewUnionCode] = useState('')
  const [superAdminMsg, setSuperAdminMsg] = useState('')

  function handleLogin(loggedInUser) {
    setUser(loggedInUser)
    setShowAuth(false)
    if (loggedInUser.role === 'super_admin') {
      setCurrentView('super_admin_dashboard')
    } else if (loggedInUser.role === 'union_admin') {
      setCurrentView('admin_dashboard')
    } else {
      setCurrentView('home')
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('gramsheba_token')
    sessionStorage.removeItem('gramsheba_user')
    setUser(null)
    setShowAuth(false)
    setShowBirthForm(false)
    setShowCitizenshipForm(false)
    setCurrentView('home')
    setSelectedCertificate(null)
    setSelectedOfficialCert(null)
  }

  // নাগরিকের সকল ধরনের আবেদন (জন্ম, নাগরিকত্ব, সাধারণ সেবা ও অভিযোগ) একসাথে লোড করা
  async function fetchMyApplications() {
    const token = sessionStorage.getItem('gramsheba_token')
    if (!token) return
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [birthRes, citRes, genRes, cmpRes] = await Promise.all([
        fetch(`${API_BASE}/api/birth-applications/my`, { headers }),
        fetch(`${API_BASE}/api/citizenship-applications/my`, { headers }),
        fetch(`${API_BASE}/api/services/my`, { headers }),
        fetch(`${API_BASE}/api/complaints/my`, { headers }),
      ])

      const birthList = birthRes.ok ? await birthRes.json() : []
      const citList = citRes.ok ? await citRes.json() : []
      const genList = genRes.ok ? await genRes.json() : []
      const cmpList = cmpRes.ok ? await cmpRes.json() : []

      const unified = [
        ...birthList.map((b) => ({
          ...b,
          app_category: 'birth',
          service_label: 'জন্ম নিবন্ধন সনদ',
          display_name: b.child_name,
          sub_label: `পিতা: ${b.father_name}`,
        })),
        ...citList.map((c) => ({
          ...c,
          app_category: 'citizenship',
          service_label: 'নাগরিকত্ব সনদ',
          display_name: c.name || 'নাগরিক আবেদনকারী',
          sub_label: `পিতা/অভিভাবক: ${c.guardian_name || ''}`,
        })),
        ...genList.map((g) => ({
          ...g,
          app_category: 'general',
          service_label: `সেবা (${g.service_type.toUpperCase()})`,
          display_name: g.applicant_name,
          sub_label: `অভিভাবক: ${g.guardian_name}`,
        })),
      ]

      setMyApplications(unified)
      setMyComplaints(cmpList)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCitizenDashboard() {
    const token = sessionStorage.getItem('gramsheba_token')
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/citizen/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setDashboardStats(await res.json())
    } catch (err) {
      console.error(err)
    }
  }

  async function fetchAdminApplications() {
    const token = sessionStorage.getItem('gramsheba_token')
    if (!token) return
    setLoading(true)
    try {
      let endpoint = '/api/admin/birth-applications'
      if (adminTab === 'citizenship') endpoint = '/api/admin/citizenship-applications'
      else if (adminTab === 'general') endpoint = '/api/admin/general-services'
      else if (adminTab === 'complaints') endpoint = '/api/admin/complaints'

      const params = new URLSearchParams()
      if (adminStatusFilter && adminTab !== 'complaints') params.set('status', adminStatusFilter)
      if (adminSearch.trim() && adminTab !== 'complaints') params.set('search', adminSearch.trim())

      const res = await fetch(`${API_BASE}${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setAdminApplications(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSuperAdminData() {
    const token = sessionStorage.getItem('gramsheba_token')
    if (!token) return
    setLoading(true)
    try {
      const [analyticsRes, unionsRes, citizensRes] = await Promise.all([
        fetch(`${API_BASE}/api/super-admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/super-admin/unions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/super-admin/citizens`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json())
      if (unionsRes.ok) setUnionsList(await unionsRes.json())
      if (citizensRes.ok) setCitizensList(await citizensRes.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleInspectApp(app) {
    setInspectingApp(app)
    const token = sessionStorage.getItem('gramsheba_token')
    if (!token || adminTab !== 'birth') {
      setInspectingLogs([])
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/birth-applications/${app.id}/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setInspectingLogs(await res.json())
      else setInspectingLogs([])
    } catch {
      setInspectingLogs([])
    }
  }

  async function handleDownloadReport() {
    const token = sessionStorage.getItem('gramsheba_token')
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/reports/export-csv`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `GramSheba_Report_${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
      } else {
        alert('রিপোর্ট ডাউনলোড করা যায়নি!')
      }
    } catch {
      alert('সার্ভার থেকে রিপোর্ট এক্সপোর্ট ব্যর্থ হয়েছে।')
    }
  }

  async function handleCreateUnion(e) {
    e.preventDefault()
    const token = sessionStorage.getItem('gramsheba_token')
    if (!token) return
    setSuperAdminMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/super-admin/unions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newUnionName.trim(),
          code: newUnionCode.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setSuperAdminMsg(`✅ ইউনিয়ন সফলভাবে তৈরি হয়েছে: ${data.name}`)
        setNewUnionName('')
        setNewUnionCode('')
        fetchSuperAdminData()
      } else {
        setSuperAdminMsg(`❌ এরর: ${data.detail || 'তৈরি করা যায়নি।'}`)
      }
    } catch {
      setSuperAdminMsg('❌ সার্ভার ত্রুটি! আবার চেষ্টা করুন।')
    }
  }

  async function handleViewCertificate(appItem) {
    const token = sessionStorage.getItem('gramsheba_token')
    if (!token) return

    if (appItem.app_category === 'birth') {
      try {
        const res = await fetch(
          `${API_BASE}/api/birth-applications/${appItem.tracking_id}/certificate`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          setSelectedCertificate(await res.json())
        } else {
          const err = await res.json()
          alert(err.detail || 'সনদটি লোড করা সম্ভব হয়নি।')
        }
      } catch {
        alert('সার্ভারের সাথে যোগাযোগ করা যায়নি।')
      }
    } else {
      try {
        const res = await fetch(
          `${API_BASE}/api/certificates/${appItem.tracking_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          setSelectedOfficialCert(await res.json())
        } else {
          const err = await res.json()
          alert(err.detail || 'সনদটি লোড করা সম্ভব হয়নি।')
        }
      } catch {
        alert('সার্ভারের সাথে যোগাযোগ করা যায়নি।')
      }
    }
  }

  async function handleUpdateStatus(applicationId, newStatus) {
    const token = sessionStorage.getItem('gramsheba_token')
    if (!token) return

    let endpoint = `/api/admin/birth-applications/${applicationId}/status`
    if (adminTab === 'citizenship') endpoint = `/api/admin/citizenship-applications/${applicationId}/status`
    else if (adminTab === 'general') endpoint = `/api/admin/general-services/${applicationId}/status`
    else if (adminTab === 'complaints') endpoint = `/api/admin/complaints/${applicationId}/status`

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          adminTab === 'complaints'
            ? { status: newStatus }
            : {
                status: newStatus,
                remarks: remarksInput || (newStatus === 'approved' ? 'অনুমোদিত' : 'তথ্য অসম্পূর্ণ'),
              }
        ),
      })
      if (res.ok) {
        setStatusActionId(null)
        setRemarksInput('')
        fetchAdminApplications()
        if (inspectingApp && inspectingApp.id === applicationId) {
          setInspectingApp(null)
        }
      } else {
        const err = await res.json()
        alert(err.detail || 'স্ট্যাটাস আপডেট করা সম্ভব হয়নি।')
      }
    } catch {
      alert('স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।')
    }
  }

  useEffect(() => {
    if (currentView === 'my_applications') {
      fetchMyApplications()
      fetchCitizenDashboard()
    }
    if (currentView === 'admin_dashboard') fetchAdminApplications()
    if (currentView === 'super_admin_dashboard') fetchSuperAdminData()
  }, [currentView, adminStatusFilter, adminTab])

  function openBirthApplication() {
    if (isUnionAdmin || isSuperAdmin) { alert('অ্যাডমিন অ্যাকাউন্ট থেকে নাগরিক সেবার জন্য আবেদন করা যাবে না।'); return }
    if (user) setShowBirthForm(true)
    else {
      setShowBirthForm(true)
      setShowAuth(true)
    }
  }

  function openCitizenshipApplication() {
    if (isUnionAdmin || isSuperAdmin) { alert('অ্যাডমিন অ্যাকাউন্ট থেকে নাগরিক সেবার জন্য আবেদন করা যাবে না।'); return }
    if (user) setShowCitizenshipForm(true)
    else {
      setShowCitizenshipForm(true)
      setShowAuth(true)
    }
  }

  if (showAuth) {
    return (
      <Auth
        onBack={() => {
          setShowAuth(false)
          setShowBirthForm(false)
          setShowCitizenshipForm(false)
        }}
        onLogin={(loggedInUser) => {
          handleLogin(loggedInUser)
          setShowBirthForm(false)
          setShowCitizenshipForm(false)
        }}
      />
    )
  }

  if (showBirthForm) {
    if (!user) {
      return (
        <Auth
          onBack={() => setShowBirthForm(false)}
          onLogin={(loggedInUser) => {
            handleLogin(loggedInUser)
            setShowBirthForm(true)
          }}
        />
      )
    }
    return (
      <BirthApplication
        onBack={() => {
          setShowBirthForm(false)
          setCurrentView('my_applications')
        }}
      />
    )
  }

  if (showCitizenshipForm) {
    if (!user) {
      return (
        <Auth
          onBack={() => setShowCitizenshipForm(false)}
          onLogin={(loggedInUser) => {
            handleLogin(loggedInUser)
            setShowCitizenshipForm(true)
          }}
        />
      )
    }
    return (
      <CitizenshipApplication
        onBack={() => setShowCitizenshipForm(false)}
        onSubmitSuccess={() => {
          setShowCitizenshipForm(false)
          setCurrentView('my_applications')
        }}
      />
    )
  }

  const isUnionAdmin = user && user.role === 'union_admin'
  const isSuperAdmin = user && user.role === 'super_admin'

  return (
    <div className={`app ${darkMode ? 'dark-theme' : ''}`}>
      <header className="navbar">
        <a
          className="brand"
          href="#home"
          onClick={(e) => {
            e.preventDefault()
            setCurrentView('home')
          }}
        >
          🌿 GramSheba
        </a>

        <nav>
          <button
            type="button"
            className={`nav-link-btn ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentView('home')}
          >
            প্রথম পাতা
          </button>

          {!isUnionAdmin && !isSuperAdmin && (
            <a href="#services" className="nav-link-btn" onClick={() => setCurrentView('home')}>
              সেবাসমূহ
            </a>
          )}

          <button
            type="button"
            className="nav-link-btn"
            style={{ color: '#059669', fontWeight: 600 }}
            onClick={() => setShowVerifyModal(true)}
          >
            🔍 সনদ যাচাই
          </button>
            <button
              type="button"
              onClick={() => setShowTransparencyModal(true)}
              style={{
                background: '#0f766e',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.48rem 0.9rem',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              🗺️ লাইভ ম্যাপ ও স্বচ্ছতা
            </button>


          {user && (
            <button
              type="button"
              className={`nav-link-btn ${currentView === 'my_applications' ? 'active' : ''}`}
              onClick={() => setCurrentView('my_applications')}
            >
              আবেদনের অবস্থা
            </button>
          )}

          {isUnionAdmin && (
            <button
              type="button"
              className={`nav-link-btn admin-badge-btn ${currentView === 'admin_dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin_dashboard')}
            >
              🛡️ ইউনিয়ন রিভিউ
            </button>
          )}

          {isSuperAdmin && (
            <button
              type="button"
              className={`nav-link-btn super-admin-badge-btn ${currentView === 'super_admin_dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('super_admin_dashboard')}
            >
              👑 সুপার অ্যাডমিন পোর্টাল
            </button>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={toggleDarkMode}
            style={{
              background: darkMode ? '#334155' : '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 600,
            }}
          >
            {darkMode ? '☀️ লাইট' : '🌙 ডার্ক'}
          </button>

          {user ? (
            <div className="user-actions">
              <span className="user-greeting">
                স্বাগতম, <strong>{user.full_name}</strong>
              </span>
              <button className="login-button" onClick={handleLogout}>
                লগআউট
              </button>
            </div>
          ) : (
            <button className="login-button" onClick={() => setShowAuth(true)}>
              👤 লগইন / নিবন্ধন
            </button>
          )}
        </div>
      </header>

      <main>
        {/* ভিউ ১: সুপার অ্যাডমিন পোর্টাল */}
        {currentView === 'super_admin_dashboard' && isSuperAdmin && (
          <section className="portal-section">
            <div className="portal-header">
              <h2>👑 সেন্ট্রাল গভর্নেন্স ও সুপার অ্যাডমিন প্যানেল</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="secondary-btn" onClick={handleDownloadReport}>
                  📥 পূর্ণাঙ্গ রিপোর্ট (CSV)
                </button>
                <button type="button" className="secondary-btn" onClick={fetchSuperAdminData}>
                  🔄 রিফ্রেশ ডাটা
                </button>
              </div>
            </div>

            {analytics && (
              <>
                <div className="analytics-grid">
                  <div className="metric-card bg-emerald">
                    <span className="metric-title">মোট ইউনিয়ন</span>
                    <strong className="metric-value">{analytics.total_unions}</strong>
                  </div>
                  <div className="metric-card bg-blue">
                    <span className="metric-title">মোট নাগরিক</span>
                    <strong className="metric-value">{analytics.total_citizens}</strong>
                  </div>
                  <div className="metric-card bg-indigo">
                    <span className="metric-title">মোট কর্মকর্তা/অ্যাডমিন</span>
                    <strong className="metric-value">{analytics.total_admins}</strong>
                  </div>
                  <div className="metric-card bg-amber">
                    <span className="metric-title">মোট আবেদন</span>
                    <strong className="metric-value">{analytics.total_applications}</strong>
                  </div>
                </div>

                <div className="status-overview-strip">
                  <div>প্রক্রিয়াধীন: <strong>{analytics.pending_applications}</strong></div>
                  <div>অনুমোদিত: <strong>{analytics.approved_applications}</strong></div>
                  <div>বাতিলকৃত: <strong>{analytics.rejected_applications}</strong></div>
                </div>

                <AnalyticsDashboard stats={analytics} />
              </>
            )}

            <div className="super-admin-content-grid">
              <div className="card-box">
                <h3>🏛️ নতুন ইউনিয়ন নিবন্ধন করুন</h3>
                {superAdminMsg && <p>{superAdminMsg}</p>}
                <form className="inline-entry-form" onSubmit={handleCreateUnion}>
                  <label>
                    ইউনিয়নের নাম
                    <input
                      type="text"
                      placeholder="যেমন: বিষ্ণুপুর ইউনিয়ন পরিষদ"
                      value={newUnionName}
                      onChange={(e) => setNewUnionName(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    অনন্য ইউনিয়ন কোড
                    <input
                      type="text"
                      placeholder="যেমন: BISHNUPUR_01"
                      value={newUnionCode}
                      onChange={(e) => setNewUnionCode(e.target.value)}
                      required
                    />
                  </label>
                  <button type="submit" className="primary-button">
                    + ইউনিয়ন সংযুক্ত করুন
                  </button>
                </form>
              </div>

              <div className="card-box">
                <h3>📋 নিবন্ধিত ইউনিয়নসমূহ ({unionsList.length})</h3>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>আইডি</th>
                        <th>ইউনিয়নের নাম</th>
                        <th>কোড</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unionsList.map((u) => (
                        <tr key={u.id}>
                          <td>#{u.id}</td>
                          <td><strong>{u.name}</strong></td>
                          <td><code>{u.code}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="card-box" style={{ marginTop: '1.5rem' }}>
              <h3>👥 নিবন্ধিত নাগরিক অ্যাকাউন্টসমূহ ({citizensList.length})</h3>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>আইডি</th>
                      <th>নাগরিকের নাম</th>
                      <th>ইমেইল</th>
                      <th>মোবাইল</th>
                      <th>এলাকা</th>
                      <th>স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citizensList.map((c) => (
                      <tr key={c.id}>
                        <td>#{c.id}</td>
                        <td><strong>{c.full_name}</strong></td>
                        <td>{c.email}</td>
                        <td>{c.phone}</td>
                        <td>{c.area}</td>
                        <td>
                          <span className="status-pill status-approved">সক্রিয় (Active)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ভিউ ২: সিটিজেনের নিজস্ব ড্যাশবোর্ড */}
        {currentView === 'my_applications' && (
          <section className="portal-section">
            <div className="portal-header">
              <h2>📋 নাগরিক ড্যাশবোর্ড ও আবেদন ট্র্যাকিং</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    setSelectedGenericService({
                      id: 'complaint',
                      title: 'অভিযোগ ও পরামর্শ প্রতিকার',
                      icon: '📢',
                    })
                  }
                >
                  📢 অভিযোগ / পরামর্শ জমা দিন
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowBirthForm(true)}
                >
                  + জন্ম নিবন্ধন আবেদন
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowCitizenshipForm(true)}
                >
                  + নাগরিকত্ব সনদ
                </button>
              </div>
            </div>

            {dashboardStats && (
              <div className="analytics-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="metric-card bg-indigo">
                  <span className="metric-title">মোট আবেদন</span>
                  <strong className="metric-value">{dashboardStats.total_applications}</strong>
                </div>
                <div className="metric-card bg-amber">
                  <span className="metric-title">প্রক্রিয়াধীন (Pending)</span>
                  <strong className="metric-value">{dashboardStats.pending_count}</strong>
                </div>
                <div className="metric-card bg-emerald">
                  <span className="metric-title">অনুমোদিত (Approved)</span>
                  <strong className="metric-value">{dashboardStats.approved_count}</strong>
                </div>
                <div className="metric-card bg-blue">
                  <span className="metric-title">বাতিল / অসম্পূর্ণ</span>
                  <strong className="metric-value">{dashboardStats.rejected_count}</strong>
                </div>
              </div>
            )}

            {loading ? (
              <p>আবেদনসমূহ লোড হচ্ছে...</p>
            ) : myApplications.length === 0 ? (
              <div className="card-box">
                <p>আপনি এখনো কোনো আবেদন জমা দেননি।</p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowBirthForm(true)}
                >
                  এখনই আবেদন করুন
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ট্র্যাকিং আইডি</th>
                      <th>সেবার ধরন</th>
                      <th>আবেদনকারী / সুবিধাভোগী</th>
                      <th>বর্তমান অবস্থা</th>
                      <th>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myApplications.map((app) => (
                      <tr key={app.tracking_id}>
                        <td><code>{app.tracking_id}</code></td>
                        <td><strong>{app.service_label}</strong></td>
                        <td>
                          <strong>{app.display_name}</strong>
                          <br />
                          <small>{app.sub_label}</small>
                        </td>
                        <td>
                          <span className={`status-pill status-${app.status}`}>
                            {app.status === 'approved'
                              ? 'অনুমোদিত'
                              : app.status === 'rejected'
                              ? 'বাতিলকৃত'
                              : 'প্রক্রিয়াধীন'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {app.status === 'approved' && (
                              <button
                                type="button"
                                className="action-btn cert-btn"
                                onClick={() => handleViewCertificate(app)}
                              >
                                📜 সনদ দেখুন
                              </button>
                            )}
                            <button
                              type="button"
                              className="secondary-btn"
                              style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                              onClick={() => setTrackingTimelineApp(app)}
                            >
                              ⏱️ হিস্ট্রি
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {myComplaints.length > 0 && (
              <div className="card-box" style={{ marginTop: '1.5rem' }}>
                <h3>📢 আপনার দাখিলকৃত অভিযোগ ও পরামর্শ ({myComplaints.length})</h3>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>অভিযোগ আইডি</th>
                        <th>বিষয়</th>
                        <th>বিবরণ</th>
                        <th>স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myComplaints.map((c) => (
                        <tr key={c.id}>
                          <td><code>{c.complaint_id}</code></td>
                          <td><strong>{c.subject}</strong></td>
                          <td>{c.description}</td>
                          <td><span className="status-pill status-pending">{c.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ভিউ ৩: ইউনিয়ন অ্যাডমিন রিভিউ ড্যাশবোর্ড */}
        {currentView === 'admin_dashboard' && (isUnionAdmin || isSuperAdmin) && (
          <section className="portal-section">
            <div className="portal-header">
              <h2>🛡️ ইউনিয়ন পরিষদ আবেদন পর্যালোচনা ও অ্যাকশন প্যানেল</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="secondary-btn" onClick={handleDownloadReport}>
                  📥 রিপোর্ট ডাউনলোড (CSV)
                </button>
                <button type="button" className="secondary-btn" onClick={fetchAdminApplications}>
                  🔄 রিফ্রেশ
                </button>
              </div>
            </div>

            {/* অ্যাডমিন সেবা ক্যাটাগরি ট্যাব */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[
                { key: 'birth', label: '📄 জন্ম নিবন্ধন আবেদন' },
                { key: 'citizenship', label: '🪪 নাগরিকত্ব সনদ আবেদন' },
                { key: 'general', label: '📜 ট্রেড লাইসেন্স ও অন্যান্য সেবা' },
                { key: 'complaints', label: '📢 নাগরিক অভিযোগসমূহ' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setAdminTab(t.key); setStatusActionId(null); }}
                  className={adminTab === t.key ? 'primary-button' : 'secondary-btn'}
                  style={{ padding: '0.55rem 1rem', fontSize: '0.88rem' }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {adminTab !== 'complaints' && (
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '1.2rem',
                  flexWrap: 'wrap',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <input
                    type="text"
                    placeholder="🔍 ট্র্যাকিং নম্বর বা নাম লিখে খুঁজুন..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchAdminApplications()}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div style={{ minWidth: '160px' }}>
                  <select
                    value={adminStatusFilter}
                    onChange={(e) => setAdminStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="">সকল স্ট্যাটাস (All)</option>
                    <option value="pending">প্রক্রিয়াধীন (Pending)</option>
                    <option value="approved">অনুমোদিত (Approved)</option>
                    <option value="rejected">বাতিলকৃত (Rejected)</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={fetchAdminApplications}
                  style={{ padding: '0.65rem 1.2rem' }}
                >
                  ফিল্টার প্রয়োগ
                </button>
              </div>
            )}

            {loading ? (
              <p>তথ্য লোড হচ্ছে...</p>
            ) : adminApplications.length === 0 ? (
              <p>এই ক্যাটাগরিতে কোনো আবেদন বা রেকর্ড পাওয়া যায়নি।</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>আইডি / ট্র্যাকিং</th>
                      <th>আবেদনকারী / বিবরণ</th>
                      <th>অভিভাবক / বিস্তারিত</th>
                      <th>বর্তমান অবস্থা</th>
                      <th>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminApplications.map((app) => (
                      <tr key={app.id}>
                        <td>
                          #{app.id} <br />
                          <code>{app.tracking_id || app.complaint_id}</code>
                        </td>
                        <td>
                          <strong>{app.child_name || app.name || app.applicant_name || app.subject}</strong>
                          <br />
                          <small>{app.birth_date || app.service_type || app.phone || ''}</small>
                        </td>
                        <td>
                          {app.father_name || app.guardian_name || app.description || ''}
                          {app.mother_name ? <><br />{app.mother_name}</> : null}
                        </td>
                        <td>
                          <span className={`status-pill status-${app.status}`}>{app.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {adminTab === 'birth' && (
                              <button
                                type="button"
                                className="secondary-btn"
                                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                                onClick={() => handleInspectApp(app)}
                              >
                                👁️ বিস্তারিত
                              </button>
                            )}

                            {adminTab === 'complaints' ? (
                              <button
                                type="button"
                                className="primary-button"
                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                onClick={() => handleUpdateStatus(app.id, 'নিষ্পত্তিকৃত')}
                              >
                                ✓ নিষ্পত্তি করুন
                              </button>
                            ) : statusActionId === app.id ? (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                <input
                                  type="text"
                                  placeholder="মন্তব্য লিখুন"
                                  value={remarksInput}
                                  onChange={(e) => setRemarksInput(e.target.value)}
                                  style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                                />
                                <button
                                  type="button"
                                  className="primary-button"
                                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                  onClick={() => handleUpdateStatus(app.id, 'approved')}
                                >
                                  অনুমোদন
                                </button>
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#fee2e2', color: '#b91c1c' }}
                                  onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                >
                                  বাতিল
                                </button>
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                  onClick={() => setStatusActionId(null)}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="action-btn edit-btn"
                                onClick={() => {
                                  setStatusActionId(app.id)
                                  setRemarksInput('')
                                }}
                              >
                                ⚙️ রিভিউ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ভিউ ৪: মূল হোমপেজ */}
        {currentView === 'home' && (
          <>
            <section className="smart-hero" id="home">
              <div className="smart-hero-container">
                <div className="smart-hero-content">
                  <span className="smart-hero-badge">ডিজিটাল নাগরিক সেবা</span>
                  <h1>
                    আপনার ইউনিয়ন পরিষদের সেবা, এখন<br />
                    <strong>আরও সহজ ও স্বচ্ছ</strong>
                  </h1>
                  <p>
                    সনদ আবেদন, জন্ম নিবন্ধন, সনদ যাচাই ও ট্র্যাকিং—সবকিছুই এখন এক নির্ভরযোগ্য ও স্বচ্ছ প্ল্যাটফর্মে।
                  </p>
                  <div className="smart-hero-actions">
                    <a href="#services" className="smart-btn-primary">
                      সেবা দেখুন ↗
                    </a>
                    <button
                      type="button"
                      className="smart-btn-secondary"
                      onClick={() => setShowVerifyModal(true)}
                    >
                      সনদ যাচাই করুন 🔍
                    </button>
                  </div>
                </div>

                <div className="smart-hero-card">
                  <div className="hero-card-icon">🛡️</div>
                  <h3>নিরাপদ ও যাচাইযোগ্য সেবা</h3>
                  <p>আবেদনের অগ্রগতি ট্র্যাক করুন এবং অনলাইনে যেকোনো সময় সনদ সংগ্রহ ও যাচাই করুন।</p>
                </div>
              </div>
            </section>

            <section style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
              <div className="smart-section-header" style={{ marginBottom: '1rem' }}>
                <span className="sub-title">NATIONAL GOVERNANCE DATA</span>
                <h2>বাংলাদেশ প্রশাসনিক কাঠামো ও নেটওয়ার্ক</h2>
                <p>স্থানীয় সরকার থেকে কেন্দ্রীয় মন্ত্রণালয় পর্যন্ত ডিজিটাল কানেক্টিভিটি</p>
              </div>
              <GovStatsGrid />
            </section>

            <section className="smart-highlights-section">
              <div className="smart-highlights-grid">
                <div className="highlight-box">
                  <div className="hl-icon">🛡️</div>
                  <h4>নিরাপদ ও যাচাইযোগ্য</h4>
                  <p>প্রতিটি সনদ অনলাইনে ও কিউআর কোডে সরাসরি যাচাই করা যায়।</p>
                </div>
                <div className="highlight-box">
                  <div className="hl-icon">৳</div>
                  <h4>স্বচ্ছ মূল্য</h4>
                  <p>সব সেবার সরকারি মূল্য BDT-তে স্পষ্টভাবে প্রদর্শিত।</p>
                </div>
                <div className="highlight-box">
                  <div className="hl-icon">🏛️</div>
                  <h4>একীভূত সেবা</h4>
                  <p>আবেদন, যাচাই-বাছাই ও সনদ অনুমোদন একসাথে।</p>
                </div>
                <div className="highlight-box">
                  <div className="hl-icon">📞</div>
                  <h4>দ্রুত সহায়তা</h4>
                  <p>নাগরিক সেবা কেন্দ্র ও ডিজিটাল সহকারী থেকে সার্বক্ষণিক সহায়তা।</p>
                </div>
              </div>
            </section>

            {!isUnionAdmin && !isSuperAdmin && (
            <section className="smart-services-section" id="services">
              <div className="smart-section-header">
                <span className="sub-title">DIGITAL SERVICES</span>
                <h2>সনদের সেবাসমূহ</h2>
                <p>প্রযোজ্য সরকারি ফি ও চার্জ BDT-তে দেখানো হয়।</p>
              </div>

              <div className="smart-service-grid">
                {certificateServices.map((srv) => (
                  <div
                    key={srv.id}
                    className="smart-service-card"
                    onClick={() => {
                      if (isUnionAdmin || isSuperAdmin) {
                        alert('অ্যাডমিন অ্যাকাউন্ট থেকে নাগরিক সেবার জন্য আবেদন করা যাবে না। আবেদন পরিচালনা ও ট্র্যাক করতে আপনার অ্যাডমিন ড্যাশবোর্ড ব্যবহার করুন।')
                        return
                      }
                      if (srv.id === 'birth') {
                        openBirthApplication()
                      } else if (srv.id === 'citizenship') {
                        openCitizenshipApplication()
                      } else {
                        if (!user) {
                          setShowAuth(true)
                        } else {
                          setSelectedGenericService(srv)
                        }
                      }
                    }}
                  >
                    <div className="smart-icon-wrapper">
                      <span className="card-emoji">{srv.icon}</span>
                    </div>
                    <h3>{srv.title}</h3>
                    <span className="service-price-tag">{srv.price}</span>
                  </div>
                ))}
              </div>
            </section>
            )}

            {/* ডিজিটাল বাংলা ভয়েস সহকারী ও সরকারি ফি ক্যালকুলেটর */}
            <section style={{ padding: '1rem 1.5rem 2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
              <CitizenAccessibility />
            </section>

            <section className="smart-links-section">
              <div className="links-container">
                <div className="links-header">
                  <span className="link-icon">🔗</span>
                  <h3>গুরুত্বপূর্ণ সরকারি পোর্টাল ও লিংক</h3>
                </div>
                <div className="gov-links-grid">
                  <a href="https://bangladesh.gov.bd" target="_blank" rel="noreferrer" className="gov-link-item">
                    <span>বাংলাদেশ জাতীয় তথ্য বাতায়ন</span> ↗
                  </a>
                  <a href="https://pmo.gov.bd" target="_blank" rel="noreferrer" className="gov-link-item">
                    <span>প্রধানমন্ত্রীর কার্যালয়</span> ↗
                  </a>
                  <a href="https://cabinet.gov.bd" target="_blank" rel="noreferrer" className="gov-link-item">
                    <span>মন্ত্রিপরিষদ বিভাগ</span> ↗
                  </a>
                  <a href="https://dghs.gov.bd" target="_blank" rel="noreferrer" className="gov-link-item">
                    <span>স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়</span> ↗
                  </a>
                  <a href="https://moedu.gov.bd" target="_blank" rel="noreferrer" className="gov-link-item">
                    <span>শিক্ষা মন্ত্রণালয়</span> ↗
                  </a>
                  <a href="https://moi.gov.bd" target="_blank" rel="noreferrer" className="gov-link-item">
                    <span>তথ্য ও সম্প্রচার মন্ত্রণালয়</span> ↗
                  </a>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* আবেদন বিস্তারিত ও অডিট লগ ইনস্পেকশন মডাল */}
      {inspectingApp && (
        <div className="cert-modal-overlay">
          <div className="cert-modal-container" style={{ maxWidth: '640px', padding: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>📑 আবেদন পর্যালোচনা ও ভেরিফিকেশন</h3>
              <button
                type="button"
                onClick={() => setInspectingApp(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
              <div>ট্র্যাকিং আইডি: <code>{inspectingApp.tracking_id}</code></div>
              <div>বর্তমান স্ট্যাটাস: <strong className={`status-pill status-${inspectingApp.status}`}>{inspectingApp.status}</strong></div>
              <div>সন্তানের নাম: <strong>{inspectingApp.child_name}</strong></div>
              <div>জন্ম তারিখ: <strong>{inspectingApp.birth_date}</strong></div>
              <div>পিতার নাম: {inspectingApp.father_name}</div>
              <div>মাতার নাম: {inspectingApp.mother_name}</div>
              <div style={{ gridColumn: 'span 2' }}>জন্মস্থান ও ঠিকানা: {inspectingApp.birth_place}, {inspectingApp.address}</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.2rem' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.92rem', color: '#334155' }}>🔒 অডিট ট্রেইল ও কার্যক্রম হিস্ট্রি ({inspectingLogs.length})</h4>
              {inspectingLogs.length === 0 ? (
                <small style={{ color: '#64748b' }}>এখনো কোনো পূর্ববর্তী অ্যাকশন লগ নেই।</small>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {inspectingLogs.map((log) => (
                    <div key={log.id} style={{ fontSize: '0.82rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '4px' }}>
                      <strong>অ্যাকশন:</strong> {log.action} | <strong>মন্তব্য:</strong> {log.remarks || 'কোনো মন্তব্য নেই'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ background: '#fee2e2', color: '#b91c1c' }}
                onClick={() => handleUpdateStatus(inspectingApp.id, 'rejected')}
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => handleUpdateStatus(inspectingApp.id, 'approved')}
              >
                অনুমোদন ও সনদ ইস্যু
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ডিজিটাল জন্ম সনদ মডাল ভিউ */}
      {selectedCertificate && (
        <div className="cert-modal-overlay">
          <div className="cert-modal-container">
            <div className="cert-actions-bar no-print">
              <button
                type="button"
                className="primary-button"
                onClick={() => window.print()}
              >
                🖨️ প্রিন্ট / সেভ PDF
              </button>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setSelectedCertificate(null)}
              >
                ✕ বন্ধ করুন
              </button>
            </div>

            <div className="bdris-certificate-sheet">
              <div className="bdris-top-grid">
                <div className="bdris-qr-box">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`${API_BASE}/api/public/verify/${selectedCertificate.tracking_id}`)}`}
                    alt="QR Code"
                  />
                </div>

                <div className="bdris-govt-header">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/8/84/Government_Seal_of_Bangladesh.svg"
                    alt="Bangladesh Govt Emblem"
                    className="govt-emblem"
                  />
                  <h3>Government of the People's Republic of Bangladesh</h3>
                  <h4>Office of the Registrar, Birth and Death Registration</h4>
                  <h5>{selectedCertificate.union_name || 'বিষ্ণুপুর ইউনিয়ন পরিষদ'}</h5>
                  <p className="rule-text">(Rule 9, 10)</p>
                  <h2>জন্ম নিবন্ধন সনদ / Birth Registration Certificate</h2>
                </div>

                <div className="bdris-barcode-box">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=92x92&data=${encodeURIComponent(`${window.location.origin}/?verify=${selectedCertificate.tracking_id}${selectedCertificate.verification_hash ? `&h=${selectedCertificate.verification_hash}` : ''}`)}`}
                      alt="Birth Certificate QR Verification"
                      style={{ width: '78px', height: '78px', border: '1px solid #cbd5e1', padding: '3px', background: '#fff', borderRadius: '6px' }}
                    />
                    {selectedCertificate.verification_hash && (
                      <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#166534', fontWeight: 700 }}>
                        SHA256:{selectedCertificate.verification_hash.slice(0, 12)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bdris-meta-bar">
                <div className="meta-col">
                  <span>Date of Registration</span>
                  <strong>{selectedCertificate.issue_date}</strong>
                </div>
                <div className="meta-col center">
                  <span>Birth Registration Number</span>
                  <strong className="brn-number">{selectedCertificate.certificate_number}</strong>
                </div>
                <div className="meta-col right">
                  <span>Date of Issuance</span>
                  <strong>{selectedCertificate.issue_date}</strong>
                </div>
              </div>

              <div className="bdris-details-grid">
                <div className="detail-line">
                  <span className="lbl">Date of Birth</span>
                  <span className="val">: {selectedCertificate.birth_date}</span>
                </div>
                <div className="detail-line">
                  <span className="lbl">Sex</span>
                  <span className="val">: {selectedCertificate.gender === 'male' ? 'Male / পুরুষ' : 'Female / মহিলা'}</span>
                </div>
                <div className="detail-line full">
                  <span className="lbl">In Word</span>
                  <span className="val">: {selectedCertificate.birth_date} (Official Record)</span>
                </div>
              </div>

              <hr className="bdris-divider" />

              <div className="bdris-info-table">
                <div className="info-row">
                  <div className="info-cell-bn">
                    <span className="f-title">নাম</span>
                    <span className="f-val">: {selectedCertificate.child_name}</span>
                  </div>
                  <div className="info-cell-en">
                    <span className="f-title">Name</span>
                    <span className="f-val">: {selectedCertificate.child_name}</span>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-cell-bn">
                    <span className="f-title">মাতা</span>
                    <span className="f-val">: {selectedCertificate.mother_name}</span>
                  </div>
                  <div className="info-cell-en">
                    <span className="f-title">Mother</span>
                    <span className="f-val">: {selectedCertificate.mother_name}</span>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-cell-bn">
                    <span className="f-title">পিতা</span>
                    <span className="f-val">: {selectedCertificate.father_name}</span>
                  </div>
                  <div className="info-cell-en">
                    <span className="f-title">Father</span>
                    <span className="f-val">: {selectedCertificate.father_name}</span>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-cell-bn">
                    <span className="f-title">জন্মস্থান</span>
                    <span className="f-val">: {selectedCertificate.birth_place}</span>
                  </div>
                  <div className="info-cell-en">
                    <span className="f-title">Place of Birth</span>
                    <span className="f-val">: {selectedCertificate.birth_place}</span>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-cell-bn">
                    <span className="f-title">স্থায়ী ঠিকানা</span>
                    <span className="f-val">: {selectedCertificate.address}</span>
                  </div>
                  <div className="info-cell-en">
                    <span className="f-title">Permanent Address</span>
                    <span className="f-val">: {selectedCertificate.address}</span>
                  </div>
                </div>
              </div>

              <div className="bdris-signature-section">
                <div className="sig-block left">
                  <div className="sig-line"></div>
                  <strong>Seal & Signature</strong>
                  <span>Assistant to Registrar</span>
                </div>
                <div className="sig-block right">
                  <div className="sig-line"></div>
                  <strong>Seal & Signature</strong>
                  <span>Registrar / Chairman</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* নাগরিকত্ব ও সাধারণ সনদ প্রিভিউ মডাল */}
      {selectedOfficialCert && (
        <OfficialCertificate
          certificateData={selectedOfficialCert}
          onClose={() => setSelectedOfficialCert(null)}
        />
      )}

      {/* অন্যান্য সেবা মডাল */}
      {selectedGenericService && (
        <OtherServicesModal
          service={selectedGenericService}
          onClose={() => setSelectedGenericService(null)}
          onSuccess={() => {
            fetchMyApplications()
            fetchCitizenDashboard()
          }}
        />
      )}

      {/* ট্র্যাকিং টাইমলাইন হিস্ট্রি পপআপ */}
      {trackingTimelineApp && (
        <div className="cert-modal-overlay">
          <div className="cert-modal-container" style={{ maxWidth: '480px', padding: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>⏱️ আবেদনের স্ট্যাটাস ও টাইমলাইন</h3>
              <button
                type="button"
                onClick={() => setTrackingTimelineApp(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: '0.9rem', marginBottom: '1.2rem' }}>
              <div>ট্র্যাকিং আইডি: <code>{trackingTimelineApp.tracking_id}</code></div>
              <div>আবেদনকারী: <strong>{trackingTimelineApp.display_name || trackingTimelineApp.child_name || user?.full_name}</strong></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '2px solid #10b981', paddingLeft: '1rem', marginLeft: '6px' }}>
              <div>
                <strong style={{ color: '#15803d' }}>১. আবেদন জমা (Submitted)</strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>নাগরিক কর্তৃক অনলাইনে সফলভাবে জমা দেওয়া হয়েছে।</p>
              </div>
              <div>
                <strong style={{ color: trackingTimelineApp.status !== 'pending' ? '#15803d' : '#f59e0b' }}>
                  ২. ইউনিয়ন পরিষদ পর্যালোচনা (Under Review)
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>সহকারী কর্মকর্তা কাগজপত্র যাচাই করছেন।</p>
              </div>
              {trackingTimelineApp.status === 'approved' && (
                <div>
                  <strong style={{ color: '#15803d' }}>৩. সনদ প্রদান (Approved & Issued)</strong>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>ডিজিটাল সিল ও কিউআর কোডসহ সনদ ইস্যু সম্পন্ন হয়েছে।</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {showTransparencyModal && (
        <TransparencyMapModal
          currentUser={user}
          onClose={() => setShowTransparencyModal(false)}
        />
      )}

      {showVerifyModal && (
        <PublicVerifyModal
          initialTrackingId={verifyInitialId}
          initialHash={verifyInitialHash}
          onClose={() => {
            setShowVerifyModal(false)
            setVerifyInitialId('')
            setVerifyInitialHash('')
            if (window.location.search.includes('verify=')) {
              window.history.replaceState({}, '', window.location.pathname)
            }
          }}
        />
      )}

      <Chatbot />

      <footer className="smart-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <strong>🌿 GramSheba — স্মার্ট ইউনিয়ন পোর্টাল</strong>
            <p>প্রযুক্তি দিয়ে স্থানীয় সরকার সেবাকে সহজ ও স্বচ্ছ করা।</p>
          </div>
          <div className="footer-links">
            <span>কপিরাইট © ২০২৬ গ্রামসেবা। সর্বস্বত্ব সংরক্ষিত।</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
