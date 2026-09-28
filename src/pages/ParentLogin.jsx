import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ParentLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const credRes = await fetch('/api/credentials', { cache: 'no-store' })
      const creds = await credRes.json()
      const match = creds.find((c) => c.role === 'parent' && c.username === username && c.password === password)
      if (!match) {
        setError('Invalid username or password')
        setLoading(false)
        return
      }
      sessionStorage.setItem('parentUsername', match.username)
      sessionStorage.setItem('parentPassword', password)
      navigate('/parent', { replace: true })
    } catch (err) {
      setError('Could not log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-butterLight flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-berry/15 p-6 space-y-4">
        <div>
          <p className="text-berry font-semibold text-sm">Parent Portal</p>
          <h1 className="font-display text-3xl text-navy">Sign in</h1>
          <p className="text-sm text-navy/70">Need help? Contact us to retrieve your parent login.</p>
        </div>
        <form className="space-y-3" onSubmit={onLogin}>
          <input
            className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10"
            placeholder="Parent username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          <input
            className="w-full px-4 py-3 rounded-xl text-navy bg-white border border-navy/10"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <button
            className="w-full bg-berry text-white font-semibold px-4 py-3 rounded-xl shadow hover:-translate-y-0.5 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Login as Parent'}
          </button>
          {error && <p className="text-sm text-berry">{error}</p>}
          <p className="text-xs text-navy/60">Need help? Contact us to retrieve your parent login.</p>
        </form>
      </div>
    </main>
  )
}
