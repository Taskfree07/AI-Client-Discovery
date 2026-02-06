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

interface ValidatedLead extends AddedLead {
  issue?: string
  isFlagged: boolean
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
  const [showLeadEngineDrawer, setShowLeadEngineDrawer] = useState(false)
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<number>>(new Set())
  const [drawerStep, setDrawerStep] = useState<'sessions' | 'leads'>('sessions')
  const [drawerLeads, setDrawerLeads] = useState<ValidatedLead[]>([])
  const [flaggedLeads, setFlaggedLeads] = useState<ValidatedLead[]>([])
  const [detectedLeads, setDetectedLeads] = useState<ValidatedLead[]>([])
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [loadingDrawerLeads, setLoadingDrawerLeads] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<'flagged' | 'detected' | null>(null)
  const [editingLead, setEditingLead] = useState<ValidatedLead | null>(null)

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

  const validateLead = (lead: AddedLead): ValidatedLead => {
    const issues: string[] = []
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!lead.email || !lead.email.trim()) {
      issues.push('Missing email')
    } else if (!emailRegex.test(lead.email)) {
      issues.push('Invalid email id')
    }
    
    // Name validation
    if (!lead.name || !lead.name.trim()) {
      issues.push('Invalid name')
    } else if (lead.name.length < 2) {
      issues.push('Invalid name')
    }
    
    // Company validation
    if (!lead.company || !lead.company.trim()) {
      issues.push('Invalid Company name')
    }
    
    // Check for incomplete/incorrect format
    if (!lead.email.includes('@') && lead.email.length > 0) {
      issues.push('Incorrect format')
    }
    
    // Missing details check
    if (!lead.title && !lead.jobTitle) {
      issues.push('Missing details')
    }
    
    const issue = issues.length > 0 ? issues[0] : undefined
    
    return {
      ...lead,
      issue,
      isFlagged: issues.length > 0
    }
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    console.log('CSV file selected:', file.name)
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        console.log('CSV content loaded, length:', text.length)
        
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        console.log('CSV lines:', lines.length)
        
        if (lines.length < 2) {
          alert('CSV file must have at least a header row and one data row')
          return
        }
        
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase())
        console.log('CSV headers:', headers)
        
        const colMap = {
          name: headers.findIndex(h => h.includes('name') && !h.includes('company')),
          email: headers.findIndex(h => h.includes('email')),
          company: headers.findIndex(h => h.includes('company')),
          title: headers.findIndex(h => h.includes('title')),
          jobOpening: headers.findIndex(h => h.includes('job'))
        }
        console.log('Column mapping:', colMap)
        
        if (colMap.email < 0) {
          alert('CSV file must have an "email" column')
          return
        }
        
        const newLeads: AddedLead[] = []
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i])
          const email = colMap.email >= 0 ? cols[colMap.email]?.trim() : ''
          if (!email) continue
          
          newLeads.push({
            id: `csv-${Date.now()}-${i}`,
            name: colMap.name >= 0 ? (cols[colMap.name]?.trim() || '') : '',
            email,
            company: colMap.company >= 0 ? (cols[colMap.company]?.trim() || '') : '',
            title: colMap.title >= 0 ? (cols[colMap.title]?.trim() || '') : '',
            jobTitle: colMap.jobOpening >= 0 ? (cols[colMap.jobOpening]?.trim() || '') : '',
            source: 'csv'
          })
        }
        
        console.log('Parsed leads:', newLeads.length)
        
        if (newLeads.length === 0) {
          alert('No valid leads found in CSV file. Make sure the email column is not empty.')
          return
        }
        
        // Deduplicate within the CSV file first
        const uniqueNewLeads: AddedLead[] = []
        const seenEmails = new Set<string>()
        newLeads.forEach(lead => {
          const emailLower = lead.email.toLowerCase()
          if (!seenEmails.has(emailLower)) {
            seenEmails.add(emailLower)
            uniqueNewLeads.push(lead)
          }
        })
        
        console.log('Unique leads after deduplication:', uniqueNewLeads.length)
        
        // Then deduplicate against existing leads
        setAddedLeads(prev => {
          const existingEmails = new Set(prev.map(l => l.email.toLowerCase()))
          const deduped = uniqueNewLeads.filter(l => !existingEmails.has(l.email.toLowerCase()))
          console.log('Leads to add (after removing existing):', deduped.length)
          
          if (deduped.length === 0) {
            alert('All leads from CSV already exist in the campaign')
            return prev
          }
          
          alert(`Successfully added ${deduped.length} leads from CSV`)
          return [...prev, ...deduped]
        })
      } catch (error) {
        console.error('Error parsing CSV:', error)
        alert('Error parsing CSV file. Please check the file format.')
      }
    }
    
    reader.onerror = () => {
      console.error('Error reading file')
      alert('Error reading CSV file')
    }
    
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleAddLeadsFromSessions = async () => {
    if (selectedSessionIds.size === 0) return
    setLoadingDrawerLeads(true)
    try {
      const allLeads: AddedLead[] = []
      for (const sessionId of selectedSessionIds) {
        const response = await fetch(`/api/sessions/${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          const leads = data.leads || []
          leads.forEach((lead: any) => {
            const company = lead.company?.name || ''
            const jobOpening = lead.job_opening || ''
            const pocs = lead.pocs || []
            pocs.forEach((poc: any, idx: number) => {
              if (poc.email) {
                allLeads.push({
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
        }
      }
      // Deduplicate within the new batch first
      const uniqueNewLeads: AddedLead[] = []
      const seenEmails = new Set<string>()
      allLeads.forEach(lead => {
        const emailLower = lead.email.toLowerCase()
        if (!seenEmails.has(emailLower)) {
          seenEmails.add(emailLower)
          uniqueNewLeads.push(lead)
        }
      })
      // Then deduplicate against existing leads
      setAddedLeads(prev => {
        const existingEmails = new Set(prev.map(l => l.email.toLowerCase()))
        const deduped = uniqueNewLeads.filter(l => !existingEmails.has(l.email.toLowerCase()))
        return [...prev, ...deduped]
      })
      setShowLeadEngineDrawer(false)
      setSelectedSessionIds(new Set())
    } catch (error) {
      console.error('Error loading session leads:', error)
    } finally {
      setLoadingDrawerLeads(false)
    }
  }



  const handleViewSession = async (sessionId: number) => {
    setSelectedSessionIds(new Set([sessionId]))
    setLoadingDrawerLeads(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        const leads = data.leads || []
        const allLeads: AddedLead[] = []
        leads.forEach((lead: any) => {
          const company = lead.company?.name || ''
          const jobOpening = lead.job_opening || ''
          const pocs = lead.pocs || []
          pocs.forEach((poc: any, idx: number) => {
            if (poc.email) {
              allLeads.push({
                id: `view-${lead.id || Date.now()}-${idx}`,
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
        
        // Validate all leads
        const validatedLeads = allLeads.map(lead => validateLead(lead))
        
        // Split into flagged and detected
        const flagged = validatedLeads.filter(lead => lead.isFlagged)
        const detected = validatedLeads.filter(lead => !lead.isFlagged)
        
        setDrawerLeads(validatedLeads)
        setFlaggedLeads(flagged)
        setDetectedLeads(detected)
        setSelectedLeadIds(new Set())
        setDrawerStep('leads')
      }
    } catch (error) {
      console.error('Error loading session leads:', error)
    } finally {
      setLoadingDrawerLeads(false)
    }
  }

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev)
      if (next.has(leadId)) {
        next.delete(leadId)
      } else {
        next.add(leadId)
      }
      return next
    })
  }

  const handleDeleteAll = (section: 'flagged' | 'detected') => {
    setShowDeleteModal(section)
  }

  const confirmDeleteAll = () => {
    if (showDeleteModal === 'flagged') {
      setDrawerLeads(prev => prev.filter(lead => !lead.isFlagged))
      setFlaggedLeads([])
      setSelectedLeadIds(prev => {
        const next = new Set(prev)
        flaggedLeads.forEach(lead => next.delete(lead.id))
        return next
      })
    } else if (showDeleteModal === 'detected') {
      setDrawerLeads(prev => prev.filter(lead => lead.isFlagged))
      setDetectedLeads([])
      setSelectedLeadIds(prev => {
        const next = new Set(prev)
        detectedLeads.forEach(lead => next.delete(lead.id))
        return next
      })
    }
    setShowDeleteModal(null)
  }

  const handleEditLead = (lead: ValidatedLead) => {
    setEditingLead({ ...lead })
  }

  const handleSaveEditedLead = () => {
    if (!editingLead) return
    
    // Re-validate the edited lead
    const validated = validateLead(editingLead)
    
    // Update in drawerLeads
    setDrawerLeads(prev => prev.map(l => l.id === editingLead.id ? validated : l))
    
    // Update in flagged or detected lists
    if (validated.isFlagged) {
      setFlaggedLeads(prev => {
        const filtered = prev.filter(l => l.id !== editingLead.id)
        return [...filtered, validated]
      })
      setDetectedLeads(prev => prev.filter(l => l.id !== editingLead.id))
    } else {
      setDetectedLeads(prev => {
        const filtered = prev.filter(l => l.id !== editingLead.id)
        return [...filtered, validated]
      })
      setFlaggedLeads(prev => prev.filter(l => l.id !== editingLead.id))
    }
    
    setEditingLead(null)
  }

  const toggleSelectAllLeads = () => {
    if (selectedLeadIds.size === drawerLeads.length) {
      setSelectedLeadIds(new Set())
    } else {
      setSelectedLeadIds(new Set(drawerLeads.map(l => l.id)))
    }
  }

  const handleSaveAndAddLeads = () => {
    const leadsToImport = drawerLeads.filter(l => selectedLeadIds.has(l.id))
    // Deduplicate within the selected batch first
    const uniqueNewLeads: AddedLead[] = []
    const seenEmails = new Set<string>()
    leadsToImport.forEach(lead => {
      const emailLower = lead.email.toLowerCase()
      if (!seenEmails.has(emailLower)) {
        seenEmails.add(emailLower)
        uniqueNewLeads.push(lead)
      }
    })
    // Then deduplicate against existing leads
    setAddedLeads(prev => {
      const existingEmails = new Set(prev.map(l => l.email.toLowerCase()))
      const deduped = uniqueNewLeads.filter(l => !existingEmails.has(l.email.toLowerCase()))
      return [...prev, ...deduped]
    })
    setShowLeadEngineDrawer(false)
    setSelectedSessionIds(new Set())
    setDrawerStep('sessions')
    setDrawerLeads([])
    setSelectedLeadIds(new Set())
  }

  const toggleSessionSelection = (sessionId: number) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
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
                <div className="lead-option-card" onClick={() => setShowLeadEngineDrawer(true)}>
                  <div className="lead-option-icon purple">
                    <i className="fas fa-cog"></i>
                  </div>
                  <h3 className="lead-option-title">Import from Lead Engine</h3>
                  <p className="lead-option-desc">
                    Select a session from Lead Engine to import leads directly.
                  </p>
                  <button
                    className="lead-option-import-btn"
                    onClick={(e) => { e.stopPropagation(); setShowLeadEngineDrawer(true) }}
                  >
                    <i className="fas fa-download"></i>
                    Import from Lead Engine
                  </button>
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

      {/* Lead Engine Drawer */}
      {showLeadEngineDrawer && (
        <div className="le-drawer-overlay" onClick={() => { setShowLeadEngineDrawer(false); setDrawerStep('sessions') }}>
          <div className="le-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="le-drawer-header">
              <div className="le-drawer-header-left">
                <i className="fas fa-pencil-alt le-drawer-edit-icon"></i>
              </div>
              <button className="le-drawer-close" onClick={() => { setShowLeadEngineDrawer(false); setDrawerStep('sessions') }}>
                <i className="fas fa-times"></i>
                Close
              </button>
            </div>

            {/* === STEP 1: Session Selection === */}
            {drawerStep === 'sessions' && (
              <>
                <div className="le-drawer-breadcrumb">
                  <span className="le-drawer-breadcrumb-parent">Add leads</span>
                  <i className="fas fa-chevron-right le-drawer-breadcrumb-sep"></i>
                  <span className="le-drawer-breadcrumb-current">Lead Engine</span>
                </div>

                <div className="le-drawer-body">
                  <h3 className="le-drawer-section-title">Saved Sessions</h3>

                  {loadingSessions ? (
                    <div className="loading-text">Loading sessions...</div>
                  ) : sessions.length > 0 ? (
                    <div className="le-drawer-session-list">
                      {sessions.map(session => (
                        <label key={session.id} className={`le-drawer-session-item ${selectedSessionIds.has(session.id) ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            className="le-drawer-checkbox"
                            checked={selectedSessionIds.has(session.id)}
                            onChange={() => toggleSessionSelection(session.id)}
                          />
                          <div className="le-drawer-session-info">
                            <span className="le-drawer-session-name">{session.name}</span>
                            <span className="le-drawer-session-desc">Email campaign targeting companies in the US</span>
                          </div>
                          <div className="le-drawer-session-meta">
                            <span className="le-drawer-session-leads">
                              <i className="fas fa-users"></i>
                              {session.total_leads} leads
                            </span>
                            <button
                              className="le-drawer-view-btn"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleViewSession(session.id)
                              }}
                            >
                              View
                            </button>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data-text">No sessions available. Generate leads first.</p>
                  )}
                </div>

                <div className="le-drawer-footer">
                  <button className="le-drawer-back-btn" onClick={() => { setShowLeadEngineDrawer(false); setDrawerStep('sessions') }}>
                    Back
                  </button>
                  <button
                    className="le-drawer-next-btn"
                    disabled={selectedSessionIds.size === 0 || loadingDrawerLeads}
                    onClick={handleAddLeadsFromSessions}
                  >
                    <i className="fas fa-plus"></i>
                    {loadingDrawerLeads ? 'Loading...' : 'Add Leads'}
                  </button>
                </div>
              </>
            )}

            {/* === STEP 2: Leads Validation === */}
            {drawerStep === 'leads' && (
              <>
                <div className="le-drawer-breadcrumb">
                  <span className="le-drawer-breadcrumb-parent">Add leads</span>
                  <i className="fas fa-chevron-right le-drawer-breadcrumb-sep"></i>
                  <span className="le-drawer-breadcrumb-parent">Upload File</span>
                  <i className="fas fa-chevron-right le-drawer-breadcrumb-sep"></i>
                  <span className="le-drawer-breadcrumb-current">Detected Leads</span>
                </div>
                
                {loadingDrawerLeads ? (
                  <div className="loading-text" style={{ padding: '40px', textAlign: 'center' }}>Loading leads...</div>
                ) : (
                  <>
                    {/* Validation Summary */}
                    <div className="le-validation-summary">
                      <div className="le-validation-tab">
                        <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b', marginRight: '8px' }}></i>
                        Flagged Leads : <strong>{flaggedLeads.length}</strong>
                      </div>
                      <div className="le-validation-tab">
                        <i className="fas fa-check-circle" style={{ color: '#10b981', marginRight: '8px' }}></i>
                        Detected Leads : <strong>{detectedLeads.length}</strong>
                      </div>
                    </div>

                    <div className="le-drawer-body" style={{ paddingTop: '0' }}>
                      {/* Flagged Leads Section */}
                      {flaggedLeads.length > 0 && (
                        <div className="le-leads-section">
                          <div className="le-leads-section-header">
                            <h3 className="le-leads-section-title">Flagged Leads</h3>
                            <div className="le-leads-section-actions">
                              <button className="le-btn-text" onClick={() => handleDeleteAll('flagged')}>
                                <i className="fas fa-trash"></i> Delete All
                              </button>
                              <label className="le-drawer-select-all">
                                <input
                                  type="checkbox"
                                  checked={flaggedLeads.length > 0 && flaggedLeads.every(lead => selectedLeadIds.has(lead.id))}
                                  onChange={() => {
                                    setSelectedLeadIds(prev => {
                                      const next = new Set(prev)
                                      const allSelected = flaggedLeads.every(lead => prev.has(lead.id))
                                      if (allSelected) {
                                        flaggedLeads.forEach(lead => next.delete(lead.id))
                                      } else {
                                        flaggedLeads.forEach(lead => next.add(lead.id))
                                      }
                                      return next
                                    })
                                  }}
                                />
                                Select All
                              </label>
                            </div>
                          </div>
                          <div className="le-drawer-leads-table-wrap">
                            <table className="le-drawer-leads-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '40px' }}></th>
                                  <th>Name</th>
                                  <th>Company</th>
                                  <th>Email</th>
                                  <th>Issue</th>
                                  <th style={{ width: '60px' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {flaggedLeads.map(lead => (
                                  <tr key={lead.id} className={selectedLeadIds.has(lead.id) ? 'selected' : ''}>
                                    <td>
                                      <input
                                        type="checkbox"
                                        className="le-drawer-checkbox"
                                        checked={selectedLeadIds.has(lead.id)}
                                        onChange={() => toggleLeadSelection(lead.id)}
                                      />
                                    </td>
                                    <td>{lead.name || '—'}</td>
                                    <td>{lead.company || '—'}</td>
                                    <td>{lead.email || '—'}</td>
                                    <td><span className="le-issue-badge">{lead.issue}</span></td>
                                    <td>
                                      <button className="le-action-edit-btn" onClick={() => handleEditLead(lead)} title="Edit">
                                        <i className="fas fa-pen"></i>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Detected Leads Section */}
                      {detectedLeads.length > 0 && (
                        <div className="le-leads-section" style={{ marginTop: flaggedLeads.length > 0 ? '24px' : '0' }}>
                          <div className="le-leads-section-header">
                            <h3 className="le-leads-section-title">Detected Leads</h3>
                            <div className="le-leads-section-actions">
                              <button className="le-btn-text" onClick={() => handleDeleteAll('detected')}>
                                <i className="fas fa-trash"></i> Delete All
                              </button>
                              <label className="le-drawer-select-all">
                                <input
                                  type="checkbox"
                                  checked={detectedLeads.length > 0 && detectedLeads.every(lead => selectedLeadIds.has(lead.id))}
                                  onChange={() => {
                                    setSelectedLeadIds(prev => {
                                      const next = new Set(prev)
                                      const allSelected = detectedLeads.every(lead => prev.has(lead.id))
                                      if (allSelected) {
                                        detectedLeads.forEach(lead => next.delete(lead.id))
                                      } else {
                                        detectedLeads.forEach(lead => next.add(lead.id))
                                      }
                                      return next
                                    })
                                  }}
                                />
                                Select All
                              </label>
                            </div>
                          </div>
                          <div className="le-drawer-leads-table-wrap">
                            <table className="le-drawer-leads-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '40px' }}></th>
                                  <th>Name</th>
                                  <th>Company</th>
                                  <th>Email</th>
                                  <th style={{ width: '60px' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detectedLeads.map(lead => (
                                  <tr key={lead.id} className={selectedLeadIds.has(lead.id) ? 'selected' : ''}>
                                    <td>
                                      <input
                                        type="checkbox"
                                        className="le-drawer-checkbox"
                                        checked={selectedLeadIds.has(lead.id)}
                                        onChange={() => toggleLeadSelection(lead.id)}
                                      />
                                    </td>
                                    <td>{lead.name || '—'}</td>
                                    <td>{lead.company || '—'}</td>
                                    <td>{lead.email || '—'}</td>
                                    <td>
                                      <button className="le-action-edit-btn" onClick={() => handleEditLead(lead)} title="Edit">
                                        <i className="fas fa-pen"></i>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {drawerLeads.length === 0 && (
                        <p className="no-data-text">No leads found in selected session(s).</p>
                      )}
                    </div>
                  </>
                )}
                
                <div className="le-drawer-footer">
                  <button className="le-drawer-back-btn" onClick={() => setDrawerStep('sessions')}>
                    Back
                  </button>
                  <button
                    className="le-drawer-next-btn"
                    disabled={selectedLeadIds.size === 0}
                    onClick={handleSaveAndAddLeads}
                  >
                    <i className="fas fa-plus"></i>
                    Add Leads
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="le-modal-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="le-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="le-modal-title">Are you sure you want to delete this item?</h3>
            <p className="le-modal-subtitle">This action cannot be undone.</p>
            <div className="le-modal-actions">
              <button className="le-modal-btn-cancel" onClick={() => setShowDeleteModal(null)}>
                Cancel
              </button>
              <button className="le-modal-btn-delete" onClick={confirmDeleteAll}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="le-modal-overlay" onClick={() => setEditingLead(null)}>
          <div className="le-modal-content le-edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="le-modal-title">Edit Lead</h3>
            <div className="le-edit-form">
              <div className="le-edit-field">
                <label>Name</label>
                <input
                  type="text"
                  value={editingLead.name}
                  onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div className="le-edit-field">
                <label>Company</label>
                <input
                  type="text"
                  value={editingLead.company}
                  onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })}
                  placeholder="Enter company"
                />
              </div>
              <div className="le-edit-field">
                <label>Email</label>
                <input
                  type="email"
                  value={editingLead.email}
                  onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div className="le-edit-field">
                <label>Title</label>
                <input
                  type="text"
                  value={editingLead.title}
                  onChange={(e) => setEditingLead({ ...editingLead, title: e.target.value })}
                  placeholder="Enter title"
                />
              </div>
            </div>
            <div className="le-modal-actions">
              <button className="le-modal-btn-cancel" onClick={() => setEditingLead(null)}>
                Cancel
              </button>
              <button className="le-modal-btn-save" onClick={handleSaveEditedLead}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
