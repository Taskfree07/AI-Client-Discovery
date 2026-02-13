'use client'

import MainLayout from '@/components/MainLayout'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface SessionDetail {
  id: number
  name: string
  created_at: string
  updated_at: string
  status: string
  total_leads: number
  total_pocs: number
  total_emails: number
  job_titles: string[]
  locations: string[]
  industries: string[]
  company_sizes: string[]
}

interface Lead {
  id: number
  company: {
    name: string
    domain: string
    industry: string
    size: number
    location: string
    linkedin_url: string
    website: string
  }
  job_opening: string
  source: string
  source_url: string
  pocs: Array<{
    name: string
    title: string
    email: string
    phone?: string
    linkedin_url?: string
  }>
  status: string
  created_at: string
}

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id

  const [session, setSession] = useState<SessionDetail | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) return

    const controller = new AbortController()

    async function fetchSessionDetails() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          signal: controller.signal
        })
        if (response.ok) {
          const data = await response.json()
          setSession(data.session)
          setLeads(data.leads || [])
        } else {
          setError('Session not found')
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return // Component unmounted, ignore
        console.error('Error loading session:', err)
        setError('Failed to load session details')
      } finally {
        setLoading(false)
      }
    }

    fetchSessionDetails()

    return () => controller.abort() // Cleanup: cancel fetch if component unmounts
  }, [sessionId])

  const loadSessionDetails = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setSession(data.session)
        setLeads(data.leads || [])
      } else {
        setError('Session not found')
      }
    } catch (err) {
      console.error('Error loading session:', err)
      setError('Failed to load session details')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (leads.length === 0) return

    const headers = ['Company', 'Industry', 'Size', 'Location', 'Job Opening', 'POC Name', 'POC Title', 'Email', 'Phone', 'LinkedIn']
    const rows: string[][] = []

    for (const lead of leads) {
      if (lead.pocs.length > 0) {
        for (const poc of lead.pocs) {
          rows.push([
            lead.company.name,
            lead.company.industry || '',
            String(lead.company.size || ''),
            lead.company.location || '',
            lead.job_opening || '',
            poc.name,
            poc.title,
            poc.email,
            poc.phone || '',
            poc.linkedin_url || ''
          ])
        }
      } else {
        rows.push([
          lead.company.name,
          lead.company.industry || '',
          String(lead.company.size || ''),
          lead.company.location || '',
          lead.job_opening || '',
          '', '', '', '', ''
        ])
      }
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${session?.name || 'leads'}_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  const totalPocs = leads.reduce((sum, lead) => sum + lead.pocs.length, 0)

  if (loading) {
    return (
      <MainLayout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading session details...</p>
        </div>
      </MainLayout>
    )
  }

  if (error || !session) {
    return (
      <MainLayout>
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h3 className="empty-state-title">{error || 'Session not found'}</h3>
          <Link href="/session-manager" className="btn-primary" style={{ marginTop: '16px' }}>
            Back to Sessions
          </Link>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="page-header-row">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn-secondary"
              onClick={() => router.push('/session-manager')}
              style={{ padding: '8px 12px', minWidth: 'auto' }}
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1 className="page-title">{session.name}</h1>
              <p className="page-subtitle">
                Created {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' '} - {' '}
                <span className={`session-status-badge status-${session.status}`}>{session.status}</span>
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={exportCSV} disabled={leads.length === 0}>
            <i className="fas fa-download"></i>
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Total Leads</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--title-color)' }}>{leads.length}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Total Contacts</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--title-color)' }}>{totalPocs}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Job Titles</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--title-color)' }}>{session.job_titles?.length || 0}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Regions</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--title-color)' }}>{session.locations?.length || 0}</div>
        </div>
      </div>

      {/* Search Parameters */}
      {(session.job_titles?.length > 0 || session.locations?.length > 0 || session.industries?.length > 0) && (
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--title-color)', marginBottom: '14px' }}>Search Parameters</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            {session.job_titles?.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Job Titles</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {session.job_titles.map((t, i) => (
                    <span key={i} className="panel-tag">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {session.locations?.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Locations</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {session.locations.map((l, i) => (
                    <span key={i} className="panel-tag">{l}</span>
                  ))}
                </div>
              </div>
            )}
            {session.industries?.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Industries</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {session.industries.map((ind, i) => (
                    <span key={i} className="panel-tag">{ind}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leads Table */}
      {leads.length > 0 ? (
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--title-color)', margin: 0 }}>
              Leads <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>({leads.length})</span>
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Job Opening</th>
                  <th>POC Name</th>
                  <th>POC Title</th>
                  <th>Email</th>
                  <th>LinkedIn</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, leadIndex) =>
                  lead.pocs.length > 0
                    ? lead.pocs.map((poc, pocIndex) => (
                        <tr key={`${leadIndex}-${pocIndex}`}>
                          <td className="company-cell">
                            <div className="company-name">{lead.company.name}</div>
                            <div className="company-meta">
                              {lead.company.industry}{lead.company.size ? ` - ${lead.company.size} employees` : ''}
                            </div>
                          </td>
                          <td>{lead.job_opening || '—'}</td>
                          <td>
                            <div className="poc-name">{poc.name}</div>
                          </td>
                          <td>{poc.title || '—'}</td>
                          <td>
                            <a href={`mailto:${poc.email}`} className="email-link">{poc.email}</a>
                          </td>
                          <td>
                            {poc.linkedin_url ? (
                              <a href={poc.linkedin_url} target="_blank" rel="noopener noreferrer" className="linkedin-link">
                                Profile
                              </a>
                            ) : '—'}
                          </td>
                        </tr>
                      ))
                    : (
                        <tr key={`${leadIndex}-nopoc`}>
                          <td className="company-cell">
                            <div className="company-name">{lead.company.name}</div>
                            <div className="company-meta">
                              {lead.company.industry}{lead.company.size ? ` - ${lead.company.size} employees` : ''}
                            </div>
                          </td>
                          <td>{lead.job_opening || '—'}</td>
                          <td colSpan={4} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No contacts found</td>
                        </tr>
                      )
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <i className="fas fa-users"></i>
          </div>
          <h3 className="empty-state-title">No leads in this session</h3>
          <p className="empty-state-description">This session has no leads yet.</p>
        </div>
      )}
    </MainLayout>
  )
}
