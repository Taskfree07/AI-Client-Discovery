// Emails.js - Email queue management with manual send control
const API_BASE = '/api';

let pendingEmails = [];
let sentEmails = [];
let currentEmailLead = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadEmailQueue();
    loadSentEmails();
    
    // Check for edit parameter
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
        setTimeout(() => openEmailEditor(parseInt(editId)), 500);
    }
});

// Load Pending Emails
async function loadEmailQueue() {
    try {
        const response = await fetch(`${API_BASE}/leads?status=ready`);
        pendingEmails = await response.json();
        
        renderPendingEmails();
        updateStats();
    } catch (error) {
        console.error('Error loading email queue:', error);
    }
}

// Load Sent Emails
async function loadSentEmails() {
    try {
        const response = await fetch(`${API_BASE}/leads?sent=true`);
        sentEmails = await response.json();
        
        renderSentEmails();
    } catch (error) {
        console.error('Error loading sent emails:', error);
    }
}

// Update Stats
function updateStats() {
    document.getElementById('pendingCount').textContent = pendingEmails.length;
    document.getElementById('sendAllBtn').disabled = pendingEmails.length === 0;
    
    // Count sent today
    const today = new Date().toDateString();
    const sentToday = sentEmails.filter(e => 
        new Date(e.email_sent_at).toDateString() === today
    ).length;
    
    document.getElementById('sentToday').textContent = sentToday;
    document.getElementById('totalSent').textContent = sentEmails.length;
    
    // Count skipped
    fetch(`${API_BASE}/leads?status=skipped`)
        .then(r => r.json())
        .then(data => {
            document.getElementById('skippedCount').textContent = data.length;
        });
}

// Render Pending Emails
function renderPendingEmails() {
    const container = document.getElementById('pendingEmails');
    
    if (pendingEmails.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✉️</div>
                <div class="empty-state-title">No pending emails</div>
                <div class="empty-state-text">Run the discovery pipeline to generate emails</div>
                <a href="/pipeline" class="btn btn-primary">Go to Pipeline</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pendingEmails.map(lead => `
        <div class="email-card" data-lead-id="${lead.id}">
            <div class="email-card-header">
                <div class="email-recipient">
                    <div class="recipient-avatar">${(lead.contact_name || 'U')[0]}</div>
                    <div class="recipient-info">
                        <strong>${lead.contact_name || 'Unknown'}</strong>
                        <span>${lead.contact_title || ''}</span>
                        <span class="email-address">${lead.contact_email || 'No email'}</span>
                    </div>
                </div>
                <div class="email-company">
                    <span class="company-name">🏢 ${lead.company_name || 'Unknown Company'}</span>
                    <span class="company-size">${lead.company_size || '-'} employees</span>
                </div>
            </div>
            
            <div class="email-card-subject">
                <strong>Subject:</strong> ${lead.email_subject || 'No subject'}
            </div>
            
            <div class="email-card-preview">
                ${(lead.email_body || 'No email body').substring(0, 200)}...
            </div>
            
            <div class="email-card-meta">
                <span class="meta-item">📋 Job: ${lead.job_title || '-'}</span>
                <span class="meta-item">📅 ${new Date(lead.created_at).toLocaleDateString()}</span>
            </div>
            
            <div class="email-card-actions">
                <button class="btn btn-primary" onclick="openEmailEditor(${lead.id})">
                    ✏️ Edit & Review
                </button>
                <button class="btn btn-success" onclick="quickSendEmail(${lead.id})">
                    📤 Send Now
                </button>
                <button class="btn btn-secondary" onclick="skipEmailLead(${lead.id})">
                    ⏭ Skip
                </button>
            </div>
        </div>
    `).join('');
}

// Render Sent Emails Table
function renderSentEmails() {
    const tbody = document.getElementById('sentEmailsBody');
    
    if (sentEmails.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell">
                    No emails sent yet
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = sentEmails.map(email => `
        <tr>
            <td>${new Date(email.email_sent_at).toLocaleString()}</td>
            <td>${email.contact_email || '-'}</td>
            <td>${email.company_name || '-'}</td>
            <td class="subject-cell">${email.email_subject || '-'}</td>
            <td>
                <span class="badge badge-success">✅ Delivered</span>
            </td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewSentEmail(${email.id})">
                    👁️ View
                </button>
            </td>
        </tr>
    `).join('');
}

// Open Email Editor Modal
async function openEmailEditor(leadId) {
    try {
        const response = await fetch(`${API_BASE}/leads/${leadId}`);
        currentEmailLead = await response.json();
        
        document.getElementById('editCompany').textContent = currentEmailLead.company_name || '-';
        document.getElementById('editContact').textContent = currentEmailLead.contact_name || '-';
        document.getElementById('editTitle').textContent = currentEmailLead.contact_title || '-';
        document.getElementById('editJob').textContent = currentEmailLead.job_title || '-';
        document.getElementById('editToEmail').value = currentEmailLead.contact_email || '';
        document.getElementById('editSubject').value = currentEmailLead.email_subject || '';
        document.getElementById('editBody').value = currentEmailLead.email_body || '';
        
        openModal('emailEditModal');
    } catch (error) {
        console.error('Error loading email:', error);
        showAlert('Error loading email details', 'error');
    }
}

// Quick Send Email (without editing)
async function quickSendEmail(leadId) {
    const lead = pendingEmails.find(l => l.id === leadId);
    if (!lead) return;
    
    if (!lead.contact_email) {
        showAlert('No email address for this contact', 'error');
        return;
    }
    
    if (!confirm(`Send email to ${lead.contact_name} at ${lead.company_name}?`)) {
        return;
    }
    
    await sendEmailRequest(leadId, lead.email_subject, lead.email_body);
}

// Send This Email (from modal)
async function sendThisEmail() {
    if (!currentEmailLead) return;
    
    const subject = document.getElementById('editSubject').value;
    const body = document.getElementById('editBody').value;
    
    if (!subject || !body) {
        showAlert('Please fill in subject and body', 'error');
        return;
    }
    
    await sendEmailRequest(currentEmailLead.id, subject, body);
    closeModal();
}

// Send Email Request
async function sendEmailRequest(leadId, subject, body) {
    try {
        const response = await fetch(`${API_BASE}/leads/${leadId}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, body })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('✅ Email sent successfully!', 'success');
            loadEmailQueue();
            loadSentEmails();
        } else {
            showAlert(result.message || 'Failed to send email', 'error');
        }
    } catch (error) {
        showAlert('Error sending email', 'error');
    }
}

// Skip Email
async function skipEmailLead(leadId) {
    try {
        await fetch(`${API_BASE}/leads/${leadId}/skip`, { method: 'POST' });
        showAlert('Lead skipped', 'info');
        loadEmailQueue();
    } catch (error) {
        showAlert('Error skipping lead', 'error');
    }
}

// Skip from modal
async function skipThisEmail() {
    if (!currentEmailLead) return;
    await skipEmailLead(currentEmailLead.id);
    closeModal();
}

// Save Email Draft
async function saveEmailDraft() {
    if (!currentEmailLead) return;
    
    const subject = document.getElementById('editSubject').value;
    const body = document.getElementById('editBody').value;
    
    try {
        const response = await fetch(`${API_BASE}/leads/${currentEmailLead.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email_subject: subject, 
                email_body: body 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Draft saved!', 'success');
            loadEmailQueue();
        } else {
            showAlert('Failed to save draft', 'error');
        }
    } catch (error) {
        showAlert('Error saving draft', 'error');
    }
}

// View Sent Email
async function viewSentEmail(leadId) {
    try {
        const response = await fetch(`${API_BASE}/leads/${leadId}`);
        const email = await response.json();
        
        document.getElementById('viewEmailContent').innerHTML = `
            <div class="sent-email-detail">
                <div class="detail-header">
                    <div class="detail-row">
                        <strong>To:</strong> ${email.contact_email}
                    </div>
                    <div class="detail-row">
                        <strong>Contact:</strong> ${email.contact_name} (${email.contact_title})
                    </div>
                    <div class="detail-row">
                        <strong>Company:</strong> ${email.company_name}
                    </div>
                    <div class="detail-row">
                        <strong>Sent:</strong> ${new Date(email.email_sent_at).toLocaleString()}
                    </div>
                </div>
                <div class="email-content-box">
                    <div class="email-subject-line">
                        <strong>Subject:</strong> ${email.email_subject}
                    </div>
                    <div class="email-body-content">
                        ${email.email_body.replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>
        `;
        
        openModal('viewEmailModal');
    } catch (error) {
        showAlert('Error loading email', 'error');
    }
}

// Send All Pending Emails
async function sendAllPending() {
    if (pendingEmails.length === 0) return;
    
    if (!confirm(`Send ${pendingEmails.length} emails? This action cannot be undone.`)) {
        return;
    }
    
    let sent = 0;
    let failed = 0;
    
    for (const lead of pendingEmails) {
        if (!lead.contact_email) continue;
        
        try {
            const response = await fetch(`${API_BASE}/leads/${lead.id}/send`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                sent++;
            } else {
                failed++;
            }
        } catch (error) {
            failed++;
        }
    }
    
    showAlert(`Sent ${sent} emails. ${failed > 0 ? `${failed} failed.` : ''}`, 
        failed > 0 ? 'warning' : 'success');
    
    loadEmailQueue();
    loadSentEmails();
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    currentEmailLead = null;
}

// Alert Function
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${type === 'success' ? '✓' : type === 'info' ? 'ℹ' : '⚠'}</span>
        <span>${message}</span>
    `;
    
    const container = document.querySelector('.main-content');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => alertDiv.remove(), 5000);
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});
