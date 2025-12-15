/**
 * Manufacturing ICP Lead Generator - Frontend Logic
 */

let currentCampaignId = null;
let pollingInterval = null;

/**
 * Generate leads based on form inputs
 */
async function generateLeads() {
    const campaignName = document.getElementById('campaign-name').value;
    const t1Count = parseInt(document.getElementById('t1-count').value) || 0;
    const t2Count = parseInt(document.getElementById('t2-count').value) || 0;
    const t3Count = parseInt(document.getElementById('t3-count').value) || 0;
    const sizeMin = parseInt(document.getElementById('size-min').value) || 200;
    const sizeMax = parseInt(document.getElementById('size-max').value) || 10000;

    // Get location filters
    const locationUSA = document.getElementById('location-usa').checked;
    const locationIndia = document.getElementById('location-india').checked;

    // Get selected industries
    const industryCheckboxes = document.querySelectorAll('.industry-filter:checked');
    const selectedIndustries = Array.from(industryCheckboxes).map(cb => cb.value);

    // Get minimum validation score
    const minScore = parseInt(document.getElementById('min-score').value) || 4;

    // Validation
    if (!campaignName.trim()) {
        alert('Please enter a campaign name');
        return;
    }

    if (t1Count <= 0 && t2Count <= 0 && t3Count <= 0) {
        alert('Please specify at least one tier target count');
        return;
    }

    if (sizeMin >= sizeMax) {
        alert('Minimum company size must be less than maximum');
        return;
    }

    if (!locationUSA && !locationIndia) {
        alert('Please select at least one location (USA or India)');
        return;
    }

    if (selectedIndustries.length === 0) {
        alert('Please select at least one industry');
        return;
    }

    // Disable generate button
    const generateBtn = document.getElementById('generate-btn');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    // Show progress section
    const progressSection = document.getElementById('progress-section');
    progressSection.style.display = 'block';

    // Reset progress
    updateProgress(0, 0, 0, 0, t1Count, t2Count, t3Count);
    addActivityLog('[*] Initializing Manufacturing ICP service...');

    try {
        // Call API to start generation
        const response = await fetch('/api/manufacturing-icp/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campaign_name: campaignName,
                t1_target: t1Count,
                t2_target: t2Count,
                t3_target: t3Count,
                filters: {
                    industries: selectedIndustries,
                    size_min: sizeMin,
                    size_max: sizeMax,
                    locations: {
                        usa: locationUSA,
                        india: locationIndia
                    },
                    min_validation_score: minScore
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            currentCampaignId = result.campaign_id;
            addActivityLog('[OK] Campaign created successfully');
            addActivityLog(`[*] Generating ${t1Count + t2Count + t3Count} leads...`);

            // Start polling for progress (if implemented) or show results immediately
            if (result.leads) {
                displayResults(result.leads, result.summary);
            } else {
                // If generation is async, start polling
                startProgressPolling();
            }
        } else {
            throw new Error(result.message || 'Lead generation failed');
        }

    } catch (error) {
        console.error('Error generating leads:', error);
        addActivityLog(`[ERROR] ${error.message}`);
        alert(`Failed to generate leads: ${error.message}`);

        // Re-enable button
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Leads';
    }
}

/**
 * Start polling for progress updates (if backend supports async generation)
 */
function startProgressPolling() {
    if (!currentCampaignId) return;

    pollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/manufacturing-icp/leads/${currentCampaignId}`);
            const result = await response.json();

            if (result.success) {
                const campaign = result.campaign;
                const leads = result.leads;

                // Update progress
                const totalTarget = campaign.t1_target + campaign.t2_target + campaign.t3_target;
                const totalGenerated = campaign.t1_generated + campaign.t2_generated + campaign.t3_generated;
                const progress = Math.round((totalGenerated / totalTarget) * 100);

                updateProgress(
                    progress,
                    campaign.t1_generated,
                    campaign.t2_generated,
                    campaign.t3_generated,
                    campaign.t1_target,
                    campaign.t2_target,
                    campaign.t3_target
                );

                // If completed, stop polling and show results
                if (campaign.status === 'completed') {
                    stopProgressPolling();
                    addActivityLog('[OK] Lead generation complete!');
                    displayResults(leads, {
                        total_generated: campaign.total_leads,
                        avg_score: campaign.avg_validation_score
                    });
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 2000); // Poll every 2 seconds
}

/**
 * Stop progress polling
 */
function stopProgressPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

/**
 * Update progress bars and counters
 */
function updateProgress(overallPercent, t1Count, t2Count, t3Count, t1Target, t2Target, t3Target) {
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = `${overallPercent}%`;
    progressBar.textContent = `${overallPercent}%`;

    document.getElementById('t1-progress').textContent = `${t1Count}/${t1Target}`;
    document.getElementById('t2-progress').textContent = `${t2Count}/${t2Target}`;
    document.getElementById('t3-progress').textContent = `${t3Count}/${t3Target}`;
}

/**
 * Add log entry to activity log
 */
function addActivityLog(message) {
    const activityLog = document.getElementById('activity-log');
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    activityLog.appendChild(logEntry);
    activityLog.scrollTop = activityLog.scrollHeight;
}

/**
 * Display results in table
 */
function displayResults(leads, summary) {
    // Hide progress, show results
    document.getElementById('progress-section').style.display = 'none';
    document.getElementById('results-section').style.display = 'block';

    // Update summary stats
    document.getElementById('total-leads').textContent = summary.total_generated || leads.length;
    document.getElementById('avg-score').textContent = summary.avg_score ? `${summary.avg_score}/6` : 'N/A';

    // Update tier tabs counts
    const t1Count = leads.filter(l => l.tier === 'T1').length;
    const t2Count = leads.filter(l => l.tier === 'T2').length;
    const t3Count = leads.filter(l => l.tier === 'T3').length;

    document.querySelector('[data-tier="all"]').textContent = `All (${leads.length})`;
    document.querySelector('[data-tier="T1"]').textContent = `T1 (${t1Count})`;
    document.querySelector('[data-tier="T2"]').textContent = `T2 (${t2Count})`;
    document.querySelector('[data-tier="T3"]').textContent = `T3 (${t3Count})`;

    // Populate table
    const tableBody = document.getElementById('leads-table-body');
    tableBody.innerHTML = '';

    leads.forEach((lead, index) => {
        const row = createLeadRow(lead, index);
        const detailsRow = createValidationDetailsRow(lead, index);
        tableBody.appendChild(row);
        tableBody.appendChild(detailsRow);
    });

    // Update export button
    const exportBtn = document.getElementById('export-btn');
    exportBtn.href = `/api/manufacturing-icp/export/${currentCampaignId}`;

    // Re-enable generate button
    const generateBtn = document.getElementById('generate-btn');
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Leads';
}

/**
 * Create a table row for a lead
 */
function createLeadRow(lead, index) {
    const row = document.createElement('tr');
    row.dataset.tier = lead.tier;
    row.dataset.leadId = index;

    // Tier badge
    const tierCell = document.createElement('td');
    tierCell.innerHTML = `<span class="tier-badge ${lead.tier.toLowerCase()}">${lead.tier}</span>`;
    row.appendChild(tierCell);

    // Company
    const companyCell = document.createElement('td');
    companyCell.innerHTML = `
        <strong>${lead.company.name}</strong><br>
        <small>${lead.company.industry || 'N/A'}</small><br>
        <small>${lead.company.size || 'N/A'} employees</small>
    `;
    row.appendChild(companyCell);

    // Contact
    const contactCell = document.createElement('td');
    contactCell.innerHTML = `
        <strong>${lead.contact.name}</strong><br>
        <small>${lead.contact.title}</small>
    `;
    row.appendChild(contactCell);

    // Title
    const titleCell = document.createElement('td');
    titleCell.textContent = lead.contact.title;
    row.appendChild(titleCell);

    // Email
    const emailCell = document.createElement('td');
    const emailStatus = lead.contact.email_status || 'unavailable';
    emailCell.innerHTML = `
        ${lead.contact.email || 'N/A'}<br>
        <span class="email-status ${emailStatus}">${emailStatus}</span>
    `;
    row.appendChild(emailCell);

    // Score
    const scoreCell = document.createElement('td');
    const validation = lead.validation;
    const scoreClass = validation.score >= 5 ? 'high' : 'medium';
    scoreCell.innerHTML = `
        <div class="validation-score">
            <span class="score-badge ${scoreClass}">${validation.score}/6 (${validation.percentage}%)</span>
        </div>
    `;
    row.appendChild(scoreCell);

    // Action
    const actionCell = document.createElement('td');
    actionCell.innerHTML = `<button class="validation-btn" onclick="toggleValidation(${index})">View Checklist</button>`;
    row.appendChild(actionCell);

    return row;
}

/**
 * Create validation details row
 */
function createValidationDetailsRow(lead, index) {
    const detailsCell = document.createElement('td');
    detailsCell.colSpan = 7;
    detailsCell.style.padding = '0';

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'validation-details';
    detailsDiv.id = `validation-${index}`;

    const checklist = lead.validation.checklist;

    for (const [key, item] of Object.entries(checklist)) {
        const checkItem = document.createElement('div');
        checkItem.className = 'checklist-item';

        const icon = item.passed ?
            `<span class="checklist-icon pass">✓</span>` :
            `<span class="checklist-icon fail">✗</span>`;

        checkItem.innerHTML = `
            ${icon}
            <div class="checklist-content">
                <div class="checklist-label">${item.label}</div>
                <div class="checklist-value">${item.value}</div>
            </div>
        `;

        detailsDiv.appendChild(checkItem);
    }

    detailsCell.appendChild(detailsDiv);

    // Create a new row for details
    const detailsRow = document.createElement('tr');
    detailsRow.id = `details-row-${index}`;
    detailsRow.style.display = 'none';
    detailsRow.appendChild(detailsCell);

    return detailsRow;
}

/**
 * Toggle validation checklist visibility
 */
function toggleValidation(index) {
    const detailsRow = document.getElementById(`details-row-${index}`);
    const validationDiv = document.getElementById(`validation-${index}`);

    if (detailsRow.style.display === 'none') {
        detailsRow.style.display = 'table-row';
        validationDiv.classList.add('show');
    } else {
        detailsRow.style.display = 'none';
        validationDiv.classList.remove('show');
    }
}

/**
 * Filter leads by tier
 */
function filterTier(tier) {
    // Update active tab
    document.querySelectorAll('.tier-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tier="${tier}"]`).classList.add('active');

    // Filter table rows
    const rows = document.querySelectorAll('#leads-table-body tr');
    rows.forEach(row => {
        if (tier === 'all' || row.dataset.tier === tier) {
            row.style.display = 'table-row';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Export to Excel
 */
function exportToExcel(event) {
    event.preventDefault();

    if (!currentCampaignId) {
        alert('No campaign to export');
        return;
    }

    window.location.href = `/api/manufacturing-icp/export/${currentCampaignId}`;
}

/**
 * Select all industry checkboxes
 */
function selectAllIndustries() {
    const checkboxes = document.querySelectorAll('.industry-filter');
    checkboxes.forEach(cb => cb.checked = true);
}

/**
 * Deselect all industry checkboxes
 */
function deselectAllIndustries() {
    const checkboxes = document.querySelectorAll('.industry-filter');
    checkboxes.forEach(cb => cb.checked = false);
}

/**
 * Update minimum score display
 */
function updateMinScoreDisplay() {
    const slider = document.getElementById('min-score');
    const display = document.getElementById('min-score-display');
    if (slider && display) {
        display.textContent = `${slider.value}/6`;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Manufacturing ICP page loaded');

    // Setup score slider listener
    const scoreSlider = document.getElementById('min-score');
    if (scoreSlider) {
        scoreSlider.addEventListener('input', updateMinScoreDisplay);
    }
});
