import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

const ADMIN_BASE = (import.meta.env.VITE_ADMIN_PATH || '/admin/secure').replace(/\/+$/, '') || '/admin/secure'
const ADMIN_API_BASE = `/api${ADMIN_BASE}`

export default function AdminRoute({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false
    fetch(`${ADMIN_API_BASE}/verify`, { credentials: 'include' })
      .then((res) => {
        if (cancelled) return
        if (res.ok) {
          setStatus('ok')
        } else {
          setStatus('denied')
        }
      })
      .catch(() => {
        if (cancelled) return
        setStatus('denied')
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname, navigate])

  if (status === 'checking') return null
  if (status === 'denied') return <Navigate to={`${ADMIN_BASE}/login`} replace state={{ from: location.pathname }} />
  return children
}
