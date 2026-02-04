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
  const [activeFilter, setActiveFilter] = useState('today')

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const data = await response.json()
        // Ensure data is an array
        if (Array.isArray(data)) {
          setSessions(data)
        } else if (data && Array.isArray(data.sessions)) {
          setSessions(data.sessions)
        } else {
          console.warn('API returned non-array data:', data)
          setSessions([])
        }
      } else {
        console.error('Failed to load sessions:', response.status)
        setSessions([])
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const filteredSessions = Array.isArray(sessions)
    ? sessions.filter(session =>
        session.title?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : []

  const filterOptions = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'all', label: 'All' }
  ]

  return (
    <MainLayout>
      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">Session Manager</h1>
          <p className="page-subtitle">Manage automated lead generation sessions</p>
        </div>
        <Link href="/lead-engine" className="btn-primary">
          <i className="fas fa-plus"></i>
          New Session
        </Link>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <i className="fas fa-search search-icon"></i>
        <input
          type="text"
          className="search-input"
          placeholder="Search sessions by name, status, or region..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {filterOptions.map(filter => (
          <button
            key={filter.id}
            className={`filter-tab ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
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
            <i className="fas fa-search"></i>
          </div>
          <h3 className="empty-state-title">No sessions found</h3>
          <p className="empty-state-description">
            No sessions found for this period
          </p>
          <div className="empty-state-actions">
            <button className="btn-secondary" onClick={() => setActiveFilter('week')}>
              Switch Timeline
            </button>
            <button className="btn-primary" onClick={() => setActiveFilter('all')}>
              View All
            </button>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
