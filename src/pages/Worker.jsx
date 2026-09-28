'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useLanguage } from '../components/LanguageContext'
import LazySection from '../components/LazySection'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WorkerPage() {

  const { t } = useLanguage()

  const deriveGroupFromDob = (dob) => {

    if (!dob) return ''

    const birth = new Date(dob)

    if (Number.isNaN(birth.getTime())) return ''

    const today = new Date()

    const ageYears = today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)

    if (ageYears < 1) return t('classBabies') || 'Babies'

    if (ageYears < 6) return t('classKids') || 'Kids 1-5'

    return t('classPreschool') || 'Preschoolers'

  }

  const [loggedIn, setLoggedIn] = useState(false)

  const [role, setRole] = useState('worker') // admin | worker

  const [activeTab, setActiveTab] = useState('kids')

  const [workerName, setWorkerName] = useState('')

  const [workerEmail, setWorkerEmail] = useState('')

  const [kids, setKids] = useState([])

  const [selectedKid, setSelectedKid] = useState('')

  const [assignedGroup, setAssignedGroup] = useState('')

  const [loadingKids, setLoadingKids] = useState(false)

  const [credentials, setCredentials] = useState([])

  const [loadingCreds, setLoadingCreds] = useState(false)

  const [newCredential, setNewCredential] = useState({ username: '', password: '', role: 'worker', childJmbg: '', group: t('classKids') })

  const [credentialError, setCredentialError] = useState('')

  const [loginError, setLoginError] = useState('')

  const [newKid, setNewKid] = useState({ jmbg: '', firstName: '', lastName: '', parentName: '', parentEmail: '', dob: '', entryDate: '', group: '' })

  const [newKidError, setNewKidError] = useState('')

  const [childDetailTab, setChildDetailTab] = useState('status') // status | info
  const [childMessages, setChildMessages] = useState({})
  const [newParentNotes, setNewParentNotes] = useState({})

  const [blockedAdmin, setBlockedAdmin] = useState(false)

  const [loadingData, setLoadingData] = useState(false)

  const [weekActivities, setWeekActivities] = useState({})

  const [weekMenu, setWeekMenu] = useState({})

  const daysInMonth = () => new Date(selectedYear, selectedMonth + 1, 0).getDate()

  const firstDayOffset = () => {

    const dow = new Date(selectedYear, selectedMonth, 1).getDay() // 0 (Sun) - 6 (Sat)

    return (dow + 6) % 7 // convert to Monday=0

  }

  const now = new Date()

  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-index

  const [calendarEvents, setCalendarEvents] = useState([])

  const [holidayEvents, setHolidayEvents] = useState([])

  const [calendarBirthdays, setCalendarBirthdays] = useState([])

  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '10:00', notes: '' })

  const [attendanceRecords, setAttendanceRecords] = useState([])

  const [adminNotes, setAdminNotes] = useState([])

  const [saved, setSaved] = useState('')

  const masked = '•••'

  const WORKER_CLASS = t('classKids')

  const scrollPositionsRef = useRef({})

  const combinedEvents = useMemo(() => [...holidayEvents, ...calendarEvents], [holidayEvents, calendarEvents])

  const refreshCalendar = async () => {
    try {
      const cal = await fetch(`/api/calendar?year=${selectedYear}&role=worker&group=${encodeURIComponent(assignedGroup || '')}`, { cache: 'no-store' }).then((r) => r.json())
      setCalendarEvents((cal.events || []).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)))
      const holidayMapped = (cal.holidays || []).map((h, idx) => ({
        id: h.id || `holiday-${idx}-${h.date || h.startsAt}`,
        title: h.title,
        startsAt: h.startsAt || `${h.date}T00:00:00`,
        isHoliday: true,
      }))
      setHolidayEvents(holidayMapped)
      const fallbackBirthdays = kids
        .filter((k) => !assignedGroup || (k.group || '').toLowerCase() === assignedGroup.toLowerCase())
        .map((k) => ({
          id: `bday-${k.jmbg}`,
          childJmbg: k.jmbg,
          title: `Birthday: ${k.name}`,
          date: k.dob ? new Date(k.dob).toISOString() : '',
          type: 'birthday',
        }))
      const birthdaysFromApi = cal.birthdays || []
      setCalendarBirthdays(birthdaysFromApi.length ? birthdaysFromApi : fallbackBirthdays)
    } catch (err) {
      console.error('Calendar refresh failed', err)
    }
  }

  const handleTabChange = (tab) => {
    // preserve scroll per tab to avoid jumpiness
    scrollPositionsRef.current[activeTab] = window.scrollY
    setActiveTab(tab)
    requestAnimationFrame(() => {
      const nextY = scrollPositionsRef.current[tab] ?? 0
      window.scrollTo({ top: nextY, left: 0, behavior: 'auto' })
    })
  }

  const birthdaysForMonth = useMemo(() => {

    return kids

      .filter((kid) => !assignedGroup || kid.group === assignedGroup)

      .map((kid) => {

        if (!kid.dob) return null

        const d = new Date(kid.dob)

        if (d.getMonth() === selectedMonth) {

          return { day: d.getDate(), text: `Birthday: ${kid.name}` }

        }

        return null

      })

      .filter(Boolean)

  }, [kids, selectedMonth, assignedGroup])

  const onLogin = async (e) => {

    e.preventDefault()

    if (blockedAdmin) {

      setLoginError('You are signed in as admin. Please sign out before using worker login.')

      return

    }

    const form = new FormData(e.target)

    const user = form.get('email')

    const pass = form.get('password')

    setLoginError('')

    try {

      const res = await fetch('/api/credentials', { cache: 'no-store' })

      if (!res.ok) throw new Error('Lookup failed')

      const creds = await res.json()

      setCredentials(creds)

      const match = creds.find((c) => c.username === user && c.password === pass && c.role === 'worker' && !c.disabled)

      if (match) {

        setLoggedIn(true)

        setRole('worker')

        setAssignedGroup(match.group || '')

        const fullName = `${match.firstName || ''} ${match.lastName || ''}`.trim()

        setWorkerName(fullName || match.username || 'Worker')

        setWorkerEmail(match.email || match.username || '')

        setLoginError('')

      } else {

        setLoggedIn(false)

        setRole('worker')

        setAssignedGroup('')

        setWorkerName('')

        setWorkerEmail('')

        setLoginError('Invalid username or password')

      }

    } catch (err) {

      console.error('Login lookup failed', err)

      setLoggedIn(false)

      setRole('worker')

      setAssignedGroup('')

      setWorkerName('')

      setWorkerEmail('')

      setLoginError('Could not reach the server. Start the backend and try again.')

    }

  }

  const onLogout = () => {

    setLoggedIn(false)

    setRole('worker')

    setAssignedGroup('')

    handleTabChange('kids')

    setWorkerName('')

    setWorkerEmail('')

    localStorage.removeItem('role')

    setLoginError('')

  }

  const onAddKid = async (e) => {

    e.preventDefault()

    setNewKidError('')

    if (!newKid.jmbg || !newKid.firstName || !newKid.lastName || !newKid.dob || !newKid.parentName || !newKid.parentEmail) {

      setNewKidError('Please fill JMBG, first name, last name, date of birth, parent name, and parent email.')

      return

    }

    if (!/^\d{13}$/.test(String(newKid.jmbg))) {

      setNewKidError('JMBG must be exactly 13 digits.')

      return

    }

    const combinedName = `${newKid.firstName} ${newKid.lastName}`.trim()

    const payload = {

      jmbg: newKid.jmbg,

      firstName: newKid.firstName,

      lastName: newKid.lastName,

      name: combinedName,

      parentName: newKid.parentName,

      parentEmail: newKid.parentEmail,

      group: '',

      dob: newKid.dob,

      entryDate: newKid.entryDate || new Date().toISOString().slice(0, 10),

      age: '',

      nextPayment: '',

      paymentStatus: t('paymentUnpaid'),

      paymentAmount: '',

      allergies: '',

      parentNotes: '',

      status: t('statusPresent'),

      timeIn: '',

      timeOut: '',

      absentDays: 0,

      birthCert: '',

      doctorCert: '',

      todayNote: '',

    }

    try {

      const res = await fetch('/api/children', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        cache: 'no-store',

        body: JSON.stringify(payload),

      })

      if (!res.ok) throw new Error('Create failed')

      const created = await res.json()

      setKids((prev) => [...prev, created])

      setSelectedKid(created.jmbg)

      setNewKid({ jmbg: '', firstName: '', lastName: '', parentName: '', parentEmail: '', dob: '', entryDate: '', group: t('classKids') })

    } catch (err) {

      console.error(err)

      setNewKidError('Could not add child. Check required fields and try again.')

    }

  }

  const removeKid = (jmbg) => {

    if (role !== 'admin') return

    fetch(`/api/children/${jmbg}`, { method: 'DELETE' })

      .then(() => {

        setKids((prev) => prev.filter((k) => k.jmbg !== jmbg))

        if (selectedKid === jmbg && kids.length > 1) {

          const next = kids.find((k) => k.jmbg !== jmbg)

          setSelectedKid(next?.jmbg || '')

        }

      })

      .catch((err) => console.error('Delete failed', err))

  }

  const addCalendar = (e) => {

    e.preventDefault()

    if (!calInput.date || !calInput.item) return

    setCalendar((prev) => [...prev, calInput])

    setCalInput({ date: '', item: '' })

  }

  const updateKid = async (jmbg, updates) => {

    const next = kids.map((k) =>

      k.jmbg === jmbg

        ? { ...k, ...updates, name: `${updates.firstName ?? k.firstName} ${updates.lastName ?? k.lastName}`.trim() }

        : k

    )

    setKids(next)

    const updated = next.find((k) => k.jmbg === jmbg)

    if (updated) {

      try {
        const res = await fetch(`/api/children/${jmbg}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify(updated),
        })
        if (!res.ok) throw new Error('Update failed')
      } catch (err) {
        console.error(err)
      }

    }

  }

  const loadChildMessages = async (childJmbg) => {
    if (!childJmbg || !workerEmail) return
    try {
      const res = await fetch(
        `/api/child-messages/${childJmbg}?role=worker&username=${encodeURIComponent(workerEmail)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error('Failed to load messages')
      const msgs = await res.json()
      setChildMessages((prev) => ({ ...prev, [childJmbg]: msgs }))
    } catch (err) {
      console.error(err)
    }
  }

  const sendNoteToParent = async (childJmbg) => {
    const note = (newParentNotes[childJmbg] || '').trim()
    if (!note || !workerEmail) return
    try {
      const res = await fetch('/api/child-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childJmbg,
          content: note,
          senderRole: 'worker',
          senderName: workerName || 'Worker',
          username: workerEmail,
        }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setNewParentNotes((prev) => ({ ...prev, [childJmbg]: '' }))
      loadChildMessages(childJmbg)
    } catch (err) {
      console.error(err)
    }
  }

  const filteredKids = useMemo(() => {

    const normalize = (val) => (val || '').toLowerCase().trim()

    if (!loggedIn) return []

    if (role === 'admin') return kids

    if (!assignedGroup) return kids

    const target = normalize(assignedGroup)

    const matches = kids.filter((k) => normalize(k.group) === target)

    return matches.length ? matches : kids

  }, [loggedIn, role, kids, assignedGroup])

  const currentKid = filteredKids.find((k) => k.jmbg === selectedKid) || filteredKids[0]
  const currentMessages = currentKid ? childMessages[currentKid.jmbg] || [] : []
  const presentCount = filteredKids.filter((k) => k.status === t('statusPresent')).length
  const absentCount = filteredKids.filter((k) => k.status === t('statusAbsent')).length
  const parentUnread = Object.values(childMessages)
    .flat()
    .filter((m) => m?.senderRole === 'parent').length

  useEffect(() => {
    if (currentKid) {
      setSelectedKid(currentKid.jmbg)
      loadChildMessages(currentKid.jmbg)
    }
  }, [currentKid?.jmbg, workerEmail])

  useEffect(() => {

    const storedRole = typeof window !== 'undefined' ? localStorage.getItem('role') : ''

    if (storedRole === 'admin') {

      setBlockedAdmin(true)

    }

  }, [])

  useEffect(() => {

    if (!newKid.entryDate) {

      setNewKid((prev) => ({ ...prev, entryDate: new Date().toISOString().slice(0, 10) }))

    }

    if (newKid.dob) {

      const autoGroup = deriveGroupFromDob(newKid.dob)

      if (autoGroup && newKid.group !== autoGroup) {

        setNewKid((prev) => ({ ...prev, group: autoGroup }))

      }

    }

  }, [newKid.dob, newKid.entryDate])

  const loadWorkerData = async () => {

    setLoadingData(true)

    setLoadingKids(true)

    try {

      const [

        children,

        creds,

        cal,
        acts,
        menu,
        attendanceData,
        notesData
      ] = await Promise.all([
        fetch('/api/children', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/credentials', { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/calendar?year=${selectedYear}&role=worker&group=${encodeURIComponent(assignedGroup || '')}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/activities?group=${encodeURIComponent(assignedGroup || '')}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/menu?group=${encodeURIComponent(assignedGroup || '')}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/attendance?year=${selectedYear}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/notes/admin?workerId=${encodeURIComponent(workerEmail || workerName || '')}&group=${encodeURIComponent(assignedGroup || '')}`, { cache: 'no-store' }).then(r => r.json())
      ])

      setKids(children)

      setCredentials(creds)

      setCalendarEvents((cal.events || []).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)))

      const holidayMapped = (cal.holidays || []).map((h, idx) => ({
        id: h.id || `holiday-${idx}-${h.date || h.startsAt}`,
        title: h.title,
        startsAt: h.startsAt || `${h.date}T00:00:00`,
        isHoliday: true,
        types: h.types || [],
      }))

      const fallbackBirthdays = children
        .filter((k) => !assignedGroup || (k.group || '').toLowerCase() === assignedGroup.toLowerCase())
        .map((k) => ({
          id: `bday-${k.jmbg}`,
          childJmbg: k.jmbg,
          title: `Birthday: ${k.name}`,
          date: k.dob ? new Date(k.dob).toISOString() : '',
          type: 'birthday',
        }))

      const birthdaysFromApi = cal.birthdays || []

      setCalendarBirthdays(birthdaysFromApi.length ? birthdaysFromApi : fallbackBirthdays)

      setHolidayEvents(holidayMapped || [])

      setWeekActivities(acts)

      setWeekMenu(menu)

      setAttendanceRecords(attendanceData || [])

      setAdminNotes(notesData || [])

      if (role === 'worker') {

        const filtered = assignedGroup ? children.filter((c) => c.group === assignedGroup) : []

        if (filtered.length && !selectedKid) setSelectedKid(filtered[0].jmbg)

        if (!assignedGroup) {

          const cred = creds.find((c) => c.role === 'worker' && (c.email === workerEmail || c.username === workerEmail || c.username === workerName))

          setAssignedGroup(cred?.group || filtered[0]?.group || children[0]?.group || '')

        }

      } else if (children.length && !selectedKid) {

        setSelectedKid(children[0].jmbg)

      }

    } catch (err) {

      console.error('Failed to load data', err)

      setLoginError('Could not load worker data. Start the backend and try again.')

    } finally {

      setLoadingKids(false)

      setLoadingCreds(false)

      setLoadingData(false)

    }

  }

  useEffect(() => {

    if (loggedIn) {

      loadWorkerData()

    }

  }, [loggedIn, role, assignedGroup])

  useEffect(() => {
    if (loggedIn) {
      loadWorkerData()
    }
  }, [selectedYear])
  useEffect(() => {
    if (activeTab === 'calendar') {
      refreshCalendar()
    }
  }, [activeTab, selectedYear, assignedGroup])
  // Restore per-tab scroll position when switching tabs
  useLayoutEffect(() => {
    const y = scrollPositionsRef.current[activeTab] ?? 0
    window.scrollTo({ top: y, left: 0, behavior: 'auto' })
  }, [activeTab])

  // Keep worker group in sync and avoid empty lists if group strings differ slightly

  useEffect(() => {

    if (!loggedIn || role !== 'worker') return

    const normalize = (v) => (v || '').toLowerCase().trim()

    if (!assignedGroup) {

      const cred = credentials.find((c) => c.role === 'worker' && (c.email === workerEmail || c.username === workerEmail || c.username === workerName))

      if (cred?.group) {

        setAssignedGroup(cred.group)

      } else if (kids.length) {

        setAssignedGroup(kids[0].group || '')

      }

      return

    }

    if (kids.length && filteredKids.length === 0) {

      const target = normalize(assignedGroup)

      const fallback = kids.find((k) => {

        const g = normalize(k.group)

        return g === target || g.includes(target) || target.includes(g)

      })

      if (fallback?.group) setAssignedGroup(fallback.group)

    }

  }, [loggedIn, role, assignedGroup, credentials, workerEmail, workerName, kids, filteredKids.length])

  return (

    <main className="px-6 lg:px-12 py-12 space-y-8">

      {!loggedIn && (

        <section className="grid lg:grid-cols-3 gap-6">

          <div className="rounded-2xl bg-white p-6 shadow space-y-4 lg:col-span-1">

            <h2 className="font-display text-xl">Sign in</h2>

            <form className="space-y-3" onSubmit={onLogin}>

              <input name="email" className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10" placeholder="Email" required disabled={blockedAdmin} />

              <input name="password" className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10" placeholder="Password" type="password" required disabled={blockedAdmin} />

              <button disabled={blockedAdmin} className={`w-full bg-berry text-white font-semibold px-4 py-3 rounded-xl shadow hover:-translate-y-0.5 transition ${blockedAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}>

                {t('loginButton')}

              </button>

              <p className="text-xs text-navy/60">Worker demo: worker@mladost.com / worker123 (sees assigned class only)</p>

              <p className="text-xs text-navy/60">Staff tools stay hidden until a worker signs in.</p>

              {blockedAdmin && <p className="text-xs text-berry">You are signed in as admin. Please sign out before using worker login.</p>}

              {loginError && <p className="text-xs text-berry">{loginError}</p>}

            </form>

          </div>

        </section>

      )}

      {loggedIn && (

        <>

          <header className="space-y-2 max-w-5xl">

            <div className="flex flex-wrap items-start gap-3 justify-between">

              <div className="flex-1 min-w-[220px]">

                <p className="text-berry font-semibold">{t('workerPortal')}</p>

                <h1 className="font-display text-4xl">Hello {workerName || 'Worker'}</h1>

                <p className="text-navy/75 text-sm">Email: {workerEmail || 'N/A'}</p>

                <p className="text-navy/75 text-sm">Group: {assignedGroup || 'None'}</p>

              </div>

              <button onClick={onLogout} className="px-4 py-2 rounded-xl bg-navy text-white font-semibold shadow hover:-translate-y-0.5 transition self-start">{t('logout')}</button>

            </div>

          </header>

          <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">

            <div className="rounded-2xl bg-white shadow p-4">

              <p className="text-sm text-navy/60">Present today</p>

              <p className="font-display text-3xl">{presentCount}</p>

            </div>

            <div className="rounded-2xl bg-white shadow p-4">

              <p className="text-sm text-navy/60">Absent today</p>

              <p className="font-display text-3xl">{absentCount}</p>

            </div>

            <div className="rounded-2xl bg-white shadow p-4">

              <p className="text-sm text-navy/60">Unread admin notes</p>

              <p className="font-display text-3xl">{adminNotes.filter((n) => !n.isRead).length}</p>
              <p className="text-xs text-navy/60 mt-1">Parent messages: {parentUnread}</p>

            </div>

          </section>

          <section className="grid lg:grid-cols-3 gap-3">

            <div className="rounded-2xl bg-white shadow p-4 space-y-2">

              <div className="flex items-center justify-between">

                <p className="font-semibold">Birthdays today</p>

                <span className="text-xs text-navy/60">{todayBirthdays(kids).length}</span>

              </div>

              <div className="space-y-1 max-h-48 overflow-auto">

                {todayBirthdays(kids, assignedGroup).map((b) => (

                  <p key={b.jmbg} className="text-sm text-navy/80">{b.name} • {b.age} yrs</p>

                ))}

                {!todayBirthdays(kids, assignedGroup).length && <p className="text-sm text-navy/60">No birthdays today.</p>}

              </div>

            </div>

            <div className="rounded-2xl bg-white shadow p-4 space-y-2">

              <div className="flex items-center justify-between">

                <p className="font-semibold">Events today</p>

                <span className="text-xs text-navy/60">{todayEvents(combinedEvents).length}</span>

              </div>

              <div className="space-y-1 max-h-48 overflow-auto">

                {todayEvents(combinedEvents).map((ev) => (

                  <p key={ev.id} className="text-sm text-navy/80">{ev.title} → {formatTime(ev.startsAt)} {ev.isHoliday ? "(Holiday)" : ""}</p>

                ))}

                {!todayEvents(combinedEvents).length && <p className="text-sm text-navy/60">No events today.</p>}

              </div>

            </div>

            <div className="rounded-2xl bg-white shadow p-4 space-y-2">

              <div className="flex items-center justify-between">

                <p className="font-semibold">Notes from Admin</p>

                <span className="text-xs text-navy/60">Unread: {adminNotes.filter((n) => !n.isRead).length}</span>

              </div>

              <div className="space-y-1 max-h-48 overflow-auto">

                {adminNotes.slice(0, 5).map((n) => (

                  <div key={n.id} className={`text-sm p-2 rounded-lg border ${n.isRead ? 'bg-white' : 'bg-amber-50'}`}>

                    <p className="font-semibold">{n.title}</p>

                    <p className="text-navy/70">{n.body || n.message}</p>
                    {n.childJmbg && <p className="text-xs text-navy/60">Child: {n.childJmbg}</p>}

                    {!n.isRead && (

                      <button

                        className="text-xs text-berry"

                        onClick={async () => {

                          await fetch('/api/notes/admin/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noteId: n.id, workerId: workerEmail || workerName || '' }) })

                          setAdminNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))

                        }}

                      >

                        Mark read

                      </button>

                    )}

                  </div>

                ))}

                {!adminNotes.length && <p className="text-sm text-navy/60">No notes yet.</p>}

              </div>

            </div>

          </section>

          <section className="rounded-2xl bg-white p-6 shadow space-y-4">

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div className="flex flex-wrap gap-3">

                <button onClick={() => handleTabChange('kids')} className={`px-3 py-2 rounded-xl font-semibold ${activeTab === 'kids' ? 'bg-berry text-white' : 'bg-sky/20 text-navy'}`}>{t('navKids')}</button>

                <button onClick={() => handleTabChange('calendar')} className={`px-3 py-2 rounded-xl font-semibold ${activeTab === 'calendar' ? 'bg-berry text-white' : 'bg-sky/20 text-navy'}`}>{t('navCalendar')}</button>

                <button onClick={() => handleTabChange('activities')} className={`px-3 py-2 rounded-xl font-semibold ${activeTab === 'activities' ? 'bg-berry text-white' : 'bg-sky/20 text-navy'}`}>{t('navWeekActivities')}</button>

                <button onClick={() => handleTabChange('menu')} className={`px-3 py-2 rounded-xl font-semibold ${activeTab === 'menu' ? 'bg-berry text-white' : 'bg-sky/20 text-navy'}`}>{t('navMenu')}</button>

                {role === 'admin' && (

                  <button onClick={() => handleTabChange('creds')} className={`px-3 py-2 rounded-xl font-semibold ${activeTab === 'creds' ? 'bg-berry text-white' : 'bg-sky/20 text-navy'}`}>{t('navCreds')}</button>

                )}

              </div>

              <span className="text-sm text-navy/60">{role === 'admin' ? 'Admin' : 'Worker'}</span>

            </div>

          </section>

        </>

      )}

      {loggedIn && activeTab === 'kids' && (
        <LazySection>
          <section className="grid lg:grid-cols-3 gap-6">

          <div className="rounded-2xl bg-white p-6 shadow space-y-4">

            <div className="flex items-center justify-between">

              <h3 className="font-display text-2xl">{t('kidsList')}</h3>

              <span className="text-sm text-navy/60">{t('classFilter')}: {role === 'admin' ? 'All' : assignedGroup || 'None'}</span>

            </div>

            <div className="grid md:grid-cols-2 gap-3">

              {loadingKids && <p className="text-sm text-navy/60">Loading children…</p>}

              {filteredKids.map((kid) => (

                <button

                  key={kid.jmbg}

                  onClick={() => setSelectedKid(kid.jmbg)}

                  className={`rounded-xl border border-navy/10 p-3 text-left ${selectedKid === kid.jmbg ? 'bg-sky/20' : 'bg-white'}`}

                >

                  <p className="font-semibold">{kid.name}</p>

                  <p className="text-xs text-navy/60">JMBG: {kid.jmbg}</p>

                  <p className="text-sm text-navy/70">{kid.group}</p>

                  <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-block mt-2 ${kid.status === t('statusPresent') ? 'bg-mint text-navy' : 'bg-berry/20 text-navy'}`}>

                    {kid.status}

                  </span>

                </button>

              ))}

            </div>

            {role === 'admin' && (

              <form className="space-y-3" onSubmit={onAddKid}>

                <p className="font-semibold">{t('addChild')}</p>

                <div className="grid md:grid-cols-3 gap-3">

                  <input className="w-full px-4 py-2 rounded-xl text-navy bg-white border border-navy/10" placeholder={t('childJmbg')} value={newKid.jmbg} onChange={(e) => setNewKid({ ...newKid, jmbg: e.target.value })} />

                  <input className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10" placeholder="First name" value={newKid.firstName} onChange={(e) => setNewKid({ ...newKid, firstName: e.target.value })} />

                  <input className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10" placeholder="Last name" value={newKid.lastName} onChange={(e) => setNewKid({ ...newKid, lastName: e.target.value })} />

                  <input className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10" placeholder={t('parentName')} value={newKid.parentName} onChange={(e) => setNewKid({ ...newKid, parentName: e.target.value })} />

                  <input className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10" placeholder="Parent email" value={newKid.parentEmail} onChange={(e) => setNewKid({ ...newKid, parentEmail: e.target.value })} />

                  <div className="space-y-1">

                    <p className="text-sm text-navy/60">{t('dob')}</p>

                    <input className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10" type="date" value={newKid.dob} onChange={(e) => setNewKid({ ...newKid, dob: e.target.value })} />

                  </div>

                  <div className="space-y-1">

                    <p className="text-sm text-navy/60">{t('entryDate')}</p>

                    <input className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10" type="date" value={newKid.entryDate} onChange={(e) => setNewKid({ ...newKid, entryDate: e.target.value || new Date().toISOString().slice(0, 10) })} />

                  </div>

                  <div className="space-y-1">

                    <input

                      className="w-full px-4 py-3 rounded-xl text-navy bg-berry/10 border border-navy/10 font-semibold"

                      value={newKid.group || 'Group (auto by age)'}

                      readOnly

                    />

                  </div>

                </div>

                <button className="bg-sunrise text-navy font-semibold px-5 py-3 rounded-xl shadow hover:-translate-y-0.5 transition">

                  {t('addChild')}

                </button>

                {newKidError && <p className="text-sm text-berry">{newKidError}</p>}

              </form>

            )}

          </div>

          {currentKid && (

            <div className="rounded-2xl bg-white p-6 shadow space-y-4 lg:col-span-2">

              <h3 className="font-display text-2xl">{t('kidDetails')}</h3>

              <div className="flex gap-2">

                <button className={`px-3 py-2 rounded-xl font-semibold ${childDetailTab === 'status' ? 'bg-berry text-white' : 'bg-sky/20 text-navy'}`} onClick={() => setChildDetailTab('status')}>Today status</button>

                <button className={`px-3 py-2 rounded-xl font-semibold ${childDetailTab === 'info' ? 'bg-berry text-white' : 'bg-sky/20 text-navy'}`} onClick={() => setChildDetailTab('info')}>{t('kidDetails')}</button>

              </div>

            {childDetailTab === 'status' && (

              <div className="space-y-3">

                <div className="space-y-2">

                  <p className="font-semibold">{t('attendanceStatus')}</p>

                    <select

                      className="w-full px-3 py-2 rounded-xl border border-navy/10"

                      value={currentKid.status}

                      onChange={(e) => updateKid(currentKid.jmbg, { status: e.target.value })}

                    >

                      <option value={t('statusPresent')}>{t('statusPresent')}</option>

                      <option value={t('statusAbsent')}>{t('statusAbsent')}</option>

                    </select>

                  </div>

                  <div className="space-y-2">

                    <p className="font-semibold">{t('commentToday')}</p>

                    <textarea

                      className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10"

                      rows="3"

                      placeholder={t('todayComment')}

                      value={currentKid.todayNote}

                      onChange={(e) => updateKid(currentKid.jmbg, { todayNote: e.target.value })}

                    />

                  </div>

                  <div className="grid md:grid-cols-2 gap-3">

                    <div className="space-y-1">

                      <p className="font-semibold">{t('timeIn')}</p>

                      <input

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        value={currentKid.timeIn}

                        onChange={(e) => updateKid(currentKid.jmbg, { timeIn: e.target.value })}

                      />

                    </div>

                    <div className="space-y-1">

                      <p className="font-semibold">{t('timeOut')}</p>

                      <input

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        value={currentKid.timeOut}

                        onChange={(e) => updateKid(currentKid.jmbg, { timeOut: e.target.value })}

                      />

                    </div>

                </div>

                <div className="space-y-2">
                  <p className="font-semibold">Notes to parent</p>
                  <div className="space-y-2 max-h-60 overflow-auto border border-navy/10 rounded-xl p-3 bg-sky/10">
                    {currentMessages.length === 0 && <p className="text-sm text-navy/60">No messages yet.</p>}
                    {currentMessages.map((msg) => (
                      <div key={msg.id} className="text-sm text-navy/80">
                        <p className="font-semibold">
                          {msg.senderRole === 'worker' ? 'You' : 'Parent'} ·{' '}
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                        <p>{msg.content}</p>
                      </div>
                    ))}
                  </div>
                  <textarea
                    className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10"
                    rows="3"
                    placeholder="Write a short note to parents..."
                    value={newParentNotes[currentKid.jmbg] || ''}
                    onChange={(e) =>
                      setNewParentNotes((prev) => ({ ...prev, [currentKid.jmbg]: e.target.value }))
                    }
                  />
                  <button
                    className="px-4 py-2 rounded-full bg-berry text-white font-semibold shadow hover:-translate-y-0.5 transition"
                    type="button"
                    onClick={() => sendNoteToParent(currentKid.jmbg)}
                  >
                    Send note
                  </button>
                </div>

              </div>

            )}

              {childDetailTab === 'info' && (

                <>

                  <div className="grid md:grid-cols-2 gap-4">

                    <div>

                      <p className="text-sm text-navy/60">{t('childName')}</p>

                      <input

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        value={currentKid.firstName}

                        disabled={role !== 'admin'}

                        onChange={(e) => updateKid(currentKid.jmbg, { firstName: e.target.value })}

                      />

                    </div>

                    <div>

                      <p className="text-sm text-navy/60">Surname</p>

                      <input

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        value={currentKid.lastName}

                        disabled={role !== 'admin'}

                        onChange={(e) => updateKid(currentKid.jmbg, { lastName: e.target.value })}

                      />

                    </div>

                    <div>

                      <p className="text-sm text-navy/60">{t('childJmbg')}</p>

                      <input

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        value={currentKid.jmbg}

                        disabled={role !== 'admin'}

                        onChange={(e) => {

                          const newId = e.target.value

                          const oldId = currentKid.jmbg

                          updateKid(oldId, { jmbg: newId })

                          setSelectedKid(newId)

                        }}

                      />

                    </div>

                    <div>

                      <p className="text-sm text-navy/60">{t('parentName')}</p>

                      <input

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        value={currentKid.parentName}

                        disabled={role !== 'admin'}

                        onChange={(e) => updateKid(currentKid.jmbg, { parentName: e.target.value })}

                      />

                    </div>

                    <div>

                      <p className="text-sm text-navy/60">{t('childGroup')}</p>

                      <select

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        value={currentKid.group}

                        disabled={role !== 'admin'}

                        onChange={(e) => updateKid(currentKid.jmbg, { group: e.target.value })}

                      >

                        <option value={t('classBabies')}>{t('classBabies')}</option>

                        <option value={t('classKids')}>{t('classKids')}</option>

                        <option value={t('classPreschool')}>{t('classPreschool')}</option>

                      </select>

                    </div>

                    <div>

                      <p className="text-sm text-navy/60">{t('dob')}</p>

                      <input

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        type="date"

                        value={currentKid.dob || ''}

                        disabled={role !== 'admin'}

                        onChange={(e) => updateKid(currentKid.jmbg, { dob: e.target.value })}

                      />

                    </div>

                    <div>

                      <p className="text-sm text-navy/60">{t('entryDate')}</p>

                      <input

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        type="date"

                        value={currentKid.entryDate}

                        disabled={role !== 'admin'}

                        onChange={(e) => updateKid(currentKid.jmbg, { entryDate: e.target.value })}

                      />

                    </div>

                    <div>

                      <p className="text-sm text-navy/60">{t('nextPayment')}</p>

                      <input

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        type="date"

                        value={currentKid.nextPayment}

                        disabled={role !== 'admin'}

                        onChange={(e) => updateKid(currentKid.jmbg, { nextPayment: e.target.value })}

                      />

                    </div>

                    <div>

                      <p className="text-sm text-navy/60">{t('paymentStatus')}</p>

                      <select

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        value={currentKid.paymentStatus}

                        disabled={role !== 'admin'}

                        onChange={(e) => updateKid(currentKid.jmbg, { paymentStatus: e.target.value })}

                      >

                        <option value={t('paymentPaid')}>{t('paymentPaid')}</option>

                        <option value={t('paymentUnpaid')}>{t('paymentUnpaid')}</option>

                      </select>

                    </div>

                    <div>

                      <p className="text-sm text-navy/60">{t('paymentAmount')}</p>

                      <input

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        value={currentKid.paymentAmount}

                        disabled={role !== 'admin'}

                        onChange={(e) => updateKid(currentKid.jmbg, { paymentAmount: e.target.value })}

                      />

                    </div>

                    <div>

                      <p className="text-sm text-navy/60">{t('allergies')}</p>

                      <input

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        value={currentKid.allergies}

                        disabled={role !== 'admin'}

                        onChange={(e) => updateKid(currentKid.jmbg, { allergies: e.target.value })}

                      />

                    </div>

                    <div>

                      <p className="text-sm text-navy/60">{t('parentNotes')}</p>

                      <textarea

                        className="w-full px-3 py-2 rounded-xl border border-navy/10"

                        rows="2"

                        value={currentKid.parentNotes}

                        disabled={role !== 'admin'}

                        onChange={(e) => updateKid(currentKid.jmbg, { parentNotes: e.target.value })}

                      />

                    </div>

                  </div>

                  <div className="space-y-2">

                    <p className="font-semibold">{t('absentDays')}</p>

                    <p className="text-navy/80">{currentKid.absentDays}</p>

                  </div>

                  <div className="grid md:grid-cols-2 gap-3">

                    <div className="space-y-1">

                      <p className="text-sm text-navy/60">{t('birthCert')}</p>

                      <input type="file" disabled={role !== 'admin'} onChange={(e) => updateKid(currentKid.jmbg, { birthCert: e.target.files?.[0]?.name || '' })} className="w-full text-sm" />

                      {currentKid.birthCert && <p className="text-xs text-navy/70">Saved: {currentKid.birthCert}</p>}

                    </div>

                    <div className="space-y-1">

                      <p className="text-sm text-navy/60">{t('doctorCert')}</p>

                      <input type="file" disabled={role !== 'admin'} onChange={(e) => updateKid(currentKid.jmbg, { doctorCert: e.target.files?.[0]?.name || '' })} className="w-full text-sm" />

                      {currentKid.doctorCert && <p className="text-xs text-navy/70">Saved: {currentKid.doctorCert}</p>}

                    </div>

                  </div>

                  {role === 'admin' && (

                    <button className="text-berry text-sm font-semibold" onClick={() => removeKid(currentKid.jmbg)}>

                      {t('deleteChild')}

                    </button>

                  )}

                </>

              )}

            </div>

          )}

          </section>
        </LazySection>

      )}

      {loggedIn && activeTab === 'menu' && (
        <LazySection>
          <section className="rounded-2xl bg-white p-6 shadow space-y-4">

          <p className="font-display text-xl">{t('menuWeekEdit')}</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">

            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day) => {

              const data = weekMenu[day] || {}

              return (

                <div key={day} className="rounded-xl border border-navy/10 p-3 space-y-2 bg-white">

                  <p className="font-semibold">{day}</p>

                  {['breakfast','lunch','snack'].map((meal) => (

                    <div key={meal} className="space-y-1">

                      <p className="text-sm text-navy/60 capitalize">{meal}</p>

                      <textarea

                        className="w-full px-3 py-2 rounded-lg border border-navy/10"

                        rows="2"

                        value={data?.[meal] || ''}

                        placeholder={`Add ${meal}...`}

                        onChange={(e) => {

                          const val = e.target.value

                          const nextDay = { ...(weekMenu[day] || {}), [meal]: val }

                          setWeekMenu((prev) => ({ ...prev, [day]: nextDay }))

                          fetch('/api/menu', {

                            method: 'PATCH',

                            headers: { 'Content-Type': 'application/json', 'x-user-role': 'worker' },

                            cache: 'no-store',

                            body: JSON.stringify({ group: assignedGroup, day, data: nextDay }),

                          })

                            .then((res) => res.json())

                            .then((data) => setWeekMenu(data))

                            .catch((err) => console.error('Menu save failed', err))

                        }}

                      />

                    </div>

                  ))}

                  <div className="space-y-1">

                    <p className="text-sm text-navy/60">Allergies</p>

                    <textarea

                      className="w-full px-3 py-2 rounded-lg border border-navy/10"

                      rows="2"

                      value={data?.allergies || ''}

                      onChange={(e) => {

                        const nextDay = { ...(weekMenu[day] || {}), allergies: e.target.value }

                        setWeekMenu((prev) => ({ ...prev, [day]: nextDay }))

                          fetch('/api/menu', {

                            method: 'PATCH',

                            headers: { 'Content-Type': 'application/json', 'x-user-role': 'worker' },

                            cache: 'no-store',

                            body: JSON.stringify({ group: assignedGroup, day, data: nextDay }),

                          })

                          .then((res) => res.json())

                          .then((data) => setWeekMenu(data))

                          .catch((err) => console.error('Menu save failed', err))

                      }}

                    />

                  </div>

                  <div className="space-y-1">

                    <p className="text-sm text-navy/60">Ingredients</p>

                    <textarea

                      className="w-full px-3 py-2 rounded-lg border border-navy/10"

                      rows="2"

                      value={data?.ingredients || ''}

                      onChange={(e) => {

                        const nextDay = { ...(weekMenu[day] || {}), ingredients: e.target.value }

                        setWeekMenu((prev) => ({ ...prev, [day]: nextDay }))

                          fetch('/api/menu', {

                            method: 'PATCH',

                            headers: { 'Content-Type': 'application/json', 'x-user-role': 'worker' },

                            cache: 'no-store',

                            body: JSON.stringify({ group: assignedGroup, day, data: nextDay }),

                          })

                          .then((res) => res.json())

                          .then((data) => setWeekMenu(data))

                          .catch((err) => console.error('Menu save failed', err))

                      }}

                    />

                  </div>

                </div>

              )

            })}

          </div>

          </section>
        </LazySection>

      )}

      {loggedIn && activeTab === 'activities' && (
        <LazySection>
          <section className="rounded-2xl bg-white p-6 shadow space-y-4">

          <p className="font-display text-xl">{t('activitiesWeekEdit')}</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">

            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day) => (

              <div key={day} className="rounded-xl border border-navy/10 p-3 space-y-2 bg-white">

                <p className="font-semibold">{day}</p>

                <textarea

                  className="w-full px-3 py-2 rounded-lg border border-navy/10"

                  rows="4"

                  value={weekActivities[day] || ''}

                  placeholder="Add activities for this day..."

                  onChange={(e) => {

                    const val = e.target.value

                    setWeekActivities((prev) => ({ ...prev, [day]: val }))

                    fetch('/api/activities', {

                      method: 'PATCH',

                      headers: { 'Content-Type': 'application/json', 'x-user-role': 'worker' },

                      cache: 'no-store',

                      body: JSON.stringify({ group: assignedGroup, days: { [day]: val } }),

                    })

                      .then((res) => res.json())

                      .then((data) => setWeekActivities(data))

                      .catch((err) => console.error('Activities save failed', err))

                  }}

                />

              </div>

            ))}

          </div>

          </section>
        </LazySection>

      )}

      {loggedIn && activeTab === 'calendar' && (
        <LazySection>
          <section className="rounded-2xl bg-white p-6 shadow space-y-4">

          <div className="flex flex-wrap gap-3 items-center">

            <p className="font-display text-xl">{t('calendar')}</p>

            <select className="px-3 py-2 rounded-xl border border-navy/10" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>

              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((yr) => (

                <option key={yr} value={yr}>{yr}</option>

              ))}

            </select>

            <select className="px-3 py-2 rounded-xl border border-navy/10" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>

              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, idx) => (

                <option key={m} value={idx}>{m}</option>

              ))}

            </select>

            <button
              type="button"
              className="px-3 py-2 rounded-xl border border-berry/20 text-berry font-semibold"
              onClick={refreshCalendar}
            >
              Refresh
            </button>

          </div>

          {role === 'worker' && (

            <form

              className="grid md:grid-cols-4 gap-3 items-end bg-sky/10 p-4 rounded-xl border border-navy/10"

              onSubmit={async (e) => {

                e.preventDefault()

                if (!newEvent.title || !newEvent.date) return

                const startsAt = new Date(`${newEvent.date}T${newEvent.time || '10:00'}`)

                try {

                  const res = await fetch('/api/calendar', {

                    method: 'POST',

                    headers: { 'Content-Type': 'application/json', 'x-user-role': 'worker' },

                    cache: 'no-store',

                    body: JSON.stringify({ title: newEvent.title, startsAt, notes: newEvent.notes }),

                  })

                  if (!res.ok) throw new Error('Create failed')

                  const created = await res.json()

                  setCalendarEvents((prev) => [created, ...prev].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)))
                  refreshCalendar()

                  setNewEvent({ title: '', date: '', time: '10:00', notes: '' })

                } catch (err) {

                  console.error('Create event failed', err)

                }

              }}

            >

              <div className="md:col-span-2">

                <p className="text-sm text-navy/70">Title</p>

                <input className="w-full px-3 py-2 rounded-xl border border-navy/10" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} required />

              </div>

              <div>

                <p className="text-sm text-navy/70">Date</p>

                <input className="w-full px-3 py-2 rounded-xl border border-navy/10" type="date" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} required />

              </div>

              <div>

                <p className="text-sm text-navy/70">Time</p>

                <input className="w-full px-3 py-2 rounded-xl border border-navy/10" type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} />

              </div>

              <div className="md:col-span-3">

                <p className="text-sm text-navy/70">Notes</p>

                <textarea className="w-full px-3 py-2 rounded-xl border border-navy/10" rows="2" value={newEvent.notes} onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })} />

              </div>

              <div>

                <button className="px-4 py-2 rounded-xl bg-berry text-white font-semibold">Add event</button>

              </div>

            </form>

          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            <div className="space-y-2">

              <p className="font-semibold text-navy">Events</p>

              <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">

                {combinedEvents

                  .filter((ev) => {

                    const d = new Date(ev.startsAt)

                    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth

                  })

                  .map((ev) => (

                    <div key={ev.id} className="border border-navy/10 rounded-xl p-3 flex items-start justify-between gap-3">

                      <div>

                        <p className="font-semibold">{ev.title}</p>

                        <p className="text-xs text-navy/60">{new Date(ev.startsAt).toLocaleString()}</p>

                        {ev.notes && <p className="text-sm text-navy/70">{ev.notes}</p>}

                      </div>

                      {role === 'worker' && ev.type === 'worker-event' && !ev.isHoliday && (

                        <button

                          className="text-xs text-berry"

                          onClick={async () => {

                            if (ev.isHoliday) return

                            try {

                              await fetch(`/api/calendar/${ev.id}`, { method: 'DELETE', headers: { 'x-user-role': 'worker' } })

                              setCalendarEvents((prev) => prev.filter((e) => e.id !== ev.id))
                              refreshCalendar()

                            } catch (err) {

                              console.error('Delete event failed', err)

                            }

                          }}

                        >

                          Delete

                        </button>

                      )}

                    </div>

                  ))}

                {!combinedEvents.filter((ev) => new Date(ev.startsAt).getFullYear() === selectedYear && new Date(ev.startsAt).getMonth() === selectedMonth).length && (

                  <p className="text-sm text-navy/60">No events this month.</p>

                )}

              </div>

            </div>

            <div className="space-y-2">

              <p className="font-semibold text-navy">Birthdays</p>

              <div className="space-y-1">

                {calendarBirthdays

                  .filter((b) => {

                    const d = new Date(b.date)

                    const inMonth = d.getMonth() === selectedMonth

                    return inMonth

                  })

                  .map((b) => (

                    <div key={b.id} className="px-3 py-2 rounded-xl border border-navy/10 bg-mint/30 text-sm">

                      {b.title} · {new Date(b.date).toLocaleDateString()}

                    </div>

                  ))}

                {!calendarBirthdays.filter((b) => {

                  const d = new Date(b.date)

                  return d.getMonth() === selectedMonth

                }).length && <p className="text-sm text-navy/60">No birthdays this month.</p>}

              </div>

            </div>

          </div>

          <div className="bg-white rounded-2xl shadow p-4 space-y-2">

            <p className="font-semibold text-navy">Month view</p>

            <WorkerCalendarGrid

              year={selectedYear}

              month={selectedMonth}

              onYearChange={setSelectedYear}

              onMonthChange={setSelectedMonth}

              events={combinedEvents}

              birthdays={calendarBirthdays}

              assignedGroup={assignedGroup}

              kids={kids}

            />

          </div>

          </section>
        </LazySection>

      )}

      {loggedIn && activeTab === 'creds' && role === 'admin' && (
        <LazySection>
          <section className="rounded-2xl bg-white p-6 shadow space-y-3">

          <div className="flex items-center justify-between">

            <div>

              <p className="font-display text-xl">{t('credentials')}</p>

              <p className="text-navy/60 text-sm">{t('credentialsHint')}</p>

            </div>

            {saved && <span className="text-sm text-berry font-semibold">{saved}</span>}

          </div>

          <div className="grid md:grid-cols-3 gap-3">

            {credentials.map((c) => (

              <div key={c.id} className="rounded-xl border border-navy/10 p-3 space-y-1 text-sm">

                <p className="font-semibold">{c.username}</p>

                <p>Role: {c.role}</p>

                {c.role === 'worker' && <p>Group: {c.group || masked}</p>}

                {c.role === 'parent' && <p>Child JMBG: {c.childJmbg || masked}</p>}

                <p>Pass: {c.password}</p>

                <button

                  className="text-berry text-xs font-semibold"

                  onClick={async () => {

                    try {

                      const res = await fetch(`/api/credentials/${c.id}`, { method: 'DELETE', cache: 'no-store' })

                      if (!res.ok) throw new Error('Delete failed')

                      setCredentials((prev) => prev.filter((item) => item.id !== c.id))

                    } catch (err) {

                      console.error('Delete credential failed', err)

                    }

                  }}

                >

                  Delete

                </button>

              </div>

            ))}

          </div>

          <form

            className="grid md:grid-cols-5 gap-3 pt-2"

            onSubmit={async (e) => {

              e.preventDefault()

              setCredentialError('')

              if (newCredential.role === 'worker' && !newCredential.group) {

                setCredentialError('Please select a group for the worker.')

                return

              }

              try {

                const res = await fetch('/api/credentials', {

                  method: 'POST',

                  headers: { 'Content-Type': 'application/json' },

                  cache: 'no-store',

                  body: JSON.stringify(newCredential),

                })

                if (!res.ok) {

                  const errJson = await res.json().catch(() => ({}))

                  throw new Error(errJson.error || 'Create failed')

                }

                const created = await res.json()

                setCredentials((prev) => [...prev, created])

                setNewCredential({ username: '', password: '', role: 'worker', childJmbg: '', group: t('classKids') })

              } catch (err) {

                console.error('Credential create failed', err)

                setCredentialError(err.message || 'Create failed')

              }

            }}

          >

            <input className="w-full px-3 py-2 rounded-xl border border-navy/10" placeholder="Username" value={newCredential.username} onChange={(e) => setNewCredential({ ...newCredential, username: e.target.value })} required />

            <input className="w-full px-3 py-2 rounded-xl border border-navy/10" placeholder="Password" value={newCredential.password} onChange={(e) => setNewCredential({ ...newCredential, password: e.target.value })} required />

            <select className="w-full px-3 py-2 rounded-xl border border-navy/10" value={newCredential.role} onChange={(e) => setNewCredential({ ...newCredential, role: e.target.value })}>

              <option value="worker">Worker</option>

              <option value="parent">Parent</option>

            </select>

            <select className="w-full px-3 py-2 rounded-xl border border-navy/10" value={newCredential.group} onChange={(e) => setNewCredential({ ...newCredential, group: e.target.value })} disabled={newCredential.role !== 'worker'}>

              <option value={t('classBabies')}>{t('classBabies')}</option>

              <option value={t('classKids')}>{t('classKids')}</option>

              <option value={t('classPreschool')}>{t('classPreschool')}</option>

            </select>

            <input className="w-full px-3 py-2 rounded-xl border border-navy/10" placeholder="Child JMBG (for parent)" value={newCredential.childJmbg} onChange={(e) => setNewCredential({ ...newCredential, childJmbg: e.target.value })} disabled={newCredential.role !== 'parent'} />

            <div className="md:col-span-5">

              <button className="bg-sunrise text-navy font-semibold px-5 py-3 rounded-xl shadow hover:-translate-y-0.5 transition">

                Add account

              </button>

              {credentialError && <p className="text-sm text-berry mt-2">{credentialError}</p>}

            </div>

          </form>

          </section>
        </LazySection>

      )}

      {!loggedIn && (

        <div className="rounded-2xl bg-white p-6 shadow text-navy/70">

          Staff tools are hidden until you sign in.

        </div>

      )}

    </main>

  )

}

function WorkerCalendarGrid({ year, month, onYearChange, onMonthChange, events, birthdays, assignedGroup, kids }) {

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

    const kid = kids.find((k) => k.jmbg === b.childJmbg)

    const inGroup = assignedGroup ? kid?.group === assignedGroup : true

    if (d.getMonth() === month && inGroup) {

      const day = d.getDate()

      if (!itemsByDay[day]) itemsByDay[day] = []

      itemsByDay[day].push({ type: 'birthday', label: b.title })

    }

  })

  const isToday = (day) => day === now.getDate() && month === now.getMonth() && year === now.getFullYear()

  return (

    <div className="space-y-3">

      <div className="flex items-center gap-3 flex-wrap">

        <select className="px-3 py-2 rounded-xl border border-navy/10" value={year} onChange={(e) => onYearChange(Number(e.target.value))}>

          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((yr) => (

            <option key={yr} value={yr}>{yr}</option>

          ))}

        </select>

        <select className="px-3 py-2 rounded-xl border border-navy/10" value={month} onChange={(e) => onMonthChange(Number(e.target.value))}>

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

            <div key={day} className={`rounded-xl border border-navy/10 p-2 space-y-1 text-left ${isToday(day) ? 'bg-mint/30 border-mint' : 'bg-white'}`}>

              <div className="flex items-center justify-between">

                <span className="font-semibold">{day}</span>

              </div>

              <div className="space-y-1">

                {items.map((it, idx2) => {
                  const tone = it.type === 'birthday' ? 'bg-mint/30' : it.type === 'holiday' ? 'bg-indigo-200' : 'bg-sky/20'
                  return (
                    <div key={`${day}-${idx2}`} className={`text-xs rounded-lg px-2 py-1 ${tone}`}>
                      {it.label} {it.time && `at ${it.time}`}
                    </div>
                  )
                })}
                {!items.length && <p className="text-xs text-navy/50">No items</p>}
              </div>
            </div>
          )
        })}

      </div>

    </div>

  )

}

const todayBirthdays = (kids, assignedGroup = '') => {

  const today = new Date()

  return (kids || [])

    .filter((k) => (!assignedGroup || k.group === assignedGroup) && k.dob)

    .filter((k) => {

      const d = new Date(k.dob)

      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth()

    })

    .map((k) => {

      const age = today.getFullYear() - new Date(k.dob).getFullYear()

      return { jmbg: k.jmbg, name: k.name, age }

    })

}

const todayEvents = (events = []) => {

  const today = new Date()

  return events.filter((ev) => {

    const d = new Date(ev.startsAt)

    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()

  })

}

const formatTime = (value) => {

  const d = new Date(value)

  if (Number.isNaN(d.getTime())) return ''

  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

}
