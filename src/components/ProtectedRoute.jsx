import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from './Loading'

export function ProtectedRoute({ children }) {
  const { session, sessionLoading } = useAuth()

  if (sessionLoading) return <Loading />
  if (!session) return <Navigate to="/login" replace />

  return children
}
