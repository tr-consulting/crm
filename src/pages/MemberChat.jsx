import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function MemberChat() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [profiles, setProfiles] = useState({})
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageDraft, setMessageDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState('')
  const [unreadMap, setUnreadMap] = useState({})
  const messagesEndRef = useRef(null)

  async function loadConversations() {
    setLoading(true)
    setError('')
    const { data: members, error: memberError } = await supabase
      .from('conversation_members')
      .select('conversation_id, profile_id')
      .eq('profile_id', user.id)

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    const ids = (members ?? []).map((row) => row.conversation_id)
    if (!ids.length) {
      setConversations([])
      setLoading(false)
      return
    }

    const { data: convos } = await supabase
      .from('conversations')
      .select('id,created_at')
      .in('id', ids)
      .order('created_at', { ascending: false })

    const { data: otherMembers } = await supabase
      .from('conversation_members')
      .select('conversation_id, profile:profiles(id,name,email)')
      .in('conversation_id', ids)
      .neq('profile_id', user.id)

    const profileMap = {}
    for (const row of otherMembers ?? []) {
      if (row.profile) {
        profileMap[row.conversation_id] = row.profile
      }
    }

    setProfiles(profileMap)
    setConversations(convos ?? [])
    if (!selectedConversation && convos?.length) {
      setSelectedConversation(convos[0].id)
    }
    setLoading(false)
  }

  async function loadMessages(conversationId) {
    if (!conversationId) return
    setLoadingMessages(true)
    const { data, error: messageError } = await supabase
      .from('messages')
      .select('id,content,sender_id,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messageError) {
      setError(messageError.message)
    }

    setMessages(data ?? [])
    setLoadingMessages(false)
  }

  async function markRead(conversationId) {
    if (!conversationId) return
    await supabase.from('conversation_reads').upsert({
      profile_id: user.id,
      conversation_id: conversationId,
      last_read_at: new Date().toISOString(),
    })
  }

  async function computeUnread(conversationId) {
    const { data: readRow } = await supabase
      .from('conversation_reads')
      .select('last_read_at')
      .eq('profile_id', user.id)
      .eq('conversation_id', conversationId)
      .maybeSingle()

    const { data: latestMessage } = await supabase
      .from('messages')
      .select('created_at,sender_id')
      .eq('conversation_id', conversationId)
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

  async function refreshUnread(conversationList) {
    if (!conversationList.length) return
    const entries = await Promise.all(
      conversationList.map(async (convo) => [
        convo.id,
        await computeUnread(convo.id),
      ]),
    )
    setUnreadMap(Object.fromEntries(entries))
  }

  async function handleSendMessage() {
    if (!selectedConversation || !messageDraft.trim()) return
    setError('')
    const content = messageDraft.trim()
    setMessageDraft('')
    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConversation,
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

    await supabase.functions.invoke('notify-message', {
      body: {
        conversation_id: selectedConversation,
        sender_id: user.id,
      },
    })

    await markRead(selectedConversation)
    await refreshUnread(conversations)
  }

  useEffect(() => {
    if (!user?.id) return
    loadConversations()
  }, [user?.id])

  useEffect(() => {
    if (!selectedConversation) return
    loadMessages(selectedConversation)
    markRead(selectedConversation)
  }, [selectedConversation])

  useEffect(() => {
    if (!messagesEndRef.current) return
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (conversations.length) {
      refreshUnread(conversations)
    }
  }, [conversations])

  return (
    <section className="member member__split">
      <div className="admin__panel admin__panel--list">
        <h2>Din inkorg</h2>
        {error ? <div className="admin__error">{error}</div> : null}
        <div className="admin__list">
          {loading ? (
            <p>Laddar konversationer...</p>
          ) : conversations.length ? (
            conversations.map((convo) => {
              const other = profiles[convo.id]
              const label =
                other?.name || other?.email || 'TR Consulting (Admin)'
              const subtitle = other?.email || 'Supportteam'
              const isActive = selectedConversation === convo.id
              const unreadCount = unreadMap[convo.id] ?? 0
              return (
                <button
                  key={convo.id}
                  type="button"
                  className={`admin__list-card ${isActive ? 'is-active' : ''}`}
                  onClick={() => setSelectedConversation(convo.id)}
                >
                  <div className="admin__list-card-title">
                    <strong>{label}</strong>
                    {unreadCount ? (
                      <span className="admin__badge admin__badge--notify">
                        {unreadCount} ny
                      </span>
                    ) : null}
                  </div>
                  <span>{subtitle}</span>
                </button>
              )
            })
          ) : (
            <p>Inga konversationer ännu.</p>
          )}
        </div>
      </div>

      <div className="admin__panel admin__panel--detail">
        <div className="admin__detail-header">
          <div>
            <h2>Chat</h2>
            <p>Din dialog med TR Consulting.</p>
          </div>
        </div>

        {selectedConversation ? (
          <div className="admin__detail-body admin__chat member__chat">
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
              className="admin__chat-input member__chat-input"
              onSubmit={(event) => {
                event.preventDefault()
                handleSendMessage()
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
        ) : (
          <p>Välj en konversation för att börja.</p>
        )}
      </div>
    </section>
  )
}
