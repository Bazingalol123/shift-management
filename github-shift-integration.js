// GitHub Integration for Modern Shift Manager UI
// This script provides GitHub integration for the Bootstrap-based Shift Manager application

// GitHub configuration - replace with your actual values
const GITHUB_CONFIG = {
    TOKEN: "your_personal_access_token", // Replace with your GitHub PAT
    OWNER: "your-username",              // Replace with your GitHub username
    REPO: "shift-management",            // Repository name
    BRANCH: "main"                       // Branch name
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
  
  // Push a file to GitHub
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