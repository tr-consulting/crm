import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyCompany = {
  name: '',
  org_number: '',
  domain: '',
  contact_email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  notes: '',
}

export function AdminCompanies() {
  const [companies, setCompanies] = useState([])
  const [profiles, setProfiles] = useState([])
  const [drafts, setDrafts] = useState({})
  const [companyDraft, setCompanyDraft] = useState(emptyCompany)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [savingNew, setSavingNew] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  async function loadCompanies() {
    setLoading(true)
    setError('')
    const [
      { data: companyData, error: companyError },
      { data: profileData, error: profileError },
    ] = await Promise.all([
      supabase
        .from('companies')
        .select(
          'id,name,org_number,domain,contact_email,phone,address,city,country,notes,created_at',
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id,name,email,role,company_id')
        .order('created_at', { ascending: false }),
    ])

    if (companyError || profileError) {
      setError(
        companyError?.message ?? profileError?.message ?? 'Kunde inte hämta data.',
      )
    }

    const normalized = companyData ?? []
    setCompanies(normalized)
    setProfiles(profileData ?? [])
    setDrafts(
      normalized.reduce((acc, company) => {
        acc[company.id] = {
          name: company.name ?? '',
          org_number: company.org_number ?? '',
          domain: company.domain ?? '',
          contact_email: company.contact_email ?? '',
          phone: company.phone ?? '',
          address: company.address ?? '',
          city: company.city ?? '',
          country: company.country ?? '',
          notes: company.notes ?? '',
        }
        return acc
      }, {}),
    )
    setLoading(false)
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  function updateDraft(companyId, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        [field]: value,
      },
    }))
  }

  async function handleCreateCompany(event) {
    event.preventDefault()
    if (!companyDraft.name.trim()) return
    setSavingNew(true)
    setError('')
    const { error: insertError } = await supabase.from('companies').insert({
      name: companyDraft.name.trim(),
      org_number: companyDraft.org_number.trim() || null,
      domain: companyDraft.domain.trim() || null,
      contact_email: companyDraft.contact_email.trim() || null,
      phone: companyDraft.phone.trim() || null,
      address: companyDraft.address.trim() || null,
      city: companyDraft.city.trim() || null,
      country: companyDraft.country.trim() || null,
      notes: companyDraft.notes.trim() || null,
    })

    if (insertError) {
      setError(insertError.message)
      setSavingNew(false)
      return
    }

    setCompanyDraft(emptyCompany)
    await loadCompanies()
    setSavingNew(false)
  }

  async function handleSaveCompany(companyId) {
    const draft = drafts[companyId]
    if (!draft) return
    setSavingId(companyId)
    setError('')
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        name: draft.name.trim() || null,
        org_number: draft.org_number.trim() || null,
        domain: draft.domain.trim() || null,
        contact_email: draft.contact_email.trim() || null,
        phone: draft.phone.trim() || null,
        address: draft.address.trim() || null,
        city: draft.city.trim() || null,
        country: draft.country.trim() || null,
        notes: draft.notes.trim() || null,
      })
      .eq('id', companyId)

    if (updateError) {
      setError(updateError.message)
      setSavingId(null)
      return
    }

    await loadCompanies()
    setSavingId(null)
  }

  const membersByCompany = profiles.reduce((acc, profile) => {
    if (!profile.company_id) return acc
    if (!acc[profile.company_id]) acc[profile.company_id] = []
    acc[profile.company_id].push(profile)
    return acc
  }, {})

  return (
    <section className="admin__grid">
      <div className="admin__panel">
        <h2>Skapa organisation</h2>
        <form className="admin__form" onSubmit={handleCreateCompany}>
          <label>
            Organisationsnamn
            <input
              value={companyDraft.name}
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="TR Consulting"
              required
            />
          </label>
          <label>
            Organisationsnummer
            <input
              value={companyDraft.org_number}
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  org_number: event.target.value,
                }))
              }
              placeholder="556677-8899"
            />
          </label>
          <label>
            Domän
            <input
              value={companyDraft.domain}
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  domain: event.target.value,
                }))
              }
              placeholder="tr-consulting.se"
            />
          </label>
          <label>
            Kontaktmail
            <input
              type="email"
              value={companyDraft.contact_email}
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  contact_email: event.target.value,
                }))
              }
              placeholder="info@tr-consulting.se"
            />
          </label>
          <label>
            Telefon
            <input
              value={companyDraft.phone}
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  phone: event.target.value,
                }))
              }
              placeholder="+46..."
            />
          </label>
          <label>
            Address
            <input
              value={companyDraft.address}
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  address: event.target.value,
                }))
              }
              placeholder="Storgatan 1"
            />
          </label>
          <label>
            Stad
            <input
              value={companyDraft.city}
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  city: event.target.value,
                }))
              }
              placeholder="Stockholm"
            />
          </label>
          <label>
            Land
            <input
              value={companyDraft.country}
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  country: event.target.value,
                }))
              }
              placeholder="Sverige"
            />
          </label>
          <label>
            Noteringar
            <textarea
              rows={3}
              value={companyDraft.notes}
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              placeholder="Kort beskrivning..."
            />
          </label>
          <button type="submit" disabled={savingNew}>
            {savingNew ? 'Sparar...' : 'Skapa'}
          </button>
        </form>
        {error ? <div className="admin__error">{error}</div> : null}
      </div>

      <div className="admin__panel">
        <h2>Organisationer</h2>
        <div className="admin__list">
          {loading ? (
            <p>Laddar organisationer...</p>
          ) : companies.length ? (
            companies.map((company) => {
              const draft = drafts[company.id] ?? emptyCompany
              const isOpen = expandedId === company.id
              const members = membersByCompany[company.id] ?? []
              return (
                <div className="admin__accordion" key={company.id}>
                  <button
                    type="button"
                    className="admin__accordion-trigger"
                    onClick={() =>
                      setExpandedId((prev) => (prev === company.id ? null : company.id))
                    }
                  >
                    <strong>{company.name ?? 'Namnlös organisation'}</strong>
                    <span>{isOpen ? 'Stäng' : 'Visa detaljer'}</span>
                  </button>
                  {isOpen ? (
                    <div className="admin__accordion-body">
                      <div className="admin__fields admin__fields--companies">
                        <label>
                          Namn
                          <input
                            value={draft.name}
                            onChange={(event) =>
                              updateDraft(company.id, 'name', event.target.value)
                            }
                          />
                        </label>
                        <label>
                          Organisationsnummer
                          <input
                            value={draft.org_number}
                            onChange={(event) =>
                              updateDraft(
                                company.id,
                                'org_number',
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <label>
                          Domän
                          <input
                            value={draft.domain}
                            onChange={(event) =>
                              updateDraft(company.id, 'domain', event.target.value)
                            }
                          />
                        </label>
                        <label>
                          Kontaktmail
                          <input
                            value={draft.contact_email}
                            onChange={(event) =>
                              updateDraft(
                                company.id,
                                'contact_email',
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <label>
                          Telefon
                          <input
                            value={draft.phone}
                            onChange={(event) =>
                              updateDraft(company.id, 'phone', event.target.value)
                            }
                          />
                        </label>
                        <label>
                          Address
                          <input
                            value={draft.address}
                            onChange={(event) =>
                              updateDraft(company.id, 'address', event.target.value)
                            }
                          />
                        </label>
                        <label>
                          Stad
                          <input
                            value={draft.city}
                            onChange={(event) =>
                              updateDraft(company.id, 'city', event.target.value)
                            }
                          />
                        </label>
                        <label>
                          Land
                          <input
                            value={draft.country}
                            onChange={(event) =>
                              updateDraft(company.id, 'country', event.target.value)
                            }
                          />
                        </label>
                        <label className="admin__fields--full">
                          Noteringar
                          <textarea
                            rows={2}
                            value={draft.notes}
                            onChange={(event) =>
                              updateDraft(company.id, 'notes', event.target.value)
                            }
                          />
                        </label>
                      </div>
                      <div className="admin__subsection">
                        <h3>Kopplade användare</h3>
                        {members.length ? (
                          <ul>
                            {members.map((member) => (
                              <li key={member.id}>
                                <strong>{member.name ?? 'Namnlös'}</strong>
                                <span>{member.email ?? 'Ingen e-post'}</span>
                                <span className="admin__badge">
                                  {member.role ?? 'okänd'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>Inga användare kopplade ännu.</p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="admin__save"
                        onClick={() => handleSaveCompany(company.id)}
                        disabled={savingId === company.id}
                      >
                        {savingId === company.id ? 'Sparar...' : 'Spara'}
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })
          ) : (
            <p>Inga organisationer ännu.</p>
          )}
        </div>
      </div>
    </section>
  )
}
