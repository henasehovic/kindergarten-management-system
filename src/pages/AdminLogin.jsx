import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ADMIN_BASE = (import.meta.env.VITE_ADMIN_PATH || '/admin/secure').replace(/\/+$/, '') || '/admin/secure'
const ADMIN_API_BASE = `/api${ADMIN_BASE}`

export default function AdminLogin() {
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const onSubmit = (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const user = form.get('email')
    const pass = form.get('password')

    fetch(`${ADMIN_API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: user, password: pass }),
    })
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error('Invalid admin credentials')
      })
      .then(() => {
        navigate(`${ADMIN_BASE}/dashboard`, { replace: true })
      })
      .catch((err) => {
        console.error(err)
        setError('Invalid admin credentials')
      })
  }

  return (
    <main className="px-6 lg:px-12 py-12 max-w-xl mx-auto">
      <h1 className="font-display text-3xl mb-4">Admin sign in</h1>
      <form className="space-y-3 bg-white rounded-2xl shadow p-6" onSubmit={onSubmit}>
        <input name="email" className="w-full px-4 py-3 rounded-xl border border-navy/10" placeholder="Email" required />
        <input name="password" type="password" className="w-full px-4 py-3 rounded-xl border border-navy/10" placeholder="Password" required />
        <button className="bg-berry text-white font-semibold px-4 py-3 rounded-xl shadow hover:-translate-y-0.5 transition w-full">
          Sign in
        </button>
        {error && <p className="text-sm text-berry">{error}</p>}
      </form>
    </main>
  )
}
