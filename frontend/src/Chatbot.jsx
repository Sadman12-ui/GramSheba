import { useState, useRef, useEffect } from 'react'

const API_BASE = 'http://localhost:8000'

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'আসসালামু আলাইকুম! আমি গ্রামসেবা ডিজিটাল সহকারী। নাগরিক সেবা সংক্রান্ত যেকোনো তথ্য জানতে আমাকে বাংলায় প্রশ্ন করতে পারেন।',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userText = input.trim()
    setMessages((prev) => [...prev, { sender: 'user', text: userText }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }])
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: 'দুঃখিত, বর্তমানে সংযোগে সমস্যা হচ্ছে।' },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'সার্ভারের সাথে যোগাযোগ করা যায়নি।' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chatbot-wrapper">
      {!isOpen && (
        <button
          type="button"
          className="chatbot-fab-btn"
          onClick={() => setIsOpen(true)}
          title="সহায়তার জন্য চ্যাট করুন"
        >
          💬 <span className="fab-label">সহায়তা</span>
        </button>
      )}

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="header-info">
              <span className="bot-avatar">🤖</span>
              <div>
                <strong>গ্রামসেবা সহকারী</strong>
                <span className="online-indicator">অনলাইন</span>
              </div>
            </div>
            <button
              type="button"
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="chatbot-body">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble ${m.sender}`}>
                <p>{m.text}</p>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble bot typing">
                <span>লিখছে...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-footer" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="আপনার প্রশ্ন বাংলায় লিখুন..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={!input.trim() || loading}>
              পাঠান
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default Chatbot
