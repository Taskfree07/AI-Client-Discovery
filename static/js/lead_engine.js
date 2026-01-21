/**
 * Lead Engine - Frontend JavaScript
 * Handles UI interactions and API calls for lead generation
 */

// State management
const state = {
    jobTitles: [],
    locations: [],
    industries: [],
    keywords: [],
    leads: [],
    isGenerating: false
};

// ===== SIDEBAR =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');

    sidebar.classList.toggle('collapsed');

    // Update body class for smooth transition
    document.body.classList.toggle('sidebar-collapsed');
}

function toggleNavGroup(element) {
    const navGroup = element.closest('.nav-group');
    if (navGroup) {
        navGroup.classList.toggle('expanded');
    }
}

// ===== ADVANCED OPTIONS =====
function toggleAdvanced() {
    const toggle = document.getElementById('advanced-toggle');
    const options = document.getElementById('advanced-options');

    toggle.classList.toggle('open');
    options.classList.toggle('show');
}

// ===== TAG MANAGEMENT =====
function addTag(containerId, value, stateArray) {
    if (!value.trim()) return;

    // Check for duplicates
    if (stateArray.includes(value.trim())) return;

    stateArray.push(value.trim());
    renderTags(containerId, stateArray);
}

function removeTag(containerId, index, stateArray) {
    stateArray.splice(index, 1);
    renderTags(containerId, stateArray);
}

function renderTags(containerId, tags) {
    const container = document.getElementById(containerId);
    container.innerHTML = tags.map((tag, index) => `
        <span class="tag">
            ${escapeHtml(tag)}
            <span class="tag-remove" onclick="removeTagByContainer('${containerId}', ${index})">x</span>
        </span>
    `).join('');
}

function removeTagByContainer(containerId, index) {
    let stateArray;
    switch(containerId) {
        case 'job-titles-tags': stateArray = state.jobTitles; break;
        case 'locations-tags': stateArray = state.locations; break;
        case 'industries-tags': stateArray = state.industries; break;
        case 'keywords-tags': stateArray = state.keywords; break;
    }
    if (stateArray) {
        removeTag(containerId, index, stateArray);
    }
}

// Keypress handlers
function handleJobTitleKeypress(event) {
    if (event.key === 'Enter') {
        const input = document.getElementById('job-title-input');
        addTag('job-titles-tags', input.value, state.jobTitles);
        input.value = '';
    }
}

function handleLocationKeypress(event) {
    if (event.key === 'Enter') {
        const input = document.getElementById('location-input');
        addTag('locations-tags', input.value, state.locations);
        input.value = '';
    }
}

function handleIndustryKeypress(event) {
    if (event.key === 'Enter') {
        const input = document.getElementById('industry-input');
        addTag('industries-tags', input.value, state.industries);
        input.value = '';
    }
}

function handleKeywordKeypress(event) {
    if (event.key === 'Enter') {
        const input = document.getElementById('keyword-input');
        addTag('keywords-tags', input.value, state.keywords);
        input.value = '';
    }
}

// ===== LEAD GENERATION =====
async function generateLeads() {
    // Validate
    if (state.jobTitles.length === 0) {
        alert('Please enter at least one job title');
        document.getElementById('job-title-input').focus();
        return;
    }

    // Get form values
    const sessionTitle = document.getElementById('session-title').value || 'Untitled Session';
    const numJobs = parseInt(document.getElementById('num-jobs').value) || 100;

    // Get company sizes
    const companySizes = [];
    if (document.getElementById('size-small').checked) companySizes.push('small');
    if (document.getElementById('size-mid').checked) companySizes.push('mid');
    if (document.getElementById('size-large').checked) companySizes.push('large');

    // Build request payload
    const payload = {
        session_title: sessionTitle,
        job_titles: state.jobTitles,
        num_jobs: numJobs,
        locations: state.locations.length > 0 ? state.locations : null,
        industries: state.industries.length > 0 ? state.industries : null,
        keywords: state.keywords.length > 0 ? state.keywords : null,
        company_sizes: companySizes.length > 0 ? companySizes : null
    };

    console.log('Generating leads with:', payload);

    // Show loading
    showLoading('Initializing Lead Engine...');
    state.isGenerating = true;
    state.leads = [];

    // Disable button
    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.textContent = 'Generating...';

    try {
        // Use EventSource for streaming progress
        const response = await fetch('/api/lead-engine/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Read streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete JSON messages
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        handleStreamData(data);
                    } catch (e) {
                        console.error('Error parsing stream data:', e, line);
                    }
                }
            }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
            try {
                const data = JSON.parse(buffer);
                handleStreamData(data);
            } catch (e) {
                console.error('Error parsing final buffer:', e);
            }
        }

    } catch (error) {
        console.error('Error generating leads:', error);
        alert('Error generating leads: ' + error.message);
    } finally {
        hideLoading();
        state.isGenerating = false;
        btn.disabled = false;
        btn.textContent = 'Generate Leads';
    }
}

function handleStreamData(data) {
    console.log('Stream data:', data);

    switch (data.type) {
        case 'status':
            updateLoading(data.message, data.progress || 0);
            break;

        case 'lead':
            // Add lead to state
            state.leads.push(data.data);
            // Add to table
            addLeadToTable(data.data);
            // Update progress
            updateLoading(`Found ${state.leads.length} leads...`, data.progress || 50);
            break;

        case 'complete':
            console.log('Generation complete:', data);
            showResults();
            break;

        case 'quota_exceeded':
            // Show quota exceeded error with link to settings
            hideLoading();
            showQuotaError(data.message);
            break;

        case 'error':
            alert('Error: ' + data.message);
            break;
    }
}

function showQuotaError(message) {
    // Create modal for quota error
    const modal = document.createElement('div');
    modal.className = 'quota-modal-overlay';
    modal.innerHTML = `
        <div class="quota-modal">
            <div class="quota-modal-icon">⚠️</div>
            <h3>Search Credits Exhausted</h3>
            <p>${escapeHtml(message)}</p>
            <p style="color: #666; font-size: 14px;">You can add a new Google API key in Settings to continue searching.</p>
            <div class="quota-modal-actions">
                <a href="/settings" class="btn btn-primary">Go to Settings</a>
                <button onclick="closeQuotaModal()" class="btn btn-secondary">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeQuotaModal() {
    const modal = document.querySelector('.quota-modal-overlay');
    if (modal) modal.remove();
}

function addLeadToTable(lead) {
    // Show results section if hidden
    document.getElementById('results-section').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';

    const tbody = document.getElementById('results-body');

    // Add a row for each POC
    for (const poc of lead.pocs) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="company-cell">
                <div class="company-name">${escapeHtml(lead.company.name)}</div>
                <div class="company-meta">${escapeHtml(lead.company.industry)} - ${formatEmployeeCount(lead.company.size)} employees</div>
            </td>
            <td>${escapeHtml(lead.job_opening)}</td>
            <td>
                <div class="poc-name">${escapeHtml(poc.name)}</div>
                <div class="poc-subtitle">${escapeHtml(poc.title)}</div>
            </td>
            <td>${escapeHtml(poc.title)}</td>
            <td>
                <a href="mailto:${escapeHtml(poc.email)}" class="email-link">${escapeHtml(poc.email)}</a>
            </td>
            <td>
                ${poc.linkedin_url ? `<a href="${escapeHtml(poc.linkedin_url)}" target="_blank" class="linkedin-link">linkedin.com/in/...</a>` : '-'}
            </td>
        `;
        tbody.appendChild(row);
    }
}

function showResults() {
    document.getElementById('results-section').style.display = 'block';

    if (state.leads.length === 0) {
        document.getElementById('empty-state').style.display = 'block';
        document.getElementById('results-body').innerHTML = '';
    } else {
        document.getElementById('empty-state').style.display = 'none';
    }
}

// ===== LOADING UI =====
function showLoading(message) {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    const progress = document.getElementById('loading-progress');

    overlay.classList.add('show');
    text.textContent = message;
    progress.style.width = '0%';
}

function updateLoading(message, percent) {
    const text = document.getElementById('loading-text');
    const progress = document.getElementById('loading-progress');

    text.textContent = message;
    progress.style.width = `${percent}%`;
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.remove('show');
}

// ===== ACTIONS =====
function saveToCRM() {
    alert('Save to CRM - Coming soon!');
}

function exportCSV() {
    if (state.leads.length === 0) {
        alert('No leads to export');
        return;
    }

    // Build CSV content
    const headers = ['Company', 'Industry', 'Size', 'Job Opening', 'POC Name', 'POC Title', 'Email', 'Phone', 'LinkedIn'];
    const rows = [];

    for (const lead of state.leads) {
        for (const poc of lead.pocs) {
            rows.push([
                lead.company.name,
                lead.company.industry,
                lead.company.size,
                lead.job_opening,
                poc.name,
                poc.title,
                poc.email,
                poc.phone,
                poc.linkedin_url
            ]);
        }
    }

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    const sessionTitle = document.getElementById('session-title').value || 'leads';
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.csv`;

    link.click();
}

function sendToCampaign() {
    if (state.leads.length === 0) {
        alert('No leads to send to campaign');
        return;
    }

    // Store leads in session storage for campaign page
    sessionStorage.setItem('campaign_leads', JSON.stringify(state.leads));

    // Navigate to campaign manager
    window.location.href = '/campaign-manager';
}

// ===== UTILITIES =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatEmployeeCount(count) {
    if (!count) return 'Unknown';
    if (count >= 1000) {
        return Math.round(count / 1000) + 'K';
    }
    return count.toLocaleString();
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Lead Engine initialized');

    // Set default session title
    const today = new Date();
    const defaultTitle = `Lead Search - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    document.getElementById('session-title').value = defaultTitle;

    // Clear results on page load
    document.getElementById('results-body').innerHTML = '';
});

// ===== PAST LEADS FUNCTIONALITY =====
let allPastLeads = [];

async function showPastLeads() {
    const modal = document.getElementById('past-leads-modal');
    modal.style.display = 'flex';
    
    // Load past leads
    await loadPastLeads();
}

function closePastLeads() {
    const modal = document.getElementById('past-leads-modal');
    modal.style.display = 'none';
}

async function loadPastLeads() {
    const tbody = document.getElementById('past-leads-body');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading past leads...</td></tr>';
    
    try {
        // Use the new combined endpoint that includes LinkedIn data
        const response = await fetch('/api/all-leads');
        allPastLeads = await response.json();
        
        updatePastLeadsStats();
        renderPastLeads(allPastLeads);
    } catch (error) {
        console.error('Error loading past leads:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Error loading leads</td></tr>';
    }
}

function updatePastLeadsStats() {
    const total = allPastLeads.length;
    const withEmail = allPastLeads.filter(l => l.contact_email && !l.contact_email.includes('email_not_unlocked') && l.contact_email !== 'None').length;
    const withLinkedIn = allPastLeads.filter(l => l.contact_linkedin).length;
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-with-email').textContent = withEmail;
    document.getElementById('stat-contacted').textContent = withLinkedIn;
}

function filterPastLeads() {
    const searchTerm = document.getElementById('past-leads-search').value.toLowerCase();
    const statusFilter = document.getElementById('past-leads-status').value;
    
    let filtered = [...allPastLeads];
    
    if (searchTerm) {
        filtered = filtered.filter(l => 
            (l.company_name && l.company_name.toLowerCase().includes(searchTerm)) ||
            (l.contact_name && l.contact_name.toLowerCase().includes(searchTerm)) ||
            (l.contact_email && l.contact_email.toLowerCase().includes(searchTerm)) ||
            (l.contact_title && l.contact_title.toLowerCase().includes(searchTerm))
        );
    }
    
    if (statusFilter) {
        if (statusFilter === 'with_linkedin') {
            filtered = filtered.filter(l => l.contact_linkedin);
        } else if (statusFilter === 'with_email') {
            filtered = filtered.filter(l => l.contact_email && !l.contact_email.includes('email_not_unlocked') && l.contact_email !== 'None');
        } else {
            filtered = filtered.filter(l => l.status === statusFilter);
        }
    }
    
    renderPastLeads(filtered);
}

function renderPastLeads(leads) {
    const tbody = document.getElementById('past-leads-body');
    
    if (leads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No leads found</td></tr>';
        return;
    }
    
    tbody.innerHTML = leads.slice(0, 500).map(lead => {
        const hasValidEmail = lead.contact_email && !lead.contact_email.includes('email_not_unlocked') && lead.contact_email !== 'None';
        const hasLinkedIn = lead.contact_linkedin && lead.contact_linkedin !== 'None';
        const statusClass = lead.status || 'ready';
        const createdDate = lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-';
        const tierBadge = lead.tier ? `<span class="tier-badge tier-${lead.tier.toLowerCase()}">${lead.tier}</span>` : '';
        
        return `
            <tr>
                <td>
                    <div class="company-name">${escapeHtml(lead.company_name || '-')}</div>
                    <div class="company-job">${escapeHtml(lead.company_industry || lead.job_title || '')} ${tierBadge}</div>
                </td>
                <td>
                    <div class="contact-name">${escapeHtml(lead.contact_name || '-')}</div>
                    <div class="contact-title">${escapeHtml(lead.contact_title || '')}</div>
                </td>
                <td>
                    ${hasValidEmail ? 
                        `<a href="mailto:${escapeHtml(lead.contact_email)}" class="email-link">${escapeHtml(lead.contact_email)}</a>` : 
                        `<span class="no-email">No email</span>`
                    }
                </td>
                <td>
                    ${hasLinkedIn ? 
                        `<a href="${escapeHtml(lead.contact_linkedin)}" target="_blank" class="linkedin-link">🔗 LinkedIn</a>` : 
                        `-`
                    }
                </td>
                <td>${createdDate}</td>
                <td>
                    ${hasValidEmail ? 
                        `<button class="action-btn-small" onclick="copyEmail('${escapeHtml(lead.contact_email)}')">📋</button>` :
                        hasLinkedIn ? `<button class="action-btn-small" onclick="window.open('${escapeHtml(lead.contact_linkedin)}', '_blank')">👤</button>` : '-'
                    }
                </td>
            </tr>
        `;
    }).join('');
    
    if (leads.length > 500) {
        tbody.innerHTML += `<tr><td colspan="6" class="loading-cell">Showing first 500 of ${leads.length} leads. Use filters to narrow down.</td></tr>`;
    }
}

function copyEmail(email) {
    navigator.clipboard.writeText(email).then(() => {
        alert('Email copied to clipboard!');
    });
}

async function revealAndSend(leadId) {
    // This would trigger the email send flow
    alert('Email send functionality - Navigate to emails page or implement inline');
    window.location.href = '/emails';
}

function exportPastLeadsCSV() {
    if (allPastLeads.length === 0) {
        alert('No leads to export');
        return;
    }
    
    const headers = ['Company', 'Industry', 'Size', 'Location', 'Contact Name', 'Contact Title', 'Email', 'Phone', 'LinkedIn', 'Tier', 'Status', 'Created'];
    const rows = allPastLeads.map(lead => [
        lead.company_name || '',
        lead.company_industry || '',
        lead.company_size || '',
        lead.company_location || '',
        lead.contact_name || '',
        lead.contact_title || '',
        lead.contact_email || '',
        lead.contact_phone || '',
        lead.contact_linkedin || '',
        lead.tier || '',
        lead.status || '',
        lead.created_at || ''
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `all_leads_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

// Close modal on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePastLeads();
    }
});

// Close modal on backdrop click
document.addEventListener('click', function(e) {
    if (e.target.id === 'past-leads-modal') {
        closePastLeads();
    }
});
// ===== PAGE LOADING =====
/**
 * Load a page dynamically without full page refresh
 * @param {string} url - The URL to load
 */
function loadPage(url) {
    const mainContent = document.getElementById('main-content');
    
    // Show loading indicator
    mainContent.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100%; flex-direction: column; gap: 20px;">
            <div style="width: 50px; height: 50px; border: 4px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="color: #6b7280; font-size: 16px;">Loading...</p>
        </div>
    `;
    
    // Add keyframe animation if not already present
    if (!document.getElementById('spin-animation')) {
        const style = document.createElement('style');
        style.id = 'spin-animation';
        style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }
    
    // Fetch the page content
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            // Parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract the main content from the loaded page
            const newMainContent = doc.getElementById('main-content');
            
            if (newMainContent) {
                // Replace the main content
                mainContent.innerHTML = newMainContent.innerHTML;
                
                // Update active nav item
                updateActiveNavItem(url);
                
                // Execute any scripts in the new content
                const scripts = mainContent.querySelectorAll('script');
                scripts.forEach(script => {
                    const newScript = document.createElement('script');
                    if (script.src) {
                        newScript.src = script.src;
                    } else {
                        newScript.textContent = script.textContent;
                    }
                    document.body.appendChild(newScript);
                });
                
                // Update browser history
                window.history.pushState({ url: url }, '', url);
            } else {
                // If no main-content found, display the whole body content
                const bodyContent = doc.body.innerHTML;
                mainContent.innerHTML = bodyContent;
                updateActiveNavItem(url);
                window.history.pushState({ url: url }, '', url);
            }
        })
        .catch(error => {
            console.error('Error loading page:', error);
            mainContent.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100%; flex-direction: column; gap: 20px; padding: 40px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <h2 style="color: #1f2937; margin: 0;">Failed to load page</h2>
                    <p style="color: #6b7280; margin: 0;">Please try again or contact support if the problem persists.</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        Reload Page
                    </button>
                </div>
            `;
        });
}

/**
 * Update the active navigation item based on current URL
 * @param {string} url - The current URL
 */
function updateActiveNavItem(url) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item, .nav-subitem').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to the current nav item
    const currentNavItem = document.querySelector(`[onclick*="${url}"]`);
    if (currentNavItem) {
        currentNavItem.classList.add('active');
        
        // If it's a submenu item, expand the parent nav group
        const navGroup = currentNavItem.closest('.nav-group');
        if (navGroup) {
            navGroup.classList.add('expanded');
        }
    }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.url) {
        loadPage(event.state.url);
    }
});