'use client'

import MainLayout from '@/components/MainLayout'
import { useState } from 'react'
import Link from 'next/link'

interface Campaign {
  id: number
  name: string
  description: string
  status: 'active' | 'paused' | 'draft' | 'completed'
  leads: number
  lastUpdated: string
  progress: number
  openRate: number
  clickRate: number
}

export default function CampaignManagerPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // Sample campaigns data
  const campaigns: Campaign[] = [
    {
      id: 1,
      name: 'Campaign no.1 Ai developer leads',
      description: 'Email campaign targeting companies in the US',
      status: 'active',
      leads: 150,
      lastUpdated: 'Update Jan 8',
      progress: 80,
      openRate: 30,
      clickRate: 40
    },
    {
      id: 2,
      name: 'Campaign no.2 java leads',
      description: 'Email campaign targeting companies in the US',
      status: 'active',
      leads: 150,
      lastUpdated: 'Update Jan 8',
      progress: 80,
      openRate: 30,
      clickRate: 40
    },
    {
      id: 3,
      name: 'Campaign no.3 Python leads',
      description: 'Email campaign targeting companies in the US',
      status: 'active',
      leads: 150,
      lastUpdated: 'Update Jan 8',
      progress: 80,
      openRate: 30,
      clickRate: 40
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22C55E'
      case 'paused': return '#F59E0B'
      case 'draft': return '#6B7280'
      case 'completed': return '#3B82F6'
      default: return '#6B7280'
    }
  }

  return (
    <MainLayout>
      <div className="page-header">
        <h1 className="page-title">Campaign Manager</h1>
        <p className="page-subtitle">Create and manage multi-channel outreach campaigns</p>
      </div>

      <div className="stats-grid-4">
        <div className="stat-card-new">
          <div className="stat-card-label blue">Total Campaigns</div>
          <div className="stat-card-value blue">5</div>
          <div className="stat-card-desc">Across all channels</div>
        </div>

        <div className="stat-card-new">
          <div className="stat-card-label green">Active</div>
          <div className="stat-card-value green">2</div>
          <div className="stat-card-desc">Across all channels</div>
        </div>

        <div className="stat-card-new">
          <div className="stat-card-label yellow">Paused</div>
          <div className="stat-card-value yellow">1</div>
          <div className="stat-card-desc">Across all channels</div>
        </div>

        <div className="stat-card-new">
          <div className="stat-card-label orange">Drafts</div>
          <div className="stat-card-value orange">6</div>
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

      <div className="campaigns-list">
        {campaigns.map(campaign => (
          <div key={campaign.id} className="campaign-card">
            <div className="campaign-card-main">
              <div className="campaign-info">
                <h3 className="campaign-title">{campaign.name}</h3>
                <p className="campaign-description">{campaign.description}</p>
                <div className="campaign-meta">
                  <span className={`campaign-status ${campaign.status}`}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                  <span className="campaign-leads">
                    <i className="fas fa-users"></i> {campaign.leads} leads
                  </span>
                  <span className="campaign-date">
                    <i className="far fa-clock"></i> {campaign.lastUpdated}
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
            <div className="campaign-progress-section">
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${campaign.progress}%` }}></div>
              </div>
              <div className="campaign-stats-row">
                <span className="progress-text">{campaign.progress}% complete</span>
                <span className="campaign-rates">{campaign.openRate}% open rate • {campaign.clickRate}% click rate</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  )
}
