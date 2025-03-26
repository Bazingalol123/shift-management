// Schedule Manager Class
class ScheduleManager {
    #schedule;
    #currentWeek;
    #storageManager;
    #employeeManager;
    #requirementsManager;
    
    constructor(storageManager, employeeManager, requirementsManager) {
        this.#storageManager = storageManager;
        this.#employeeManager = employeeManager;
        this.#requirementsManager = requirementsManager;
        this.#schedule = null;
        
        // Load current week from storage or use current week's Sunday
        const savedWeek = this.#storageManager.loadData('CURRENT_WEEK');
        if (savedWeek) {
            this.#currentWeek = savedWeek;
        } else {
            const today = new Date();
            this.#currentWeek = Utils.formatDateForInput(Utils.getWeekStartDate(today));
            this.#storageManager.saveData('CURRENT_WEEK', this.#currentWeek);
        }
        
        // Try to load existing schedule
        this.loadSchedule();
    }
    
    // Getters
    get schedule() {
        return this.#schedule ? structuredClone(this.#schedule) : null;
    }
    
    get currentWeek() {
        return this.#currentWeek;
    }
    
    get hasSchedule() {
        return this.#schedule !== null;
    }
    
    // Setters
    set currentWeek(weekStarting) {
        this.#currentWeek = weekStarting;
        this.#storageManager.saveData('CURRENT_WEEK', weekStarting);
    }
    
    // Check if we have enough availability data to generate a schedule
    checkAvailabilityForSchedule(weekStarting, availabilityManager) {
        const submissions = availabilityManager.getWeekSubmissions(weekStarting);
        
        if (submissions.length === 0) {
            return {
                valid: false,
                reason: 'No availability submissions found for the selected week'
            };
        }
        
        // Load employee availability from submissions
        this.#employeeManager.loadAvailabilityForWeek(weekStarting, availabilityManager);
        
        // Check if there are enough employees with availability
        const totalRequiredShifts = this.#requirementsManager.calculateTotalRequirements();
        
        const totalAvailableShifts = [...this.#employeeManager.employees.values()].reduce((total, employee) => {
            return total + Object.values(employee.getAllAvailability()).reduce((sum, shifts) => sum + shifts.length, 0);
        }, 0);
        
        if (totalAvailableShifts < totalRequiredShifts) {
            return {
                valid: false,
                reason: `Not enough availability (${totalAvailableShifts} available shifts for ${totalRequiredShifts} required positions)`
            };
        }
        
        return { valid: true };
    }
    
    // Generate a new schedule
    generateSchedule(weekStarting, availabilityManager) {
        // Check if we have availability data
        const availabilityCheck = this.checkAvailabilityForSchedule(weekStarting, availabilityManager);
        if (!availabilityCheck.valid) {
            Utils.showNotification(availabilityCheck.reason, 'error');
            return null;
        }
        
        // Save the current week
        this.currentWeek = weekStarting;
        
        // Clear existing assignments
        this.#employeeManager.clearAllShiftAssignments();
        
        // Generate the schedule
        const generator = new ShiftGenerator(this.#employeeManager, this.#requirementsManager);
        this.#schedule = generator.generateSchedule();
        
        // Save the schedule
        this.saveSchedule();
        
        return this.#schedule;
    }
    
    // Load schedule from storage
    loadSchedule() {
        const savedData = this.#storageManager.loadData('SCHEDULE');
        if (!savedData) return false;
        
        const { week, schedule } = savedData;
        this.#currentWeek = week;
        this.#schedule = schedule;
        
        // Restore employee shift assignments
        this.#employeeManager.clearAllShiftAssignments();
        
        DAYS.forEach(day => {
            Object.values(SHIFTS).forEach(shift => {
                const employees = this.#schedule[day][shift.id] || [];
                employees.forEach(empName => {
                    try {
                        const employee = this.#employeeManager.getEmployee(empName);
                        employee.assignShift(day, shift.id);
                    } catch (error) {
                        console.warn(`Failed to restore shift assignment for ${empName}:`, error.message);
                    }
                });
            });
        });
        
        return true;
    }
    
    // Save schedule to storage
    saveSchedule() {
        if (!this.#schedule || !this.#currentWeek) return false;
        
        const scheduleData = {
            week: this.#currentWeek,
            schedule: this.#schedule
        };
        
        this.#storageManager.saveData('SCHEDULE', scheduleData);
        return true;
    }
    
    // Get schedule for a specific day
    getDaySchedule(day) {
        if (!this.#schedule || !this.#schedule[day]) return null;
        return structuredClone(this.#schedule[day]);
    }
    
    // Clear the schedule
    clearSchedule() {
        this.#schedule = null;
        this.#employeeManager.clearAllShiftAssignments();
        this.#storageManager.clearData('SCHEDULE');
    }
    
    // Export schedule to JSON file
    exportSchedule() {
        if (!this.#schedule || !this.#currentWeek) {
            Utils.showNotification('No schedule to export', 'warning');
            return false;
        }
        
        const scheduleData = {
            week: this.#currentWeek,
            requirements: this.#requirementsManager.requirements,
            schedule: this.#schedule
        };
        
        Utils.saveJsonToFile(scheduleData, `schedule_${this.#currentWeek}.json`);
        Utils.showNotification('Schedule exported successfully', 'success');
        return true;
    }
    
    // Import schedule from JSON file
    async importSchedule(file) {
        try {
            const data = await Utils.loadJsonFromFile(file);
            
            if (!data.week || !data.schedule) {
                throw new Error('Invalid schedule data format');
            }
            
            this.#currentWeek = data.week;
            this.#schedule = data.schedule;
            
            // Update requirements if included
            if (data.requirements) {
                this.#requirementsManager.updateRequirements(data.requirements);
            }
            
            // Restore employee shift assignments
            this.#employeeManager.clearAllShiftAssignments();
            
            DAYS.forEach(day => {
                Object.values(SHIFTS).forEach(shift => {
                    const employees = this.#schedule[day][shift.id] || [];
                    employees.forEach(empName => {
                        try {
                            const employee = this.#employeeManager.getEmployee(empName);
                            employee.assignShift(day, shift.id);
                        } catch (error) {
                            console.warn(`Failed to restore shift assignment for ${empName}:`, error.message);
                        }
                    });
                });
            });
            
            this.saveSchedule();
            this.#storageManager.saveData('CURRENT_WEEK', this.#currentWeek);
            
            Utils.showNotification('Schedule imported successfully', 'success');
            return true;
        } catch (error) {
            Utils.showNotification(`Failed to import schedule: ${error.message}`, 'error');
            return false;
        }
    }
}

// ShiftGenerator Class - Handles schedule generation algorithm
class ShiftGenerator {
    #employeeManager;
    #requirementsManager;
    
    constructor(employeeManager, requirementsManager) {
        this.#employeeManager = employeeManager;
        this.#requirementsManager = requirementsManager;
    }

    generateSchedule() {
        // Initialize empty schedule
        const schedule = {};
        DAYS.forEach(day => {
            schedule[day] = {
                'Morning A': [],
                'Morning B': [],
                'Noon': [],
                'Night': []
            };
        });

        // Sort employees by availability constraints
        const sortedEmployees = [...this.#employeeManager.employees.values()]
            .sort((a, b) => {
                const aConstraints = this.countAvailabilityConstraints(a);
                const bConstraints = this.countAvailabilityConstraints(b);
                return bConstraints - aConstraints;
            });

        // First, assign night shifts (most constrained)
        this.assignNightShifts(schedule, sortedEmployees);

        // Then assign other shifts in order of requirements
        DAYS.forEach(day => {
            const shiftsToAssign = Object.entries(this.#requirementsManager.getDayRequirements(day))
                .filter(([shift]) => shift !== 'Night')
                .sort((a, b) => b[1] - a[1]);  // Sort by required count descending

            shiftsToAssign.forEach(([shift, required]) => {
                this.assignShiftsForDay(day, shift, required, schedule, sortedEmployees);
            });
        });

        return schedule;
    }

    countAvailabilityConstraints(employee) {
        let count = 0;
        DAYS.forEach(day => {
            const available = employee.getAvailableShifts(day);
            if (available.length === 0) count++;
        });
        return count;
    }

    assignNightShifts(schedule, employees) {
        DAYS.forEach(day => {
            const required = this.#requirementsManager.getRequirement(day, 'Night');
            const candidates = employees.filter(emp => 
                emp.isAvailable(day, 'Night') && 
                emp.getNightShiftCount() < MAX_NIGHT_SHIFTS
            );

            for (let i = 0; i < Math.min(required, candidates.length); i++) {
                const employee = candidates[i];
                try {
                    employee.assignShift(day, 'Night');
                    schedule[day]['Night'].push(employee.name);
                } catch (error) {
                    console.warn(`Failed to assign night shift: ${error.message}`);
                }
            }
        });
    }

    assignShiftsForDay(day, shift, required, schedule, employees) {
        const currentAssigned = schedule[day][shift].length;
        const needed = required - currentAssigned;

        if (needed <= 0) return;

        const candidates = employees
            .filter(emp => {
                if (!emp.isAvailable(day, shift)) return false;
                if (emp.hasAssignedShiftOnDay(day)) return false;
                const validation = emp.validateShiftAssignment(day, shift);
                return validation.valid;
            })
            .sort((a, b) => {
                const aShifts = a.getWeeklyShiftCount();
                const bShifts = b.getWeeklyShiftCount();
                if (aShifts !== bShifts) return aShifts - bShifts; // Prefer employees with fewer shifts
                
                // If same number of shifts, prioritize by availability
                const aAvail = Object.values(a.getAllAvailability()).reduce((sum, shifts) => sum + shifts.length, 0);
                const bAvail = Object.values(b.getAllAvailability()).reduce((sum, shifts) => sum + shifts.length, 0);
                return aAvail - bAvail; // Prefer employees with fewer available slots
            });

        for (let i = 0; i < Math.min(needed, candidates.length); i++) {
            const employee = candidates[i];
            try {
                employee.assignShift(day, shift);
                schedule[day][shift].push(employee.name);
            } catch (error) {
                console.warn(`Failed to assign ${shift}: ${error.message}`);
            }
        }
    }
}