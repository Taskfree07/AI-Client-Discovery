'use client'

import MainLayout from '@/components/MainLayout'
import { useEffect, useState } from 'react'

interface Template {
  id: number
  name: string
  subject: string
  body: string
  category: string
  created_at: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

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
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || template.category === categoryFilter
    return matchesSearch && matchesCategory
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
        <div className="filter-group">
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="intro">Introduction</option>
            <option value="follow_up">Follow Up</option>
            <option value="value_prop">Value Proposition</option>
            <option value="case_study">Case Study</option>
          </select>
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
                <span className="template-category">{template.category}</span>
              </div>
              <div className="template-card-body">
                <div className="template-subject">
                  <strong>Subject:</strong> {template.subject}
                </div>
                <div className="template-preview">
                  {template.body ? template.body.substring(0, 150) : 'No preview available'}...
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
            {searchTerm || categoryFilter
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
