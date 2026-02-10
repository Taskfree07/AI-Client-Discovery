'use client'

import MainLayout from '@/components/MainLayout'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

interface Session {
  id: number
  name: string
  created_at: string
  total_leads: number
  job_titles: string[]
  status: string
}

interface FormData {
  sessionTitle: string
  jobTitles: string[]
  numJobs: number
  targetLeadCount: number
  locations: string[]
  industries: string[]
  companySizes: string[]
  pocRoles: string[]
}

interface Lead {
  company: {
    name: string
    industry: string
    size: number
  }
  job_opening: string
  pocs: Array<{
    name: string
    title: string
    email: string
    phone?: string
    linkedin_url?: string
  }>
}

export default function SessionManagerPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  // Slide-out panel state
  const [panelOpen, setPanelOpen] = useState(false)

  // Lead Search form state
  const [formData, setFormData] = useState<FormData>({
    sessionTitle: '',
    jobTitles: [],
    numJobs: 100,
    targetLeadCount: 50,
    locations: [],
    industries: [],
    companySizes: ['small'],
    pocRoles: []
  })
  const [jobTitleInput, setJobTitleInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [industryInput, setIndustryInput] = useState('')
  const [showScheduling, setShowScheduling] = useState(false)

  // Scheduling state (frontend only for now)
  const [schedRunType, setSchedRunType] = useState<'one-time' | 'recurring'>('one-time')
  const [schedStartDate, setSchedStartDate] = useState('')
  const [schedEndDate, setSchedEndDate] = useState('')
  const [schedRepeatCondition, setSchedRepeatCondition] = useState('day')
  const [schedEndType, setSchedEndType] = useState<'end-on-date' | 'end-after-x'>('end-after-x')
  const [schedEndValue, setSchedEndValue] = useState('')

  // Current session (live generation) state
  const [isGenerating, setIsGenerating] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [showResults, setShowResults] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [currentSessionName, setCurrentSessionName] = useState('')

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Ref for lead count in stream handler
  const leadCountRef = useRef(0)

  useEffect(() => {
    loadSessions()
  }, [])

  const showToast = (message: string) => {
    setToastMessage(message)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const data = await response.json()
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

  // Date-based filtering
  const filterByDate = (sessionList: Session[]) => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    return sessionList.filter(session => {
      // Text search filter
      if (searchTerm && !session.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Date filter
      const sessionDate = new Date(session.created_at)
      switch (activeFilter) {
        case 'today':
          return sessionDate >= todayStart
        case 'week':
          return sessionDate >= weekStart
        case 'month':
          return sessionDate >= monthStart
        case 'scheduled':
          return session.status === 'scheduled'
        case 'archives':
          return session.status === 'archived'
        case 'all':
        default:
          return true
      }
    })
  }

  const filteredSessions = filterByDate(Array.isArray(sessions) ? sessions : [])

  // Whether a live session exists (generating or just completed with results)
  const hasLiveSession = isGenerating || showResults

  // Show current session card in date-based lists (today, week, month, all)
  const showCurrentCardInGrid = hasLiveSession && activeFilter !== 'current'
    && activeFilter !== 'scheduled' && activeFilter !== 'archives'

  // Total visible items for empty state check
  const totalVisibleItems = filteredSessions.length + (showCurrentCardInGrid ? 1 : 0)

  // Build filter tabs - "Current Session" tab only shows when live
  const filterOptions = [
    { id: 'all', label: 'All' },
    ...(hasLiveSession ? [{ id: 'current', label: 'Current Session' }] : []),
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This week' },
    { id: 'month', label: 'This Month' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'archives', label: 'Archives' }
  ]

  // --- Lead Search panel logic ---

  const openPanel = () => {
    setFormData({
      sessionTitle: '',
      jobTitles: [],
      numJobs: 100,
      targetLeadCount: 50,
      locations: [],
      industries: [],
      companySizes: ['small'],
      pocRoles: []
    })
    setJobTitleInput('')
    setLocationInput('')
    setIndustryInput('')
    setShowScheduling(false)
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
  }

  const addTag = (field: keyof Pick<FormData, 'jobTitles' | 'locations' | 'industries'>, value: string) => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }))
    }
  }

  const removeTag = (field: keyof Pick<FormData, 'jobTitles' | 'locations' | 'industries'>, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }

  const toggleCompanySize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      companySizes: prev.companySizes.includes(size)
        ? prev.companySizes.filter(s => s !== size)
        : [...prev.companySizes, size]
    }))
  }

  const togglePocRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      pocRoles: prev.pocRoles.includes(role)
        ? prev.pocRoles.filter(r => r !== role)
        : [...prev.pocRoles, role]
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, field: string, setter: (v: string) => void) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const fieldMap: Record<string, keyof Pick<FormData, 'jobTitles' | 'locations' | 'industries'>> = {
        jobTitle: 'jobTitles',
        location: 'locations',
        industry: 'industries'
      }
      const input = e.currentTarget.value
      addTag(fieldMap[field], input)
      setter('')
    }
  }

  const generateLeads = async () => {
    if (formData.jobTitles.length === 0) {
      alert('Please enter at least one job title')
      return
    }

    const sessionName = formData.sessionTitle || `Lead Search - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    // Close panel and show toast
    setPanelOpen(false)
    showToast(`Lead generation started for "${sessionName}"`)

    // Reset and start generation, switch to Current Session tab
    setActiveFilter('current')
    setIsGenerating(true)
    setCurrentSessionName(sessionName)
    setLoadingMessage('Initializing Lead Engine...')
    setLoadingProgress(0)
    setLeads([])
    setShowResults(false)
    leadCountRef.current = 0

    try {
      const response = await fetch('/api/lead-engine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_title: sessionName,
          job_titles: formData.jobTitles,
          num_jobs: formData.numJobs,
          locations: formData.locations.length > 0 ? formData.locations : null,
          industries: formData.industries.length > 0 ? formData.industries : null,
          keywords: null,
          company_sizes: formData.companySizes.length > 0 ? formData.companySizes : null,
          poc_roles: formData.pocRoles.length > 0 ? formData.pocRoles : null
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (reader) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line)
              handleStreamData(data)
            } catch (e) {
              console.error('Error parsing stream data:', e, line)
            }
          }
        }
      }

      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer)
          handleStreamData(data)
        } catch (e) {
          console.error('Error parsing final buffer:', e)
        }
      }
    } catch (error) {
      console.error('Error generating leads:', error)
      showToast('Error generating leads: ' + (error as Error).message)
    } finally {
      setIsGenerating(false)
      loadSessions()
    }
  }

  const handleStreamData = (data: any) => {
    switch (data.type) {
      case 'session':
        // Backend created/found a session record - no UI change needed
        break
      case 'status':
        setLoadingMessage(data.message)
        setLoadingProgress(data.progress || 0)
        break
      case 'lead':
        leadCountRef.current += 1
        setLeads(prev => [...prev, data.data])
        setLoadingMessage(`Found ${leadCountRef.current} leads...`)
        setLoadingProgress(data.progress || 50)
        break
      case 'complete':
        setShowResults(true)
        setLoadingMessage(data.message || 'Generation complete')
        setLoadingProgress(100)
        break
      case 'quota_exceeded':
        showToast('API quota exceeded: ' + data.message)
        setLoadingMessage('Quota exceeded - generation stopped')
        setShowResults(true)
        setLoadingProgress(100)
        break
      case 'error':
        showToast('Error: ' + data.message)
        break
    }
  }

  const exportCSV = () => {
    if (leads.length === 0) {
      alert('No leads to export')
      return
    }

    const headers = ['Company', 'Industry', 'Size', 'Job Opening', 'POC Name', 'POC Title', 'Email', 'Phone', 'LinkedIn']
    const rows: string[][] = []

    for (const lead of leads) {
      if (lead.pocs.length > 0) {
        for (const poc of lead.pocs) {
          rows.push([
            lead.company.name,
            lead.company.industry,
            String(lead.company.size),
            lead.job_opening,
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
          lead.company.industry,
          String(lead.company.size),
          lead.job_opening,
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
    link.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  const dismissCurrentSession = () => {
    setShowResults(false)
    setLeads([])
    setCurrentSessionName('')
    setActiveFilter('all')
  }

  return (
    <MainLayout>
      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">Lead Engine</h1>
          <p className="page-subtitle">Manage and resume your lead generation sessions</p>
        </div>
        <button className="btn-primary" onClick={openPanel} disabled={isGenerating}>
          <i className="fas fa-plus"></i>
          Add New Session
        </button>
      </div>

      {/* Toast Notification */}
      <div className={`toast-notification ${toastVisible ? 'show' : ''}`}>
        <i className="fas fa-rocket" style={{ marginRight: '10px' }}></i>
        {toastMessage}
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <i className="fas fa-search search-icon"></i>
        <input
          type="text"
          className="search-input"
          placeholder="Search for campaign name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {filterOptions.map(filter => (
          <button
            key={filter.id}
            className={`filter-tab ${filter.id === 'current' ? 'filter-tab-live' : ''} ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.id === 'current' && <span className="live-dot-small"></span>}
            {filter.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading sessions...</p>
        </div>
      ) : activeFilter === 'current' ? (
        /* ===== CURRENT SESSION TAB - Full expanded view ===== */
        <div className="current-session-full">
          <div className="current-session-full-header">
            <div className="current-session-title-row">
              <div>
                <h3 className="current-session-full-title">
                  {isGenerating && <span className="live-dot"></span>}
                  {currentSessionName || 'Current Session'}
                </h3>
                <span className="current-session-full-meta">
                  {new Date().toLocaleDateString()} - {isGenerating ? `${leads.length} leads so far` : `${leads.length} leads found`}
                </span>
              </div>
              <div className="session-card-header-right">
                <span className={`session-status-badge ${isGenerating ? 'status-generating' : 'status-complete'}`}>
                  {isGenerating ? 'Generating' : 'Complete'}
                </span>
                {showResults && !isGenerating && (
                  <button className="session-card-dismiss" onClick={dismissCurrentSession} title="Dismiss">
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {isGenerating && (
              <div className="current-session-progress">
                <div className="current-session-progress-text">{loadingMessage}</div>
                <div className="current-session-progress-bar-container">
                  <div className="current-session-progress-bar" style={{ width: `${loadingProgress}%` }}></div>
                </div>
                <div className="current-session-stats-row">
                  <span>{loadingProgress}%</span>
                  <span>{leads.length} leads found</span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons when complete */}
          {showResults && !isGenerating && leads.length > 0 && (
            <div className="current-session-actions">
              <button className="action-btn action-btn-outline" onClick={exportCSV}>
                <i className="fas fa-download" style={{ marginRight: '6px' }}></i>Export CSV
              </button>
              <button className="action-btn action-btn-primary" onClick={() => alert('Send to Campaign - Coming soon!')}>
                <i className="fas fa-paper-plane" style={{ marginRight: '6px' }}></i>Send to Campaign
              </button>
            </div>
          )}

          {/* Live leads table */}
          {leads.length > 0 && (
            <div className="current-session-table-wrap">
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
                                {lead.company.industry} - {lead.company.size} employees
                              </div>
                            </td>
                            <td>{lead.job_opening}</td>
                            <td>
                              <div className="poc-name">{poc.name}</div>
                              <div className="poc-subtitle">{poc.title}</div>
                            </td>
                            <td>{poc.title}</td>
                            <td>
                              <a href={`mailto:${poc.email}`} className="email-link">{poc.email}</a>
                            </td>
                            <td>
                              {poc.linkedin_url ? (
                                <a href={poc.linkedin_url} target="_blank" rel="noopener noreferrer" className="linkedin-link">
                                  linkedin.com/in/...
                                </a>
                              ) : '-'}
                            </td>
                          </tr>
                        ))
                      : (
                          <tr key={`${leadIndex}-nopoc`}>
                            <td className="company-cell">
                              <div className="company-name">{lead.company.name}</div>
                              <div className="company-meta">
                                {lead.company.industry} - {lead.company.size} employees
                              </div>
                            </td>
                            <td>{lead.job_opening}</td>
                            <td colSpan={4} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No contacts found</td>
                          </tr>
                        )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Searching placeholder when no leads yet */}
          {leads.length === 0 && isGenerating && (
            <div className="current-session-searching">
              <div className="loading-spinner"></div>
              <p>{loadingMessage}</p>
            </div>
          )}
        </div>
      ) : totalVisibleItems > 0 ? (
        /* ===== DATE FILTER TABS - Sessions list ===== */
        <div className="sessions-list">
          {/* Current session as list card */}
          {showCurrentCardInGrid && (
            <div
              className="session-list-card session-list-card-live"
              onClick={() => setActiveFilter('current')}
            >
              <div className="session-list-card-left">
                <div className="session-list-card-title-row">
                  <h3 className="session-list-card-title">
                    {isGenerating && <span className="live-dot"></span>}
                    {currentSessionName || 'Current Session'}
                  </h3>
                  <span className={`session-status-badge ${isGenerating ? 'status-generating' : 'status-complete'}`}>
                    {isGenerating ? 'Generating' : 'Complete'}
                  </span>
                </div>
                <div className="session-list-card-meta">
                  <span><i className="fas fa-users"></i> {leads.length} leads</span>
                  <span>{isGenerating ? `${loadingProgress}% complete` : 'Just now'}</span>
                </div>
                {isGenerating && (
                  <div className="session-list-card-progress">
                    <div className="session-card-progress-bar-container">
                      <div className="session-card-progress-bar" style={{ width: `${loadingProgress}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="session-list-card-actions">
                <span className="session-list-action session-list-action-primary">
                  <i className="fas fa-external-link-alt"></i>
                  <span>View Live</span>
                </span>
              </div>
            </div>
          )}

          {/* Saved sessions */}
          {filteredSessions.map(session => {
            const createdDate = new Date(session.created_at)
            const today = new Date()
            const isToday = createdDate.toDateString() === today.toDateString()
            const formattedDate = createdDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

            return (
              <div key={session.id} className="session-list-card">
                <Link href={`/session-manager/${session.id}`} className="session-list-card-link">
                  <div className="session-list-card-left">
                    <div className="session-list-card-title-row">
                      <h3 className="session-list-card-title">{session.name}</h3>
                      <span className="session-list-card-date">Created on {formattedDate}</span>
                    </div>
                    <div className="session-list-card-meta">
                      <span><i className="fas fa-users"></i> {session.total_leads} leads</span>
                    </div>
                    <div className="session-list-card-updated">
                      {isToday ? 'Updated Today' : `Updated ${createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </div>
                  </div>
                </Link>
                <div className="session-list-card-actions">
                  <Link href={`/session-manager/${session.id}`} className="session-list-action session-list-action-primary">
                    <i className="fas fa-external-link-alt"></i>
                    <span>View Details</span>
                  </Link>
                  <button
                    className="session-list-action session-list-action-secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      alert('Export CSV - Coming soon!')
                    }}
                  >
                    <i className="fas fa-file-export"></i>
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>
            )
          })}
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

      {/* Slide-out overlay */}
      <div
        className={`slideout-overlay ${panelOpen ? 'open' : ''}`}
        onClick={closePanel}
      />

      {/* Slide-out Panel - Create New Session */}
      <div className={`slideout-panel ${panelOpen ? 'open' : ''}`}>
        <div className="slideout-panel-header">
          <h2 className="slideout-panel-title">Create New Session</h2>
          <button className="panel-close-text" onClick={closePanel}>
            <i className="fas fa-times"></i>
            <span>close</span>
          </button>
        </div>

        <div className="slideout-panel-body">
          {/* Session Name */}
          <div className="panel-field">
            <label className="panel-label">Session Name</label>
            <input
              type="text"
              className="panel-input"
              placeholder="Enter Here session Manager"
              value={formData.sessionTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, sessionTitle: e.target.value }))}
            />
          </div>

          <div className="panel-divider"></div>

          {/* Job Titles + No. of Job Openings */}
          <div className="panel-row">
            <div className="panel-field panel-field-grow">
              <label className="panel-label">Job Titles</label>
              <input
                type="text"
                className="panel-input"
                placeholder="eg . AI developer"
                value={jobTitleInput}
                onChange={(e) => setJobTitleInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'jobTitle', setJobTitleInput)}
              />
              {formData.jobTitles.length > 0 && (
                <div className="panel-tags">
                  {formData.jobTitles.map((tag, index) => (
                    <span key={index} className="panel-tag">
                      {tag}
                      <span className="panel-tag-remove" onClick={() => removeTag('jobTitles', index)}>
                        <i className="fas fa-times"></i>
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="panel-field panel-field-fixed">
              <label className="panel-label">No. of Job Openings</label>
              <input
                type="number"
                className="panel-input"
                placeholder="eg.100"
                value={formData.numJobs}
                onChange={(e) => setFormData(prev => ({ ...prev, numJobs: parseInt(e.target.value) || 100 }))}
                min="1"
                max="500"
              />
            </div>
          </div>

          {/* Target Lead Count + Target Region */}
          <div className="panel-row">
            <div className="panel-field panel-field-grow">
              <label className="panel-label">Target Lead Count</label>
              <input
                type="number"
                className="panel-input"
                placeholder="Eg. 50"
                value={formData.targetLeadCount}
                onChange={(e) => setFormData(prev => ({ ...prev, targetLeadCount: parseInt(e.target.value) || 50 }))}
                min="1"
                max="500"
              />
              <span className="panel-helper">Number of leads to generate</span>
            </div>
            <div className="panel-field panel-field-grow">
              <label className="panel-label">Target Region</label>
              <input
                type="text"
                className="panel-input"
                placeholder="Enter region and press Enter"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'location', setLocationInput)}
              />
              {formData.locations.length > 0 && (
                <div className="panel-tags">
                  {formData.locations.map((tag, index) => (
                    <span key={index} className="panel-tag">
                      {tag}
                      <span className="panel-tag-remove" onClick={() => removeTag('locations', index)}>
                        <i className="fas fa-times"></i>
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Industries + Company Size */}
          <div className="panel-row">
            <div className="panel-field panel-field-grow">
              <label className="panel-label">Industries</label>
              <input
                type="text"
                className="panel-input"
                placeholder="Enter industry and press Enter"
                value={industryInput}
                onChange={(e) => setIndustryInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'industry', setIndustryInput)}
              />
              {formData.industries.length > 0 && (
                <div className="panel-tags">
                  {formData.industries.map((tag, index) => (
                    <span key={index} className="panel-tag">
                      {tag}
                      <span className="panel-tag-remove" onClick={() => removeTag('industries', index)}>
                        <i className="fas fa-times"></i>
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="panel-field panel-field-grow">
              <label className="panel-label">Company Size</label>
              <div className="panel-checkboxes">
                <label className="panel-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.companySizes.includes('small')}
                    onChange={() => toggleCompanySize('small')}
                  />
                  <span>small (1-50)</span>
                </label>
                <label className="panel-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.companySizes.includes('mid')}
                    onChange={() => toggleCompanySize('mid')}
                  />
                  <span>Mid (51-500)</span>
                </label>
                <label className="panel-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.companySizes.includes('large')}
                    onChange={() => toggleCompanySize('large')}
                  />
                  <span>Large (500+)</span>
                </label>
              </div>
            </div>
          </div>

          {/* POC Role Filter */}
          <div className="panel-field" style={{ marginTop: '8px' }}>
            <label className="panel-label">POC Role Filter</label>
            <span className="panel-helper" style={{ marginBottom: '8px', display: 'block' }}>
              Leave empty to use default ranking. Select roles to restrict results.
            </span>
            <div className="panel-checkboxes" style={{ flexDirection: 'column', gap: '6px' }}>
              <label className="panel-checkbox">
                <input
                  type="checkbox"
                  checked={formData.pocRoles.includes('talent_acquisition')}
                  onChange={() => togglePocRole('talent_acquisition')}
                />
                <span>Talent Acquisition / Head of Talent</span>
              </label>
              <label className="panel-checkbox">
                <input
                  type="checkbox"
                  checked={formData.pocRoles.includes('hr_manager')}
                  onChange={() => togglePocRole('hr_manager')}
                />
                <span>HR Manager / HR Business Partner</span>
              </label>
              <label className="panel-checkbox">
                <input
                  type="checkbox"
                  checked={formData.pocRoles.includes('engineering_manager')}
                  onChange={() => togglePocRole('engineering_manager')}
                />
                <span>Engineering Manager / Hiring Manager</span>
              </label>
              <label className="panel-checkbox">
                <input
                  type="checkbox"
                  checked={formData.pocRoles.includes('vp_engineering')}
                  onChange={() => togglePocRole('vp_engineering')}
                />
                <span>VP Engineering / VP IT</span>
              </label>
              <label className="panel-checkbox">
                <input
                  type="checkbox"
                  checked={formData.pocRoles.includes('cto')}
                  onChange={() => togglePocRole('cto')}
                />
                <span>CTO / Technical Director</span>
              </label>
              <label className="panel-checkbox">
                <input
                  type="checkbox"
                  checked={formData.pocRoles.includes('senior_recruiter')}
                  onChange={() => togglePocRole('senior_recruiter')}
                />
                <span>Senior Recruiter</span>
              </label>
              <label className="panel-checkbox">
                <input
                  type="checkbox"
                  checked={formData.pocRoles.includes('others')}
                  onChange={() => togglePocRole('others')}
                />
                <span>Others</span>
              </label>
            </div>
          </div>

          {/* Scheduling & Recurrence */}
          <div className="panel-scheduling-section">
            <div className="panel-scheduling-header" onClick={() => setShowScheduling(!showScheduling)}>
              <span>
                <strong>Scheduling & Recurrence</strong>
                <span className="panel-optional">( Optional )</span>
              </span>
              <i className={`fas fa-chevron-${showScheduling ? 'up' : 'down'}`}></i>
            </div>
            {showScheduling && (
              <div className="panel-scheduling-body">
                {/* Run Type */}
                <div className="panel-field">
                  <label className="panel-label">Run Type <span className="panel-required">*</span></label>
                  <div className="panel-radio-group">
                    <label className="panel-radio">
                      <input
                        type="radio"
                        name="runType"
                        checked={schedRunType === 'one-time'}
                        onChange={() => setSchedRunType('one-time')}
                      />
                      <span>one-Time</span>
                    </label>
                    <label className="panel-radio">
                      <input
                        type="radio"
                        name="runType"
                        checked={schedRunType === 'recurring'}
                        onChange={() => setSchedRunType('recurring')}
                      />
                      <span>Recurring</span>
                    </label>
                  </div>
                </div>

                {/* Start Date + End Date */}
                <div className="panel-row">
                  <div className="panel-field panel-field-grow">
                    <label className="panel-label">Start Date <span className="panel-required">*</span></label>
                    <input
                      type="text"
                      className="panel-input"
                      placeholder="DD/MM/YYYY"
                      value={schedStartDate}
                      onChange={(e) => setSchedStartDate(e.target.value)}
                      onFocus={(e) => { e.target.type = 'date' }}
                      onBlur={(e) => { if (!e.target.value) e.target.type = 'text' }}
                    />
                  </div>
                  <div className="panel-field panel-field-grow">
                    <label className="panel-label">End Date <span className="panel-required">*</span></label>
                    <input
                      type="text"
                      className="panel-input"
                      placeholder="DD/MM/YYYY"
                      value={schedEndDate}
                      onChange={(e) => setSchedEndDate(e.target.value)}
                      onFocus={(e) => { e.target.type = 'date' }}
                      onBlur={(e) => { if (!e.target.value) e.target.type = 'text' }}
                    />
                  </div>
                </div>

                {/* Repeat Condition (only for recurring) */}
                {schedRunType === 'recurring' && (
                  <>
                    <div className="panel-field">
                      <label className="panel-label">Repeat Condition</label>
                      <select
                        className="panel-input"
                        value={schedRepeatCondition}
                        onChange={(e) => setSchedRepeatCondition(e.target.value)}
                      >
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                      </select>
                    </div>

                    {/* End Condition */}
                    <div className="panel-field">
                      <label className="panel-label">Run Type <span className="panel-required">*</span></label>
                      <div className="panel-radio-group">
                        <label className="panel-radio">
                          <input
                            type="radio"
                            name="endType"
                            checked={schedEndType === 'end-on-date'}
                            onChange={() => setSchedEndType('end-on-date')}
                          />
                          <span>End on date</span>
                        </label>
                        <label className="panel-radio">
                          <input
                            type="radio"
                            name="endType"
                            checked={schedEndType === 'end-after-x'}
                            onChange={() => setSchedEndType('end-after-x')}
                          />
                          <span>End after x-times</span>
                        </label>
                      </div>
                    </div>

                    <div className="panel-field">
                      <label className="panel-label">
                        {schedEndType === 'end-on-date' ? 'End Date' : 'Number of Times'} <span className="panel-required">*</span>
                      </label>
                      {schedEndType === 'end-on-date' ? (
                        <input
                          type="text"
                          className="panel-input"
                          placeholder="DD/MM/YYYY"
                          value={schedEndValue}
                          onChange={(e) => setSchedEndValue(e.target.value)}
                          onFocus={(e) => { e.target.type = 'date' }}
                          onBlur={(e) => { if (!e.target.value) e.target.type = 'text' }}
                        />
                      ) : (
                        <input
                          type="number"
                          className="panel-input"
                          placeholder="eg. 5"
                          value={schedEndValue}
                          onChange={(e) => setSchedEndValue(e.target.value)}
                          min="1"
                        />
                      )}
                    </div>
                  </>
                )}

                {/* Schedule Summary */}
                <div className="panel-schedule-summary">
                  <div className="panel-schedule-summary-label">SCHEDULE SUMMARY</div>
                  <div className="panel-schedule-summary-text">
                    {schedRunType === 'one-time'
                      ? `One-time execution${schedStartDate ? ` on ${schedStartDate}` : ''}`
                      : `Recurring every ${schedRepeatCondition}${schedStartDate ? ` starting ${schedStartDate}` : ''}${schedEndType === 'end-after-x' && schedEndValue ? `, ${schedEndValue} times` : ''}`
                    }
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Generate Leads button */}
          <div className="panel-footer">
            <button
              className="panel-generate-btn"
              onClick={generateLeads}
              disabled={isGenerating}
            >
              Generate Leads
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
