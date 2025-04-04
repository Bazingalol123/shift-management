// AI Schedule Integration
class AIScheduleIntegration {
    constructor(apiKey, requirementsManager) {
        this.apiKey = apiKey;
        this.requirementsManager = requirementsManager;
        this.scheduleGenerator = new OpenAIScheduleGenerator(apiKey);
        this.scheduleUI = null;
    }

    /**
     * Initialize the AI schedule generation feature
     */
    initialize() {
        // Add AI Schedule tab to the UI
        this.addAIScheduleTab();
        
        // Add AI generation button to the schedule generation modal
        this.addAIGenerationButton();
    }

    /**
     * Add AI Schedule tab to the UI
     */
    addAIScheduleTab() {
        // Add tab to the nav tabs
        const viewTabs = document.getElementById('viewTabs');
        if (!viewTabs) return;

        const aiTabItem = document.createElement('li');
        aiTabItem.className = 'nav-item';
        aiTabItem.role = 'presentation';
        aiTabItem.innerHTML = `
            <button class="nav-link" id="ai-schedule-tab" data-bs-toggle="tab" 
                    data-bs-target="#ai-schedule-view" type="button" role="tab" 
                    aria-controls="ai-schedule-view" aria-selected="false">
                <i class="fa-solid fa-robot me-2"></i>AI Schedule
            </button>
        `;
        viewTabs.appendChild(aiTabItem);

        // Add tab content
        const tabContent = document.getElementById('viewTabContent');
        if (!tabContent) return;

        const aiScheduleView = document.createElement('div');
        aiScheduleView.className = 'tab-pane fade';
        aiScheduleView.id = 'ai-schedule-view';
        aiScheduleView.role = 'tabpanel';
        aiScheduleView.setAttribute('aria-labelledby', 'ai-schedule-tab');

        aiScheduleView.innerHTML = `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">AI-Generated Schedule</h5>
                    <div>
                        <button class="btn btn-outline-primary btn-sm me-2" id="ai-generate-btn">
                            <i class="fa-solid fa-wand-magic-sparkles me-1"></i>Generate with AI
                        </button>
                        <button class="btn btn-outline-success btn-sm me-2" id="ai-accept-schedule">
                            <i class="fa-solid fa-check me-1"></i>Accept Schedule
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" id="ai-export-btn">
                            <i class="fa-solid fa-file-export me-1"></i>Export
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="alert alert-info mb-3">
                        <i class="fa-solid fa-circle-info me-2"></i>
                        This feature uses AI to generate an optimal schedule based on employee availability and shift requirements. 
                        You can drag and drop employees to make manual adjustments after generation.
                    </div>
                    
                    <div class="mb-3">
                        <label for="ai-schedule-week" class="form-label">Week Starting</label>
                        <input type="date" class="form-control" id="ai-schedule-week" required>
                    </div>
                    
                    <div id="ai-schedule-container" class="mt-4">
                        <!-- Schedule will be rendered here -->
                        <div class="alert alert-secondary text-center p-5">
                            <i class="fa-solid fa-robot fa-2x mb-3"></i>
                            <h5>No AI Schedule Generated Yet</h5>
                            <p>Click the "Generate with AI" button to create a new schedule.</p>
                        </div>
                    </div>
                    
                    <div id="ai-loading" class="text-center p-5 d-none">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <h5>Generating Schedule</h5>
                        <p>Please wait while our AI analyzes availability data and generates an optimal schedule...</p>
                    </div>
                </div>
            </div>
        `;
        
        tabContent.appendChild(aiScheduleView);
        
        // Initialize event listeners for the new tab
        this.initializeAITabListeners();
    }
    
    /**
     * Add AI generation button to the schedule generation modal
     */
    addAIGenerationButton() {
        const modalFooter = document.querySelector('#scheduleGenerationModal .modal-footer');
        if (!modalFooter) return;
        
        const aiBtn = document.createElement('button');
        aiBtn.type = 'button';
        aiBtn.className = 'btn btn-primary me-auto';
        aiBtn.id = 'ai-generate-modal-btn';
        aiBtn.innerHTML = '<i class="fa-solid fa-robot me-2"></i>Generate with AI';
        
        modalFooter.prepend(aiBtn);
        
        // Add event listener
        aiBtn.addEventListener('click', () => {
            const weekInput = document.getElementById('schedule-week');
            if (!weekInput || !weekInput.value) {
                Utils.showNotification('Please select a week', 'warning');
                return;
            }
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleGenerationModal'));
            if (modal) modal.hide();
            
            // Switch to the AI tab and generate
            this.switchToAITab();
            
            // Set the selected week in the AI tab
            const aiWeekInput = document.getElementById('ai-schedule-week');
            if (aiWeekInput) aiWeekInput.value = weekInput.value;
            
            // Generate the schedule
            this.generateSchedule(weekInput.value);
        });
    }
    
    /**
     * Initialize event listeners for the AI schedule tab
     */
    initializeAITabListeners() {
        // Generate button click
        const generateBtn = document.getElementById('ai-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                const weekInput = document.getElementById('ai-schedule-week');
                if (!weekInput || !weekInput.value) {
                    Utils.showNotification('Please select a week', 'warning');
                    return;
                }
                
                this.generateSchedule(weekInput.value);
            });
        }
        
        // Accept schedule button click
        const acceptBtn = document.getElementById('ai-accept-schedule');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                this.acceptSchedule();
            });
        }
        
        // Export button click
        const exportBtn = document.getElementById('ai-export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSchedule();
            });
        }
        
        // Set current week as default
        const weekInput = document.getElementById('ai-schedule-week');
        if (weekInput) {
            const today = new Date();
            const weekStart = Utils.getWeekStartDate(today);
            weekInput.value = Utils.formatDateForInput(weekStart);
        }
    }
    
    /**
     * Switch to the AI Schedule tab
     */
    switchToAITab() {
        const tab = document.getElementById('ai-schedule-tab');
        if (tab) {
            const bsTab = new bootstrap.Tab(tab);
            bsTab.show();
        }
    }
    
    /**
     * Generate a schedule using the AI service
     * @param {string} weekStarting - Week starting date in YYYY-MM-DD format
     */
    async generateSchedule(weekStarting) {
        try {
            // Check for required dependencies
            if (!window.ShiftApp || !window.ShiftApp.availabilityManager) {
                Utils.showNotification('Application not properly initialized', 'error');
                return;
            }
            
            // Show loading state
            this.toggleLoading(true);
            
            // Get availability submissions for the week
            const submissions = window.ShiftApp.availabilityManager.getWeekSubmissions(weekStarting);
            
            if (submissions.length === 0) {
                Utils.showNotification('No availability submissions found for this week', 'warning');
                this.toggleLoading(false);
                return;
            }
            
            // Create date for week ending (6 days after start)
            const weekStart = new Date(weekStarting);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            // Format the availability data for the API
            const availabilityData = {
                weekStart: weekStarting,
                weekEnd: Utils.formatDateForInput(weekEnd),
                lastUpdated: new Date().toISOString(),
                submissions: submissions.map(sub => ({
                    employee: sub.employee,
                    submittedOn: sub.submittedOn,
                    notes: sub.notes || '',
                    availableShifts: sub.availableShifts
                }))
            };
            
            // Get requirements
            const requirements = this.requirementsManager.requirements;
            
            // Call the OpenAI service
            const scheduleData = await this.scheduleGenerator.generateSchedule(availabilityData, requirements);
            
            // Validate the generated schedule
            const validation = this.scheduleGenerator.validateSchedule(scheduleData, availabilityData, requirements);
            
            if (!validation.valid) {
                console.warn('Schedule validation warnings:', validation.warnings);
                console.error('Schedule validation errors:', validation.errors);
                
                if (validation.errors.length > 0) {
                    Utils.showNotification(`Schedule validation failed: ${validation.errors[0]}`, 'warning');
                }
            }
            
            // Initialize or update the UI
            const container = document.getElementById('ai-schedule-container');
            if (container) {
                if (!this.scheduleUI) {
                    this.scheduleUI = new ScheduleUIManager('ai-schedule-container', scheduleData, this.handleScheduleChange.bind(this));
                } else {
                    this.scheduleUI.updateSchedule(scheduleData);
                }
            }
            
            Utils.showNotification('Schedule generated successfully', 'success');
            
        } catch (error) {
            console.error('Error generating schedule:', error);
            Utils.showNotification(`Failed to generate schedule: ${error.message}`, 'error');
        } finally {
            this.toggleLoading(false);
        }
    }
    
    /**
     * Handle schedule changes from drag and drop operations
     * @param {Object} updatedSchedule - The updated schedule data
     */
    handleScheduleChange(updatedSchedule) {
        console.log('Schedule updated via drag and drop');
        // This function is called when the user makes changes to the schedule via drag and drop
        // You can add additional logic here if needed, such as updating validation status
    }
    
    /**
     * Accept the AI-generated schedule and integrate it with the main application
     */
    acceptSchedule() {
        if (!this.scheduleUI || !this.scheduleUI.scheduleData) {
            Utils.showNotification('No schedule has been generated yet', 'warning');
            return;
        }
        
        try {
            // Get the week starting date
            const weekInput = document.getElementById('ai-schedule-week');
            const weekStarting = weekInput ? weekInput.value : null;
            
            if (!weekStarting) {
                Utils.showNotification('Week starting date not selected', 'warning');
                return;
            }
            
            // Convert the AI schedule format to the app's format
            const aiSchedule = this.scheduleUI.scheduleData.schedule;
            
            // Update the application's schedule manager
            if (window.ShiftApp && window.ShiftApp.shiftManager) {
                // Set the current week
                window.ShiftApp.shiftManager.currentWeek = weekStarting;
                
                // Clear existing assignments
                window.ShiftApp.employeeManager.clearAllShiftAssignments();
                
                // Copy the schedule and assign shifts to employees
                DAYS.forEach(day => {
                    Object.values(SHIFTS).forEach(shift => {
                        const employees = aiSchedule[day]?.[shift.id] || [];
                        employees.forEach(empName => {
                            try {
                                const employee = window.ShiftApp.employeeManager.getEmployee(empName);
                                employee.assignShift(day, shift.id);
                            } catch (error) {
                                console.warn(`Failed to assign shift to ${empName}:`, error.message);
                            }
                        });
                    });
                });
                
                // Save the schedule
                window.ShiftApp.shiftManager.saveSchedule();
                
                // Update UI components
                if (window.ShiftApp.uiManager) {
                    window.ShiftApp.uiManager.updateDailyScheduleView();
                    window.ShiftApp.uiManager.updateWeeklyScheduleView();
                    window.ShiftApp.uiManager.updateDashboardStats();
                    window.ShiftApp.uiManager.updateScheduleVisibility();
                }
                
                Utils.showNotification('Schedule accepted and saved', 'success');
                
                // Switch to daily view tab
                showTab('daily-tab');
            } else {
                Utils.showNotification('Schedule manager not available', 'error');
            }
        } catch (error) {
            console.error('Error accepting schedule:', error);
            Utils.showNotification(`Failed to accept schedule: ${error.message}`, 'error');
        }
    }
    
    /**
     * Export the AI-generated schedule to JSON
     */
    exportSchedule() {
        if (!this.scheduleUI || !this.scheduleUI.scheduleData) {
            Utils.showNotification('No schedule has been generated yet', 'warning');
            return;
        }
        
        try {
            // Get the week starting date
            const weekInput = document.getElementById('ai-schedule-week');
            const weekStarting = weekInput ? weekInput.value : Utils.formatDateForInput(new Date());
            
            // Export to JSON file
            Utils.saveJsonToFile(
                this.scheduleUI.scheduleData, 
                `ai_schedule_${weekStarting}.json`
            );
            
            Utils.showNotification('Schedule exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting schedule:', error);
            Utils.showNotification(`Failed to export schedule: ${error.message}`, 'error');
        }
    }
    
    /**
     * Toggle loading state
     * @param {boolean} isLoading - Whether to show or hide loading indicator
     */
    toggleLoading(isLoading) {
        const container = document.getElementById('ai-schedule-container');
        const loading = document.getElementById('ai-loading');
        
        if (container && loading) {
            container.classList.toggle('d-none', isLoading);
            loading.classList.toggle('d-none', !isLoading);
        }
    }
}

// Initialize the AI Schedule Integration
function initializeAIScheduleIntegration() {
    // Check if the application is initialized
    if (!window.ShiftApp) {
        console.warn('ShiftApp not initialized yet, will retry in 500ms');
        setTimeout(initializeAIScheduleIntegration, 500);
        return;
    }
    
    // Get API key from configuration (you should implement a secure way to handle API keys)
    let apiKey = '';
    
    // In a real app, you might want to prompt the user to enter their API key
    // or load it from a secure configuration
    
    // For demo purposes, we'll create a modal to input the API key
    const promptForApiKey = () => {
        const apiKeyModal = document.createElement('div');
        apiKeyModal.className = 'modal fade';
        apiKeyModal.id = 'apiKeyModal';
        apiKeyModal.tabIndex = '-1';
        apiKeyModal.setAttribute('aria-labelledby', 'apiKeyModalLabel');
        apiKeyModal.setAttribute('aria-hidden', 'true');
        
        apiKeyModal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="apiKeyModalLabel">OpenAI API Key</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fa-solid fa-circle-info me-2"></i>
                            To use the AI scheduling feature, you need to provide your OpenAI API key.
                            Your key is stored only in your browser's local storage and is never sent to our servers.
                        </div>
                        <div class="mb-3">
                            <label for="openai-api-key" class="form-label">API Key</label>
                            <input type="password" class="form-control" id="openai-api-key" placeholder="sk-...">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="save-api-key">Save Key</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(apiKeyModal);
        
        // Initialize the modal
        const modal = new bootstrap.Modal(apiKeyModal);
        modal.show();
        
        // Handle save button
        const saveBtn = document.getElementById('save-api-key');
        saveBtn.addEventListener('click', () => {
            const inputKey = document.getElementById('openai-api-key').value;
            if (inputKey && inputKey.startsWith('sk-')) {
                // Save to local storage (in a real app, use a more secure method)
                localStorage.setItem('openai_api_key', inputKey);
                apiKey = inputKey;
                modal.hide();
                
                // Initialize with the provided key
                const aiIntegration = new AIScheduleIntegration(
                    apiKey, 
                    window.ShiftApp.requirementsManager
                );
                aiIntegration.initialize();
                
                Utils.showNotification('AI scheduling feature activated', 'success');
            } else {
                Utils.showNotification('Please enter a valid OpenAI API key', 'warning');
            }
        });
    };
    
    // Check if we have a saved API key
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey && savedApiKey.startsWith('sk-')) {
        apiKey = savedApiKey;
        const aiIntegration = new AIScheduleIntegration(
            apiKey, 
            window.ShiftApp.requirementsManager
        );
        aiIntegration.initialize();
    } else {
        // Add button to initialize AI feature
        const workflowSteps = document.querySelector('.workflow-steps');
        if (workflowSteps) {
            // Add an AI step
            const aiStep = document.createElement('div');
            aiStep.className = 'workflow-step';
            aiStep.innerHTML = `
                <div class="step-number">AI</div>
                <div class="step-content">
                    <h5>AI Schedule Generation</h5>
                    <p>Use AI to create an optimal schedule based on availability</p>
                    <button class="btn btn-primary btn-sm" id="activate-ai-btn">
                        <i class="fa-solid fa-robot me-2"></i>Activate AI Feature
                    </button>
                </div>
            `;
            workflowSteps.appendChild(aiStep);
            
            // Add event listener
            const activateBtn = document.getElementById('activate-ai-btn');
            if (activateBtn) {
                activateBtn.addEventListener('click', promptForApiKey);
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add slight delay to ensure ShiftApp is initialized
    setTimeout(initializeAIScheduleIntegration, 1000);
});