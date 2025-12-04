// Pipeline.js - Multi-platform interactive discovery
const API_BASE = '/api';

let currentLeadId = null;
let discoveredLeads = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadRecentLeads();
});

// Start Discovery Pipeline
async function startDiscovery(event) {
    event.preventDefault();

    const keywords = document.getElementById('searchKeywords').value;
    const numResults = document.getElementById('numResults').value;
    const minEmployees = document.getElementById('minEmployees').value;
    const maxEmployees = document.getElementById('maxEmployees').value;

    const startBtn = document.getElementById('startBtn');
    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="loading"></span> Searching LinkedIn Jobs...';

    // Reset steps
    resetPipelineSteps();
    clearLogs();
    discoveredLeads = [];
    updateLeadsDisplay();

    try {
        // Step 1: Search Jobs
        updateStep('search', 'running');
        addLog('💼 Searching for individual LinkedIn job postings...', 'info');
        addLog('🔍 Extracting company names and finding official domains...', 'info');

        const searchResponse = await fetch(`${API_BASE}/pipeline/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                keywords,
                num_results: numResults
            })
        });

        const searchData = await searchResponse.json();

        if (!searchData.success) {
            throw new Error(searchData.message || 'Search failed');
        }

        updateStep('search', 'complete');
        addLog(`✅ Found ${searchData.jobs.length} unique companies with job openings on LinkedIn`, 'success');

        // Process each job
        for (const job of searchData.jobs) {
            const companyDisplay = job.company_name || job.domain;
            addLog(`\n📋 [${job.platform}] ${job.title} at ${companyDisplay}`, 'info');

            try {
                // Step 2: Get Company Info
                updateStep('company', 'running');
                addLog(`🏢 Enriching company data via Apollo for: ${job.domain}`, 'info');

                const companyResponse = await fetch(`${API_BASE}/pipeline/company`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        domain: job.domain,
                        min_employees: minEmployees,
                        max_employees: maxEmployees
                    })
                });

                const companyData = await companyResponse.json();

                if (!companyData.success) {
                    addLog(`⚠️ Skipping: ${companyData.message}`, 'warning');
                    continue;
                }

                updateStep('company', 'complete');
                const companyLocation = [companyData.company.city, companyData.company.state].filter(Boolean).join(', ');
                const locationText = companyLocation ? ` - ${companyLocation}` : '';
                addLog(`✅ Company enriched: ${companyData.company.name} (${companyData.company.employees} employees${locationText})`, 'success');

                // Step 3: Find Decision Maker
                updateStep('contact', 'running');
                addLog(`👔 Finding decision makers for ${companyData.company.name}...`, 'info');
                addLog(`🔐 Will use Apollo POST /api/v1/people/match with x-api-key header to reveal email`, 'info');

                const contactResponse = await fetch(`${API_BASE}/pipeline/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        domain: job.domain,
                        role_type: 'all',  // Get all role types
                        per_page: 10       // Get up to 10 contacts
                    })
                });

                const contactData = await contactResponse.json();

                if (!contactData.success || !contactData.contact) {
                    addLog(`⚠️ No decision maker found for ${companyData.company.name}`, 'warning');
                    continue;
                }

                updateStep('contact', 'complete');
                addLog(`✅ Found: ${contactData.contact.name} - ${contactData.contact.title}`, 'success');

                // Check email status
                let contactEmail = contactData.contact.email;

                addLog(`🔐 Apollo /v1/people/match called with reveal_personal_emails=true`, 'info');

                if (contactEmail) {
                    const emailStatus = contactData.contact.email_status || 'unknown';
                    addLog(`✅ Email successfully revealed: ${contactEmail}`, 'success');
                    addLog(`   Email status: ${emailStatus}`, 'info');
                } else {
                    addLog(`❌ Apollo returned no email for ${contactData.contact.name}`, 'error');
                    addLog(`⚠️ Possible reasons:`, 'warning');
                    addLog(`   - Apollo doesn't have this person's email in their database`, 'warning');
                    addLog(`   - You've reached your Apollo credit limit`, 'warning');
                    addLog(`   - The person's email is not available publicly`, 'warning');
                    // Continue anyway to create the lead (user can manually find email)
                }

                // Step 4: Generate Email
                updateStep('email', 'running');
                addLog(`✍️ Generating personalized email...`, 'info');

                const emailResponse = await fetch(`${API_BASE}/pipeline/generate-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        job: job,
                        company: companyData.company,
                        contact: contactData.contact
                    })
                });

                const emailData = await emailResponse.json();

                if (!emailData.success) {
                    addLog(`⚠️ Email generation failed`, 'warning');
                    continue;
                }

                updateStep('email', 'complete');
                addLog(`✅ Email generated for ${contactData.contact.name}`, 'success');

                // Step 5: Ready for review
                updateStep('send', 'ready');

                // Add to discovered leads - include all contacts
                const lead = {
                    id: emailData.lead_id,
                    job: job,
                    company: companyData.company,
                    contact: contactData.contact,
                    all_contacts: contactData.all_contacts || [contactData.contact],
                    email: emailData.email
                };

                // Log all found contacts
                if (contactData.all_contacts && contactData.all_contacts.length > 1) {
                    addLog(`👥 Found ${contactData.all_contacts.length} decision makers:`, 'info');
                    contactData.all_contacts.forEach((c, i) => {
                        const emailIcon = c.email ? '✅' : '🔒';
                        addLog(`   ${i+1}. [${c.role_category || 'Other'}] ${c.name} - ${c.title} ${emailIcon}`, 'info');
                    });
                }

                discoveredLeads.push(lead);
                updateLeadsDisplay();

                addLog(`🎯 Lead ready for review: ${companyData.company.name}`, 'success');

            } catch (jobError) {
                addLog(`❌ Error processing job: ${jobError.message}`, 'error');
            }
        }

        addLog(`\n🏁 Pipeline complete! Found ${discoveredLeads.length} qualified leads.`, 'success');
        updateStep('send', 'complete');

    } catch (error) {
        addLog(`❌ Pipeline error: ${error.message}`, 'error');
    } finally {
        startBtn.disabled = false;
        startBtn.innerHTML = '🚀 Start LinkedIn Job Discovery';
    }
}

// Update Pipeline Step Status
function updateStep(step, status) {
    const stepEl = document.getElementById(`step-${step}`);
    const statusEl = document.getElementById(`step-${step}-status`);

    // Remove all status classes
    stepEl.classList.remove('running', 'complete', 'ready', 'error');

    // Add new status
    stepEl.classList.add(status);

    const statusLabels = {
        'waiting': 'Waiting',
        'running': '⏳ Running...',
        'complete': '✅ Done',
        'ready': '👀 Review',
        'error': '❌ Error'
    };

    statusEl.textContent = statusLabels[status] || status;
}

function resetPipelineSteps() {
    ['search', 'company', 'contact', 'email', 'send'].forEach(step => {
        updateStep(step, 'waiting');
    });
}

// Activity Log Functions
function addLog(message, type = 'info') {
    const log = document.getElementById('activityLog');
    const now = new Date();
    const time = now.toLocaleTimeString();

    const icons = {
        'info': 'ℹ️',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌'
    };

    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-icon">${icons[type]}</span>
        <span class="log-message">${message}</span>
    `;

    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function clearLogs() {
    const log = document.getElementById('activityLog');
    log.innerHTML = `
        <div class="log-entry log-info">
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-icon">ℹ️</span>
            <span class="log-message">Log cleared. Ready for LinkedIn job discovery with Apollo enrichment.</span>
        </div>
    `;
}

// Leads Display
function updateLeadsDisplay() {
    const container = document.getElementById('discoveredLeads');
    const countBadge = document.getElementById('leadsCount');

    countBadge.textContent = `${discoveredLeads.length} leads`;

    if (discoveredLeads.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎯</div>
                <div class="empty-state-title">No leads yet</div>
                <div class="empty-state-text">Start LinkedIn job discovery to find companies hiring and unlock decision-maker emails</div>
            </div>
        `;
        return;
    }

    container.innerHTML = discoveredLeads.map(lead => `
        <div class="lead-card highlight-card" data-lead-id="${lead.id}">
            <div class="lead-header">
                <div class="lead-company">
                    <h3>🏢 ${lead.company.name}</h3>
                    <span class="badge badge-primary">${lead.company.employees} employees</span>
                    ${lead.company.industry ? `<span class="badge badge-secondary">${lead.company.industry}</span>` : ''}
                    <span class="badge badge-success">📍 ${lead.job.platform}</span>
                </div>
                <div class="lead-status">
                    <span class="badge badge-warning">📬 Pending Review</span>
                </div>
            </div>

            <!-- Company Enriched Details - Enhanced with Financial & Tech -->
            <div class="lead-details" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #dee2e6;">
                <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; color: #495057; display: flex; align-items: center; gap: 0.5rem;">
                    🏢 Company Intelligence <span style="font-size: 0.7rem; color: #6c757d;">(Apollo Enriched)</span>
                </h4>
                
                <!-- Basic Info Row -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; font-size: 0.85rem;">
                    ${lead.company.city || lead.company.state ? `
                    <div class="detail-item" style="background: white; padding: 0.5rem 0.75rem; border-radius: 4px;">
                        <span style="color: #6c757d; font-size: 0.75rem;">📍 Location</span>
                        <div style="font-weight: 500;">${[lead.company.city, lead.company.state, lead.company.country].filter(Boolean).join(', ')}</div>
                    </div>
                    ` : ''}
                    ${lead.company.founded_year ? `
                    <div class="detail-item" style="background: white; padding: 0.5rem 0.75rem; border-radius: 4px;">
                        <span style="color: #6c757d; font-size: 0.75rem;">📅 Founded</span>
                        <div style="font-weight: 500;">${lead.company.founded_year}</div>
                    </div>
                    ` : ''}
                    <div class="detail-item" style="background: white; padding: 0.5rem 0.75rem; border-radius: 4px;">
                        <span style="color: #6c757d; font-size: 0.75rem;">🌐 Domain</span>
                        <div style="font-weight: 500;"><a href="https://${lead.job.domain || lead.company.domain}" target="_blank">${lead.job.domain || lead.company.domain || 'N/A'}</a></div>
                    </div>
                    ${lead.company.phone ? `
                    <div class="detail-item" style="background: white; padding: 0.5rem 0.75rem; border-radius: 4px;">
                        <span style="color: #6c757d; font-size: 0.75rem;">📞 Phone</span>
                        <div style="font-weight: 500;">${lead.company.phone}</div>
                    </div>
                    ` : ''}
                </div>
                
                <!-- Financial Info Row -->
                ${lead.company.annual_revenue || lead.company.total_funding ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; font-size: 0.85rem; margin-top: 0.75rem;">
                    ${lead.company.annual_revenue ? `
                    <div class="detail-item" style="background: #d4edda; padding: 0.5rem 0.75rem; border-radius: 4px; border-left: 3px solid #28a745;">
                        <span style="color: #155724; font-size: 0.75rem;">💰 Annual Revenue</span>
                        <div style="font-weight: 600; color: #155724;">${lead.company.annual_revenue}</div>
                    </div>
                    ` : ''}
                    ${lead.company.total_funding ? `
                    <div class="detail-item" style="background: #cce5ff; padding: 0.5rem 0.75rem; border-radius: 4px; border-left: 3px solid #007bff;">
                        <span style="color: #004085; font-size: 0.75rem;">🚀 Total Funding</span>
                        <div style="font-weight: 600; color: #004085;">${lead.company.total_funding}</div>
                    </div>
                    ` : ''}
                    ${lead.company.latest_funding_round ? `
                    <div class="detail-item" style="background: #fff3cd; padding: 0.5rem 0.75rem; border-radius: 4px; border-left: 3px solid #ffc107;">
                        <span style="color: #856404; font-size: 0.75rem;">📈 Latest Round</span>
                        <div style="font-weight: 600; color: #856404;">${lead.company.latest_funding_round}${lead.company.latest_funding_date ? ` (${lead.company.latest_funding_date})` : ''}</div>
                    </div>
                    ` : ''}
                    ${lead.company.publicly_traded ? `
                    <div class="detail-item" style="background: #e2e3e5; padding: 0.5rem 0.75rem; border-radius: 4px; border-left: 3px solid #6c757d;">
                        <span style="color: #383d41; font-size: 0.75rem;">📊 Stock Symbol</span>
                        <div style="font-weight: 600; color: #383d41;">${lead.company.publicly_traded}</div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                
                <!-- Tech Stack -->
                ${lead.company.technologies && lead.company.technologies.length > 0 ? `
                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #dee2e6;">
                    <span style="font-weight: 600; color: #495057; font-size: 0.8rem;">🔧 Tech Stack:</span>
                    <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
                        ${lead.company.technologies.slice(0, 10).map(tech => `<span style="background: #6f42c1; color: white; padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.75rem;">${tech}</span>`).join('')}
                        ${lead.company.technologies.length > 10 ? `<span style="color: #6c757d; font-size: 0.75rem;">+${lead.company.technologies.length - 10} more</span>` : ''}
                    </div>
                </div>
                ` : ''}
                
                <!-- Keywords/Specializations -->
                ${lead.company.keywords && lead.company.keywords.length > 0 ? `
                <div style="margin-top: 0.5rem;">
                    <span style="font-weight: 600; color: #495057; font-size: 0.8rem;">🏷️ Keywords:</span>
                    <div style="margin-top: 0.35rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
                        ${lead.company.keywords.slice(0, 8).map(kw => `<span style="background: #20c997; color: white; padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.75rem;">${kw}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
                
                <!-- Social Links -->
                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #dee2e6; display: flex; flex-wrap: wrap; gap: 0.75rem;">
                    ${lead.company.linkedin ? `<a href="${lead.company.linkedin}" target="_blank" style="font-size: 0.85rem; text-decoration: none;">🔗 LinkedIn</a>` : ''}
                    ${lead.company.twitter ? `<a href="${lead.company.twitter}" target="_blank" style="font-size: 0.85rem; text-decoration: none;">🐦 Twitter</a>` : ''}
                    ${lead.company.facebook ? `<a href="${lead.company.facebook}" target="_blank" style="font-size: 0.85rem; text-decoration: none;">📘 Facebook</a>` : ''}
                    ${lead.company.crunchbase ? `<a href="${lead.company.crunchbase}" target="_blank" style="font-size: 0.85rem; text-decoration: none;">📊 Crunchbase</a>` : ''}
                    ${lead.company.website_url ? `<a href="${lead.company.website_url}" target="_blank" style="font-size: 0.85rem; text-decoration: none;">🌐 Website</a>` : ''}
                </div>
                
                ${lead.company.description ? `
                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #dee2e6;">
                    <span style="font-weight: 600; color: #495057; font-size: 0.8rem;">📝 About:</span>
                    <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: #555; line-height: 1.4;">${lead.company.description}</p>
                </div>
                ` : ''}
            </div>

            <!-- Job Opening -->
            <div class="lead-details" style="margin-bottom: 1rem;">
                <div class="detail-row">
                    <span class="detail-label">📋 Job Opening:</span>
                    <span class="detail-value"><strong>${lead.job.title}</strong></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">🔗 Job URL:</span>
                    <span class="detail-value"><a href="${lead.job.link}" target="_blank">View on ${lead.job.platform}</a></span>
                </div>
            </div>
            
            <!-- All Contacts Section -->
            <div class="lead-details" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 1rem; border-radius: 8px; border: 1px solid #90caf9;">
                <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; color: #1565c0; display: flex; align-items: center; justify-content: space-between;">
                    <span>👥 Decision Makers (${lead.all_contacts ? lead.all_contacts.length : 1} found)</span>
                    ${lead.all_contacts && lead.all_contacts.length > 1 ? `
                    <button onclick="revealAllEmails('${lead.id}')" class="btn btn-sm" style="background: #1976d2; color: white; font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                        🔐 Reveal All Emails
                    </button>
                    ` : ''}
                </h4>
                
                <!-- Primary Contact (highlighted) -->
                <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; border: 2px solid #1976d2;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span style="background: #1976d2; color: white; padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.7rem;">PRIMARY</span>
                        ${lead.contact.role_category ? `<span style="background: #ff9800; color: white; padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.7rem;">${lead.contact.role_category}</span>` : ''}
                    </div>
                    <div style="font-weight: 600; font-size: 1rem;">${lead.contact.name}</div>
                    <div style="color: #666; font-size: 0.85rem;">${lead.contact.title}</div>
                    ${lead.contact.city || lead.contact.state ? `<div style="color: #888; font-size: 0.8rem;">📍 ${[lead.contact.city, lead.contact.state].filter(Boolean).join(', ')}</div>` : ''}
                    <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
                        ${lead.contact.email ? `
                            <span style="background: #4caf50; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight: 500;">📧 ${lead.contact.email}</span>
                            ${lead.contact.email_status ? `<span style="font-size: 0.75rem; color: #666;">(${lead.contact.email_status})</span>` : ''}
                        ` : `
                            <span style="background: #f44336; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">❌ Email unavailable in Apollo</span>
                            ${lead.contact.email_status ? `<span style="font-size: 0.75rem; color: #888;" title="${lead.contact.email_status_explanation || ''}">(${lead.contact.email_status})</span>` : ''}
                        `}
                        ${lead.contact.linkedin ? `<a href="${lead.contact.linkedin}" target="_blank" style="font-size: 0.85rem;">🔗 LinkedIn</a>` : ''}
                    </div>
                    
                    <!-- Guessed Work Emails (when Apollo doesn't have email) -->
                    ${!lead.contact.email && lead.contact.guessed_emails && lead.contact.guessed_emails.length > 0 ? `
                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed #ccc;">
                        <div style="font-size: 0.8rem; color: #ff9800; font-weight: 600; margin-bottom: 0.5rem;">
                            💡 Suggested Work Email Patterns (unverified):
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                            ${lead.contact.guessed_emails.slice(0, 4).map(email => `
                                <span onclick="copyToClipboard('${email}')" style="background: #fff3e0; color: #e65100; padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.8rem; cursor: pointer; border: 1px solid #ffcc80;" title="Click to copy">
                                    ${email}
                                </span>
                            `).join('')}
                        </div>
                        <div style="font-size: 0.7rem; color: #999; margin-top: 0.35rem;">
                            ⚠️ These are pattern-based guesses. Verify before sending.
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <!-- Other Contacts -->
                ${lead.all_contacts && lead.all_contacts.length > 1 ? `
                <div style="margin-top: 0.75rem;">
                    <div style="font-size: 0.85rem; color: #1565c0; font-weight: 600; margin-bottom: 0.5rem;">Other Decision Makers:</div>
                    <div style="display: grid; gap: 0.5rem;">
                        ${lead.all_contacts.slice(1).map((c, idx) => `
                        <div style="background: white; padding: 0.6rem 0.75rem; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;" id="contact-row-${c.id}">
                            <div style="flex: 1;">
                                ${c.role_category ? `<span style="background: #607d8b; color: white; padding: 0.1rem 0.3rem; border-radius: 2px; font-size: 0.65rem; margin-right: 0.5rem;">${c.role_category}</span>` : ''}
                                <span style="font-weight: 500;">${c.name}</span>
                                <span style="color: #666; font-size: 0.85rem;"> - ${c.title}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                ${c.email ? `
                                    <span style="background: #4caf50; color: white; padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.8rem;">📧 ${c.email}</span>
                                ` : `
                                    <button onclick="revealEmail('${c.id}', this)" class="btn btn-sm" style="background: #ff9800; color: white; font-size: 0.75rem; padding: 0.2rem 0.4rem;">
                                        🔐 Reveal
                                    </button>
                                `}
                                ${c.linkedin ? `<a href="${c.linkedin}" target="_blank" style="font-size: 0.8rem;">🔗</a>` : ''}
                            </div>
                        </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>

            <div class="lead-actions">
                <button class="btn btn-primary btn-lg" onclick="previewEmail(${lead.id})">
                    👁️ Preview & Send Email
                </button>
                <button class="btn btn-secondary" onclick="skipLead(${lead.id})">
                    ⏭ Skip This Lead
                </button>
            </div>
        </div>
    `).join('');
}

// Reveal email for a single contact
async function revealEmail(personId, buttonEl) {
    buttonEl.disabled = true;
    buttonEl.innerHTML = '⏳...';
    
    try {
        const response = await fetch(`${API_BASE}/pipeline/reveal-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ person_id: personId })
        });
        
        const data = await response.json();
        
        if (data.success && data.email) {
            // Replace button with email
            buttonEl.outerHTML = `<span style="background: #4caf50; color: white; padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.8rem;">📧 ${data.email}</span>`;
            addLog(`✅ Email revealed: ${data.email}`, 'success');
        } else {
            buttonEl.innerHTML = '❌ Failed';
            buttonEl.disabled = false;
            addLog(`⚠️ Could not reveal email: ${data.message || 'Unknown error'}`, 'warning');
        }
    } catch (error) {
        buttonEl.innerHTML = '❌ Error';
        buttonEl.disabled = false;
        addLog(`❌ Error revealing email: ${error.message}`, 'error');
    }
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        addLog(`📋 Copied to clipboard: ${text}`, 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        addLog(`📋 Copied to clipboard: ${text}`, 'success');
    });
}

// Reveal all emails for a lead
async function revealAllEmails(leadId) {
    const lead = discoveredLeads.find(l => l.id === leadId);
    if (!lead || !lead.all_contacts) return;
    
    const contactsToReveal = lead.all_contacts.filter(c => !c.email && c.id);
    
    if (contactsToReveal.length === 0) {
        addLog('ℹ️ All emails already revealed', 'info');
        return;
    }
    
    addLog(`🔐 Revealing ${contactsToReveal.length} emails...`, 'info');
    
    for (const contact of contactsToReveal) {
        const button = document.querySelector(`#contact-row-${contact.id} button`);
        if (button) {
            await revealEmail(contact.id, button);
        }
    }
    
    addLog(`✅ Bulk email reveal complete`, 'success');
}

// Load Recent Leads
async function loadRecentLeads() {
    try {
        const response = await fetch(`${API_BASE}/leads?status=ready&limit=10`);
        const leads = await response.json();

        if (leads.length > 0) {
            addLog(`📂 Loaded ${leads.length} pending leads from previous sessions`, 'info');
        }
    } catch (error) {
        console.error('Error loading leads:', error);
    }
}

// Preview Email Modal
function previewEmail(leadId) {
    const lead = discoveredLeads.find(l => l.id === leadId);
    if (!lead) return;

    currentLeadId = leadId;

    const emailDisplay = lead.contact.email || '❌ Email not unlocked';
    const emailColor = lead.contact.email ? 'green' : 'red';

    document.getElementById('previewTo').innerHTML = `<span style="color: ${emailColor}; font-weight: 600;">${emailDisplay}</span>`;
    document.getElementById('previewContact').textContent = `${lead.contact.name} (${lead.contact.title})`;

    // Show more company details
    const companyInfo = `${lead.company.name} - ${lead.job.title}`;
    const locationInfo = [lead.company.city, lead.company.state].filter(Boolean).join(', ');
    document.getElementById('previewCompany').textContent = locationInfo ? `${companyInfo} (${locationInfo})` : companyInfo;

    document.getElementById('previewSubject').value = lead.email.subject;
    document.getElementById('previewBody').value = lead.email.body;

    openModal('emailPreviewModal');
}

// Send Email
async function sendEmail() {
    if (!currentLeadId) return;

    const lead = discoveredLeads.find(l => l.id === currentLeadId);
    if (!lead) return;

    const subject = document.getElementById('previewSubject').value;
    const body = document.getElementById('previewBody').value;

    const sendBtn = document.querySelector('#emailPreviewModal .btn-success');
    const originalText = sendBtn.innerHTML;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="loading"></span> Sending...';

    try {
        const response = await fetch(`${API_BASE}/leads/${currentLeadId}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, body })
        });

        const result = await response.json();

        if (result.success) {
            addLog(`📤 Email sent to ${lead.contact.name} at ${lead.company.name}!`, 'success');

            // Update lead status in UI
            const leadCard = document.querySelector(`[data-lead-id="${currentLeadId}"]`);
            if (leadCard) {
                leadCard.classList.remove('highlight-card');
                leadCard.querySelector('.lead-status').innerHTML =
                    '<span class="badge badge-success">✅ Email Sent</span>';
                leadCard.querySelector('.lead-actions').innerHTML =
                    '<span class="sent-label">✅ Email Sent Successfully - ' + new Date().toLocaleTimeString() + '</span>';
            }

            closeModal();

            // Show success message
            showSuccessMessage(`Email sent successfully to ${lead.contact.name}!`);
        } else {
            addLog(`❌ Failed to send email: ${result.message}`, 'error');
            alert('Failed to send email: ' + result.message);
        }
    } catch (error) {
        addLog(`❌ Error: ${error.message}`, 'error');
        alert('Error sending email: ' + error.message);
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalText;
    }
}

function showSuccessMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '10000';
    alertDiv.innerHTML = `<span>✅</span><span>${message}</span>`;

    document.body.appendChild(alertDiv);

    setTimeout(() => alertDiv.remove(), 5000);
}

async function sendLeadEmail(leadId) {
    previewEmail(leadId);
}

async function skipEmail() {
    if (!currentLeadId) return;

    try {
        await fetch(`${API_BASE}/leads/${currentLeadId}/skip`, { method: 'POST' });

        const lead = discoveredLeads.find(l => l.id === currentLeadId);
        addLog(`⏭ Skipped lead: ${lead?.company?.name}`, 'info');

        // Update UI
        const leadCard = document.querySelector(`[data-lead-id="${currentLeadId}"]`);
        if (leadCard) {
            leadCard.classList.remove('highlight-card');
            leadCard.querySelector('.lead-status').innerHTML =
                '<span class="badge badge-secondary">⏭ Skipped</span>';
            leadCard.querySelector('.lead-actions').innerHTML =
                '<span class="skipped-label">⏭ Skipped</span>';
        }

        closeModal();
    } catch (error) {
        addLog(`❌ Error: ${error.message}`, 'error');
    }
}

async function skipLead(leadId) {
    currentLeadId = leadId;
    await skipEmail();
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    currentLeadId = null;
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});
