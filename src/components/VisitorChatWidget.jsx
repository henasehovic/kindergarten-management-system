import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from './LanguageContext'
import { fetchVisitorMessages, sendVisitorMessage } from '../lib/chatApi'

const ChatContext = createContext(null)

export const useChat = () => useContext(ChatContext)

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadMessages = async () => {
    try {
      const data = await fetchVisitorMessages()
      setConversationId(data.conversationId)
      setMessages(data.messages || [])
      setError('')
    } catch (err) {
      setError(err.message || 'Chat unavailable right now.')
    }
  }

  useEffect(() => {
    loadMessages().finally(() => setLoading(false))
    const id = setInterval(loadMessages, 8000)
    return () => clearInterval(id)
  }, [])

  const sendMessage = async (content) => {
    const text = (content || '').trim()
    if (!text) return
    const data = await sendVisitorMessage(text)
    setConversationId(data.conversationId)
    setMessages(data.messages || [])
  }

  const value = useMemo(
    () => ({
      messages,
      conversationId,
      loading,
      error,
      refresh: loadMessages,
      sendMessage,
    }),
    [messages, conversationId, loading, error]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export default function VisitorChatWidget() {
  const { language } = useLanguage()
  const { messages, loading, error, sendMessage } = useChat()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)

  const copy = {
    en: {
      tooltip: 'Do you have any questions?',
      header: 'Questions?',
      empty: 'Start a conversation. We usually reply quickly.',
      placeholder: 'Ask us anything...',
    },
    bs: {
      tooltip: 'Imate li pitanja?',
      header: 'Imate pitanja?',
      empty: 'Započnite razgovor. Odgovaramo brzo.',
      placeholder: 'Pošaljite nam poruku...',
    },
  }[language] || {
    tooltip: 'Do you have any questions?',
    header: 'Questions?',
    empty: 'Start a conversation. We usually reply quickly.',
    placeholder: 'Ask us anything...',
  }

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    try {
      setSending(true)
      await sendMessage(draft)
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative group">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-14 w-14 rounded-full bg-babyPink text-navy shadow-lg shadow-berry/25 border border-white/70 hover:scale-105 transition focus:outline-none focus:ring-4 focus:ring-white/60 flex items-center justify-center"
            title={copy.tooltip}
            aria-label={`Open chat: ${copy.tooltip}`}
          >
            <span className="text-2xl" aria-hidden="true">💬</span>
          </button>
          <div className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition duration-200">
            <div className="rounded-2xl bg-white border border-babyBlue/50 shadow-lg px-3 py-2 text-sm text-navy whitespace-nowrap">
              {copy.tooltip}
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed bottom-24 right-4 z-40 w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white shadow-2xl border border-navy/10 overflow-hidden">
          <div className="bg-berry text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">{copy.header}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white text-lg leading-none px-2"
              aria-label="Close chat"
            >
              ×
            </button>
          </div>
          <div ref={listRef} className="px-4 py-3 space-y-2 max-h-72 overflow-y-auto bg-sky/10">
            {loading && <p className="text-sm text-navy/60">Loading chat...</p>}
            {error && <p className="text-sm text-berry">{error}</p>}
            {!loading && !messages.length && !error && (
              <p className="text-sm text-navy/60">{copy.empty}</p>
            )}
            {messages.map((m) => {
              const isVisitor = m.sender === 'VISITOR'
              return (
                <div key={m.id} className={`flex ${isVisitor ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`px-3 py-2 rounded-2xl max-w-[80%] text-sm ${
                      isVisitor ? 'bg-berry text-white rounded-br-sm' : 'bg-white border border-navy/10 text-navy rounded-bl-sm'
                    }`}
                  >
                    <p>{m.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <form className="p-4 border-t border-navy/10 bg-white flex items-center gap-2" onSubmit={handleSend}>
            <input
              className="flex-1 rounded-full border border-navy/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-berry/50 bg-sky/5"
              placeholder={copy.placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="px-4 py-2 rounded-full bg-berry text-white font-semibold text-sm shadow hover:-translate-y-0.5 transition disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  )
}
