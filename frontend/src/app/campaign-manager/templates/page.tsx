'use client'

import MainLayout from '@/components/MainLayout'
import { useEffect, useState } from 'react'

interface Template {
  id: number
  name: string
  subject_template: string
  body_template: string
  is_default: boolean
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    return template.name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <MainLayout>
      <div className="page-header">
        <h1 className="page-title">Email Templates</h1>
        <p className="page-subtitle">Manage your email campaign templates</p>
      </div>

      <div className="filters-row">
        <div className="filter-group">
          <input
            type="text"
            className="form-input"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => alert('Create Template - Coming soon!')}>
          <i className="fas fa-plus"></i>
          New Template
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading templates...</p>
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className="templates-grid">
          {filteredTemplates.map(template => (
            <div key={template.id} className="template-card">
              <div className="template-card-header">
                <h3 className="template-card-title">{template.name}</h3>
                {template.is_default && <span className="template-category">Default</span>}
              </div>
              <div className="template-card-body">
                <div className="template-subject">
                  <strong>Subject:</strong> {template.subject_template}
                </div>
                <div className="template-preview">
                  {template.body_template ? template.body_template.substring(0, 150) : 'No preview available'}...
                </div>
              </div>
              <div className="template-card-footer">
                <button className="btn-secondary" onClick={() => alert('Edit Template - Coming soon!')}>
                  Edit
                </button>
                <button className="btn-outline" onClick={() => alert('Preview - Coming soon!')}>
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <i className="fas fa-envelope"></i>
          </div>
          <h3 className="empty-state-title">No Templates Found</h3>
          <p className="empty-state-description">
            {searchTerm
              ? 'No templates match your search criteria.'
              : 'Create your first email template to use in campaigns.'}
          </p>
          <button className="btn-primary" onClick={() => alert('Create Template - Coming soon!')}>
            <i className="fas fa-plus"></i>
            Create Template
          </button>
        </div>
      )}
    </MainLayout>
  )
}
