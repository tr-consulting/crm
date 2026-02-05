import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { RichTextEditor } from '../components/RichTextEditor'

export function AdminBroadcasts() {
  const [companies, setCompanies] = useState([])
  const [profiles, setProfiles] = useState([])
  const [broadcasts, setBroadcasts] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetMode, setTargetMode] = useState('company')
  const [companyId, setCompanyId] = useState('')
  const [selectedProfiles, setSelectedProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const htmlPreview = useMemo(() => body || '', [body])

  async function loadData() {
    setLoading(true)
    const [
      { data: companyData, error: companyError },
      { data: profileData, error: profileError },
      { data: broadcastData, error: broadcastError },
    ] = await Promise.all([
      supabase.from('companies').select('id,name').order('name'),
      supabase
        .from('profiles')
        .select('id,name,email,company_id')
        .order('name'),
      supabase
        .from('broadcasts')
        .select('id,title,body,company_id,created_at')
        .order('created_at', { ascending: false }),
    ])

    if (companyError || profileError || broadcastError) {
      setError(
        companyError?.message ??
          profileError?.message ??
          broadcastError?.message ??
          'Kunde inte hämta data.',
      )
    }

    setCompanies(companyData ?? [])
    setProfiles(profileData ?? [])
    setBroadcasts(broadcastData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function toggleProfile(profileId) {
    setSelectedProfiles((prev) => ({
      ...prev,
      [profileId]: !prev[profileId],
    }))
  }

  async function handleCreateBroadcast(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!title.trim() || !body.trim()) return
    if (targetMode === 'company' && !companyId) {
      setError('Välj en organisation.')
      return
    }
    if (
      targetMode === 'members' &&
      !Object.values(selectedProfiles).some(Boolean)
    ) {
      setError('Välj minst en medlem.')
      return
    }

    setSaving(true)
    const { data: broadcast, error: insertError } = await supabase
      .from('broadcasts')
      .insert({
        title: title.trim(),
        body: body.trim(),
        company_id: targetMode === 'company' ? companyId : null,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    if (targetMode === 'members') {
      const profileIds = Object.entries(selectedProfiles)
        .filter(([, value]) => value)
        .map(([key]) => key)

      if (profileIds.length) {
        const { error: recipientError } = await supabase
          .from('broadcast_recipients')
          .insert(
            profileIds.map((profileId) => ({
              broadcast_id: broadcast.id,
              profile_id: profileId,
            })),
          )

        if (recipientError) {
          setError(recipientError.message)
        }
      }
    }

    await supabase.functions.invoke('notify-broadcast', {
      body: {
        broadcast_id: broadcast.id,
      },
    })

    setTitle('')
    setBody('')
    setCompanyId('')
    setSelectedProfiles({})
    setSuccess('Utskicket är skickat och mottagarna notifieras via e-post.')
    await loadData()
    setSaving(false)
  }

  return (
    <section className="admin__grid admin__grid--wide">
      <div className="admin__panel admin__panel--editor">
        <h2>Nytt utskick</h2>
        {error ? <div className="admin__error">{error}</div> : null}
        {success ? <div className="admin__success">{success}</div> : null}
        <form className="admin__form admin__form--editor" onSubmit={handleCreateBroadcast}>
          <label>
            Rubrik
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Nyhet till medlemmar"
              required
            />
          </label>
          <div className="admin__editor">
            <span>Innehåll</span>
            <RichTextEditor value={body} onChange={setBody} />
          </div>
          <div className="admin__target">
            <label>
              <input
                type="radio"
                name="target"
                checked={targetMode === 'company'}
                onChange={() => setTargetMode('company')}
              />
              Organisation
            </label>
            <label>
              <input
                type="radio"
                name="target"
                checked={targetMode === 'members'}
                onChange={() => setTargetMode('members')}
              />
              Enskilda medlemmar
            </label>
          </div>
          {targetMode === 'company' ? (
            <label>
              Välj organisation
              <select
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
              >
                <option value="">Välj organisation</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name ?? 'Namnlös organisation'}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="admin__recipient-list">
              {profiles.map((profile) => (
                <label key={profile.id}>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedProfiles[profile.id])}
                    onChange={() => toggleProfile(profile.id)}
                  />
                  {profile.name ?? profile.email ?? 'Namnlös medlem'}
                </label>
              ))}
            </div>
          )}
          <button type="submit" disabled={saving}>
            {saving ? 'Skickar...' : 'Skicka utskick'}
          </button>
        </form>
      </div>

      <div className="admin__panel admin__panel--preview">
        <h2>Förhandsvisning</h2>
        <div
          className="admin__preview"
          dangerouslySetInnerHTML={{ __html: htmlPreview }}
        />
      </div>

      <div className="admin__panel admin__panel--full">
        <h2>Senaste utskick</h2>
        <div className="admin__list">
          {loading ? (
            <p>Laddar utskick...</p>
          ) : broadcasts.length ? (
            broadcasts.map((broadcast) => (
              <div
                className="admin__list-item admin__list-item--stack"
                key={broadcast.id}
              >
                <strong>{broadcast.title}</strong>
                <span>
                  {broadcast.company_id
                    ? 'Organisation'
                    : 'Enskilda mottagare'}
                </span>
              </div>
            ))
          ) : (
            <p>Inga utskick ännu.</p>
          )}
        </div>
      </div>
    </section>
  )
}
