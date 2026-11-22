import { useState, useRef } from 'react'
import API_BASE from '../api'

export default function VoiceAssistBar({ onExtracted, lang = 'bn' }) {
  const [listening, setListening] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const recognitionRef = useRef(null)

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null

  async function processTranscript(textToParse) {
    const clean = (textToParse || '').trim()
    if (!clean) return
    setParsing(true)
    setStatusMsg('🤖 AI আপনার কথা বিশ্লেষণ করে ফর্ম পূরণ করছে...')
    try {
      const res = await fetch(`${API_BASE}/api/ai/parse-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: clean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'ভয়েস বিশ্লেষণ করা যায়নি।')
      const ext = data.extracted_data || {}
      const filledCount = Object.values(ext).filter((v) => v && String(v).trim()).length
      if (filledCount > 0) {
        onExtracted(ext)
        setStatusMsg(`✅ ভয়েস থেকে ${filledCount}টি ঘর স্বয়ংক্রিয়ভাবে পূরণ করা হয়েছে!`)
      } else {
        setStatusMsg('⚠️ স্পষ্টভাবে নাম, পিতার নাম, গ্রাম বা মোবাইল নম্বর উল্লেখ করে আবার বলুন।')
      }
    } catch (err) {
      setStatusMsg(`⚠️ ${err.message || 'ভয়েস পার্স করতে সমস্যা হয়েছে।'}`)
    } finally {
      setParsing(false)
    }
  }

  function toggleListening() {
    if (!SpeechRecognition) {
      setStatusMsg('⚠️ আপনার ব্রাউজার সরাসরি ভয়েস সাপোর্ট করে না। নিচের বক্সে লিখে "ফর্ম পূরণ করুন" চাপুন (Chrome/Edge-এ ভয়েস সরাসরি কাজ করে)।')
      return
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = lang === 'en' ? 'en-US' : 'bn-BD'
    recognition.continuous = false
    recognition.interimResults = true

    let finalSpoken = ''

    recognition.onstart = () => {
      setListening(true)
      setStatusMsg('🎙️ শুনছি... বলুন যেমন: "আমার নাম করিম মিয়া, বাবার নাম রহিম উদ্দিন, মায়ের নাম সখিনা বেগম, গ্রাম বিষ্ণুপুর, ওয়ার্ড ৪, মোবাইল ০১৭১২৩৪৫৬৭৮"')
    }

    recognition.onresult = (event) => {
      let combined = ''
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript
      }
      finalSpoken = combined
      setTranscript(combined)
    }

    recognition.onerror = (event) => {
      setListening(false)
      setStatusMsg(
        event.error === 'not-allowed'
          ? '⚠️ মাইক্রোফোন ব্যবহারের অনুমতি (Permission) দিন।'
          : '⚠️ ভয়েস শোনা যায়নি, আবার চেষ্টা করুন।'
      )
    }

    recognition.onend = () => {
      setListening(false)
      if (finalSpoken.trim()) {
        processTranscript(finalSpoken)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
        border: '1.5px solid #93c5fd',
        borderRadius: '12px',
        padding: '0.95rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        marginBottom: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div>
          <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.94rem' }}>
            🎙️ বাংলা ভয়েস-টু-ফর্ম (মুখে বলেই আবেদন পূরণ করুন)
          </div>
          <div style={{ fontSize: '0.79rem', color: '#334155', marginTop: '2px' }}>
            মাইক্রোফোন চেপে বলুন: &ldquo;আমার নাম ..., বাবার নাম ..., মায়ের নাম ..., গ্রাম ..., ওয়ার্ড ৪&rdquo;
          </div>
        </div>
        <button
          type="button"
          onClick={toggleListening}
          disabled={parsing}
          style={{
            background: listening ? '#dc2626' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '999px',
            padding: '0.55rem 1.05rem',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            boxShadow: listening ? '0 0 0 4px rgba(220,38,38,0.22)' : '0 2px 6px rgba(37,99,235,0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          {listening ? '⏹️ বলা শেষ (থামান)' : parsing ? '⏳ বিশ্লেষণ হচ্ছে...' : '🎤 মুখে বলুন'}
        </button>
      </div>

      {(transcript || !SpeechRecognition) && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="আপনার বলা কথা এখানে দেখা যাবে (চাইলে এডিটও করতে পারবেন)..."
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              fontSize: '0.85rem',
              background: '#fff',
            }}
          />
          <button
            type="button"
            onClick={() => processTranscript(transcript)}
            disabled={parsing || !transcript.trim()}
            style={{
              background: '#1b734e',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            ফর্ম পূরণ করুন
          </button>
        </div>
      )}

      {statusMsg && (
        <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>
          {statusMsg}
        </div>
      )}
    </div>
  )
}
