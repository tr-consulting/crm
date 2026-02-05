import { useAuth } from '../context/AuthContext'

export function DebugPanel() {
  const { user, role, roleError, sessionLoading, roleLoading, session } =
    useAuth()

  return (
    <div className="debug-panel">
      <div className="debug-panel__title">Auth Debug</div>
      <div className="debug-panel__row">
        <span>Status</span>
        <strong>
          {sessionLoading ? 'auth-loading' : session ? 'signed-in' : 'signed-out'}
        </strong>
      </div>
      <div className="debug-panel__row">
        <span>Role status</span>
        <strong>{roleLoading ? 'role-loading' : 'ready'}</strong>
      </div>
      <div className="debug-panel__row">
        <span>User ID</span>
        <strong>{user?.id ?? 'null'}</strong>
      </div>
      <div className="debug-panel__row">
        <span>Email</span>
        <strong>{user?.email ?? 'null'}</strong>
      </div>
      <div className="debug-panel__row">
        <span>Role</span>
        <strong>{role ?? 'null'}</strong>
      </div>
      <div className="debug-panel__row">
        <span>Role error</span>
        <strong>{roleError ?? 'null'}</strong>
      </div>
    </div>
  )
}
