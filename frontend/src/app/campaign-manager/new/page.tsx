'use client'

import MainLayout from '@/components/MainLayout'
import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Session {
  id: number
  name: string
  created_at: string
  total_leads: number
  job_titles: string[]
}

interface Template {
  id: number
  name: string
  subject_template: string
  body_template: string
  is_default: boolean
}

interface AddedLead {
  id: string
  company: string
  jobTitle: string
  name: string
  title: string
  email: string
  source: 'csv' | 'lead-engine' | 'manual'
}

interface ValidatedLead extends AddedLead {
  issue?: string
  isFlagged: boolean
}

interface Sender {
  id: number
  email: string
  label: string
  status: 'connected' | 'expired'
  provider: 'gmail' | 'outlook' | 'smtp'
  isDefault: boolean
}

interface SequenceStep {
  step_number: number
  template_id: number | null
  template?: Template
  days_after_previous: number
}

interface CampaignFormData {
  campaign_name: string
  selected_session_id: number | null
  selected_template_id: number | null
  selected_sender_ids: number[]
  // Email Sequence
  email_sequence: SequenceStep[]
  ai_personalization_enabled: boolean
  // Schedule
  start_date: string
  end_date: string
  from_time: string
  to_time: string
  sending_days: string[]
  max_mails_per_day: number
  interval_between_mails: number
}

const STEPS = [
  { id: 1, name: 'Add Leads', key: 'leads' },
  { id: 2, name: 'Sender Identity', key: 'sender' },
  { id: 3, name: 'Create Campaign Mail', key: 'mail' },
  { id: 4, name: 'Schedule', key: 'schedule' },
  { id: 5, name: 'Review and launch', key: 'review' }
]

const MOCK_SENDERS: Sender[] = [
  { id: 1, email: 'marketing@example.com', label: 'Marketing', status: 'connected', provider: 'gmail', isDefault: true },
  { id: 2, email: 'sales@example.com', label: 'Sales Profile', status: 'connected', provider: 'outlook', isDefault: false },
  { id: 3, email: 'hr@example.com', label: 'HR Outreach', status: 'expired', provider: 'gmail', isDefault: false },
  { id: 4, email: 'outreach@example.com', label: 'Outreach', status: 'connected', provider: 'smtp', isDefault: false },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function CampaignBuilderPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [campaignNameError, setCampaignNameError] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [addedLeads, setAddedLeads] = useState<AddedLead[]>([])
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualLead, setManualLead] = useState({ name: '', email: '', company: '', title: '' })
  const [importingSession, setImportingSession] = useState(false)
  const [showLeadEngineDrawer, setShowLeadEngineDrawer] = useState(false)
  const [showCsvDrawer, setShowCsvDrawer] = useState(false)
  const [uploadedCsvFiles, setUploadedCsvFiles] = useState<{ id: string; name: string; file: File }[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<number>>(new Set())
  const [drawerStep, setDrawerStep] = useState<'sessions' | 'leads'>('sessions')
  const [drawerLeads, setDrawerLeads] = useState<ValidatedLead[]>([])
  const [flaggedLeads, setFlaggedLeads] = useState<ValidatedLead[]>([])
  const [detectedLeads, setDetectedLeads] = useState<ValidatedLead[]>([])
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [loadingDrawerLeads, setLoadingDrawerLeads] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<'flagged' | 'detected' | null>(null)
  const [editingLead, setEditingLead] = useState<ValidatedLead | null>(null)
  const [senders, setSenders] = useState<Sender[]>([])
  const [loadingSenders, setLoadingSenders] = useState(true)
  const [selectedSenderIds, setSelectedSenderIds] = useState<Set<number>>(new Set())

  const [formData, setFormData] = useState<CampaignFormData>({
    campaign_name: '',
    selected_session_id: null,
    selected_template_id: null,
    selected_sender_ids: [],
    email_sequence: [
      { step_number: 1, template_id: null, days_after_previous: 0 },
      { step_number: 2, template_id: null, days_after_previous: 3 },
      { step_number: 3, template_id: null, days_after_previous: 4 },
      { step_number: 4, template_id: null, days_after_previous: 4 }
    ],
    ai_personalization_enabled: true,
    start_date: '',
    end_date: '',
    from_time: '09:00',
    to_time: '17:00',
    sending_days: [],
    max_mails_per_day: 99,
    interval_between_mails: 3
  })

  // Wizard state - Dynamic email days
  interface EmailDay {
    id: string
    dayNumber: number
    stepOrder: number
    template: Template | null
  }

  const [wizardStep, setWizardStep] = useState(1) // Dynamic based on emailDays length + 1 for review
  const [emailDays, setEmailDays] = useState<EmailDay[]>([
    { id: 'day-1', dayNumber: 1, stepOrder: 1, template: null } // Day 1 always present by default
  ])
  const [wizardPreviewTemplate, setWizardPreviewTemplate] = useState<Template | null>(null)

  // Add Day Modal state
  const [showAddDayModal, setShowAddDayModal] = useState(false)
  const [newDayNumber, setNewDayNumber] = useState('')

  // Modals
  const [showImportModal, setShowImportModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showTestEmailModal, setShowTestEmailModal] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState('')
  const [selectedTestTemplate, setSelectedTestTemplate] = useState<Template | null>(null)
  const [sendingTestEmail, setSendingTestEmail] = useState(false)
  const [selectedTestSender, setSelectedTestSender] = useState<number | null>(null)

  // AI Personalization - Dynamic
  const [showPersonalizeModal, setShowPersonalizeModal] = useState(false)
  const [personalizingEmail, setPersonalizingEmail] = useState(false)
  const [personalizeTarget, setPersonalizeTarget] = useState<string | 'batch' | null>(null) // Using email day ID or 'batch'
  const [personalizeResult, setPersonalizeResult] = useState<{
    original: { subject: string; body: string }
    personalized: { subject: string; body: string }
    changes_made: string[]
    analysis: { industries_detected?: string[]; titles_detected?: string[]; tone_adjustment?: string; pain_points_targeted?: string[] }
  } | null>(null)
  const [personalizeEditMode, setPersonalizeEditMode] = useState(false)
  const [personalizeEditSubject, setPersonalizeEditSubject] = useState('')
  const [personalizeEditBody, setPersonalizeEditBody] = useState('')
  const [personalizedFlags, setPersonalizedFlags] = useState<Record<string, boolean>>({}) // Key = email day ID
  const [batchPersonalizing, setBatchPersonalizing] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)

  useEffect(() => {
    loadSessions()
    loadTemplates()
    loadSenders()
  }, [])

  // ESC key handler for CSV drawer
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCsvDrawer) closeCsvDrawer()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [showCsvDrawer])

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setSessions(data)
        } else if (data && Array.isArray(data.sessions)) {
          setSessions(data.sessions)
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const loadSenders = async () => {
    try {
      const response = await fetch('/api/senders')
      if (response.ok) {
        const data = await response.json()
        const apiSenders = Array.isArray(data) ? data : []
        if (apiSenders.length > 0) {
          setSenders(apiSenders)
        } else {
          setSenders(MOCK_SENDERS)
        }
      } else {
        setSenders(MOCK_SENDERS)
      }
    } catch (error) {
      console.error('Error loading senders:', error)
      setSenders(MOCK_SENDERS)
    } finally {
      setLoadingSenders(false)
    }
  }

  const handleNext = () => {
    // Campaign name validation
    if (!formData.campaign_name.trim()) {
      setCampaignNameError('Campaign name is required')
      return
    }
    setCampaignNameError('')

    if (currentStep < 5) {
      // Step 3 validation: warn if no templates selected
      if (currentStep === 3) {
        const count = emailDays.filter(d => d.template).length
        if (count === 0) {
          alert('Please select at least one email template in the wizard before continuing.')
          return
        }
        // Sync wizard data to formData
        syncWizardToFormData()
      }
      // Step 2 sync: capture selected senders
      if (currentStep === 2) {
        setFormData(prev => ({ ...prev, selected_sender_ids: Array.from(selectedSenderIds) }))
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveDraft = async () => {
    try {
      const email_sequence = emailDays.map((emailDay, idx) => {
        const previousDay = idx > 0 ? emailDays[idx - 1] : null
        const daysAfter = previousDay ? emailDay.dayNumber - previousDay.dayNumber : 0

        return {
          step_number: emailDay.stepOrder,
          template_id: emailDay.template?.id || null,
          days_after_previous: daysAfter
        }
      })

      const draftData = {
        ...formData,
        selected_sender_ids: Array.from(selectedSenderIds),
        email_sequence,
        status: 'draft'
      }
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData)
      })
      if (response.ok) {
        alert('Campaign saved as draft!')
        router.push('/campaign-manager')
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      alert('Error saving draft')
    }
  }

  // ===== WIZARD FUNCTIONS =====

  // Wizard Navigation - Works with dynamic emailDays array
  const getCurrentEmailDay = (): EmailDay | undefined => {
    const reviewStep = emailDays.length + 1
    if (wizardStep >= reviewStep) return undefined
    return emailDays[wizardStep - 1]
  }

  const getCurrentDayNumber = () => {
    const currentDay = getCurrentEmailDay()
    return currentDay ? currentDay.dayNumber : 1
  }

  const handleWizardNext = () => {
    const maxStep = emailDays.length + 1 // +1 for review step
    if (wizardStep < maxStep) {
      setWizardStep(wizardStep + 1)
      // Auto-select preview if template already selected for next step
      const nextDay = emailDays[wizardStep] // wizardStep is now incremented
      if (nextDay?.template) {
        setWizardPreviewTemplate(nextDay.template)
      } else {
        setWizardPreviewTemplate(null)
      }
    }
  }

  const handleWizardBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1)
      const prevDay = emailDays[wizardStep - 2] // wizardStep is now decremented
      if (prevDay?.template) {
        setWizardPreviewTemplate(prevDay.template)
      } else {
        setWizardPreviewTemplate(null)
      }
    }
  }

  const handleTemplateSelect = (template: Template) => {
    const currentDay = getCurrentEmailDay()
    if (currentDay) {
      setEmailDays(prev => prev.map(day =>
        day.id === currentDay.id ? { ...day, template } : day
      ))
      setWizardPreviewTemplate(template)
    }
  }

  const handleSkipEmail = () => {
    const currentDay = getCurrentEmailDay()
    if (currentDay) {
      setEmailDays(prev => prev.map(day =>
        day.id === currentDay.id ? { ...day, template: null } : day
      ))
      setWizardPreviewTemplate(null)
    }
    handleWizardNext()
  }

  // Add new email day
  const handleAddDay = () => {
    setShowAddDayModal(true)
  }

  const handleConfirmAddDay = () => {
    const dayNum = parseInt(newDayNumber)
    if (!dayNum || dayNum < 1) {
      alert('Please enter a valid day number (1 or greater)')
      return
    }

    const newDay: EmailDay = {
      id: `day-${Date.now()}`,
      dayNumber: dayNum,
      stepOrder: emailDays.length + 1,
      template: null
    }

    setEmailDays(prev => [...prev, newDay])
    setNewDayNumber('')
    setShowAddDayModal(false)
  }

  const handleCancelAddDay = () => {
    setNewDayNumber('')
    setShowAddDayModal(false)
  }

  // Delete email day (except Day 1)
  const handleDeleteDay = (dayId: string) => {
    const dayToDelete = emailDays.find(d => d.id === dayId)
    if (dayToDelete?.dayNumber === 1) {
      alert('Cannot delete Day 1')
      return
    }

    setEmailDays(prev => {
      const filtered = prev.filter(d => d.id !== dayId)
      // Re-index stepOrder
      return filtered.map((day, idx) => ({ ...day, stepOrder: idx + 1 }))
    })

    // Adjust wizardStep if needed
    const deletedStepOrder = dayToDelete?.stepOrder || 0
    if (wizardStep === deletedStepOrder) {
      setWizardStep(Math.max(1, wizardStep - 1))
    } else if (wizardStep > deletedStepOrder) {
      setWizardStep(wizardStep - 1)
    }
  }

  // Upload Template Handler
  const handleUploadTemplate = () => {
    setShowUploadModal(true)
  }

  const handleImportFromLibrary = () => {
    setShowImportModal(true)
  }

  const handleImportSelect = (template: Template) => {
    handleTemplateSelect(template)
    setShowImportModal(false)
  }

  // Test Email handlers
  const handleOpenTestEmail = (template: Template) => {
    setSelectedTestTemplate(template)
    setShowTestEmailModal(true)
    setTestEmailAddress('')
    // Auto-select first available sender or default sender
    const defaultSender = senders.find(s => s.isDefault && s.status === 'connected')
    const firstSender = senders.find(s => s.status === 'connected')
    setSelectedTestSender(defaultSender?.id || firstSender?.id || null)
  }

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !selectedTestTemplate) {
      alert('Please enter a valid email address')
      return
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmailAddress)) {
      alert('Please enter a valid email address')
      return
    }

    if (!selectedTestSender) {
      alert('Please select a sender account')
      return
    }

    setSendingTestEmail(true)
    try {
      const response = await fetch('/api/campaigns/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: testEmailAddress,
          // ALWAYS send current template content (includes personalized changes)
          template_data: {
            subject: selectedTestTemplate.subject_template,
            body: selectedTestTemplate.body_template
          },
          sender_id: selectedTestSender,
          test_lead_name: 'Test User',
          test_company: 'Test Company'
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`✅ Test email sent successfully to ${testEmailAddress}!\n\nCheck your inbox in a few moments.`)
        setShowTestEmailModal(false)
        setTestEmailAddress('')
        setSelectedTestSender(null)
      } else {
        alert(`❌ Failed to send test email: ${data.error || 'Unknown error'}\n\nPlease check your sender connection.`)
      }
    } catch (error: any) {
      console.error('Error sending test email:', error)
      alert(`❌ Failed to send test email: ${error.message || 'Unknown error'}`)
    } finally {
      setSendingTestEmail(false)
    }
  }

  // AI Personalization handlers - Updated for dynamic emailDays
  const handlePersonalize = async (emailDayId: string) => {
    const emailDay = emailDays.find(d => d.id === emailDayId)
    const template = emailDay?.template
    if (!template) return
    if (addedLeads.length === 0) {
      alert('Add leads in Step 1 first to enable AI personalization')
      return
    }

    setPersonalizeTarget(emailDayId)
    setPersonalizingEmail(true)
    setPersonalizeResult(null)
    setPersonalizeEditMode(false)
    setShowPersonalizeModal(true)

    try {
      const response = await fetch('/api/campaigns/personalize-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: template.subject_template,
          body: template.body_template,
          leads: addedLeads.slice(0, 20).map(l => ({
            name: l.name,
            company: l.company,
            title: l.title || l.jobTitle,
            email: l.email
          })),
          mode: 'individual'
        })
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setPersonalizeResult(data)
      } else {
        alert(data.error || 'AI personalization failed')
        setShowPersonalizeModal(false)
      }
    } catch (error: any) {
      console.error('Personalization error:', error)
      alert('Failed to connect to AI service')
      setShowPersonalizeModal(false)
    } finally {
      setPersonalizingEmail(false)
    }
  }

  const handleAcceptPersonalization = () => {
    if (!personalizeResult || !personalizeTarget || personalizeTarget === 'batch') return

    const personalized = personalizeEditMode
      ? { subject: personalizeEditSubject, body: personalizeEditBody }
      : personalizeResult.personalized

    // Update the template in emailDays with personalized content
    setEmailDays(prev => prev.map(day =>
      day.id === personalizeTarget && day.template
        ? {
            ...day,
            template: {
              ...day.template,
              subject_template: personalized.subject,
              body_template: personalized.body
            }
          }
        : day
    ))

    // Mark as personalized
    setPersonalizedFlags(prev => ({ ...prev, [personalizeTarget]: true }))

    // Update preview if this is the current wizard step's template
    const currentDay = getCurrentEmailDay()
    if (wizardPreviewTemplate && currentDay?.id === personalizeTarget) {
      setWizardPreviewTemplate(prev => prev ? {
        ...prev,
        subject_template: personalized.subject,
        body_template: personalized.body
      } : null)
    }

    setShowPersonalizeModal(false)
    setPersonalizeResult(null)
  }

  const handleBatchPersonalize = async () => {
    if (addedLeads.length === 0) {
      alert('Add leads in Step 1 first to enable AI personalization')
      return
    }

    const toPersonalize = emailDays.filter(d => d.template && !personalizedFlags[d.id])

    if (toPersonalize.length === 0) {
      alert('All emails are already personalized or no templates selected')
      return
    }

    setBatchPersonalizing(true)
    setBatchProgress(0)

    for (let i = 0; i < toPersonalize.length; i++) {
      const emailDay = toPersonalize[i]
      const template = emailDay.template!
      setBatchProgress(Math.round(((i) / toPersonalize.length) * 100))

      try {
        const response = await fetch('/api/campaigns/personalize-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: template.subject_template,
            body: template.body_template,
            leads: addedLeads.slice(0, 20).map(l => ({
              name: l.name,
              company: l.company,
              title: l.title || l.jobTitle,
              email: l.email
            })),
            mode: 'batch'
          })
        })

        const data = await response.json()
        if (response.ok && data.success) {
          setEmailDays(prev => prev.map(day =>
            day.id === emailDay.id && day.template
              ? {
                  ...day,
                  template: {
                    ...day.template,
                    subject_template: data.personalized.subject,
                    body_template: data.personalized.body
                  }
                }
              : day
          ))
          setPersonalizedFlags(prev => ({ ...prev, [emailDay.id]: true }))
        }
      } catch (error) {
        console.error(`Batch personalization failed for Email ${emailDay.stepOrder}:`, error)
      }
    }

    setBatchProgress(100)
    setBatchPersonalizing(false)
    alert(`AI personalization complete! ${toPersonalize.length} email(s) updated.`)
  }

  // Sync wizard data into formData
  const syncWizardToFormData = () => {
    const updatedSequence = emailDays.map((emailDay, idx) => {
      const previousDay = idx > 0 ? emailDays[idx - 1] : null
      const daysAfter = previousDay ? emailDay.dayNumber - previousDay.dayNumber : 0

      return {
        step_number: emailDay.stepOrder,
        template_id: emailDay.template?.id || null,
        template: emailDay.template || undefined,
        days_after_previous: daysAfter
      }
    })

    setFormData(prev => ({ ...prev, email_sequence: updatedSequence }))
  }

  // ===== END WIZARD FUNCTIONS =====

  const handleLaunch = async () => {
    // Final sync before launch
    syncWizardToFormData()
    const emailCount = emailDays.filter(d => d.template).length
    if (emailCount === 0) {
      alert('Please configure at least one email in Step 3 before launching.')
      return
    }
    if (selectedSenderIds.size === 0) {
      alert('Please select at least one sender in Step 2 before launching.')
      return
    }

    try {
      const email_sequence = emailDays.map((emailDay, idx) => {
        const previousDay = idx > 0 ? emailDays[idx - 1] : null
        const daysAfter = previousDay ? emailDay.dayNumber - previousDay.dayNumber : 0

        return {
          step_number: emailDay.stepOrder,
          template_id: emailDay.template?.id || null,
          days_after_previous: daysAfter
        }
      })

      const launchData = {
        ...formData,
        selected_sender_ids: Array.from(selectedSenderIds),
        email_sequence,
        status: 'active'
      }
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(launchData)
      })
      if (response.ok) {
        alert('Campaign launched successfully!')
        router.push('/campaign-manager')
      } else {
        const data = await response.json()
        alert(`Failed to launch: ${data.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error launching campaign:', error)
      alert('Error launching campaign')
    }
  }

  const toggleSenderSelection = (senderId: number) => {
    setSelectedSenderIds(prev => {
      const next = new Set(prev)
      if (next.has(senderId)) {
        next.delete(senderId)
      } else {
        next.add(senderId)
      }
      return next
    })
  }

  const removeSender = async (senderId: number) => {
    try {
      await fetch(`/api/senders/${senderId}`, { method: 'DELETE' })
    } catch (e) {
      // ignore - works for both API and mock
    }
    setSenders(prev => prev.filter(s => s.id !== senderId))
    setSelectedSenderIds(prev => {
      const next = new Set(prev)
      next.delete(senderId)
      return next
    })
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      sending_days: prev.sending_days.includes(day)
        ? prev.sending_days.filter(d => d !== day)
        : [...prev.sending_days, day]
    }))
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const validateLead = (lead: AddedLead): ValidatedLead => {
    const issues: string[] = []
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!lead.email || !lead.email.trim()) {
      issues.push('Missing email')
    } else if (!emailRegex.test(lead.email)) {
      issues.push('Invalid email id')
    }
    
    // Name validation
    if (!lead.name || !lead.name.trim()) {
      issues.push('Invalid name')
    } else if (lead.name.length < 2) {
      issues.push('Invalid name')
    }
    
    // Company validation
    if (!lead.company || !lead.company.trim()) {
      issues.push('Invalid Company name')
    }
    
    // Check for incomplete/incorrect format
    if (!lead.email.includes('@') && lead.email.length > 0) {
      issues.push('Incorrect format')
    }
    
    // Missing details check
    if (!lead.title && !lead.jobTitle) {
      issues.push('Missing details')
    }
    
    const issue = issues.length > 0 ? issues[0] : undefined
    
    return {
      ...lead,
      issue,
      isFlagged: issues.length > 0
    }
  }

  const processCSVFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split(/\r?\n/).filter(l => l.trim())

        if (lines.length < 2) {
          alert('CSV file must have at least a header row and one data row')
          return
        }

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase())
        const colMap = {
          name: headers.findIndex(h => h.includes('name') && !h.includes('company')),
          email: headers.findIndex(h => h.includes('email')),
          company: headers.findIndex(h => h.includes('company')),
          title: headers.findIndex(h => h.includes('title')),
          jobOpening: headers.findIndex(h => h.includes('job'))
        }

        if (colMap.email < 0) {
          alert('CSV file must have an "email" column')
          return
        }

        const newLeads: AddedLead[] = []
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i])
          const email = colMap.email >= 0 ? cols[colMap.email]?.trim() : ''
          if (!email) continue

          newLeads.push({
            id: `csv-${Date.now()}-${i}`,
            name: colMap.name >= 0 ? (cols[colMap.name]?.trim() || '') : '',
            email,
            company: colMap.company >= 0 ? (cols[colMap.company]?.trim() || '') : '',
            title: colMap.title >= 0 ? (cols[colMap.title]?.trim() || '') : '',
            jobTitle: colMap.jobOpening >= 0 ? (cols[colMap.jobOpening]?.trim() || '') : '',
            source: 'csv'
          })
        }

        if (newLeads.length === 0) {
          alert('No valid leads found in CSV file. Make sure the email column is not empty.')
          return
        }

        const uniqueNewLeads: AddedLead[] = []
        const seenEmails = new Set<string>()
        newLeads.forEach(lead => {
          const emailLower = lead.email.toLowerCase()
          if (!seenEmails.has(emailLower)) {
            seenEmails.add(emailLower)
            uniqueNewLeads.push(lead)
          }
        })

        setAddedLeads(prev => {
          const existingEmails = new Set(prev.map(l => l.email.toLowerCase()))
          const deduped = uniqueNewLeads.filter(l => !existingEmails.has(l.email.toLowerCase()))
          if (deduped.length === 0) {
            alert('All leads from CSV already exist in the campaign')
            return prev
          }
          alert(`Successfully added ${deduped.length} leads from CSV`)
          return [...prev, ...deduped]
        })
      } catch (error) {
        console.error('Error parsing CSV:', error)
        alert('Error parsing CSV file. Please check the file format.')
      }
    }
    reader.onerror = () => alert('Error reading CSV file')
    reader.readAsText(file)
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processCSVFile(file)
    e.target.value = ''
  }

  // CSV Drawer handlers
  const handleCsvDrawerFileSelect = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files)
      .filter(f => f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.txt'))
      .map(f => ({ id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: f.name, file: f }))
    if (newFiles.length === 0) {
      alert('Please select CSV, TXT, or XLSX files only.')
      return
    }
    setUploadedCsvFiles(prev => [...prev, ...newFiles])
  }

  const removeCsvFile = (fileId: string) => {
    setUploadedCsvFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleCsvDrawerNext = () => {
    uploadedCsvFiles.forEach(entry => processCSVFile(entry.file))
    setUploadedCsvFiles([])
    setShowCsvDrawer(false)
  }

  const closeCsvDrawer = () => {
    setShowCsvDrawer(false)
    setUploadedCsvFiles([])
    setIsDragging(false)
  }

  const handleAddLeadsFromSessions = async () => {
    if (selectedSessionIds.size === 0) return
    setLoadingDrawerLeads(true)
    try {
      const allLeads: AddedLead[] = []
      for (const sessionId of selectedSessionIds) {
        const response = await fetch(`/api/sessions/${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          const leads = data.leads || []
          leads.forEach((lead: any) => {
            const company = lead.company?.name || ''
            const jobOpening = lead.job_opening || ''
            const pocs = lead.pocs || []
            pocs.forEach((poc: any, idx: number) => {
              if (poc.email) {
                allLeads.push({
                  id: `le-${lead.id || Date.now()}-${idx}`,
                  name: poc.name || '',
                  email: poc.email,
                  company,
                  title: poc.title || '',
                  jobTitle: jobOpening,
                  source: 'lead-engine'
                })
              }
            })
          })
        }
      }
      // Deduplicate within the new batch first
      const uniqueNewLeads: AddedLead[] = []
      const seenEmails = new Set<string>()
      allLeads.forEach(lead => {
        const emailLower = lead.email.toLowerCase()
        if (!seenEmails.has(emailLower)) {
          seenEmails.add(emailLower)
          uniqueNewLeads.push(lead)
        }
      })
      // Then deduplicate against existing leads
      setAddedLeads(prev => {
        const existingEmails = new Set(prev.map(l => l.email.toLowerCase()))
        const deduped = uniqueNewLeads.filter(l => !existingEmails.has(l.email.toLowerCase()))
        return [...prev, ...deduped]
      })
      setShowLeadEngineDrawer(false)
      setSelectedSessionIds(new Set())
    } catch (error) {
      console.error('Error loading session leads:', error)
    } finally {
      setLoadingDrawerLeads(false)
    }
  }



  const handleViewSession = async (sessionId: number) => {
    setSelectedSessionIds(new Set([sessionId]))
    setLoadingDrawerLeads(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        const leads = data.leads || []
        const allLeads: AddedLead[] = []
        leads.forEach((lead: any) => {
          const company = lead.company?.name || ''
          const jobOpening = lead.job_opening || ''
          const pocs = lead.pocs || []
          pocs.forEach((poc: any, idx: number) => {
            if (poc.email) {
              allLeads.push({
                id: `view-${lead.id || Date.now()}-${idx}`,
                name: poc.name || '',
                email: poc.email,
                company,
                title: poc.title || '',
                jobTitle: jobOpening,
                source: 'lead-engine'
              })
            }
          })
        })
        
        // Validate all leads
        const validatedLeads = allLeads.map(lead => validateLead(lead))
        
        // Split into flagged and detected
        const flagged = validatedLeads.filter(lead => lead.isFlagged)
        const detected = validatedLeads.filter(lead => !lead.isFlagged)
        
        setDrawerLeads(validatedLeads)
        setFlaggedLeads(flagged)
        setDetectedLeads(detected)
        setSelectedLeadIds(new Set())
        setDrawerStep('leads')
      }
    } catch (error) {
      console.error('Error loading session leads:', error)
    } finally {
      setLoadingDrawerLeads(false)
    }
  }

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev)
      if (next.has(leadId)) {
        next.delete(leadId)
      } else {
        next.add(leadId)
      }
      return next
    })
  }

  const handleDeleteAll = (section: 'flagged' | 'detected') => {
    setShowDeleteModal(section)
  }

  const confirmDeleteAll = () => {
    if (showDeleteModal === 'flagged') {
      setDrawerLeads(prev => prev.filter(lead => !lead.isFlagged))
      setFlaggedLeads([])
      setSelectedLeadIds(prev => {
        const next = new Set(prev)
        flaggedLeads.forEach(lead => next.delete(lead.id))
        return next
      })
    } else if (showDeleteModal === 'detected') {
      setDrawerLeads(prev => prev.filter(lead => lead.isFlagged))
      setDetectedLeads([])
      setSelectedLeadIds(prev => {
        const next = new Set(prev)
        detectedLeads.forEach(lead => next.delete(lead.id))
        return next
      })
    }
    setShowDeleteModal(null)
  }

  const handleEditLead = (lead: ValidatedLead) => {
    setEditingLead({ ...lead })
  }

  const handleSaveEditedLead = () => {
    if (!editingLead) return
    
    // Re-validate the edited lead
    const validated = validateLead(editingLead)
    
    // Update in drawerLeads
    setDrawerLeads(prev => prev.map(l => l.id === editingLead.id ? validated : l))
    
    // Update in flagged or detected lists
    if (validated.isFlagged) {
      setFlaggedLeads(prev => {
        const filtered = prev.filter(l => l.id !== editingLead.id)
        return [...filtered, validated]
      })
      setDetectedLeads(prev => prev.filter(l => l.id !== editingLead.id))
    } else {
      setDetectedLeads(prev => {
        const filtered = prev.filter(l => l.id !== editingLead.id)
        return [...filtered, validated]
      })
      setFlaggedLeads(prev => prev.filter(l => l.id !== editingLead.id))
    }
    
    setEditingLead(null)
  }

  const toggleSelectAllLeads = () => {
    if (selectedLeadIds.size === drawerLeads.length) {
      setSelectedLeadIds(new Set())
    } else {
      setSelectedLeadIds(new Set(drawerLeads.map(l => l.id)))
    }
  }

  const handleSaveAndAddLeads = () => {
    const leadsToImport = drawerLeads.filter(l => selectedLeadIds.has(l.id))
    // Deduplicate within the selected batch first
    const uniqueNewLeads: AddedLead[] = []
    const seenEmails = new Set<string>()
    leadsToImport.forEach(lead => {
      const emailLower = lead.email.toLowerCase()
      if (!seenEmails.has(emailLower)) {
        seenEmails.add(emailLower)
        uniqueNewLeads.push(lead)
      }
    })
    // Then deduplicate against existing leads
    setAddedLeads(prev => {
      const existingEmails = new Set(prev.map(l => l.email.toLowerCase()))
      const deduped = uniqueNewLeads.filter(l => !existingEmails.has(l.email.toLowerCase()))
      return [...prev, ...deduped]
    })
    setShowLeadEngineDrawer(false)
    setSelectedSessionIds(new Set())
    setDrawerStep('sessions')
    setDrawerLeads([])
    setSelectedLeadIds(new Set())
  }

  const toggleSessionSelection = (sessionId: number) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  const handleAddManual = () => {
    if (!manualLead.email) return
    setAddedLeads(prev => {
      const exists = prev.some(l => l.email.toLowerCase() === manualLead.email.toLowerCase())
      if (exists) return prev
      return [...prev, {
        id: `manual-${Date.now()}`,
        name: manualLead.name,
        email: manualLead.email,
        company: manualLead.company,
        title: manualLead.title,
        jobTitle: '',
        source: 'manual'
      }]
    })
    setManualLead({ name: '', email: '', company: '', title: '' })
  }

  const removeLead = (id: string) => {
    setAddedLeads(prev => prev.filter(l => l.id !== id))
  }

  return (
    <MainLayout>
      <div className="campaign-builder">
        {/* Header */}
        <div className="builder-header">
          <div className="builder-header-left">
            <h1 className="page-title">Create Campaign</h1>
            <p className="page-subtitle">Create and manage multi-channel outreach campaigns</p>
          </div>
          <div className="builder-header-right">
            <button className="btn-save-draft" onClick={handleSaveDraft}>
              <i className="far fa-save"></i>
              Save draft
            </button>
          </div>
        </div>

        {/* Campaign Name Field */}
        <div className="campaign-name-field">
          <label className="campaign-name-label">
            Campaign Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            className={`campaign-name-input ${campaignNameError ? 'input-error' : ''}`}
            placeholder="Enter The Campaign Name Here"
            value={formData.campaign_name}
            onChange={(e) => {
              setFormData({ ...formData, campaign_name: e.target.value })
              if (campaignNameError) setCampaignNameError('')
            }}
          />
          {campaignNameError && (
            <div className="campaign-name-error">{campaignNameError}</div>
          )}
        </div>

        {/* Steps Progress */}
        <div className="steps-container">
          <div className="steps-labels">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`step-label-item ${currentStep >= step.id ? 'active' : ''} ${currentStep === step.id ? 'current' : ''}`}
                onClick={() => setCurrentStep(step.id)}
              >
                <span className="step-name">{step.name}</span>
              </div>
            ))}
          </div>
          <div className="steps-dots-row">
            <div className="steps-track-bg">
              <div
                className="steps-track-fill"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 80}%` }}
              ></div>
            </div>
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`step-dot ${currentStep > step.id ? 'completed' : ''} ${currentStep === step.id ? 'current' : ''}`}
              ></div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="step-content">
          {/* Step 1: Add Leads */}
          {currentStep === 1 && (
            <div className="step-panel">
              <h2 className="step-title">Add Leads</h2>
              <div className="leads-options">
                {/* CSV Upload Card */}
                <div className="lead-option-card" onClick={() => setShowCsvDrawer(true)} style={{ cursor: 'pointer' }}>
                  <div className="lead-option-icon blue">
                    <i className="fas fa-upload"></i>
                  </div>
                  <h3 className="lead-option-title">Upload CSV</h3>
                  <p className="lead-option-desc">
                    Upload a CSV file containing your leads. Make sure it includes email, name, and company details.
                  </p>
                  <button
                    className="lead-option-import-btn"
                    onClick={(e) => { e.stopPropagation(); setShowCsvDrawer(true) }}
                  >
                    <i className="fas fa-folder-open"></i>
                    Choose File
                  </button>
                </div>

                {/* Lead Engine Import Card */}
                <div className="lead-option-card" onClick={() => setShowLeadEngineDrawer(true)}>
                  <div className="lead-option-icon purple">
                    <i className="fas fa-cog"></i>
                  </div>
                  <h3 className="lead-option-title">Import from Lead Engine</h3>
                  <p className="lead-option-desc">
                    Select a session from Lead Engine to import leads directly.
                  </p>
                  <button
                    className="lead-option-import-btn"
                    onClick={(e) => { e.stopPropagation(); setShowLeadEngineDrawer(true) }}
                  >
                    <i className="fas fa-download"></i>
                    Import from Lead Engine
                  </button>
                </div>

                {/* Manual Entry Card */}
                <div className={`lead-option-card ${showManualForm ? 'selected' : ''}`}>
                  <div className="lead-option-icon gray">
                    <i className="fas fa-plus"></i>
                  </div>
                  <h3 className="lead-option-title">Add Manual</h3>
                  <p className="lead-option-desc">
                    Manually add leads one by one with email, name, and company details.
                  </p>
                  <button
                    className="lead-option-import-btn"
                    onClick={() => setShowManualForm(!showManualForm)}
                  >
                    <i className={showManualForm ? 'fas fa-minus' : 'fas fa-plus'}></i>
                    {showManualForm ? 'Hide Form' : 'Add Lead'}
                  </button>
                </div>
              </div>

              {/* Manual Entry Form */}
              {showManualForm && (
                <div className="manual-form-section">
                  <h4 className="manual-form-title">Add Lead Details</h4>
                  <div className="manual-form-row">
                    <input
                      type="text"
                      className="manual-form-input"
                      placeholder="Name"
                      value={manualLead.name}
                      onChange={(e) => setManualLead(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <input
                      type="email"
                      className="manual-form-input"
                      placeholder="Email *"
                      value={manualLead.email}
                      onChange={(e) => setManualLead(prev => ({ ...prev, email: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="manual-form-input"
                      placeholder="Company"
                      value={manualLead.company}
                      onChange={(e) => setManualLead(prev => ({ ...prev, company: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="manual-form-input"
                      placeholder="Title"
                      value={manualLead.title}
                      onChange={(e) => setManualLead(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <button
                      className="lead-option-import-btn add-btn"
                      onClick={handleAddManual}
                      disabled={!manualLead.email}
                    >
                      <i className="fas fa-plus"></i>
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Added Leads Table */}
              {addedLeads.length > 0 && (
                <div className="added-leads-section">
                  <div className="added-leads-header">
                    <h4 className="added-leads-title">
                      Added Leads <span className="added-leads-count">{addedLeads.length}</span>
                    </h4>
                    <button className="added-leads-clear" onClick={() => setAddedLeads([])}>
                      <i className="fas fa-trash"></i> Clear all
                    </button>
                  </div>
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Name</th>
                        <th>Title</th>
                        <th>Email</th>
                        <th>Source</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {addedLeads.map(lead => (
                        <tr key={lead.id}>
                          <td>{lead.company || '—'}</td>
                          <td>{lead.name || '—'}</td>
                          <td>{lead.title || lead.jobTitle || '—'}</td>
                          <td>{lead.email}</td>
                          <td><span className={`source-badge ${lead.source}`}>{lead.source === 'lead-engine' ? 'Lead Engine' : lead.source === 'csv' ? 'CSV' : 'Manual'}</span></td>
                          <td>
                            <button className="lead-row-remove" onClick={() => removeLead(lead.id)} title="Remove">
                              <i className="fas fa-times"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Sender Identity */}
          {currentStep === 2 && (
            <div className="step-panel">
              <h2 className="step-title">Sender Identity</h2>
              <p className="step-description">Select the email accounts to send this campaign from</p>

              {loadingSenders ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading sender accounts...</p>
                </div>
              ) : senders.length > 0 ? (
                <div className="sender-select-list">
                  {senders.map(sender => (
                    <div
                      key={sender.id}
                      className={`sender-select-card ${selectedSenderIds.has(sender.id) ? 'selected' : ''} ${sender.status === 'expired' ? 'expired' : ''}`}
                    >
                      <div className="sender-select-left" onClick={() => sender.status === 'connected' && toggleSenderSelection(sender.id)}>
                        <input
                          type="checkbox"
                          className="le-drawer-checkbox"
                          checked={selectedSenderIds.has(sender.id)}
                          disabled={sender.status === 'expired'}
                          onChange={() => toggleSenderSelection(sender.id)}
                        />
                        <div className="sender-select-icon">
                          <i className={`fab fa-${sender.provider === 'gmail' ? 'google' : sender.provider === 'outlook' ? 'microsoft' : 'fas fa-server'}`}></i>
                        </div>
                        <div className="sender-select-info">
                          <div className="sender-select-email">{sender.email}</div>
                          <div className="sender-select-meta">
                            <span className="sender-select-label">{sender.label}</span>
                            {sender.isDefault && <span className="sender-default-badge">Default</span>}
                            <span className={`sender-select-status ${sender.status}`}>
                              <span className="sender-status-dot"></span>
                              {sender.status === 'connected' ? 'Connected' : 'Expired'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        className="sender-select-delete"
                        onClick={() => removeSender(sender.id)}
                        title="Remove sender"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-card">
                  <div className="empty-state-icon">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <h3 className="empty-state-title">No Sender Accounts</h3>
                  <p className="empty-state-description">
                    Add sender accounts in the Sender Identity section first.
                  </p>
                  <a href="/campaign-manager/sender-profile" className="btn-primary">
                    <i className="fas fa-plus"></i>
                    Go to Sender Identity
                  </a>
                </div>
              )}

              {selectedSenderIds.size > 0 && (
                <div className="selected-info-box" style={{ marginTop: '16px' }}>
                  <i className="fas fa-check-circle"></i>
                  <span><strong>{selectedSenderIds.size}</strong> sender account{selectedSenderIds.size > 1 ? 's' : ''} selected</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Create Campaign Mail - Wizard */}
          {currentStep === 3 && (
            <div className="step-panel">
              <h2 className="step-title">Create Campaign Mail</h2>
              <p className="step-description">Build your email sequence step by step</p>

              {/* Wizard Progress - Dynamic */}
              <div className="wizard-progress">
                {emailDays.map((emailDay, idx) => {
                  const reviewStep = emailDays.length + 1
                  const isReviewMode = wizardStep === reviewStep

                  return (
                    <React.Fragment key={emailDay.id}>
                      {idx > 0 && <div className={`wizard-connector ${wizardStep > emailDay.stepOrder - 1 ? 'active' : ''}`}></div>}
                      <div
                        className={`wizard-step ${emailDay.template ? 'completed' : ''} ${wizardStep === emailDay.stepOrder ? 'active' : ''} ${isReviewMode ? 'review-mode' : ''}`}
                        onClick={() => setWizardStep(emailDay.stepOrder)}
                      >
                        <div className="wizard-step-number">
                          {emailDay.template ? <i className="fas fa-check"></i> : emailDay.stepOrder}
                        </div>
                        <div className="wizard-step-label">
                          <span className="wizard-step-title">Day {emailDay.dayNumber}</span>
                          <span className="wizard-step-subtitle">Email {emailDay.stepOrder}</span>
                        </div>
                        {/* Delete button for days other than Day 1 */}
                        {emailDay.dayNumber !== 1 && (
                          <button
                            className="wizard-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteDay(emailDay.id)
                            }}
                            title="Delete this email day"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        )}
                      </div>
                    </React.Fragment>
                  )
                })}

                {/* Add Day Button */}
                <div className={`wizard-connector ${wizardStep > emailDays.length ? 'active' : ''}`}></div>
                <div
                  className="wizard-step add-day-step"
                  onClick={handleAddDay}
                  title="Add new email day"
                >
                  <div className="wizard-step-number">
                    <i className="fas fa-plus"></i>
                  </div>
                  <div className="wizard-step-label">
                    <span className="wizard-step-title">Add Day</span>
                  </div>
                </div>

                {/* Review Step */}
                <div className={`wizard-connector ${wizardStep === emailDays.length + 1 ? 'active' : ''}`}></div>
                <div
                  className={`wizard-step ${wizardStep === emailDays.length + 1 ? 'active' : ''}`}
                  onClick={() => setWizardStep(emailDays.length + 1)}
                >
                  <div className="wizard-step-number">
                    <i className="fas fa-clipboard-check"></i>
                  </div>
                  <div className="wizard-step-label">
                    <span className="wizard-step-title">Review</span>
                    <span className="wizard-step-subtitle">Sequence</span>
                  </div>
                </div>
              </div>

              {/* Wizard Content: Email Days */}
              {wizardStep <= emailDays.length && (
                <div className="wizard-content">
                  {/* Left Panel: Template Selection */}
                  <div className="wizard-left-panel">
                    <div className="wizard-panel-header">
                      <h3>
                        <i className="fas fa-envelope"></i>
                        Email {getCurrentEmailDay()?.stepOrder || wizardStep}
                      </h3>
                      <p className="wizard-panel-desc">
                        {getCurrentDayNumber() === 1 ? 'Sends immediately' : `Sends on day ${getCurrentDayNumber()}`}
                      </p>
                    </div>

                    {loadingTemplates ? (
                      <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading templates...</p>
                      </div>
                    ) : (
                      <>
                        <div className="template-selection-list">
                          {templates.length > 0 ? (
                            templates.map(template => (
                              <div
                                key={template.id}
                                className={`wz-template-card ${getCurrentEmailDay()?.template?.id === template.id ? 'selected' : ''}`}
                                onClick={() => handleTemplateSelect(template)}
                              >
                                <div className="wz-template-radio">
                                  <div className={`radio-dot ${getCurrentEmailDay()?.template?.id === template.id ? 'checked' : ''}`}></div>
                                </div>
                                <div className="wz-template-info">
                                  <h4>{template.name}</h4>
                                  <p className="wz-template-subject">
                                    {template.subject_template}
                                  </p>
                                </div>
                                <div className="wz-template-actions">
                                  <button
                                    className="btn-icon-small"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenTestEmail(template)
                                    }}
                                    title="Send test email"
                                  >
                                    <i className="fas fa-paper-plane"></i>
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="wz-empty-templates">
                              <i className="fas fa-inbox"></i>
                              <p>No templates yet</p>
                              <p className="wz-empty-hint">Import or upload templates below</p>
                            </div>
                          )}
                        </div>

                        <div className="wz-divider"><span>OR</span></div>

                        <div className="wz-action-buttons">
                          <button className="wz-action-btn" onClick={handleImportFromLibrary}>
                            <i className="fas fa-file-import"></i>
                            Import from Library
                          </button>
                          <button className="wz-action-btn" onClick={handleUploadTemplate}>
                            <i className="fas fa-plus"></i>
                            Upload New Template
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Panel: Live Preview */}
                  <div className="wizard-right-panel">
                    <div className="wizard-panel-header">
                      <h3>
                        <i className="fas fa-eye"></i>
                        Live Preview
                      </h3>
                    </div>

                    {wizardPreviewTemplate ? (
                      <div className="wz-preview-content">
                        <div className="wz-preview-email">
                          <div className="wz-preview-header">
                            <div className="wz-preview-field">
                              <strong>From:</strong> {senders.find(s => s.isDefault)?.email || senders[0]?.email || 'sender@example.com'}
                            </div>
                            <div className="wz-preview-field">
                              <strong>To:</strong> {addedLeads.length > 0 ? addedLeads[0].email : 'lead@example.com'}
                            </div>
                          </div>
                          <div className="wz-preview-subject">
                            {wizardPreviewTemplate.subject_template}
                          </div>
                          <div className="wz-preview-body">
                            {wizardPreviewTemplate.body_template}
                          </div>
                        </div>

                        <div className="wz-ai-box">
                          <div className="wz-ai-header">
                            <i className="fas fa-magic"></i>
                            <h4>AI Personalization</h4>
                            {getCurrentEmailDay() && personalizedFlags[getCurrentEmailDay()!.id] && (
                              <span className="wz-ai-badge">Personalized</span>
                            )}
                          </div>
                          <p className="wz-ai-desc">
                            Tailor this email to match your {addedLeads.length || 0} leads
                          </p>
                          {addedLeads.length > 0 && (
                            <div className="wz-ai-lead-summary">
                              <div className="wz-ai-insight">
                                <span className="wz-ai-label">Companies:</span>
                                <span className="wz-ai-value">{[...new Set(addedLeads.slice(0, 5).map(l => l.company).filter(Boolean))].join(', ') || 'N/A'}</span>
                              </div>
                              <div className="wz-ai-insight">
                                <span className="wz-ai-label">Titles:</span>
                                <span className="wz-ai-value">{[...new Set(addedLeads.slice(0, 5).map(l => l.title || l.jobTitle).filter(Boolean))].join(', ') || 'N/A'}</span>
                              </div>
                            </div>
                          )}
                          <button
                            className={`btn-personalize ${getCurrentEmailDay() && personalizedFlags[getCurrentEmailDay()!.id] ? 'done' : ''}`}
                            disabled={addedLeads.length === 0 || personalizingEmail || !getCurrentEmailDay()}
                            onClick={() => getCurrentEmailDay() && handlePersonalize(getCurrentEmailDay()!.id)}
                          >
                            <i className={getCurrentEmailDay() && personalizedFlags[getCurrentEmailDay()!.id] ? 'fas fa-redo' : 'fas fa-wand-magic-sparkles'}></i>
                            {getCurrentEmailDay() && personalizedFlags[getCurrentEmailDay()!.id] ? 'Re-personalize' : 'Personalize with AI'}
                          </button>
                          {addedLeads.length === 0 && (
                            <p className="wz-ai-notice">Add leads in Step 1 to enable</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="wz-preview-empty">
                        <i className="fas fa-mouse-pointer"></i>
                        <h4>Select a template</h4>
                        <p>Click on a template to see its preview here</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Wizard Review Step - Dynamic */}
              {wizardStep === emailDays.length + 1 && (
                <div className="wz-review">
                  <div className="wz-review-header">
                    <h3>Review Your Email Sequence</h3>
                    <p>{emailDays.filter(d => d.template).length} emails over {Math.max(...emailDays.map(d => d.dayNumber))} days for {addedLeads.length} leads</p>
                  </div>

                  <div className="wz-review-timeline">
                    {emailDays.map((emailDay, idx) => {
                      const previousDay = idx > 0 ? emailDays[idx - 1] : null
                      const waitDays = previousDay ? emailDay.dayNumber - previousDay.dayNumber : null
                      const waitText = waitDays ? `${waitDays} day${waitDays > 1 ? 's' : ''}` : null

                      return (
                        <React.Fragment key={emailDay.id}>
                          {waitText && (
                            <div className="wz-review-wait">
                              <i className="fas fa-clock"></i> Wait {waitText}
                            </div>
                          )}
                          <div className={`wz-review-card ${emailDay.template ? '' : 'empty'}`}>
                            <div className="wz-review-day">
                              <span className="wz-review-badge">Day {emailDay.dayNumber}</span>
                              <span className="wz-review-label">Email {emailDay.stepOrder}</span>
                            </div>
                            {emailDay.template ? (
                              <div className="wz-review-body">
                                <h4>{emailDay.template.name}</h4>
                                <p><strong>Subject:</strong> {emailDay.template.subject_template}</p>
                                <div className="wz-review-actions">
                                  <button className="btn-text" onClick={() => setWizardStep(emailDay.stepOrder)}>
                                    <i className="fas fa-edit"></i> Edit
                                  </button>
                                  <button className="btn-text" onClick={() => handleOpenTestEmail(emailDay.template!)}>
                                    <i className="fas fa-paper-plane"></i> Test
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="wz-review-body empty-body">
                                <p>No template selected</p>
                                <button className="btn-text" onClick={() => setWizardStep(emailDay.stepOrder)}>
                                  <i className="fas fa-plus"></i> Add Email
                                </button>
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      )
                    })}
                  </div>

                  {/* Batch AI Personalization */}
                  {addedLeads.length > 0 && (
                    <div className="wz-batch-ai">
                      <div className="wz-batch-ai-header">
                        <i className="fas fa-magic"></i>
                        <div>
                          <h4>AI Personalize All Emails</h4>
                          <p>Automatically adjust all emails to match your {addedLeads.length} leads</p>
                        </div>
                      </div>
                      {batchPersonalizing ? (
                        <div className="wz-batch-progress">
                          <div className="wz-batch-bar">
                            <div className="wz-batch-fill" style={{ width: `${batchProgress}%` }}></div>
                          </div>
                          <span>{batchProgress}% complete</span>
                        </div>
                      ) : (
                        <button
                          className="btn-batch-personalize"
                          onClick={handleBatchPersonalize}
                          disabled={emailDays.filter(d => d.template).length === 0}
                        >
                          <i className="fas fa-wand-magic-sparkles"></i>
                          Personalize All with AI
                        </button>
                      )}
                      {Object.values(personalizedFlags).some(Boolean) && (
                        <div className="wz-batch-status">
                          <i className="fas fa-check-circle"></i>
                          {Object.values(personalizedFlags).filter(Boolean).length} of {emailDays.filter(d => d.template).length} emails personalized
                        </div>
                      )}
                    </div>
                  )}

                  <div className="wz-review-summary">
                    <h4><i className="fas fa-chart-bar"></i> Campaign Summary</h4>
                    <div className="wz-summary-stats">
                      <div className="wz-stat">
                        <i className="fas fa-envelope"></i>
                        <span>{emailDays.filter(d => d.template).length} emails</span>
                      </div>
                      <div className="wz-stat">
                        <i className="fas fa-calendar"></i>
                        <span>{Math.max(...emailDays.map(d => d.dayNumber))}-day sequence</span>
                      </div>
                      <div className="wz-stat">
                        <i className="fas fa-users"></i>
                        <span>{addedLeads.length} leads</span>
                      </div>
                      <div className="wz-stat">
                        <i className="fas fa-magic"></i>
                        <span>{Object.values(personalizedFlags).filter(Boolean).length} personalized</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Navigation */}
              <div className="wizard-navigation">
                <div className="wizard-nav-left">
                  {wizardStep > 1 && (
                    <button className="btn-wizard-back" onClick={wizardStep === emailDays.length + 1 ? () => setWizardStep(emailDays.length) : handleWizardBack}>
                      <i className="fas fa-arrow-left"></i>
                      {wizardStep === emailDays.length + 1 ? 'Back to Edit' : `Back`}
                    </button>
                  )}
                </div>
                <div className="wizard-nav-right">
                  {wizardStep <= emailDays.length && (
                    <button className="btn-wizard-skip" onClick={handleSkipEmail}>
                      Skip
                    </button>
                  )}
                  {wizardStep < emailDays.length && (
                    <button className="btn-wizard-next" onClick={handleWizardNext}>
                      Next: Email {wizardStep + 1}
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  )}
                  {wizardStep === emailDays.length && (
                    <button className="btn-wizard-next review" onClick={() => setWizardStep(emailDays.length + 1)}>
                      Review Sequence
                      <i className="fas fa-clipboard-check"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Schedule */}
          {currentStep === 4 && (
            <div className="step-panel">
              <h2 className="step-title">Schedule</h2>

              <div className="schedule-section">
                <h3 className="schedule-section-title">Dates and Time</h3>
                <div className="schedule-row">
                  <div className="schedule-field">
                    <label className="schedule-label">Start date</label>
                    <input
                      type="date"
                      className="schedule-input"
                      placeholder="DD/MM/YYYY"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="schedule-field">
                    <label className="schedule-label">End date</label>
                    <input
                      type="date"
                      className="schedule-input"
                      placeholder="DD/MM/YYYY"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="schedule-row">
                  <div className="schedule-field">
                    <label className="schedule-label">From</label>
                    <input
                      type="time"
                      className="schedule-input"
                      value={formData.from_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, from_time: e.target.value }))}
                    />
                  </div>
                  <div className="schedule-field">
                    <label className="schedule-label">To</label>
                    <input
                      type="time"
                      className="schedule-input"
                      value={formData.to_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, to_time: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="schedule-section">
                <h3 className="schedule-section-title">Sending Days</h3>
                <div className="days-grid">
                  {DAYS.map(day => (
                    <label key={day} className="day-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.sending_days.includes(day)}
                        onChange={() => toggleDay(day)}
                      />
                      <span className="day-label">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="schedule-section">
                <h3 className="schedule-section-title">Daily Sending Limit</h3>
                <div className="schedule-row">
                  <div className="schedule-field">
                    <label className="schedule-label">Maximum Mails per day</label>
                    <input
                      type="number"
                      className="schedule-input small"
                      value={formData.max_mails_per_day}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_mails_per_day: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="schedule-field">
                    <label className="schedule-label">Interval between mails</label>
                    <div className="interval-input-group">
                      <input
                        type="number"
                        className="schedule-input small"
                        value={formData.interval_between_mails}
                        onChange={(e) => setFormData(prev => ({ ...prev, interval_between_mails: parseInt(e.target.value) || 0 }))}
                      />
                      <span className="interval-unit">min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review and Launch */}
          {currentStep === 5 && (
            <div className="step-panel">
              <h2 className="step-title">Review and Launch</h2>
              <p className="step-description">Review your campaign settings before launching</p>

              <div className="review-sections">
                <div className="review-card">
                  <h3 className="review-card-title">
                    <i className="fas fa-info-circle"></i>
                    Campaign Details
                  </h3>
                  <div className="review-item">
                    <span className="review-label">Campaign Name:</span>
                    <span className="review-value">{formData.campaign_name || 'Not set'}</span>
                  </div>
                </div>

                <div className="review-card">
                  <h3 className="review-card-title">
                    <i className="fas fa-users"></i>
                    Leads
                  </h3>
                  <div className="review-item">
                    <span className="review-label">Total Leads:</span>
                    <span className="review-value">{addedLeads.length}</span>
                  </div>
                  {addedLeads.filter(l => l.source === 'csv').length > 0 && (
                    <div className="review-item">
                      <span className="review-label">From CSV:</span>
                      <span className="review-value"><span className="source-badge csv">CSV</span> {addedLeads.filter(l => l.source === 'csv').length}</span>
                    </div>
                  )}
                  {addedLeads.filter(l => l.source === 'lead-engine').length > 0 && (
                    <div className="review-item">
                      <span className="review-label">From Lead Engine:</span>
                      <span className="review-value"><span className="source-badge lead-engine">Lead Engine</span> {addedLeads.filter(l => l.source === 'lead-engine').length}</span>
                    </div>
                  )}
                  {addedLeads.filter(l => l.source === 'manual').length > 0 && (
                    <div className="review-item">
                      <span className="review-label">Manual:</span>
                      <span className="review-value"><span className="source-badge manual">Manual</span> {addedLeads.filter(l => l.source === 'manual').length}</span>
                    </div>
                  )}
                </div>

                <div className="review-card">
                  <h3 className="review-card-title">
                    <i className="fas fa-user-circle"></i>
                    Sender Accounts
                  </h3>
                  <div className="review-item">
                    <span className="review-label">Selected Senders:</span>
                    <span className="review-value">{selectedSenderIds.size > 0 ? selectedSenderIds.size : 'None selected'}</span>
                  </div>
                  {senders.filter(s => selectedSenderIds.has(s.id)).map(s => (
                    <div className="review-item" key={s.id}>
                      <span className="review-label">{s.label}:</span>
                      <span className="review-value">{s.email}</span>
                    </div>
                  ))}
                </div>

                <div className="review-card">
                  <h3 className="review-card-title">
                    <i className="fas fa-envelope"></i>
                    Email Sequence
                  </h3>
                  <div className="review-item">
                    <span className="review-label">Emails:</span>
                    <span className="review-value">
                      {emailDays.filter(d => d.template).length} of {emailDays.length} configured
                    </span>
                  </div>
                  {emailDays.map(emailDay => (
                    <div className="review-item" key={emailDay.id}>
                      <span className="review-label">Day {emailDay.dayNumber} (Email {emailDay.stepOrder}):</span>
                      <span className="review-value">
                        {emailDay.template
                          ? emailDay.template.name
                          : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Skipped</span>
                        }
                      </span>
                    </div>
                  ))}
                </div>

                <div className="review-card">
                  <h3 className="review-card-title">
                    <i className="fas fa-calendar"></i>
                    Schedule
                  </h3>
                  <div className="review-item">
                    <span className="review-label">Date Range:</span>
                    <span className="review-value">
                      {formData.start_date && formData.end_date 
                        ? `${formData.start_date} to ${formData.end_date}` 
                        : 'Not set'}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Time:</span>
                    <span className="review-value">
                      {formData.from_time} - {formData.to_time}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Days:</span>
                    <span className="review-value">
                      {formData.sending_days.length > 0 ? formData.sending_days.join(', ') : 'None selected'}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Daily Limit:</span>
                    <span className="review-value">{formData.max_mails_per_day} emails/day</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Interval:</span>
                    <span className="review-value">{formData.interval_between_mails} minutes</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="builder-footer">
          {currentStep > 1 && (
            <button className="btn-secondary" onClick={handleBack}>
              Back
            </button>
          )}
          <div className="footer-right">
            {currentStep < 5 ? (
              <button
                className="btn-primary"
                onClick={handleNext}
                disabled={(currentStep === 1 && addedLeads.length === 0) || (currentStep === 2 && selectedSenderIds.size === 0)}
                style={(currentStep === 1 && addedLeads.length === 0) || (currentStep === 2 && selectedSenderIds.size === 0) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                Save and Next
              </button>
            ) : (
              <button className="btn-primary btn-green" onClick={handleLaunch}>
                <i className="fas fa-rocket"></i>
                Launch Campaign
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CSV Upload Drawer */}
      {showCsvDrawer && (
        <div className="le-drawer-overlay" onClick={closeCsvDrawer}>
          <div className="csv-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="le-drawer-header">
              <div className="le-drawer-header-left">
                <i className="fas fa-pencil-alt le-drawer-edit-icon"></i>
              </div>
              <button className="le-drawer-close" onClick={closeCsvDrawer}>
                <i className="fas fa-times"></i>
                Close
              </button>
            </div>

            {/* Breadcrumb */}
            <div className="le-drawer-breadcrumb">
              <span className="le-drawer-breadcrumb-parent">Add leads</span>
              <i className="fas fa-chevron-right le-drawer-breadcrumb-sep"></i>
              <span className="le-drawer-breadcrumb-current">Upload File</span>
            </div>

            {/* Body */}
            <div className="le-drawer-body csv-drawer-body">
              {/* Drag & Drop Zone */}
              <div
                className={`csv-dropzone ${isDragging ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  handleCsvDrawerFileSelect(e.dataTransfer.files)
                }}
              >
                <p className="csv-dropzone-title">Drag and Drop</p>
                <p className="csv-dropzone-subtitle">Max file size: 200 MB (CSV, TXT), 50 MB (XLSX)</p>
                <label className="csv-dropzone-upload-btn">
                  Upload
                  <input
                    type="file"
                    accept=".csv,.xlsx,.txt"
                    multiple
                    hidden
                    onChange={(e) => {
                      handleCsvDrawerFileSelect(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>

              {/* Uploaded Files List */}
              {uploadedCsvFiles.length > 0 && (
                <div className="csv-uploaded-section">
                  <h4 className="csv-uploaded-title">Uploaded Files</h4>
                  <div className="csv-uploaded-list">
                    {uploadedCsvFiles.map(entry => (
                      <div key={entry.id} className="csv-uploaded-item">
                        <div className="csv-uploaded-item-left">
                          <i className="fas fa-file-csv csv-uploaded-icon"></i>
                          <span className="csv-uploaded-name">{entry.name}</span>
                        </div>
                        <button className="csv-uploaded-remove" onClick={() => removeCsvFile(entry.id)}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="le-drawer-footer">
              <button className="le-drawer-back-btn" onClick={closeCsvDrawer}>
                Cancel
              </button>
              <button
                className="le-drawer-next-btn"
                disabled={uploadedCsvFiles.length === 0}
                onClick={handleCsvDrawerNext}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Engine Drawer */}
      {showLeadEngineDrawer && (
        <div className="le-drawer-overlay" onClick={() => { setShowLeadEngineDrawer(false); setDrawerStep('sessions') }}>
          <div className="le-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="le-drawer-header">
              <div className="le-drawer-header-left">
                <i className="fas fa-pencil-alt le-drawer-edit-icon"></i>
              </div>
              <button className="le-drawer-close" onClick={() => { setShowLeadEngineDrawer(false); setDrawerStep('sessions') }}>
                <i className="fas fa-times"></i>
                Close
              </button>
            </div>

            {/* === STEP 1: Session Selection === */}
            {drawerStep === 'sessions' && (
              <>
                <div className="le-drawer-breadcrumb">
                  <span className="le-drawer-breadcrumb-parent">Add leads</span>
                  <i className="fas fa-chevron-right le-drawer-breadcrumb-sep"></i>
                  <span className="le-drawer-breadcrumb-current">Lead Engine</span>
                </div>

                <div className="le-drawer-body">
                  <h3 className="le-drawer-section-title">Saved Sessions</h3>

                  {loadingSessions ? (
                    <div className="loading-text">Loading sessions...</div>
                  ) : sessions.length > 0 ? (
                    <div className="le-drawer-session-list">
                      {sessions.map(session => (
                        <label key={session.id} className={`le-drawer-session-item ${selectedSessionIds.has(session.id) ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            className="le-drawer-checkbox"
                            checked={selectedSessionIds.has(session.id)}
                            onChange={() => toggleSessionSelection(session.id)}
                          />
                          <div className="le-drawer-session-info">
                            <span className="le-drawer-session-name">{session.name}</span>
                            <span className="le-drawer-session-desc">Email campaign targeting companies in the US</span>
                          </div>
                          <div className="le-drawer-session-meta">
                            <span className="le-drawer-session-leads">
                              <i className="fas fa-users"></i>
                              {session.total_leads} leads
                            </span>
                            <button
                              className="le-drawer-view-btn"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleViewSession(session.id)
                              }}
                            >
                              View
                            </button>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data-text">No sessions available. Generate leads first.</p>
                  )}
                </div>

                <div className="le-drawer-footer">
                  <button className="le-drawer-back-btn" onClick={() => { setShowLeadEngineDrawer(false); setDrawerStep('sessions') }}>
                    Back
                  </button>
                  <button
                    className="le-drawer-next-btn"
                    disabled={selectedSessionIds.size === 0 || loadingDrawerLeads}
                    onClick={handleAddLeadsFromSessions}
                  >
                    <i className="fas fa-plus"></i>
                    {loadingDrawerLeads ? 'Loading...' : 'Add Leads'}
                  </button>
                </div>
              </>
            )}

            {/* === STEP 2: Leads Validation === */}
            {drawerStep === 'leads' && (
              <>
                <div className="le-drawer-breadcrumb">
                  <span className="le-drawer-breadcrumb-parent">Add leads</span>
                  <i className="fas fa-chevron-right le-drawer-breadcrumb-sep"></i>
                  <span className="le-drawer-breadcrumb-parent">Upload File</span>
                  <i className="fas fa-chevron-right le-drawer-breadcrumb-sep"></i>
                  <span className="le-drawer-breadcrumb-current">Detected Leads</span>
                </div>
                
                {loadingDrawerLeads ? (
                  <div className="loading-text" style={{ padding: '40px', textAlign: 'center' }}>Loading leads...</div>
                ) : (
                  <>
                    {/* Validation Summary */}
                    <div className="le-validation-summary">
                      <div className="le-validation-tab">
                        <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b', marginRight: '8px' }}></i>
                        Flagged Leads : <strong>{flaggedLeads.length}</strong>
                      </div>
                      <div className="le-validation-tab">
                        <i className="fas fa-check-circle" style={{ color: '#10b981', marginRight: '8px' }}></i>
                        Detected Leads : <strong>{detectedLeads.length}</strong>
                      </div>
                    </div>

                    <div className="le-drawer-body" style={{ paddingTop: '0' }}>
                      {/* Flagged Leads Section */}
                      {flaggedLeads.length > 0 && (
                        <div className="le-leads-section">
                          <div className="le-leads-section-header">
                            <h3 className="le-leads-section-title">Flagged Leads</h3>
                            <div className="le-leads-section-actions">
                              <button className="le-btn-text" onClick={() => handleDeleteAll('flagged')}>
                                <i className="fas fa-trash"></i> Delete All
                              </button>
                              <label className="le-drawer-select-all">
                                <input
                                  type="checkbox"
                                  checked={flaggedLeads.length > 0 && flaggedLeads.every(lead => selectedLeadIds.has(lead.id))}
                                  onChange={() => {
                                    setSelectedLeadIds(prev => {
                                      const next = new Set(prev)
                                      const allSelected = flaggedLeads.every(lead => prev.has(lead.id))
                                      if (allSelected) {
                                        flaggedLeads.forEach(lead => next.delete(lead.id))
                                      } else {
                                        flaggedLeads.forEach(lead => next.add(lead.id))
                                      }
                                      return next
                                    })
                                  }}
                                />
                                Select All
                              </label>
                            </div>
                          </div>
                          <div className="le-drawer-leads-table-wrap">
                            <table className="le-drawer-leads-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '40px' }}></th>
                                  <th>Name</th>
                                  <th>Company</th>
                                  <th>Email</th>
                                  <th>Issue</th>
                                  <th style={{ width: '60px' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {flaggedLeads.map(lead => (
                                  <tr key={lead.id} className={selectedLeadIds.has(lead.id) ? 'selected' : ''}>
                                    <td>
                                      <input
                                        type="checkbox"
                                        className="le-drawer-checkbox"
                                        checked={selectedLeadIds.has(lead.id)}
                                        onChange={() => toggleLeadSelection(lead.id)}
                                      />
                                    </td>
                                    <td>{lead.name || '—'}</td>
                                    <td>{lead.company || '—'}</td>
                                    <td>{lead.email || '—'}</td>
                                    <td><span className="le-issue-badge">{lead.issue}</span></td>
                                    <td>
                                      <button className="le-action-edit-btn" onClick={() => handleEditLead(lead)} title="Edit">
                                        <i className="fas fa-pen"></i>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Detected Leads Section */}
                      {detectedLeads.length > 0 && (
                        <div className="le-leads-section" style={{ marginTop: flaggedLeads.length > 0 ? '24px' : '0' }}>
                          <div className="le-leads-section-header">
                            <h3 className="le-leads-section-title">Detected Leads</h3>
                            <div className="le-leads-section-actions">
                              <button className="le-btn-text" onClick={() => handleDeleteAll('detected')}>
                                <i className="fas fa-trash"></i> Delete All
                              </button>
                              <label className="le-drawer-select-all">
                                <input
                                  type="checkbox"
                                  checked={detectedLeads.length > 0 && detectedLeads.every(lead => selectedLeadIds.has(lead.id))}
                                  onChange={() => {
                                    setSelectedLeadIds(prev => {
                                      const next = new Set(prev)
                                      const allSelected = detectedLeads.every(lead => prev.has(lead.id))
                                      if (allSelected) {
                                        detectedLeads.forEach(lead => next.delete(lead.id))
                                      } else {
                                        detectedLeads.forEach(lead => next.add(lead.id))
                                      }
                                      return next
                                    })
                                  }}
                                />
                                Select All
                              </label>
                            </div>
                          </div>
                          <div className="le-drawer-leads-table-wrap">
                            <table className="le-drawer-leads-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '40px' }}></th>
                                  <th>Name</th>
                                  <th>Company</th>
                                  <th>Email</th>
                                  <th style={{ width: '60px' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detectedLeads.map(lead => (
                                  <tr key={lead.id} className={selectedLeadIds.has(lead.id) ? 'selected' : ''}>
                                    <td>
                                      <input
                                        type="checkbox"
                                        className="le-drawer-checkbox"
                                        checked={selectedLeadIds.has(lead.id)}
                                        onChange={() => toggleLeadSelection(lead.id)}
                                      />
                                    </td>
                                    <td>{lead.name || '—'}</td>
                                    <td>{lead.company || '—'}</td>
                                    <td>{lead.email || '—'}</td>
                                    <td>
                                      <button className="le-action-edit-btn" onClick={() => handleEditLead(lead)} title="Edit">
                                        <i className="fas fa-pen"></i>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {drawerLeads.length === 0 && (
                        <p className="no-data-text">No leads found in selected session(s).</p>
                      )}
                    </div>
                  </>
                )}
                
                <div className="le-drawer-footer">
                  <button className="le-drawer-back-btn" onClick={() => setDrawerStep('sessions')}>
                    Back
                  </button>
                  <button
                    className="le-drawer-next-btn"
                    disabled={selectedLeadIds.size === 0}
                    onClick={handleSaveAndAddLeads}
                  >
                    <i className="fas fa-plus"></i>
                    Add Leads
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Import Template Modal */}
      {/* Add Day Modal */}
      {showAddDayModal && (
        <div className="le-modal-overlay" onClick={handleCancelAddDay}>
          <div className="le-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="le-modal-header">
              <h3 className="le-modal-title">Add Email Day</h3>
              <button className="le-modal-close" onClick={handleCancelAddDay}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="le-modal-body" style={{ padding: '24px' }}>
              <div className="form-group">
                <label htmlFor="dayNumber" className="form-label">
                  After how many days should this email be sent?
                </label>
                <input
                  type="number"
                  id="dayNumber"
                  className="form-input"
                  placeholder="e.g., 3, 7, 14"
                  min="1"
                  value={newDayNumber}
                  onChange={(e) => setNewDayNumber(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmAddDay()
                    }
                  }}
                />
                <p className="form-hint" style={{ marginTop: '8px', fontSize: '13px', color: '#64748b' }}>
                  Enter the day number when this email should be sent (e.g., 3 for day 3, 7 for day 7)
                </p>
              </div>
            </div>
            <div className="le-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={handleCancelAddDay}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleConfirmAddDay}>
                <i className="fas fa-plus"></i>
                Add Day
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="le-modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="le-modal-content le-import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="le-modal-header">
              <h3 className="le-modal-title">Import from Email Templates</h3>
              <button className="le-modal-close" onClick={() => setShowImportModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="le-import-body">
              {loadingTemplates ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading templates...</p>
                </div>
              ) : templates.length > 0 ? (
                <div className="import-templates-grid">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="import-template-card"
                      onClick={() => handleImportSelect(template)}
                    >
                      <div className="import-template-icon">
                        <i className="fas fa-envelope"></i>
                      </div>
                      <div className="import-template-info">
                        <h4>{template.name}</h4>
                        <p className="import-template-subject">
                          <strong>Subject:</strong> {template.subject_template}
                        </p>
                        <p className="import-template-preview">
                          {template.body_template ? template.body_template.substring(0, 80) : 'No preview'}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-card">
                  <div className="empty-state-icon">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <h3 className="empty-state-title">No Templates Available</h3>
                  <p className="empty-state-description">
                    Create email templates first to import them.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Template Modal */}
      {showUploadModal && (
        <div className="le-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="le-modal-content le-upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="le-modal-header">
              <h3 className="le-modal-title">
                <i className="fas fa-plus-circle"></i>
                Create New Template
              </h3>
              <button className="le-modal-close" onClick={() => setShowUploadModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const name = (form.elements.namedItem('tplName') as HTMLInputElement).value
              const subject = (form.elements.namedItem('tplSubject') as HTMLInputElement).value
              const body = (form.elements.namedItem('tplBody') as HTMLTextAreaElement).value

              if (!name || !subject || !body) {
                alert('Please fill in all fields')
                return
              }

              try {
                const response = await fetch('/api/templates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name,
                    subject_template: subject,
                    body_template: body,
                    template_type: 'custom'
                  })
                })

                if (response.ok) {
                  const newTemplate = await response.json()
                  // Add to templates list and select it
                  setTemplates(prev => [...prev, newTemplate])
                  handleTemplateSelect(newTemplate)
                  setShowUploadModal(false)
                } else {
                  alert('Failed to save template')
                }
              } catch (err) {
                console.error('Error saving template:', err)
                alert('Error saving template')
              }
            }}>
              <div className="le-upload-body">
                <div className="upload-field">
                  <label className="form-label">Template Name</label>
                  <input
                    type="text"
                    name="tplName"
                    className="form-input"
                    placeholder="e.g., Day 1 - Cold Opener"
                    required
                  />
                </div>
                <div className="upload-field">
                  <label className="form-label">Email Subject</label>
                  <input
                    type="text"
                    name="tplSubject"
                    className="form-input"
                    placeholder="e.g., Quick question about {{CompanyName}}"
                    required
                  />
                </div>
                <div className="upload-field">
                  <label className="form-label">Email Body</label>
                  <textarea
                    name="tplBody"
                    className="form-input form-textarea"
                    placeholder={"Hi {{FirstName}},\n\nI noticed {{CompanyName}} is...\n\nBest regards,\n{{SenderName}}"}
                    rows={10}
                    required
                  ></textarea>
                </div>
                <div className="upload-variables">
                  <label className="form-label">Available Variables:</label>
                  <div className="variable-tags">
                    {['{{FirstName}}', '{{LastName}}', '{{CompanyName}}', '{{Title}}', '{{Industry}}', '{{SenderName}}'].map(v => (
                      <span key={v} className="variable-tag">{v}</span>
                    ))}
                  </div>
                </div>
                <div className="upload-tip">
                  <i className="fas fa-lightbulb"></i>
                  Keep emails 60-100 words for best deliverability
                </div>
              </div>
              <div className="le-modal-actions">
                <button type="button" className="le-modal-btn-cancel" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="le-modal-btn-primary">
                  <i className="fas fa-save"></i>
                  Save &amp; Use in Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Personalization Modal */}
      {showPersonalizeModal && (
        <div className="le-modal-overlay" onClick={() => !personalizingEmail && setShowPersonalizeModal(false)}>
          <div className="le-modal-content le-personalize-modal" onClick={(e) => e.stopPropagation()}>
            <div className="le-modal-header">
              <h3 className="le-modal-title">
                <i className="fas fa-magic"></i>
                AI Email Personalization
              </h3>
              <button className="le-modal-close" onClick={() => !personalizingEmail && setShowPersonalizeModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {personalizingEmail ? (
              <div className="personalize-loading">
                <div className="loading-spinner"></div>
                <h4>Analyzing your leads...</h4>
                <p>AI is reviewing {addedLeads.length} leads and adjusting the email to match their profiles</p>
              </div>
            ) : personalizeResult ? (
              <div className="personalize-result">
                {/* Analysis Summary */}
                <div className="personalize-analysis">
                  <h4><i className="fas fa-chart-pie"></i> Lead Analysis</h4>
                  <div className="analysis-chips">
                    {personalizeResult.analysis.industries_detected?.map((ind, i) => (
                      <span key={i} className="analysis-chip industry">{ind}</span>
                    ))}
                    {personalizeResult.analysis.titles_detected?.map((title, i) => (
                      <span key={i} className="analysis-chip title">{title}</span>
                    ))}
                  </div>
                  {personalizeResult.analysis.tone_adjustment && (
                    <p className="analysis-tone"><strong>Tone:</strong> {personalizeResult.analysis.tone_adjustment}</p>
                  )}
                </div>

                {/* Changes Made */}
                <div className="personalize-changes">
                  <h4><i className="fas fa-list-check"></i> Changes Made</h4>
                  <ul>
                    {personalizeResult.changes_made.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </div>

                {/* Diff View */}
                <div className="personalize-diff">
                  <div className="diff-column original">
                    <h4><i className="fas fa-file-alt"></i> Original</h4>
                    <div className="diff-subject">
                      <strong>Subject:</strong> {personalizeResult.original.subject}
                    </div>
                    <div className="diff-body">{personalizeResult.original.body}</div>
                  </div>
                  <div className="diff-arrow">
                    <i className="fas fa-arrow-right"></i>
                  </div>
                  <div className="diff-column personalized">
                    <h4><i className="fas fa-sparkles"></i> Personalized</h4>
                    {personalizeEditMode ? (
                      <>
                        <div className="diff-edit-field">
                          <label>Subject:</label>
                          <input
                            type="text"
                            className="form-input"
                            value={personalizeEditSubject}
                            onChange={(e) => setPersonalizeEditSubject(e.target.value)}
                          />
                        </div>
                        <div className="diff-edit-field">
                          <label>Body:</label>
                          <textarea
                            className="form-input form-textarea"
                            value={personalizeEditBody}
                            onChange={(e) => setPersonalizeEditBody(e.target.value)}
                            rows={8}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="diff-subject">
                          <strong>Subject:</strong> {personalizeResult.personalized.subject}
                        </div>
                        <div className="diff-body">{personalizeResult.personalized.body}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {personalizeResult && (
              <div className="le-modal-actions personalize-actions">
                <button
                  className="le-modal-btn-cancel"
                  onClick={() => { setShowPersonalizeModal(false); setPersonalizeResult(null) }}
                >
                  Reject
                </button>
                <button
                  className="btn-personalize-edit"
                  onClick={() => {
                    if (personalizeEditMode) {
                      setPersonalizeEditMode(false)
                    } else {
                      setPersonalizeEditSubject(personalizeResult.personalized.subject)
                      setPersonalizeEditBody(personalizeResult.personalized.body)
                      setPersonalizeEditMode(true)
                    }
                  }}
                >
                  <i className={personalizeEditMode ? 'fas fa-eye' : 'fas fa-edit'}></i>
                  {personalizeEditMode ? 'Preview' : 'Edit'}
                </button>
                <button
                  className="le-modal-btn-primary"
                  onClick={handleAcceptPersonalization}
                >
                  <i className="fas fa-check"></i>
                  {personalizeEditMode ? 'Save & Apply' : 'Accept Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {showTestEmailModal && selectedTestTemplate && (
        <div className="le-modal-overlay" onClick={() => setShowTestEmailModal(false)}>
          <div className="le-modal-content le-test-email-modal" onClick={(e) => e.stopPropagation()}>
            <div className="le-modal-header">
              <h3 className="le-modal-title">
                <i className="fas fa-paper-plane"></i>
                Send Test Email
              </h3>
              <button className="le-modal-close" onClick={() => setShowTestEmailModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="le-test-email-body">
              <div className="test-email-info">
                <div className="test-email-template">
                  <label className="test-email-label">Template:</label>
                  <div className="test-email-template-name">
                    <i className={selectedTestTemplate.id < 0 ? "fas fa-robot" : "fas fa-envelope"}></i>
                    {selectedTestTemplate.name}
                  </div>
                </div>
                <div className="test-email-subject">
                  <label className="test-email-label">Subject:</label>
                  <div className="test-email-subject-text">{selectedTestTemplate.subject_template}</div>
                </div>
              </div>
              <div className="test-email-form">
                <div className="test-email-field">
                  <label className="form-label">
                    <i className="fas fa-envelope"></i>
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Enter test email address (e.g., your.email@example.com)"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="test-email-field">
                  <label className="form-label">
                    <i className="fas fa-user"></i>
                    Sender Account
                  </label>
                  {senders.filter(s => s.status === 'connected').length > 0 ? (
                    <select
                      className="form-input"
                      value={selectedTestSender || ''}
                      onChange={(e) => setSelectedTestSender(Number(e.target.value))}
                    >
                      <option value="" disabled>Select a sender...</option>
                      {senders
                        .filter(s => s.status === 'connected')
                        .map(sender => (
                          <option key={sender.id} value={sender.id}>
                            {sender.email} {sender.isDefault ? '(Default)' : ''}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="test-email-no-sender">
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>No sender accounts connected. <a href="/campaign-manager/sender-profile">Connect Gmail</a></span>
                    </div>
                  )}
                </div>
                <p className="test-email-note">
                  <i className="fas fa-info-circle"></i>
                  This email will be sent with test data (Test User, Test Company) to verify your template and sender configuration.
                </p>
              </div>
            </div>
            <div className="le-modal-actions">
              <button
                className="le-modal-btn-cancel"
                onClick={() => setShowTestEmailModal(false)}
                disabled={sendingTestEmail}
              >
                Cancel
              </button>
              <button
                className="le-modal-btn-primary"
                onClick={handleSendTestEmail}
                disabled={sendingTestEmail || !testEmailAddress || !selectedTestSender}
              >
                {sendingTestEmail ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    Send Test Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="le-modal-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="le-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="le-modal-title">Are you sure you want to delete this item?</h3>
            <p className="le-modal-subtitle">This action cannot be undone.</p>
            <div className="le-modal-actions">
              <button className="le-modal-btn-cancel" onClick={() => setShowDeleteModal(null)}>
                Cancel
              </button>
              <button className="le-modal-btn-delete" onClick={confirmDeleteAll}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="le-modal-overlay" onClick={() => setEditingLead(null)}>
          <div className="le-modal-content le-edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="le-modal-title">Edit Lead</h3>
            <div className="le-edit-form">
              <div className="le-edit-field">
                <label>Name</label>
                <input
                  type="text"
                  value={editingLead.name}
                  onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div className="le-edit-field">
                <label>Company</label>
                <input
                  type="text"
                  value={editingLead.company}
                  onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })}
                  placeholder="Enter company"
                />
              </div>
              <div className="le-edit-field">
                <label>Email</label>
                <input
                  type="email"
                  value={editingLead.email}
                  onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div className="le-edit-field">
                <label>Title</label>
                <input
                  type="text"
                  value={editingLead.title}
                  onChange={(e) => setEditingLead({ ...editingLead, title: e.target.value })}
                  placeholder="Enter title"
                />
              </div>
            </div>
            <div className="le-modal-actions">
              <button className="le-modal-btn-cancel" onClick={() => setEditingLead(null)}>
                Cancel
              </button>
              <button className="le-modal-btn-save" onClick={handleSaveEditedLead}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default function CampaignBuilderPageWrapper() {
  return (
    <Suspense fallback={<MainLayout><div className="loading-container"><div className="loading-spinner"></div><p>Loading...</p></div></MainLayout>}>
      <CampaignBuilderPage />
    </Suspense>
  )
}
