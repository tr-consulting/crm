import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MemberBroadcasts } from './MemberBroadcasts'
import { MemberChat } from './MemberChat'

export function MemberHome() {
  const [activeTab, setActiveTab] = useState('chat')
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="member">
      <header className="member__header">
        <div>
          <h1>Medlemsyta</h1>
          <p>Chatta med oss eller läs senaste utskick.</p>
        </div>
        <button type="button" className="member__logout" onClick={handleLogout}>
          Logga ut
        </button>
      </header>
      <nav className="member__tabs">
        <button
          type="button"
          className={activeTab === 'chat' ? 'active' : ''}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          type="button"
          className={activeTab === 'broadcasts' ? 'active' : ''}
          onClick={() => setActiveTab('broadcasts')}
        >
          Utskick
        </button>
      </nav>
      {activeTab === 'broadcasts' ? (
        <MemberBroadcasts />
      ) : (
        <MemberChat />
      )}
    </div>
  )
}
