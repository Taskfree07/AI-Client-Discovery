'use client'

import MainLayout from '@/components/MainLayout'
import { useState } from 'react'

interface FormData {
  sessionTitle: string
  jobTitles: string[]
  numJobs: number
  locations: string[]
  industries: string[]
  keywords: string[]
  companySizes: string[]
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

export default function LeadEnginePage() {
  const [formData, setFormData] = useState<FormData>({
    sessionTitle: '',
    jobTitles: [],
    numJobs: 100,
    locations: [],
    industries: [],
    keywords: [],
    companySizes: ['small', 'mid', 'large']
  })
  const [jobTitleInput, setJobTitleInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [industryInput, setIndustryInput] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [showResults, setShowResults] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [loadingProgress, setLoadingProgress] = useState(0)

  const addTag = (field: keyof Pick<FormData, 'jobTitles' | 'locations' | 'industries' | 'keywords'>, value: string) => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }))
    }
  }

  const removeTag = (field: keyof Pick<FormData, 'jobTitles' | 'locations' | 'industries' | 'keywords'>, index: number) => {
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, field: string, setter: (v: string) => void) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const fieldMap: Record<string, keyof Pick<FormData, 'jobTitles' | 'locations' | 'industries' | 'keywords'>> = {
        jobTitle: 'jobTitles',
        location: 'locations',
        industry: 'industries',
        keyword: 'keywords'
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

    setIsGenerating(true)
    setLoadingMessage('Initializing Lead Engine...')
    setLoadingProgress(0)
    setLeads([])

    try {
      const response = await fetch('/api/lead-engine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_title: formData.sessionTitle || 'Untitled Session',
          job_titles: formData.jobTitles,
          num_jobs: formData.numJobs,
          locations: formData.locations.length > 0 ? formData.locations : null,
          industries: formData.industries.length > 0 ? formData.industries : null,
          keywords: formData.keywords.length > 0 ? formData.keywords : null,
          company_sizes: formData.companySizes.length > 0 ? formData.companySizes : null
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
      alert('Error generating leads: ' + (error as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStreamData = (data: any) => {
    switch (data.type) {
      case 'status':
        setLoadingMessage(data.message)
        setLoadingProgress(data.progress || 0)
        break
      case 'lead':
        setLeads(prev => [...prev, data.data])
        setLoadingMessage(`Found ${leads.length + 1} leads...`)
        setLoadingProgress(data.progress || 50)
        break
      case 'complete':
        setShowResults(true)
        break
      case 'error':
        alert('Error: ' + data.message)
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

  return (
    <MainLayout>
      <div className="lead-search-header">
        <label className="session-title-label">Session Title :</label>
        <input
          type="text"
          className="session-title-input"
          placeholder={`Lead Search - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
          value={formData.sessionTitle}
          onChange={(e) => setFormData(prev => ({ ...prev, sessionTitle: e.target.value }))}
        />
      </div>

      <div className="search-panel">
        <div className="search-row">
          <div className="search-group flex-grow">
            <label className="search-label">Job Titles</label>
            <div className="search-input-wrapper">
              <i className="fas fa-search search-icon-inner"></i>
              <input
                type="text"
                className="search-input"
                placeholder="Search for Job Titles here"
                value={jobTitleInput}
                onChange={(e) => setJobTitleInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'jobTitle', setJobTitleInput)}
              />
            </div>
            <div className="tags-container">
              {formData.jobTitles.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <span className="tag-remove" onClick={() => removeTag('jobTitles', index)}>×</span>
                </span>
              ))}
            </div>
          </div>

          <div className="search-group number-group">
            <label className="search-label">Number of Jobs</label>
            <input
              type="number"
              className="number-input"
              value={formData.numJobs}
              onChange={(e) => setFormData(prev => ({ ...prev, numJobs: parseInt(e.target.value) || 100 }))}
              min="1"
              max="500"
            />
          </div>
        </div>

        <div className="search-actions">
          <button className="btn-secondary advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
            Advanced Options
            <i className={`fas fa-chevron-${showAdvanced ? 'up' : 'down'} ml-2`}></i>
          </button>

          <button 
            className="btn-primary btn-green" 
            onClick={generateLeads}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="spinner-sm"></span>
                Generating...
              </>
            ) : (
              'Generate Leads'
            )}
          </button>
        </div>

        {showAdvanced && (
          <div className="advanced-options show">
            <div className="advanced-grid">
              <div>
                <div className="search-group" style={{ marginBottom: '20px' }}>
                  <label className="search-label">Locations</label>
                  <div className="search-input-wrapper">
                    <i className="fas fa-search search-icon-inner"></i>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search for Locations here"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'location', setLocationInput)}
                    />
                  </div>
                  <div className="tags-container">
                    {formData.locations.map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                        <span className="tag-remove" onClick={() => removeTag('locations', index)}>x</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="search-group">
                  <label className="search-label">Company Size</label>
                  <div className="size-options">
                    <label className="size-option">
                      <input
                        type="checkbox"
                        checked={formData.companySizes.includes('small')}
                        onChange={() => toggleCompanySize('small')}
                      />
                      <span>Small(1-50)</span>
                    </label>
                    <label className="size-option">
                      <input
                        type="checkbox"
                        checked={formData.companySizes.includes('mid')}
                        onChange={() => toggleCompanySize('mid')}
                      />
                      <span>Mid(51-500)</span>
                    </label>
                    <label className="size-option">
                      <input
                        type="checkbox"
                        checked={formData.companySizes.includes('large')}
                        onChange={() => toggleCompanySize('large')}
                      />
                      <span>Large(500+)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <div className="search-group" style={{ marginBottom: '20px' }}>
                  <label className="search-label">Industries</label>
                  <div className="search-input-wrapper">
                    <span className="search-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    </span>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search for field here"
                      value={industryInput}
                      onChange={(e) => setIndustryInput(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'industry', setIndustryInput)}
                    />
                  </div>
                  <div className="tags-container">
                    {formData.industries.map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                        <span className="tag-remove" onClick={() => removeTag('industries', index)}>x</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="search-group">
                  <label className="search-label">Key Words</label>
                  <div className="search-input-wrapper">
                    <span className="search-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    </span>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search for Key Words here"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'keyword', setKeywordInput)}
                    />
                  </div>
                  <div className="tags-container">
                    {formData.keywords.map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                        <span className="tag-remove" onClick={() => removeTag('keywords', index)}>x</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          className="generate-btn"
          onClick={generateLeads}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Leads'}
        </button>
      </div>

      {showResults && (
        <div className="results-section">
          <div className="results-header">
            <h2 className="results-title">Lead Summary</h2>
            <div className="results-actions">
              <button className="action-btn action-btn-outline" onClick={exportCSV}>Export CSV</button>
              <button className="action-btn action-btn-primary" onClick={() => alert('Send to Campaign - Coming soon!')}>
                Send to Campaign
              </button>
            </div>
          </div>

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
                lead.pocs.map((poc, pocIndex) => (
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
              )}
            </tbody>
          </table>

          {leads.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <h3 className="empty-state-title">No leads found</h3>
              <p className="empty-state-text">Try adjusting your search criteria</p>
            </div>
          )}
        </div>
      )}

      {isGenerating && (
        <div className="loading-overlay show">
          <div className="loading-spinner"></div>
          <div className="loading-text">{loadingMessage}</div>
          <div className="loading-progress">
            <div className="loading-progress-bar" style={{ width: `${loadingProgress}%` }}></div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
