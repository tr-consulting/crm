import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const navigate = useNavigate()
  const { signInWithPassword, signUpWithPassword } = useAuth()
  const logoUrl =
    'https://t4.ftcdn.net/jpg/06/39/87/73/360_F_639877377_5DZI29djToo5AxYCsusmtCmyCIb7ocIP.jpg'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Lösenorden matchar inte.')
        setSubmitting(false)
        return
      }
      const { error: signUpError } = await signUpWithPassword({
        email,
        password,
      })

      if (signUpError) {
        setError(signUpError.message)
        setSubmitting(false)
        return
      }

      setSubmitting(false)
      setError(
        'Konto skapat. Kolla din e-post och bekräfta kontot innan du loggar in.',
      )
      setMode('login')
      return
    }

    const { error: signInError } = await signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    navigate('/', { replace: true })
  }

  return (
    <div className="auth">
      <div className="auth__panel">
        <div className="auth__brand">
          <span className="auth__chip">CRM</span>
          <h1>{mode === 'login' ? 'Logga in' : 'Skapa konto'}</h1>
          <p>Få en enkel översikt över dialoger, utskick och kundrelationer.</p>
        </div>
        <form className="auth__form" onSubmit={handleSubmit}>
          <label>
            E-post
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="du@foretag.se"
              required
            />
          </label>
          <label>
            Lösenord
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {mode === 'signup' ? (
            <label>
              Bekräfta lösenord
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
          ) : null}
          {error ? <div className="auth__error">{error}</div> : null}
          <button type="submit" disabled={submitting}>
            {submitting
              ? mode === 'login'
                ? 'Loggar in...'
                : 'Skapar konto...'
              : mode === 'login'
                ? 'Logga in'
                : 'Skapa konto'}
          </button>
        </form>
        <div className="auth__switch">
          {mode === 'login' ? (
            <>
              Har du inget konto?{' '}
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setMode('signup')
                }}
              >
                Skapa konto
              </button>
            </>
          ) : (
            <>
              Har du redan konto?{' '}
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setMode('login')
                }}
              >
                Logga in
              </button>
            </>
          )}
        </div>
        {mode === 'signup' ? (
          <div className="auth__notice">
            Efter skapad användare skickas en bekräftelselänk till din e‑post.
            Du måste klicka länken innan första inloggning.
          </div>
        ) : null}
        <div className="auth__hint">
          Supabase-styrd routing aktiveras direkt efter inloggning.
        </div>
      </div>
      <div className="auth__side">
        <div className="auth__card">
          <img className="auth__logo" src={logoUrl} alt="TR Consulting logo" />
          <h2>TR Consulting CRM</h2>
          <ul>
            <li>Admin: skapa utskick och följ upp dialoger</li>
            <li>Medlem: få uppdateringar och svara direkt</li>
            <li>Organisation: samlad kommunikation per team</li>
          </ul>
          <div className="auth__pill-row">
            <span>Trygg inloggning</span>
            <span>Rollstyrt innehåll</span>
            <span>Snabb onboarding</span>
          </div>
        </div>
      </div>
    </div>
  )
}
