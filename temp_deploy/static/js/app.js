// API Base URL
const API_BASE = '/api';

// Utility Functions
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

function showLoading(button) {
    button.disabled = true;
    button.innerHTML = '<span class="loading"></span> Processing...';
}

function hideLoading(button, originalText) {
    button.disabled = false;
    button.innerHTML = originalText;
}

// Settings Functions
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        const settings = await response.json();

        // Populate form fields
        for (const [key, value] of Object.entries(settings)) {
            const input = document.getElementById(key);
            if (input) {
                input.value = value || '';
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings(formData) {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Settings saved successfully!', 'success');
        } else {
            showAlert(result.message || 'Failed to save settings', 'error');
        }
    } catch (error) {
        showAlert('Error saving settings: ' + error.message, 'error');
    }
}

async function testEmailConfig() {
    const button = event.target;
    const originalText = button.innerHTML;
    showLoading(button);

    try {
        const response = await fetch(`${API_BASE}/settings/test-email`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.valid) {
            showAlert('Email configuration is valid!', 'success');
        } else {
            showAlert(result.message || 'Email configuration failed', 'error');
        }
    } catch (error) {
        showAlert('Error testing email: ' + error.message, 'error');
    } finally {
        hideLoading(button, originalText);
    }
}

// Campaign Functions
async function loadCampaigns() {
    try {
        const response = await fetch(`${API_BASE}/campaigns`);
        const campaigns = await response.json();

        const tbody = document.getElementById('campaignsTableBody');
        if (!tbody) return;

        if (campaigns.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <div class="empty-state-title">No campaigns yet</div>
                        <div class="empty-state-text">Create your first campaign to get started</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = campaigns.map(campaign => `
            <tr>
                <td><strong>${campaign.name}</strong></td>
                <td>${campaign.search_keywords}</td>
                <td>${campaign.jobs_per_run}</td>
                <td>
                    <span class="badge badge-${getStatusColor(campaign.status)}">
                        ${campaign.status}
                    </span>
                </td>
                <td>${campaign.schedule_enabled ? campaign.schedule_frequency : 'Manual'}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="runCampaign(${campaign.id})">
                        ▶ Run
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="editCampaign(${campaign.id})">
                        ✏ Edit
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading campaigns:', error);
    }
}

function getStatusColor(status) {
    const colors = {
        'active': 'success',
        'paused': 'warning',
        'draft': 'secondary',
        'completed': 'primary'
    };
    return colors[status] || 'secondary';
}

async function createCampaign(formData) {
    try {
        const response = await fetch(`${API_BASE}/campaigns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Campaign created successfully!', 'success');
            closeModal();
            loadCampaigns();
        } else {
            showAlert(result.message || 'Failed to create campaign', 'error');
        }
    } catch (error) {
        showAlert('Error creating campaign: ' + error.message, 'error');
    }
}

async function runCampaign(campaignId) {
    if (!confirm('Are you sure you want to run this campaign? This will search for jobs and send emails.')) {
        return;
    }

    showAlert('Campaign started. This may take a few minutes...', 'info');

    try {
        const response = await fetch(`${API_BASE}/campaigns/${campaignId}/run`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showAlert(result.message, 'success');
            loadCampaigns();
            loadLogs();
        } else {
            showAlert(result.message || 'Campaign failed', 'error');
        }
    } catch (error) {
        showAlert('Error running campaign: ' + error.message, 'error');
    }
}

// Template Functions
async function loadTemplates() {
    try {
        const response = await fetch(`${API_BASE}/templates`);
        const templates = await response.json();

        const select = document.getElementById('email_template_id');
        if (!select) return;

        select.innerHTML = '<option value="">Select a template</option>' +
            templates.map(t => `
                <option value="${t.id}">${t.name}${t.is_default ? ' (Default)' : ''}</option>
            `).join('');
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

// Logs Functions
async function loadLogs() {
    try {
        const response = await fetch(`${API_BASE}/logs?limit=20`);
        const logs = await response.json();

        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;

        if (logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="empty-state-text">No activity logs yet</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>${log.action.replace(/_/g, ' ')}</td>
                <td>${log.details || '-'}</td>
                <td>
                    <span class="badge badge-${log.status === 'success' ? 'success' : log.status === 'error' ? 'danger' : 'warning'}">
                        ${log.status}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load data based on current page
    const path = window.location.pathname;

    if (path.includes('dashboard') || path === '/') {
        loadCampaigns();
        loadLogs();
    }

    if (path.includes('settings')) {
        loadSettings();
    }

    // Add active class to current nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        }
    });
});
