import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function AdminUsers() {
  const { user } = useAuth()
  const [companies, setCompanies] = useState([])
  const [profiles, setProfiles] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')
  const [creatingChatId, setCreatingChatId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [activeTab, setActiveTab] = useState('chat')
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageDraft, setMessageDraft] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [unreadMap, setUnreadMap] = useState({})
  const [notifyStatus, setNotifyStatus] = useState('')
  const messagesEndRef = useRef(null)

  const roleOptions = ['admin', 'member']

  const companyOptions = useMemo(
    () =>
      companies.map((company) => ({
        value: company.id,
        label: company.name ?? 'Namnlös organisation',
      })),
    [companies],
  )

  const companyById = useMemo(
    () =>
      companies.reduce((acc, company) => {
        acc[company.id] = company
        return acc
      }, {}),
    [companies],
  )

  async function loadData() {
    setLoading(true)
    setError('')
    const [
      { data: companyData, error: companyError },
      { data: profileData, error: profileError },
    ] = await Promise.all([
      supabase
        .from('companies')
        .select('id,name,created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id,name,email,role,phone,company_id,created_at')
        .order('created_at', { ascending: false }),
    ])

    if (companyError || profileError) {
      setError(
        companyError?.message ?? profileError?.message ?? 'Kunde inte hämta data.',
      )
    }

    const normalizedProfiles = profileData ?? []
    setCompanies(companyData ?? [])
    setProfiles(normalizedProfiles)
    setDrafts(
      normalizedProfiles.reduce((acc, profile) => {
        acc[profile.id] = {
          name: profile.name ?? '',
          email: profile.email ?? '',
          phone: profile.phone ?? '',
          role: profile.role ?? 'member',
          company_id: profile.company_id ?? '',
        }
        return acc
      }, {}),
    )
    if (!selectedId && normalizedProfiles.length) {
      setSelectedId(normalizedProfiles[0].id)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function updateDraft(profileId, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [profileId]: {
        ...prev[profileId],
        [field]: value,
      },
    }))
  }

  async function handleSaveProfile(profileId) {
    const draft = drafts[profileId]
    if (!draft) return
    setSavingId(profileId)
    setError('')
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        name: draft.name.trim() || null,
        phone: draft.phone.trim() || null,
        role: draft.role,
        company_id: draft.company_id || null,
      })
      .eq('id', profileId)

    if (updateError) {
      setError(updateError.message)
      setSavingId(null)
      return
    }

    await loadData()
    setSavingId(null)
  }

  async function findConversation(profileId) {
    const { data, error: memberError } = await supabase
      .from('conversation_members')
      .select('conversation_id, profile_id')
      .in('profile_id', [user.id, profileId])

    if (memberError) {
      setError(memberError.message)
      return null
    }

    const byConversation = new Map()
    for (const row of data ?? []) {
      if (!byConversation.has(row.conversation_id)) {
        byConversation.set(row.conversation_id, new Set())
      }
      byConversation.get(row.conversation_id).add(row.profile_id)
    }

    for (const [conversationIdValue, members] of byConversation.entries()) {
      if (members.has(user.id) && members.has(profileId)) {
        return conversationIdValue
      }
    }

    return null
  }

  async function loadMessages(conversationIdValue) {
    if (!conversationIdValue) return
    setLoadingMessages(true)
    const { data, error: messageError } = await supabase
      .from('messages')
      .select('id,content,sender_id,created_at')
      .eq('conversation_id', conversationIdValue)
      .order('created_at', { ascending: true })

    if (messageError) {
      setError(messageError.message)
    }

    setMessages(data ?? [])
    setLoadingMessages(false)
  }

  async function markRead(conversationIdValue) {
    if (!conversationIdValue) return
    await supabase.from('conversation_reads').upsert({
      profile_id: user.id,
      conversation_id: conversationIdValue,
      last_read_at: new Date().toISOString(),
    })
  }

  async function computeUnreadForProfile(profileId) {
    const conversationIdValue = await findConversation(profileId)
    if (!conversationIdValue) return 0

    const { data: readRow } = await supabase
      .from('conversation_reads')
      .select('last_read_at')
      .eq('profile_id', user.id)
      .eq('conversation_id', conversationIdValue)
      .maybeSingle()

    const { data: latestMessage } = await supabase
      .from('messages')
      .select('created_at,sender_id')
      .eq('conversation_id', conversationIdValue)
      .neq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latestMessage) return 0

    if (!readRow?.last_read_at) return 1

    return new Date(latestMessage.created_at) > new Date(readRow.last_read_at)
      ? 1
      : 0
  }

  async function refreshUnread(profilesList) {
    if (!profilesList.length) return
    const entries = await Promise.all(
      profilesList.map(async (profile) => [
        profile.id,
        await computeUnreadForProfile(profile.id),
      ]),
    )
    setUnreadMap(Object.fromEntries(entries))
  }

  async function handleStartConversation(profile) {
    if (!user?.id) return
    setCreatingChatId(profile.id)
    setError('')
    let foundConversationId = await findConversation(profile.id)

    if (!foundConversationId) {
      const { data: conversation, error: convoError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          company_id: profile.company_id || null,
        })
        .select('id')
        .single()

      if (convoError) {
        setError(convoError.message)
        setCreatingChatId(null)
        return
      }

      const { error: memberError } = await supabase
        .from('conversation_members')
        .insert([
          { conversation_id: conversation.id, profile_id: user.id },
          { conversation_id: conversation.id, profile_id: profile.id },
        ])

      if (memberError) {
        setError(memberError.message)
        setCreatingChatId(null)
        return
      }

      foundConversationId = conversation.id
    }

    setConversationId(foundConversationId)
    await loadMessages(foundConversationId)
    await markRead(foundConversationId)
    setCreatingChatId(null)
  }

  async function handleSendMessage(profile) {
    if (!conversationId || !messageDraft.trim()) return
    setError('')
    const content = messageDraft.trim()
    setMessageDraft('')
    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      })
      .select('id,content,sender_id,created_at')
      .single()

    if (insertError) {
      setError(insertError.message)
      return
    }

    setMessages((prev) => [...prev, data])

    const { error: notifyError } = await supabase.functions.invoke(
      'notify-message',
      {
        body: {
          conversation_id: conversationId,
          sender_id: user.id,
        },
      },
    )

    if (notifyError) {
      setError(notifyError.message)
    } else {
      setNotifyStatus('Användaren notifierad om nytt meddelande.')
      setTimeout(() => setNotifyStatus(''), 4000)
    }

    await markRead(conversationId)
    await refreshUnread(profiles)
  }

  useEffect(() => {
    if (!selectedId) return
    const selectedProfile = profiles.find((profile) => profile.id === selectedId)
    if (!selectedProfile) return
    setConversationId(null)
    setMessages([])
    handleStartConversation(selectedProfile)
  }, [selectedId])

  useEffect(() => {
    if (!messagesEndRef.current) return
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (profiles.length) {
      refreshUnread(profiles)
    }
  }, [profiles])

  return (
    <section className="admin__split">
      <div className="admin__panel admin__panel--list">
        <h2>Användare</h2>
        {error ? <div className="admin__error">{error}</div> : null}
        <div className="admin__list">
          {loading ? (
            <p>Laddar användare...</p>
          ) : profiles.length ? (
            profiles.map((profile) => {
              const companyName =
                companyById[profile.company_id]?.name ?? 'Ingen organisation'
              const isActive = selectedId === profile.id
              const unreadCount = unreadMap[profile.id] ?? 0
              return (
                <button
                  key={profile.id}
                  type="button"
                  className={`admin__list-card ${isActive ? 'is-active' : ''}`}
                  onClick={() => setSelectedId(profile.id)}
                >
                  <div className="admin__list-card-title">
                    <strong>
                      {profile.name ?? 'Namnlös användare'} – {companyName}
                    </strong>
                    {unreadCount ? (
                      <span className="admin__badge admin__badge--notify">
                        {unreadCount} ny
                      </span>
                    ) : null}
                  </div>
                  <span>{profile.email ?? 'Ingen e-post'}</span>
                </button>
              )
            })
          ) : (
            <p>Inga profiler hittade.</p>
          )}
        </div>
      </div>

      <div className="admin__panel admin__panel--detail">
        <div className="admin__detail-header">
          <div>
            <h2>Detaljer</h2>
            <p>Hantera profil och kommunikation.</p>
          </div>
          <div className="admin__tabs admin__tabs--inline">
            <button
              type="button"
              className={activeTab === 'chat' ? 'active' : ''}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button
              type="button"
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => setActiveTab('profile')}
            >
              Profil
            </button>
          </div>
        </div>

        {selectedId ? (
          (() => {
            const profile = profiles.find((item) => item.id === selectedId)
            if (!profile) return null
            const draft = drafts[profile.id]

            return activeTab === 'profile' ? (
              <div className="admin__detail-body">
                <div className="admin__fields">
                  <label>
                    Namn
                    <input
                      value={draft?.name ?? ''}
                      onChange={(event) =>
                        updateDraft(profile.id, 'name', event.target.value)
                      }
                    />
                  </label>
                  <label>
                    E-post
                    <input value={draft?.email ?? ''} disabled />
                  </label>
                  <label>
                    Telefon
                    <input
                      value={draft?.phone ?? ''}
                      onChange={(event) =>
                        updateDraft(profile.id, 'phone', event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Roll
                    <select
                      value={draft?.role ?? 'member'}
                      onChange={(event) =>
                        updateDraft(profile.id, 'role', event.target.value)
                      }
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Organisation
                    <select
                      value={draft?.company_id ?? ''}
                      onChange={(event) =>
                        updateDraft(profile.id, 'company_id', event.target.value)
                      }
                    >
                      <option value="">Ingen organisation</option>
                      {companyOptions.map((company) => (
                        <option key={company.value} value={company.value}>
                          {company.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="admin__actions">
                  <button
                    type="button"
                    className="admin__save"
                    onClick={() => handleSaveProfile(profile.id)}
                    disabled={savingId === profile.id}
                  >
                    {savingId === profile.id ? 'Sparar...' : 'Spara'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="admin__detail-body admin__chat">
                {notifyStatus ? (
                  <div className="admin__success">{notifyStatus}</div>
                ) : null}
                <div className="admin__chat-header">
                  <div>
                    <strong>{profile.name ?? 'Namnlös användare'}</strong>
                    <span>{profile.email ?? 'Ingen e-post'}</span>
                  </div>
                  <button
                    type="button"
                    className="admin__ghost"
                    onClick={() => handleStartConversation(profile)}
                    disabled={creatingChatId === profile.id}
                  >
                    {creatingChatId === profile.id
                      ? 'Skapar chat...'
                      : 'Ny konversation'}
                  </button>
                </div>
                <div className="admin__chat-thread">
                  {loadingMessages ? (
                    <p>Laddar meddelanden...</p>
                  ) : messages.length ? (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`admin__chat-bubble ${
                          msg.sender_id === user.id ? 'is-admin' : 'is-user'
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))
                  ) : (
                    <p>Inga meddelanden ännu.</p>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form
                  className="admin__chat-input"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleSendMessage(profile)
                  }}
                >
                  <input
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    placeholder="Skriv ett meddelande..."
                  />
                  <button type="submit">Skicka</button>
                </form>
              </div>
            )
          })()
        ) : (
          <p>Välj en användare för att se detaljer.</p>
        )}
      </div>
    </section>
  )
}
