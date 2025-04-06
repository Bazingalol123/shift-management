// Constants
const SHIFTS = {
    MORNING_A: { id: 'Morning A', start: 7, end: 15 },
    MORNING_B: { id: 'Morning B', start: 9, end: 17 },
    NOON: { id: 'Noon', start: 15, end: 23 },
    NIGHT: { id: 'Night', start: 23, end: 7 }
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MIN_REST_HOURS = 8;
const MAX_NIGHT_SHIFTS = 1;
const DEFAULT_MAX_SHIFTS_PER_EMPLOYEE = 3;

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create storage manager
    const storageManager = new StorageManager();
    
    // Create employee manager
    const employeeManager = new EmployeeManager(storageManager);
    
    // Create requirements manager
    const requirementsManager = new RequirementsManager(storageManager);
    
    // Create availability manager
    const availabilityManager = new AvailabilityManager(storageManager);
    
    // Create schedule manager
    const shiftManager = new ScheduleManager(
        storageManager, 
        employeeManager, 
        requirementsManager
    );
    
    // Create UI manager to handle DOM updates
    const uiManager = new UIManager(
        shiftManager,
        employeeManager,
        requirementsManager,
        availabilityManager,
        storageManager
    );
    
    // Make accessible globally for debugging and external access
    window.ShiftApp = {
        storageManager,
        employeeManager,
        requirementsManager,
        availabilityManager,
        shiftManager,
        uiManager
    };
    
    // Log initialization complete
    console.log("Shift Manager application initialized successfully");
});

// Utility function to show a specific tab
function showTab(tabId) {
    const tab = document.getElementById(tabId);
    if (tab) {
        const bsTab = new bootstrap.Tab(tab);
        bsTab.show();
    }
}

// Function to open requirements modal
function openRequirementsModal() {
    // Get the modal element
    const modal = document.getElementById('requirementsModal');
    if (!modal) {
        console.error("Requirements modal not found");
        return;
    }
    
    // Show the modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Populate the form
    if (window.ShiftApp && window.ShiftApp.uiManager) {
        // Try to populate immediately and also when the modal is shown
        try {
            window.ShiftApp.uiManager.populateRequirementsForm();
        } catch (error) {
            console.warn("Error pre-populating form, will try again when modal is shown:", error);
        }
    } else {
        console.warn("ShiftApp not initialized yet, will try to populate form when modal is shown");
    }
}

// Initialize with mock data if none exists
function initializeMockData() {
    if (!localStorage.getItem('shift_manager_requirements')) {
        const mockRequirements = {};
        DAYS.forEach(day => {
            mockRequirements[day] = {
                'Morning A': 1,
                'Morning B': 2,
                'Noon': 1,
                'Night': 1
            };
        });
        
        localStorage.setItem('shift_manager_requirements', JSON.stringify(mockRequirements));
        console.log("Initialized mock requirements data");
    }
}

// Call the initialization on page load
initializeMockData();