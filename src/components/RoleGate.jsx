import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from './Loading'

export function RoleGate({ allowedRoles, children }) {
  const { role, roleLoading, refreshRole } = useAuth()
  const [retrying, setRetrying] = useState(false)
  const [retried, setRetried] = useState(false)

  useEffect(() => {
    if (roleLoading || retried || role) return
    setRetrying(true)
    refreshRole()
      .catch(() => {})
      .finally(() => {
        setRetrying(false)
        setRetried(true)
      })
  }, [roleLoading, retried, role, refreshRole])

  if (roleLoading || retrying) return <Loading />
  if (!role) return <Navigate to="/not-authorized" replace />
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/not-authorized" replace />
  }

  return children
}
