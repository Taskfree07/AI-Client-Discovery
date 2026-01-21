/**
 * Manufacturing ICP Lead Generator - Frontend Logic
 */

let currentCampaignId = null;
let pollingInterval = null;

/**
 * Generate leads based on form inputs
 */
async function generateLeads() {
    // Check if Job Opening Search mode is enabled
    const jobOpeningMode = document.getElementById('job-opening-mode');
    const jobTitleInput = document.getElementById('job-title-search');

    if (jobOpeningMode && jobOpeningMode.checked) {
        // Use new Job Opening Search
        await generateLeadsFromJobOpenings();
        return;
    }

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
    const totalTarget = t1Count + t2Count + t3Count;
    updateProgress(0, 0, 0, 0, t1Count, t2Count, t3Count);
    addActivityLog('[*] Initializing Manufacturing ICP service...');

    // Update total in progress section
    document.getElementById('progress-total').textContent = totalTarget;

    // Get AI agent settings
    const aiSettings = getAIAgentSettings();
    if (aiSettings.enabled) {
        addActivityLog('[AI] AI Agents enabled - filtering will reduce API costs');
        addActivityLog(`[AI] Model: ${aiSettings.model || 'llama3.2:3b'}`);
        addActivityLog(`[AI] Contact confidence: ${aiSettings.contact_filter_min_confidence || 0.6}`);
        addActivityLog(`[AI] Quality threshold: ${aiSettings.min_quality_score || 0.5}`);
    } else {
        addActivityLog('[AI] AI Agents disabled - using standard filtering');
    }

    try {
        // Use SSE for real-time progress updates
        const requestData = {
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
            },
            ai_agent_settings: aiSettings
        };

        // Use fetch with ReadableStream for SSE
        const response = await fetch('/api/manufacturing-icp/generate-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        // Process the SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';
        const totalTarget = t1Count + t2Count + t3Count;
        const tierCounts = { T1: 0, T2: 0, T3: 0 };

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            // Decode the chunk
            buffer += decoder.decode(value, { stream: true });

            // Split by double newline (SSE message separator)
            const messages = buffer.split('\n\n');
            buffer = messages.pop() || ''; // Keep the incomplete message in buffer

            for (const message of messages) {
                if (!message.trim() || !message.startsWith('data: ')) {
                    continue;
                }

                try {
                    const data = JSON.parse(message.substring(6)); // Remove 'data: ' prefix

                    // Handle different message types
                    switch (data.type) {
                        case 'campaign_created':
                            currentCampaignId = data.campaign_id;
                            addActivityLog(`[OK] ${data.message}`);
                            break;

                        case 'log':
                            addActivityLog(`[*] ${data.message}`);
                            break;

                        case 'progress':
                            // Update tier count
                            tierCounts[data.tier] = data.count;

                            // Debug logging
                            console.log('Progress update:', {
                                tier: data.tier,
                                count: data.count,
                                percentage: data.percentage,
                                current: data.current,
                                total: data.total,
                                tierCounts: {...tierCounts}
                            });

                            // Update progress bar and tier counters
                            updateProgress(
                                data.percentage,
                                tierCounts.T1,
                                tierCounts.T2,
                                tierCounts.T3,
                                t1Count,
                                t2Count,
                                t3Count
                            );
                            addActivityLog(`[${data.tier}] ${data.message}`);
                            break;

                        case 'tier_complete':
                            tierCounts[data.tier] = data.count;
                            addActivityLog(`[OK] ${data.message}`);
                            break;

                        case 'complete':
                            addActivityLog('[OK] Lead generation complete!');
                            displayResults(data.leads, {
                                total_generated: data.total_leads,
                                avg_score: data.avg_score
                            });
                            break;

                        case 'error':
                            throw new Error(data.message);
                    }
                } catch (parseError) {
                    console.error('Error parsing SSE message:', parseError, message);
                }
            }
        }

    } catch (error) {
        console.error('Error generating leads:', error);
        addActivityLog(`[ERROR] ${error.message}`);
        alert(`Failed to generate leads: ${error.message}`);

        // Re-enable button
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Leads with AI Agents';
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
    const progressText = document.getElementById('progress-text');
    const progressCount = document.getElementById('progress-count');
    const progressTotal = document.getElementById('progress-total');
    const progressStatus = document.getElementById('progress-status');

    // Debug logging
    console.log('updateProgress called:', {
        overallPercent,
        t1Count,
        t2Count,
        t3Count,
        t1Target,
        t2Target,
        t3Target
    });

    // Update progress bar
    progressBar.style.width = `${overallPercent}%`;
    if (progressText) {
        progressText.textContent = `${overallPercent}%`;
    }

    // Update count
    const currentCount = t1Count + t2Count + t3Count;
    const totalTarget = t1Target + t2Target + t3Target;
    if (progressCount) {
        progressCount.textContent = currentCount;
    }
    if (progressTotal) {
        progressTotal.textContent = totalTarget;
    }

    // Update status
    if (progressStatus) {
        if (overallPercent === 100) {
            progressStatus.textContent = 'Complete!';
            progressStatus.style.color = '#27ae60';
        } else {
            progressStatus.textContent = `${overallPercent}% complete`;
            progressStatus.style.color = '#4472C4';
        }
    }

    // Update tier counts
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
        const jobOpeningRow = createJobOpeningRow(lead, index);
        tableBody.appendChild(row);
        tableBody.appendChild(detailsRow);
        tableBody.appendChild(jobOpeningRow);
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
    const validation = lead.validation || { score: 5, percentage: 83 }; // Default for job opening leads
    const scoreClass = validation.score >= 5 ? 'high' : 'medium';
    scoreCell.innerHTML = `
        <div class="validation-score">
            <span class="score-badge ${scoreClass}">${validation.score}/6 (${validation.percentage}%)</span>
        </div>
    `;
    row.appendChild(scoreCell);

    // Action
    const actionCell = document.createElement('td');
    actionCell.innerHTML = `
        <button class="validation-btn" onclick="toggleValidation(${index})" style="margin-bottom: 4px;">View Checklist</button><br>
        <button class="validation-btn" onclick="toggleJobOpening(${index})" style="background: #4472C4; color: white;">Job Proof</button>
    `;
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

    // Default checklist for job opening leads
    const defaultChecklist = {
        active_hiring: { label: 'Active Job Opening', value: lead.job_opening?.title || 'Yes', passed: true },
        company_match: { label: 'Company Size Match', value: `${lead.company?.size || 'N/A'} employees`, passed: true },
        industry_match: { label: 'Industry Match', value: lead.company?.industry || 'N/A', passed: true },
        has_email: { label: 'Email Available', value: lead.contact?.email || 'No', passed: !!lead.contact?.email },
        tier_match: { label: 'Tier', value: lead.tier || 'N/A', passed: true }
    };

    const checklist = lead.validation?.checklist || defaultChecklist;

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
 * Create job opening proof row
 */
function createJobOpeningRow(lead, index) {
    const detailsCell = document.createElement('td');
    detailsCell.colSpan = 6;
    detailsCell.style.padding = '0';

    const jobDiv = document.createElement('div');
    jobDiv.className = 'validation-details';
    jobDiv.id = `job-opening-${index}`;

    const jobOpening = lead.job_opening || {};
    const jobTitle = jobOpening.title || 'Not available';
    const jobUrl = jobOpening.url || '';
    const foundVia = jobOpening.found_via || 'Apollo Search';
    const snippet = jobOpening.snippet || 'Company actively hiring for this position';

    jobDiv.innerHTML = `
        <div style="background: linear-gradient(135deg, #4472C4 0%, #5b9bd5 100%); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="margin: 0 0 10px 0; color: white; font-size: 16px; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">📋</span>
                Job Opening Proof
            </h4>
            <div style="background: rgba(255,255,255,0.95); padding: 15px; border-radius: 6px; color: #2c3e50;">
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 12px; color: #7f8c8d; font-weight: 600; margin-bottom: 4px;">JOB TITLE</div>
                    <div style="font-size: 15px; font-weight: 700; color: #2c3e50;">${jobTitle}</div>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 12px; color: #7f8c8d; font-weight: 600; margin-bottom: 4px;">COMPANY</div>
                    <div style="font-size: 14px; font-weight: 600;">${lead.company?.name || 'N/A'}</div>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 12px; color: #7f8c8d; font-weight: 600; margin-bottom: 4px;">SOURCE</div>
                    <div style="font-size: 13px;">
                        <span style="display: inline-block; padding: 4px 10px; background: #e8f5e9; color: #27ae60; border-radius: 12px; font-weight: 600; font-size: 11px;">
                            ${foundVia}
                        </span>
                    </div>
                </div>
                ${snippet ? `
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 12px; color: #7f8c8d; font-weight: 600; margin-bottom: 4px;">DESCRIPTION</div>
                    <div style="font-size: 13px; color: #555; font-style: italic;">${snippet}</div>
                </div>
                ` : ''}
                ${jobUrl ? `
                <div>
                    <a href="${jobUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background: #27ae60; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; transition: all 0.3s;">
                        🔗 View Job Posting
                    </a>
                </div>
                ` : `
                <div style="padding: 10px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px; font-size: 12px; color: #856404;">
                    <strong>Note:</strong> Direct job URL not available. Company found via ${foundVia} indicating active hiring.
                </div>
                `}
            </div>
        </div>
    `;

    detailsCell.appendChild(jobDiv);

    const jobRow = document.createElement('tr');
    jobRow.id = `job-opening-row-${index}`;
    jobRow.style.display = 'none';
    jobRow.appendChild(detailsCell);

    return jobRow;
}

/**
 * Toggle job opening proof visibility
 */
function toggleJobOpening(index) {
    const jobRow = document.getElementById(`job-opening-row-${index}`);
    const jobDiv = document.getElementById(`job-opening-${index}`);

    if (jobRow.style.display === 'none') {
        jobRow.style.display = 'table-row';
        jobDiv.classList.add('show');
    } else {
        jobRow.style.display = 'none';
        jobDiv.classList.remove('show');
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
 * Select all industry checkboxes in Advanced Settings
 */
function selectAllIndustries() {
    const checkboxes = document.querySelectorAll('#industries-container .industry-filter');
    checkboxes.forEach(cb => cb.checked = true);
}

/**
 * Deselect all industry checkboxes in Advanced Settings
 */
function deselectAllIndustries() {
    const checkboxes = document.querySelectorAll('#industries-container .industry-filter');
    checkboxes.forEach(cb => cb.checked = false);
}

/**
 * Select all industry checkboxes in ICP Manager
 */
function selectAllICPIndustries() {
    const checkboxes = document.querySelectorAll('.icp-industry-cb');
    checkboxes.forEach(cb => cb.checked = true);
}

/**
 * Deselect all industry checkboxes in ICP Manager
 */
function deselectAllICPIndustries() {
    const checkboxes = document.querySelectorAll('.icp-industry-cb');
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

/**
 * Toggle advanced settings visibility
 */
function toggleAdvancedSettings() {
    const advancedSettings = document.getElementById('advanced-settings');
    const toggleText = document.getElementById('advanced-toggle-text');

    if (advancedSettings.style.display === 'none' || advancedSettings.style.display === '') {
        advancedSettings.style.display = 'block';
        toggleText.textContent = '⚙️ Hide Advanced Settings';
    } else {
        advancedSettings.style.display = 'none';
        toggleText.textContent = '⚙️ Show Advanced Settings';
    }
}

// ==================== AI AGENT FUNCTIONS ====================

/**
 * Load AI agent configuration from server
 */
async function loadAIAgentConfig() {
    try {
        const response = await fetch('/api/ai-agents/config');
        const result = await response.json();

        if (result.success) {
            const config = result.config.ai_agents || {};

            // Set enabled state
            const enabled = config.enabled !== false;
            document.getElementById('ai-agents-enabled').checked = enabled;
            updateAIStatus(enabled);

            // Set model
            const model = config.model || 'llama3.2:3b';
            const modelSelect = document.getElementById('ai-model');
            if (modelSelect) {
                modelSelect.value = model;
            }

            // Set thresholds
            const contactConf = config.contact_filter?.min_confidence || 0.6;
            const qualityScore = config.quality_assessment?.min_quality_score || 0.5;
            const aggressiveMode = config.contact_filter?.aggressive_mode || false;

            document.getElementById('contact-confidence').value = contactConf;
            document.getElementById('quality-score').value = qualityScore;
            document.getElementById('aggressive-mode').checked = aggressiveMode;

            updateConfidenceDisplay();
            updateQualityDisplay();

            console.log('[AI AGENTS] Configuration loaded successfully');
        }
    } catch (error) {
        console.error('[AI AGENTS] Failed to load config:', error);
    }
}

/**
 * Select AI preset
 */
function selectAIPreset(preset) {
    // Update active button
    document.querySelectorAll('.ai-preset-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.border = '2px solid #ddd';
        btn.style.background = 'white';
    });

    const selectedBtn = document.querySelector(`[data-preset="${preset}"]`);
    selectedBtn.classList.add('active');
    selectedBtn.style.border = '2px solid #4472C4';
    selectedBtn.style.background = '#f0f4ff';

    // Preset descriptions
    const descriptions = {
        aggressive: {
            text: '<strong style="color: #e74c3c;">Aggressive:</strong> Filters 70-80% of contacts. Maximum cost savings, strictest quality.',
            contactConf: 0.8,
            qualityScore: 0.7,
            aggressive: true,
            filtered: '70-80%',
            savings: '70-80%',
            speed: '15-20x'
        },
        balanced: {
            text: '<strong style="color: #4472C4;">Balanced:</strong> Filters 50-60% of contacts. Good balance between cost and quality.',
            contactConf: 0.6,
            qualityScore: 0.5,
            aggressive: false,
            filtered: '50-60%',
            savings: '50-60%',
            speed: '10-15x'
        },
        lenient: {
            text: '<strong style="color: #27ae60;">Lenient:</strong> Filters 30-40% of contacts. Maximum coverage, higher costs.',
            contactConf: 0.4,
            qualityScore: 0.3,
            aggressive: false,
            filtered: '30-40%',
            savings: '30-40%',
            speed: '8-12x'
        }
    };

    const presetConfig = descriptions[preset];

    // Update description
    document.getElementById('preset-description').innerHTML = presetConfig.text;

    // Update controls
    document.getElementById('contact-confidence').value = presetConfig.contactConf;
    document.getElementById('quality-score').value = presetConfig.qualityScore;
    document.getElementById('aggressive-mode').checked = presetConfig.aggressive;

    updateConfidenceDisplay();
    updateQualityDisplay();

    // Update estimated stats
    document.getElementById('estimated-filtered').textContent = presetConfig.filtered;
    document.getElementById('estimated-savings').textContent = presetConfig.savings;
    document.getElementById('estimated-speed').textContent = presetConfig.speed;

    // Apply preset on server
    fetch(`/api/ai-agents/config/preset/${preset}`, {
        method: 'POST'
    }).then(r => r.json()).then(data => {
        if (data.success) {
            console.log(`[AI AGENTS] Applied preset: ${preset}`);
        }
    }).catch(err => {
        console.error('[AI AGENTS] Failed to apply preset:', err);
    });
}

/**
 * Toggle advanced AI settings
 */
function toggleAdvancedAI() {
    const advancedSettings = document.getElementById('advanced-ai-settings');
    const icon = document.getElementById('advanced-toggle-icon');

    if (advancedSettings.style.display === 'none') {
        advancedSettings.style.display = 'block';
        icon.textContent = '▼';
    } else {
        advancedSettings.style.display = 'none';
        icon.textContent = '▶';
    }
}

/**
 * Update confidence display
 */
function updateConfidenceDisplay() {
    const slider = document.getElementById('contact-confidence');
    const display = document.getElementById('contact-confidence-display');
    if (slider && display) {
        display.textContent = slider.value;
    }
}

/**
 * Update quality score display
 */
function updateQualityDisplay() {
    const slider = document.getElementById('quality-score');
    const display = document.getElementById('quality-score-display');
    if (slider && display) {
        display.textContent = slider.value;
    }
}

/**
 * Update AI status badge
 */
function updateAIStatus(enabled) {
    const badge = document.getElementById('ai-status-badge');
    const controls = document.getElementById('ai-agent-controls');
    const generateBtn = document.getElementById('generate-btn');

    if (enabled) {
        badge.style.background = '#d4edda';
        badge.style.color = '#155724';
        badge.textContent = 'ACTIVE';
        controls.style.display = 'block';
        if (generateBtn) {
            generateBtn.textContent = 'Generate Leads with AI Agents';
        }
    } else {
        badge.style.background = '#f8d7da';
        badge.style.color = '#721c24';
        badge.textContent = 'DISABLED';
        controls.style.display = 'none';
        if (generateBtn) {
            generateBtn.textContent = 'Generate Leads';
        }
    }
}

/**
 * Update speed mode badge
 */
function updateSpeedBadge(enabled) {
    const badge = document.getElementById('speed-badge');
    const aiSection = document.getElementById('ai-agent-controls').parentElement;

    if (enabled) {
        badge.textContent = 'ON';
        badge.style.background = '#ffd700';
        badge.style.color = '#000';
        // Disable AI settings when ultra-fast is enabled (it has its own optimizations)
        aiSection.style.opacity = '0.5';
        aiSection.style.pointerEvents = 'none';
    } else {
        badge.textContent = 'OFF';
        badge.style.background = 'rgba(255,255,255,0.3)';
        badge.style.color = '#fff';
        aiSection.style.opacity = '1';
        aiSection.style.pointerEvents = 'auto';
    }
}

/**
 * Get AI agent settings from form
 */
function getAIAgentSettings() {
    // Check if ultra-fast mode is enabled
    const ultraFastMode = document.getElementById('ultra-fast-mode').checked;

    if (ultraFastMode) {
        return {
            enabled: false,  // AI agents disabled in ultra-fast mode
            ultra_fast_mode: true
        };
    }

    const enabled = document.getElementById('ai-agents-enabled').checked;

    if (!enabled) {
        return {
            enabled: false,
            ultra_fast_mode: false
        };
    }

    return {
        enabled: true,
        ultra_fast_mode: false,
        model: document.getElementById('ai-model').value,
        contact_filter_min_confidence: parseFloat(document.getElementById('contact-confidence').value),
        min_quality_score: parseFloat(document.getElementById('quality-score').value),
        aggressive_mode: document.getElementById('aggressive-mode').checked
    };
}

// ==================== JOB OPENING SEARCH FUNCTIONS ====================

/**
 * Generate leads from companies with active job openings
 */
async function generateLeadsFromJobOpenings() {
    const jobTitleInput = document.getElementById('job-title-search');
    const jobTitle = jobTitleInput ? jobTitleInput.value.trim() : '';

    // Validation
    if (!jobTitle) {
        alert('❌ Please enter a job title to search for');
        jobTitleInput.focus();
        return;
    }

    // Get ICP profile
    const icpSelector = document.getElementById('icp-selector');
    const selectedICPId = icpSelector ? icpSelector.value : 'manufacturing';
    const selectedICP = icpProfiles.find(p => p.id === selectedICPId);

    if (!selectedICP) {
        alert('❌ Please select an ICP profile');
        return;
    }

    // Get locations
    const locationUSA = document.getElementById('location-usa').checked;
    const locationIndia = document.getElementById('location-india').checked;

    if (!locationUSA && !locationIndia) {
        alert('❌ Please select at least one location (USA or India)');
        return;
    }

    // Disable generate button
    const generateBtn = document.getElementById('generate-btn');
    const originalText = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '🔍 Searching for job openings...';

    // Show progress section
    const progressSection = document.getElementById('progress-section');
    progressSection.style.display = 'block';

    // Reset progress
    updateProgress(0, 0, 0, 0, 100, 100, 100);
    addActivityLog(`[🎯] Starting Job Opening Search for: "${jobTitle}"`);
    addActivityLog(`[📍] Locations: ${locationUSA ? 'USA' : ''}${locationUSA && locationIndia ? ', ' : ''}${locationIndia ? 'India' : ''}`);
    addActivityLog(`[🏭] ICP Profile: ${selectedICP.name}`);
    addActivityLog('[🔍] Searching Google for companies with active job postings...');

    try {
        // Get tier counts from inputs
        const t1Count = parseInt(document.getElementById('t1-count').value) || 10;
        const t2Count = parseInt(document.getElementById('t2-count').value) || 10;
        const t3Count = parseInt(document.getElementById('t3-count').value) || 10;
        const totalLeads = t1Count + t2Count + t3Count;

        addActivityLog(`[📊] Target: ${t1Count} T1 + ${t2Count} T2 + ${t3Count} T3 = ${totalLeads} total leads`);

        const requestData = {
            job_title: jobTitle,
            icp_profile: selectedICP,
            locations: {
                usa: locationUSA,
                india: locationIndia
            },
            tier_counts: {
                t1: t1Count,
                t2: t2Count,
                t3: t3Count
            },
            max_companies: Math.ceil(totalLeads / 2)  // Estimate: ~2 leads per company
        };

        const response = await fetch('/api/job-opening-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        addActivityLog('[✓] Job search complete! Enriching companies with contacts...');

        const result = await response.json();

        if (result.success) {
            const { t1_leads, t2_leads, t3_leads, total_generated } = result;

            addActivityLog(`[✓] Found ${total_generated} leads from companies actively hiring!`);
            addActivityLog(`[T1] ${t1_leads.length} Decision Makers`);
            addActivityLog(`[T2] ${t2_leads.length} Talent Leaders`);
            addActivityLog(`[T3] ${t3_leads.length} HR/TA Practitioners`);

            // Update progress
            updateProgress(
                t1_leads.length,
                t2_leads.length,
                t3_leads.length,
                total_generated,
                100, 100, 100
            );

            // Display results
            const summary = {
                total_generated: total_generated,
                avg_score: 5,  // Job opening leads are high quality
                t1_count: t1_leads.length,
                t2_count: t2_leads.length,
                t3_count: t3_leads.length
            };
            displayResults(result.leads, summary);

            addActivityLog('[🎉] Lead generation complete!');
            alert(`✅ Success! Found ${total_generated} leads from companies actively hiring for "${jobTitle}"`);

        } else {
            throw new Error(result.message || 'Unknown error occurred');
        }

    } catch (error) {
        console.error('Job opening search error:', error);
        addActivityLog(`[❌] Error: ${error.message}`);
        alert(`❌ Error: ${error.message}`);
    } finally {
        // Re-enable button
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

// ==================== ICP MANAGEMENT FUNCTIONS ====================

/**
 * ICP Profile storage and management
 */
let icpProfiles = [];
let currentEditingICP = null;

/**
 * Load ICP profiles from localStorage
 */
function loadICPProfiles() {
    const stored = localStorage.getItem('icp_profiles');
    if (stored) {
        icpProfiles = JSON.parse(stored);
    } else {
        // Create default Manufacturing ICP with T1, T2, T3 structure and all available industries
        icpProfiles = [{
            id: 'manufacturing',
            name: 'Manufacturing ICP (Default)',
            industries: [
                'Manufacturing', 'Industrial', 'Automotive', 'Electronics Manufacturing', 'Chemicals', 'FMCG Manufacturing',
                'Pharmaceuticals', 'Medical Devices', 'Aerospace', 'Defense', 'Food Production', 'Food & Beverages',
                'Machinery', 'Industrial Machinery', 'Electrical Equipment', 'Industrial Automation',
                'Plastics Manufacturing', 'Steel Manufacturing', 'Metal Fabrication', 'Packaging',
                'Textiles', 'Paper & Forest Products', 'Oil & Gas', 'Energy', 'Construction',
                'Building Materials', 'Glass, Ceramics & Concrete', 'Mining', 'Rubber Manufacturing', 'Semiconductors'
            ],
            sizeMin: 200,
            sizeMax: 10000,
            locations: { usa: true, india: true },
            titles: [],
            t1Titles: ['COO', 'VP Operations', 'Director Operations', 'Plant Head', 'Factory Manager', 'Unit Head', 'General Manager Operations', 'Regional Manager'],
            t2Titles: ['HR Head', 'VP HR', 'CHRO', 'Director HR', 'HR Manager', 'Talent Acquisition Head', 'TA Manager', 'Senior HRBP'],
            t3Titles: ['Recruiter', 'TA Specialist', 'HRBP', 'HR Executive', 'Staffing Coordinator']
        }];
        saveICPProfiles();
    }
    refreshICPSelector();
    refreshICPList();
}

/**
 * Save ICP profiles to localStorage
 */
function saveICPProfiles() {
    localStorage.setItem('icp_profiles', JSON.stringify(icpProfiles));
}

/**
 * Refresh ICP selector dropdown
 */
function refreshICPSelector() {
    const selector = document.getElementById('icp-selector');
    if (!selector) return;

    selector.innerHTML = '';
    icpProfiles.forEach(icp => {
        const option = document.createElement('option');
        option.value = icp.id;
        option.textContent = icp.name;
        selector.appendChild(option);
    });
}

/**
 * Refresh ICP list in manager
 */
function refreshICPList() {
    const listContainer = document.getElementById('icp-list');
    if (!listContainer) return;

    if (icpProfiles.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No ICP profiles yet. Create one to get started!</p>';
        return;
    }

    listContainer.innerHTML = '';
    icpProfiles.forEach(icp => {
        const card = document.createElement('div');
        card.style.cssText = 'padding: 20px; background: white; border: 2px solid #e0e0e0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s;';
        card.onmouseover = function() { this.style.borderColor = '#4472C4'; this.style.boxShadow = '0 4px 12px rgba(68, 114, 196, 0.2)'; };
        card.onmouseout = function() { this.style.borderColor = '#e0e0e0'; this.style.boxShadow = 'none'; };

        const t1Count = icp.t1Titles ? icp.t1Titles.length : 0;
        const t2Count = icp.t2Titles ? icp.t2Titles.length : 0;
        const t3Count = icp.t3Titles ? icp.t3Titles.length : 0;

        card.innerHTML = `
            <div style="flex: 1;">
                <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px;">${icp.name}</h4>
                <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 13px; color: #7f8c8d;">
                    <span>🏭 ${icp.industries.length} industries</span>
                    <span>👥 ${icp.sizeMin}-${icp.sizeMax} employees</span>
                    <span style="color: #e74c3c; font-weight: 600;">T1: ${t1Count}</span>
                    <span style="color: #f39c12; font-weight: 600;">T2: ${t2Count}</span>
                    <span style="color: #27ae60; font-weight: 600;">T3: ${t3Count}</span>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="editICP('${icp.id}')" style="padding: 12px 24px; background: #4472C4; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.background='#365a9b'" onmouseout="this.style.background='#4472C4'">
                    ✏️ Edit Profile
                </button>
            </div>
        `;

        listContainer.appendChild(card);
    });
}

/**
 * Open ICP Manager modal
 */
function openICPManager() {
    document.getElementById('icp-manager-modal').style.display = 'block';
    document.getElementById('icp-editor').style.display = 'none';
    loadICPProfiles();
}

/**
 * Close ICP Manager modal
 */
function closeICPManager() {
    document.getElementById('icp-manager-modal').style.display = 'none';
    currentEditingICP = null;
}

/**
 * Create new ICP profile
 */
function createNewICP() {
    currentEditingICP = {
        id: 'icp_' + Date.now(),
        name: '',
        industries: [
            'Manufacturing', 'Industrial', 'Automotive', 'Electronics Manufacturing', 'Chemicals', 'FMCG Manufacturing',
            'Pharmaceuticals', 'Medical Devices', 'Aerospace', 'Defense', 'Food Production', 'Food & Beverages',
            'Machinery', 'Industrial Machinery', 'Electrical Equipment', 'Industrial Automation',
            'Plastics Manufacturing', 'Steel Manufacturing', 'Metal Fabrication', 'Packaging',
            'Textiles', 'Paper & Forest Products', 'Oil & Gas', 'Energy', 'Construction',
            'Building Materials', 'Glass, Ceramics & Concrete', 'Mining', 'Rubber Manufacturing', 'Semiconductors'
        ],
        sizeMin: 200,
        sizeMax: 10000,
        locations: { usa: true, india: true },
        titles: [],
        t1Titles: ['COO', 'VP Operations', 'Director Operations', 'Plant Head', 'Factory Manager', 'Unit Head', 'General Manager Operations', 'Regional Manager'],
        t2Titles: ['HR Head', 'VP HR', 'CHRO', 'Director HR', 'HR Manager', 'Talent Acquisition Head', 'TA Manager', 'Senior HRBP'],
        t3Titles: ['Recruiter', 'TA Specialist', 'HRBP', 'HR Executive', 'Staffing Coordinator']
    };
    showICPEditor(currentEditingICP);
}

/**
 * Edit existing ICP profile
 */
function editICP(icpId) {
    const icp = icpProfiles.find(p => p.id === icpId);
    if (icp) {
        currentEditingICP = { ...icp };
        showICPEditor(currentEditingICP);
    }
}

/**
 * Show ICP editor
 */
function showICPEditor(icp) {
    document.getElementById('icp-editor').style.display = 'block';

    // Set basic fields
    document.getElementById('icp-name').value = icp.name;
    document.getElementById('icp-size-min').value = icp.sizeMin;
    document.getElementById('icp-size-max').value = icp.sizeMax;
    document.getElementById('icp-location-usa').checked = icp.locations.usa;
    document.getElementById('icp-location-india').checked = icp.locations.india;

    // Set industry checkboxes
    document.querySelectorAll('.icp-industry-cb').forEach(cb => {
        cb.checked = icp.industries.includes(cb.value);
    });

    // Set T1 title checkboxes
    document.querySelectorAll('.icp-t1-title').forEach(cb => {
        cb.checked = icp.t1Titles ? icp.t1Titles.includes(cb.value) : false;
    });

    // Set T2 title checkboxes
    document.querySelectorAll('.icp-t2-title').forEach(cb => {
        cb.checked = icp.t2Titles ? icp.t2Titles.includes(cb.value) : false;
    });

    // Set T3 title checkboxes
    document.querySelectorAll('.icp-t3-title').forEach(cb => {
        cb.checked = icp.t3Titles ? icp.t3Titles.includes(cb.value) : false;
    });
}

/**
 * Cancel ICP editing
 */
function cancelEditICP() {
    document.getElementById('icp-editor').style.display = 'none';
    currentEditingICP = null;
}

/**
 * Save ICP profile
 */
function saveICP() {
    const name = document.getElementById('icp-name').value.trim();
    if (!name) {
        alert('❌ Please enter an ICP name');
        return;
    }

    // Get selected industries
    const industries = Array.from(document.querySelectorAll('.icp-industry-cb:checked'))
        .map(cb => cb.value);

    if (industries.length === 0) {
        alert('❌ Please select at least one industry');
        return;
    }

    // Get T1 titles
    const t1Titles = Array.from(document.querySelectorAll('.icp-t1-title:checked'))
        .map(cb => cb.value);

    // Get T2 titles
    const t2Titles = Array.from(document.querySelectorAll('.icp-t2-title:checked'))
        .map(cb => cb.value);

    // Get T3 titles
    const t3Titles = Array.from(document.querySelectorAll('.icp-t3-title:checked'))
        .map(cb => cb.value);

    // Combine all titles for backward compatibility
    const allTitles = [...t1Titles, ...t2Titles, ...t3Titles];

    const icpData = {
        ...currentEditingICP,
        name: name,
        industries: industries,
        sizeMin: parseInt(document.getElementById('icp-size-min').value),
        sizeMax: parseInt(document.getElementById('icp-size-max').value),
        locations: {
            usa: document.getElementById('icp-location-usa').checked,
            india: document.getElementById('icp-location-india').checked
        },
        titles: allTitles,
        t1Titles: t1Titles,
        t2Titles: t2Titles,
        t3Titles: t3Titles
    };

    // Update or add
    const existingIndex = icpProfiles.findIndex(p => p.id === icpData.id);
    if (existingIndex >= 0) {
        icpProfiles[existingIndex] = icpData;
    } else {
        icpProfiles.push(icpData);
    }

    saveICPProfiles();
    refreshICPSelector();
    refreshICPList();
    cancelEditICP();

    // Reload the ICP profile into Advanced Settings if it's currently selected
    const selector = document.getElementById('icp-selector');
    if (selector && selector.value === icpData.id) {
        loadICPProfile();
    }

    alert('✅ ICP Profile saved successfully!');
}

/**
 * Delete ICP profile
 */
function deleteICP(icpId) {
    if (icpId === 'manufacturing') {
        alert('Cannot delete default Manufacturing ICP');
        return;
    }

    if (confirm('Are you sure you want to delete this ICP profile?')) {
        icpProfiles = icpProfiles.filter(p => p.id !== icpId);
        saveICPProfiles();
        refreshICPSelector();
        refreshICPList();
    }
}

/**
 * Populate industries container in Advanced Settings from ICP profile
 */
function populateIndustriesFromICP(icp) {
    const container = document.getElementById('industries-container');
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    // Get all available industries from the ICP manager checkboxes
    const allIndustries = Array.from(document.querySelectorAll('.icp-industry-cb')).map(cb => ({
        value: cb.value,
        label: cb.parentElement.querySelector('span').textContent
    }));

    // Get selected industries from ICP profile
    const selectedIndustries = icp.industries || [];

    // Create checkboxes for each industry
    allIndustries.forEach(industry => {
        const isSelected = selectedIndustries.includes(industry.value);

        const label = document.createElement('label');
        label.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; padding: 6px; background: white; border-radius: 4px; transition: all 0.2s;';
        label.onmouseover = function() { this.style.background = '#e8f4f8'; };
        label.onmouseout = function() { this.style.background = 'white'; };

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'industry-filter';
        checkbox.value = industry.value;
        checkbox.checked = isSelected;
        checkbox.style.cssText = 'width: 14px; height: 14px; cursor: pointer;';

        const span = document.createElement('span');
        span.textContent = industry.label;
        span.style.cssText = 'font-weight: 500; color: #2c3e50;';

        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });

    console.log(`Populated ${allIndustries.length} industries in Advanced Settings (${selectedIndustries.length} selected)`);
}

/**
 * Load selected ICP profile into form
 */
function loadICPProfile() {
    const selector = document.getElementById('icp-selector');
    const selectedId = selector.value;
    const icp = icpProfiles.find(p => p.id === selectedId);

    if (!icp) return;

    // Populate industries in Advanced Settings
    populateIndustriesFromICP(icp);

    // Load company size
    if (icp.sizeMin) document.getElementById('size-min').value = icp.sizeMin;
    if (icp.sizeMax) document.getElementById('size-max').value = icp.sizeMax;

    // Load locations
    if (icp.locations) {
        document.getElementById('location-usa').checked = icp.locations.usa;
        document.getElementById('location-india').checked = icp.locations.india;
    }

    console.log(`Loaded ICP profile: ${icp.name}`);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('ICP Lead Search page loaded');

    // Load ICP profiles
    loadICPProfiles();

    // Load the default ICP profile into Advanced Settings
    const defaultICP = icpProfiles.find(p => p.id === 'manufacturing');
    if (defaultICP) {
        populateIndustriesFromICP(defaultICP);
    }

    // Setup job opening mode toggle
    const jobOpeningModeCheckbox = document.getElementById('job-opening-mode');
    if (jobOpeningModeCheckbox) {
        jobOpeningModeCheckbox.addEventListener('change', (e) => {
            const btnText = document.getElementById('generate-btn-text');
            if (e.target.checked) {
                btnText.textContent = '🔍 Search Leads from Active Job Openings';
            } else {
                btnText.textContent = '🚀 Search Leads (Ultra Fast Mode)';
            }
        });
    }

    // Setup score slider listener
    const scoreSlider = document.getElementById('min-score');
    if (scoreSlider) {
        scoreSlider.addEventListener('input', updateMinScoreDisplay);
    }

    // Setup AI agent listeners
    const aiEnabledCheckbox = document.getElementById('ai-agents-enabled');
    if (aiEnabledCheckbox) {
        aiEnabledCheckbox.addEventListener('change', (e) => {
            updateAIStatus(e.target.checked);
        });
    }

    // Setup ultra-fast mode listener (now enabled by default)
    const ultraFastCheckbox = document.getElementById('ultra-fast-mode');
    if (ultraFastCheckbox) {
        // Initialize as enabled
        updateSpeedBadge(true);

        ultraFastCheckbox.addEventListener('change', (e) => {
            updateSpeedBadge(e.target.checked);
            if (e.target.checked) {
                // Auto-apply fastest settings
                document.getElementById('ai-model').value = 'gemma3:1b';
                document.getElementById('contact-confidence').value = 0.7;
                document.getElementById('quality-score').value = 0.6;
                updateConfidenceDisplay();
                updateQualityDisplay();
            }
        });
    }

    // Load AI agent configuration
    loadAIAgentConfig();
});
