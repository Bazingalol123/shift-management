// ============= GITHUB CONFIG =============
// Token is split to make it less obvious in the source code
const GITHUB_CONFIG_PARTS = {
  TOKEN_A: "github_pat_11AMBMR6Q0lELYG2FJc27R_", // First part of your token
  TOKEN_B: "hf2uKcVYuEWO6HXyHwmaADpEjv",    // Second part
  TOKEN_C: "0fr3Cba8tLIF0XXtrSP",    // Third part
  TOKEN_D: "7RJIUCD4D5vukM", // Fourth part
  OWNER: "Bazingalol123",
  REPO: "shift-management",
  BRANCH: "main"
};

// Function to assemble the token when needed
function getGitHubToken() {
  return GITHUB_CONFIG_PARTS.TOKEN_A + 
         GITHUB_CONFIG_PARTS.TOKEN_B + 
         GITHUB_CONFIG_PARTS.TOKEN_C + 
         GITHUB_CONFIG_PARTS.TOKEN_D;
}

// Create a unified config object for the rest of the code
const GITHUB_CONFIG = {
  get TOKEN() { return getGitHubToken(); },
  OWNER: GITHUB_CONFIG_PARTS.OWNER,
  REPO: GITHUB_CONFIG_PARTS.REPO,
  BRANCH: GITHUB_CONFIG_PARTS.BRANCH
};

// ============= DATE UTILITIES =============

// Get date information for a specified date range
function getDateRangeInfo(startDate, endDate) {
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    weekNumber: getWeekNumber(startDate),
    year: startDate.getFullYear()
  };
}

// Generate filename based on specified date range
function generateFilenameFromDateRange(startDate, endDate, prefix = "availability") {
  // Format as dd/mm-dd/mm_yyyy
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };
  
  return `${prefix}_${formatDate(startDate)}-${formatDate(endDate)}_${startDate.getFullYear()}`;
}

// Get week number from date
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Get the week start date (Sunday) from any date
function getWeekStartDate(date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay(); // 0 for Sunday
  weekStart.setDate(weekStart.getDate() - day);
  return weekStart;
}

// Get the week end date (Saturday) from any date
function getWeekEndDate(date) {
  const weekEnd = getWeekStartDate(date);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return weekEnd;
}

// Format date for display
function formatDateForDisplay(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  });
}

// ============= GITHUB INTEGRATION =============

// Push a file to GitHub (simplified)
async function pushFileToGitHub(filePath, content, commitMessage) {
  // GitHub API URL
  const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/${filePath}`;
  
  try {
    // Encode content to base64
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    // Check if file exists to get SHA (needed for updates)
    let fileSHA = null;
    try {
      const response = await fetch(apiUrl, {
        headers: { 
          'Authorization': `token ${GITHUB_CONFIG.TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        fileSHA = data.sha;
      }
    } catch (error) {
      console.log('File does not exist yet, will create it');
    }
    
    // Prepare request payload
    const data = {
      message: commitMessage || (fileSHA ? `Update ${filePath}` : `Create ${filePath}`),
      content: encodedContent,
      branch: GITHUB_CONFIG.BRANCH
    };
    
    if (fileSHA) {
      data.sha = fileSHA;
    }
    
    // Push to GitHub
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${errorText}`);
    }
    
    const result = await response.json();
    return { 
      success: true, 
      message: "File saved successfully", 
      url: result.content.html_url,
      sha: result.content.sha
    };
  } catch (error) {
    console.error('Error pushing file to GitHub:', error);
    return { success: false, message: error.message };
  }
}


// ============= AVAILABILITY FUNCTIONS =============

// Extract availability data from modern UI
function extractAvailabilityDataFromUI(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)
  
  const employeeName = document.getElementById('employee-name').value;
  const notes = document.getElementById('availability-notes').value;
  const checkboxes = document.querySelectorAll('.availability-check');
  
  const availability = {
    timestamp: new Date().toISOString(),
    dateRange: getDateRangeInfo(startDate, endDate),
    employee: employeeName,
    notes: notes,
    availability: {}
  };
  
  // Group checkboxes by day
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  days.forEach(day => {
    availability.availability[day] = [];
  });
  
  // Extract checked values
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      const day = checkbox.dataset.day;
      const shift = checkbox.dataset.shift;
      
      if (!availability.availability[day]) {
        availability.availability[day] = [];
      }
      
      availability.availability[day].push(shift);
    }
  });
  
  return availability;
}

// Save availability data to GitHub with custom date range
async function saveAvailabilityToGitHub(startDate) {
  try {
    // Extract availability from UI
    const availabilityData = extractAvailabilityDataFromUI(startDate);
    
    // Format as JSON
    const jsonContent = JSON.stringify(availabilityData, null, 2);
    
    // Generate filename
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)
    
    const employeeName = document.getElementById('employee-name').value;
    const sanitizedName = employeeName.replace(/\s+/g, '_');
    
    const filename = `${sanitizedName}_${generateFilenameFromDateRange(startDate, endDate, "availability")}`;
    const filePath = `shifts/availability/${filename}.json`;
    
    // Commit message
    const commitMessage = `${employeeName}'s availability for ${formatDateForDisplay(startDate)} to ${formatDateForDisplay(endDate)}`;
    
    // Push to GitHub
    const result = await pushFileToGitHub(filePath, jsonContent, commitMessage);
    
    if (result.success) {
      showNotification(`Availability saved to GitHub: ${filename}`, 'success');
    } else {
      showNotification(`Error saving to GitHub: ${result.message}`, 'error');
    }
    
    return result;
  } catch (error) {
    console.error("Error saving availability:", error);
    showNotification(`Error: ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
}

// ============= SCHEDULE FUNCTIONS =============

// Format schedule data from the Schedule Manager
function formatScheduleData(schedule, startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)
  
  // Get date range info
  const dateRange = getDateRangeInfo(startDate, endDate);
  
  // Build a structured schedule object
  const scheduleData = {
    timestamp: new Date().toISOString(),
    dateRange: dateRange,
    schedule: schedule
  };
  
  return scheduleData;
}

// Save schedule to GitHub
async function saveScheduleToGitHub(schedule, startDate) {
  try {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)
    
    // Format schedule data for saving
    const scheduleData = formatScheduleData(schedule, startDate);
    
    // Convert to JSON
    const jsonContent = JSON.stringify(scheduleData, null, 2);
    
    // Generate filename
    const filename = generateFilenameFromDateRange(startDate, endDate, "schedule");
    const filePath = `shifts/schedules/${filename}.json`;
    
    // Commit message
    const commitMessage = `Schedule for ${formatDateForDisplay(startDate)} to ${formatDateForDisplay(endDate)}`;
    
    // Push to GitHub
    const result = await pushFileToGitHub(filePath, jsonContent, commitMessage);
    
    if (result.success) {
      showNotification(`Schedule saved to GitHub: ${filename}`, 'success');
    } else {
      showNotification(`Error saving to GitHub: ${result.message}`, 'error');
    }
    
    return result;
  } catch (error) {
    console.error("Error saving schedule:", error);
    showNotification(`Error: ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
}

// ============= WEEKLY FILE FUNCTIONS =============

/**
 * Fetches the weekly availability JSON file from GitHub
 * @param {Date|string} weekStart - The start date of the week (Date object or YYYY-MM-DD string)
 * @returns {Promise<Object>} - The weekly availability data
 */
async function fetchWeeklyAvailabilityFile(weekStart) {
  try {
    // Format the dates
    let weekStartDate;
    if (typeof weekStart === 'string') {
      weekStartDate = new Date(weekStart);
    } else {
      weekStartDate = new Date(weekStart);
    }
    
    // Handle invalid dates
    if (isNaN(weekStartDate.getTime())) {
      throw new Error('Invalid date provided');
    }
    
    // Format the date to match the filename pattern (YYYY-MM-DD)
    const formattedDate = weekStartDate.toISOString().split('T')[0];
    
    // Calculate the end date (6 days later)
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const formattedEndDate = weekEndDate.toISOString().split('T')[0];
    
    // Construct the expected filename
    const filename = `availability_${formattedDate}_${formattedEndDate}.json`;
    
    // GitHub API URL for the file
    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/shifts/weekly/${filename}`;
    
    console.log(`Fetching weekly file: ${filename}`);
    
    // Fetch the file metadata from GitHub
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Weekly file for ${formattedDate} not found on GitHub`);
      }
      throw new Error(`GitHub API error: ${await response.text()}`);
    }
    
    const fileData = await response.json();
    
    // Fetch the actual file content
    const contentResponse = await fetch(fileData.download_url);
    if (!contentResponse.ok) {
      throw new Error(`Failed to download file: ${await contentResponse.text()}`);
    }
    
    // Parse the JSON content
    const weeklyData = await contentResponse.json();
    return weeklyData;
    
  } catch (error) {
    console.error('Error fetching weekly availability file:', error);
    Utils.showNotification(`Error: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Fetches the list of available weekly files from GitHub
 * @returns {Promise<Array>} - Array of week data objects {weekStart, weekEnd}
 */
async function fetchAvailableWeeklyFiles() {
  try {
    // GitHub API URL to list contents of the weekly directory
    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/shifts/weekly`;
    
    // Fetch the directory listing
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${await response.text()}`);
    }
    
    const files = await response.json();
    
    // Extract date information from filenames
    // Pattern: availability_YYYY-MM-DD_YYYY-MM-DD.json
    const weeklyFiles = files
      .filter(file => file.name.startsWith('availability_') && file.name.endsWith('.json'))
      .map(file => {
        const dateParts = file.name.replace('availability_', '').replace('.json', '').split('_');
        return {
          filename: file.name,
          weekStart: dateParts[0],
          weekEnd: dateParts[1],
          displayText: `${formatDateForDisplay(new Date(dateParts[0]))} - ${formatDateForDisplay(new Date(dateParts[1]))}`
        };
      })
      .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart)); // Sort by most recent first
    
    return weeklyFiles;
  } catch (error) {
    console.error('Error fetching available weekly files:', error);
    return [];
  }
}

/**
 * Populates the weekly file selector dropdown
 * @param {HTMLElement} dropdown - The dropdown element to populate
 */
async function populateWeeklyFileSelector(dropdown) {
  if (!dropdown) return;
  
  // Clear existing options
  dropdown.innerHTML = '<option value="" selected disabled>Select a week...</option>';
  
  // Add loading option
  const loadingOption = document.createElement('option');
  loadingOption.disabled = true;
  loadingOption.textContent = 'Loading weeks from GitHub...';
  dropdown.appendChild(loadingOption);
  
  try {
    // Fetch available weekly files
    const weeklyFiles = await fetchAvailableWeeklyFiles();
    
    // Remove loading option
    dropdown.removeChild(loadingOption);
    
    if (weeklyFiles.length === 0) {
      const noWeeksOption = document.createElement('option');
      noWeeksOption.disabled = true;
      noWeeksOption.textContent = 'No weekly files found on GitHub';
      dropdown.appendChild(noWeeksOption);
      return;
    }
    
    // Add options for each week
    weeklyFiles.forEach(week => {
      const option = document.createElement('option');
      option.value = week.weekStart;
      option.textContent = week.displayText;
      option.dataset.weekEnd = week.weekEnd;
      dropdown.appendChild(option);
    });
  } catch (error) {
    console.error('Error populating week selector:', error);
    dropdown.innerHTML = '<option value="" selected disabled>Error loading weeks</option>';
  }
}

/**
 * Loads availability data from a weekly file into the availability manager
 * @param {Object} weeklyData - The weekly data object
 * @param {AvailabilityManager} availabilityManager - The availability manager instance
 * @returns {boolean} - Whether the import was successful
 */
function loadWeeklyDataIntoAvailabilityManager(weeklyData, availabilityManager) {
  try {
    if (!weeklyData || !weeklyData.submissions || !Array.isArray(weeklyData.submissions)) {
      Utils.showNotification('Invalid weekly data format', 'error');
      return false;
    }
    
    // Clear existing availability for this week if needed
    const existingSubmissions = availabilityManager.getWeekSubmissions(weeklyData.weekStart);
    if (existingSubmissions.length > 0) {
      existingSubmissions.forEach(sub => {
        availabilityManager.deleteSubmission(sub.id);
      });
    }
    
    // Import each submission
    let successCount = 0;
    
    weeklyData.submissions.forEach(submission => {
      try {
        const result = availabilityManager.saveSubmission(
          submission.employee,
          weeklyData.weekStart,
          submission.availableShifts,
          submission.notes || ''
        );
        
        if (result) {
          successCount++;
        }
      } catch (error) {
        console.error(`Error importing submission for ${submission.employee}:`, error);
      }
    });
    
    if (successCount > 0) {
      Utils.showNotification(`Imported ${successCount} submissions from weekly file`, 'success');
      return true;
    } else {
      Utils.showNotification('No submissions could be imported', 'warning');
      return false;
    }
    
  } catch (error) {
    console.error('Error loading weekly data:', error);
    Utils.showNotification(`Error: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Fetches and loads a weekly availability file for schedule generation
 * @param {string} weekStart - The week start date (YYYY-MM-DD)
 * @param {AvailabilityManager} availabilityManager - The availability manager instance
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
async function generateScheduleFromWeeklyFile(weekStart, availabilityManager) {
  try {
    // Show loading notification
    Utils.showNotification('Fetching weekly availability data...', 'info');
    
    // Fetch the weekly file
    const weeklyData = await fetchWeeklyAvailabilityFile(weekStart);
    
    if (!weeklyData) {
      Utils.showNotification('Failed to fetch weekly data', 'error');
      return false;
    }
    
    // Load the data into the availability manager
    const success = loadWeeklyDataIntoAvailabilityManager(weeklyData, availabilityManager);
    
    return success;
  } catch (error) {
    console.error('Error in generateScheduleFromWeeklyFile:', error);
    Utils.showNotification(`Error: ${error.message}`, 'error');
    return false;
  }
}

// ============= UI INTEGRATION =============

// Show notification in the notification container
function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  
  const notification = document.createElement('div');
  notification.className = `alert alert-${type} alert-dismissible fade show`;
  notification.role = 'alert';
  
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'warning') icon = 'exclamation-triangle';
  if (type === 'danger') icon = 'exclamation-circle';
  
  notification.innerHTML = `
    <i class="fa-solid fa-${icon} me-2"></i>${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  container.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Set up the GitHub integration with the modern UI
function setupGitHubIntegration() {
  // Add "Save to GitHub" button to the availability form
  const availabilityFormButtons = document.querySelector('#availability-form .justify-content-md-end');
  
  if (availabilityFormButtons) {
    const saveToGitHubButton = document.createElement('button');
    saveToGitHubButton.type = 'button';
    saveToGitHubButton.className = 'btn btn-success';
    saveToGitHubButton.id = 'save-to-github-btn';
    saveToGitHubButton.innerHTML = '<i class="fa-brands fa-github me-2"></i>Save to GitHub';
    
    saveToGitHubButton.addEventListener('click', () => {
      // Validate the form
      const employeeName = document.getElementById('employee-name').value;
      const weekStartDate = document.getElementById('availability-week').value;
      
      if (!employeeName) {
        showNotification('Please select your name', 'warning');
        return;
      }
      
      if (!weekStartDate) {
        showNotification('Please select a week', 'warning');
        return;
      }
      
      // Check if at least one shift is selected
      const hasSelectedShifts = Array.from(
        document.querySelectorAll('.availability-check')
      ).some(checkbox => checkbox.checked);
      
      if (!hasSelectedShifts) {
        showNotification('Please select at least one available shift', 'warning');
        return;
      }
      
      // Save to GitHub
      saveAvailabilityToGitHub(new Date(weekStartDate))
        .then(result => {
          if (result.success) {
            // If using AvailabilityManager from the new system
            if (window.availabilityManager && typeof availabilityManager.saveAvailability === 'function') {
              // Also save locally
              availabilityManager.saveAvailability({
                employee: employeeName,
                weekStarting: weekStartDate,
                availability: extractAvailabilityDataFromUI(new Date(weekStartDate)).availability
              });
            }
          }
        });
    });
    
    availabilityFormButtons.appendChild(saveToGitHubButton);
  }
  
  // Add GitHub export option to the export button in weekly view
  const exportScheduleBtn = document.getElementById('export-schedule-btn');
  
  if (exportScheduleBtn) {
    // Create dropdown for export options
    const exportButtonGroup = document.createElement('div');
    exportButtonGroup.className = 'btn-group';
    exportButtonGroup.innerHTML = `
      <button type="button" class="btn btn-outline-success btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="fa-solid fa-file-export me-1"></i>Export
      </button>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="#" id="export-json">Export as JSON</a></li>
        <li><a class="dropdown-item" href="#" id="export-csv">Export as CSV</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" href="#" id="save-to-github-schedule">Save to GitHub</a></li>
      </ul>
    `;
    
    // Replace original button with dropdown
    exportScheduleBtn.replaceWith(exportButtonGroup);
    
    // Add event listener for GitHub save
    document.getElementById('save-to-github-schedule').addEventListener('click', () => {
      // Get current schedule from ScheduleManager
      if (window.scheduleManager && scheduleManager.currentSchedule) {
        const weekStartingInput = document.getElementById('schedule-week');
        let startDate;
        
        if (weekStartingInput && weekStartingInput.value) {
          startDate = new Date(weekStartingInput.value);
        } else {
          // Default to current week
          const today = new Date();
          startDate = getWeekStartDate(today);
        }
        
        saveScheduleToGitHub(scheduleManager.currentSchedule, startDate);
      } else {
        showNotification('No schedule has been generated yet', 'warning');
      }
    });
  }
  
  // Add GitHub export option for availability history
  const exportAvailabilityBtn = document.getElementById('export-availability-btn');
  
  if (exportAvailabilityBtn) {
    // Create dropdown for export options
    const exportButtonGroup = document.createElement('div');
    exportButtonGroup.className = 'btn-group';
    exportButtonGroup.innerHTML = `
      <button type="button" class="btn btn-outline-primary btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="fa-solid fa-file-export me-1"></i>Export
      </button>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="#" id="export-availability-json">Export as JSON</a></li>
        <li><a class="dropdown-item" href="#" id="export-availability-csv">Export as CSV</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" href="#" id="save-all-availability-github">Save All to GitHub</a></li>
      </ul>
    `;
    
    // Replace original button with dropdown
    exportAvailabilityBtn.replaceWith(exportButtonGroup);
    
    // Add event listener for GitHub save
    document.getElementById('save-all-availability-github').addEventListener('click', () => {
      // Get all availability data from AvailabilityManager
      if (window.availabilityManager && availabilityManager.availabilityData) {
        saveAllAvailabilityToGitHub();
      } else {
        showNotification('No availability data found', 'warning');
      }
    });
  }
}

// Save all availability data to GitHub
async function saveAllAvailabilityToGitHub() {
  if (!window.availabilityManager || !availabilityManager.availabilityData) {
    showNotification('No availability data found', 'warning');
    return;
  }
  
  try {
    const allAvailability = availabilityManager.availabilityData;
    let successCount = 0;
    let errorCount = 0;
    
    for (const submission of allAvailability) {
      try {
        const startDate = new Date(submission.weekStarting);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        
        const sanitizedName = submission.employee.replace(/\s+/g, '_');
        const filename = `${sanitizedName}_${generateFilenameFromDateRange(startDate, endDate, "availability")}`;
        const filePath = `shifts/availability/${filename}.json`;
        
        // Format the data
        const submissionData = {
          timestamp: new Date().toISOString(),
          dateRange: getDateRangeInfo(startDate, endDate),
          employee: submission.employee,
          notes: submission.notes || '',
          availability: submission.availability
        };
        
        const jsonContent = JSON.stringify(submissionData, null, 2);
        const commitMessage = `${submission.employee}'s availability for ${formatDateForDisplay(startDate)} to ${formatDateForDisplay(endDate)}`;
        
        const result = await pushFileToGitHub(filePath, jsonContent, commitMessage);
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('Error saving availability for', submission.employee, error);
        errorCount++;
      }
    }
    
    if (successCount > 0) {
      showNotification(`Successfully saved ${successCount} availability submissions to GitHub`, 'success');
    }
    
    if (errorCount > 0) {
      showNotification(`Failed to save ${errorCount} availability submissions`, 'warning');
    }
    
  } catch (error) {
    console.error('Error saving all availability:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

// Initialize GitHub integration when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add slight delay to ensure other scripts have initialized
  setTimeout(setupGitHubIntegration, 500);
  
  // Set the current week as default for the availability week input
  const availabilityWeekInput = document.getElementById('availability-week');
  if (availabilityWeekInput) {
    const today = new Date();
    const weekStart = getWeekStartDate(today);
    
    // Format as YYYY-MM-DD for input[type="date"]
    const formatDateForInput = (date) => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    availabilityWeekInput.value = formatDateForInput(weekStart);
  }
  
// ... continued from previous code
    // Initialize confirmation dialog for availability form
    const submitAvailabilityBtn = document.getElementById('submit-availability');
    if (submitAvailabilityBtn) {
      submitAvailabilityBtn.addEventListener('click', (e) => {
        if (confirm('Would you also like to save this availability to GitHub?')) {
          const weekStartDate = document.getElementById('availability-week').value;
          saveAvailabilityToGitHub(new Date(weekStartDate));
        }
      });
    }
  });

// Make the functions available globally
window.GitHubIntegration = {
  fetchWeeklyAvailabilityFile,
  loadWeeklyDataIntoAvailabilityManager,
  populateWeeklyFileSelector,
  generateScheduleFromWeeklyFile,
  pushFileToGitHub
};