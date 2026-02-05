import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AdminLayout() {
  const { signOut } = useAuth()

  return (
    <div className="admin">
      <header className="admin__header">
        <div>
          <p className="admin__kicker">Admin</p>
          <h1>Administration</h1>
          <p>Hantera organisationer, roller och användare.</p>
        </div>
        <button className="admin__refresh" type="button" onClick={signOut}>
          Logga ut
        </button>
      </header>

      <nav className="admin__tabs">
        <NavLink to="/admin/companies" end>
          Organisationer
        </NavLink>
        <NavLink to="/admin/users">Användare</NavLink>
        <NavLink to="/admin/broadcasts">Utskick</NavLink>
      </nav>

      <Outlet />
    </div>
  )
}
