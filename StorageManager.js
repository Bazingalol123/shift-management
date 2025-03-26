// Data Storage Manager
class StorageManager {
    constructor() {
        this.storageKeys = {
            AVAILABILITY: 'shift_manager_availability',
            REQUIREMENTS: 'shift_manager_requirements',
            SCHEDULE: 'shift_manager_schedule',
            CURRENT_WEEK: 'shift_manager_current_week',
            EMPLOYEES: 'shift_manager_employees'
        };
    }
    
    // Save data to localStorage
    saveData(key, data) {
        try {
            localStorage.setItem(this.storageKeys[key], JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error saving ${key} to localStorage:`, error);
            return false;
        }
    }
    
    // Load data from localStorage
    loadData(key) {
        try {
            const data = localStorage.getItem(this.storageKeys[key]);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error loading ${key} from localStorage:`, error);
            return null;
        }
    }
    
    // Export data to a JSON file
    exportData(key, filename) {
        const data = this.loadData(key);
        if (!data) {
            Utils.showNotification(`No ${key} data to export`, 'warning');
            return false;
        }
        
        Utils.saveJsonToFile(data, filename);
        return true;
    }
    
    // Import data from a JSON file
    async importData(key, file) {
        try {
            const data = await Utils.loadJsonFromFile(file);
            this.saveData(key, data);
            return true;
        } catch (error) {
            Utils.showNotification(`Failed to import ${key} data: ${error.message}`, 'error');
            return false;
        }
    }
    
    // Clear specific data
    clearData(key) {
        localStorage.removeItem(this.storageKeys[key]);
    }
    
    // Check if data exists
    hasData(key) {
        return localStorage.getItem(this.storageKeys[key]) !== null;
    }
}