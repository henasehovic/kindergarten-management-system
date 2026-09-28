import { useMemo, useState } from 'react'
import { formatRelativeTime } from '../../lib/adminDataService'

const typeLabels = {
  tour: 'Contact note',
  application: 'Application',
}

const statusOptions = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'closed', label: 'Closed' },
]

export default function RequestsTable({ requests = [], onStatusChange }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortDesc, setSortDesc] = useState(true)
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const base = statusFilter === 'all' ? requests : requests.filter((r) => r.status === statusFilter)
    const typed = typeFilter === 'all' ? base : base.filter((r) => r.type === typeFilter)
    const searched = term
      ? typed.filter((r) => `${r.parentName} ${r.email} ${r.childName || ''}`.toLowerCase().includes(term))
      : typed
    const sorted = [...searched].sort((a, b) => {
      const diff = new Date(a.createdAt) - new Date(b.createdAt)
      return sortDesc ? -diff : diff
    })
    return sorted
  }, [requests, statusFilter, typeFilter, search, sortDesc])

  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-berry font-semibold text-sm">Requests</p>
          <h3 className="font-display text-xl">Requests inbox</h3>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs text-navy underline" onClick={() => setSortDesc((v) => !v)}>
            Sort: {sortDesc ? 'Newest' : 'Oldest'}
          </button>
          <input
            className="border border-navy/20 rounded-xl px-3 py-2 text-sm"
            placeholder="Search by parent or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          {statusOptions.map((t) => (
            <button
              key={t.id}
              className={`px-3 py-1 rounded-full border text-xs ${statusFilter === t.id ? 'bg-navy text-white border-navy' : 'border-navy/20 text-navy'}`}
              onClick={() => setStatusFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          className="border border-navy/20 rounded-xl px-3 py-1 text-xs ml-auto"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All types</option>
          {Object.entries(typeLabels).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
        {filtered.map((r) => (
          <div key={r.id} className="border border-navy/10 rounded-xl p-3 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-navy/10 text-navy">{typeLabels[r.type] || r.type}</span>
                <span className="text-[11px] text-navy/60">{formatRelativeTime(r.createdAt)}</span>
              </div>
              <p className="text-sm font-semibold text-navy">{r.parentName}</p>
            </div>
            <p className="text-sm text-navy/80">{r.email}</p>
            <div className="flex items-center justify-between text-xs gap-2">
              <p className="text-navy/70">
                Status:{' '}
                <select
                  className="border border-navy/20 rounded-lg px-2 py-1 text-xs"
                  value={r.status}
                  onChange={(e) => onStatusChange?.(r.id, e.target.value)}
                >
                  {statusOptions
                    .filter((s) => s.id !== 'all')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </p>
              <button className="text-berry text-xs underline" onClick={() => setSelected((prev) => (prev === r.id ? null : r.id))}>
                {selected === r.id ? 'Hide' : 'View details'}
              </button>
            </div>
            {selected === r.id && (
              <div className="mt-2 text-sm text-navy/80 space-y-1">
                {r.childName && (
                  <p>
                    <span className="font-semibold">Child:</span> {r.childName}
                  </p>
                )}
                {r.dateOfBirth && (
                  <p>
                    <span className="font-semibold">DOB:</span> {new Date(r.dateOfBirth).toISOString().slice(0, 10)}
                  </p>
                )}
                {r.preferredStartDate && (
                  <p>
                    <span className="font-semibold">Preferred start:</span> {new Date(r.preferredStartDate).toISOString().slice(0, 10)}
                  </p>
                )}
                {r.phone && (
                  <p>
                    <span className="font-semibold">Phone:</span> {r.phone}
                  </p>
                )}
                {r.notes && (
                  <p>
                    <span className="font-semibold">Notes:</span> {r.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {!filtered.length && <p className="text-sm text-navy/60">No requests match the filters.</p>}
      </div>
    </div>
  )
}
