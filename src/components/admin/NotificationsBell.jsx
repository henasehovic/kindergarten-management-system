import { useMemo, useState } from 'react'
import { categoryIcons, formatRelativeTime, priorityColor } from '../../lib/adminDataService'

export default function NotificationsBell({ notifications = [], unreadCount = 0, onToggleRead, onViewAll }) {
  const [open, setOpen] = useState(false)
  const latest = useMemo(() => notifications.slice(0, 5), [notifications])

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center w-11 h-11 rounded-full bg-white shadow border border-navy/10 hover:-translate-y-0.5 transition"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-berry text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-navy/10 p-3 z-30">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm">Notifications</p>
            <button className="text-xs text-navy/70 hover:text-navy" onClick={onViewAll}>
              View all
            </button>
          </div>
          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            {latest.map((n) => (
              <div key={n.id} className="p-3 rounded-xl border border-navy/10 bg-slate-50 flex gap-3">
                <div className="text-lg">{categoryIcons[n.category] || '📌'}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{n.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityColor[n.priority] || priorityColor.info}`}>
                      {n.priority}
                    </span>
                    <span className="text-[11px] text-navy/60">{formatRelativeTime(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-navy/80">{n.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button className="text-xs text-berry font-semibold" onClick={() => onToggleRead?.(n.id, !n.isRead)}>
                      Mark as {n.isRead ? 'unread' : 'read'}
                    </button>
                    {n.link && (
                      <a className="text-xs text-navy underline" href={n.link}>
                        View
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!latest.length && <p className="text-sm text-navy/60">No notifications.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
