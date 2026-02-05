'use client'

import MainLayout from '@/components/MainLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Session {
  id: number
  name: string
  created_at: string
  total_leads: number
  job_titles: string[]
}

interface Template {
  id: number
  name: string
  subject_template: string
  body_template: string
  is_default: boolean
}

interface AddedLead {
  id: string
  company: string
  jobTitle: string
  name: string
  title: string
  email: string
  source: 'csv' | 'lead-engine' | 'manual'
}

interface CampaignFormData {
  campaign_name: string
  selected_session_id: number | null
  selected_template_id: number | null
  // Schedule
  start_date: string
  end_date: string
  from_time: string
  from_period: 'am' | 'pm'
  to_time: string
  to_period: 'am' | 'pm'
  sending_days: string[]
  max_mails_per_day: number
  interval_between_mails: number
}

const STEPS = [
  { id: 1, name: 'Add Leads', key: 'leads' },
  { id: 2, name: 'Create Campaign Mail', key: 'mail' },
  { id: 3, name: 'Schedule', key: 'schedule' },
  { id: 4, name: 'Review and launch', key: 'review' }
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function CampaignBuilderPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [sessions, setSessions] = useState<Session[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [addedLeads, setAddedLeads] = useState<AddedLead[]>([])
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualLead, setManualLead] = useState({ name: '', email: '', company: '', title: '' })
  const [importingSession, setImportingSession] = useState(false)

  const [formData, setFormData] = useState<CampaignFormData>({
    campaign_name: '',
    selected_session_id: null,
    selected_template_id: null,
    start_date: '',
    end_date: '',
    from_time: '09:10',
    from_period: 'am',
    to_time: '12:00',
    to_period: 'pm',
    sending_days: [],
    max_mails_per_day: 99,
    interval_between_mails: 3
  })

  useEffect(() => {
    loadSessions()
    loadTemplates()
  }, [])

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setSessions(data)
        } else if (data && Array.isArray(data.sessions)) {
          setSessions(data.sessions)
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveDraft = async () => {
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, status: 'draft' })
      })
      if (response.ok) {
        alert('Campaign saved as draft!')
        router.push('/campaign-manager')
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      alert('Error saving draft')
    }
  }

  const handleLaunch = async () => {
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, status: 'active' })
      })
      if (response.ok) {
        alert('Campaign launched successfully!')
        router.push('/campaign-manager')
      }
    } catch (error) {
      console.error('Error launching campaign:', error)
      alert('Error launching campaign')
    }
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      sending_days: prev.sending_days.includes(day)
        ? prev.sending_days.filter(d => d !== day)
        : [...prev.sending_days, day]
    }))
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) return
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase())
      const colMap = {
        name: headers.findIndex(h => h.includes('name') && !h.includes('company')),
        email: headers.findIndex(h => h.includes('email')),
        company: headers.findIndex(h => h.includes('company')),
        title: headers.findIndex(h => h.includes('title')),
        jobOpening: headers.findIndex(h => h.includes('job'))
      }
      const newLeads: AddedLead[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        const email = colMap.email >= 0 ? cols[colMap.email] : ''
        if (!email) continue
        newLeads.push({
          id: `csv-${Date.now()}-${i}`,
          name: colMap.name >= 0 ? cols[colMap.name] : '',
          email,
          company: colMap.company >= 0 ? cols[colMap.company] : '',
          title: colMap.title >= 0 ? cols[colMap.title] : '',
          jobTitle: colMap.jobOpening >= 0 ? cols[colMap.jobOpening] : '',
          source: 'csv'
        })
      }
      setAddedLeads(prev => {
        const existingEmails = new Set(prev.map(l => l.email.toLowerCase()))
        const deduped = newLeads.filter(l => !existingEmails.has(l.email.toLowerCase()))
        return [...prev, ...deduped]
      })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImportSession = async () => {
    if (!formData.selected_session_id) return
    setImportingSession(true)
    try {
      const response = await fetch(`/api/sessions/${formData.selected_session_id}`)
      if (response.ok) {
        const data = await response.json()
        const leads = data.leads || []
        const newLeads: AddedLead[] = []
        leads.forEach((lead: any) => {
          const company = lead.company?.name || ''
          const jobOpening = lead.job_opening || ''
          const pocs = lead.pocs || []
          pocs.forEach((poc: any, idx: number) => {
            if (poc.email) {
              newLeads.push({
                id: `le-${lead.id || Date.now()}-${idx}`,
                name: poc.name || '',
                email: poc.email,
                company,
                title: poc.title || '',
                jobTitle: jobOpening,
                source: 'lead-engine'
              })
            }
          })
        })
        setAddedLeads(prev => {
          const existingEmails = new Set(prev.map(l => l.email.toLowerCase()))
          const deduped = newLeads.filter(l => !existingEmails.has(l.email.toLowerCase()))
          return [...prev, ...deduped]
        })
      }
    } catch (error) {
      console.error('Error importing session leads:', error)
    } finally {
      setImportingSession(false)
    }
  }

  const handleAddManual = () => {
    if (!manualLead.email) return
    setAddedLeads(prev => {
      const exists = prev.some(l => l.email.toLowerCase() === manualLead.email.toLowerCase())
      if (exists) return prev
      return [...prev, {
        id: `manual-${Date.now()}`,
        name: manualLead.name,
        email: manualLead.email,
        company: manualLead.company,
        title: manualLead.title,
        jobTitle: '',
        source: 'manual'
      }]
    })
    setManualLead({ name: '', email: '', company: '', title: '' })
  }

  const removeLead = (id: string) => {
    setAddedLeads(prev => prev.filter(l => l.id !== id))
  }

  const selectedSession = sessions.find(s => s.id === formData.selected_session_id)
  const selectedTemplate = templates.find(t => t.id === formData.selected_template_id)

  return (
    <MainLayout>
      <div className="campaign-builder">
        {/* Header */}
        <div className="builder-header">
          <div className="builder-header-left">
            <h1 className="page-title">Create Campaign</h1>
            <p className="page-subtitle">Create and manage multi-channel outreach campaigns</p>
          </div>
          <div className="builder-header-right">
            <button className="btn-save-draft" onClick={handleSaveDraft}>
              <i className="far fa-save"></i>
              Save draft
            </button>
          </div>
        </div>

        {/* Campaign Name */}
        <div className="campaign-name-section">
          <label className="form-label">Campaign Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="Enter The Campaign Name Here"
            value={formData.campaign_name}
            onChange={(e) => setFormData(prev => ({ ...prev, campaign_name: e.target.value }))}
          />
        </div>

        {/* Steps Progress */}
        <div className="steps-container">
          <div className="steps-header">
            {STEPS.map((step, index) => (
              <div 
                key={step.id} 
                className={`step-item ${currentStep >= step.id ? 'active' : ''} ${currentStep === step.id ? 'current' : ''}`}
                onClick={() => setCurrentStep(step.id)}
              >
                <span className="step-name">{step.name}</span>
              </div>
            ))}
          </div>
          <div className="steps-progress-bar">
            <div 
              className="steps-progress-fill" 
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            ></div>
            {STEPS.map((step, index) => (
              <div 
                key={step.id}
                className={`step-dot ${currentStep >= step.id ? 'active' : ''}`}
                style={{ left: `${(index / (STEPS.length - 1)) * 100}%` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="step-content">
          {/* Step 1: Add Leads */}
          {currentStep === 1 && (
            <div className="step-panel">
              <h2 className="step-title">Add Leads</h2>
              <div className="leads-options">
                {/* CSV Upload Card */}
                <div className="lead-option-card">
                  <div className="lead-option-icon blue">
                    <i className="fas fa-upload"></i>
                  </div>
                  <h3 className="lead-option-title">Upload CSV</h3>
                  <p className="lead-option-desc">
                    Upload a CSV file containing your leads. Make sure it includes email, name, and company details.
                  </p>
                  <label className="lead-option-import-btn">
                    <i className="fas fa-folder-open"></i>
                    Choose File
                    <input type="file" accept=".csv" hidden onChange={handleCSVUpload} />
                  </label>
                </div>

                {/* Lead Engine Import Card */}
                <div className="lead-option-card">
                  <div className="lead-option-icon purple">
                    <i className="fas fa-cog"></i>
                  </div>
                  <h3 className="lead-option-title">Import from Lead Engine</h3>
                  <p className="lead-option-desc">
                    Select a session from Lead Engine to import leads directly.
                  </p>
                  {loadingSessions ? (
                    <div className="loading-text">Loading sessions...</div>
                  ) : sessions.length > 0 ? (
                    <>
                      <select
                        className="session-select"
                        value={formData.selected_session_id || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          selected_session_id: e.target.value ? parseInt(e.target.value) : null
                        }))}
                      >
                        <option value="">Select a session...</option>
                        {sessions.map(session => (
                          <option key={session.id} value={session.id}>
                            {session.name} ({session.total_leads} leads)
                          </option>
                        ))}
                      </select>
                      {formData.selected_session_id && (
                        <button
                          className="lead-option-import-btn"
                          onClick={handleImportSession}
                          disabled={importingSession}
                        >
                          <i className={importingSession ? 'fas fa-spinner fa-spin' : 'fas fa-download'}></i>
                          {importingSession ? 'Importing...' : 'Import Leads'}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="no-data-text">No sessions available. Generate leads first.</p>
                  )}
                </div>

                {/* Manual Entry Card */}
                <div className={`lead-option-card ${showManualForm ? 'selected' : ''}`}>
                  <div className="lead-option-icon gray">
                    <i className="fas fa-plus"></i>
                  </div>
                  <h3 className="lead-option-title">Add Manual</h3>
                  <p className="lead-option-desc">
                    Manually add leads one by one with email, name, and company details.
                  </p>
                  <button
                    className="lead-option-import-btn"
                    onClick={() => setShowManualForm(!showManualForm)}
                  >
                    <i className={showManualForm ? 'fas fa-minus' : 'fas fa-plus'}></i>
                    {showManualForm ? 'Hide Form' : 'Add Lead'}
                  </button>
                </div>
              </div>

              {/* Manual Entry Form */}
              {showManualForm && (
                <div className="manual-form-section">
                  <h4 className="manual-form-title">Add Lead Details</h4>
                  <div className="manual-form-row">
                    <input
                      type="text"
                      className="manual-form-input"
                      placeholder="Name"
                      value={manualLead.name}
                      onChange={(e) => setManualLead(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <input
                      type="email"
                      className="manual-form-input"
                      placeholder="Email *"
                      value={manualLead.email}
                      onChange={(e) => setManualLead(prev => ({ ...prev, email: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="manual-form-input"
                      placeholder="Company"
                      value={manualLead.company}
                      onChange={(e) => setManualLead(prev => ({ ...prev, company: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="manual-form-input"
                      placeholder="Title"
                      value={manualLead.title}
                      onChange={(e) => setManualLead(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <button
                      className="lead-option-import-btn add-btn"
                      onClick={handleAddManual}
                      disabled={!manualLead.email}
                    >
                      <i className="fas fa-plus"></i>
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Added Leads Table */}
              {addedLeads.length > 0 && (
                <div className="added-leads-section">
                  <div className="added-leads-header">
                    <h4 className="added-leads-title">
                      Added Leads <span className="added-leads-count">{addedLeads.length}</span>
                    </h4>
                    <button className="added-leads-clear" onClick={() => setAddedLeads([])}>
                      <i className="fas fa-trash"></i> Clear all
                    </button>
                  </div>
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Name</th>
                        <th>Title</th>
                        <th>Email</th>
                        <th>Source</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {addedLeads.map(lead => (
                        <tr key={lead.id}>
                          <td>{lead.company || '—'}</td>
                          <td>{lead.name || '—'}</td>
                          <td>{lead.title || lead.jobTitle || '—'}</td>
                          <td>{lead.email}</td>
                          <td><span className={`source-badge ${lead.source}`}>{lead.source === 'lead-engine' ? 'Lead Engine' : lead.source === 'csv' ? 'CSV' : 'Manual'}</span></td>
                          <td>
                            <button className="lead-row-remove" onClick={() => removeLead(lead.id)} title="Remove">
                              <i className="fas fa-times"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Create Campaign Mail */}
          {currentStep === 2 && (
            <div className="step-panel">
              <h2 className="step-title">Create Campaign Mail</h2>
              <p className="step-description">Select an email template for your campaign</p>

              {loadingTemplates ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading templates...</p>
                </div>
              ) : templates.length > 0 ? (
                <div className="templates-grid">
                  {templates.map(template => (
                    <div 
                      key={template.id} 
                      className={`template-select-card ${formData.selected_template_id === template.id ? 'selected' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, selected_template_id: template.id }))}
                    >
                      <div className="template-select-header">
                        <h3 className="template-select-title">{template.name}</h3>
                        {formData.selected_template_id === template.id && (
                          <i className="fas fa-check-circle selected-icon"></i>
                        )}
                      </div>
                      <div className="template-select-subject">
                        <strong>Subject:</strong> {template.subject_template}
                      </div>
                      <div className="template-select-preview">
                        {template.body_template ? template.body_template.substring(0, 100) : 'No preview available'}...
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-card">
                  <div className="empty-state-icon">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <h3 className="empty-state-title">No Templates Available</h3>
                  <p className="empty-state-description">
                    Create email templates first to use in your campaigns.
                  </p>
                  <a href="/campaign-manager/templates" className="btn-primary">
                    <i className="fas fa-plus"></i>
                    Create Template
                  </a>
                </div>
              )}

              {selectedTemplate && (
                <div className="selected-info-box">
                  <i className="fas fa-check-circle"></i>
                  <span>Selected template: <strong>{selectedTemplate.name}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Schedule */}
          {currentStep === 3 && (
            <div className="step-panel">
              <h2 className="step-title">Schedule</h2>

              <div className="schedule-section">
                <h3 className="schedule-section-title">Dates and Time</h3>
                <div className="schedule-row">
                  <div className="schedule-field">
                    <label className="schedule-label">Start date</label>
                    <input
                      type="date"
                      className="schedule-input"
                      placeholder="DD/MM/YYYY"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="schedule-field">
                    <label className="schedule-label">End date</label>
                    <input
                      type="date"
                      className="schedule-input"
                      placeholder="DD/MM/YYYY"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="schedule-row">
                  <div className="schedule-field">
                    <label className="schedule-label">From</label>
                    <div className="time-input-group">
                      <input
                        type="text"
                        className="time-input"
                        placeholder="09:10"
                        value={formData.from_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, from_time: e.target.value }))}
                      />
                      <select
                        className="period-select"
                        value={formData.from_period}
                        onChange={(e) => setFormData(prev => ({ ...prev, from_period: e.target.value as 'am' | 'pm' }))}
                      >
                        <option value="am">am</option>
                        <option value="pm">pm</option>
                      </select>
                    </div>
                  </div>
                  <div className="schedule-field">
                    <label className="schedule-label">To</label>
                    <div className="time-input-group">
                      <input
                        type="text"
                        className="time-input"
                        placeholder="12:00"
                        value={formData.to_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, to_time: e.target.value }))}
                      />
                      <select
                        className="period-select"
                        value={formData.to_period}
                        onChange={(e) => setFormData(prev => ({ ...prev, to_period: e.target.value as 'am' | 'pm' }))}
                      >
                        <option value="am">am</option>
                        <option value="pm">pm</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="schedule-section">
                <h3 className="schedule-section-title">Sending Days</h3>
                <div className="days-grid">
                  {DAYS.map(day => (
                    <label key={day} className="day-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.sending_days.includes(day)}
                        onChange={() => toggleDay(day)}
                      />
                      <span className="day-label">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="schedule-section">
                <h3 className="schedule-section-title">Daily Sending Limit</h3>
                <div className="schedule-row">
                  <div className="schedule-field">
                    <label className="schedule-label">Maximum Mails per day</label>
                    <input
                      type="number"
                      className="schedule-input small"
                      value={formData.max_mails_per_day}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_mails_per_day: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="schedule-field">
                    <label className="schedule-label">Interval between mails</label>
                    <div className="interval-input-group">
                      <input
                        type="number"
                        className="schedule-input small"
                        value={formData.interval_between_mails}
                        onChange={(e) => setFormData(prev => ({ ...prev, interval_between_mails: parseInt(e.target.value) || 0 }))}
                      />
                      <span className="interval-unit">min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review and Launch */}
          {currentStep === 4 && (
            <div className="step-panel">
              <h2 className="step-title">Review and Launch</h2>
              <p className="step-description">Review your campaign settings before launching</p>

              <div className="review-sections">
                <div className="review-card">
                  <h3 className="review-card-title">
                    <i className="fas fa-info-circle"></i>
                    Campaign Details
                  </h3>
                  <div className="review-item">
                    <span className="review-label">Campaign Name:</span>
                    <span className="review-value">{formData.campaign_name || 'Not set'}</span>
                  </div>
                </div>

                <div className="review-card">
                  <h3 className="review-card-title">
                    <i className="fas fa-users"></i>
                    Leads
                  </h3>
                  <div className="review-item">
                    <span className="review-label">Total Leads:</span>
                    <span className="review-value">{addedLeads.length}</span>
                  </div>
                  {addedLeads.filter(l => l.source === 'csv').length > 0 && (
                    <div className="review-item">
                      <span className="review-label">From CSV:</span>
                      <span className="review-value"><span className="source-badge csv">CSV</span> {addedLeads.filter(l => l.source === 'csv').length}</span>
                    </div>
                  )}
                  {addedLeads.filter(l => l.source === 'lead-engine').length > 0 && (
                    <div className="review-item">
                      <span className="review-label">From Lead Engine:</span>
                      <span className="review-value"><span className="source-badge lead-engine">Lead Engine</span> {addedLeads.filter(l => l.source === 'lead-engine').length}</span>
                    </div>
                  )}
                  {addedLeads.filter(l => l.source === 'manual').length > 0 && (
                    <div className="review-item">
                      <span className="review-label">Manual:</span>
                      <span className="review-value"><span className="source-badge manual">Manual</span> {addedLeads.filter(l => l.source === 'manual').length}</span>
                    </div>
                  )}
                </div>

                <div className="review-card">
                  <h3 className="review-card-title">
                    <i className="fas fa-envelope"></i>
                    Email Template
                  </h3>
                  <div className="review-item">
                    <span className="review-label">Template:</span>
                    <span className="review-value">{selectedTemplate?.name || 'Not selected'}</span>
                  </div>
                  {selectedTemplate && (
                    <div className="review-item">
                      <span className="review-label">Subject:</span>
                      <span className="review-value">{selectedTemplate.subject_template}</span>
                    </div>
                  )}
                </div>

                <div className="review-card">
                  <h3 className="review-card-title">
                    <i className="fas fa-calendar"></i>
                    Schedule
                  </h3>
                  <div className="review-item">
                    <span className="review-label">Date Range:</span>
                    <span className="review-value">
                      {formData.start_date && formData.end_date 
                        ? `${formData.start_date} to ${formData.end_date}` 
                        : 'Not set'}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Time:</span>
                    <span className="review-value">
                      {formData.from_time} {formData.from_period} - {formData.to_time} {formData.to_period}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Days:</span>
                    <span className="review-value">
                      {formData.sending_days.length > 0 ? formData.sending_days.join(', ') : 'None selected'}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Daily Limit:</span>
                    <span className="review-value">{formData.max_mails_per_day} emails/day</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Interval:</span>
                    <span className="review-value">{formData.interval_between_mails} minutes</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="builder-footer">
          {currentStep > 1 && (
            <button className="btn-secondary" onClick={handleBack}>
              Back
            </button>
          )}
          <div className="footer-right">
            {currentStep < 4 ? (
              <button
                className="btn-primary"
                onClick={handleNext}
                disabled={currentStep === 1 && addedLeads.length === 0}
                style={currentStep === 1 && addedLeads.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                Save and Next
              </button>
            ) : (
              <button className="btn-primary btn-green" onClick={handleLaunch}>
                <i className="fas fa-rocket"></i>
                Launch Campaign
              </button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
