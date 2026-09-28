import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from '@prisma/client'
const { PrismaClient, ChildStatus, PaymentStatus, ChatSender, RequestStatus, RequestType, AttendanceStatus } = pkg
import { readJson, writeJson } from './lib/jsonStore.js'

//prisma
const prisma = new PrismaClient()

//app
const ADMIN_COOKIE = 'admin_role'
const ADMIN_ROLE = 'admin'
const ADMIN_BASE = (process.env.ADMIN_PATH || process.env.VITE_ADMIN_PATH || '/admin/secure').replace(/\/+$/, '') || '/admin/secure'
const ADMIN_API_BASE = `/api${ADMIN_BASE}`
const VISITOR_SESSION_COOKIE = 'visitor_session'

const app = express()
const PORT = process.env.PORT || 3001
const CREDS_FILE = 'credentials.json'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
  }
  next()
})

const randomPassword = (length = 12) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

const makeSessionId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const safeAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next)

const parseCookies = (req) => {
  const raw = req.headers.cookie || ''
  return raw.split(';').reduce((acc, pair) => {
    const [k, v] = pair.trim().split('=')
    if (k) acc[k] = decodeURIComponent(v || '')
    return acc
  }, {})
}

const ensureVisitorSession = (req, res) => {
  const cookies = parseCookies(req)
  let sessionId = cookies[VISITOR_SESSION_COOKIE]
  if (!sessionId) {
    sessionId = makeSessionId()
    res.cookie(VISITOR_SESSION_COOKIE, sessionId, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    })
  }
  return sessionId
}

const isAdminRequest = (req) => {
  const cookies = parseCookies(req)
  return cookies[ADMIN_COOKIE] === ADMIN_ROLE
}

const requireAdminApi = (req, res, next) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: 'Forbidden' })
  next()
}

//helpers
const defaultCreds = [
  {
    id: 'admin',
    role: 'admin',
    username: 'admin@mladost.com',
    password: 'admin123',
    disabled: false,
  },
  {
    id: 'worker-demo',
    role: 'worker',
    username: 'worker@mladost.com',
    password: 'worker123',
    group: 'Class Kids',
    firstName: 'Demo',
    lastName: 'Worker',
    jmbg: '',
    email: 'worker@mladost.com',
    disabled: false,
  },
]

const loadCreds = async () => {
  const creds = await readJson(CREDS_FILE, [])
  if (!creds.length) {
    await writeJson(CREDS_FILE, defaultCreds)
    return defaultCreds
  }
  const hasAdmin = creds.some((c) => c.role === 'admin')
  if (!hasAdmin) {
    const next = [...creds, defaultCreds[0]]
    await writeJson(CREDS_FILE, next)
    return next
  }
  // ensure disabled flag exists
  const normalized = creds.map((c) => ({
    disabled: false,
    childJmbgs: c.childJmbgs || (c.childJmbg ? [c.childJmbg] : []),
    ...c,
  }))
  if (normalized.some((c, i) => JSON.stringify(c) !== JSON.stringify(creds[i]))) {
    await writeJson(CREDS_FILE, normalized)
  }
  return normalized
}

const saveCreds = async (list) => writeJson(CREDS_FILE, list)
const getCredByUsername = async (username) => {
  if (!username) return null
  const creds = await loadCreds()
  return creds.find((c) => c.username === username)
}

const startOfDayISO = (date = new Date()) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

const ensureTodayAttendance = async (childJmbg) => {
  const today = startOfDay(new Date())
  const existing = await prisma.attendance.findFirst({
    where: { childJmbg, date: today },
  })
  if (existing) return existing
  return prisma.attendance.create({
    data: {
      childJmbg,
      date: today,
      status: AttendanceStatus.ABSENT,
      checkInAt: null,
      checkOutAt: null,
      notes: '',
      dailyNoteToParent: '',
    },
  })
}

const toAttendanceInfo = (attendance) => ({
  status: attendance?.status === AttendanceStatus.PRESENT ? 'Present' : 'Absent',
  timeIn: attendance?.checkInAt ? attendance.checkInAt.toISOString().slice(11, 16) : '',
  timeOut: attendance?.checkOutAt ? attendance.checkOutAt.toISOString().slice(11, 16) : '',
  todayNote: attendance?.dailyNoteToParent || '',
})

// Helpers for child messages
const listChildMessages = async (childJmbg) =>
  prisma.$queryRaw`SELECT "id","childJmbg","senderRole","senderName","content","createdAt" FROM "ChildMessage" WHERE "childJmbg" = ${childJmbg} ORDER BY "createdAt" DESC LIMIT 50`

const createChildMessage = async ({ childJmbg, senderRole, senderName, content }) => {
  const rows =
    await prisma.$queryRaw`INSERT INTO "ChildMessage" ("childJmbg","senderRole","senderName","content") VALUES (${childJmbg}, ${senderRole}, ${senderName}, ${content}) RETURNING "id","childJmbg","senderRole","senderName","content","createdAt"`
  return rows?.[0]
}

const assertChildAccess = async ({ username, role, childJmbg }) => {
  const cred = await getCredByUsername(username)
  if (!cred || cred.role !== role) {
    const err = new Error('Forbidden')
    err.statusCode = 403
    throw err
  }
  const child = await prisma.child.findUnique({ where: { jmbg: childJmbg }, include: { group: true } })
  if (!child) {
    const err = new Error('Child not found')
    err.statusCode = 404
    throw err
  }
  if (role === 'parent') {
    const links = cred.childJmbgs || (cred.childJmbg ? [cred.childJmbg] : [])
    if (!links.includes(childJmbg)) {
      const err = new Error('Forbidden')
      err.statusCode = 403
      throw err
    }
  }
  if (role === 'worker') {
    const assignedGroup = cred.group || ''
    if (assignedGroup && child.group?.name && assignedGroup !== child.group.name) {
      const err = new Error('Forbidden')
      err.statusCode = 403
      throw err
    }
  }
  return { cred, child }
}

const ensureGroupByName = async (name) => {
  if (!name) return null
  return prisma.group.upsert({
    where: { name },
    update: {},
    create: { name },
  })
}

const normalizeName = (str = '') => {
  const trimmed = (str || '').trim()
  if (!trimmed) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

const makeParentEmail = (fullName = '') => {
  const cleaned = fullName
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, '.')
  const base = cleaned || 'parent'
  return `${base}@parent.mladost.com`
}

const autoGroupForDob = (dob) => {
  const today = new Date()
  const ageYears = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0)
  if (ageYears < 1) return 'Babies'
  if (ageYears < 6) return 'Kids 1-5'
  return 'Preschoolers'
}

const startOfDay = (date = new Date()) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const mapActivityEvent = (event) => ({
  id: event.id,
  title: event.title,
  notes: event.notes || '',
  description: event.description || '',
  startsAt: event.startsAt.toISOString(),
  endsAt: event.endsAt ? event.endsAt.toISOString() : null,
  type: event.type || 'event',
  createdByRole: event.createdByRole || '',
  createdById: event.createdById || '',
  parentVisible: event.parentVisible,
})

const HOLIDAY_COUNTRY = 'BA'

const MANUAL_EID_HOLIDAYS = {
  2024: [
    { date: '2024-04-10', name: 'Eid al-Fitr' },
    { date: '2024-06-16', name: 'Eid al-Adha' },
  ],
  2025: [
    { date: '2025-03-31', name: 'Eid al-Fitr' },
    { date: '2025-06-07', name: 'Eid al-Adha' },
  ],
  2026: [
    { date: '2026-03-20', name: 'Eid al-Fitr' },
    { date: '2026-05-27', name: 'Eid al-Adha' },
  ],
  2027: [
    { date: '2027-03-10', name: 'Eid al-Fitr' },
    { date: '2027-05-17', name: 'Eid al-Adha' },
  ],
}

const syncHolidays = async (year) => {
  const existing = await prisma.holiday.findMany({ where: { countryCode: HOLIDAY_COUNTRY, year } })
  const existingKeys = new Set(existing.map((h) => `${h.date.toISOString().slice(0, 10)}|${h.name}`))

  const rows = []

  if (!existing.length) {
    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${HOLIDAY_COUNTRY}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Holiday fetch failed ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data)) {
      rows.push(
        ...data.map((h) => ({
          countryCode: HOLIDAY_COUNTRY,
          year,
          date: new Date(h.date),
          localName: h.localName || h.name || '',
          name: h.name || '',
          types: h.types || [],
          rawJson: h,
        }))
      )
    }
  }

  const manual = MANUAL_EID_HOLIDAYS[year] || []
  manual.forEach((m) => {
    const key = `${m.date}|${m.name}`
    if (!existingKeys.has(key)) {
      rows.push({
        countryCode: HOLIDAY_COUNTRY,
        year,
        date: new Date(m.date),
        localName: m.name,
        name: m.name,
        types: ['religious'],
        rawJson: { source: 'manual', name: m.name, date: m.date },
      })
    }
  })

  if (rows.length) {
    await prisma.holiday.createMany({
      data: rows,
      skipDuplicates: true,
    })
  }
}

const ensureParentCredential = async (parent, childJmbg) => {
  const creds = await loadCreds()
  const existing = creds.find((c) => c.username === parent.email)
  const links = Array.from(new Set([...(existing?.childJmbgs || []), childJmbg].filter(Boolean)))
  const base = {
    id: existing?.id || Date.now().toString(),
    role: 'parent',
    username: parent.email,
    email: parent.email,
    password: existing?.password || randomPassword(),
    disabled: false,
  }
  const merged = { ...existing, ...base, childJmbgs: links, childJmbg: links[0] || '' }
  const next = existing ? creds.map((c) => (c.id === existing.id ? merged : c)) : [...creds, merged]
  await saveCreds(next)
  return merged
}

const currentWeekStart = (date = new Date()) => {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - (day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

const toUIChild = (child, attendance) => ({
  jmbg: child.jmbg,
  firstName: child.firstName,
  lastName: child.lastName,
  name: `${child.firstName} ${child.lastName}`,
  parentName: child.parents?.[0]?.parent?.fullName || '',
  group: child.group?.name || '',
  dob: child.birthDate.toISOString().slice(0, 10),
  entryDate: child.startDate.toISOString().slice(0, 10),
  allergies: child.health?.allergies || '',
  parentNotes: child.health?.notes || '',
  ...toAttendanceInfo(attendance),
})

const toAdminChild = (child) => ({
  ...toUIChild(child),
  parents: child.parents?.map((p) => ({
    id: p.parentId,
    name: p.parent.fullName,
    relation: p.relation,
    primary: p.isPrimary,
  })) || [],
  parentIds: child.parents?.map((p) => p.parentId) || [],
})

const toAdminParent = (parent, credsByEmail = {}) => {
  const cred = credsByEmail[parent.email]
  return {
    id: parent.id,
    fullName: parent.fullName,
    phone: parent.phone,
    email: parent.email,
    authPassword: cred?.password || '',
    address: parent.address || '',
    emergencyName: parent.emergencyName || '',
    emergencyPhone: parent.emergencyPhone || '',
    emergencyRelation: parent.emergencyRelation || '',
    children: parent.children?.map((cp) => ({
      jmbg: cp.childJmbg,
      name: `${cp.child.firstName} ${cp.child.lastName}`,
      group: cp.child.group?.name || '',
    })) || [],
  }
}

const createChildWithParents = async (payload) => {
  const parentInfo = payload.parentInfo || {}
  if (!parentInfo.fullName || !parentInfo.phone) {
    const err = new Error('Parent name and phone are required')
    err.statusCode = 400
    throw err
  }
  const parentEmail = parentInfo.email || makeParentEmail(parentInfo.fullName)
  if (!payload.jmbg || !payload.firstName || !payload.lastName || !payload.dob) {
    const err = new Error('Child JMBG, name, and birth date are required')
    err.statusCode = 400
    throw err
  }
  if (!/^\d{13}$/.test(String(payload.jmbg || ''))) {
    const err = new Error('JMBG must be 13 digits')
    err.statusCode = 400
    throw err
  }

  const dob = new Date(payload.dob)
  const today = new Date()
  const entryDate = payload.entryDate ? new Date(payload.entryDate) : today

  if (Number.isNaN(dob.getTime()) || dob > today) {
    const err = new Error('Birth date must be in the past')
    err.statusCode = 400
    throw err
  }

  if (Number.isNaN(entryDate.getTime()) || entryDate > today) {
    const err = new Error('Enrollment date cannot be in the future')
    err.statusCode = 400
    throw err
  }

  const existingChild = await prisma.child.findUnique({ where: { jmbg: payload.jmbg } })
  if (existingChild) {
    const err = new Error('A child with this JMBG already exists')
    err.statusCode = 400
    throw err
  }

  const result = await prisma.$transaction(async (tx) => {
    const assignedGroupName = payload.group || autoGroupForDob(dob)
    const group = await tx.group.upsert({ where: { name: assignedGroupName }, update: {}, create: { name: assignedGroupName } })
    let parentIdList = []

    const existingParent = await tx.parent.findUnique({ where: { email: parentEmail } })
    const parentRecord =
      existingParent ||
      await tx.parent.create({
        data: {
          fullName: normalizeName(parentInfo.fullName),
          email: parentEmail,
          phone: parentInfo.phone,
          address: parentInfo.address || '',
        },
      })
    parentIdList.push(parentRecord.id)
    await ensureParentCredential(parentRecord, payload.jmbg)

    const createdChild = await tx.child.create({
      data: {
        jmbg: payload.jmbg,
        firstName: normalizeName(payload.firstName),
        lastName: normalizeName(payload.lastName),
        birthDate: dob,
        startDate: entryDate,
        status: ChildStatus.ACTIVE,
        groupId: group?.id ?? null,
        health: {
          create: {
            allergies: payload.allergies || '',
            notes: payload.parentNotes || '',
          },
        },
        parents: {
          create: parentIdList.map((pid, idx) => ({
            parentId: pid,
            relation: 'Parent',
            isPrimary: idx === 0,
          })),
        },
      },
      include: { group: true, health: true, parents: { include: { parent: true } } },
    })

    return toAdminChild(createdChild)
  })

  return result
}

const linkParentsToChild = async (childJmbg, parentIds = []) => {
  const existing = await prisma.childParent.findMany({ where: { childJmbg } })
  const existingIds = existing.map((p) => p.parentId)
  const toRemove = existingIds.filter((id) => !parentIds.includes(id))
  const toAdd = parentIds.filter((id) => !existingIds.includes(id))

  if (toRemove.length) {
    await prisma.childParent.deleteMany({ where: { childJmbg, parentId: { in: toRemove } } })
  }
  if (toAdd.length) {
    await prisma.childParent.createMany({
      data: toAdd.map((id, idx) => ({
        childJmbg,
        parentId: id,
        relation: 'Parent',
        isPrimary: idx === 0,
      })),
      skipDuplicates: true,
    })
  }
}

//children

app.get('/api/children', safeAsync(async (_req, res) => {
  const role = (_req.query.role || '').toString()
  const group = (_req.query.group || '').toString()
  const childJmbg = (_req.query.childJmbg || '').toString()
  const children = await prisma.child.findMany({
    where: childJmbg ? { jmbg: childJmbg } : {},
    orderBy: { firstName: 'asc' },
    include: {
      group: true,
      health: true,
      parents: { include: { parent: true } },
    },
  })
  const filtered =
    role === 'worker' && group
      ? children.filter((c) => (c.group?.name || '').toLowerCase() === group.toLowerCase())
      : children
  const withAttendance = await Promise.all(
    filtered.map(async (child) => {
      const att = await ensureTodayAttendance(child.jmbg)
      return toUIChild(child, att)
    })
  )
  res.json(withAttendance)
}))

app.get('/api/parent/children', safeAsync(async (req, res) => {
  const username = (req.query.username || '').toString()
  if (!username) return res.status(400).json({ error: 'username required' })
  const cred = await getCredByUsername(username)
  if (!cred || cred.role !== 'parent') return res.status(403).json({ error: 'Forbidden' })
  const links = cred.childJmbgs || (cred.childJmbg ? [cred.childJmbg] : [])
  if (!links.length) return res.json([])
  const children = await prisma.child.findMany({
    where: { jmbg: { in: links } },
    orderBy: { firstName: 'asc' },
    include: {
      group: true,
      health: true,
      parents: { include: { parent: true } },
    },
  })
  const withAttendance = await Promise.all(
    children.map(async (child) => {
      const att = await ensureTodayAttendance(child.jmbg)
      return toUIChild(child, att)
    })
  )
  res.json(withAttendance)
}))

app.get('/api/children/:jmbg', safeAsync(async (req, res) => {
  const { jmbg } = req.params
  const role = (req.query.role || '').toString()
  const username = (req.query.username || '').toString()
  if (role && username) {
    await assertChildAccess({ username, role, childJmbg: jmbg })
  }
  const child = await prisma.child.findUnique({
    where: { jmbg },
    include: { group: true, health: true, parents: { include: { parent: true } } },
  })
  if (!child) return res.status(404).json({ error: 'Not found' })
  const att = await ensureTodayAttendance(jmbg)
  res.json(toUIChild(child, att))
}))

app.post('/api/children', safeAsync(async (req, res) => {
  const c = req.body
  try {
    const created = await createChildWithParents({
      ...c,
      parentInfo: c.parentInfo || {
        fullName: c.parentName,
        email: c.parentEmail,
        phone: c.parentPhone,
      },
    })
    res.status(201).json(created)
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'JMBG already exists' })
    }
    const status = err.statusCode || 500
    res.status(status).json({ error: err.message || 'Create failed' })
  }
}))

app.patch('/api/children/:jmbg', safeAsync(async (req, res) => {
  const { jmbg } = req.params
  const updates = req.body

  const existing = await prisma.child.findUnique({
    where: { jmbg },
    include: { health: true, group: true },
  })

  if (!existing) return res.status(404).json({ error: 'Not found' })

  // Attendance updates (worker/parent)
  if (updates.status || updates.timeIn || updates.timeOut || updates.todayNote) {
    const att = await ensureTodayAttendance(jmbg)
    const data = {
      status:
        updates.status === 'Present'
          ? AttendanceStatus.PRESENT
          : updates.status === 'Absent'
            ? AttendanceStatus.ABSENT
            : att.status,
      checkInAt: updates.timeIn ? new Date(`${startOfDayISO()}T${updates.timeIn}:00`) : att.checkInAt,
      checkOutAt: updates.timeOut ? new Date(`${startOfDayISO()}T${updates.timeOut}:00`) : att.checkOutAt,
      dailyNoteToParent: updates.todayNote ?? att.dailyNoteToParent,
    }
    await prisma.attendance.update({ where: { id: att.id }, data })
    const fresh = await prisma.child.findUnique({
      where: { jmbg },
      include: { group: true, health: true, parents: { include: { parent: true } } },
    })
    const refreshedAtt = await ensureTodayAttendance(jmbg)
    return res.json(toUIChild(fresh, refreshedAtt))
  }

  // Admin-level child data updates
  if (updates.jmbg && !/^\d{13}$/.test(String(updates.jmbg))) {
    return res.status(400).json({ error: 'JMBG must be 13 digits' })
  }

  if (updates.dob) {
    const dob = new Date(updates.dob)
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      return res.status(400).json({ error: 'Birth date must be in the past' })
    }
  }

  if (updates.entryDate) {
    const entry = new Date(updates.entryDate)
    if (Number.isNaN(entry.getTime()) || entry > new Date()) {
      return res.status(400).json({ error: 'Enrollment date cannot be in the future' })
    }
  }

  const nextDob = updates.dob ? new Date(updates.dob) : existing.birthDate
  const autoGroup = autoGroupForDob(nextDob)
  const groupName = updates.group || autoGroup
  const group = await ensureGroupByName(groupName)

  const updated = await prisma.child.update({
    where: { jmbg },
    data: {
      firstName: updates.firstName ?? existing.firstName,
      lastName: updates.lastName ?? existing.lastName,
      birthDate: updates.dob ? new Date(updates.dob) : existing.birthDate,
      startDate: updates.entryDate ? new Date(updates.entryDate) : existing.startDate,
      status: updates.status === 'Inactive' ? ChildStatus.INACTIVE : ChildStatus.ACTIVE,
      groupId: group?.id ?? existing.groupId,
      health: {
        upsert: {
          update: {
            allergies: updates.allergies ?? existing.health?.allergies ?? '',
            notes: updates.parentNotes ?? existing.health?.notes ?? '',
          },
          create: {
            allergies: updates.allergies || '',
            notes: updates.parentNotes || '',
          },
        },
      },
    },
    include: {
      group: true,
      health: true,
      parents: { include: { parent: true } },
    },
  })

  const att = await ensureTodayAttendance(jmbg)
  res.json(toUIChild(updated, att))
}))

app.delete('/api/children/:jmbg', safeAsync(async (req, res) => {
  const { jmbg } = req.params

  const child = await prisma.child.findUnique({
    where: { jmbg },
    include: { parents: true },
  })
  if (!child) return res.status(404).json({ error: 'Not found' })

  const parentIds = child.parents.map((p) => p.parentId)

  await prisma.child.delete({ where: { jmbg } })

  // Clean up parents (and their credentials) that no longer have children
  let creds = await loadCreds()

  for (const parentId of parentIds) {
    const remainingLinks = await prisma.childParent.count({ where: { parentId } })
    if (remainingLinks === 0) {
      await prisma.parentAuth.deleteMany({ where: { parentId } })
      await prisma.parent.delete({ where: { id: parentId } })
      // Drop parent credential entries tied to this child/parent
      creds = creds.filter((c) => !(c.role === 'parent' && (c.childJmbgs || []).includes(jmbg)))
    } else {
      // Remove this child from any parent credential link
      creds = creds.map((c) => {
        if (c.role !== 'parent') return c
        const nextLinks = (c.childJmbgs || []).filter((id) => id !== jmbg)
        return {
          ...c,
          childJmbgs: nextLinks,
          childJmbg: nextLinks[0] || '',
        }
      })
    }
  }

  await saveCreds(creds)

  res.json({ ok: true })
}))

//static admin-only interface

app.get('/api/credentials', safeAsync(async (_req, res) => {
  const creds = await loadCreds()
  res.json(creds)
}))

app.patch('/api/credentials/:id', safeAsync(async (req, res) => {
  const { id } = req.params
  const updates = req.body
  const creds = await loadCreds()
  const idx = creds.findIndex((c) => c.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  if (updates.username && creds.some((c, i) => i !== idx && c.username === updates.username)) {
    return res.status(400).json({ error: 'Username already exists' })
  }
  const incomingChildLinks =
    updates.childJmbgs ||
    (updates.childJmbg ? [updates.childJmbg] : creds[idx].childJmbgs || [])
  const next = creds.map((c, i) =>
    i === idx
      ? {
          ...c,
          ...updates,
          email: updates.email || updates.username || c.email || c.username || '',
          childJmbgs: incomingChildLinks,
          childJmbg: incomingChildLinks[0] || updates.childJmbg || c.childJmbg || '',
          disabled: typeof updates.disabled === 'boolean' ? updates.disabled : c.disabled || false,
        }
      : c
  )
  await saveCreds(next)
  res.json(next[idx])
}))

app.post('/api/credentials', safeAsync(async (req, res) => {
  const incoming = req.body
  const creds = await loadCreds()
  if (creds.some((c) => c.username === incoming.username)) {
    return res.status(400).json({ error: 'Username already exists' })
  }
  const incomingChildLinks = incoming.childJmbgs || (incoming.childJmbg ? [incoming.childJmbg] : [])
  const withId = {
    id: Date.now().toString(),
    role: incoming.role || 'worker',
    username: incoming.username,
    password: incoming.password,
    childJmbg: incomingChildLinks[0] || '',
    childJmbgs: incomingChildLinks,
    group: incoming.group || '',
    firstName: incoming.firstName || '',
    lastName: incoming.lastName || '',
    jmbg: incoming.jmbg || '',
    email: incoming.email || incoming.username || '',
    disabled: incoming.disabled ?? false,
  }
  const next = [...creds, withId]
  await saveCreds(next)
  res.status(201).json(withId)
}))

app.delete('/api/credentials/:id', safeAsync(async (req, res) => {
  const creds = await loadCreds()
  const next = creds.filter((c) => c.id !== req.params.id)
  if (next.length === creds.length) return res.status(404).json({ error: 'Not found' })
  await saveCreds(next)
  res.json({ ok: true })
}))

//weekly menu

app.get('/api/menu', safeAsync(async (_req, res) => {
  const group = (_req.query.group || '').toString()
  const currentWeek = currentWeekStart()
  let latest = await prisma.weeklyMenu.findUnique({ where: { weekStart: currentWeek } })
  if (!latest) latest = await prisma.weeklyMenu.create({ data: { weekStart: currentWeek, content: {} } })
  const content = latest?.content || {}
  res.json(group ? content[group] || {} : content)
}))

app.patch('/api/menu', safeAsync(async (req, res) => {
  const weekStart = currentWeekStart()
  const { group = '', day, data = {} } = req.body || {}
  const actorRole = isAdminRequest(req) ? 'admin' : req.headers['x-user-role'] === 'worker' ? 'worker' : 'parent'
  if (actorRole === 'parent') return res.status(403).json({ error: 'Forbidden' })
  if (!group) return res.status(400).json({ error: 'Group required' })
  const existing = await prisma.weeklyMenu.findUnique({ where: { weekStart } })
  const currentContent = existing?.content || {}
  const groupContent = currentContent[group] || {}
  const nextDay = day ? { ...groupContent[day], ...data } : groupContent
  const nextGroup = day ? { ...groupContent, [day]: nextDay } : groupContent
  const nextContent = { ...currentContent, [group]: nextGroup }
  const saved = await prisma.weeklyMenu.upsert({
    where: { weekStart },
    update: { content: nextContent },
    create: { weekStart, content: nextContent },
  })

  res.json(saved.content[group] || {})
}))

//weekly activities

app.get('/api/activities', safeAsync(async (_req, res) => {
  const group = (_req.query.group || '').toString()
  const currentWeek = currentWeekStart()
  let latest = await prisma.weeklyActivityPlan.findUnique({ where: { weekStart: currentWeek } })
  if (!latest) {
    latest = await prisma.weeklyActivityPlan.create({ data: { weekStart: currentWeek, content: {} } })
  }
  const content = latest?.content || {}
  res.json(group ? content[group] || {} : content)
}))

app.patch('/api/activities', safeAsync(async (req, res) => {
  const weekStart = currentWeekStart()
  const { group = '', days = {} } = req.body || {}
  const actorRole = isAdminRequest(req) ? 'admin' : req.headers['x-user-role'] === 'worker' ? 'worker' : 'parent'
  if (actorRole === 'parent') return res.status(403).json({ error: 'Forbidden' })
  if (!group) return res.status(400).json({ error: 'Group required' })

  const existing = await prisma.weeklyActivityPlan.findUnique({ where: { weekStart } })
  const currentContent = existing?.content || {}
  const updatedGroup = { ...(currentContent[group] || {}), ...days }
  const nextContent = { ...currentContent, [group]: updatedGroup }

  const saved = await prisma.weeklyActivityPlan.upsert({
    where: { weekStart },
    update: { content: nextContent },
    create: { weekStart, content: nextContent },
  })

  res.json(saved.content[group] || {})
}))

//calendar events that are shared

app.get('/api/calendar', safeAsync(async (req, res) => {
  const role = ((req.query.role || '').toString().toLowerCase()) || (isAdminRequest(req) ? 'admin' : '')
  const group = (req.query.group || '').toString()
  const childJmbg = (req.query.childJmbg || '').toString()
  const year = Number(req.query.year) || new Date().getFullYear()

  const [events, children, holidays] = await Promise.all([
    prisma.activity.findMany({
      where: { OR: [{ type: null }, { type: { in: ['event', 'admin-event', 'worker-event', 'concert', 'recital'] } }] },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.child.findMany({ select: { jmbg: true, firstName: true, lastName: true, birthDate: true, group: true } }),
    prisma.holiday.findMany({
      where: { countryCode: HOLIDAY_COUNTRY, year },
      orderBy: { date: 'asc' },
    }),
  ])

  const childrenByJmbg = children.reduce((acc, c) => {
    acc[c.jmbg] = c
    return acc
  }, {})

  const normalize = (val = '') => (typeof val === 'string' ? val.toLowerCase() : '')
  const isConcertLike = (ev) => {
    const t = normalize(ev.type || '')
    const title = normalize(ev.title || '')
    return t.includes('concert') || t.includes('recital') || title.includes('concert') || title.includes('recital')
  }

  const filteredEvents = events
    .map(mapActivityEvent)
    .filter((ev) => {
      if (role === 'admin' || !role) return true
      if (role === 'worker') {
        // Workers can see both admin and worker events
        return ev.createdByRole === 'worker' || ev.createdByRole === 'admin'
      }
      if (role === 'parent') {
        return ev.createdByRole === 'worker'
      }
      return true
    })

  const birthdays = children.map((c) => ({
    id: `bday-${c.jmbg}`,
    childJmbg: c.jmbg,
    title: `Birthday: ${c.firstName} ${c.lastName}`,
    date: c.birthDate.toISOString(),
    type: 'birthday',
  }))

  const filteredBirthdays = birthdays.filter((b) => {
    if (role === 'admin' || !role) return true
    if (role === 'worker') {
      const kid = childrenByJmbg[b.childJmbg]
      return !group || normalize(kid?.group || '') === normalize(group)
    }
    if (role === 'parent') {
      return childJmbg && b.childJmbg === childJmbg
    }
    return true
  })

  const holidayFormatted =
    role === 'admin' || role === 'worker'
      ? holidays.map((h, idx) => ({
          id: h.id || `holiday-${idx}-${h.date}`,
          title: h.localName || h.name || 'Holiday',
          startsAt: h.date.toISOString(),
          isHoliday: true,
          types: Array.isArray(h.types) ? h.types : [],
        }))
      : []

  res.json({ events: filteredEvents, birthdays: filteredBirthdays, holidays: holidayFormatted })
}))

app.post('/api/calendar', safeAsync(async (req, res) => {
  const actorRole = isAdminRequest(req) ? 'admin' : req.headers['x-user-role'] === 'worker' ? 'worker' : 'parent'
  if (actorRole === 'parent') return res.status(403).json({ error: 'Forbidden' })

  const { title, startsAt, endsAt, notes, description = '', parentVisible = true, createdById = '' } = req.body
  if (!title || !startsAt) return res.status(400).json({ error: 'Title and start time are required' })
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid start date' })

  const created = await prisma.activity.create({
    data: {
      title,
      startsAt: start,
      endsAt: endsAt ? new Date(endsAt) : null,
      notes: notes || '',
      description,
      parentVisible,
      createdByRole: actorRole,
      createdById,
      type: actorRole === 'admin' ? 'admin-event' : 'worker-event',
    },
  })

  res.status(201).json(mapActivityEvent(created))
}))

//parent worker messages about the child or multiple

app.get('/api/child-messages/:childJmbg', safeAsync(async (req, res) => {
  const { childJmbg } = req.params
  const role = (req.query.role || '').toString()
  const username = (req.query.username || '').toString()
  await assertChildAccess({ username, role, childJmbg })

  const messages = await listChildMessages(childJmbg)
  res.json(messages)
}))

app.post('/api/child-messages', safeAsync(async (req, res) => {
  const { childJmbg, content, senderRole, senderName = '', username = '' } = req.body || {}
  if (!childJmbg || !content || !senderRole || !username) return res.status(400).json({ error: 'Missing fields' })

  await assertChildAccess({ username, role: senderRole, childJmbg })

  const saved = await createChildMessage({
    childJmbg,
    senderRole,
    senderName: senderName || username,
    content: String(content).trim().slice(0, 1000),
  })
  res.status(201).json(saved)
}))

app.delete('/api/calendar/:id', safeAsync(async (req, res) => {
  const actorRole = isAdminRequest(req) ? 'admin' : req.headers['x-user-role'] === 'worker' ? 'worker' : 'parent'
  const id = Number(req.params.id)
  const existing = await prisma.activity.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Not found' })

  if (actorRole !== 'admin' && existing.createdByRole !== 'worker') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  await prisma.activity.delete({ where: { id } })
  res.json({ ok: true })
}))

//holidaays

app.get('/api/holidays', safeAsync(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear()
  try {
    await syncHolidays(year)
  } catch (err) {
    console.error('Holiday sync failed', err)
  }
  const holidays = await prisma.holiday.findMany({
    where: { countryCode: HOLIDAY_COUNTRY, year },
    orderBy: { date: 'asc' },
  })
const formatted = holidays.map((h) => ({
    date: h.date.toISOString().slice(0, 10),
    title: h.localName || h.name,
    localName: h.localName || '',
    name: h.name || '',
    types: Array.isArray(h.types) ? h.types : [],
    allDay: true,
    editable: false,
    source: 'nager',
    isHoliday: true,
  }))
  res.json(formatted)
}))

//paymnets

const mapPaymentStatus = (status) => {
  if (status === PaymentStatus.PAID) return 'PAID'
  if (status === PaymentStatus.LATE) return 'OVERDUE'
  return 'UNPAID'
}

const normalizeIncomingPaymentStatus = (status) => {
  if (!status) return null
  const up = String(status).toUpperCase()
  if (up === 'PAID') return PaymentStatus.PAID
  if (up === 'OVERDUE' || up === 'LATE') return PaymentStatus.LATE
  return PaymentStatus.PENDING
}

const parseMonthRange = (monthString = '') => {
  const safe = String(monthString)
  const [yStr, mStr] = safe.split('-')
  const year = Number(yStr)
  const monthIdx = Number(mStr) - 1
  if (!year || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return null
  const start = new Date(Date.UTC(year, monthIdx, 1))
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 1)
  return { start, end }
}

const ensurePaymentStatusUpToDate = async (payment) => {
  if (!payment) return payment
  if (payment.status === PaymentStatus.PAID) return payment
  const today = startOfDay()
  if (payment.dueDate && payment.dueDate < today) {
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.LATE },
    })
    return updated
  }
  return payment
}

app.get('/api/payments', safeAsync(async (req, res) => {
  const role = (req.query.role || '').toString()
  const childJmbg = (req.query.childJmbg || '').toString()
  const username = (req.query.username || '').toString()

  if (role === 'parent') {
    if (!username || !childJmbg) return res.status(400).json({ error: 'username and childJmbg required' })
    const cred = await getCredByUsername(username)
    if (!cred || cred.role !== 'parent') return res.status(403).json({ error: 'Forbidden' })
    const links = cred.childJmbgs || (cred.childJmbg ? [cred.childJmbg] : [])
    if (!links.includes(childJmbg)) return res.status(403).json({ error: 'Forbidden' })
  } else if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const payments = await prisma.payment.findMany({
    where: childJmbg ? { childJmbg } : {},
    include: { child: true },
    orderBy: { dueDate: 'desc' },
  })

  const refreshed = await Promise.all(payments.map(ensurePaymentStatusUpToDate))

  res.json(
    refreshed.map((p) => ({
      id: p.id,
      childJmbg: p.childJmbg,
      month: p.periodStart.toISOString().slice(0, 7),
    amount: p.amount,
    status: mapPaymentStatus(p.status),
    paidAt: p.paidAt,
    dueDate: p.dueDate,
  }))
 )
}))

app.post('/api/payments', safeAsync(async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: 'Forbidden' })
  const { childJmbg, month, amount, dueDate } = req.body || {}
  if (!childJmbg || !month || amount === undefined || amount === null) {
    return res.status(400).json({ error: 'childJmbg, month, and amount are required' })
  }
  const range = parseMonthRange(month)
  if (!range) return res.status(400).json({ error: 'Invalid month format, expected YYYY-MM' })
  const due = dueDate ? new Date(dueDate) : range.end
  const payload = {
    childJmbg: String(childJmbg),
    periodStart: range.start,
    periodEnd: range.end,
    amount: Number(amount),
    dueDate: due,
    status: PaymentStatus.PENDING,
    paidAt: null,
  }

  const created = await prisma.payment.upsert({
    where: { childJmbg_periodStart_periodEnd: { childJmbg: payload.childJmbg, periodStart: payload.periodStart, periodEnd: payload.periodEnd } },
    update: { amount: payload.amount, dueDate: payload.dueDate },
    create: payload,
  })

  res.status(201).json({
    id: created.id,
    childJmbg: created.childJmbg,
    month: created.periodStart.toISOString().slice(0, 7),
    amount: created.amount,
    status: mapPaymentStatus(created.status),
    paidAt: created.paidAt,
    dueDate: created.dueDate,
  })
}))

app.patch('/api/payments/:id', safeAsync(async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: 'Forbidden' })
  const id = Number(req.params.id)
  const { status } = req.body || {}
  if (!status) return res.status(400).json({ error: 'Status required' })
  const newStatus = normalizeIncomingPaymentStatus(status)
  const existing = await prisma.payment.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const paidAt = newStatus === PaymentStatus.PAID ? new Date() : null
  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: newStatus,
      paidAt,
    },
  })
  res.json({
    id: updated.id,
    childJmbg: updated.childJmbg,
    month: updated.periodStart.toISOString().slice(0, 7),
    amount: updated.amount,
    status: mapPaymentStatus(updated.status),
    paidAt: updated.paidAt,
    dueDate: updated.dueDate,
  })
}))

//attendance

app.get('/api/attendance', safeAsync(async (req, res) => {
  const { date, group } = req.query
  const targetDate = date ? new Date(date) : startOfDay()
  const nextDay = new Date(targetDate)
  nextDay.setDate(nextDay.getDate() + 1)
  const records = await prisma.attendance.findMany({
    where: { date: { gte: targetDate, lt: nextDay } },
    include: { child: true },
  })
  const byGroup = group
    ? records.filter((r) => r.child.group?.name?.toLowerCase() === group.toLowerCase())
    : records
  res.json(byGroup.map((r) => ({
    id: r.id,
    childJmbg: r.childJmbg,
    date: r.date.toISOString(),
    status: r.status,
    absenceReason: r.absenceReason || '',
    dailyNoteToParent: r.dailyNoteToParent || '',
    markedByWorkerId: r.markedByWorkerId || '',
  })))
}))

app.post('/api/attendance', safeAsync(async (req, res) => {
  const { childJmbg, status, date, absenceReason = '', dailyNoteToParent = '', markedByWorkerId = '' } = req.body
  if (!childJmbg || !status) return res.status(400).json({ error: 'Child and status required' })
  const targetDate = date ? new Date(date) : startOfDay()
  const saved = await prisma.attendance.upsert({
    where: { childJmbg_date: { childJmbg, date: targetDate } },
    update: { status, absenceReason, dailyNoteToParent, markedByWorkerId },
    create: { childJmbg, status, date: targetDate, absenceReason, dailyNoteToParent, markedByWorkerId },
  })
  res.status(201).json(saved)
}))

const formatAdminNote = (note, workerId = '') => {
  let body = note.message || ''
  let childJmbg = ''
  let fromAdminId = ''
  try {
    const parsed = JSON.parse(note.message)
    if (parsed && typeof parsed === 'object') {
      body = parsed.body || parsed.message || body
      childJmbg = parsed.childJmbg || ''
      fromAdminId = parsed.fromAdminId || ''
    }
  } catch (err) {
    // keep plain text
  }
  const isRead = workerId ? note.reads.some((r) => r.workerId === workerId) : false
  const readAt = workerId ? (note.reads.find((r) => r.workerId === workerId)?.readAt || null) : null
  return {
    id: note.id,
    title: note.title,
    body,
    message: body,
    priority: note.priority || '',
    createdAt: note.createdAt,
    targetType: note.targetType,
    targetId: note.targetId || '',
    childJmbg,
    fromAdminId,
    isRead,
    readAt,
  }
}

app.get('/api/notes/admin', safeAsync(async (req, res) => {
  const workerId = req.query.workerId || ''
  const group = req.query.group || ''
  const asAdmin = isAdminRequest(req) || req.query.admin === '1'
  const notes = await prisma.adminNote.findMany({
    orderBy: { createdAt: 'desc' },
    include: { reads: true },
  })
  const filtered = asAdmin
    ? notes
    : notes.filter((n) => {
        if (n.targetType === 'all') return true
        if (n.targetType === 'worker' && workerId) return n.targetId === workerId
        if (n.targetType === 'group' && group) return (n.targetId || '').toLowerCase() === group.toLowerCase()
        return false
      })
  const formatted = filtered.map((n) => formatAdminNote(n, workerId))
  res.json(formatted)
}))

app.post('/api/notes/admin/read', safeAsync(async (req, res) => {
  const { noteId, workerId } = req.body
  if (!noteId || !workerId) return res.status(400).json({ error: 'noteId and workerId required' })
  await prisma.adminNoteRead.upsert({
    where: { noteId_workerId: { noteId, workerId } },
    update: { readAt: new Date() },
    create: { noteId, workerId },
  })
  res.json({ ok: true })
}))

app.post('/api/notes/admin', safeAsync(async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: 'Forbidden' })
  const { title, body, workerId = '', childJmbg = '', priority = '' } = req.body || {}
  if (!title || !workerId || !body) return res.status(400).json({ error: 'Title, worker, and body are required' })
  const payload = {
    title: String(title).trim(),
    message: JSON.stringify({ body: String(body).trim(), childJmbg, fromAdminId: 'admin' }),
    priority: priority || '',
    targetType: 'worker',
    targetId: workerId,
  }
  const saved = await prisma.adminNote.create({ data: payload, include: { reads: true } })
  res.status(201).json(formatAdminNote(saved, workerId))
}))

//visitor chat

const AI_FAQ = [
  {
    questionPatterns: ['hours', 'opening', 'open', 'time', '7:30', '5:30', 'work hours'],
    answerText: 'We are open Monday to Friday from 7:30 AM to 5:30 PM.',
  },
  {
    questionPatterns: ['program', 'age', 'group', '3-4', '5-6', 'toddlers', 'preschool'],
    answerText: 'We offer programs for ages 1–6 with small groups and play-based learning for toddlers, little learners, and preschoolers.',
  },
  {
    questionPatterns: ['meal', 'food', 'allerg', 'lunch', 'snack'],
    answerText: 'Meals and snacks are included each day. Please share any allergies so we can plan safely.',
  },
  {
    questionPatterns: ['fee', 'price', 'tuition', 'cost', 'payment'],
    answerText: 'We provide a simple monthly fee by program and offer sibling discounts. A team member will share details for your child.',
  },
  {
    questionPatterns: ['tour', 'visit', 'see the school', 'schedule a visit', 'book a tour'],
    answerText: 'You can request a tour—morning or early afternoon usually works best. We will confirm a time with you.',
  },
  {
    questionPatterns: ['schedule', 'daily', 'routine', 'day look', 'activities'],
    answerText: 'Days follow a calm routine with circle time, projects, outdoor play twice daily, meals, and rest time.',
  },
]

const findAiAnswer = (text = '') => {
  const lower = text.toLowerCase()
  let best = null
  let bestScore = 0
  AI_FAQ.forEach((entry) => {
    const score = entry.questionPatterns.reduce((acc, pat) => (lower.includes(pat.toLowerCase()) ? acc + 1 : acc), 0)
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  })
  return bestScore > 0 ? best : null
}

const mapChatMessage = (m) => ({
  id: m.id,
  sender: m.sender,
  content: m.content,
  createdAt: m.createdAt,
})

app.get('/api/chat/messages', safeAsync(async (req, res) => {
  const sessionId = ensureVisitorSession(req, res)
  const conversation = await prisma.visitorConversation.findUnique({
    where: { sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!conversation) {
    return res.json({ conversationId: null, messages: [] })
  }

  await prisma.visitorMessage.updateMany({
    where: { conversationId: conversation.id, sender: ChatSender.ADMIN, isVisitorRead: false },
    data: { isVisitorRead: true },
  })

  const refreshed = await prisma.visitorMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
  })

  res.json({ conversationId: conversation.id, messages: refreshed.map(mapChatMessage) })
}))

app.post('/api/chat/messages', safeAsync(async (req, res) => {
  const { content } = req.body || {}
  if (!content || !String(content).trim()) return res.status(400).json({ error: 'Message is required' })
  const sessionId = ensureVisitorSession(req, res)
  const text = String(content).trim().slice(0, 1000)
  const now = new Date()
  const conversation = await prisma.visitorConversation.upsert({
    where: { sessionId },
    update: { lastVisitorAt: now },
    create: { sessionId, lastVisitorAt: now },
  })

  await prisma.visitorMessage.create({
    data: { conversationId: conversation.id, sender: ChatSender.VISITOR, content: text, isAdminRead: false },
  })

  // automated reply
  const recent = await prisma.visitorMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  const lastAuto = recent.find((m) => m.sender === ChatSender.ADMIN && m.content?.includes('Automated reply'))
  const match = findAiAnswer(text)
  const intro = lastAuto ? 'Automated reply: ' : 'Automated reply: This is an automated reply to help while you wait. '
  const body = match ? match.answerText : 'Thanks for your message! A team member will reply shortly.'
  const autoContent = `${intro}${body}`
  await prisma.visitorMessage.create({
    data: {
      conversationId: conversation.id,
      sender: ChatSender.ADMIN,
      content: autoContent,
      isVisitorRead: false,
    },
  })

  const messages = await prisma.visitorMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
  })

  res.status(201).json({ conversationId: conversation.id, messages: messages.map(mapChatMessage) })
}))

//requests made in visitor view

const normalizeTrim = (val = '') => String(val || '').trim()

const validateDates = {
  past(date) {
    if (!date || Number.isNaN(date.getTime())) return false
    return date < new Date()
  },
  future(date) {
    if (!date || Number.isNaN(date.getTime())) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date > today
  },
}

app.post('/api/requests/tour', safeAsync(async (req, res) => {
  const { parentName, email, phone = '', preferredStartDate = '', notes = '' } = req.body || {}
  const name = normalizeTrim(parentName)
  const mail = normalizeTrim(email)
  const phoneVal = normalizeTrim(phone)
  const start = preferredStartDate ? new Date(preferredStartDate) : null

  if (!name || name.length < 2) return res.status(400).json({ error: 'Parent/Guardian name is required.' })
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return res.status(400).json({ error: 'Your email address is invalid.' })
  if (start && !validateDates.future(start)) return res.status(400).json({ error: 'Preferred date must be in the future.' })

  const saved = await prisma.request.create({
    data: {
      type: RequestType.tour,
      parentName: name,
      email: mail,
      phone: phoneVal || null,
      preferredStartDate: start,
      notes: normalizeTrim(notes) || null,
      status: RequestStatus.new,
    },
  })
  res.status(201).json(saved)
}))

app.post('/api/requests/application', safeAsync(async (req, res) => {
  const {
    parentName,
    email,
    phone = '',
    childName = '',
    dateOfBirth = '',
    preferredStartDate = '',
    notes = '',
  } = req.body || {}

  const name = normalizeTrim(parentName)
  const child = normalizeTrim(childName)
  const mail = normalizeTrim(email)
  const phoneVal = normalizeTrim(phone)
  const dob = dateOfBirth ? new Date(dateOfBirth) : null
  const start = preferredStartDate ? new Date(preferredStartDate) : null

  if (!name || name.length < 2) return res.status(400).json({ error: 'Parent/Guardian name is required.' })
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return res.status(400).json({ error: 'Your email address is invalid.' })
  if (!child || child.length < 2) return res.status(400).json({ error: 'Child name is required.' })
  if (!dob || !validateDates.past(dob)) return res.status(400).json({ error: 'The child’s date of birth must be a valid past date.' })
  const ageYears = new Date().getFullYear() - dob.getFullYear() - (new Date() < new Date(new Date().getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0)
  if (ageYears < 1 || ageYears > 6) return res.status(400).json({ error: 'Child age must be between 1 and 6 years.' })
  if (start && !validateDates.future(start)) return res.status(400).json({ error: 'Preferred start date must be in the future.' })

  const saved = await prisma.request.create({
    data: {
      type: RequestType.application,
      parentName: name,
      email: mail,
      phone: phoneVal || null,
      childName: child,
      dateOfBirth: dob,
      preferredStartDate: start,
      notes: normalizeTrim(notes) || null,
      status: RequestStatus.new,
    },
  })
  res.status(201).json(saved)
}))

//admin apis that are protected

const adminRouter = express.Router()
adminRouter.use(requireAdminApi)

//admin requests

adminRouter.get('/requests', safeAsync(async (req, res) => {
  const type = (req.query.type || '').toString()
  const where = type && Object.values(RequestType).includes(type) ? { type } : {}
  const requests = await prisma.request.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  res.json(requests)
}))

adminRouter.get('/requests/:id', safeAsync(async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
  const request = await prisma.request.findUnique({ where: { id } })
  if (!request) return res.status(404).json({ error: 'Not found' })
  res.json(request)
}))

adminRouter.patch('/requests/:id/status', safeAsync(async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body || {}
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
  if (!status || !Object.values(RequestStatus).includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  const existing = await prisma.request.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const updated = await prisma.request.update({
    where: { id },
    data: { status },
  })
  res.json(updated)
}))

//admin chat

adminRouter.get('/chat/unread', safeAsync(async (_req, res) => {
  const unread = await prisma.visitorMessage.count({
    where: { sender: ChatSender.VISITOR, isAdminRead: false },
  })
  res.json({ unread })
}))

adminRouter.get('/chat/conversations', safeAsync(async (_req, res) => {
  const conversations = await prisma.visitorConversation.findMany({
    orderBy: [{ lastVisitorAt: 'desc' }, { updatedAt: 'desc' }],
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  const withUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unreadVisitor = await prisma.visitorMessage.count({
        where: { conversationId: conv.id, sender: ChatSender.VISITOR, isAdminRead: false },
      })
      return {
        id: conv.id,
        lastVisitorAt: conv.lastVisitorAt,
        lastAdminAt: conv.lastAdminAt,
        lastMessage: conv.messages?.[0] ? mapChatMessage(conv.messages[0]) : null,
        unreadVisitor,
      }
    })
  )

  res.json(withUnread)
}))

adminRouter.get('/chat/conversations/:id', safeAsync(async (req, res) => {
  const id = Number(req.params.id)
  const conversation = await prisma.visitorConversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!conversation) return res.status(404).json({ error: 'Not found' })

  await prisma.visitorMessage.updateMany({
    where: { conversationId: id, sender: ChatSender.VISITOR, isAdminRead: false },
    data: { isAdminRead: true },
  })

  const messages = await prisma.visitorMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
  })

  res.json({ id: conversation.id, messages: messages.map(mapChatMessage) })
}))

adminRouter.post('/chat/conversations/:id/reply', safeAsync(async (req, res) => {
  const id = Number(req.params.id)
  const { content } = req.body || {}
  if (!content || !String(content).trim()) return res.status(400).json({ error: 'Reply is required' })
  const conversation = await prisma.visitorConversation.findUnique({ where: { id } })
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
  const text = String(content).trim().slice(0, 1000)

  await prisma.visitorMessage.create({
    data: { conversationId: id, sender: ChatSender.ADMIN, content: text, isVisitorRead: false },
  })
  await prisma.visitorConversation.update({ where: { id }, data: { lastAdminAt: new Date() } })

  const messages = await prisma.visitorMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
  })

  res.status(201).json({ id, messages: messages.map(mapChatMessage) })
}))

//admin notes

adminRouter.get('/notes', safeAsync(async (_req, res) => {
  const notes = await prisma.adminNote.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json(notes)
}))

adminRouter.post('/notes', safeAsync(async (req, res) => {
  const { title, message, targetType = 'all', targetId = null, priority = '' } = req.body
  if (!title || !message) return res.status(400).json({ error: 'Title and message required' })
  const created = await prisma.adminNote.create({
    data: { title, message, targetType, targetId, priority },
  })
  res.status(201).json(created)
}))

adminRouter.get('/alerts', safeAsync(async (_req, res) => {
  const todayStart = startOfDay()
  const tomorrow = new Date(todayStart)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [children, eventsToday, notes, payments, attendance, creds] = await Promise.all([
    prisma.child.findMany({ include: { group: true } }),
    prisma.activity.findMany({
      where: { startsAt: { gte: todayStart, lt: tomorrow }, OR: [{ type: 'event' }, { type: null }] },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.activity.findMany({
      where: { type: 'note' },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          { status: PaymentStatus.LATE },
          { AND: [{ status: { not: PaymentStatus.PAID } }, { dueDate: { lt: todayStart } }] },
        ],
      },
      include: { child: true },
    }),
    prisma.attendance.findMany({ where: { date: { gte: todayStart, lt: tomorrow } } }),
    loadCreds(),
  ])

  const birthdays = children.filter((c) => {
    const b = new Date(c.birthDate)
    return b.getDate() === todayStart.getDate() && b.getMonth() === todayStart.getMonth()
  })

  const notifications = [
    ...birthdays.map((b) => ({
      id: `birthday-${b.jmbg}`,
      title: `Birthday: ${b.firstName} ${b.lastName}`,
      message: `${b.firstName} ${b.lastName} from ${b.group?.name || 'Unknown group'} has a birthday today.`,
      category: 'parent',
      priority: 'info',
      isRead: false,
      createdAt: todayStart.toISOString(),
      relatedEntityId: b.jmbg,
      link: '/kids',
    })),
    ...eventsToday.map((e) => ({
      id: `event-${e.id}`,
      title: e.title || 'Event today',
      message: e.notes || 'Scheduled event',
      category: 'operations',
      priority: 'warning',
      isRead: false,
      createdAt: e.startsAt.toISOString(),
      relatedEntityId: e.id,
      link: '/calendar',
    })),
    ...notes.map((n) => ({
      id: `note-${n.id}`,
      title: n.title || 'Admin note',
      message: n.notes || 'New note from admin',
      category: 'staff',
      priority: 'info',
      isRead: false,
      createdAt: n.createdAt.toISOString(),
      relatedEntityId: n.id,
      link: '/worker',
    })),
    ...payments.map((p) => ({
      id: `payment-${p.id}`,
      title: `Overdue payment: ${p.child?.firstName || ''} ${p.child?.lastName || ''}`.trim(),
      message: `Tuition from ${p.periodStart.toISOString().slice(0, 10)} to ${p.periodEnd.toISOString().slice(0, 10)} is overdue.`,
      category: 'finance',
      priority: 'urgent',
      isRead: false,
      createdAt: p.dueDate.toISOString(),
      relatedEntityId: p.childJmbg,
      link: '/billing',
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const activityFeed = [
    ...eventsToday.map((e) => ({
      id: `act-event-${e.id}`,
      icon: '📅',
      text: e.title || 'Event scheduled',
      createdAt: e.startsAt.toISOString(),
      link: '/calendar',
    })),
    ...notes.map((n) => ({
      id: `act-note-${n.id}`,
      icon: '📝',
      text: n.title || 'Admin note posted',
      createdAt: n.createdAt.toISOString(),
      link: '/worker',
    })),
    ...payments.map((p) => ({
      id: `act-payment-${p.id}`,
      icon: '💳',
      text: `Payment overdue for ${p.child?.firstName || ''} ${p.child?.lastName || ''}`.trim(),
      createdAt: p.updatedAt.toISOString(),
      link: '/billing',
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20)

  const todayOverview = {
    childrenPresent: attendance.filter((a) => a.status === 'PRESENT').length,
    childrenAbsent: attendance.filter((a) => a.status === 'ABSENT' || a.status === 'SICK').length,
    staffPresent: creds.filter((c) => c.role === 'worker' && !c.disabled).length,
    staffAbsent: 0,
    overduePayments: payments.length,
    availableSpots: Math.max(0, 120 - children.length),
    eventsToday: eventsToday.length,
    birthdaysToday: birthdays.length,
  }

  res.json({ notifications, activity: activityFeed, today: todayOverview })
}))

adminRouter.get('/overview', safeAsync(async (_req, res) => {
  const [kidCount, parentCount, groupCount] = await Promise.all([
    prisma.child.count(),
    prisma.parent.count(),
    prisma.group.count(),
  ])
  const creds = await loadCreds()
  const teacherCount = creds.filter((c) => c.role === 'worker' && !c.disabled).length
  const recentKids = await prisma.child.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { group: true, health: true, parents: { include: { parent: true } } },
  })
  const recentParents = await prisma.parent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { children: { include: { child: { include: { group: true } } } } },
  })
  const byEmail = creds.reduce((acc, c) => {
    if (c.username) acc[c.username] = c
    if (c.email) acc[c.email] = c
    return acc
  }, {})
  res.json({
    counts: { kids: kidCount, parents: parentCount, teachers: teacherCount, groups: groupCount },
    recent: {
      kids: recentKids.map(toAdminChild),
      parents: recentParents.map((p) => toAdminParent(p, byEmail)),
    },
  })
}))

adminRouter.get('/kids', safeAsync(async (_req, res) => {
  const children = await prisma.child.findMany({
    orderBy: { firstName: 'asc' },
    include: {
      group: true,
      health: true,
      parents: { include: { parent: true } },
    },
  })
  res.json(children.map(toAdminChild))
}))

adminRouter.post('/kids', safeAsync(async (req, res) => {
  try {
    const created = await createChildWithParents(req.body)
    res.status(201).json(created)
  } catch (err) {
    const status = err.statusCode || 500
    res.status(status).json({ error: err.message || 'Create failed' })
  }
}))

adminRouter.patch('/kids/:jmbg', safeAsync(async (req, res) => {
  const { jmbg } = req.params
  const updates = req.body
  const existing = await prisma.child.findUnique({
    where: { jmbg },
    include: { health: true, parents: true, group: true },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const nextDob = updates.dob ? new Date(updates.dob) : existing.birthDate
  const groupName = updates.group || autoGroupForDob(nextDob)
  const group = await ensureGroupByName(groupName)

  const updated = await prisma.child.update({
    where: { jmbg },
    data: {
      firstName: updates.firstName ?? existing.firstName,
      lastName: updates.lastName ?? existing.lastName,
      birthDate: updates.dob ? new Date(updates.dob) : existing.birthDate,
      startDate: updates.entryDate ? new Date(updates.entryDate) : existing.startDate,
      status: updates.status === 'Inactive' ? ChildStatus.INACTIVE : ChildStatus.ACTIVE,
      groupId: group?.id ?? existing.groupId,
      health: {
        upsert: {
          update: {
            allergies: updates.allergies ?? existing.health?.allergies ?? '',
            notes: updates.parentNotes ?? existing.health?.notes ?? '',
          },
          create: {
            allergies: updates.allergies || '',
            notes: updates.parentNotes || '',
          },
        },
      },
    },
    include: {
      group: true,
      health: true,
      parents: { include: { parent: true } },
    },
  })
  if (Array.isArray(updates.parentIds)) {
    await linkParentsToChild(jmbg, updates.parentIds)
  }
  const withParents = await prisma.child.findUnique({
    where: { jmbg },
    include: { group: true, health: true, parents: { include: { parent: true } } },
  })
  res.json(toAdminChild(withParents))
}))

adminRouter.delete('/kids/:jmbg', safeAsync(async (req, res) => {
  await prisma.child.delete({ where: { jmbg: req.params.jmbg } })
  res.json({ ok: true })
}))

adminRouter.get('/parents', safeAsync(async (_req, res) => {
  const [parents, creds] = await Promise.all([
    prisma.parent.findMany({
      orderBy: { fullName: 'asc' },
      include: {
        children: { include: { child: { include: { group: true } } } },
      },
    }),
    loadCreds(),
  ])
  const byEmail = creds.reduce((acc, c) => {
    if (c.username) acc[c.username] = c
    if (c.email) acc[c.email] = c
    return acc
  }, {})
  res.json(parents.map((p) => toAdminParent(p, byEmail)))
}))

adminRouter.post('/parents', safeAsync(async (req, res) => {
  const payload = req.body
  const email = payload.email || makeParentEmail(payload.fullName)
  const password = payload.password || randomPassword()
  const parent = await prisma.parent.create({
    data: {
      fullName: normalizeName(payload.fullName),
      phone: payload.phone || '',
      email,
      address: payload.address || '',
      emergencyName: payload.emergencyName || '',
      emergencyPhone: payload.emergencyPhone || '',
      emergencyRelation: payload.emergencyRelation || '',
    },
  })

  if (Array.isArray(payload.childJmbgs) && payload.childJmbgs.length) {
    await prisma.childParent.createMany({
      data: payload.childJmbgs.map((childJmbg, idx) => ({
        childJmbg,
        parentId: parent.id,
        relation: 'Parent',
        isPrimary: idx === 0,
      })),
      skipDuplicates: true,
    })
  }

  const creds = await loadCreds()
  const hasExisting = creds.find((c) => c.username === email)
  const newCred = {
    id: hasExisting?.id || Date.now().toString(),
    role: 'parent',
    username: email,
    password,
    childJmbgs: payload.childJmbgs || [],
    childJmbg: payload.childJmbgs?.[0] || '',
    email,
    disabled: false,
  }
  const nextCreds = hasExisting
    ? creds.map((c) => (c.id === hasExisting.id ? { ...c, ...newCred } : c))
    : [...creds, newCred]
  await saveCreds(nextCreds)

  const withChildren = await prisma.parent.findUnique({
    where: { id: parent.id },
    include: { children: { include: { child: { include: { group: true } } } } },
  })
  const byEmail = nextCreds.reduce((acc, c) => {
    if (c.username) acc[c.username] = c
    if (c.email) acc[c.email] = c
    return acc
  }, {})
  res.status(201).json(toAdminParent(withChildren, byEmail))
}))

adminRouter.patch('/parents/:id', safeAsync(async (req, res) => {
  const { id } = req.params
  const payload = req.body
  const parentId = Number(id)

  const existing = await prisma.parent.findUnique({ where: { id: parentId } })
  if (!existing) return res.status(404).json({ error: 'Not found' })

  await prisma.parent.update({
    where: { id: parentId },
    data: {
      fullName: payload.fullName ? normalizeName(payload.fullName) : existing.fullName,
      phone: payload.phone ?? existing.phone,
      email: payload.email || existing.email || makeParentEmail(payload.fullName || existing.fullName),
      address: payload.address ?? existing.address,
      emergencyName: payload.emergencyName ?? existing.emergencyName,
      emergencyPhone: payload.emergencyPhone ?? existing.emergencyPhone,
      emergencyRelation: payload.emergencyRelation ?? existing.emergencyRelation,
    },
  })

  if (Array.isArray(payload.childJmbgs)) {
    await prisma.childParent.deleteMany({ where: { parentId } })
    if (payload.childJmbgs.length) {
      await prisma.childParent.createMany({
        data: payload.childJmbgs.map((childJmbg, idx) => ({
          childJmbg,
          parentId,
          relation: 'Parent',
          isPrimary: idx === 0,
        })),
        skipDuplicates: true,
      })
    }
  }

  if (payload.password || payload.email) {
    const creds = await loadCreds()
    const targetEmail = payload.email || existing.email
    const hasExisting = creds.find((c) => c.username === targetEmail)
    if (hasExisting) {
      const childLinks = payload.childJmbgs || hasExisting.childJmbgs || []
      const next = creds.map((c) =>
        c.id === hasExisting.id
          ? {
              ...c,
              username: targetEmail,
              email: targetEmail,
              password: payload.password || c.password,
              childJmbgs: childLinks,
              childJmbg: childLinks[0] || c.childJmbg || '',
            }
          : c
      )
      await saveCreds(next)
    }
  }

  const withChildren = await prisma.parent.findUnique({
    where: { id: parentId },
    include: { children: { include: { child: { include: { group: true } } } } },
  })
  res.json(toAdminParent(withChildren))
}))

adminRouter.delete('/parents/:id', safeAsync(async (req, res) => {
  const parentId = Number(req.params.id)
  const existing = await prisma.parent.findUnique({ where: { id: parentId } })
  if (!existing) return res.status(404).json({ error: 'Not found' })

  await prisma.childParent.deleteMany({ where: { parentId } })
  await prisma.parent.delete({ where: { id: parentId } })

  const creds = await loadCreds()
  const nextCreds = creds.filter((c) => c.username !== existing.email)
  await saveCreds(nextCreds)

  res.json({ ok: true })
}))

adminRouter.get('/groups', safeAsync(async (_req, res) => {
  const [groups, creds] = await Promise.all([
    prisma.group.findMany({
      orderBy: { name: 'asc' },
      include: { children: true },
    }),
    loadCreds(),
  ])
  const formatted = groups.map((g) => ({
    id: g.id,
    name: g.name,
    kids: g.children.map((c) => ({ jmbg: c.jmbg, name: `${c.firstName} ${c.lastName}` })),
    teachers: creds
      .filter((c) => c.role === 'worker' && (c.group || '').toLowerCase() === g.name.toLowerCase())
      .map((t) => ({
        id: t.id,
        name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.username,
        email: t.email || t.username,
      })),
  }))
  res.json(formatted)
}))

adminRouter.post('/groups', safeAsync(async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Group name required' })
  const created = await ensureGroupByName(name)
  res.status(201).json(created)
}))

adminRouter.patch('/groups/:name', safeAsync(async (req, res) => {
  const name = req.params.name
  const { teacherIds = [] } = req.body
  await ensureGroupByName(name)
  const creds = await loadCreds()
  const next = creds.map((c) => {
    if (c.role !== 'worker') return c
    if (teacherIds.includes(c.id)) return { ...c, group: name }
    if ((c.group || '').toLowerCase() === name.toLowerCase() && !teacherIds.includes(c.id)) {
      return { ...c, group: '' }
    }
    return c
  })
  await saveCreds(next)

  const groups = await prisma.group.findMany({
    orderBy: { name: 'asc' },
    include: { children: true },
  })
  const formatted = groups.map((g) => ({
    id: g.id,
    name: g.name,
    kids: g.children.map((c) => ({ jmbg: c.jmbg, name: `${c.firstName} ${c.lastName}` })),
    teachers: next
      .filter((c) => c.role === 'worker' && (c.group || '').toLowerCase() === g.name.toLowerCase())
      .map((t) => ({
        id: t.id,
        name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.username,
        email: t.email || t.username,
      })),
  }))
  res.json(formatted)
}))

adminRouter.get('/users', safeAsync(async (_req, res) => {
  const creds = await loadCreds()
  res.json(creds)
}))

adminRouter.post('/users', safeAsync(async (req, res) => {
  const incoming = req.body
  const creds = await loadCreds()
  if (creds.some((c) => c.username === incoming.username)) {
    return res.status(400).json({ error: 'Username already exists' })
  }
  const childLinks = incoming.childJmbgs || (incoming.childJmbg ? [incoming.childJmbg] : [])
  const withId = {
    id: Date.now().toString(),
    role: incoming.role || 'worker',
    username: incoming.username,
    password: incoming.password,
    childJmbg: childLinks[0] || '',
    childJmbgs: childLinks,
    group: incoming.group || '',
    firstName: incoming.firstName || '',
    lastName: incoming.lastName || '',
    jmbg: incoming.jmbg || '',
    email: incoming.email || incoming.username || '',
    disabled: incoming.disabled ?? false,
  }
  const next = [...creds, withId]
  await saveCreds(next)
  res.status(201).json(withId)
}))

adminRouter.patch('/users/:id', safeAsync(async (req, res) => {
  const { id } = req.params
  const updates = req.body
  const creds = await loadCreds()
  const idx = creds.findIndex((c) => c.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const incomingChildLinks =
    updates.childJmbgs ||
    (updates.childJmbg ? [updates.childJmbg] : creds[idx].childJmbgs || [])
  const next = creds.map((c, i) =>
    i === idx
      ? {
          ...c,
          ...updates,
          email: updates.email || updates.username || c.email || c.username || '',
          childJmbgs: incomingChildLinks,
          childJmbg: incomingChildLinks[0] || updates.childJmbg || c.childJmbg || '',
          disabled: typeof updates.disabled === 'boolean' ? updates.disabled : c.disabled || false,
        }
      : c
  )
  await saveCreds(next)
  res.json(next[idx])
}))

adminRouter.delete('/users/:id', safeAsync(async (req, res) => {
  const creds = await loadCreds()
  const next = creds.filter((c) => c.id !== req.params.id)
  if (next.length === creds.length) return res.status(404).json({ error: 'Not found' })
  await saveCreds(next)
  res.json({ ok: true })
}))

//frontend

const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))
// Admin auth endpoints
app.post(`${ADMIN_API_BASE}/login`, safeAsync(async (req, res) => {
  const { username, password } = req.body
  const creds = await loadCreds()
  const admin = creds.find((c) => c.role === 'admin' && c.username === username && c.password === password)
  if (!admin) return res.status(403).json({ error: 'Invalid credentials' })
  res.cookie(ADMIN_COOKIE, ADMIN_ROLE, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })
  res.json({ ok: true })
}))

app.post(`${ADMIN_API_BASE}/logout`, safeAsync(async (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, { path: '/' })
  res.json({ ok: true })
}))

app.get(`${ADMIN_API_BASE}/verify`, safeAsync(async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: 'Forbidden' })
  res.json({ ok: true })
}))

// Protected admin APIs (after auth endpoints)
app.use(`${ADMIN_API_BASE}`, adminRouter)

// Protect admin pages server-side: require cookie or redirect to login
app.get(`${ADMIN_BASE}/login`, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.get(`${ADMIN_BASE}/*`, (req, res) => {
  if (!isAdminRequest(req)) return res.redirect(`${ADMIN_BASE}/login`)
  return res.sendFile(path.join(distPath, 'index.html'))
})

// Global error handler (returns JSON instead of HTML)
app.use((err, _req, res, _next) => {
  console.error(err)
  const status = err.statusCode || err.status || 500
  res.status(status).json({ error: err.message || 'Server error' })
})

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// Prime holiday cache for the current year on startup (idempotent, skips if already present)
const currentYear = new Date().getFullYear()
syncHolidays(currentYear).catch((err) => console.error('Startup holiday sync failed', err))

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
