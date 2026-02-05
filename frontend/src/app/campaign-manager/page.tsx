'use client'

import MainLayout from '@/components/MainLayout'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Campaign {
  id: number
  name: string
  search_keywords: string
  status: string
  leads: number
  created_at: string
}

export default function CampaignManagerPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [campaignName, setCampaignName] = useState('')

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns')
      if (response.ok) {
        const data = await response.json()
        setCampaigns(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false
    if (dateFilter) {
      const created = new Date(c.created_at)
      const now = new Date()
      const diff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      if (dateFilter === '7days' && diff > 7) return false
      if (dateFilter === '30days' && diff > 30) return false
      if (dateFilter === '3months' && diff > 90) return false
      if (dateFilter === '6months' && diff > 180) return false
    }
    return true
  })

  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length
  const pausedCampaigns = campaigns.filter(c => c.status === 'paused').length
  const draftCampaigns = campaigns.filter(c => c.status === 'draft').length

  return (
    <MainLayout>
      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">Campaign Manager</h1>
          <p className="page-subtitle">Create and manage multi-channel outreach campaigns</p>
        </div>
        <button className="btn-primary" onClick={() => { setCampaignName(''); setPanelOpen(true) }}>
          <i className="fas fa-plus"></i>
          New Campaign
        </button>
      </div>

      <div className="stats-grid-4">
        <div className="stat-card-new">
          <div className="stat-card-label blue">Total Campaigns</div>
          <div className="stat-card-value blue">{totalCampaigns}</div>
          <div className="stat-card-desc">Across all channels</div>
        </div>

        <div className="stat-card-new">
          <div className="stat-card-label green">Active</div>
          <div className="stat-card-value green">{activeCampaigns}</div>
          <div className="stat-card-desc">Across all channels</div>
        </div>

        <div className="stat-card-new">
          <div className="stat-card-label yellow">Paused</div>
          <div className="stat-card-value yellow">{pausedCampaigns}</div>
          <div className="stat-card-desc">Across all channels</div>
        </div>

        <div className="stat-card-new">
          <div className="stat-card-label orange">Drafts</div>
          <div className="stat-card-value orange">{draftCampaigns}</div>
          <div className="stat-card-desc">Across all channels</div>
        </div>
      </div>

      <div className="filters-row-inline">
        <div className="filter-item">
          <label className="filter-label">Campaign Type</label>
          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="email">Email</option>
            <option value="linkedin">LinkedIn</option>
            <option value="multi">Multi-channel</option>
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-label">Status</label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-label">Date Range</label>
          <select
            className="filter-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="">All Time</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="3months">Last 3 months</option>
            <option value="6months">Last 6 months</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading campaigns...</p>
        </div>
      ) : filteredCampaigns.length > 0 ? (
        <div className="campaigns-list">
          {filteredCampaigns.map(campaign => (
            <div key={campaign.id} className="campaign-card">
              <div className="campaign-card-main">
                <div className="campaign-info">
                  <h3 className="campaign-title">{campaign.name}</h3>
                  <p className="campaign-description">{campaign.search_keywords}</p>
                  <div className="campaign-meta">
                    <span className={`campaign-status ${campaign.status}`}>
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                    <span className="campaign-leads">
                      <i className="fas fa-users"></i> {campaign.leads} leads
                    </span>
                    <span className="campaign-date">
                      <i className="far fa-clock"></i> {new Date(campaign.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="campaign-actions">
                  <button className="icon-btn" title="Edit">
                    <i className="far fa-edit"></i>
                  </button>
                  <button className="icon-btn" title="Settings">
                    <i className="fas fa-cog"></i>
                  </button>
                  <button className="icon-btn" title="Export">
                    <i className="fas fa-share-alt"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <i className="fas fa-bullhorn"></i>
          </div>
          <h3 className="empty-state-title">No campaigns yet</h3>
          <p className="empty-state-description">
            Create your first campaign to start reaching out to leads.
          </p>
          <button className="btn-primary" onClick={() => { setCampaignName(''); setPanelOpen(true) }}>
            <i className="fas fa-plus"></i>
            New Campaign
          </button>
        </div>
      )}
      {/* Slide-out overlay */}
      <div
        className={`slideout-overlay ${panelOpen ? 'open' : ''}`}
        onClick={() => setPanelOpen(false)}
      />

      {/* Slide-out Panel - New Campaign */}
      <div className={`slideout-panel ${panelOpen ? 'open' : ''}`}>
        <div className="slideout-panel-header">
          <h2 className="slideout-panel-title">New Campaign</h2>
          <button className="panel-close-text" onClick={() => setPanelOpen(false)}>
            <i className="fas fa-times"></i>
            <span>close</span>
          </button>
        </div>

        <div className="slideout-panel-body">
          <div className="panel-field">
            <label className="panel-label">Campaign Name</label>
            <input
              type="text"
              className="panel-input"
              placeholder="Enter campaign name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          <div className="panel-footer">
            <button
              className="panel-generate-btn"
              onClick={() => {
                setPanelOpen(false)
                router.push('/campaign-manager/new')
              }}
            >
              Start Campaign
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
