'use client'

import MainLayout from '@/components/MainLayout'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface Sender {
  id: number
  email: string
  label: string
  status: 'connected' | 'expired'
  provider: 'gmail' | 'outlook' | 'smtp'
  isDefault: boolean
}

function SenderProfileContent() {
  const [senders, setSenders] = useState<Sender[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [connectingGmail, setConnectingGmail] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    loadSenders()
  }, [])

  // Show success message if redirected from OAuth callback
  useEffect(() => {
    const success = searchParams.get('success')
    const email = searchParams.get('email')
    const error = searchParams.get('error')
    if (success && email) {
      loadSenders()
    }
    if (error) {
      alert('Error connecting account: ' + error)
    }
  }, [searchParams])

  const loadSenders = async () => {
    try {
      const response = await fetch('/api/senders')
      if (response.ok) {
        const data = await response.json()
        setSenders(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading senders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectGmail = async () => {
    setConnectingGmail(true)
    try {
      const response = await fetch('/api/auth/gmail/start')
      if (response.ok) {
        const data = await response.json()
        if (data.auth_url) {
          window.location.href = data.auth_url
        }
      } else {
        alert('Failed to start Gmail OAuth')
      }
    } catch (error) {
      console.error('Error starting Gmail OAuth:', error)
      alert('Error connecting to Gmail')
    } finally {
      setConnectingGmail(false)
    }
  }

  const handleReconnect = async (id: number) => {
    const sender = senders.find(s => s.id === id)
    if (sender?.provider === 'gmail') {
      handleConnectGmail()
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/senders/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setSenders(prev => prev.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error('Error deleting sender:', error)
    }
    setOpenMenuId(null)
  }

  const handleSetDefault = async (id: number) => {
    try {
      const response = await fetch(`/api/senders/${id}/default`, { method: 'PUT' })
      if (response.ok) {
        setSenders(prev => prev.map(s => ({ ...s, isDefault: s.id === id })))
      }
    } catch (error) {
      console.error('Error setting default:', error)
    }
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
          <button className="btn-primary" onClick={handleConnectGmail} disabled={connectingGmail}>
            <i className="fab fa-google"></i>
            {connectingGmail ? 'Connecting...' : 'Connect Gmail'}
          </button>
          <button className="btn-secondary" disabled>
            <i className="fab fa-microsoft"></i>
            Connect Outlook
          </button>
        </div>
      </div>

      {/* Existing Senders Section */}
      <div className="sender-section">
        <h3 className="sender-section-title">Existing Senders</h3>
        {loading ? (
          <div className="loading-text" style={{ padding: '20px' }}>Loading senders...</div>
        ) : senders.length > 0 ? (
          <div className="sender-list">
            {senders.map(sender => (
              <div key={sender.id} className="sender-row">
                <div className="sender-row-left">
                  <div className="sender-email-icon">
                    <i className={`fab fa-${sender.provider === 'gmail' ? 'google' : sender.provider === 'outlook' ? 'microsoft' : 'fas fa-server'}`}></i>
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
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            No sender accounts connected yet. Click "Connect Gmail" above to add one.
          </div>
        )}
      </div>

      {/* Analytics Summary */}
      <div className="stats-grid-4 sender-stats-grid">
        <div className="stat-card-new">
          <div className="stat-card-label blue">Accounts</div>
          <div className="stat-card-value blue">{senders.length}</div>
          <div className="stat-card-desc">Connected</div>
        </div>
        <div className="stat-card-new">
          <div className="stat-card-label green">Active</div>
          <div className="stat-card-value green">{senders.filter(s => s.status === 'connected').length}</div>
          <div className="stat-card-desc">Ready to send</div>
        </div>
        <div className="stat-card-new">
          <div className="stat-card-label orange">Expired</div>
          <div className="stat-card-value orange">{senders.filter(s => s.status === 'expired').length}</div>
          <div className="stat-card-desc">Need reconnect</div>
        </div>
      </div>

      {/* Security Note */}
      <div className="sender-security-note">
        <i className="fas fa-shield-alt"></i>
        <span>Security Note: We use OAuth and API-based sending. Your password is never stored.</span>
      </div>
    </MainLayout>
  )
}

export default function SenderProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SenderProfileContent />
    </Suspense>
  )
}
