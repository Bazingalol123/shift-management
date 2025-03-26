// Employee Manager Class
class EmployeeManager {
    #employees; // Map of name -> Employee object
    #storageManager;
    
    constructor(storageManager) {
        this.#storageManager = storageManager;
        this.#employees = new Map();
        this.loadEmployees();
    }
    
    // Get all employees
    get employees() {
        return this.#employees;
    }
    
    // Get employee count
    get count() {
        return this.#employees.size;
    }
    
    // Get employee names
    get employeeNames() {
        return [...this.#employees.keys()];
    }
    
    // Get or create an employee
    getEmployee(name) {
        if (!this.#employees.has(name)) {
            this.#employees.set(name, new Employee(name));
        }
        return this.#employees.get(name);
    }
    
    // Add employee
    addEmployee(name, maxShifts = DEFAULT_MAX_SHIFTS_PER_EMPLOYEE) {
        if (!this.#employees.has(name)) {
            this.#employees.set(name, new Employee(name, maxShifts));
            this.saveEmployees();
            return true;
        }
        return false;
    }
    
    // Remove employee
    removeEmployee(name) {
        const result = this.#employees.delete(name);
        if (result) {
            this.saveEmployees();
        }
        return result;
    }
    
    // Update employee max shifts
    updateEmployeeMaxShifts(name, maxShifts) {
        const employee = this.#employees.get(name);
        if (employee) {
            employee.maxShifts = maxShifts;
            this.saveEmployees();
            return true;
        }
        return false;
    }
    
    // Load availability for a specific week
    loadAvailabilityForWeek(weekStarting, availabilityManager) {
        // Reset availability for all employees
        this.#employees.forEach(employee => {
            employee.clearAvailability();
        });
        
        // Get submissions for the week
        const submissions = availabilityManager.getWeekSubmissions(weekStarting);
        
        // Load availability from submissions
        submissions.forEach(submission => {
            const employee = this.getEmployee(submission.employee);
            
            // Set availability for each day/shift
            Object.entries(submission.availableShifts).forEach(([day, shifts]) => {
                shifts.forEach(shift => {
                    employee.setAvailability(day, shift);
                });
            });
        });
        
        return submissions.length;
    }
    
    // Clear all shift assignments
    clearAllShiftAssignments() {
        this.#employees.forEach(employee => {
            employee.clearAssignedShifts();
        });
    }
    
    // Save employees to storage
    saveEmployees() {
        const data = [];
        this.#employees.forEach(employee => {
            data.push(employee.toJSON());
        });
        
        this.#storageManager.saveData('EMPLOYEES', data);
    }
    
    // Load employees from storage
    loadEmployees() {
        const data = this.#storageManager.loadData('EMPLOYEES');
        
        if (data && Array.isArray(data)) {
            this.#employees.clear();
            
            data.forEach(employeeData => {
                const employee = Employee.fromJSON(employeeData);
                this.#employees.set(employee.name, employee);
            });
        }
        
        // Initialize with default employees if none exist
        if (this.#employees.size === 0) {
            const defaultEmployees = [
                "Tomer", "OmerK", "OmerS", "Ariel", "Dor", 
                "Yoav", "Ella", "Maya", "Natan", "Dan", "Alex"
            ];
            
            defaultEmployees.forEach(name => {
                this.addEmployee(name);
            });
        }
    }
    
    // Export employees to JSON file
    exportEmployees() {
        const data = [];
        this.#employees.forEach(employee => {
            data.push(employee.toJSON());
        });
        
        if (data.length === 0) {
            Utils.showNotification('No employee data to export', 'warning');
            return false;
        }
        
        Utils.saveJsonToFile(data, 'employees.json');
        Utils.showNotification('Employee data exported successfully', 'success');
        return true;
    }
    
    // Import employees from JSON file
    async importEmployees(file) {
        try {
            const data = await Utils.loadJsonFromFile(file);
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid employee data format');
            }
            
            // Clear existing employees and load from file
            this.#employees.clear();
            
            data.forEach(employeeData => {
                const employee = Employee.fromJSON(employeeData);
                this.#employees.set(employee.name, employee);
            });
            
            this.saveEmployees();
            Utils.showNotification('Employee data imported successfully', 'success');
            return true;
        } catch (error) {
            Utils.showNotification(`Failed to import employees: ${error.message}`, 'error');
            return false;
        }
    }
}