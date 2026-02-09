'use client'

import MainLayout from '@/components/MainLayout'
import { useState } from 'react'

interface Sender {
  id: number
  email: string
  label: string
  status: 'connected' | 'expired'
  provider: 'gmail' | 'outlook' | 'smtp'
  isDefault: boolean
}

export default function SenderProfilePage() {
  const [senders, setSenders] = useState<Sender[]>([
    { id: 1, email: 'marketing@example.com', label: 'Marketing', status: 'connected', provider: 'gmail', isDefault: false },
    { id: 2, email: 'sales@example.com', label: 'Sales Profile', status: 'connected', provider: 'outlook', isDefault: false },
    { id: 3, email: 'hr@example.com', label: 'HR Outreach', status: 'expired', provider: 'gmail', isDefault: true },
  ])
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const handleReconnect = (id: number) => {
    setSenders(prev => prev.map(s => s.id === id ? { ...s, status: 'connected' as const } : s))
  }

  const handleDelete = (id: number) => {
    setSenders(prev => prev.filter(s => s.id !== id))
    setOpenMenuId(null)
  }

  const handleSetDefault = (id: number) => {
    setSenders(prev => prev.map(s => ({ ...s, isDefault: s.id === id })))
    setOpenMenuId(null)
  }

  const toggleMenu = (id: number) => {
    setOpenMenuId(prev => prev === id ? null : id)
  }

  return (
    <MainLayout>
      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">Sender Profile</h1>
          <p className="page-subtitle">Manage your email sender for multi-channel outreach campaigns</p>
        </div>
        <button className="btn-primary">
          <i className="fas fa-plus"></i>
          Add Sender
        </button>
      </div>

      {/* Add New Sender Card */}
      <div className="sender-connect-card">
        <h3 className="sender-connect-title">Add New Sender</h3>
        <div className="sender-connect-body">
          <div className="sender-connect-icon">
            <i className="fas fa-envelope-open-text"></i>
          </div>
          <div className="sender-connect-info">
            <h4 className="sender-connect-heading">Connect an email account</h4>
            <p className="sender-connect-desc">to start sending outreach campaigns</p>
          </div>
        </div>
        <div className="sender-connect-actions">
          <button className="btn-primary">
            <i className="fab fa-google"></i>
            Connect Gmail
          </button>
          <button className="btn-secondary">
            <i className="fab fa-microsoft"></i>
            Connect Outlook
          </button>
        </div>
        <button className="sender-smtp-link">
          <i className="fas fa-plus"></i>
          Add Custom SMTP Email
        </button>
      </div>

      {/* Existing Senders Section */}
      <div className="sender-section">
        <h3 className="sender-section-title">Existing Senders</h3>
        <div className="sender-list">
          {senders.map(sender => (
            <div key={sender.id} className="sender-row">
              <div className="sender-row-left">
                <div className="sender-email-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="sender-row-info">
                  <div className="sender-email-address">{sender.email}</div>
                  <div className="sender-label-row">
                    <span className="sender-profile-label">{sender.label}</span>
                    {sender.isDefault && <span className="sender-default-badge">Default</span>}
                  </div>
                </div>
                <div className={`sender-status ${sender.status}`}>
                  <span className="sender-status-dot"></span>
                  {sender.status === 'connected' ? 'Connected' : 'Token expired'}
                </div>
              </div>
              <div className="sender-row-right">
                {sender.status === 'expired' && (
                  <button className="btn-outline sender-reconnect-btn" onClick={() => handleReconnect(sender.id)}>
                    Reconnect
                  </button>
                )}
                <div className="sender-menu-wrapper">
                  <button className="icon-btn" onClick={() => toggleMenu(sender.id)} title="More actions">
                    <i className="fas fa-ellipsis-v"></i>
                  </button>
                  {openMenuId === sender.id && (
                    <div className="sender-dropdown-menu">
                      <button className="sender-dropdown-item" onClick={() => setOpenMenuId(null)}>
                        <i className="far fa-edit"></i> Edit
                      </button>
                      <button className="sender-dropdown-item" onClick={() => handleDelete(sender.id)}>
                        <i className="far fa-trash-alt"></i> Delete
                      </button>
                      <button className="sender-dropdown-item" onClick={() => handleSetDefault(sender.id)}>
                        <i className="far fa-check-circle"></i> Set as Default
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="sender-add-link">
          <i className="fas fa-plus"></i>
          Add New Sender
        </button>
      </div>

      {/* Analytics Summary */}
      <div className="stats-grid-4 sender-stats-grid">
        <div className="stat-card-new">
          <div className="stat-card-label blue">Emails Sent</div>
          <div className="stat-card-value blue">3,520</div>
          <div className="stat-card-desc">Emails Sent</div>
        </div>
        <div className="stat-card-new">
          <div className="stat-card-label green">Open Rate</div>
          <div className="stat-card-value green">46%</div>
          <div className="stat-card-desc">Open Rate</div>
        </div>
        <div className="stat-card-new">
          <div className="stat-card-label orange">Reply Rate</div>
          <div className="stat-card-value orange">12%</div>
          <div className="stat-card-desc">Reply Rate</div>
        </div>
      </div>

      {/* Security Note */}
      <div className="sender-security-note">
        <i className="fas fa-shield-alt"></i>
        <span>Security Note: We use OAuth and API-based sending. Your password is never stored.</span>
        <button className="sender-test-btn">Send Test Email</button>
      </div>
    </MainLayout>
  )
}
