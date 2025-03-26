// Availability Manager Class
class AvailabilityManager {
    #submissions;
    #storageManager;
    
    constructor(storageManager) {
        this.#storageManager = storageManager;
        this.#submissions = this.loadSubmissions() || [];
    }
    
    // Get all submissions
    get submissions() {
        return structuredClone(this.#submissions);
    }
    
    // Get number of submissions
    get count() {
        return this.#submissions.length;
    }
    
    // Get submissions for a specific week
    getWeekSubmissions(weekStarting) {
        return this.#submissions.filter(s => s.weekStarting === weekStarting);
    }
    
    // Get submission by ID
    getSubmissionById(id) {
        return this.#submissions.find(s => s.id === id);
    }
    
    // Get employee's submission for a specific week
    getEmployeeSubmission(employeeName, weekStarting) {
        return this.#submissions.find(s => 
            s.employee === employeeName && s.weekStarting === weekStarting
        );
    }
    
    // Add or update a submission
    saveSubmission(employeeName, weekStarting, availableShifts, notes) {
        // Validate input
        if (!employeeName || !weekStarting || !availableShifts) {
            return null;
        }
        
        // Check if employee already submitted for this week
        const existingIndex = this.#submissions.findIndex(s => 
            s.employee === employeeName && s.weekStarting === weekStarting
        );
        
        const submission = {
            id: existingIndex >= 0 ? this.#submissions[existingIndex].id : Date.now(),
            employee: employeeName,
            weekStarting,
            availableShifts,
            notes,
            submittedOn: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
            // Update existing submission
            this.#submissions[existingIndex] = submission;
        } else {
            // Add new submission
            this.#submissions.push(submission);
        }
        
        // Save to storage
        this.saveSubmissions();
        
        return submission;
    }
    
    // Delete a submission by ID
    deleteSubmission(id) {
        const initialLength = this.#submissions.length;
        this.#submissions = this.#submissions.filter(s => s.id !== id);
        
        if (this.#submissions.length !== initialLength) {
            this.saveSubmissions();
            return true;
        }
        
        return false;
    }
    
    // Get unique weeks with submissions
    getUniqueWeeks() {
        return [...new Set(this.#submissions.map(s => s.weekStarting))];
    }
    
    // Save submissions to storage
    saveSubmissions() {
        this.#storageManager.saveData('AVAILABILITY', this.#submissions);
    }
    
    // Load submissions from storage
    loadSubmissions() {
        return this.#storageManager.loadData('AVAILABILITY');
    }
    
    // Export availability to JSON file
    exportAvailability(weekStarting = null) {
        let data = this.#submissions;
        let filename = 'all_availability.json';
        
        if (weekStarting) {
            data = this.getWeekSubmissions(weekStarting);
            filename = `availability_${weekStarting}.json`;
        }
        
        if (data.length === 0) {
            Utils.showNotification('No availability data to export', 'warning');
            return false;
        }
        
        Utils.saveJsonToFile(data, filename);
        Utils.showNotification('Availability data exported successfully', 'success');
        return true;
    }
    
    // Import availability from JSON file
    async importAvailability(file) {
        try {
            const data = await Utils.loadJsonFromFile(file);
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid availability data format');
            }
            
            // Merge with existing submissions, replacing duplicates
            data.forEach(newSubmission => {
                const existingIndex = this.#submissions.findIndex(s => 
                    s.employee === newSubmission.employee && 
                    s.weekStarting === newSubmission.weekStarting
                );
                
                if (existingIndex >= 0) {
                    this.#submissions[existingIndex] = newSubmission;
                } else {
                    this.#submissions.push(newSubmission);
                }
            });
            
            this.saveSubmissions();
            Utils.showNotification('Availability data imported successfully', 'success');
            return true;
        } catch (error) {
            Utils.showNotification(`Failed to import availability: ${error.message}`, 'error');
            return false;
        }
    }
}