import { formatRelativeTime } from '../../lib/adminDataService'

export default function ActivityFeed({ items = [] }) {
  const recent = items.slice(0, 10)
  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-3">
      <div>
        <p className="text-berry font-semibold text-sm">Activity</p>
        <h3 className="font-display text-xl">Recent activity</h3>
      </div>
      <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
        {recent.map((item) => (
          <div key={item.id} className="flex items-center gap-3 border border-navy/10 rounded-xl p-3">
            <div className="text-xl">{item.icon || '📌'}</div>
            <div className="flex-1">
              <p className="text-sm text-navy">{item.text}</p>
              <p className="text-[11px] text-navy/60">{formatRelativeTime(item.createdAt)}</p>
            </div>
            {item.link && (
              <a className="text-xs text-navy underline" href={item.link}>
                Open
              </a>
            )}
          </div>
        ))}
        {!recent.length && <p className="text-sm text-navy/60">No activity recorded yet.</p>}
      </div>
    </div>
  )
}
