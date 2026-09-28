import { useEffect, useMemo, useState } from 'react'
import {
  fetchAdminChatConversation,
  fetchAdminChatConversations,
  sendAdminChatReply,
} from '../../lib/chatApi'
import { formatRelativeTime } from '../../lib/adminDataService'

const CARD_CLASS = 'bg-white rounded-2xl shadow border border-navy/10'

export default function ChatInbox({ onUnreadChange }) {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadVisitor || 0), 0),
    [conversations]
  )

  useEffect(() => {
    if (onUnreadChange) onUnreadChange(totalUnread)
  }, [totalUnread, onUnreadChange])

  const loadConversations = async () => {
    setLoadingList(true)
    try {
      const data = await fetchAdminChatConversations()
      setConversations(data || [])
      setError('')
      if (!activeId && data?.length) {
        setActiveId(data[0].id)
        await loadConversation(data[0].id, true)
      }
    } catch (err) {
      setError(err.message || 'Could not load chats')
    } finally {
      setLoadingList(false)
    }
  }

  const loadConversation = async (id, silent = false) => {
    setActiveId(id)
    if (!silent) setLoadingMessages(true)
    try {
      const data = await fetchAdminChatConversation(id)
      setMessages(data.messages || [])
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadVisitor: 0 } : c)))
      setError('')
    } catch (err) {
      setError(err.message || 'Could not load conversation')
    } finally {
      if (!silent) setLoadingMessages(false)
    }
  }

  const handleReply = async (e) => {
    e.preventDefault()
    if (!reply.trim() || !activeId) return
    try {
      setSending(true)
      const data = await sendAdminChatReply(activeId, reply)
      setMessages(data.messages || [])
      setReply('')
      await loadConversations()
    } catch (err) {
      setError(err.message || 'Could not send reply')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    loadConversations()
    const id = setInterval(loadConversations, 7000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!activeId) return undefined
    const id = setInterval(() => loadConversation(activeId, true), 6000)
    return () => clearInterval(id)
  }, [activeId])

  const activeConversation = conversations.find((c) => c.id === activeId)

  return (
    <div className={`${CARD_CLASS} p-5 space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-berry font-semibold text-sm">Visitor chat</p>
          <h3 className="font-display text-xl">Questions inbox</h3>
        </div>
        <button
          className="text-sm px-3 py-2 rounded-xl border border-navy/15 bg-white hover:bg-sky/30"
          onClick={loadConversations}
        >
          Refresh
        </button>
      </div>
      {error && <div className="text-sm text-berry bg-berry/10 border border-berry/30 px-3 py-2 rounded-xl">{error}</div>}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-2">
          <div className="flex items-center justify-between text-sm text-navy/70">
            <span>Conversations</span>
            {loadingList && <span className="text-berry">Loading...</span>}
          </div>
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`w-full text-left px-3 py-3 rounded-xl border transition ${
                  activeId === c.id ? 'border-berry bg-berry/5' : 'border-navy/10 hover:border-berry/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-navy">Visitor {c.id}</p>
                  {c.unreadVisitor > 0 && (
                    <span className="text-xs bg-berry text-white rounded-full px-2 py-1">{c.unreadVisitor} new</span>
                  )}
                </div>
                <p className="text-xs text-navy/60">
                  {c.lastMessage?.content || 'No messages yet'}
                </p>
                <p className="text-[11px] text-navy/50">
                  {c.lastVisitorAt ? `Updated ${formatRelativeTime(c.lastVisitorAt)}` : 'No recent activity'}
                </p>
              </button>
            ))}
            {!conversations.length && <p className="text-sm text-navy/60">No chats yet.</p>}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className={`${CARD_CLASS} p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-navy/60">Conversation</p>
                <p className="font-semibold text-navy">
                  {activeConversation ? `Visitor ${activeConversation.id}` : 'Select a conversation'}
                </p>
              </div>
              {loadingMessages && <span className="text-xs text-berry">Loading...</span>}
            </div>
            <div className="border border-navy/10 rounded-xl p-3 max-h-[320px] min-h-[220px] overflow-y-auto space-y-2 bg-sky/10">
              {!activeConversation && <p className="text-sm text-navy/60">Choose a chat to view messages.</p>}
              {activeConversation &&
                messages.map((m) => {
                  const isAdmin = m.sender === 'ADMIN'
                  return (
                    <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`px-3 py-2 rounded-2xl max-w-[80%] text-sm ${
                          isAdmin ? 'bg-berry text-white rounded-br-sm' : 'bg-white border border-navy/10 text-navy rounded-bl-sm'
                        }`}
                      >
                        <p className="text-xs text-white/70">{isAdmin ? 'Admin' : 'Visitor'}</p>
                        <p>{m.content}</p>
                        <p className="text-[10px] text-white/70 mt-1">{formatRelativeTime(m.createdAt)}</p>
                      </div>
                    </div>
                  )
                })}
              {activeConversation && !messages.length && (
                <p className="text-sm text-navy/60">No messages yet.</p>
              )}
            </div>
            <form className="flex gap-2 pt-1" onSubmit={handleReply}>
              <input
                className="flex-1 rounded-xl border border-navy/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-berry/50 bg-white"
                placeholder="Type your reply..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={!activeConversation || sending}
              />
              <button
                className="px-4 py-2 rounded-xl bg-berry text-white font-semibold text-sm shadow disabled:opacity-60"
                disabled={!reply.trim() || !activeConversation || sending}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
