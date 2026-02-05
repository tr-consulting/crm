import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function MemberBroadcasts() {
  const { user } = useAuth()
  const [broadcasts, setBroadcasts] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [readMap, setReadMap] = useState({})

  async function loadBroadcasts() {
    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('broadcasts')
      .select('id,title,body,company_id,created_at')
      .order('created_at', { ascending: false })

    if (loadError) {
      setError(loadError.message)
    }

    setBroadcasts(data ?? [])
    if (!selectedId && data?.length) {
      setSelectedId(data[0].id)
    }
    setLoading(false)
  }

  async function loadReads() {
    const { data } = await supabase
      .from('broadcast_reads')
      .select('broadcast_id')
      .eq('profile_id', user.id)

    const map = (data ?? []).reduce((acc, row) => {
      acc[row.broadcast_id] = true
      return acc
    }, {})
    setReadMap(map)
  }

  async function markRead(broadcastId) {
    if (!broadcastId) return
    await supabase.from('broadcast_reads').insert({
      broadcast_id: broadcastId,
      profile_id: user.id,
      read_at: new Date().toISOString(),
    })
    setReadMap((prev) => ({ ...prev, [broadcastId]: true }))
  }

  useEffect(() => {
    if (!user?.id) return
    loadBroadcasts()
    loadReads()
  }, [user?.id])

  useEffect(() => {
    if (selectedId) {
      markRead(selectedId)
    }
  }, [selectedId])

  const selected = broadcasts.find((item) => item.id === selectedId)

  return (
    <section className="admin__split member__split">
      <div className="admin__panel admin__panel--list">
        <h2>Utskick</h2>
        {error ? <div className="admin__error">{error}</div> : null}
        <div className="admin__list">
          {loading ? (
            <p>Laddar utskick...</p>
          ) : broadcasts.length ? (
            broadcasts.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`admin__list-card ${
                  selectedId === item.id ? 'is-active' : ''
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="admin__list-card-title">
                  <strong>{item.title}</strong>
                  {readMap[item.id] ? null : (
                    <span className="admin__badge admin__badge--notify">ny</span>
                  )}
                </div>
                <span>
                  {new Date(item.created_at).toLocaleDateString('sv-SE')}
                </span>
              </button>
            ))
          ) : (
            <p>Inga utskick ännu.</p>
          )}
        </div>
      </div>

      <div className="admin__panel admin__panel--detail">
        <div className="admin__detail-header">
          <div>
            <h2>Utskick</h2>
            <p>Information och uppdateringar.</p>
          </div>
        </div>
        {selected ? (
          <div className="admin__detail-body member__broadcast">
            <h3>{selected.title}</h3>
            <div
              className="member__broadcast-body"
              dangerouslySetInnerHTML={{ __html: selected.body }}
            />
          </div>
        ) : (
          <p>Välj ett utskick för att läsa.</p>
        )}
      </div>
    </section>
  )
}
