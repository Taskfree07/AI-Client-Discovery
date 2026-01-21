'use client'

import MainLayout from '@/components/MainLayout'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CampaignFormData {
  campaign_name: string
  campaign_type: string
  campaign_description: string
  job_title: string
  industries: string
  company_size_min: string
  company_size_max: string
  location: string
  email_template: string
  sender_name: string
  follow_up_delay: number
  max_follow_ups: number
  start_date: string
  daily_limit: number
  send_weekdays: boolean
  send_business_hours: boolean
  stop_on_reply: boolean
  stop_on_unsubscribe: boolean
  stop_on_bounce: boolean
  priority: string
  status: string
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<CampaignFormData>({
    campaign_name: '',
    campaign_type: '',
    campaign_description: '',
    job_title: '',
    industries: '',
    company_size_min: '',
    company_size_max: '',
    location: '',
    email_template: '',
    sender_name: '',
    follow_up_delay: 2,
    max_follow_ups: 2,
    start_date: '',
    daily_limit: 50,
    send_weekdays: true,
    send_business_hours: true,
    stop_on_reply: true,
    stop_on_unsubscribe: true,
    stop_on_bounce: true,
    priority: 'normal',
    status: 'active'
  })

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault()

    const dataToSubmit = {
      ...formData,
      status: saveAsDraft ? 'draft' : formData.status
    }

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit)
      })

      if (response.ok) {
        alert(saveAsDraft ? 'Campaign saved as draft!' : 'Campaign launched successfully!')
        router.push('/campaign-manager')
      } else {
        alert('Error creating campaign')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating campaign')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <MainLayout>
      <div className="page-header">
        <h1 className="page-title">Start New Campaign</h1>
        <p className="page-subtitle">Set up your automated outreach campaign with rules and targeting</p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div className="form-section">
          <h3 className="section-title">
            <i className="fas fa-info-circle"></i>
            Campaign Details
          </h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="campaign_name">Campaign Name *</label>
              <input
                type="text"
                id="campaign_name"
                name="campaign_name"
                className="form-input"
                required
                placeholder="e.g., AI Developer Outreach Q1"
                value={formData.campaign_name}
                onChange={handleChange}
              />
              <div className="form-hint">Choose a descriptive name for your campaign</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="campaign_type">Campaign Type *</label>
              <select
                id="campaign_type"
                name="campaign_type"
                className="form-select"
                required
                value={formData.campaign_type}
                onChange={handleChange}
              >
                <option value="">Select type</option>
                <option value="email">Email Only</option>
                <option value="linkedin">LinkedIn Only</option>
                <option value="multi">Multi-Channel</option>
              </select>
            </div>
          </div>

          <div className="form-row full">
            <div className="form-group">
              <label className="form-label" htmlFor="campaign_description">Description</label>
              <textarea
                id="campaign_description"
                name="campaign_description"
                className="form-textarea"
                placeholder="Describe the goal of this campaign..."
                value={formData.campaign_description}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-title">
            <i className="fas fa-filter"></i>
            Targeting Rules
          </h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="job_title">Target Job Titles</label>
              <input
                type="text"
                id="job_title"
                name="job_title"
                className="form-input"
                placeholder="e.g., CTO, VP Engineering, Tech Lead"
                value={formData.job_title}
                onChange={handleChange}
              />
              <div className="form-hint">Comma-separated list of job titles</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="industries">Industries</label>
              <input
                type="text"
                id="industries"
                name="industries"
                className="form-input"
                placeholder="e.g., SaaS, FinTech, Healthcare"
                value={formData.industries}
                onChange={handleChange}
              />
              <div className="form-hint">Comma-separated list of industries</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="company_size_min">Min Company Size</label>
              <input
                type="number"
                id="company_size_min"
                name="company_size_min"
                className="form-input"
                placeholder="50"
                min="1"
                value={formData.company_size_min}
                onChange={handleChange}
              />
              <div className="form-hint">Minimum number of employees</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="company_size_max">Max Company Size</label>
              <input
                type="number"
                id="company_size_max"
                name="company_size_max"
                className="form-input"
                placeholder="500"
                min="1"
                value={formData.company_size_max}
                onChange={handleChange}
              />
              <div className="form-hint">Maximum number of employees</div>
            </div>
          </div>

          <div className="form-row full">
            <div className="form-group">
              <label className="form-label" htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                className="form-input"
                placeholder="e.g., United States, UK, Remote"
                value={formData.location}
                onChange={handleChange}
              />
              <div className="form-hint">Target geographic location</div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-title">
            <i className="fas fa-envelope"></i>
            Email Sequence Settings
          </h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="email_template">Email Template *</label>
              <select
                id="email_template"
                name="email_template"
                className="form-select"
                required
                value={formData.email_template}
                onChange={handleChange}
              >
                <option value="">Select template</option>
                <option value="intro">Introduction</option>
                <option value="value_prop">Value Proposition</option>
                <option value="case_study">Case Study</option>
                <option value="custom">Custom Template</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sender_name">Sender Name *</label>
              <input
                type="text"
                id="sender_name"
                name="sender_name"
                className="form-input"
                required
                placeholder="Your Name"
                value={formData.sender_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="follow_up_delay">Follow-up Delay (days)</label>
              <input
                type="number"
                id="follow_up_delay"
                name="follow_up_delay"
                className="form-input"
                min="1"
                max="14"
                value={formData.follow_up_delay}
                onChange={handleChange}
              />
              <div className="form-hint">Days to wait before sending follow-up</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="max_follow_ups">Max Follow-ups</label>
              <input
                type="number"
                id="max_follow_ups"
                name="max_follow_ups"
                className="form-input"
                min="0"
                max="5"
                value={formData.max_follow_ups}
                onChange={handleChange}
              />
              <div className="form-hint">Maximum number of follow-up emails</div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-title">
            <i className="fas fa-clock"></i>
            Schedule Settings
          </h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="start_date">Start Date</label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                className="form-input"
                value={formData.start_date}
                onChange={handleChange}
              />
              <div className="form-hint">When to start sending emails</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="daily_limit">Daily Email Limit</label>
              <input
                type="number"
                id="daily_limit"
                name="daily_limit"
                className="form-input"
                min="1"
                max="200"
                value={formData.daily_limit}
                onChange={handleChange}
              />
              <div className="form-hint">Maximum emails to send per day</div>
            </div>
          </div>

          <div className="form-row full">
            <div className="form-group">
              <label className="form-label">Sending Hours</label>
              <div className="checkbox-group">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="send_weekdays"
                    name="send_weekdays"
                    checked={formData.send_weekdays}
                    onChange={handleChange}
                  />
                  <label htmlFor="send_weekdays">Weekdays only (Mon-Fri)</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="send_business_hours"
                    name="send_business_hours"
                    checked={formData.send_business_hours}
                    onChange={handleChange}
                  />
                  <label htmlFor="send_business_hours">Business hours only (9 AM - 5 PM)</label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-title">
            <i className="fas fa-sliders-h"></i>
            Advanced Rules
          </h3>

          <div className="form-row full">
            <div className="form-group">
              <label className="form-label">Stop Campaign If</label>
              <div className="checkbox-group">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="stop_on_reply"
                    name="stop_on_reply"
                    checked={formData.stop_on_reply}
                    onChange={handleChange}
                  />
                  <label htmlFor="stop_on_reply">Lead replies to email</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="stop_on_unsubscribe"
                    name="stop_on_unsubscribe"
                    checked={formData.stop_on_unsubscribe}
                    onChange={handleChange}
                  />
                  <label htmlFor="stop_on_unsubscribe">Lead unsubscribes</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="stop_on_bounce"
                    name="stop_on_bounce"
                    checked={formData.stop_on_bounce}
                    onChange={handleChange}
                  />
                  <label htmlFor="stop_on_bounce">Email bounces</label>
                </div>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="priority">Campaign Priority</label>
              <select
                id="priority"
                name="priority"
                className="form-select"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="status">Initial Status</label>
              <select
                id="status"
                name="status"
                className="form-select"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <a href="/campaign-manager" className="btn btn-secondary">
            <i className="fas fa-times"></i>
            Cancel
          </a>
          <button type="button" className="btn btn-outline" onClick={(e) => handleSubmit(e, true)}>
            <i className="fas fa-save"></i>
            Save as Draft
          </button>
          <button type="submit" className="btn btn-primary">
            <i className="fas fa-rocket"></i>
            Launch Campaign
          </button>
        </div>
      </form>
    </MainLayout>
  )
}
