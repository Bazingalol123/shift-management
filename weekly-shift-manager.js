/**
 * Weekly Shift Manager - Integration for the Shift Management system
 * 
 * This script enhances the shift management system to:
 * 1. Use weekly availability files instead of individual submissions
 * 2. Auto-snap date selection to week boundaries (Sundays)
 * 3. Generate schedules from weekly availability files
 */

// ============= WEEKLY DATE UTILITIES =============

function getWeekStartDate(date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay(); // 0 for Sunday
  weekStart.setDate(weekStart.getDate() - day);
  return weekStart;
}

function getWeekEndDate(date) {
  const weekEnd = getWeekStartDate(date);
  weekEnd.setDate(weekEnd.getDate() + 6); // End on Saturday
  return weekEnd;
}

function formatWeeklyFileName(startDate) {
  // Format: availability_YYYY-MM-DD_YYYY-MM-DD.json
  const endDate = getWeekEndDate(startDate);
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
  
  return `availability_${formatDate(startDate)}_${formatDate(endDate)}.json`;
}

// Helper function to format dates for display
function formatDateForDisplay(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// ============= GITHUB INTEGRATION FOR WEEKLY FILES =============

// Check if a weekly file already exists on GitHub
async function checkWeeklyFileExists(startDate) {
  try {
    const weeklyFileName = formatWeeklyFileName(startDate);
    const filePath = `shifts/weekly/${weeklyFileName}`;
    
    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/${filePath}`;
    
    console.log('Checking if file exists at:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: { 
        'Authorization': `token ${GITHUB_CONFIG.TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    console.log('File check response status:', response.status);
    return response.status === 200;
  } catch (error) {
    console.error('Error checking if weekly file exists:', error);
    return false;
  }
}

// Get weekly availability data from GitHub or create empty structure
async function getWeeklyAvailabilityData(startDate) {
  try {
    const weeklyFileName = formatWeeklyFileName(startDate);
    const filePath = `shifts/weekly/${weeklyFileName}`;
    
    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/${filePath}`;
    
    const response = await fetch(apiUrl, {
      headers: { 
        'Authorization': `token ${GITHUB_CONFIG.TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.status === 200) {
      const data = await response.json();
      const content = atob(data.content);
      return {
        data: JSON.parse(content),
        sha: data.sha
      };
    } else {
      // Create new empty weekly data
      const endDate = getWeekEndDate(startDate);
      return {
        data: {
          weekStart: startDate.toISOString().split('T')[0],
          weekEnd: endDate.toISOString().split('T')[0],
          lastUpdated: new Date().toISOString(),
          submissions: []
        },
        sha: null
      };
    }
  } catch (error) {
    console.error('Error getting weekly availability data:', error);
    // Return empty structure
    const endDate = getWeekEndDate(startDate);
    return {
      data: {
        weekStart: startDate.toISOString().split('T')[0],
        weekEnd: endDate.toISOString().split('T')[0],
        lastUpdated: new Date().toISOString(),
        submissions: []
      },
      sha: null
    };
  }
}

// Save weekly availability data to GitHub
async function saveWeeklyAvailabilityData(startDate, availabilityData, sha = null) {
  try {
    console.log('Saving weekly data to GitHub...');
    const weeklyFileName = formatWeeklyFileName(startDate);
    const filePath = `shifts/weekly/${weeklyFileName}`;
    
    // Make sure the data has the correct format
    if (!availabilityData.weekStart) {
      const endDate = getWeekEndDate(startDate);
      availabilityData.weekStart = startDate.toISOString().split('T')[0];
      availabilityData.weekEnd = endDate.toISOString().split('T')[0];
    }
    
    availabilityData.lastUpdated = new Date().toISOString();
    
    console.log('Data to save:', availabilityData);
    
    // Encode content to base64
    const encodedContent = btoa(unescape(encodeURIComponent(JSON.stringify(availabilityData, null, 2))));
    
    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/${filePath}`;
    console.log('Saving to URL:', apiUrl);
    
    const data = {
      message: `Update weekly availability for ${availabilityData.weekStart} to ${availabilityData.weekEnd}`,
      content: encodedContent,
      branch: GITHUB_CONFIG.BRANCH
    };
    
    if (sha) {
      data.sha = sha;
    }
    
    console.log('Request data:', data);
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(data)
    });
    
    console.log('Save response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error response:', errorText);
      throw new Error(`GitHub API error: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Save successful, result:', result);
    
    return { 
      success: true, 
      message: "Weekly availability saved successfully", 
      url: result.content.html_url,
      sha: result.content.sha
    };
  } catch (error) {
    console.error('Error saving weekly availability data:', error);
    return { success: false, message: error.message };
  }
}

// Add or update a submission in the weekly file
async function updateWeeklySubmission(employeeName, startDate, availableShifts, notes = "") {
  try {
    // Convert startDate to Sunday if it's not already
    const weekStartDate = getWeekStartDate(new Date(startDate));
    
    // Get current weekly data or create new structure
    const { data: weeklyData, sha } = await getWeeklyAvailabilityData(weekStartDate);
    
    // Find existing submission or prepare to add new one
    const existingSubmissionIndex = weeklyData.submissions.findIndex(
      sub => sub.employee === employeeName
    );
    
    const submissionData = {
      employee: employeeName,
      submittedOn: new Date().toISOString(),
      notes: notes,
      availableShifts: availableShifts
    };
    
    if (existingSubmissionIndex >= 0) {
      // Update existing submission
      weeklyData.submissions[existingSubmissionIndex] = submissionData;
    } else {
      // Add new submission
      weeklyData.submissions.push(submissionData);
    }
    
    // Save updated data back to GitHub
    const result = await saveWeeklyAvailabilityData(weekStartDate, weeklyData, sha);
    return result;
  } catch (error) {
    console.error('Error updating weekly submission:', error);
    return { success: false, message: error.message };
  }
}

// Get all submissions for a specific week
async function getWeekSubmissions(startDate) {
  try {
    // Convert startDate to Sunday if it's not already
    const weekStartDate = getWeekStartDate(new Date(startDate));
    
    // Get current weekly data
    const { data: weeklyData } = await getWeeklyAvailabilityData(weekStartDate);
    
    return weeklyData.submissions || [];
  } catch (error) {
    console.error('Error getting week submissions:', error);
    return [];
  }
}

// ============= FORM AND UI INTEGRATION =============

// Function to save availability to weekly file
async function saveAvailabilityToWeeklyFile(employeeName, weekStartingInput, availableShifts, notes = "") {
  try {
    // Make sure we have a proper date object for the week's Sunday
    const weekStartDate = getWeekStartDate(new Date(weekStartingInput));
    
    // Format for UI display
    const weekEndDate = getWeekEndDate(weekStartDate);
    const formattedStart = formatDateForDisplay(weekStartDate);
    const formattedEnd = formatDateForDisplay(weekEndDate);
    
    // Call the function to update the submission in the weekly file
    const result = await updateWeeklySubmission(employeeName, weekStartDate, availableShifts, notes);
    
    if (result.success) {
      showNotification(`Availability saved for week ${formattedStart} - ${formattedEnd}`, 'success');
      return true;
    } else {
      showNotification(`Error saving availability: ${result.message}`, 'error');
      return false;
    }
  } catch (error) {
    console.error('Error saving availability to weekly file:', error);
    showNotification(`Error: ${error.message}`, 'error');
    return false;
  }
}

// Add this to weekly-shift-manager.js
async function syncWeeklyFileWithAvailabilityManager(weekStartingInput, availabilityManager) {
  try {
    // Get the proper week start date
    const weekStartDate = getWeekStartDate(new Date(weekStartingInput));
    const formattedDate = weekStartDate.toISOString().split('T')[0];
    
    // Get submissions from GitHub
    const submissions = await getWeekSubmissions(weekStartDate);
    
    // Get existing submissions
    const existingSubmissions = availabilityManager.submissions;
    const filteredSubmissions = existingSubmissions.filter(
      sub => sub.weekStarting !== formattedDate
    );
    
    // Add submissions from GitHub
    const updatedSubmissions = [...filteredSubmissions];
    
    submissions.forEach(sub => {
      updatedSubmissions.push({
        id: Date.now() + Math.random(), // Generate a unique ID
        employee: sub.employee,
        weekStarting: formattedDate,
        availableShifts: sub.availableShifts,
        notes: sub.notes || "",
        submittedOn: sub.submittedOn
      });
    });
    
    // Use the global function to update
    return window.updateAvailabilitySubmissions(updatedSubmissions);
  } catch (error) {
    console.error('Error syncing weekly file:', error);
    return false;
  }
}

// Update the date input to handle week selection
function setupWeekSelection() {
  // Find all week-related date inputs
  const weekInputs = document.querySelectorAll('#availability-week, #schedule-week');
  
  weekInputs.forEach(input => {
    if (!input) return;
    
    // Change label from "Week Starting" to "Week"
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) {
      label.textContent = 'Week';
    }
    
    // Set initial value to current week's Sunday
    input.value = Utils.formatDateForInput(getWeekStartDate(new Date()));
    
    // Add change handler to snap to nearest Sunday
    input.addEventListener('change', function() {
      const selectedDate = new Date(this.value);
      const weekStartDate = getWeekStartDate(selectedDate);
      this.value = Utils.formatDateForInput(weekStartDate);
      
      // Show the week range in a small text below
      const weekEndDate = getWeekEndDate(weekStartDate);
      
      // Create or update the week range display
      let rangeDisplay = input.nextElementSibling;
      
      if (!rangeDisplay || !rangeDisplay.classList.contains('week-range-display')) {
        rangeDisplay = document.createElement('small');
        rangeDisplay.className = 'text-muted d-block mt-1 week-range-display';
        input.parentNode.insertBefore(rangeDisplay, input.nextSibling);
      }
      
      // Format dates for display
      const formatDateSimple = (date) => {
        return date.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'numeric'
        });
      };
      
      rangeDisplay.textContent = `Range: ${formatDateSimple(weekStartDate)} - ${formatDateSimple(weekEndDate)}`;
    });
    
    // Trigger the change event to initialize the display
    const event = new Event('change');
    input.dispatchEvent(event);
  });
}

// Function to update labels
function updateDateInputLabels() {
  // Update availability week label
  const availabilityWeekLabel = document.querySelector('label[for="availability-week"]');
  if (availabilityWeekLabel) {
    availabilityWeekLabel.textContent = 'Week';
  }
  
  // Update schedule week label
  const scheduleWeekLabel = document.querySelector('label[for="schedule-week"]');
  if (scheduleWeekLabel) {
    scheduleWeekLabel.textContent = 'Week';
  }
  
  // Add information tooltips
  const inputs = document.querySelectorAll('#availability-week, #schedule-week');
  inputs.forEach(input => {
    // Add a tooltip icon
    const parent = input.parentNode;
    const tooltip = document.createElement('i');
    tooltip.className = 'fa-solid fa-circle-info ms-2 text-info';
    tooltip.title = 'Dates will automatically snap to the week\'s Sunday';
    tooltip.style.cursor = 'help';
    
    if (parent.querySelector('label')) {
      parent.querySelector('label').appendChild(tooltip);
    }
  });
}

// Add a button to add weekly file check to availability form
function addWeeklyFileCheckToForm() {
  const form = document.getElementById('availability-form');
  if (!form) return false;
  
  const submitBtn = form.querySelector('button[type="submit"]');
  if (!submitBtn) return false;
  
  // Create a container for the weekly file status
  const weekInput = document.getElementById('availability-week');
  if (weekInput) {
    const statusContainer = document.createElement('div');
    statusContainer.id = 'weekly-file-status-form';
    statusContainer.className = 'mt-2 small';
    weekInput.parentNode.appendChild(statusContainer);
    
    // Create button for creating weekly file if needed
    const createFileBtn = document.createElement('button');
    createFileBtn.type = 'button';
    createFileBtn.id = 'create-weekly-file-btn';
    createFileBtn.className = 'btn btn-outline-primary btn-sm mt-2 d-none';
    createFileBtn.innerHTML = '<i class="fa-solid fa-file-circle-plus me-1"></i>Create Weekly File';
    
    weekInput.parentNode.appendChild(createFileBtn);
    
    // Add handler for create file button
    createFileBtn.onclick = async function() {
      console.log('Create file button clicked');
      try {
        const weekStartDate = getWeekStartDate(new Date(weekInput.value));
        
        // Show loading state
        const originalText = createFileBtn.innerHTML;
        createFileBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Creating...';
        createFileBtn.disabled = true;
        
        // Create empty weekly file
        const result = await saveWeeklyAvailabilityData(weekStartDate, {
          weekStart: weekStartDate.toISOString().split('T')[0],
          weekEnd: getWeekEndDate(weekStartDate).toISOString().split('T')[0],
          lastUpdated: new Date().toISOString(),
          submissions: []
        });
        
        // Reset button state
        createFileBtn.disabled = false;
        createFileBtn.innerHTML = originalText;
        
        if (result.success) {
          showNotification('Weekly file created successfully', 'success');
          checkFormWeeklyFileStatus(); // Update status
        } else {
          showNotification(`Error: ${result.message}`, 'error');
        }
      } catch (error) {
        console.error('Error creating weekly file:', error);
        showNotification(`Error: ${error.message}`, 'error');
      }
    };
    
    // Add handler for week change to check file status
    weekInput.addEventListener('change', checkFormWeeklyFileStatus);
    
    // Initial check
    setTimeout(checkFormWeeklyFileStatus, 500);
    
    return true;
  }
  
  return false;
}

// Function to check weekly file status for the form
async function checkFormWeeklyFileStatus() {
  const weekInput = document.getElementById('availability-week');
  const statusContainer = document.getElementById('weekly-file-status-form');
  const createFileBtn = document.getElementById('create-weekly-file-btn');
  
  if (!weekInput || !statusContainer || !createFileBtn) return;
  
  try {
    const weekStartDate = getWeekStartDate(new Date(weekInput.value));
    const fileExists = await checkWeeklyFileExists(weekStartDate);
    
    if (fileExists) {
      statusContainer.className = 'mt-2 small text-success';
      statusContainer.innerHTML = '<i class="fa-solid fa-check-circle me-1"></i>Weekly file exists for this week.';
      createFileBtn.classList.add('d-none');
    } else {
      statusContainer.className = 'mt-2 small text-warning';
      statusContainer.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-1"></i>No weekly file exists for this week yet.';
      createFileBtn.classList.remove('d-none');
    }
  } catch (error) {
    console.error('Error checking weekly file status:', error);
    statusContainer.className = 'mt-2 small text-danger';
    statusContainer.innerHTML = '<i class="fa-solid fa-circle-exclamation me-1"></i>Error checking file status.';
  }
}

// Add a button to generate/manage weekly availability files for admin
function addWeeklyFileManagementButton() {
  // Find a good place to add this admin button
  const availabilityHeader = document.querySelector('#saved-availability-view .card-header');
  
  if (availabilityHeader) {
    // Create a button group if it doesn't exist
    let btnGroup = availabilityHeader.querySelector('.btn-group');
    
    if (!btnGroup) {
      btnGroup = document.createElement('div');
      btnGroup.className = 'btn-group me-2';
      const firstChild = availabilityHeader.querySelector('div');
      if (firstChild) {
        firstChild.prepend(btnGroup);
      }
    }
    
    // Create the button
    const weeklyFileBtn = document.createElement('button');
    weeklyFileBtn.className = 'btn btn-outline-info btn-sm me-2';
    weeklyFileBtn.innerHTML = '<i class="fa-solid fa-file-circle-plus me-1"></i>Manage Weekly Files';
    weeklyFileBtn.addEventListener('click', showWeeklyFileManagementModal);
    
    // Add to the interface
    btnGroup.prepend(weeklyFileBtn);
  }
}

// Function to check if a weekly file exists and update UI accordingly
async function checkWeeklyFileStatus() {
  const weekInput = document.getElementById('weekly-file-week');
  const createBtn = document.getElementById('createWeeklyFileBtn');
  const syncBtn = document.getElementById('syncWeeklyFileBtn');
  const statusDiv = document.getElementById('weekly-file-status');
  
  if (!weekInput || !createBtn || !syncBtn || !statusDiv) return;
  
  try {
    const weekStartDate = getWeekStartDate(new Date(weekInput.value));
    const fileExists = await checkWeeklyFileExists(weekStartDate);
    
    statusDiv.className = fileExists ? 'alert alert-success' : 'alert alert-warning';
    statusDiv.innerHTML = fileExists 
      ? '<i class="fa-solid fa-check-circle me-2"></i>Weekly file exists for this week.'
      : '<i class="fa-solid fa-triangle-exclamation me-2"></i>No weekly file exists for this week yet.';
    statusDiv.classList.remove('d-none');
    
    createBtn.disabled = fileExists;
    createBtn.title = fileExists ? 'File already exists' : 'Create new weekly file';
    
    syncBtn.classList.toggle('d-none', !fileExists);
  } catch (error) {
    console.error('Error checking weekly file status:', error);
    statusDiv.className = 'alert alert-danger';
    statusDiv.innerHTML = `<i class="fa-solid fa-circle-exclamation me-2"></i>Error: ${error.message}`;
    statusDiv.classList.remove('d-none');
  }
}

// Add this function for better debugging
function debugWeeklyModalButtons() {
  console.log('Checking modal buttons...');
  
  // Check if modal exists
  const modal = document.getElementById('weeklyFileModal');
  if (!modal) {
    console.error('Modal not found in DOM');
    return;
  }
  
  // Check if button exists
  const createBtn = document.getElementById('createWeeklyFileBtn');
  if (!createBtn) {
    console.error('Create button not found in DOM');
    return;
  }
  
  console.log('Create button found:', createBtn);
  
  // Add a direct click handler to test
  createBtn.onclick = function() {
    console.log('Button clicked via onclick property');
    
    // Get the week input value
    const weekInput = document.getElementById('weekly-file-week');
    if (!weekInput) {
      console.error('Week input not found');
      return;
    }
    
    const weekStartDate = getWeekStartDate(new Date(weekInput.value));
    console.log('Selected week:', weekStartDate);
    
    // Attempt to create the file
    saveWeeklyAvailabilityData(weekStartDate, {
      weekStart: weekStartDate.toISOString().split('T')[0],
      weekEnd: getWeekEndDate(weekStartDate).toISOString().split('T')[0],
      lastUpdated: new Date().toISOString(),
      submissions: []
    })
    .then(result => {
      console.log('File creation result:', result);
      if (result.success) {
        alert('Weekly file created successfully');
        checkWeeklyFileStatus();
      } else {
        alert('Error creating file: ' + result.message);
      }
    })
    .catch(error => {
      console.error('Error in file creation:', error);
      alert('Error: ' + error.message);
    });
  };
  
  // Add direct event listener as well
  createBtn.addEventListener('click', function() {
    console.log('Button clicked via addEventListener');
  });
  
  console.log('Button handlers set up');
}

// Function to show a modal for weekly file management
function showWeeklyFileManagementModal() {
  console.log('Opening weekly file management modal');
  
  // Check if the modal exists, if not create it
  let modal = document.getElementById('weeklyFileModal');
  
  if (!modal) {
    console.log('Creating new modal');
    // Create the modal
    modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'weeklyFileModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'weeklyFileModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="weeklyFileModalLabel">Manage Weekly Availability Files</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info mb-3">
              <i class="fa-solid fa-circle-info me-2"></i>
              Select a week to create or view a weekly availability file.
            </div>
            
            <div class="mb-3">
              <label for="weekly-file-week" class="form-label">Week</label>
              <input type="date" class="form-control" id="weekly-file-week" required>
            </div>
            
            <div id="weekly-file-status" class="alert d-none">
              <!-- Status will be shown here -->
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-success" id="createWeeklyFileBtn">Create Weekly File</button>
            <button type="button" class="btn btn-primary d-none" id="syncWeeklyFileBtn">Sync with App</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    console.log('Modal added to DOM');
    
    // Debug the buttons immediately
    setTimeout(debugWeeklyModalButtons, 100);
    
    // Set up event handlers for the new modal
    const weekInput = document.getElementById('weekly-file-week');
    if (!weekInput) console.error('Week input not found after modal creation');
    
    const createBtn = document.getElementById('createWeeklyFileBtn');
    if (!createBtn) console.error('Create button not found after modal creation');
    
    const syncBtn = document.getElementById('syncWeeklyFileBtn');
    if (!syncBtn) console.error('Sync button not found after modal creation');
    
    const statusDiv = document.getElementById('weekly-file-status');
    if (!statusDiv) console.error('Status div not found after modal creation');
    
    // Initialize date to current week's Sunday
    if (weekInput) {
      weekInput.value = Utils.formatDateForInput(getWeekStartDate(new Date()));
      console.log('Week input initialized to', weekInput.value);
    }
    
    // Check file status when date changes
    if (weekInput) {
      weekInput.addEventListener('change', function() {
        console.log('Week input changed to', this.value);
        checkWeeklyFileStatus();
      });
    }
    
    // Initial status check
    console.log('Running initial weekly file status check');
    setTimeout(checkWeeklyFileStatus, 200);
  } else {
    console.log('Using existing modal');
    // Debug the buttons in the existing modal
    debugWeeklyModalButtons();
  }
  
  // Show the modal
  console.log('Showing modal with Bootstrap');
  try {
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  } catch (error) {
    console.error('Error showing modal with Bootstrap:', error);
    // Fallback if bootstrap isn't available
    modal.style.display = 'block';
    modal.classList.add('show');
  }
}

// Update the availability form submission to use weekly files
function updateAvailabilityFormSubmission() {
  const form = document.getElementById('availability-form');
  if (!form) return;
  
  // Replace the existing form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const employeeName = document.getElementById('employee-name').value;
    const weekStarting = document.getElementById('availability-week').value;
    const notes = document.getElementById('availability-notes').value;
    
    if (!employeeName || !weekStarting) {
      showNotification('Please select your name and week', 'error');
      return;
    }
    
    // Collect availability data
    const availableShifts = {};
    DAYS.forEach(day => {
      availableShifts[day] = [];
    });
    
    document.querySelectorAll('.availability-check:checked').forEach(check => {
      const day = check.dataset.day;
      const shift = check.dataset.shift;
      
      if (day && shift) {
        if (!availableShifts[day]) {
          availableShifts[day] = [];
        }
        availableShifts[day].push(shift);
      }
    });
    
    // Check if any shifts were selected
    let hasShifts = false;
    Object.values(availableShifts).forEach(shifts => {
      if (shifts.length > 0) {
        hasShifts = true;
      }
    });
    
    if (!hasShifts) {
      showNotification('Please select at least one shift you are available for', 'error');
      return;
    }
    
    // Check if weekly file exists
    const weekStartDate = getWeekStartDate(new Date(weekStarting));
    const fileExists = await checkWeeklyFileExists(weekStartDate);
    
    if (!fileExists) {
      showNotification('You need to create a weekly file first', 'warning');
      // Highlight the create weekly file button if it exists
      const createFileBtn = document.getElementById('create-weekly-file-btn');
      if (createFileBtn) {
        createFileBtn.classList.add('btn-warning');
        setTimeout(() => {
          createFileBtn.classList.remove('btn-warning');
        }, 2000);
      }
      return;
    }
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Submitting...';
    submitBtn.disabled = true;
    
    try {
      // Now save the availability
      const formattedDate = weekStartDate.toISOString().split('T')[0];
      const result = await saveAvailabilityToWeeklyFile(employeeName, weekStarting, availableShifts, notes);
      
      if (result) {
        // Also save to local storage for immediate use
        if (window.availabilityManager) {
          window.availabilityManager.saveSubmission(employeeName, formattedDate, availableShifts, notes);
        } else if (window.ShiftApp?.availabilityManager) {
          window.ShiftApp.availabilityManager.saveSubmission(employeeName, formattedDate, availableShifts, notes);
        }
        
        // Success!
// Success!
showNotification('Availability submitted successfully', 'success');
form.reset();
document.querySelectorAll('.availability-check').forEach(check => {
  check.checked = false;
});

// Update UI components
if (window.ShiftApp?.uiManager) {
  window.ShiftApp.uiManager.updateAvailabilityTable();
  window.ShiftApp.uiManager.updateDashboardStats();
}

// Add the employee to the manager if not present
if (window.ShiftApp?.employeeManager) {
  window.ShiftApp.employeeManager.getEmployee(employeeName);
  window.ShiftApp.employeeManager.saveEmployees();
}

// Switch to the saved availability tab
showTab('saved-availability-tab');
}
} catch (error) {
console.error('Error submitting availability:', error);
showNotification(`Error: ${error.message}`, 'error');
} finally {
// Reset button state
submitBtn.innerHTML = originalBtnText;
submitBtn.disabled = false;
}
}, { capture: true }); // Use capture to ensure this handler runs first
}

// Update the Generate Schedule button to use weekly files
function setupGenerateScheduleButton() {
const confirmGenerateBtn = document.getElementById('confirmGenerateSchedule');

if (!confirmGenerateBtn) return;

// Store the original click handler
const originalClickHandler = confirmGenerateBtn.onclick;

// Replace with our enhanced handler
confirmGenerateBtn.onclick = async function() {
const scheduleWeekInput = document.getElementById('schedule-week');
if (!scheduleWeekInput) return;

const selectedWeek = scheduleWeekInput.value;

// Show loading state
const originalText = confirmGenerateBtn.innerHTML;
confirmGenerateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Generating...';
confirmGenerateBtn.disabled = true;

try {
if (window.ShiftApp && window.ShiftApp.shiftManager) {
const weekStartDate = getWeekStartDate(new Date(selectedWeek));

// First check if weekly file exists
const fileExists = await checkWeeklyFileExists(weekStartDate);

if (fileExists) {
  // Sync weekly file with local availability manager
  if (window.ShiftApp.availabilityManager) {
    await syncWeeklyFileWithAvailabilityManager(weekStartDate, window.ShiftApp.availabilityManager);
  }
}

// Generate schedule (will use local availability data synced from GitHub)
const formattedDate = weekStartDate.toISOString().split('T')[0]; 
const schedule = window.ShiftApp.shiftManager.generateSchedule(
  formattedDate, 
  window.ShiftApp.availabilityManager
);

if (schedule) {
  Utils.showNotification('Schedule generated successfully', 'success');
  
  // Update UI
  window.ShiftApp.uiManager.updateDailyScheduleView();
  window.ShiftApp.uiManager.updateWeeklyScheduleView();
  window.ShiftApp.uiManager.updateDashboardStats();
  window.ShiftApp.uiManager.updateScheduleVisibility();
  
  // Close the modal
  const modal = document.getElementById('scheduleGenerationModal');
  const bsModal = bootstrap.Modal.getInstance(modal);
  bsModal.hide();
  
  // Switch to the daily view tab
  showTab('daily-tab');
} else {
  Utils.showNotification('Failed to generate schedule', 'error');
}
} else {
// Fall back to the original handler
if (originalClickHandler) {
  originalClickHandler.call(this);
}
}
} catch (error) {
console.error('Error generating schedule:', error);
Utils.showNotification(`Error: ${error.message}`, 'error');
} finally {
// Reset button state
confirmGenerateBtn.innerHTML = originalText;
confirmGenerateBtn.disabled = false;
}
};
}

// Update the availability check when the week changes
function updateAvailabilityCheckFunction() {
// Find the scheduleGenerationModal
const modal = document.getElementById('scheduleGenerationModal');
if (!modal) return;

const scheduleWeekInput = document.getElementById('schedule-week');
if (!scheduleWeekInput) return;

// Remove any existing event listener and add our enhanced one
scheduleWeekInput.addEventListener('change', async function() {
if (!window.ShiftApp || !window.ShiftApp.shiftManager) return;

// Get UI elements
const availabilityCheckResult = document.getElementById('availability-check-result');
const availabilityCheckMessage = document.getElementById('availability-check-message');
const confirmGenerateBtn = document.getElementById('confirmGenerateSchedule');

if (!availabilityCheckResult || !availabilityCheckMessage || !confirmGenerateBtn) return;

try {
// Show loading state
availabilityCheckResult.className = 'alert alert-info';
availabilityCheckResult.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Checking availability...';
availabilityCheckResult.classList.remove('d-none');
confirmGenerateBtn.disabled = true;

// Check weekly file first
const weekStartDate = getWeekStartDate(new Date(this.value));

// First check if the file exists
const fileExists = await checkWeeklyFileExists(weekStartDate);

if (fileExists) {
// Get submissions from the weekly file
const submissions = await getWeekSubmissions(weekStartDate);

if (submissions.length > 0) {
  // Check if we have enough people
  const formattedDate = weekStartDate.toISOString().split('T')[0];
  
  // Temporarily add submissions to the availability manager for check
  if (window.ShiftApp.availabilityManager) {
    await syncWeeklyFileWithAvailabilityManager(weekStartDate, window.ShiftApp.availabilityManager);
    
    // Now check using the local mechanism
    const localCheck = window.ShiftApp.shiftManager.checkAvailabilityForSchedule(
      formattedDate, 
      window.ShiftApp.availabilityManager
    );
    
    if (localCheck.valid) {
      availabilityCheckResult.className = 'alert alert-success';
      availabilityCheckMessage.innerHTML = '<i class="fa-solid fa-check-circle me-2"></i>Weekly availability file found with sufficient data.';
      confirmGenerateBtn.disabled = false;
    } else {
      availabilityCheckResult.className = 'alert alert-warning';
      availabilityCheckMessage.textContent = `Weekly file found but: ${localCheck.reason}`;
      confirmGenerateBtn.disabled = true;
    }
  } else {
    availabilityCheckResult.className = 'alert alert-warning';
    availabilityCheckMessage.textContent = 'Unable to check sufficiency of weekly file data.';
    confirmGenerateBtn.disabled = true;
  }
} else {
  availabilityCheckResult.className = 'alert alert-warning';
  availabilityCheckMessage.textContent = 'Weekly file exists but has no submissions.';
  confirmGenerateBtn.disabled = true;
}
} else {
// Try local availability as fallback
const localCheck = window.ShiftApp.shiftManager.checkAvailabilityForSchedule(
  this.value, 
  window.ShiftApp.availabilityManager
);

if (localCheck.valid) {
  availabilityCheckResult.className = 'alert alert-info';
  availabilityCheckMessage.innerHTML = '<i class="fa-solid fa-info-circle me-2"></i>Using local availability data (weekly file not available).';
  confirmGenerateBtn.disabled = false;
} else {
  // Neither source has enough data
  availabilityCheckResult.className = 'alert alert-warning';
  availabilityCheckMessage.textContent = 'No sufficient availability data found for this week.';
  confirmGenerateBtn.disabled = true;
}
}
} catch (error) {
console.error('Error checking availability:', error);
availabilityCheckResult.className = 'alert alert-danger';
availabilityCheckMessage.textContent = `Error: ${error.message}`;
confirmGenerateBtn.disabled = true;
}
});
}

// Ensure the weekly directory exists
async function ensureWeeklyDirectoryExists() {
try {
const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/shifts/weekly`;

const response = await fetch(apiUrl, {
headers: { 
'Authorization': `token ${GITHUB_CONFIG.TOKEN}`,
'Accept': 'application/vnd.github.v3+json'
}
});

if (response.status === 404) {
// Directory doesn't exist, create it
const createResponse = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/shifts/weekly/.gitkeep`, {
method: 'PUT',
headers: {
  'Authorization': `token ${GITHUB_CONFIG.TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.github.v3+json'
},
body: JSON.stringify({
  message: 'Create weekly directory',
  content: btoa(''), // Empty content
  branch: GITHUB_CONFIG.BRANCH
})
});

return createResponse.ok;
}

return response.ok;
} catch (error) {
console.error('Error ensuring weekly directory exists:', error);
return false;
}
}

// Notification function if not already defined
function showNotification(message, type = 'info') {
// Check if Utils.showNotification exists
if (typeof Utils !== 'undefined' && typeof Utils.showNotification === 'function') {
Utils.showNotification(message, type);
return;
}

// Fallback implementation
console.log(`[${type.toUpperCase()}] ${message}`);

// Check if we have a notification container
const container = document.getElementById('notification-container');
if (!container) return;

const notification = document.createElement('div');
notification.className = `notification ${type}`;
notification.textContent = message;
container.appendChild(notification);

setTimeout(() => {
notification.style.opacity = '0';
setTimeout(() => notification.remove(), 300);
}, 5000);
}

// Initialize all the weekly file modifications
async function initializeWeeklyIntegration() {
try {
console.log('Initializing weekly shift integration...');

// Make sure the weekly directory exists
await ensureWeeklyDirectoryExists();

// Define the updateAvailabilitySubmissions function globally
window.updateAvailabilitySubmissions = function(submissions) {
if (window.ShiftApp && window.ShiftApp.availabilityManager) {
try {
  const submissionsCopy = JSON.parse(JSON.stringify(submissions));
  localStorage.setItem('shift_manager_availability', JSON.stringify(submissionsCopy));
  window.ShiftApp.availabilityManager.loadSubmissions();
  return true;
} catch (error) {
  console.error('Error updating availability submissions:', error);
  return false;
}
}
return false;
};

// Update date inputs to use week selection
updateDateInputLabels();
setupWeekSelection();

// Add weekly file check to form
addWeeklyFileCheckToForm();

// Add weekly file management
addWeeklyFileManagementButton();

// Update form submission
updateAvailabilityFormSubmission();

// Set up schedule generation
setupGenerateScheduleButton();
updateAvailabilityCheckFunction();

console.log('Weekly shift integration initialized');
return true;
} catch (error) {
console.error('Error initializing weekly integration:', error);
return false;
}
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
// Wait for the app to load
setTimeout(async () => {
try {
await initializeWeeklyIntegration();
} catch (error) {
console.error('Failed to initialize weekly integration:', error);
}
}, 2000);
});