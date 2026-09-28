import { useState } from 'react'

export default function ApproveRejectModal({ request, action, onCancel, onSubmit }) {
  const [comment, setComment] = useState('')
  if (!request) return null

  const actionLabel = action === 'approved' ? 'Approve' : 'Reject'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div>
          <p className="text-berry font-semibold text-sm">{actionLabel} request</p>
          <p className="font-display text-xl">{request.summary}</p>
          <p className="text-sm text-navy/70 mt-1">{request.details}</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Admin comment (optional)</label>
          <textarea
            className="w-full rounded-xl border border-navy/20 px-3 py-2"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add context for the parent/staff member..."
          />
        </div>
        <div className="flex justify-end gap-3">
          <button className="px-4 py-2 rounded-xl border border-navy/20 text-navy" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`px-4 py-2 rounded-xl text-white ${action === 'approved' ? 'bg-emerald-600' : 'bg-rose-600'}`}
            onClick={() => onSubmit?.(comment)}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
