'use client'

import MainLayout from '@/components/MainLayout'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Session {
  id: number
  title: string
  created_at: string
  lead_count: number
  job_titles: string[]
  status: string
}

export default function SessionManagerPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <MainLayout>
      <div className="page-header">
        <h1 className="page-title">Session Manager</h1>
        <p className="page-subtitle">View and manage your lead generation sessions</p>
      </div>

      <div className="session-manager-controls">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Link href="/lead-engine" className="btn-primary">
          <i className="fas fa-plus"></i>
          New Session
        </Link>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading sessions...</p>
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="sessions-grid">
          {filteredSessions.map(session => (
            <div key={session.id} className="session-card">
              <div className="session-card-header">
                <h3 className="session-card-title">{session.title}</h3>
                <span className="session-card-date">
                  {new Date(session.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="session-card-body">
                <div className="session-stat">
                  <span className="stat-label">Leads Generated</span>
                  <span className="stat-value">{session.lead_count}</span>
                </div>
                <div className="session-stat">
                  <span className="stat-label">Job Titles</span>
                  <span className="stat-value">{session.job_titles?.length || 0}</span>
                </div>
              </div>
              <div className="session-card-footer">
                <Link href={`/session-manager/${session.id}`} className="btn-secondary">
                  View Details
                </Link>
                <button className="btn-outline" onClick={() => alert('Export CSV - Coming soon!')}>
                  Export CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <i className="fas fa-folder-open"></i>
          </div>
          <h3 className="empty-state-title">No Sessions Found</h3>
          <p className="empty-state-description">
            {searchTerm
              ? 'No sessions match your search criteria.'
              : 'Start generating leads to create your first session.'}
          </p>
          <Link href="/lead-engine" className="btn-primary">
            <i className="fas fa-plus"></i>
            Create New Session
          </Link>
        </div>
      )}
    </MainLayout>
  )
}
