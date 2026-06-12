import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSubmit() {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await signIn(email, password)
      } else {
        if (!inviteCode.trim()) throw new Error('Invite code is required')
        await signUp(email, password, inviteCode)
        setSuccess('Account created! You are now logged in.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-stone-900 px-6 pt-16 pb-10 text-center">
        <div className="text-5xl mb-3">🥗</div>
        <h1 className="text-2xl font-bold text-white">Meal Buddy</h1>
        <p className="text-stone-400 text-sm mt-1">Your personal meal prep companion</p>
      </div>

      {/* Card */}
      <div className="flex-1 px-5 -mt-4">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-stone-100">
            {['login', 'signup'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(''); setSuccess('') }}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  tab === t ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-stone-400'
                }`}
              >
                {t === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div className="px-5 py-6 space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 block">Password</label>
              <input
                type="password"
                placeholder={tab === 'signup' ? 'Min 6 characters' : 'Your password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Invite code (signup only) */}
            {tab === 'signup' && (
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 block">Invite Code</label>
                <input
                  type="text"
                  placeholder="Enter your invite code"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 tracking-widest font-mono"
                />
                <p className="text-xs text-stone-400 mt-1.5">Meal Buddy is invite-only. Ask Jadon for a code.</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="text-emerald-700 text-sm">{success}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !email || !password}
              className={`w-full py-4 rounded-2xl font-semibold text-base transition-all ${
                loading || !email || !password
                  ? 'bg-stone-200 text-stone-400'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {loading ? 'Please wait...' : tab === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6 px-4">
          Meal Buddy is a private app. Access is by invite only.
        </p>
      </div>
    </div>
  )
}
