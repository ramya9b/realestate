import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { Field, TextInput } from '../components/form/fields'
import { useAuth } from '../lib/auth'

// Build sheet P1-25.

export default function SignIn() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()

  const [mode, setMode] = useState<'in' | 'up'>(params.get('mode') === 'up' ? 'up' : 'in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  const next = params.get('next') ?? '/post'

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'up') {
        await signUp(email, password, fullName, phone)
        // Supabase may require email confirmation depending on project settings.
        setCheckEmail(true)
      } else {
        await signIn(email, password)
        navigate(next)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const ready =
    email !== '' && password.length >= 6 && (mode === 'in' || (fullName !== '' && phone !== ''))

  if (checkEmail) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">📬</div>
            <h1 className="font-display font-bold text-2xl mb-2" style={{ color: '#1A2B4A' }}>
              Check your email
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              We sent a confirmation link to {email}. Open it, then sign in.
            </p>
            <button
              onClick={() => { setCheckEmail(false); setMode('in') }}
              className="btn-primary"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-16 px-4">
        <div className="max-w-sm mx-auto">
          <h1 className="font-display font-bold text-2xl text-center mb-1" style={{ color: '#1A2B4A' }}>
            {mode === 'up' ? 'Create an account' : 'Sign in'}
          </h1>
          <p className="text-gray-400 text-sm text-center mb-8">
            {mode === 'up'
              ? 'ಖಾತೆ ತೆರೆಯಿರಿ — free, and posting stays free'
              : 'ಸೈನ್ ಇನ್ ಮಾಡಿ'}
          </p>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-4">
            {mode === 'up' && (
              <>
                <Field label="Your name" labelKn="ಹೆಸರು" required>
                  <TextInput value={fullName} onChange={setFullName} placeholder="Full name" />
                </Field>
                <Field label="Mobile number" labelKn="ಮೊಬೈಲ್" required>
                  <TextInput type="tel" value={phone} onChange={setPhone} placeholder="10-digit number" />
                </Field>
              </>
            )}

            <Field label="Email" required>
              <TextInput value={email} onChange={setEmail} placeholder="you@example.com" />
            </Field>

            <Field
              label="Password"
              required
              hint={mode === 'up' ? 'At least 6 characters.' : undefined}
            >
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <div className="rounded-xl p-3 text-sm" style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#991B1B' }}>
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={!ready || busy}
              onClick={submit}
              className="w-full text-white font-display font-bold py-3 rounded-xl disabled:opacity-40"
              style={{ background: '#1A2B4A', border: 'none', cursor: 'pointer' }}
            >
              {busy ? 'Please wait…' : mode === 'up' ? 'Create account' : 'Sign in'}
            </button>

            <p className="text-center text-sm text-gray-500">
              {mode === 'up' ? 'Already have an account? ' : 'New here? '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'up' ? 'in' : 'up'); setError(null) }}
                className="font-semibold bg-transparent border-none cursor-pointer p-0"
                style={{ color: '#1A2B4A' }}
              >
                {mode === 'up' ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Signing in by email for now. <Link to="/" style={{ color: '#1A2B4A' }}>Back to home</Link>
          </p>
        </div>
      </div>
    </>
  )
}
