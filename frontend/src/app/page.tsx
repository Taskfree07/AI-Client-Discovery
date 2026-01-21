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
    async function fetchData() {
      try {
        const [campaignsRes, leadsRes, logsRes] = await Promise.all([
          fetch('/api/campaigns'),
          fetch('/api/leads'),
          fetch('/api/logs'),
        ])

        const campaignsData = await campaignsRes.json()
        const leadsData = await leadsRes.json()
        const logsData = await logsRes.json()

        setStats({
          totalCampaigns: campaignsData.length || 0,
          activeCampaigns: campaignsData.filter((c: any) => c.status === 'active').length || 0,
          totalLeads: leadsData.length || 0,
          emailsSent: leadsData.filter((l: any) => l.email_sent).length || 0,
        })

        setCampaigns(campaignsData)
        setLogs(logsData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <MainLayout>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Automated recruitment campaign management</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Campaigns</span>
            <div className="stat-icon primary">
              <i className="fas fa-clipboard-list"></i>
            </div>
          </div>
          <div className="stat-value">{stats.totalCampaigns}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Active Campaigns</span>
            <div className="stat-icon success">
              <i className="fas fa-check-circle"></i>
            </div>
          </div>
          <div className="stat-value">{stats.activeCampaigns}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Leads</span>
            <div className="stat-icon secondary">
              <i className="fas fa-users"></i>
            </div>
          </div>
          <div className="stat-value">{stats.totalLeads}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Emails Sent</span>
            <div className="stat-icon warning">
              <i className="fas fa-envelope"></i>
            </div>
          </div>
          <div className="stat-value">{stats.emailsSent}</div>
        </div>
      </div>

      {/* Campaigns Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Campaigns</h2>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Keywords</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="loading"></div> Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No campaigns yet. Start your first campaign from the Campaign Manager.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>{campaign.name}</td>
                    <td>{campaign.search_keywords}</td>
                    <td>
                      <span className={`badge badge-${campaign.status === 'active' ? 'success' : 'secondary'}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td>{new Date(campaign.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Activity</h2>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="loading"></div> Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No recent activity
                  </td>
                </tr>
              ) : (
                logs.slice(0, 10).map((log: any) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>{log.action?.replace(/_/g, ' ')}</td>
                    <td>{log.details}</td>
                    <td>
                      <span className={`badge badge-${log.status === 'success' ? 'success' : log.status === 'error' ? 'warning' : 'secondary'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}
