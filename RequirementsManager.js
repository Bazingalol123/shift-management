// Requirements Manager Class
class RequirementsManager {
    #requirements;
    #storageManager;
    
    constructor(storageManager) {
        this.#storageManager = storageManager;
        this.#requirements = this.loadRequirements() || this.getDefaultRequirements();
        
        // Ensure requirements are saved to localStorage if they weren't there
        if (!this.loadRequirements()) {
            this.saveRequirements();
        }
    }
    
    // Get default requirements
    getDefaultRequirements() {
        const requirements = {};
        DAYS.forEach(day => {
            requirements[day] = {
                'Morning A': 3,
                'Morning B': 2,
                'Noon': 3,
                'Night': 2
            };
        });
        return requirements;
    }
    
    // Getter for all requirements
    get requirements() {
        return structuredClone(this.#requirements);
    }
    
    // Get requirements for a specific day
    getDayRequirements(day) {
        return this.#requirements[day] ? structuredClone(this.#requirements[day]) : null;
    }
    
    // Get requirement for a specific day and shift
    getRequirement(day, shift) {
        return this.#requirements[day] && this.#requirements[day][shift] !== undefined ?
            this.#requirements[day][shift] : 0;
    }
    
    // Set requirement for a specific day and shift
    setRequirement(day, shift, count) {
        if (!this.#requirements[day]) {
            this.#requirements[day] = {};
        }
        
        this.#requirements[day][shift] = parseInt(count) || 0;
        this.saveRequirements();
    }
    
    // Update all requirements at once
    updateRequirements(newRequirements) {
        this.#requirements = structuredClone(newRequirements);
        this.saveRequirements();
    }
    
    // Calculate total requirements
    calculateTotalRequirements() {
        let total = 0;
        
        Object.values(this.#requirements).forEach(dayReqs => {
            Object.values(dayReqs).forEach(count => {
                total += count;
            });
        });
        
        return total;
    }
    
    // Calculate requirements for a specific day
    calculateDayTotal(day) {
        if (!this.#requirements[day]) return 0;
        
        return Object.values(this.#requirements[day]).reduce((sum, count) => sum + count, 0);
    }
    
    // Calculate requirements for a specific shift across all days
    calculateShiftTotal(shift) {
        let total = 0;
        
        Object.values(this.#requirements).forEach(dayReqs => {
            if (dayReqs[shift] !== undefined) {
                total += dayReqs[shift];
            }
        });
        
        return total;
    }
    
    // Save requirements to storage
    saveRequirements() {
        this.#storageManager.saveData('REQUIREMENTS', this.#requirements);
    }
    
    // Load requirements from storage
    loadRequirements() {
        return this.#storageManager.loadData('REQUIREMENTS');
    }
    
    // Export requirements to JSON file
    exportRequirements() {
        Utils.saveJsonToFile(this.#requirements, 'shift_requirements.json');
        Utils.showNotification('Requirements exported successfully', 'success');
    }
    
    // Import requirements from JSON file
    async importRequirements(file) {
        try {
            const data = await Utils.loadJsonFromFile(file);
            this.updateRequirements(data);
            Utils.showNotification('Requirements imported successfully', 'success');
            return true;
        } catch (error) {
            Utils.showNotification(`Failed to import requirements: ${error.message}`, 'error');
            return false;
        }
    }
}