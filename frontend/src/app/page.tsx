'use client'

import MainLayout from '@/components/MainLayout'
import { useEffect, useState } from 'react'

interface Stats {
  totalCampaigns: number
  activeCampaigns: number
  totalLeads: number
  emailsSent: number
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalLeads: 0,
    emailsSent: 0,
  })
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchData() {
      try {
        let campaignsData: any[] = []
        let leadsData: any[] = []
        let logsData: any[] = []

        try {
          const campaignsRes = await fetch('/api/campaigns', { signal: controller.signal })
          if (campaignsRes.ok) {
            const data = await campaignsRes.json()
            campaignsData = Array.isArray(data) ? data : []
          }
        } catch (error: any) {
          if (error?.name === 'AbortError') return
          console.error('Error fetching campaigns:', error)
        }

        try {
          const leadsRes = await fetch('/api/leads', { signal: controller.signal })
          if (leadsRes.ok) {
            const data = await leadsRes.json()
            leadsData = Array.isArray(data) ? data : []
          }
        } catch (error: any) {
          if (error?.name === 'AbortError') return
          console.error('Error fetching leads:', error)
        }

        try {
          const logsRes = await fetch('/api/logs', { signal: controller.signal })
          if (logsRes.ok) {
            const data = await logsRes.json()
            logsData = Array.isArray(data) ? data : []
          }
        } catch (error: any) {
          if (error?.name === 'AbortError') return
          console.error('Error fetching logs:', error)
        }

        setStats({
          totalCampaigns: campaignsData.length || 0,
          activeCampaigns: campaignsData.filter((c: any) => c.status === 'active').length || 0,
          totalLeads: leadsData.length || 0,
          emailsSent: leadsData.filter((l: any) => l.email_sent).length || 0,
        })

        setCampaigns(campaignsData)
        setLogs(logsData)
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    return () => controller.abort() // Cleanup: cancel all fetches if component unmounts
  }, [])

  return (
    <MainLayout>
      <div className="dashboard-page">
        <div className="page-header">
          <div className="page-header-content">
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Overview of your outreach campaigns and leads</p>
          </div>
          <div className="page-header-actions">
            <button className="btn-secondary">
              <i className="fas fa-download"></i>
              Export Report
            </button>
            <a href="/campaign-manager/new" className="btn-primary">
              <i className="fas fa-plus"></i>
              New Campaign
            </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="dashboard-stats-grid">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon blue">
              <i className="fas fa-bullhorn"></i>
            </div>
            <div className="dashboard-stat-content">
              <span className="dashboard-stat-value">{stats.totalCampaigns}</span>
              <span className="dashboard-stat-label">Total Campaigns</span>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon green">
              <i className="fas fa-play-circle"></i>
            </div>
            <div className="dashboard-stat-content">
              <span className="dashboard-stat-value">{stats.activeCampaigns}</span>
              <span className="dashboard-stat-label">Active Campaigns</span>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon purple">
              <i className="fas fa-users"></i>
            </div>
            <div className="dashboard-stat-content">
              <span className="dashboard-stat-value">{stats.totalLeads}</span>
              <span className="dashboard-stat-label">Total Leads</span>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon orange">
              <i className="fas fa-paper-plane"></i>
            </div>
            <div className="dashboard-stat-content">
              <span className="dashboard-stat-value">{stats.emailsSent}</span>
              <span className="dashboard-stat-label">Emails Sent</span>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="dashboard-grid-2">
          {/* Campaigns Card */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">
                <i className="fas fa-clipboard-list"></i>
                Recent Campaigns
              </h2>
              <a href="/campaign-manager" className="dashboard-card-link">View All</a>
            </div>

            <div className="dashboard-card-body">
              {loading ? (
                <div className="dashboard-loading">
                  <div className="loading-spinner"></div>
                  <span>Loading campaigns...</span>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="dashboard-empty">
                  <i className="fas fa-inbox"></i>
                  <p>No campaigns yet</p>
                  <a href="/campaign-manager/new" className="btn-primary btn-sm">Create Campaign</a>
                </div>
              ) : (
                <div className="dashboard-list">
                  {campaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="dashboard-list-item">
                      <div className="dashboard-list-item-info">
                        <span className="dashboard-list-item-name">{campaign.name}</span>
                        <span className="dashboard-list-item-meta">{campaign.search_keywords}</span>
                      </div>
                      <span className={`status-badge ${campaign.status}`}>
                        {campaign.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">
                <i className="fas fa-clock"></i>
                Recent Activity
              </h2>
              <a href="/analytics" className="dashboard-card-link">View All</a>
            </div>

            <div className="dashboard-card-body">
              {loading ? (
                <div className="dashboard-loading">
                  <div className="loading-spinner"></div>
                  <span>Loading activity...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="dashboard-empty">
                  <i className="fas fa-history"></i>
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="dashboard-activity-list">
                  {logs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="dashboard-activity-item">
                      <div className={`activity-icon ${log.status}`}>
                        <i className={`fas ${log.status === 'success' ? 'fa-check' : log.status === 'error' ? 'fa-times' : 'fa-info'}`}></i>
                      </div>
                      <div className="activity-content">
                        <span className="activity-action">{log.action?.replace(/_/g, ' ')}</span>
                        <span className="activity-time">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">
              <i className="fas fa-bolt"></i>
              Quick Actions
            </h2>
          </div>
          <div className="dashboard-quick-actions">
            <a href="/lead-engine/search" className="quick-action-card">
              <div className="quick-action-icon blue">
                <i className="fas fa-search"></i>
              </div>
              <span className="quick-action-title">Search Leads</span>
              <span className="quick-action-desc">Find new prospects</span>
            </a>
            <a href="/campaign-manager/new" className="quick-action-card">
              <div className="quick-action-icon green">
                <i className="fas fa-plus"></i>
              </div>
              <span className="quick-action-title">New Campaign</span>
              <span className="quick-action-desc">Start outreach</span>
            </a>
            <a href="/campaign-manager/templates" className="quick-action-card">
              <div className="quick-action-icon purple">
                <i className="fas fa-file-alt"></i>
              </div>
              <span className="quick-action-title">Email Templates</span>
              <span className="quick-action-desc">Manage templates</span>
            </a>
            <a href="/analytics" className="quick-action-card">
              <div className="quick-action-icon orange">
                <i className="fas fa-chart-bar"></i>
              </div>
              <span className="quick-action-title">Analytics</span>
              <span className="quick-action-desc">View performance</span>
            </a>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
