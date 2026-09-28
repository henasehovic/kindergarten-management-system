import { formatRelativeTime } from '../../lib/adminDataService'

const typeLabels = {
  tour: 'Contact note',
  application: 'Application',
}

export default function RequestsWidget({ requests = [], onAction }) {
  const pending = requests.filter((r) => r.status === 'new').slice(0, 5)

  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-berry font-semibold text-sm">Requests</p>
          <h3 className="font-display text-xl">New ({requests.filter((r) => r.status === 'new').length})</h3>
        </div>
      </div>
      <div className="space-y-2">
        {pending.map((r) => (
          <div key={r.id} className="border border-navy/10 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-navy/10 text-navy">{typeLabels[r.type] || r.type}</span>
                <span className="text-[11px] text-navy/60">{formatRelativeTime(r.createdAt)}</span>
              </div>
              <p className="text-xs text-navy/70">{r.parentName}</p>
            </div>
            <p className="font-semibold text-sm">{r.email}</p>
            <div className="flex items-center gap-2 text-xs">
              <button className="px-3 py-1 rounded-lg bg-emerald-500 text-white" onClick={() => onAction?.(r.id, 'reviewed')}>
                Mark reviewed
              </button>
            </div>
          </div>
        ))}
        {!pending.length && <p className="text-sm text-navy/60">No pending requests.</p>}
      </div>
    </div>
  )
}
