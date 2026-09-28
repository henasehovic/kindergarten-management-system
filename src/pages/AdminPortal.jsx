import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ActivityFeed from '../components/admin/ActivityFeed'
import { AdminDataProvider, useAdminData } from '../components/admin/AdminDataContext'
import ChatInbox from '../components/admin/ChatInbox'
import NotificationsBell from '../components/admin/NotificationsBell'
import NotificationsList from '../components/admin/NotificationsList'
import RequestsTable from '../components/admin/RequestsTable'
import RequestsWidget from '../components/admin/RequestsWidget'
import { fetchAdminChatUnread } from '../lib/chatApi'

const ADMIN_BASE = (import.meta.env.VITE_ADMIN_PATH || '/admin/secure').replace(/\/+$/, '') || '/admin/secure'
const guessApiBase = () => {
  const envBase = (import.meta.env?.VITE_API_BASE || '').replace(/\/+$/, '')
  if (envBase) return envBase
  if (typeof window !== 'undefined') {
    if (window.location?.port === '5173') {
      return 'http://localhost:3001'
    }
    return window.location.origin.replace(/\/+$/, '')
  }
  return ''
}
const API_BASE = guessApiBase()
const ADMIN_API_BASE = `${API_BASE}/api${ADMIN_BASE}`

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'requests', label: 'Requests' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'notes', label: 'Notes' },
  { id: 'chats', label: 'Chats' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'kids', label: 'Kids' },
  { id: 'parents', label: 'Parents' },
  { id: 'groups', label: 'Groups' },
  { id: 'users', label: 'Users' },
]

const EMPTY_KID = {
  jmbg: '',
  firstName: '',
  lastName: '',
  dob: '',
  entryDate: '',
  group: '',
  allergies: '',
  parentNotes: '',
  parentName: '',
  parentEmail: '',
  parentPhone: '',
}

const EMPTY_PARENT = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelation: '',
  password: '',
  childJmbgs: [],
}

const EMPTY_USER = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'worker',
  group: '',
  childJmbg: '',
  disabled: false,
}

const INPUT_CLASS = 'w-full px-3 py-2 rounded-xl border border-navy/10 bg-white'
const TEXTAREA_CLASS = 'w-full px-3 py-2 rounded-xl border border-navy/10 bg-white'
const BUTTON_PRIMARY = 'bg-berry text-white font-semibold px-4 py-2 rounded-xl shadow hover:-translate-y-0.5 transition'

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, { credentials: 'include', ...options })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

const deriveGroupFromDob = (dob) => {
  if (!dob) return ''
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return ''
  const today = new Date()
  const ageYears = today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
  if (ageYears < 1) return 'Babies'
  if (ageYears < 6) return 'Kids 1-5'
  return 'Preschoolers'
}

export default function AdminPortal() {
  return (
    <AdminDataProvider>
      <AdminPortalContent />
    </AdminDataProvider>
  )
}

function AdminPortalContent() {
  const navigate = useNavigate()
  const [section, setSection] = useState('overview')
  const [overview, setOverview] = useState({ counts: { kids: 0, parents: 0, teachers: 0, groups: 0 }, recent: { kids: [], parents: [] } })
  const [kids, setKids] = useState([])
  const [parents, setParents] = useState([])
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [kidSearch, setKidSearch] = useState('')
  const [parentSearch, setParentSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')

  const [kidForm, setKidForm] = useState(EMPTY_KID)
  const [editingKid, setEditingKid] = useState('')

  const [parentForm, setParentForm] = useState(EMPTY_PARENT)
  const [editingParent, setEditingParent] = useState('')
  const [parentChildSearch, setParentChildSearch] = useState('')

  const [userForm, setUserForm] = useState(EMPTY_USER)
  const [pendingKidDelete, setPendingKidDelete] = useState(null)
  const [pendingParentDelete, setPendingParentDelete] = useState(null)
  const [pendingUserDelete, setPendingUserDelete] = useState(null)
  const [calendarEvents, setCalendarEvents] = useState([])
  const [calendarBirthdays, setCalendarBirthdays] = useState([])
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '10:00', notes: '' })
  const [calendarLoading, setCalendarLoading] = useState(false)
  const now = new Date()
  const [calendarYear, setCalendarYear] = useState(now.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth())
  const [holidayEvents, setHolidayEvents] = useState([])
  const [chatUnread, setChatUnread] = useState(0)
  const [kidPayments, setKidPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [adminNotes, setAdminNotes] = useState([])
  const [noteForm, setNoteForm] = useState({ workerId: '', childJmbg: '', title: '', body: '', priority: '' })
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteError, setNoteError] = useState('')

  const {
    notifications,
    requests,
    activity,
    todayOverview,
    loadingData: loadingAdminData,
    unreadCount,
    pendingRequests,
    setNotificationRead,
    markAllNotificationsRead,
    updateRequestStatus: updateRequestStatusClient,
  } = useAdminData()

  const workerUsers = useMemo(() => users.filter((u) => u.role === 'worker'), [users])
  const groupOptions = useMemo(() => {
    const names = new Set(groups.map((g) => g.name))
    kids.forEach((k) => k.group && names.add(k.group))
    return Array.from(names)
  }, [groups, kids])

  const loadAll = async () => {
    setError('')
    setLoading(true)
    try {
      const [overviewData, kidData, parentData, groupData, userData] = await Promise.all([
        fetchJson(`${ADMIN_API_BASE}/overview`),
        fetchJson(`${ADMIN_API_BASE}/kids`),
        fetchJson(`${ADMIN_API_BASE}/parents`),
        fetchJson(`${ADMIN_API_BASE}/groups`),
        fetchJson(`${ADMIN_API_BASE}/users`),
      ])
      setOverview(overviewData)
      setKids(kidData)
      setParents(parentData)
      setGroups(groupData)
      setUsers(userData)
    } catch (err) {
      setError(err.message || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const loadAdminNotes = async () => {
    try {
      const notes = await fetchJson('/api/notes/admin?admin=1')
      setAdminNotes(notes || [])
    } catch (err) {
      console.error('Failed to load admin notes', err)
    }
  }

  const createAdminNote = async (e) => {
    e.preventDefault()
    setNoteError('')
    if (!noteForm.workerId || !noteForm.title || !noteForm.body) {
      setNoteError('Please fill worker, title, and note body.')
      return
    }
    try {
      setNoteSaving(true)
      const res = await fetch('/api/notes/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteForm),
      })
      const saved = await res.json()
      if (!res.ok) throw new Error(saved.error || 'Create failed')
      setAdminNotes((prev) => [saved, ...prev])
      setNoteForm({ workerId: '', childJmbg: '', title: '', body: '', priority: '' })
    } catch (err) {
      setNoteError(err.message || 'Unable to send note')
    } finally {
      setNoteSaving(false)
    }
  }

  const loadPayments = async (childJmbg) => {
    if (!childJmbg) return
    setPaymentsLoading(true)
    setPaymentError('')
    try {
      const data = await fetchJson(`/api/payments?childJmbg=${encodeURIComponent(childJmbg)}&role=admin`)
      setKidPayments(data || [])
    } catch (err) {
      setPaymentError(err.message || 'Failed to load payments')
      setKidPayments([])
    } finally {
      setPaymentsLoading(false)
    }
  }

  const updatePaymentStatus = async (id, status) => {
    try {
      const updated = await fetchJson(`/api/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      // simple optimistic update to keep parent polling in sync
      setKidPayments((prev) => prev.map((p) => (p.id === id ? updated : p)))
    } catch (err) {
      setPaymentError(err.message || 'Failed to update payment')
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (section === 'notes') {
      loadAdminNotes()
    }
  }, [section])

  useEffect(() => {
    if (section === 'kids' && editingKid) {
      loadPayments(editingKid)
    }
  }, [section, editingKid])

  useEffect(() => {
    const loadUnread = async () => {
      try {
        const data = await fetchAdminChatUnread()
        setChatUnread(data.unread || 0)
      } catch (err) {
        console.error('Chat unread fetch failed', err)
      }
    }
    loadUnread()
    const id = setInterval(loadUnread, 8000)
    return () => clearInterval(id)
  }, [])

  const loadCalendar = async () => {
    setCalendarLoading(true)
    try {
      const data = await fetchJson(`/api/calendar?role=admin&year=${calendarYear}`)
      const sortedEvents = (data.events || []).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
      setCalendarEvents(sortedEvents)
      setCalendarBirthdays(data.birthdays || [])
      const holidayList = data.holidays || []
      setHolidayEvents((holidayList || []).map((h, idx) => ({
        id: h.id || `holiday-${idx}-${h.date || h.startsAt}`,
        title: h.title,
        startsAt: h.startsAt || `${h.date}T00:00:00`,
        isHoliday: true,
        types: h.types || [],
      })))
    } catch (err) {
      setError(err.message || 'Failed to load calendar')
    } finally {
      setCalendarLoading(false)
    }
  }

  useEffect(() => {
    if (section === 'calendar') {
      loadCalendar()
    }
  }, [section, calendarYear])

  const createCalendarEvent = async (e) => {
    e.preventDefault()
    if (!newEvent.title || !newEvent.date) return
    const startsAt = new Date(`${newEvent.date}T${newEvent.time || '10:00'}`)
    try {
      const created = await fetchJson('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
        body: JSON.stringify({ title: newEvent.title, startsAt, notes: newEvent.notes }),
      })
      setCalendarEvents((prev) => [created, ...prev].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)))
      setNewEvent({ title: '', date: '', time: '10:00', notes: '' })
    } catch (err) {
      setError(err.message || 'Could not create event')
    }
  }

  const deleteCalendarEvent = async (id) => {
    try {
      await fetchJson(`/api/calendar/${id}`, { method: 'DELETE', headers: { 'x-user-role': 'admin' } })
      setCalendarEvents((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      setError(err.message || 'Could not delete event')
    }
  }

  useEffect(() => {
    if (!userForm.group && groupOptions.length) {
      setUserForm((prev) => ({ ...prev, group: groupOptions[0] }))
    }
    if (!kidForm.entryDate) {
      const today = new Date().toISOString().slice(0, 10)
      setKidForm((prev) => ({ ...prev, entryDate: today }))
    }
    if (kidForm.dob) {
      const autoGroup = deriveGroupFromDob(kidForm.dob)
      if (autoGroup && kidForm.group !== autoGroup) {
        setKidForm((prev) => ({ ...prev, group: autoGroup }))
      }
    }
  }, [groupOptions, kidForm.group, kidForm.dob, userForm.group])

  const logout = () => {
    fetch(`${ADMIN_API_BASE}/logout`, { method: 'POST', credentials: 'include' })
      .catch(() => {})
      .finally(() => navigate(`${ADMIN_BASE}/login`, { replace: true }))
  }

  const refreshOverview = async () => {
    try {
      const data = await fetchJson(`${ADMIN_API_BASE}/overview`)
      setOverview(data)
    } catch (err) {
      console.error('Overview refresh failed', err)
    }
  }

  const submitKid = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (!kidForm.jmbg || !kidForm.firstName || !kidForm.lastName || !kidForm.dob || !kidForm.entryDate || !kidForm.parentName || !kidForm.parentEmail || !kidForm.parentPhone) {
        setError('All child and parent fields are required.')
        setSaving(false)
        return
      }
      if (!/^\d{13}$/.test(String(kidForm.jmbg))) {
        setError('JMBG must be exactly 13 digits.')
        setSaving(false)
        return
      }
      const generatedEmail = kidForm.parentEmail || `${(kidForm.parentName || 'parent').toLowerCase().replace(/[^a-z\\s]/g, '').trim().replace(/\\s+/g, '.') || 'parent'}@parent.mladost.com`
      const payload = {
        ...kidForm,
        group: '',
        parentInfo: {
          fullName: kidForm.parentName,
          email: generatedEmail,
          phone: kidForm.parentPhone,
        },
      }
      const method = editingKid ? 'PATCH' : 'POST'
      const url = editingKid ? `${ADMIN_API_BASE}/kids/${editingKid}` : `${ADMIN_API_BASE}/kids`
      const savedKid = await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setKids((prev) => (editingKid ? prev.map((k) => (k.jmbg === editingKid ? savedKid : k)) : [...prev, savedKid]))
      setKidForm(EMPTY_KID)
      setEditingKid('')
      refreshOverview()
    } catch (err) {
      setError(err.message || 'Could not save child')
    } finally {
      setSaving(false)
    }
  }

  const startEditKid = (kid) => {
    setEditingKid(kid.jmbg)
    setKidForm({
      jmbg: kid.jmbg,
      firstName: kid.firstName,
      lastName: kid.lastName,
      dob: kid.dob,
      entryDate: kid.entryDate,
      group: kid.group,
      allergies: kid.allergies,
      parentNotes: kid.parentNotes,
      parentName: kid.parents?.[0]?.name || '',
      parentEmail: kid.parents?.[0]?.email || '',
      parentPhone: kid.parents?.[0]?.phone || '',
    })
  }

  const deleteKid = async (jmbg) => {
    setSaving(true)
    try {
      await fetchJson(`${ADMIN_API_BASE}/kids/${jmbg}`, { method: 'DELETE' })
      setKids((prev) => prev.filter((k) => k.jmbg !== jmbg))
      refreshOverview()
    } catch (err) {
      setError(err.message || 'Delete failed')
    } finally {
      setSaving(false)
      setPendingKidDelete(null)
    }
  }

  const submitParent = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const generatedEmail = parentForm.email || `${(parentForm.fullName || 'parent').toLowerCase().replace(/[^a-z\\s]/g, '').trim().replace(/\\s+/g, '.') || 'parent'}@parent.mladost.com`
      const payload = { ...parentForm, email: generatedEmail, childJmbgs: parentForm.childJmbgs || [] }
      const method = editingParent ? 'PATCH' : 'POST'
      const url = editingParent ? `${ADMIN_API_BASE}/parents/${editingParent}` : `${ADMIN_API_BASE}/parents`
      const savedParent = await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setParents((prev) => (editingParent ? prev.map((p) => (p.id === savedParent.id ? savedParent : p)) : [...prev, savedParent]))
      setParentForm(EMPTY_PARENT)
      setEditingParent('')
      refreshOverview()
    } catch (err) {
      setError(err.message || 'Could not save parent')
    } finally {
      setSaving(false)
    }
  }

  const deleteParent = async (id) => {
    setSaving(true)
    try {
      await fetchJson(`${ADMIN_API_BASE}/parents/${id}`, { method: 'DELETE' })
      setParents((prev) => prev.filter((p) => p.id !== id))
      refreshOverview()
    } catch (err) {
      setError(err.message || 'Delete failed')
    } finally {
      setSaving(false)
      setPendingParentDelete(null)
    }
  }

  const addGroup = async (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const name = form.get('groupName')
    if (!name) return
    setSaving(true)
    try {
      await fetchJson(`${ADMIN_API_BASE}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      await loadAll()
    } catch (err) {
      setError(err.message || 'Could not add group')
    } finally {
      setSaving(false)
      e.target.reset()
    }
  }

  const toggleTeacher = async (groupName, teacherId, checked) => {
    const currentTeachers = groups.find((g) => g.name === groupName)?.teachers?.map((t) => t.id) || []
    const next = checked ? Array.from(new Set([...currentTeachers, teacherId])) : currentTeachers.filter((id) => id !== teacherId)
    try {
      const updatedGroups = await fetchJson(`${ADMIN_API_BASE}/groups/${encodeURIComponent(groupName)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherIds: next }),
      })
      setGroups(updatedGroups)
    } catch (err) {
      setError(err.message || 'Could not update teachers')
    }
  }

  const submitUser = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...userForm, username: userForm.email }
      const savedUser = await fetchJson(`${ADMIN_API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setUsers((prev) => [...prev, savedUser])
      setUserForm(EMPTY_USER)
      refreshOverview()
    } catch (err) {
      setError(err.message || 'Could not create user')
    } finally {
      setSaving(false)
    }
  }

  const updateUser = async (userId, updates) => {
    setSaving(true)
    try {
      const updated = await fetchJson(`${ADMIN_API_BASE}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
    } catch (err) {
      setError(err.message || 'User update failed')
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (userId) => {
    setSaving(true)
    try {
      await fetchJson(`${ADMIN_API_BASE}/users/${userId}`, { method: 'DELETE' })
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      refreshOverview()
    } catch (err) {
      setError(err.message || 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const changeRequestStatus = async (requestId, status) => {
    if (!requestId || !status) return
    setSaving(true)
    try {
      await updateRequestStatusClient(requestId, status, '')
    } catch (err) {
      setError(err.message || 'Could not update request')
    } finally {
      setSaving(false)
    }
  }

  const filteredKids = kids.filter((k) => {
    const term = kidSearch.trim().toLowerCase()
    if (!term) return true
    const parentsNames = (k.parents || []).map((p) => p.name).join(' ')
    return `${k.firstName} ${k.lastName} ${parentsNames}`.toLowerCase().includes(term)
  })

  const filteredParents = parents.filter((p) => {
    const term = parentSearch.trim().toLowerCase()
    if (!term) return true
    return `${p.fullName} ${p.email} ${p.phone}`.toLowerCase().includes(term)
  })

  const filteredUsers = users.filter((u) => {
    const term = userSearch.trim().toLowerCase()
    if (!term) return true
    return `${u.username || u.email} ${u.role} ${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(term)
  })

  if (loading || loadingAdminData) {
    return <main className="p-8 text-navy">Loading admin dashboard…</main>
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-navy text-white flex flex-col">
        <div className="px-6 py-6">
          <p className="text-sm text-white/70">Kindergarten</p>
          <p className="font-display text-2xl">Admin Panel</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full text-left px-4 py-2 rounded-xl transition ${section === item.id ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'}`}
            >
              <span className="flex items-center justify-between gap-2">
                {item.label}
                {item.id === 'chats' && chatUnread > 0 && (
                  <span className="text-xs bg-white/25 rounded-full px-2 py-0.5">{chatUnread}</span>
                )}
              </span>
            </button>
          ))}
        </nav>
        <button onClick={logout} className="mx-4 mb-4 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 font-semibold text-left">
          Log out
        </button>
      </aside>

      <main className="flex-1 p-6 lg:p-10 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-berry font-semibold text-sm">Admin Control Center</p>
            <h1 className="font-display text-3xl">Welcome back, Admin</h1>
            <p className="text-navy/70 text-sm">Manage kids, parents, groups, and accounts.</p>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-berry font-semibold">Saving...</span>}
            <NotificationsBell
              notifications={notifications}
              unreadCount={unreadCount}
              onToggleRead={setNotificationRead}
              onViewAll={() => setSection('notifications')}
            />
          </div>
        </div>

        {error && <div className="text-sm text-berry bg-berry/10 border border-berry/30 px-4 py-2 rounded-lg">{error}</div>}

        {section === 'overview' && (
          <div className="space-y-6">
            <TodayOverviewRow stats={todayOverview} pendingCount={pendingRequests.length} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Kids" value={overview.counts.kids} />
              <StatCard label="Parents" value={overview.counts.parents} />
              <StatCard label="Teachers" value={overview.counts.teachers} />
              <StatCard label="Groups" value={overview.counts.groups} />
            </div>
            <div className="grid xl:grid-cols-2 gap-4">
              <RequestsWidget requests={requests} onAction={changeRequestStatus} />
              <NotificationsList
                notifications={notifications}
                onToggleRead={setNotificationRead}
                onMarkAllRead={markAllNotificationsRead}
                compact
              />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow p-5 space-y-3">
                <p className="font-semibold">Recent kids</p>
                <div className="space-y-2 max-h-72 overflow-auto pr-1">
                  {overview.recent.kids?.map((k) => (
                    <div key={k.jmbg} className="flex items-center justify-between text-sm border-b border-navy/10 pb-1">
                      <span>{k.firstName} {k.lastName}</span>
                      <span className="text-navy/60">{k.group}</span>
                    </div>
                  ))}
                  {!overview.recent.kids?.length && <p className="text-sm text-navy/60">No recent kids.</p>}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow p-5 space-y-3">
                <p className="font-semibold">Recent parents</p>
                <div className="space-y-2 max-h-72 overflow-auto pr-1">
                  {overview.recent.parents?.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm border-b border-navy/10 pb-1">
                      <span>{p.fullName}</span>
                      <span className="text-navy/60">{p.email}</span>
                    </div>
                  ))}
                  {!overview.recent.parents?.length && <p className="text-sm text-navy/60">No recent parents.</p>}
                </div>
              </div>
            </div>
            <ActivityFeed items={activity} />
          </div>
        )}

        {section === 'requests' && (
          <div className="space-y-4">
            <RequestsTable requests={requests} onStatusChange={changeRequestStatus} />
          </div>
        )}

        {section === 'notifications' && (
          <NotificationsList
            notifications={notifications}
            onToggleRead={setNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
          />
        )}

        {section === 'notes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-5 space-y-4">
              <div>
                <p className="text-berry font-semibold text-sm">Admin note to worker</p>
                <h2 className="font-display text-2xl text-navy">Send a note</h2>
              </div>
              <form className="grid md:grid-cols-2 gap-4" onSubmit={createAdminNote}>
                <div className="space-y-1">
                  <label className="text-sm text-navy/70">Worker</label>
                  <select
                    className={INPUT_CLASS}
                    value={noteForm.workerId}
                    onChange={(e) => setNoteForm({ ...noteForm, workerId: e.target.value })}
                    required
                  >
                    <option value="">Select worker</option>
                    {workerUsers.map((w) => (
                      <option key={w.id} value={w.email || w.username}>
                        {(w.firstName || '') + ' ' + (w.lastName || '')} {w.group ? `(${w.group})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-navy/70">Child (optional)</label>
                  <select
                    className={INPUT_CLASS}
                    value={noteForm.childJmbg}
                    onChange={(e) => setNoteForm({ ...noteForm, childJmbg: e.target.value })}
                  >
                    <option value="">No child linked</option>
                    {kids
                      .filter((k) => {
                        if (!noteForm.workerId) return true
                        const worker = workerUsers.find((w) => (w.email || w.username) === noteForm.workerId)
                        return worker?.group ? (k.group || '').toLowerCase() === worker.group.toLowerCase() : true
                      })
                      .map((k) => (
                        <option key={k.jmbg} value={k.jmbg}>
                          {(k.name || `${k.firstName || ''} ${k.lastName || ''}`).trim()} {k.group ? `(${k.group})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm text-navy/70">Title</label>
                  <input
                    className={INPUT_CLASS}
                    value={noteForm.title}
                    onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm text-navy/70">Note</label>
                  <textarea
                    className={TEXTAREA_CLASS}
                    rows="3"
                    value={noteForm.body}
                    onChange={(e) => setNoteForm({ ...noteForm, body: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm text-navy/70">Priority (optional)</label>
                  <input
                    className={INPUT_CLASS}
                    value={noteForm.priority}
                    onChange={(e) => setNoteForm({ ...noteForm, priority: e.target.value })}
                    placeholder="e.g., high, normal"
                  />
                </div>
                {noteError && <p className="text-sm text-berry md:col-span-2">{noteError}</p>}
                <div className="md:col-span-2">
                  <button className={BUTTON_PRIMARY} type="submit" disabled={noteSaving}>
                    {noteSaving ? 'Sending…' : 'Send note'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-berry font-semibold text-sm">Notes</p>
                  <p className="font-display text-xl text-navy">Latest notes to workers</p>
                </div>
                <button className="text-sm text-berry" onClick={loadAdminNotes}>Refresh</button>
              </div>
              <div className="space-y-2 max-h-[480px] overflow-auto">
                {!adminNotes.length && <p className="text-sm text-navy/60">No notes yet.</p>}
                {adminNotes.map((n) => (
                  <div key={n.id} className="border border-berry/15 rounded-xl p-3 space-y-1">
                    <div className="flex justify-between items-center gap-2 flex-wrap">
                      <p className="font-semibold text-navy">{n.title}</p>
                      <span className="text-xs text-navy/60">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-navy/80">{n.body || n.message}</p>
                    <div className="text-xs text-navy/60 flex flex-wrap gap-3">
                      <span>Worker: {n.targetId || 'All'}</span>
                      {n.childJmbg && <span>Child: {n.childJmbg}</span>}
                      {n.priority && <span>Priority: {n.priority}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === 'chats' && <ChatInbox onUnreadChange={setChatUnread} />}

        {section === 'calendar' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-berry font-semibold text-sm">Calendar</p>
                  <h3 className="font-display text-xl">Events & birthdays</h3>
                </div>
                {calendarLoading && <span className="text-xs text-navy/70">Loading...</span>}
              </div>
              <form className="grid md:grid-cols-4 gap-3 items-end" onSubmit={createCalendarEvent}>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-sm text-navy/70">Title</label>
                  <input className={INPUT_CLASS} value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Event title" required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-navy/70">Date</label>
                  <input className={INPUT_CLASS} type="date" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-navy/70">Time</label>
                  <input className={INPUT_CLASS} type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-sm text-navy/70">Notes</label>
                  <textarea className={TEXTAREA_CLASS} rows="2" value={newEvent.notes} onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })} placeholder="Optional notes" />
                </div>
                <div className="md:col-span-1">
                  <button className={BUTTON_PRIMARY}>Add event</button>
                </div>
              </form>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-navy/70">Upcoming events</h4>
                <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
                  {[...holidayEvents, ...calendarEvents].map((ev) => (
                    <div key={ev.id} className="border border-navy/10 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{ev.title}</p>
                        <p className="text-xs text-navy/60">{formatDateTime(ev.startsAt)}</p>
                        {ev.notes && <p className="text-sm text-navy/70">{ev.notes}</p>}
                        {ev.isHoliday && <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-200 text-sky-800">Holiday</span>}
                      </div>
                      {!ev.isHoliday && <button className="text-berry text-sm" onClick={() => deleteCalendarEvent(ev.id)}>Delete</button>}
                    </div>
                  ))}
                  {!calendarEvents.length && !holidayEvents.length && <p className="text-sm text-navy/60">No events yet.</p>}
                </div>
              </div>
              <TodayEventsSection events={calendarEvents} birthdays={calendarBirthdays} />
            </div>

            <AdminCalendarGrid
              year={calendarYear}
              month={calendarMonth}
              onYearChange={setCalendarYear}
              onMonthChange={setCalendarMonth}
              events={[...holidayEvents, ...calendarEvents]}
              birthdays={calendarBirthdays}
            />
          </div>
        )}

        {section === 'kids' && (
          <div className="space-y-4">
            <div className="grid lg:grid-cols-[1fr_1.5fr] gap-4">
              <section className="bg-white rounded-2xl shadow p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-berry font-semibold text-sm">Kids</p>
                    <h2 className="font-display text-xl">{editingKid ? 'Edit child' : 'Add child'}</h2>
                  </div>
                  {editingKid && (
                    <button className="text-sm text-navy" onClick={() => { setEditingKid(''); setKidForm(EMPTY_KID) }}>
                      Cancel
                    </button>
                  )}
                </div>
                <form className="grid gap-3" onSubmit={submitKid}>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input className={`${INPUT_CLASS} h-10`} placeholder="JMBG" value={kidForm.jmbg} onChange={(e) => setKidForm({ ...kidForm, jmbg: e.target.value })} required />
                    <div className="space-y-1">
                      <input
                        className={`${INPUT_CLASS} bg-berry/10 text-navy font-semibold`}
                        value={kidForm.group || 'Group (auto by age)'}
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input className={INPUT_CLASS} placeholder="First name" value={kidForm.firstName} onChange={(e) => setKidForm({ ...kidForm, firstName: e.target.value })} required />
                    <input className={INPUT_CLASS} placeholder="Last name" value={kidForm.lastName} onChange={(e) => setKidForm({ ...kidForm, lastName: e.target.value })} required />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-sm text-navy/70">Date of birth</p>
                      <input className={INPUT_CLASS} type="date" value={kidForm.dob} onChange={(e) => setKidForm({ ...kidForm, dob: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-navy/70">Enrollment date</p>
                      <input className={INPUT_CLASS} type="date" value={kidForm.entryDate} onChange={(e) => setKidForm({ ...kidForm, entryDate: e.target.value })} />
                    </div>
                  </div>
                  <textarea className={TEXTAREA_CLASS} rows="2" placeholder="Allergies" value={kidForm.allergies} onChange={(e) => setKidForm({ ...kidForm, allergies: e.target.value })} />
                  <textarea className={TEXTAREA_CLASS} rows="2" placeholder="Parent notes" value={kidForm.parentNotes} onChange={(e) => setKidForm({ ...kidForm, parentNotes: e.target.value })} />
                  <div className="grid sm:grid-cols-3 gap-3">
                    <input className={INPUT_CLASS} placeholder="Parent name" value={kidForm.parentName} onChange={(e) => setKidForm({ ...kidForm, parentName: e.target.value })} required />
                    <input className={INPUT_CLASS} placeholder="Parent email" value={kidForm.parentEmail} onChange={(e) => setKidForm({ ...kidForm, parentEmail: e.target.value })} required />
                    <input className={INPUT_CLASS} placeholder="Parent phone" value={kidForm.parentPhone} onChange={(e) => setKidForm({ ...kidForm, parentPhone: e.target.value })} required />
                  </div>
                  <p className="text-xs text-navy/60">Parent information is required; a parent record and account will be linked automatically.</p>
                  <button className={BUTTON_PRIMARY}>{editingKid ? 'Save changes' : 'Add child'}</button>
                </form>
              </section>

              <section className="bg-white rounded-2xl shadow p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-display text-xl">Children</h3>
                  <input className={`${INPUT_CLASS} w-full md:w-80`} placeholder="Search by name or parent" value={kidSearch} onChange={(e) => setKidSearch(e.target.value)} />
                </div>
                <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
                  {filteredKids.map((k) => (
                    <div key={k.jmbg} className="border border-navy/10 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{k.firstName} {k.lastName}</p>
                        <p className="text-xs text-navy/60">Parents: {(k.parents || []).map((p) => p.name).join(', ') || 'N/A'}</p>
                        <p className="text-xs text-navy/60">Group: {k.group || 'Unassigned'}</p>
                      </div>
                      <div className="flex gap-3 text-sm">
                        <button className="text-berry font-semibold" onClick={() => startEditKid(k)}>Modify</button>
                        <button className="text-navy" onClick={() => setPendingKidDelete(k)}>Delete</button>
                      </div>
                    </div>
                  ))}
                  {!filteredKids.length && <p className="text-sm text-navy/60">No children found.</p>}
                </div>
              </section>

              {editingKid && (
                <section className="bg-white rounded-2xl shadow p-5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-display text-xl">Payments</h3>
                    {paymentsLoading && <span className="text-xs text-berry">Loading…</span>}
                  </div>
                  {paymentError && <p className="text-sm text-berry">{paymentError}</p>}
                  <div className="space-y-2">
                    {kidPayments.map((p) => (
                      <div key={p.id} className="border border-navy/10 rounded-xl p-3 grid sm:grid-cols-4 gap-3 items-center">
                        <div>
                          <p className="text-xs text-navy/60">Month</p>
                          <p className="font-semibold text-navy">{p.month}</p>
                        </div>
                        <div>
                          <p className="text-xs text-navy/60">Amount</p>
                          <p className="text-navy">{p.amount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-navy/60">Status</p>
                          <select
                            className={`${INPUT_CLASS} h-10`}
                            value={p.status}
                            onChange={(e) => updatePaymentStatus(p.id, e.target.value)}
                          >
                            <option value="PAID">Paid</option>
                            <option value="UNPAID">Unpaid</option>
                            <option value="OVERDUE">Overdue</option>
                          </select>
                        </div>
                        <div className="text-xs text-navy/70">
                          {p.paidAt ? `Paid at: ${new Date(p.paidAt).toLocaleDateString()}` : 'Not paid'}
                        </div>
                      </div>
                    ))}
                    {!kidPayments.length && !paymentsLoading && (
                      <p className="text-sm text-navy/60">No payments found for this child.</p>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {section === 'parents' && (
          <div className="grid lg:grid-cols-[1fr_1.5fr] gap-4">
            <section className="bg-white rounded-2xl shadow p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-berry font-semibold text-sm">Parents</p>
                  <h2 className="font-display text-xl">{editingParent ? 'Edit parent' : 'Add parent'}</h2>
                </div>
                {editingParent && (
                  <button className="text-sm text-navy" onClick={() => { setEditingParent(''); setParentForm(EMPTY_PARENT) }}>
                    Cancel
                  </button>
                )}
              </div>
              <form className="grid gap-3" onSubmit={submitParent}>
                <input className={INPUT_CLASS} placeholder="Full name" value={parentForm.fullName} onChange={(e) => setParentForm({ ...parentForm, fullName: e.target.value })} required />
                <div className="grid sm:grid-cols-2 gap-3">
                <input className={INPUT_CLASS} placeholder="Email (auto if blank)" value={parentForm.email} onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })} />
                  <input className={INPUT_CLASS} placeholder="Password (for account)" value={parentForm.password} onChange={(e) => setParentForm({ ...parentForm, password: e.target.value })} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input className={INPUT_CLASS} placeholder="Phone" value={parentForm.phone} onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })} />
                  <input className={INPUT_CLASS} placeholder="Address" value={parentForm.address} onChange={(e) => setParentForm({ ...parentForm, address: e.target.value })} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input className={INPUT_CLASS} placeholder="Emergency contact name" value={parentForm.emergencyName} onChange={(e) => setParentForm({ ...parentForm, emergencyName: e.target.value })} />
                  <input className={INPUT_CLASS} placeholder="Emergency relation" value={parentForm.emergencyRelation} onChange={(e) => setParentForm({ ...parentForm, emergencyRelation: e.target.value })} />
                </div>
                <input className={INPUT_CLASS} placeholder="Emergency phone" value={parentForm.emergencyPhone} onChange={(e) => setParentForm({ ...parentForm, emergencyPhone: e.target.value })} />
                <div className="space-y-2">
                  <p className="text-sm text-navy/70">Link children</p>
                  <input
                    className={`${INPUT_CLASS} w-full`}
                    placeholder="Search child by name or JMBG"
                    value={parentChildSearch}
                    onChange={(e) => setParentChildSearch(e.target.value)}
                  />
                  <div className="max-h-40 overflow-auto border border-navy/10 rounded-xl p-2 bg-white space-y-1">
                    {kids
                      .filter((k) => {
                        const term = parentChildSearch.trim().toLowerCase()
                        if (!term) return true
                        return `${k.firstName} ${k.lastName} ${k.jmbg}`.toLowerCase().includes(term)
                      })
                      .map((k) => {
                        const selected = parentForm.childJmbgs?.includes(k.jmbg)
                        return (
                          <button
                            key={k.jmbg}
                            type="button"
                            onClick={() => {
                              const next = new Set(parentForm.childJmbgs || [])
                              if (selected) next.delete(k.jmbg)
                              else next.add(k.jmbg)
                              setParentForm({ ...parentForm, childJmbgs: Array.from(next) })
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg border transition ${selected ? 'bg-mint/50 border-mint text-navy font-semibold' : 'border-navy/10 hover:border-navy/30'}`}
                          >
                            {k.firstName} {k.lastName} <span className="text-xs text-navy/60">({k.jmbg})</span>
                          </button>
                        )
                      })}
                    {!kids.length && <p className="text-xs text-navy/60">No kids yet.</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(parentForm.childJmbgs || []).map((id) => {
                      const kid = kids.find((k) => k.jmbg === id)
                      return (
                        <span key={id} className="flex items-center gap-2 bg-navy/10 text-navy px-3 py-1 rounded-full text-sm">
                          {kid ? `${kid.firstName} ${kid.lastName}` : id}
                          <button
                            type="button"
                            className="text-berry"
                            onClick={() => setParentForm({ ...parentForm, childJmbgs: (parentForm.childJmbgs || []).filter((j) => j !== id) })}
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
                <button className={BUTTON_PRIMARY}>{editingParent ? 'Save changes' : 'Add parent'}</button>
              </form>
            </section>

            <section className="bg-white rounded-2xl shadow p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-display text-xl">Parents</h3>
                <input className={`${INPUT_CLASS} w-full md:w-80`} placeholder="Search parents" value={parentSearch} onChange={(e) => setParentSearch(e.target.value)} />
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
                {filteredParents.map((p) => (
                  <div key={p.id} className="border border-navy/10 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{p.fullName}</p>
                      <p className="text-xs text-navy/60">{p.email} · {p.phone || 'No phone'}</p>
                      <p className="text-xs text-navy/60">Password: {p.authPassword || 'Generated'}</p>
                      <p className="text-xs text-navy/60">Children: {p.children?.map((c) => c.name).join(', ') || 'None linked'}</p>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <button
                        className="text-berry font-semibold"
                        onClick={() => {
                          setEditingParent(p.id)
                          setParentForm({
                            fullName: p.fullName,
                            email: p.email,
                            phone: p.phone,
                            address: p.address,
                            emergencyName: p.emergencyName,
                            emergencyPhone: p.emergencyPhone,
                            emergencyRelation: p.emergencyRelation,
                            password: '',
                            childJmbgs: p.children?.map((c) => c.jmbg) || [],
                          })
                        }}
                      >
                        Modify
                      </button>
                      <button className="text-navy" onClick={() => setPendingParentDelete(p)}>Delete</button>
                    </div>
                  </div>
                ))}
                {!filteredParents.length && <p className="text-sm text-navy/60">No parents found.</p>}
              </div>
            </section>
          </div>
        )}

        {section === 'groups' && (
          <div className="space-y-4">
            <form className="bg-white rounded-2xl shadow p-5 flex flex-wrap items-end gap-3" onSubmit={addGroup}>
              <div className="flex-1 min-w-[220px]">
                <p className="text-berry font-semibold text-sm">Groups</p>
                <input name="groupName" className={`${INPUT_CLASS} w-full`} placeholder="Add a new group" required />
              </div>
              <button className={BUTTON_PRIMARY}>Add group</button>
            </form>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {groups.map((g) => (
                <div key={g.id} className="bg-white rounded-2xl shadow p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{g.name}</p>
                      <p className="text-sm text-navy/60">{g.kids.length} kids</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Teachers</p>
                    <div className="space-y-1 text-sm text-navy/80">
                      {g.teachers.map((t) => {
                        const label = `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.name || t.username || 'Unnamed'
                        return <p key={t.id}>{label}</p>
                      })}
                      {!g.teachers.length && <p className="text-xs text-navy/60">No teachers assigned.</p>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Kids</p>
                    <div className="text-sm text-navy/70 space-y-1">
                      {g.kids.map((k) => <p key={k.jmbg}>{k.name}</p>)}
                      {!g.kids.length && <p className="text-xs text-navy/60">No kids assigned.</p>}
                    </div>
                  </div>
                </div>
              ))}
              {!groups.length && <p className="text-sm text-navy/60">No groups yet.</p>}
            </div>
          </div>
        )}

        {section === 'users' && (
          <div className="space-y-4">
            <section className="bg-white rounded-2xl shadow p-5 space-y-3">
              <p className="text-berry font-semibold text-sm">Accounts</p>
              <h3 className="font-display text-xl">Create account</h3>
              <form className="grid md:grid-cols-2 lg:grid-cols-3 gap-3" onSubmit={submitUser}>
                <input className={INPUT_CLASS} placeholder="First name" value={userForm.firstName} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} />
                <input className={INPUT_CLASS} placeholder="Last name" value={userForm.lastName} onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} />
                <input className={INPUT_CLASS} placeholder="Email (username)" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
                <input className={INPUT_CLASS} placeholder="Password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
                <select className={INPUT_CLASS} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                  <option value="worker">Worker</option>
                  <option value="parent">Parent</option>
                </select>
                {userForm.role === 'worker' ? (
                  <select className={INPUT_CLASS} value={userForm.group} onChange={(e) => setUserForm({ ...userForm, group: e.target.value })}>
                    {groupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : (
                  <input className={INPUT_CLASS} placeholder="Child JMBG (for parent)" value={userForm.childJmbg} onChange={(e) => setUserForm({ ...userForm, childJmbg: e.target.value })} />
                )}
                <div className="md:col-span-2 lg:col-span-3">
                  <button className={BUTTON_PRIMARY}>Create user</button>
                </div>
              </form>
            </section>

            <section className="bg-white rounded-2xl shadow p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-display text-xl">User list</h3>
                <input className={`${INPUT_CLASS} w-full md:w-80`} placeholder="Search users" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="border border-navy/10 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username}</p>
                      <p className="text-xs text-navy/60">{u.username} · {u.role}</p>
                      {u.role === 'worker' && <p className="text-xs text-navy/60">Group: {u.group || 'Unassigned'}</p>}
                      {u.role === 'parent' && <p className="text-xs text-navy/60">Child: {u.childJmbg || 'None'}</p>}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <label className="flex items-center gap-1 text-xs text-navy/70">
                        <input type="checkbox" checked={!!u.disabled} onChange={(e) => updateUser(u.id, { disabled: e.target.checked })} />
                        Disabled
                      </label>
                      <button className="text-navy" onClick={() => setPendingUserDelete(u)}>Delete</button>
                    </div>
                  </div>
                ))}
                {!filteredUsers.length && <p className="text-sm text-navy/60">No users found.</p>}
              </div>
            </section>
          </div>
        )}
      </main>
      {pendingKidDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
            <div>
              <p className="text-berry font-semibold text-sm">Confirm deletion</p>
              <p className="text-lg font-display">
                Are you sure you want to delete {pendingKidDelete.firstName} {pendingKidDelete.lastName}?
              </p>
              <p className="text-sm text-navy/70">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded-xl border border-navy/20 text-navy" onClick={() => setPendingKidDelete(null)}>
                No, it was a mistake
              </button>
              <button className={`${BUTTON_PRIMARY} disabled:opacity-60`} onClick={() => deleteKid(pendingKidDelete.jmbg)} disabled={saving}>
                Yes, I am sure
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingParentDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
            <div>
              <p className="text-berry font-semibold text-sm">Confirm deletion</p>
              <p className="text-lg font-display">Are you sure you want to delete {pendingParentDelete.fullName}?</p>
              <p className="text-sm text-navy/70">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded-xl border border-navy/20 text-navy" onClick={() => setPendingParentDelete(null)}>
                No, it was a mistake
              </button>
              <button className={`${BUTTON_PRIMARY} disabled:opacity-60`} onClick={() => deleteParent(pendingParentDelete.id)} disabled={saving}>
                Yes, I am sure
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingUserDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w/full space-y-4">
            <div>
              <p className="text-berry font-semibold text-sm">Confirm deletion</p>
              <p className="text-lg font-display">Delete user {pendingUserDelete.username}?</p>
              <p className="text-sm text-navy/70">This will remove their access.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded-xl border border-navy/20 text-navy" onClick={() => setPendingUserDelete(null)}>
                No, cancel
              </button>
              <button className={`${BUTTON_PRIMARY} disabled:opacity-60`} onClick={() => { deleteUser(pendingUserDelete.id); setPendingUserDelete(null) }} disabled={saving}>
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white shadow p-4">
      <p className="text-sm text-navy/60">{label}</p>
      <p className="font-display text-3xl">{value}</p>
    </div>
  )
}

function formatDateTime(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function TodayOverviewRow({ stats, pendingCount }) {
  const cards = [
    { label: 'Children present', value: stats.childrenPresent ?? 0, tone: 'success' },
    { label: 'Children absent', value: stats.childrenAbsent ?? 0, tone: 'warning' },
    { label: 'Staff present', value: stats.staffPresent ?? 0, tone: 'success' },
    { label: 'Staff absent', value: stats.staffAbsent ?? 0, tone: 'warning' },
    { label: 'Pending requests', value: pendingCount ?? 0, tone: 'info' },
    { label: 'Overdue payments', value: stats.overduePayments ?? 0, tone: 'danger' },
    { label: 'Available spots', value: stats.availableSpots ?? '-', tone: 'neutral' },
  ]

  const toneStyle = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-white text-navy border-navy/10',
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-2xl shadow p-4 border ${toneStyle[card.tone]}`}>
          <p className="text-xs text-navy/60">{card.label}</p>
          <p className="font-display text-2xl">{card.value}</p>
        </div>
      ))}
    </div>
  )
}

function TodayEventsSection({ events, birthdays }) {
  const today = new Date()
  const isSameDay = (a) => {
    const d = new Date(a)
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }
  const todaysEvents = events.filter((ev) => isSameDay(ev.startsAt))
  const todaysBirthdays = birthdays.filter((b) => isSameDay(b.date))

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm text-navy/70">Today</h4>
      {!todaysEvents.length && !todaysBirthdays.length && <p className="text-sm text-navy/60">No events or birthdays today.</p>}
      <div className="space-y-1">
        {todaysEvents.map((ev) => (
          <div key={ev.id} className="px-3 py-2 rounded-xl border border-navy/10 bg-sky/20 text-sm">
            {ev.title} · {formatDateTime(ev.startsAt)}
          </div>
        ))}
        {todaysBirthdays.map((b) => (
          <div key={b.id} className="px-3 py-2 rounded-xl border border-navy/10 bg-mint/30 text-sm">
            {b.title}
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminCalendarGrid({ year, month, onYearChange, onMonthChange, events, birthdays }) {
  const now = new Date()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOffset = (() => {
    const dow = new Date(year, month, 1).getDay()
    return (dow + 6) % 7
  })()
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const itemsByDay = {}
  events.forEach((ev) => {
    const d = new Date(ev.startsAt)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!itemsByDay[day]) itemsByDay[day] = []
      itemsByDay[day].push({ type: ev.isHoliday ? 'holiday' : 'event', label: ev.title, time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
    }
  })
  birthdays.forEach((b) => {
    const d = new Date(b.date)
    if (d.getMonth() === month) {
      const day = d.getDate()
      if (!itemsByDay[day]) itemsByDay[day] = []
      itemsByDay[day].push({ type: 'birthday', label: b.title, time: '' })
    }
  })

  const isToday = (day) => {
    return day === now.getDate() && month === now.getMonth() && year === now.getFullYear()
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="font-display text-xl">Calendar</p>
        <select className={`${INPUT_CLASS} w-32`} value={year} onChange={(e) => onYearChange(Number(e.target.value))}>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((yr) => (
            <option key={yr} value={yr}>{yr}</option>
          ))}
        </select>
        <select className={`${INPUT_CLASS} w-32`} value={month} onChange={(e) => onMonthChange(Number(e.target.value))}>
          {months.map((m, idx) => (
            <option key={m} value={idx}>{m}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-sm text-navy/70 font-semibold">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
        {Array.from({ length: firstDayOffset }).map((_, idx) => (
          <div key={`blank-${idx}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const items = itemsByDay[day] || []
          return (
            <div key={day} className={`rounded-xl border border-navy/10 p-2 space-y-1 text-left ${isToday(day) ? 'bg-mint/20 border-mint' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{day}</span>
              </div>
              <div className="space-y-1">
                {items.map((it, idx2) => (
                  <div key={`${day}-${idx2}`} className={`text-xs rounded-lg px-2 py-1 ${it.type === 'birthday' ? 'bg-mint/30' : 'bg-sky/20'}`}>
                    {it.label} {it.time && `· ${it.time}`}
                  </div>
                ))}
                {!items.length && <p className="text-xs text-navy/50">No items</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


