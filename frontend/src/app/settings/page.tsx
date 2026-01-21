'use client'

import MainLayout from '@/components/MainLayout'
import { useEffect, useState } from 'react'

interface SettingsData {
  google_api_key: string
  google_cx_code: string
  apollo_api_key: string
  azure_client_id: string
  azure_client_secret: string
  azure_tenant_id: string
  sender_email: string
  google_spreadsheet_id: string
  default_company_size_min: number
  default_company_size_max: number
  default_jobs_per_run: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    google_api_key: '',
    google_cx_code: '',
    apollo_api_key: '',
    azure_client_id: '',
    azure_client_secret: '',
    azure_tenant_id: '',
    sender_email: '',
    google_spreadsheet_id: '',
    default_company_size_min: 50,
    default_company_size_max: 200,
    default_jobs_per_run: 10
  })
  const [loading, setLoading] = useState(true)
  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        alert('Settings saved successfully!')
      } else {
        alert('Error saving settings')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving settings')
    }
  }

  const testGoogleAPI = async () => {
    setTestResult('Testing...')
    try {
      const response = await fetch('/api/settings/test-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()

      if (result.valid) {
        setTestResult(`✓ ${result.message}`)
      } else {
        setTestResult(`✗ ${result.message}`)
      }
    } catch (error) {
      setTestResult(`✗ Error: ${(error as Error).message}`)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your API keys and application settings</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="settings-grid">
          <div className="settings-section">
            <h2 className="settings-section-title">Google Custom Search API</h2>
            <p className="settings-section-description">
              Configure Google Custom Search to find job openings across the web.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="google_api_key">API Key</label>
              <input
                type="text"
                id="google_api_key"
                name="google_api_key"
                className="form-input"
                placeholder="Paste your Google API key here"
                value={settings.google_api_key}
                onChange={handleChange}
              />
              <div className="form-hint">
                Get your API key from <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>.
                <strong> If you see ***, replace it with your actual API key.</strong>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="google_cx_code">Custom Search Engine ID (CX)</label>
              <input
                type="text"
                id="google_cx_code"
                name="google_cx_code"
                className="form-input"
                placeholder="e.g., 76b918ebfb2c247ee"
                value={settings.google_cx_code}
                onChange={handleChange}
              />
              <div className="form-hint">
                Create a custom search engine at <a href="https://cse.google.com" target="_blank" rel="noopener noreferrer">Google CSE</a>
              </div>
            </div>

            <div className="form-group">
              <button type="button" className="btn btn-secondary" onClick={testGoogleAPI}>
                Test Google API
              </button>
              {testResult && <span style={{ marginLeft: '10px' }}>{testResult}</span>}
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-section-title">Apollo API</h2>
            <p className="settings-section-description">
              Configure Apollo API to find company information and contact details.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="apollo_api_key">API Key</label>
              <input
                type="text"
                id="apollo_api_key"
                name="apollo_api_key"
                className="form-input"
                placeholder="Paste your Apollo API key here"
                value={settings.apollo_api_key}
                onChange={handleChange}
              />
              <div className="form-hint">
                Get your API key from <a href="https://apollo.io" target="_blank" rel="noopener noreferrer">Apollo.io</a> dashboard.
                <strong> If you see ***, replace it with your actual API key.</strong>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-section-title">Microsoft Email (Entra ID)</h2>
            <p className="settings-section-description">
              Configure Microsoft Entra ID (Azure AD) for sending emails via Microsoft Graph API.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="azure_client_id">Client ID</label>
              <input
                type="text"
                id="azure_client_id"
                name="azure_client_id"
                className="form-input"
                placeholder="Enter Azure Client ID"
                value={settings.azure_client_id}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="azure_client_secret">Client Secret</label>
              <input
                type="text"
                id="azure_client_secret"
                name="azure_client_secret"
                className="form-input"
                placeholder="Paste Azure Client Secret here"
                value={settings.azure_client_secret}
                onChange={handleChange}
              />
              <div className="form-hint">
                <strong>If you see ***, replace it with your actual client secret.</strong>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="azure_tenant_id">Tenant ID</label>
              <input
                type="text"
                id="azure_tenant_id"
                name="azure_tenant_id"
                className="form-input"
                placeholder="Enter Azure Tenant ID"
                value={settings.azure_tenant_id}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sender_email">Sender Email Address</label>
              <input
                type="email"
                id="sender_email"
                name="sender_email"
                className="form-input"
                placeholder="your-email@company.com"
                value={settings.sender_email}
                onChange={handleChange}
              />
              <div className="form-hint">
                The email address that will send recruitment emails (must be authorized in Azure AD)
              </div>
            </div>

            <div className="form-group">
              <button type="button" className="btn btn-secondary" onClick={() => alert('Test Email - Coming soon!')}>
                Test Email Configuration
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-section-title">Google Sheets Integration</h2>
            <p className="settings-section-description">
              Configure Google Sheets to log all campaign results and leads.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="google_spreadsheet_id">Spreadsheet ID</label>
              <input
                type="text"
                id="google_spreadsheet_id"
                name="google_spreadsheet_id"
                className="form-input"
                placeholder="Enter your Google Spreadsheet ID"
                value={settings.google_spreadsheet_id}
                onChange={handleChange}
              />
              <div className="form-hint">
                The Spreadsheet ID from the URL: docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
              </div>
            </div>

            <div className="form-group">
              <div className="alert alert-info">
                <span>ℹ️</span>
                <span>
                  You&apos;ll need to authenticate with Google Sheets when running your first campaign.
                  A credentials file will be downloaded automatically.
                </span>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-section-title">Default Campaign Settings</h2>
            <p className="settings-section-description">
              Set default values for new campaigns.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="default_company_size_min">
                Default Min Company Size (employees)
              </label>
              <input
                type="number"
                id="default_company_size_min"
                name="default_company_size_min"
                className="form-input"
                min="1"
                value={settings.default_company_size_min}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="default_company_size_max">
                Default Max Company Size (employees)
              </label>
              <input
                type="number"
                id="default_company_size_max"
                name="default_company_size_max"
                className="form-input"
                min="1"
                value={settings.default_company_size_max}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="default_jobs_per_run">
                Default Jobs Per Run
              </label>
              <input
                type="number"
                id="default_jobs_per_run"
                name="default_jobs_per_run"
                className="form-input"
                min="1"
                max="50"
                value={settings.default_jobs_per_run}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary">
            Save Settings
          </button>
          <button type="button" className="btn btn-secondary" onClick={loadSettings}>
            Reset
          </button>
        </div>
      </form>
    </MainLayout>
  )
}
