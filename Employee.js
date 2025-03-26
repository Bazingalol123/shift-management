// Employee Class
class Employee {
    #name;
    #maxShifts;
    #availableShifts; // day -> Set(shifts)
    #assignedShifts; // day -> shift
    #backgroundColor;
    #textColor;

    constructor(name, maxShifts = DEFAULT_MAX_SHIFTS_PER_EMPLOYEE) {
        this.#name = name;
        this.#maxShifts = maxShifts;
        this.#availableShifts = new Map();
        this.#assignedShifts = new Map();
        
        // Generate unique color
        const { backgroundColor, textColor } = ColorUtils.generateRandomColor();
        this.#backgroundColor = backgroundColor;
        this.#textColor = textColor;
    }
    
    // Getters
    get name() {
        return this.#name;
    }
    
    get maxShifts() {
        return this.#maxShifts;
    }
    
    get backgroundColor() {
        return this.#backgroundColor;
    }
    
    get textColor() {
        return this.#textColor;
    }
    
    // Setters
    set maxShifts(value) {
        if (typeof value === 'number' && value > 0) {
            this.#maxShifts = value;
        }
    }
    
    // Validation methods
    validateShiftAssignment(day, shift) {
        if (this.hasAssignedShiftOnDay(day)) {
            return { valid: false, reason: 'Already assigned to a shift on this day' };
        }

        if (shift === SHIFTS.NIGHT.id && this.getNightShiftCount() >= MAX_NIGHT_SHIFTS) {
            return { valid: false, reason: 'Maximum night shifts reached for the week' };
        }

        const previousDay = DAYS[(DAYS.indexOf(day) - 1 + 7) % 7];
        const previousShift = this.#assignedShifts.get(previousDay);
        
        if (previousShift) {
            const restHours = this.calculateRestHours(previousShift, shift);
            if (restHours < MIN_REST_HOURS) {
                return { valid: false, reason: 'Insufficient rest period between shifts' };
            }
        }

        if (this.getWeeklyShiftCount() >= this.#maxShifts) {
            return { valid: false, reason: 'Maximum weekly shifts reached' };
        }

        return { valid: true };
    }

    calculateRestHours(prevShift, nextShift) {
        // Map shift IDs to SHIFTS objects
        const getShiftDetails = (shiftId) => {
            // Convert shift ID to SHIFTS key
            const shiftKey = Object.keys(SHIFTS).find(key => SHIFTS[key].id === shiftId);
            return SHIFTS[shiftKey];
        };

        const prevShiftDetails = getShiftDetails(prevShift);
        const nextShiftDetails = getShiftDetails(nextShift);

        if (!prevShiftDetails || !nextShiftDetails) {
            console.warn('Invalid shift details:', { prevShift, nextShift });
            return 24; // Return max hours if shift details not found
        }

        let endHour = prevShiftDetails.end;
        let startHour = nextShiftDetails.start;

        // Handle day wraparound
        if (endHour > startHour) {
            startHour += 24;
        }

        return startHour - endHour;
    }

    getNightShiftCount() {
        return Array.from(this.#assignedShifts.values())
            .filter(shift => shift === SHIFTS.NIGHT.id).length;
    }
    
    // Availability methods
    setAvailability(day, shift) {
        if (!this.#availableShifts.has(day)) {
            this.#availableShifts.set(day, new Set());
        }
        this.#availableShifts.get(day).add(shift);
    }

    removeAvailability(day, shift) {
        const shifts = this.#availableShifts.get(day);
        if (shifts) {
            shifts.delete(shift);
            if (shifts.size === 0) {
                this.#availableShifts.delete(day);
            }
        }
    }
    
    clearAvailability() {
        this.#availableShifts.clear();
    }
    
    isAvailable(day, shift) {
        return this.#availableShifts.get(day)?.has(shift) || false;
    }
    
    getAvailableShifts(day) {
        return this.#availableShifts.has(day) ? 
            [...this.#availableShifts.get(day)] : [];
    }
    
    getAllAvailability() {
        const result = {};
        this.#availableShifts.forEach((shifts, day) => {
            result[day] = [...shifts];
        });
        return result;
    }
    
    setAllAvailability(availabilityData) {
        this.#availableShifts.clear();
        
        if (!availabilityData) return;
        
        Object.entries(availabilityData).forEach(([day, shifts]) => {
            if (!this.#availableShifts.has(day)) {
                this.#availableShifts.set(day, new Set());
            }
            
            shifts.forEach(shift => {
                this.#availableShifts.get(day).add(shift);
            });
        });
    }
    
    // Shift assignment methods
    assignShift(day, shift) {
        const validation = this.validateShiftAssignment(day, shift);
        if (!validation.valid) {
            throw new Error(validation.reason);
        }
        this.#assignedShifts.set(day, shift);
    }

    clearAssignedShifts() {
        this.#assignedShifts.clear();
    }
    
    removeShiftAssignment(day) {
        this.#assignedShifts.delete(day);
    }

    getWeeklyShiftCount() {
        return this.#assignedShifts.size;
    }
    
    getAllAssignedShifts() {
        const result = {};
        this.#assignedShifts.forEach((shift, day) => {
            result[day] = shift;
        });
        return result;
    }
    
    setAllAssignedShifts(shiftsData) {
        this.#assignedShifts.clear();
        
        if (!shiftsData) return;
        
        Object.entries(shiftsData).forEach(([day, shift]) => {
            this.#assignedShifts.set(day, shift);
        });
    }
    
    getAssignedShift(day) {
        return this.#assignedShifts.get(day);
    }

    hasAssignedShiftOnDay(day) {
        return this.#assignedShifts.has(day);
    }
    
    // UI methods
    createEmployeeTag() {
        const tag = document.createElement("div");
        tag.textContent = this.#name;
        tag.className = 'employee-tag';
        tag.dataset.employeeName = this.#name;
        tag.style.backgroundColor = this.#backgroundColor;
        tag.style.color = this.#textColor;
        
        return tag;
    }
    
    // Serialization for storage
    toJSON() {
        return {
            name: this.#name,
            maxShifts: this.#maxShifts,
            backgroundColor: this.#backgroundColor,
            textColor: this.#textColor,
            availableShifts: this.getAllAvailability(),
            assignedShifts: this.getAllAssignedShifts()
        };
    }
    
    // Load from JSON data
    static fromJSON(data) {
        const employee = new Employee(data.name, data.maxShifts);
        
        // Restore colors if provided
        if (data.backgroundColor && data.textColor) {
            employee.#backgroundColor = data.backgroundColor;
            employee.#textColor = data.textColor;
        }
        
        // Restore shifts
        employee.setAllAvailability(data.availableShifts);
        employee.setAllAssignedShifts(data.assignedShifts);
        
        return employee;
    }
}