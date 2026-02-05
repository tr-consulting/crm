import { useAuth } from '../context/AuthContext'

export function RoleArea({ title, description }) {
  const { user, role, signOut } = useAuth()

  return (
    <div className="role">
      <header className="role__header">
        <div>
          <p className="role__kicker">Inloggad som</p>
          <h1>{title}</h1>
          <p className="role__sub">{description}</p>
        </div>
        <button className="role__signout" onClick={signOut} type="button">
          Logga ut
        </button>
      </header>
      <section className="role__grid">
        <div className="role__card">
          <h3>Roll</h3>
          <p>{role ?? 'Okänd'}</p>
        </div>
        <div className="role__card">
          <h3>Användare</h3>
          <p>{user?.email ?? 'Ingen e-post'}</p>
        </div>
        <div className="role__card">
          <h3>Nästa steg</h3>
          <p>Lägg till dina CRM‑widgets och data i den här ytan.</p>
        </div>
      </section>
    </div>
  )
}
