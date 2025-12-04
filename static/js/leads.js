// Leads.js - All leads management
const API_BASE = '/api';

let allLeads = [];
let currentLead = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadAllLeads();
});

// Load All Leads
async function loadAllLeads() {
    try {
        const response = await fetch(`${API_BASE}/leads`);
        allLeads = await response.json();
        
        updateStats();
        filterLeads();
    } catch (error) {
        console.error('Error loading leads:', error);
        showAlert('Error loading leads', 'error');
    }
}

// Update Statistics
function updateStats() {
    const total = allLeads.length;
    const pending = allLeads.filter(l => l.status === 'ready' || l.status === 'new').length;
    const sent = allLeads.filter(l => l.email_sent).length;
    const replied = allLeads.filter(l => l.status === 'replied').length;
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statSent').textContent = sent;
    document.getElementById('statRate').textContent = sent > 0 ? `${Math.round((replied / sent) * 100)}%` : '0%';
}

// Filter Leads
function filterLeads() {
    const statusFilter = document.getElementById('filterStatus').value;
    const searchFilter = document.getElementById('filterSearch').value.toLowerCase();
    const dateFilter = document.getElementById('filterDate').value;
    
    let filtered = [...allLeads];
    
    // Status filter
    if (statusFilter) {
        filtered = filtered.filter(l => l.status === statusFilter);
    }
    
    // Search filter
    if (searchFilter) {
        filtered = filtered.filter(l => 
            (l.company_name && l.company_name.toLowerCase().includes(searchFilter)) ||
            (l.contact_name && l.contact_name.toLowerCase().includes(searchFilter)) ||
            (l.job_title && l.job_title.toLowerCase().includes(searchFilter))
        );
    }
    
    // Date filter
    if (dateFilter) {
        const now = new Date();
        filtered = filtered.filter(l => {
            const created = new Date(l.created_at);
            if (dateFilter === 'today') {
                return created.toDateString() === now.toDateString();
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                return created >= weekAgo;
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
                return created >= monthAgo;
            }
            return true;
        });
    }
    
    renderLeadsTable(filtered);
    document.getElementById('displayCount').textContent = `${filtered.length} leads`;
}

// Render Leads Table
function renderLeadsTable(leads) {
    const tbody = document.getElementById('leadsTableBody');
    
    if (leads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-cell">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <div class="empty-state-title">No leads found</div>
                        <div class="empty-state-text">Adjust your filters or run the pipeline to discover new leads</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = leads.map(lead => `
        <tr class="lead-row ${lead.email_sent ? 'sent' : ''}">
            <td>
                <div class="company-cell">
                    <strong>${lead.company_name || '-'}</strong>
                    <small>${lead.company_size || '-'} employees</small>
                </div>
            </td>
            <td>
                <div class="job-cell">
                    ${lead.job_title || '-'}
                    ${lead.job_url ? `<a href="${lead.job_url}" target="_blank" class="external-link">🔗</a>` : ''}
                </div>
            </td>
            <td>
                <div class="contact-cell">
                    <strong>${lead.contact_name || '-'}</strong>
                    <small>${lead.contact_title || '-'}</small>
                </div>
            </td>
            <td>
                <div class="email-cell">
                    ${lead.contact_email || '<span class="no-email">No email</span>'}
                </div>
            </td>
            <td>${lead.company_size || '-'}</td>
            <td>
                <span class="badge badge-${getStatusColor(lead.status)}">
                    ${getStatusIcon(lead.status)} ${lead.status}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewLead(${lead.id})" title="View Details">
                        👁️
                    </button>
                    ${!lead.email_sent && lead.contact_email ? `
                        <button class="btn btn-sm btn-success" onclick="quickSend(${lead.id})" title="Send Email">
                            📤
                        </button>
                    ` : ''}
                    ${lead.email_sent ? `
                        <span class="sent-indicator" title="Email Sent">✅</span>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function getStatusColor(status) {
    const colors = {
        'new': 'primary',
        'ready': 'warning',
        'contacted': 'success',
        'replied': 'info',
        'skipped': 'secondary',
        'failed': 'danger'
    };
    return colors[status] || 'secondary';
}

function getStatusIcon(status) {
    const icons = {
        'new': '🆕',
        'ready': '✅',
        'contacted': '📤',
        'replied': '💬',
        'skipped': '⏭',
        'failed': '❌'
    };
    return icons[status] || '•';
}

// View Lead Details
async function viewLead(leadId) {
    try {
        const response = await fetch(`${API_BASE}/leads/${leadId}`);
        currentLead = await response.json();
        
        const content = document.getElementById('leadDetailContent');
        content.innerHTML = `
            <div class="lead-detail-grid">
                <div class="detail-section">
                    <h3>🏢 Company Information</h3>
                    <div class="detail-list">
                        <div class="detail-item">
                            <label>Company Name</label>
                            <span>${currentLead.company_name || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Company Size</label>
                            <span>${currentLead.company_size || '-'} employees</span>
                        </div>
                        <div class="detail-item">
                            <label>Job Opening</label>
                            <span>${currentLead.job_title || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Job URL</label>
                            <span>
                                ${currentLead.job_url ? 
                                    `<a href="${currentLead.job_url}" target="_blank">${currentLead.job_url.substring(0, 50)}...</a>` : 
                                    '-'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>👔 Contact Information</h3>
                    <div class="detail-list">
                        <div class="detail-item">
                            <label>Name</label>
                            <span>${currentLead.contact_name || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Title</label>
                            <span>${currentLead.contact_title || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Email</label>
                            <span class="email-highlight">${currentLead.contact_email || 'Not revealed yet'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section full-width">
                    <h3>✉️ Generated Email</h3>
                    <div class="email-preview-box">
                        <div class="preview-subject">
                            <strong>Subject:</strong> ${currentLead.email_subject || '-'}
                        </div>
                        <div class="preview-body">
                            ${currentLead.email_body ? currentLead.email_body.replace(/\n/g, '<br>') : 'No email generated yet'}
                        </div>
                    </div>
                </div>
                
                <div class="detail-section full-width">
                    <h3>📊 Status & History</h3>
                    <div class="status-info">
                        <span class="badge badge-${getStatusColor(currentLead.status)} badge-lg">
                            ${getStatusIcon(currentLead.status)} ${currentLead.status}
                        </span>
                        <span class="date-info">Created: ${new Date(currentLead.created_at).toLocaleString()}</span>
                        ${currentLead.email_sent ? 
                            `<span class="date-info">Sent: ${new Date(currentLead.email_sent_at).toLocaleString()}</span>` : 
                            ''}
                    </div>
                </div>
            </div>
        `;
        
        // Update buttons based on status
        document.getElementById('sendEmailBtn').style.display = 
            (!currentLead.email_sent && currentLead.contact_email) ? 'inline-flex' : 'none';
        document.getElementById('editEmailBtn').style.display = 
            (!currentLead.email_sent) ? 'inline-flex' : 'none';
        
        openModal('leadDetailModal');
    } catch (error) {
        console.error('Error loading lead:', error);
        showAlert('Error loading lead details', 'error');
    }
}

// Quick Send Email
async function quickSend(leadId) {
    await viewLead(leadId);
}

// Send Lead Email
async function sendLeadEmail() {
    if (!currentLead) return;
    
    if (!currentLead.contact_email) {
        showAlert('No email address available for this contact', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/leads/${currentLead.id}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`Email sent to ${currentLead.contact_name}!`, 'success');
            closeModal();
            loadAllLeads(); // Refresh
        } else {
            showAlert(result.message || 'Failed to send email', 'error');
        }
    } catch (error) {
        showAlert('Error sending email', 'error');
    }
}

// Edit Email
function editEmail() {
    if (!currentLead) return;
    
    // Redirect to email queue with edit
    window.location.href = `/emails?edit=${currentLead.id}`;
}

// Export Leads to CSV
function exportLeads() {
    const headers = ['Company', 'Job Title', 'Contact Name', 'Contact Title', 'Email', 'Status', 'Created'];
    const rows = allLeads.map(lead => [
        lead.company_name,
        lead.job_title,
        lead.contact_name,
        lead.contact_title,
        lead.contact_email,
        lead.status,
        lead.created_at
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell || ''}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    currentLead = null;
}

// Alert Function
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${type === 'success' ? '✓' : '⚠'}</span>
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
