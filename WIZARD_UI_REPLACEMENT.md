# Wizard UI Replacement Code

This file contains the complete Step 3 replacement for the wizard UI.

## Replace lines 1304-1577 in page.tsx with:

```tsx
          {/* Step 3: Create Campaign Mail - Wizard */}
          {currentStep === 3 && (
            <div className="step-panel">
              <h2 className="step-title">Create Campaign Mail</h2>
              <p className="step-description">Build your 4-email sequence step by step</p>

              {/* Wizard Progress */}
              <div className="wizard-progress">
                <div className={`wizard-step ${wizardStep >= 1 ? 'completed' : ''} ${wizardStep === 1 ? 'active' : ''}`}
                  onClick={() => setWizardStep(1)}>
                  <div className="wizard-step-number">{selectedTemplates.day1 ? '✓' : '1'}</div>
                  <div className="wizard-step-label">
                    <div className="wizard-step-title">Day 1</div>
                    <div className="wizard-step-subtitle">Opener</div>
                  </div>
                </div>
                <div className="wizard-connector"></div>
                <div className={`wizard-step ${wizardStep >= 2 ? 'completed' : ''} ${wizardStep === 2 ? 'active' : ''}`}
                  onClick={() => wizardStep > 1 && setWizardStep(2)}>
                  <div className="wizard-step-number">{selectedTemplates.day3 ? '✓' : '2'}</div>
                  <div className="wizard-step-label">
                    <div className="wizard-step-title">Day 3</div>
                    <div className="wizard-step-subtitle">Follow-Up</div>
                  </div>
                </div>
                <div className="wizard-connector"></div>
                <div className={`wizard-step ${wizardStep >= 3 ? 'completed' : ''} ${wizardStep === 3 ? 'active' : ''}`}
                  onClick={() => wizardStep > 2 && setWizardStep(3)}>
                  <div className="wizard-step-number">{selectedTemplates.day7 ? '✓' : '3'}</div>
                  <div className="wizard-step-label">
                    <div className="wizard-step-title">Day 7</div>
                    <div className="wizard-step-subtitle">Value</div>
                  </div>
                </div>
                <div className="wizard-connector"></div>
                <div className={`wizard-step ${wizardStep >= 4 ? 'completed' : ''} ${wizardStep === 4 ? 'active' : ''}`}
                  onClick={() => wizardStep > 3 && setWizardStep(4)}>
                  <div className="wizard-step-number">{selectedTemplates.day11 ? '✓' : '4'}</div>
                  <div className="wizard-step-label">
                    <div className="wizard-step-title">Day 11</div>
                    <div className="wizard-step-subtitle">Breakup</div>
                  </div>
                </div>
              </div>

              {/* Wizard Content */}
              {wizardStep <=4 && (
                <div className="wizard-content">
                  {/* Left Panel: Template Selection */}
                  <div className="wizard-left-panel">
                    <div className="wizard-panel-header">
                      <h3>
                        <i className="fas fa-envelope"></i>
                        Email {wizardStep}: {getCurrentDayLabel()}
                      </h3>
                      <p>Sends {wizardStep === 1 ? 'immediately' : `${getCurrentDayNumber()} days after campaign start`}</p>
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
                                className={`template-select-card ${selectedTemplates[getCurrentDay()]?.id === template.id ? 'selected' : ''}`}
                                onClick={() => handleTemplateSelect(template)}
                              >
                                <div className="template-select-radio">
                                  <input
                                    type="radio"
                                    checked={selectedTemplates[getCurrentDay()]?.id === template.id}
                                    onChange={() => handleTemplateSelect(template)}
                                  />
                                </div>
                                <div className="template-select-content">
                                  <h4>{template.name}</h4>
                                  <p className="template-select-subject">
                                    <strong>Subject:</strong> {template.subject_template}
                                  </p>
                                  <div className="template-select-meta">
                                    <span><i className="fas fa-chart-line"></i> Opens: 45%</span>
                                    <span><i className="fas fa-clock"></i> Used 2 days ago</span>
                                  </div>
                                </div>
                                <div className="template-select-actions">
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
                            <div className="empty-templates-state">
                              <i className="fas fa-inbox"></i>
                              <p>No templates available</p>
                              <p className="empty-state-hint">Upload or import templates below</p>
                            </div>
                          )}
                        </div>

                        <div className="wizard-actions-divider">
                          <span>OR</span>
                        </div>

                        <div className="wizard-action-buttons">
                          <button
                            className="wizard-action-btn"
                            onClick={handleImportFromLibrary}
                          >
                            <i className="fas fa-file-import"></i>
                            <span>Import from Library</span>
                          </button>
                          <button
                            className="wizard-action-btn"
                            onClick={handleUploadTemplate}
                          >
                            <i className="fas fa-plus"></i>
                            <span>Upload New Template</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Panel: Preview */}
                  <div className="wizard-right-panel">
                    <div className="wizard-panel-header">
                      <h3>
                        <i className="fas fa-eye"></i>
                        Live Preview
                      </h3>
                    </div>

                    {wizardPreviewTemplate ? (
                      <div className="wizard-preview-content">
                        <div className="wizard-preview-email">
                          <div className="preview-email-header">
                            <div className="preview-from">
                              <strong>From:</strong> {senders.find(s => s.isDefault)?.email || 'your-email@example.com'}
                            </div>
                            <div className="preview-to">
                              <strong>To:</strong> Sample Lead
                            </div>
                          </div>
                          <div className="preview-email-subject">
                            <strong>Subject:</strong> {wizardPreviewTemplate.subject_template}
                          </div>
                          <div className="preview-email-body">
                            {wizardPreviewTemplate.body_template}
                          </div>
                        </div>

                        {/* AI Personalization Box (Phase 2) */}
                        <div className="wizard-ai-box">
                          <h4>
                            <i className="fas fa-magic"></i>
                            AI Personalization
                          </h4>
                          <p>Customize this email for your {addedLeads.length} leads</p>
                          <div className="ai-insights-preview">
                            <div className="ai-insight">
                              <span className="ai-label">Industries:</span>
                              <span className="ai-value">SaaS, Fintech</span>
                            </div>
                            <div className="ai-insight">
                              <span className="ai-label">Titles:</span>
                              <span className="ai-value">CTO, VP Eng</span>
                            </div>
                          </div>
                          <button
                            className="btn-personalize"
                            disabled={addedLeads.length === 0}
                          >
                            <i className="fas fa-sparkles"></i>
                            Personalize with AI
                          </button>
                          {addedLeads.length === 0 && (
                            <p className="ai-notice">Add leads in Step 1 to enable AI personalization</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="wizard-preview-empty">
                        <i className="fas fa-mouse-pointer"></i>
                        <p>Select a template to see preview</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Review Step */}
              {wizardStep === 5 && (
                <div className="wizard-review">
                  <h3>Review Your Email Sequence</h3>
                  <p className="wizard-review-subtitle">
                    Your 4-email campaign over {2 + 4 + 4} days for {addedLeads.length} leads
                  </p>

                  <div className="review-timeline">
                    {/* Day 1 */}
                    {selectedTemplates.day1 && (
                      <div className="review-email-card">
                        <div className="review-email-day">
                          <span className="review-day-badge">Day 1</span>
                          <span className="review-day-label">Immediately</span>
                        </div>
                        <div className="review-email-content">
                          <h4>{selectedTemplates.day1.name}</h4>
                          <p><strong>Subject:</strong> {selectedTemplates.day1.subject_template}</p>
                          <div className="review-email-actions">
                            <button onClick={() => setWizardStep(1)} className="btn-text">
                              <i className="fas fa-edit"></i> Edit
                            </button>
                            <button onClick={() => handleOpenTestEmail(selectedTemplates.day1!)} className="btn-text">
                              <i className="fas fa-paper-plane"></i> Test
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="review-wait-indicator">⏰ Wait 2 days</div>

                    {/* Day 3 */}
                    {selectedTemplates.day3 && (
                      <div className="review-email-card">
                        <div className="review-email-day">
                          <span className="review-day-badge">Day 3</span>
                          <span className="review-day-label">2 days after</span>
                        </div>
                        <div className="review-email-content">
                          <h4>{selectedTemplates.day3.name}</h4>
                          <p><strong>Subject:</strong> {selectedTemplates.day3.subject_template}</p>
                          <div className="review-email-actions">
                            <button onClick={() => setWizardStep(2)} className="btn-text">
                              <i className="fas fa-edit"></i> Edit
                            </button>
                            <button onClick={() => handleOpenTestEmail(selectedTemplates.day3!)} className="btn-text">
                              <i className="fas fa-paper-plane"></i> Test
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="review-wait-indicator">⏰ Wait 4 days</div>

                    {/* Day 7 */}
                    {selectedTemplates.day7 && (
                      <div className="review-email-card">
                        <div className="review-email-day">
                          <span className="review-day-badge">Day 7</span>
                          <span className="review-day-label">6 days after</span>
                        </div>
                        <div className="review-email-content">
                          <h4>{selectedTemplates.day7.name}</h4>
                          <p><strong>Subject:</strong> {selectedTemplates.day7.subject_template}</p>
                          <div className="review-email-actions">
                            <button onClick={() => setWizardStep(3)} className="btn-text">
                              <i className="fas fa-edit"></i> Edit
                            </button>
                            <button onClick={() => handleOpenTestEmail(selectedTemplates.day7!)} className="btn-text">
                              <i className="fas fa-paper-plane"></i> Test
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="review-wait-indicator">⏰ Wait 4 days</div>

                    {/* Day 11 */}
                    {selectedTemplates.day11 && (
                      <div className="review-email-card">
                        <div className="review-email-day">
                          <span className="review-day-badge">Day 11</span>
                          <span className="review-day-label">10 days after</span>
                        </div>
                        <div className="review-email-content">
                          <h4>{selectedTemplates.day11.name}</h4>
                          <p><strong>Subject:</strong> {selectedTemplates.day11.subject_template}</p>
                          <div className="review-email-actions">
                            <button onClick={() => setWizardStep(4)} className="btn-text">
                              <i className="fas fa-edit"></i> Edit
                            </button>
                            <button onClick={() => handleOpenTestEmail(selectedTemplates.day11!)} className="btn-text">
                              <i className="fas fa-paper-plane"></i> Test
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="review-summary">
                    <h4>Campaign Summary</h4>
                    <ul>
                      <li><i className="fas fa-envelope"></i> {[selectedTemplates.day1, selectedTemplates.day3, selectedTemplates.day7, selectedTemplates.day11].filter(Boolean).length} emails</li>
                      <li><i className="fas fa-calendar"></i> 11-day sequence</li>
                      <li><i className="fas fa-users"></i> {addedLeads.length} leads</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Wizard Navigation */}
              <div className="wizard-navigation">
                {wizardStep > 1 && wizardStep <= 4 && (
                  <button className="btn-wizard-back" onClick={handleWizardBack}>
                    <i className="fas fa-arrow-left"></i>
                    Back to Email {wizardStep - 1}
                  </button>
                )}
                {wizardStep === 5 && (
                  <button className="btn-wizard-back" onClick={() => setWizardStep(4)}>
                    <i className="fas fa-arrow-left"></i>
                    Back to Edit
                  </button>
                )}

                <div className="wizard-nav-right">
                  {wizardStep <= 4 && (
                    <button className="btn-wizard-skip" onClick={handleSkipEmail}>
                      Skip Email {wizardStep}
                    </button>
                  )}
                  {wizardStep < 4 && (
                    <button className="btn-wizard-next" onClick={handleWizardNext}>
                      Next: Email {wizardStep + 1}
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  )}
                  {wizardStep === 4 && (
                    <button className="btn-wizard-next" onClick={() => setWizardStep(5)}>
                      Review Sequence
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  )}
                  {wizardStep === 5 && (
                    <button className="btn-wizard-next" onClick={() => setCurrentStep(4)}>
                      Continue to Schedule
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
```

## Next: Apply this replacement to page.tsx lines 1304-1577
