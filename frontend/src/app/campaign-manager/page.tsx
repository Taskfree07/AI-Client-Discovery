'use client'

import MainLayout from '@/components/MainLayout'
import { useState } from 'react'
import Link from 'next/link'

export default function CampaignManagerPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  return (
    <MainLayout>
      <div className="page-header">
        <h1 className="page-title">Campaign Manager</h1>
        <p className="page-subtitle">Create and manage multi-channel outreach campaigns</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label blue">Total Campaigns</div>
          <div className="stat-value blue">5</div>
          <div className="stat-description">Across all channels</div>
        </div>

        <div className="stat-card">
          <div className="stat-label green">Active</div>
          <div className="stat-value green">2</div>
          <div className="stat-description">Across all channels</div>
        </div>

        <div className="stat-card">
          <div className="stat-label yellow">Paused</div>
          <div className="stat-value yellow">1</div>
          <div className="stat-description">Across all channels</div>
        </div>

        <div className="stat-card">
          <div className="stat-label orange">Drafts</div>
          <div className="stat-value orange">6</div>
          <div className="stat-description">Across all channels</div>
        </div>
      </div>

      <div className="filters-row">
        <div className="filter-group">
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

        <div className="filter-group">
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

        <div className="filter-group">
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

      <div className="empty-state-card">
        <div className="empty-state-icon">
          <i className="fas fa-rocket"></i>
        </div>
        <h3 className="empty-state-title">No Campaigns Yet</h3>
        <p className="empty-state-description">
          Start your first outreach campaign to connect with potential leads.
          Set up automated email sequences, define your targeting rules, and track performance.
        </p>
        <Link href="/campaign-manager/new" className="btn-primary">
          <i className="fas fa-plus"></i>
          Start New Campaign
        </Link>
      </div>
    </MainLayout>
  )
}
