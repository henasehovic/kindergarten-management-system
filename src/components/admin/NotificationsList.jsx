import { useMemo, useState } from 'react'
import { categoryIcons, formatRelativeTime, priorityColor } from '../../lib/adminDataService'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'finance', label: 'Finance' },
  { id: 'staff', label: 'Staff' },
  { id: 'parent', label: 'Parent' },
  { id: 'operations', label: 'Operations' },
]

export default function NotificationsList({ notifications = [], onToggleRead, onMarkAllRead, compact = false }) {
  const [filter, setFilter] = useState('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (showUnreadOnly && n.isRead) return false
      if (filter === 'all') return true
      if (filter === 'urgent') return n.priority === 'urgent'
      return n.category === filter
    })
  }, [filter, notifications, showUnreadOnly])

  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-berry font-semibold text-sm">Notifications</p>
          <h3 className="font-display text-xl">{compact ? 'Inbox' : 'Notification Center'}</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-navy/70">
            <input type="checkbox" checked={showUnreadOnly} onChange={(e) => setShowUnreadOnly(e.target.checked)} />
            Unread only
          </label>
          <button className="text-xs text-navy underline" onClick={onMarkAllRead}>
            Mark all read
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`px-3 py-1 rounded-full border text-xs transition ${filter === f.id ? 'bg-navy text-white border-navy' : 'border-navy/20 text-navy'}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
        {filtered.map((n) => (
          <div
            key={n.id}
            className={`border border-navy/10 rounded-xl p-3 flex gap-3 ${n.isRead ? 'bg-white' : 'bg-amber-50/60'}`}
          >
            <div className="text-xl pt-1">{categoryIcons[n.category] || '📌'}</div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center flex-wrap gap-2">
                <p className="font-semibold">{n.title}</p>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${priorityColor[n.priority] || priorityColor.info}`}>{n.priority}</span>
                <span className="text-[11px] text-navy/60">{formatRelativeTime(n.createdAt)}</span>
              </div>
              <p className="text-sm text-navy/80">{n.message}</p>
              <div className="flex items-center gap-3 text-xs">
                <button className="text-berry font-semibold" onClick={() => onToggleRead?.(n.id, !n.isRead)}>
                  Mark as {n.isRead ? 'unread' : 'read'}
                </button>
                {n.link && (
                  <a className="text-navy underline" href={n.link}>
                    View
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-sm text-navy/60">No notifications match the filter.</p>}
      </div>
    </div>
  )
}
