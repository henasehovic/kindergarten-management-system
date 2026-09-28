import { useEffect, useState } from 'react'
import { useLanguage } from '../components/LanguageContext'
import LazySection from '../components/LazySection'

export default function ParentPage() {
  const { t } = useLanguage()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [blockedAdmin, setBlockedAdmin] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'login'
    return sessionStorage.getItem('parentUsername') ? 'dashboard' : 'login'
  })

  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState('')
  const [messages, setMessages] = useState([])
  const [weekMenu, setWeekMenu] = useState({})
  const [weekActivities, setWeekActivities] = useState({})
  const [events, setEvents] = useState([])
  const [parentUsername, setParentUsername] = useState('')
  const [parentName, setParentName] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  // no inline login window on dashboard page; separate login route handles auth

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('role') : ''
    if (stored === 'admin') {
      setBlockedAdmin(true)
      setError('You are signed in as admin. Please sign out before using the parent portal.')
    }
  }, [])

  const loadChildren = async (uname) => {
    const res = await fetch(`/api/parent/children?username=${encodeURIComponent(uname)}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to load children')
    const data = await res.json()
    setChildren(data)
    if (data[0]) {
      setSelectedChild(data[0].jmbg)
      if (data[0].parentName) setParentName(data[0].parentName)
    }
    return data
  }

  const loadMessages = async (childJmbg, uname) => {
    if (!childJmbg || !uname) return
    const res = await fetch(
      `/api/child-messages/${childJmbg}?role=parent&username=${encodeURIComponent(uname)}`,
      { cache: 'no-store' }
    )
    if (!res.ok) throw new Error('Failed to load messages')
    const data = await res.json()
    setMessages(data)
  }

  const loadWeekData = async (group, childJmbg) => {
    try {
      const [menuRes, actRes, calRes] = await Promise.all([
        fetch(`/api/menu?group=${encodeURIComponent(group || '')}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/activities?group=${encodeURIComponent(group || '')}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(
          `/api/calendar?role=parent&childJmbg=${encodeURIComponent(childJmbg || '')}&group=${encodeURIComponent(group || '')}`,
          { cache: 'no-store' }
        ).then((r) => r.json()),
      ])
      setWeekMenu(menuRes || {})
      setWeekActivities(actRes || {})
      const upcoming = []
      const today = new Date()
      const limit = new Date()
      limit.setDate(limit.getDate() + 30)
      ;(calRes.events || []).forEach((ev) => {
        const d = new Date(ev.startsAt)
        if (d >= today && d <= limit) upcoming.push(ev)
      })
      ;(calRes.birthdays || []).forEach((b) => {
        const d = new Date(b.date || b.startsAt)
        if (d >= today && d <= limit) upcoming.push({ ...b, startsAt: d.toISOString(), isBirthday: true })
      })
      setEvents(upcoming.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)))
    } catch (err) {
      console.error(err)
      setWeekMenu({})
      setWeekActivities({})
      setEvents([])
    }
  }

  const loadPayments = async (childJmbg, uname) => {
    if (!childJmbg || !uname) return
    try {
      const res = await fetch(
        `/api/payments?childJmbg=${encodeURIComponent(childJmbg)}&role=parent&username=${encodeURIComponent(uname)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error('Failed to load payments')
      const data = await res.json()
      setPayments(data || [])
    } catch (err) {
      console.error(err)
      setPayments([])
    }
  }

  const onLogin = async (e) => {
    e.preventDefault()
    if (blockedAdmin) return
    setError('')
    setLoading(true)
    try {
      const credRes = await fetch('/api/credentials', { cache: 'no-store' })
      const creds = await credRes.json()
      const match = creds.find((c) => c.role === 'parent' && c.username === username && c.password === password)
      if (!match) {
        setError('Invalid username or password')
        setLoading(false)
        return
      }
      setParentUsername(match.username)
      sessionStorage.setItem('parentUsername', match.username)
      sessionStorage.setItem('parentPassword', password)
      const kids = await loadChildren(match.username)
      if (kids[0]) {
        if (kids[0].parentName) setParentName(kids[0].parentName)
        await Promise.all([
          loadMessages(kids[0].jmbg, match.username),
          loadWeekData(kids[0].group, kids[0].jmbg),
          loadPayments(kids[0].jmbg, match.username),
        ])
      }
      setActiveTab('dashboard')
    } catch (err) {
      console.error(err)
      setError('Could not load data')
    } finally {
      setLoading(false)
    }
  }

  const onChildChange = async (jmbg) => {
    setSelectedChild(jmbg)
    const child = children.find((c) => c.jmbg === jmbg)
    if (!child || !parentUsername) return
    await Promise.all([
      loadMessages(jmbg, parentUsername),
      loadWeekData(child.group, jmbg),
      loadPayments(jmbg, parentUsername),
    ])
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChild || !parentUsername) return
    try {
      const res = await fetch('/api/child-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childJmbg: selectedChild,
          content: newMessage.trim(),
          senderRole: 'parent',
          senderName: 'Parent',
          username: parentUsername,
        }),
      })
      if (!res.ok) throw new Error('Send failed')
      setNewMessage('')
      await loadMessages(selectedChild, parentUsername)
    } catch (err) {
      console.error(err)
      setError('Could not send message')
    }
  }

  const currentChild = children.find((c) => c.jmbg === selectedChild)
  const latestWorkerNote = messages.find((m) => m.senderRole === 'worker')

  const summaryCards = [
    {
      label: "Today's Attendance",
      value: currentChild?.status || 'Absent',
      tone: currentChild?.status === 'Present' ? 'bg-mint/40' : 'bg-berry/20',
    },
    { label: 'Check-in', value: currentChild?.timeIn || 'Not recorded', tone: 'bg-sky/20' },
    { label: 'Check-out', value: currentChild?.timeOut || 'Not recorded', tone: 'bg-sky/20' },
    { label: 'Last note', value: latestWorkerNote?.content || 'No notes yet', tone: 'bg-softGold/30' },
  ]

  const menuDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const paymentTone = (status) => {
    if (status === 'PAID') return 'bg-mint/40 border-mint/60'
    if (status === 'OVERDUE') return 'bg-berry/20 border-berry/40'
    return 'bg-softGold/30 border-softGold/60'
  }

  useEffect(() => {
    if (parentUsername && selectedChild) {
      loadMessages(selectedChild, parentUsername)
      loadPayments(selectedChild, parentUsername)
    }
  }, [parentUsername, selectedChild])

  // Light polling to stay in sync with admin updates
  useEffect(() => {
    if (!parentUsername || !selectedChild) return undefined
    const id = setInterval(() => {
      loadPayments(selectedChild, parentUsername)
    }, 15000)
    const onFocus = () => loadPayments(selectedChild, parentUsername)
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [parentUsername, selectedChild])

  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('parentUsername') : ''
    const storedPass = typeof window !== 'undefined' ? sessionStorage.getItem('parentPassword') : ''
    if (storedUser && storedPass && !parentUsername) {
      ;(async () => {
        try {
          setLoading(true)
          const credRes = await fetch('/api/credentials', { cache: 'no-store' })
          const creds = await credRes.json()
          const match = creds.find((c) => c.role === 'parent' && c.username === storedUser && c.password === storedPass)
          if (!match) {
            sessionStorage.removeItem('parentUsername')
            sessionStorage.removeItem('parentPassword')
            setActiveTab('login')
            return
          }
          setParentUsername(match.username)
          setActiveTab('dashboard')
          const kids = await loadChildren(match.username)
          if (kids[0] && kids[0].parentName) setParentName(kids[0].parentName)
          if (kids[0]) {
            await Promise.all([
              loadMessages(kids[0].jmbg, match.username),
              loadWeekData(kids[0].group, kids[0].jmbg),
              loadPayments(kids[0].jmbg, match.username),
            ])
          }
        } catch (err) {
          setError('Could not load data')
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [parentUsername])

  const renderLogin = (
    <section className="grid lg:grid-cols-[320px,1fr] gap-6">
      <div className="rounded-2xl bg-white p-5 shadow space-y-4">
        <h2 className="font-display text-xl">Sign in</h2>
        <form className="space-y-3" onSubmit={onLogin}>
          <input
            className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10"
            placeholder={t('loginUsername')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={blockedAdmin || loading}
          />
          <input
            className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={blockedAdmin || loading}
          />
          <button
            className={`w-full bg-berry text-white font-semibold px-4 py-3 rounded-xl shadow hover:-translate-y-0.5 transition ${blockedAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={blockedAdmin || loading}
          >
            {loading ? 'Loading…' : t('loginButton')}
          </button>
          {error && <p className="text-sm text-berry">{error}</p>}
        </form>
        <p className="text-xs text-navy/60">Use parent credentials from admin accounts.</p>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow text-navy/70">
        Sign in to view your child’s dashboard.
      </div>
    </section>
  )

  return (
    <main className="space-y-12 pb-16 px-6 lg:px-12">
      <header className="space-y-2 max-w-5xl">
        <p className="text-berry font-semibold text-sm">Parent Dashboard</p>
        <h1 className="font-display text-4xl text-navy">Family view</h1>
        {parentUsername && <p className="text-lg font-semibold text-navy">Hello, {parentName || parentUsername}</p>}
      </header>

      {!parentUsername && (
        <section className="rounded-2xl bg-white p-6 shadow">
          <p className="text-navy/70">No parent session found. Please log in at /parent/login.</p>
          {error && <p className="text-sm text-berry mt-2">{error}</p>}
        </section>
      )}

      {activeTab === 'dashboard' && children.length > 0 && (
        <section className="space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-navy/60">Child</p>
                <h3 className="font-display text-2xl">{currentChild?.name || 'Not selected'}</h3>
                <p className="text-navy/70">{currentChild?.group || ''}</p>
              </div>
              {children.length > 1 && (
                <select
                  className="px-3 py-2 rounded-xl border border-navy/10"
                  value={selectedChild}
                  onChange={(e) => onChildChange(e.target.value)}
                >
                  {children.map((c) => (
                    <option key={c.jmbg} value={c.jmbg}>
                      {c.name} · {c.group}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {summaryCards.map((card) => (
                <div key={card.label} className={`rounded-2xl p-4 border border-navy/10 ${card.tone}`}>
                  <p className="text-xs text-navy/60">{card.label}</p>
                  <p className="font-display text-xl text-navy">{card.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white p-5 shadow space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-display text-xl">Today</p>
                <span className="px-3 py-1 rounded-full bg-mint text-navy text-sm font-semibold">
                  {currentChild?.status || 'Absent'}
                </span>
              </div>
              <div className="space-y-2 text-sm text-navy/75">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Check-in</p>
                  <p>{currentChild?.timeIn || 'Not recorded'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Check-out</p>
                  <p>{currentChild?.timeOut || 'Not recorded'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-display text-xl">Messages</p>
                <span className="text-xs text-navy/60">{messages.length} total</span>
              </div>
              <div className="max-h-48 overflow-auto space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className="text-sm text-navy/80 border-b border-navy/5 pb-1">
                    <p className="font-semibold">
                      {m.senderRole === 'parent' ? 'You' : 'Teacher'} · {new Date(m.createdAt).toLocaleString()}
                    </p>
                    <p>{m.content}</p>
                  </div>
                ))}
                {!messages.length && <p className="text-sm text-navy/60">No messages yet.</p>}
              </div>
              <textarea
                className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10"
                rows="3"
                placeholder="Message the teacher..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={!parentUsername || !selectedChild}
              />
              <button
                className="px-4 py-2 rounded-full bg-berry text-white font-semibold shadow hover:-translate-y-0.5 transition disabled:opacity-60"
                type="button"
                onClick={sendMessage}
                disabled={!parentUsername || !selectedChild}
              >
                Send
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl">Payments</p>
              <span className="text-xs text-navy/60">{payments.length} records</span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {payments.map((p) => (
                <div key={p.id} className={`rounded-xl border p-3 ${paymentTone(p.status)}`}>
                  <p className="text-sm font-semibold text-navy">{p.month}</p>
                  <p className="text-sm text-navy/70">Amount: {p.amount}</p>
                  <p className="text-sm font-semibold">
                    Status: {p.status}
                  </p>
                  {p.paidAt && <p className="text-xs text-navy/60">Paid at: {new Date(p.paidAt).toLocaleDateString()}</p>}
                </div>
              ))}
              {!payments.length && <p className="text-sm text-navy/60">No payment records.</p>}
            </div>
          </div>

          <LazySection>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white p-5 shadow space-y-3">
                <p className="font-display text-xl">{t('weekMenu')}</p>
                <div className="space-y-2">
                  {menuDays.map((day) => {
                    const meals = weekMenu?.[day] || {}
                    const summary = ['breakfast', 'lunch', 'snack']
                      .map((m) => meals?.[m])
                      .filter(Boolean)
                      .join(' • ')
                    return (
                      <div key={day} className="border border-navy/10 rounded-xl p-3">
                        <p className="font-semibold">{day}</p>
                        <p className="text-sm text-navy/75">{summary || 'Not posted'}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow space-y-3">
                <p className="font-display text-xl">{t('weekActivities')}</p>
                <div className="space-y-2">
                  {menuDays.map((day) => (
                    <div key={day} className="border border-navy/10 rounded-xl p-3">
                      <p className="font-semibold">{day}</p>
                      <p className="text-sm text-navy/75">{weekActivities?.[day] || 'No activity posted'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </LazySection>

          <LazySection>
            <div className="rounded-2xl bg-white p-5 shadow space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-display text-xl">Upcoming (30 days)</p>
                <span className="text-xs text-navy/60">{events.length} items</span>
              </div>
              <div className="space-y-2">
                {events.map((ev) => (
                  <div key={ev.id || ev.startsAt} className="border border-navy/10 rounded-xl p-3">
                    <p className="font-semibold text-navy">{ev.title || ev.item}</p>
                    <p className="text-sm text-navy/70">
                      {new Date(ev.startsAt).toLocaleDateString()} {ev.isBirthday && '· Birthday'}
                    </p>
                    {ev.notes && <p className="text-sm text-navy/70">{ev.notes}</p>}
                  </div>
                ))}
                {!events.length && <p className="text-sm text-navy/60">No events in this range.</p>}
              </div>
            </div>
          </LazySection>
        </section>
      )}
    </main>
  )
}

