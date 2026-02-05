import './App.css'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Loading } from './components/Loading'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RoleGate } from './components/RoleGate'
import { useAuth } from './context/AuthContext'
import { AdminBroadcasts } from './pages/AdminBroadcasts'
import { AdminCompanies } from './pages/AdminCompanies'
import { AdminLayout } from './pages/AdminLayout'
import { AdminUsers } from './pages/AdminUsers'
import { Login } from './pages/Login'
import { NotAuthorized } from './pages/NotAuthorized'
import { MemberHome } from './pages/MemberHome'
import { RoleArea } from './pages/RoleArea'

function App() {
  const { role, sessionLoading, roleLoading } = useAuth()

  const roleRoutes = {
    admin: '/admin',
    member: '/member',
  }

  const roleDestination = roleRoutes[role] ?? null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/not-authorized" element={<NotAuthorized />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {sessionLoading || roleLoading ? (
                <Loading />
              ) : roleDestination ? (
                <Navigate to={roleDestination} replace />
              ) : role == null ? (
                <Loading />
              ) : (
                <Navigate to="/not-authorized" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleGate allowedRoles={['admin']}>
                <AdminLayout />
              </RoleGate>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/companies" replace />} />
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="broadcasts" element={<AdminBroadcasts />} />
        </Route>
        <Route
          path="/member"
          element={
            <ProtectedRoute>
              <RoleGate allowedRoles={['member']}>
                <MemberHome />
              </RoleGate>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
