// Web LLM Scheduler Integration
// This script integrates WebLLM for local model inference without API costs

class WebLLMScheduler {
    constructor() {
      this.pipeline = null;
      this.modelInitialized = false;
      this.isInitializing = false;
      this.modelLoaded = false;
      
      // Model and configuration details
      this.modelConfig = {
        model: "Llama-2-7b-chat-q4f16_1", // Quantized model for better performance
        modelPath: "https://huggingface.co/mlc-ai/mlc-chat-Llama-2-7b-chat-q4f16_1-WASM/resolve/main/",
        wasmPath: "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.5/lib/"
      };
    }
  
    // Initialize the WebLLM pipeline
    async initialize() {
      if (this.modelInitialized || this.isInitializing) return;
      
      this.isInitializing = true;
      this.showModelLoadingIndicator(true);
      
      try {
        // Check if WebLLM is available (script loaded)
        if (!window.webllm) {
          await this.loadWebLLMScript();
        }
        
        // Initialize the pipeline
        this.pipeline = new webllm.ChatModule();
        
        await this.pipeline.reload(this.modelConfig.model, {
          model_lib_url: `${this.modelConfig.modelPath}`,
          model_weights_url: `${this.modelConfig.modelPath}`,
          wasm_url: `${this.modelConfig.wasmPath}`
        });
        
        this.modelInitialized = true;
        this.modelLoaded = true;
        this.isInitializing = false;
        
        console.log("WebLLM model initialized successfully!");
        return true;
      } catch (error) {
        console.error("Error initializing WebLLM model:", error);
        this.isInitializing = false;
        
        // Show error notification
        Utils.showNotification("Failed to load LLM model. Please try again or check console for details.", "error");
        return false;
      } finally {
        this.showModelLoadingIndicator(false);
      }
    }
  
    // Load the WebLLM script dynamically
    async loadWebLLMScript() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.5/dist/webllm.js";
        script.onload = resolve;
        script.onerror = () => reject(new Error("Failed to load WebLLM script"));
        document.head.appendChild(script);
      });
    }
  
    // Generate a schedule using the local LLM model
    async generateSchedule(availabilityData, requirements) {
      if (!this.modelInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error("Failed to initialize model");
        }
      }
      
      this.showGenerationLoadingIndicator(true);
      
      try {
        const prompt = this.createPrompt(availabilityData, requirements);
        
        // Call the model
        const response = await this.pipeline.generate(prompt, {
          max_gen_len: 4096,
          temperature: 0.1,
        });
        
        // Parse the JSON from the text response
        const extractedJson = this.extractJsonFromText(response.text);
        
        if (!extractedJson) {
          throw new Error("Failed to parse model response as JSON");
        }
        
        // Add metadata to the response
        extractedJson.weekStart = availabilityData.weekStart;
        extractedJson.weekEnd = availabilityData.weekEnd;
        
        return extractedJson;
      } catch (error) {
        console.error("Error generating schedule:", error);
        Utils.showNotification("Failed to generate schedule: " + error.message, "error");
        throw error;
      } finally {
        this.showGenerationLoadingIndicator(false);
      }
    }
  
    // Create a prompt for the model
    createPrompt(availabilityData, requirements) {
      return `You are a scheduling assistant that generates optimal shift schedules for a 24/7 operation.
  
  AVAILABILITY DATA:
  ${JSON.stringify(availabilityData, null, 2)}
  
  REQUIREMENTS:
  ${JSON.stringify(requirements, null, 2)}
  
  SHIFT DEFINITIONS:
  - Morning A: 7:00-15:00
  - Morning B: 9:00-17:00
  - Noon: 15:00-23:00
  - Night: 23:00-7:00
  
  RULES:
  1. Each employee can work at most 3 shifts per week.
  2. An employee cannot work more than one shift per day.
  3. Night shift employees can work at most 1 night shift per week.
  4. There must be at least 8 hours of rest between shifts.
  5. The schedule should be fair, distributing shifts evenly among available employees.
  
  Your task is to analyze the availability data and create an optimal schedule that satisfies all requirements and constraints.
  
  Return ONLY a JSON object with this structure:
  {
    "schedule": {
      "Sunday": {
        "Morning A": ["Employee1", "Employee2"],
        "Morning B": ["Employee3"],
        "Noon": ["Employee4", "Employee5"],
        "Night": ["Employee6"]
      },
      // other days...
    }
  }
  
  Do not include any explanations, only the valid JSON object.`;
    }
  
    // Extract JSON from text response
    extractJsonFromText(text) {
      // Try to extract JSON from code blocks first
      const jsonCodeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
        try {
          return JSON.parse(jsonCodeBlockMatch[1]);
        } catch (e) {
          console.warn("Failed to parse JSON from code block", e);
        }
      }
      
      // Try to find JSON object in the text
      const jsonObjectMatch = text.match(/(\{[\s\S]*\})/);
      if (jsonObjectMatch && jsonObjectMatch[1]) {
        try {
          return JSON.parse(jsonObjectMatch[1]);
        } catch (e) {
          console.warn("Failed to parse JSON from text", e);
        }
      }
      
      // If all parsing attempts fail, return null
      return null;
    }
  
    // Show model loading indicator
    showModelLoadingIndicator(show) {
      let loadingIndicator = document.getElementById('model-loading-indicator');
      
      if (!loadingIndicator && show) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'model-loading-indicator';
        loadingIndicator.className = 'position-fixed top-50 start-50 translate-middle bg-white p-4 rounded shadow-lg';
        loadingIndicator.style.zIndex = '9999';
        loadingIndicator.innerHTML = `
          <div class="text-center">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <h5>Loading LLM Model</h5>
            <p>This may take a few minutes on first use...</p>
            <div class="progress mt-3">
              <div id="model-load-progress" class="progress-bar progress-bar-striped progress-bar-animated" 
                   role="progressbar" style="width: 0%"></div>
            </div>
          </div>
        `;
        document.body.appendChild(loadingIndicator);
        
        // Simulate progress (since we don't have real progress events)
        this.simulateModelLoadProgress();
      } else if (loadingIndicator && !show) {
        loadingIndicator.remove();
      }
    }
  
    // Show generation loading indicator
    showGenerationLoadingIndicator(show) {
      let loadingIndicator = document.getElementById('generation-loading-indicator');
      
      if (!loadingIndicator && show) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'generation-loading-indicator';
        loadingIndicator.className = 'position-fixed top-50 start-50 translate-middle bg-white p-4 rounded shadow-lg';
        loadingIndicator.style.zIndex = '9999';
        loadingIndicator.innerHTML = `
          <div class="text-center">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <h5>Generating Schedule with LLM</h5>
            <p>Please wait while we create an optimal schedule...</p>
          </div>
        `;
        document.body.appendChild(loadingIndicator);
      } else if (loadingIndicator && !show) {
        loadingIndicator.remove();
      }
    }
  
    // Simulate model load progress
    simulateModelLoadProgress() {
      const progressBar = document.getElementById('model-load-progress');
      if (!progressBar) return;
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        if (progress > 95) {
          clearInterval(interval);
        }
        progressBar.style.width = `${progress}%`;
      }, 1000);
      
      // Clear the interval when the model actually loads
      const checkLoaded = setInterval(() => {
        if (this.modelLoaded) {
          clearInterval(checkLoaded);
          progressBar.style.width = '100%';
        }
      }, 500);
    }
  }
  
 // Display the generated schedule in a modal
function displayGeneratedSchedule(generatedScheduleResponse) {
  // Parse the response string if it's provided as a string
  let generatedSchedule;
  if (typeof generatedScheduleResponse === 'string') {
      try {
          generatedSchedule = JSON.parse(generatedScheduleResponse);
      } catch (error) {
          console.error('Error parsing schedule response:', error);
          Utils.showNotification('Error parsing schedule response', 'error');
          return;
      }
  } else {
      generatedSchedule = generatedScheduleResponse;
  }

  // Get the schedule from the response
  const schedule = generatedSchedule.schedule;
  if (!schedule) {
      console.error('No schedule found in response');
      Utils.showNotification('Invalid schedule format', 'error');
      return;
  }

  // Create a container for the schedule display
  const scheduleContainer = document.createElement('div');
  scheduleContainer.className = 'generated-schedule-container';
  scheduleContainer.innerHTML = '<h3 class="mb-3">Generated Schedule</h3>';

  // Create a table to display the schedule
  const table = document.createElement('table');
  table.className = 'table table-bordered table-striped';

  // Create table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
      <tr>
          <th>Day</th>
          <th>Morning A</th>
          <th>Morning B</th>
          <th>Noon</th>
          <th>Night</th>
      </tr>
  `;
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement('tbody');

  // Days of the week in order
  const days = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 
      'Thursday', 'Friday', 'Saturday'
  ];

  // Populate table rows
  days.forEach(day => {
      const row = document.createElement('tr');
      row.innerHTML = `<td><strong>${day}</strong></td>`;
      
      // Add cells for each shift type
      ['Morning A', 'Morning B', 'Noon', 'Night'].forEach(shift => {
          const cell = document.createElement('td');
          
          // Handle the mixed format of string or array values
          const employees = schedule[day][shift];
          
          if (Array.isArray(employees)) {
              // Handle array of employees
              const assignedEmployees = employees.filter(emp => emp && emp.trim() !== '');
              
              if (assignedEmployees.length > 0) {
                  cell.innerHTML = assignedEmployees.join('<br>');
              } else {
                  cell.innerHTML = '<span class="text-muted">-</span>';
              }
          } else if (employees && employees.trim() !== '') {
              // Handle single employee as string
              cell.textContent = employees;
          } else {
              cell.innerHTML = '<span class="text-muted">-</span>';
          }
          
          row.appendChild(cell);
      });
      
      tbody.appendChild(row);
  });

  table.appendChild(tbody);
  scheduleContainer.appendChild(table);

  // Calculate and display shift counts per employee
  const shiftCounts = calculateShiftCounts(schedule);
  
  // Only show shift counts if there are any
  if (Object.keys(shiftCounts).length > 0) {
      const shiftCountsContainer = document.createElement('div');
      shiftCountsContainer.className = 'shift-counts-container mt-4';
      shiftCountsContainer.innerHTML = '<h4>Shift Distribution</h4>';
      
      const shiftCountsTable = document.createElement('table');
      shiftCountsTable.className = 'table table-sm table-bordered';
      
      const shiftCountsHeader = document.createElement('thead');
      shiftCountsHeader.innerHTML = `
          <tr>
              <th>Employee</th>
              <th>Total Shifts</th>
          </tr>
      `;
      shiftCountsTable.appendChild(shiftCountsHeader);
      
      const shiftCountsBody = document.createElement('tbody');
      Object.entries(shiftCounts)
          .sort((a, b) => b[1] - a[1])
          .forEach(([employee, count]) => {
              const row = document.createElement('tr');
              row.innerHTML = `
                  <td>${employee}</td>
                  <td class="text-center">${count}</td>
              `;
              shiftCountsBody.appendChild(row);
          });
      
      shiftCountsTable.appendChild(shiftCountsBody);
      shiftCountsContainer.appendChild(shiftCountsTable);
      scheduleContainer.appendChild(shiftCountsContainer);
  }

  // Add buttons for scheduling actions
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'mt-4 d-flex justify-content-end';
  
  const applyButton = document.createElement('button');
  applyButton.className = 'btn btn-success me-2';
  applyButton.innerHTML = '<i class="fa-solid fa-check me-2"></i>Apply Schedule';
  applyButton.onclick = () => applyGeneratedSchedule(generatedSchedule);
  
  const dismissButton = document.createElement('button');
  dismissButton.className = 'btn btn-secondary';
  dismissButton.innerHTML = 'Dismiss';
  dismissButton.onclick = () => {
      const modal = bootstrap.Modal.getInstance(document.getElementById('aiScheduleModal'));
      if (modal) modal.hide();
  };
  
  buttonContainer.appendChild(applyButton);
  buttonContainer.appendChild(dismissButton);
  scheduleContainer.appendChild(buttonContainer);

  // Show in a modal
  showScheduleModal(scheduleContainer);
}

// Helper function to calculate shift counts from the mixed format schedule
function calculateShiftCounts(schedule) {
  const shiftCounts = {};

  // Iterate through each day
  Object.values(schedule).forEach(daySchedule => {
      // Iterate through each shift type
      Object.entries(daySchedule).forEach(([shiftType, employees]) => {
          // Handle both string and array formats
          if (Array.isArray(employees)) {
              employees.forEach(employee => {
                  if (employee && employee.trim() !== '') {
                      shiftCounts[employee] = (shiftCounts[employee] || 0) + 1;
                  }
              });
          } else if (employees && employees.trim() !== '') {
              shiftCounts[employees] = (shiftCounts[employees] || 0) + 1;
          }
      });
  });

  return shiftCounts;
}

function showScheduleModal(content) {
  // Look for existing modal or create new one
  let modal = document.getElementById('aiScheduleModal');
  
  if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'aiScheduleModal';
      modal.setAttribute('tabindex', '-1');
      modal.setAttribute('aria-labelledby', 'aiScheduleModalLabel');
      modal.setAttribute('aria-hidden', 'true');
      
      modal.innerHTML = `
          <div class="modal-dialog modal-lg">
              <div class="modal-content">
                  <div class="modal-header">
                      <h5 class="modal-title" id="aiScheduleModalLabel">AI Generated Schedule</h5>
                      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                      <!-- Content will be injected here -->
                  </div>
              </div>
          </div>
      `;
      
      document.body.appendChild(modal);
  }
  
  // Update modal content
  const modalBody = modal.querySelector('.modal-body');
  modalBody.innerHTML = '';
  modalBody.appendChild(content);
  
  // Show the modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

// Function to apply the generated schedule to the app
function applyGeneratedSchedule(scheduleData) {
  try {
      // Check if app is initialized
      if (!window.ShiftApp || !window.ShiftApp.shiftManager) {
          Utils.showNotification('Application not properly initialized', 'error');
          return;
      }
      
      // Get the current week or use current date
      const weekStarting = window.ShiftApp.shiftManager.currentWeek || 
                          Utils.formatDateForInput(Utils.getWeekStartDate(new Date()));
      
      // Set the current week
      window.ShiftApp.shiftManager.currentWeek = weekStarting;
      
      // Clear existing assignments
      window.ShiftApp.employeeManager.clearAllShiftAssignments();
      
      // Get the schedule
      const schedule = scheduleData.schedule;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Assign employees
      days.forEach(day => {
          if (schedule[day]) {
              Object.entries(schedule[day]).forEach(([shift, employees]) => {
                  // Handle both string and array formats
                  if (Array.isArray(employees)) {
                      employees.forEach(empName => {
                          if (empName && empName.trim() !== '') {
                              try {
                                  const employee = window.ShiftApp.employeeManager.getEmployee(empName);
                                  employee.assignShift(day, shift);
                              } catch (error) {
                                  console.warn(`Failed to assign ${shift} to ${empName}: ${error.message}`);
                              }
                          }
                      });
                  } else if (employees && employees.trim() !== '') {
                      try {
                          const employee = window.ShiftApp.employeeManager.getEmployee(employees);
                          employee.assignShift(day, shift);
                      } catch (error) {
                          console.warn(`Failed to assign ${shift} to ${employees}: ${error.message}`);
                      }
                  }
              });
          }
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
      
      // Hide the modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('aiScheduleModal'));
      if (modal) modal.hide();
      
      // Show success notification
      Utils.showNotification('AI schedule applied successfully', 'success');
      
      // Switch to daily view tab
      showTab('daily-tab');
      
  } catch (error) {
      console.error('Error applying generated schedule:', error);
      Utils.showNotification(`Failed to apply schedule: ${error.message}`, 'error');
  }
}

// Export for use in other modules
window.displayGeneratedSchedule = displayGeneratedSchedule;
window.applyGeneratedSchedule = applyGeneratedSchedule;
  
  // Prepare availability data from the application
  function prepareAvailabilityData() {
    // Get the week starting date
    const weekStartingInput = document.getElementById('schedule-week');
    if (!weekStartingInput || !weekStartingInput.value) {
      Utils.showNotification('Please select a week', 'warning');
      return null;
    }
    
    const weekStart = new Date(weekStartingInput.value);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Get availability data from the manager
    if (!window.ShiftApp || !window.ShiftApp.availabilityManager) {
      Utils.showNotification('Application is not properly initialized', 'error');
      return null;
    }
    
    const submissions = window.ShiftApp.availabilityManager.getWeekSubmissions(weekStartingInput.value);
    
    if (submissions.length === 0) {
      Utils.showNotification('No availability submissions found for this week', 'warning');
      return null;
    }
    
    // Format the data for the model
    return {
      weekStart: weekStartingInput.value,
      weekEnd: Utils.formatDateForInput(weekEnd),
      lastUpdated: new Date().toISOString(),
      submissions: submissions.map(sub => ({
        employee: sub.employee,
        submittedOn: sub.submittedOn,
        notes: sub.notes || '',
        availableShifts: sub.availableShifts
      }))
    };
  }
  
  // Initialize the LLM scheduler integration
  const webLLMScheduler = new WebLLMScheduler();
  
  // Add the LLM scheduler button to the schedule generation modal
  function initLLMSchedulerIntegration() {
    // Wait for the app to be initialized
    if (!window.ShiftApp) {
      setTimeout(initLLMSchedulerIntegration, 500);
      return;
    }
    
    // Add button to schedule generation modal
    const modalFooter = document.querySelector('#scheduleGenerationModal .modal-footer');
    if (modalFooter) {
      // Add the LLM generation button
      const llmButton = document.createElement('button');
      llmButton.type = 'button';
      llmButton.className = 'btn btn-primary me-auto';
      llmButton.id = 'generate-llm-schedule-btn';
      llmButton.innerHTML = '<i class="fa-solid fa-brain me-2"></i>Generate with Local LLM';
      
      // Add event listener
      llmButton.addEventListener('click', async () => {
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleGenerationModal'));
        if (modal) modal.hide();
        
        // Get availability data
        const availabilityData = prepareAvailabilityData();
        if (!availabilityData) return;
        
        // Get requirements data
        const requirementsData = window.ShiftApp.requirementsManager.requirements;
        
        try {
          // Generate the schedule
          const generatedSchedule = await webLLMScheduler.generateSchedule(availabilityData, requirementsData);
          
          // Display the generated schedule
          if (generatedSchedule) {
            displayGeneratedSchedule(generatedSchedule);
          }
        } catch (error) {
          console.error('Error generating schedule:', error);
        }
      });
      
      // Add the button to the modal footer
      modalFooter.prepend(llmButton);
    }
    
    // Also add a button to the dashboard workflow steps
    const workflowSteps = document.querySelector('.workflow-steps');
    if (workflowSteps) {
      const aiStep = document.createElement('div');
      aiStep.className = 'workflow-step';
      aiStep.innerHTML = `
        <div class="step-number">AI</div>
        <div class="step-content">
          <h5>Local LLM Scheduling</h5>
          <p>Generate schedules with a local language model (no API costs)</p>
          <button class="btn btn-primary btn-sm" id="dashboard-llm-btn">
            <i class="fa-solid fa-brain me-2"></i>Initialize LLM
          </button>
        </div>
      `;
      workflowSteps.appendChild(aiStep);
      
      // Add event listener
      document.getElementById('dashboard-llm-btn').addEventListener('click', async () => {
        try {
          // Try to initialize the model
          await webLLMScheduler.initialize();
          
          if (webLLMScheduler.modelInitialized) {
            Utils.showNotification('LLM model initialized successfully! You can now generate schedules.', 'success');
            
            // Update button text
            const button = document.getElementById('dashboard-llm-btn');
            button.innerHTML = '<i class="fa-solid fa-check me-2"></i>LLM Ready';
            button.classList.remove('btn-primary');
            button.classList.add('btn-success');
          }
        } catch (error) {
          console.error('Error initializing LLM:', error);
        }
      });
    }
  }
  
  // Initialize when the DOM is loaded
  document.addEventListener('DOMContentLoaded', initLLMSchedulerIntegration);