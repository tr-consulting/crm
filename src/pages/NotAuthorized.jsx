import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function NotAuthorized() {
  const { role, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="not-authorized">
      <div className="not-authorized__panel">
        <h1>Ingen åtkomst</h1>
        <p>
          Din roll <strong>{role ?? 'okänd'}</strong> saknar rättigheter för den
          här sidan.
        </p>
        <div className="not-authorized__actions">
          <Link to="/">Till startsidan</Link>
          <button type="button" onClick={handleLogout}>
            Logga ut
          </button>
        </div>
      </div>
    </div>
  )
}
