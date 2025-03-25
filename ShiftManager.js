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

// Color Utilities
class ColorUtils {
    static getLuminance(r, g, b) {
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    static hslToRgb(h, s, l) {
        h = h % 360;
        s = s / 100;
        l = l / 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c/2;
        let [r, g, b] = [0, 0, 0];

        if (h < 60) [r, g, b] = [c, x, 0];
        else if (h < 120) [r, g, b] = [x, c, 0];
        else if (h < 180) [r, g, b] = [0, c, x];
        else if (h < 240) [r, g, b] = [0, x, c];
        else if (h < 300) [r, g, b] = [x, 0, c];
        else [r, g, b] = [c, 0, x];

        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }

    static getContrastColor(hue) {
        const [r, g, b] = this.hslToRgb(hue, 70, 45);
        return this.getLuminance(r, g, b) < 0.5 ? '#FFFFFF' : '#000000';
    }
}

// Employee Class
class Employee {
    constructor(name, maxShifts = 3) {
        this.name = name;
        this.maxShifts = maxShifts;
        this.availableShifts = new Map(); // day -> Set(shifts)
        this.assignedShifts = new Map(); // day -> shift
        this.generateUniqueColorWithContrast();
    }

    generateUniqueColorWithContrast() {
        const hue = Math.random() * 360;
        this.backgroundColor = `hsl(${hue}, 70%, 45%)`;
        this.textColor = ColorUtils.getContrastColor(hue);
    }

    validateShiftAssignment(day, shift) {
        if (this.hasAssignedShiftOnDay(day)) {
            return { valid: false, reason: 'Already assigned to a shift on this day' };
        }

        if (shift === SHIFTS.NIGHT.id && this.getNightShiftCount() >= MAX_NIGHT_SHIFTS) {
            return { valid: false, reason: 'Maximum night shifts reached for the week' };
        }

        const previousDay = DAYS[(DAYS.indexOf(day) - 1 + 7) % 7];
        const previousShift = this.assignedShifts.get(previousDay);
        
        if (previousShift) {
            const restHours = this.calculateRestHours(previousShift, shift);
            if (restHours < MIN_REST_HOURS) {
                return { valid: false, reason: 'Insufficient rest period between shifts' };
            }
        }

        if (this.getWeeklyShiftCount() >= this.maxShifts) {
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
        return Array.from(this.assignedShifts.values())
            .filter(shift => shift === SHIFTS.NIGHT.id).length;
    }

    setAvailability(day, shift) {
        if (!this.availableShifts.has(day)) {
            this.availableShifts.set(day, new Set());
        }
        this.availableShifts.get(day).add(shift);
        
        // Dispatch event for UI update
        document.dispatchEvent(new CustomEvent('availabilityChanged', {
            detail: { employee: this, day, shift }
        }));
    }

    removeAvailability(day, shift) {
        const shifts = this.availableShifts.get(day);
        if (shifts) {
            shifts.delete(shift);
            if (shifts.size === 0) {
                this.availableShifts.delete(day);
            }
        }
    }

    assignShift(day, shift) {
        const validation = this.validateShiftAssignment(day, shift);
        if (!validation.valid) {
            throw new Error(validation.reason);
        }
        this.assignedShifts.set(day, shift);
    }

    clearAssignedShifts() {
        this.assignedShifts.clear();
    }

    getWeeklyShiftCount() {
        return this.assignedShifts.size;
    }

    isAvailable(day, shift) {
        return this.availableShifts.get(day)?.has(shift) || false;
    }

    hasAssignedShiftOnDay(day) {
        return this.assignedShifts.has(day);
    }

    createEmployeeTag(isScheduleTag = false) {
        const tag = document.createElement("div");
        tag.textContent = this.name;
        tag.className = `employee-tag ${isScheduleTag ? 'schedule-tag' : 'availability-tag'}`;
        tag.setAttribute("draggable", !isScheduleTag);
        tag.dataset.employeeName = this.name;
        tag.style.backgroundColor = this.backgroundColor;
        tag.style.color = this.textColor;
        
        // Compact tooltip
        const shiftsCount = this.getWeeklyShiftCount();
        tag.title = `${this.name} (${shiftsCount}/${this.maxShifts})`;
        
        return tag;
    }
}


// ShiftManager Class
class ShiftManager {
    constructor() {
        this.employees = new Map();
        this.shiftRequirements = this.getDefaultRequirements();
    }

    getDefaultRequirements() {
        const requirements = {};
        DAYS.forEach(day => {
            requirements[day] = {
                'Morning A': 1,
                'Morning B': 1,
                'Noon': 2,
                'Night': 1
            };
        });
        return requirements;
    }

    updateShiftRequirements(requirements) {
        this.shiftRequirements = requirements;
    }

    getEmployee(name) {
        if (!this.employees.has(name)) {
            this.employees.set(name, new Employee(name));
        }
        return this.employees.get(name);
    }

    validateDrop(employee, day, shift) {
        try {
            return employee.validateShiftAssignment(day, shift);
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    }

    clearSchedule() {
        this.employees.forEach(employee => employee.clearAssignedShifts());
    }

    generateSchedule() {
        const generator = new ShiftGenerator(this);
        const schedule = generator.generateSchedule();
        this.updateScheduleDisplay(schedule);
        return schedule;
    }

    updateScheduleDisplay(schedule) {
        DAYS.forEach(day => {
            Object.entries(schedule[day]).forEach(([shift, employees]) => {
                const cell = document.querySelector(
                    `.schedule[data-day="${day}"][data-shift="${shift}"]`
                );
                if (cell) {
                    cell.innerHTML = '';
                    employees.forEach(empName => {
                        const employee = this.getEmployee(empName);
                        const tag = employee.createEmployeeTag(true);
                        cell.appendChild(tag);
                    });
                }
            });
        });
        
        if (window.employeeDisplayManager) {
            employeeDisplayManager.updateEmployeeList();
        }
    }
}

// UI Manager Class
class UIManager {
    constructor() {
        this.tooltip = this.createTooltip();
        this.notificationContainer = this.createNotificationContainer();
        this.selectedEmployees = new Set();
        this.draggedElement = null;
        
        this.setupDragAndDrop();
        this.setupTableListeners();
        this.setupMultiSelect();
    }

    createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'shift-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    showTooltip(target, message, type = 'error') {
        const rect = target.getBoundingClientRect();
        this.tooltip.textContent = message;
        this.tooltip.className = `shift-tooltip ${type}`;
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = `${rect.left + window.scrollX}px`;
        this.tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;

        setTimeout(() => {
            this.tooltip.style.display = 'none';
        }, 3000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        this.notificationContainer.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    setupDragAndDrop() {
        // Setup employee dragging
        const employees = document.querySelectorAll('.employee');
        employees.forEach(emp => {
            emp.setAttribute('draggable', 'true');
            emp.addEventListener('dragstart', (e) => this.handleDragStart(e));
            emp.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });

        // Setup drop zones
        const dropzones = document.querySelectorAll('.dropzone');
        dropzones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.add('over');
            });
            zone.addEventListener('dragleave', (e) => {
                zone.classList.remove('over');
            });
            zone.addEventListener('drop', (e) => this.handleDrop(e));
        });
    }

    setupTableListeners() {
        document.querySelectorAll('.dropzone').forEach(cell => {
            cell.addEventListener('click', (e) => {
                if (e.target.classList.contains('employee-tag')) {
                    this.handleEmployeeRemoval(e.target);
                }
            });
        });
    }

    setupMultiSelect() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') {
                document.body.classList.add('multi-select-mode');
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                document.body.classList.remove('multi-select-mode');
            }
        });

        document.querySelectorAll('.employee').forEach(emp => {
            emp.addEventListener('click', (e) => {
                if (e.shiftKey) {
                    e.preventDefault();
                    this.toggleEmployeeSelection(emp);
                }
            });
        });
    }

    toggleEmployeeSelection(employee) {
        if (this.selectedEmployees.has(employee)) {
            this.selectedEmployees.delete(employee);
            employee.classList.remove('selected');
        } else {
            this.selectedEmployees.add(employee);
            employee.classList.add('selected');
        }
    }

    handleDragStart(e) {
        this.draggedElement = e.target;
        e.target.classList.add('dragging');
        
        let employeeNames;
        if (this.draggedElement.classList.contains('selected')) {
            // For multiple selected employees
            employeeNames = Array.from(this.selectedEmployees)
                .map(emp => emp.textContent);
        } else {
            // For single employee
            employeeNames = [e.target.textContent];
        }

        // Store the data as a string
        e.dataTransfer.setData('text/plain', employeeNames[0]);
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.dropzone').forEach(zone => {
            zone.classList.remove('over');
        });
        this.draggedElement = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        if (!this.draggedElement) return;

        const cell = e.target.closest('.dropzone');
        if (!cell) return;

        cell.classList.add('over');
        
        if (this.draggedElement.classList.contains('selected')) {
            cell.classList.add('multi-drop-hover');
        }
        
        const employeeName = this.draggedElement.textContent;
        const employee = shiftManager.getEmployee(employeeName);
        const day = cell.dataset.day;
        const shift = cell.dataset.shift;
        
        const validation = shiftManager.validateDrop(employee, day, shift);
        cell.classList.toggle('invalid-drop', !validation.valid);
    }

    handleDragLeave(e) {
        const cell = e.target.closest('.dropzone');
        if (cell) {
            cell.classList.remove('over', 'invalid-drop', 'multi-drop-hover');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const cell = e.target.closest('.dropzone');
        if (!cell) return;

        cell.classList.remove('over');
        
        try {
            const employeeName = e.dataTransfer.getData('text/plain');
            const employee = shiftManager.getEmployee(employeeName);
            const day = cell.dataset.day;
            const shift = cell.dataset.shift;
            const isScheduleTable = cell.classList.contains('schedule');

            // Handle the drop for schedule or availability
            if (isScheduleTable) {
                const validation = shiftManager.validateDrop(employee, day, shift);
                if (!validation.valid) {
                    this.showTooltip(cell, validation.reason, 'error');
                    return;
                }
                employee.assignShift(day, shift);
            } else {
                employee.setAvailability(day, shift);
            }

            // Update the cell
            if (isScheduleTable) {
                cell.innerHTML = '';
            }
            const tag = employee.createEmployeeTag(isScheduleTable);
            cell.appendChild(tag);

            this.showNotification(
                `${employee.name} ${isScheduleTable ? 'assigned to' : 'available for'} ${shift} on ${day}`,
                'success'
            );

        } catch (error) {
            this.showTooltip(cell, error.message, 'error');
        }
    }

    handleEmployeeRemoval(employeeTag) {
        const cell = employeeTag.closest('.dropzone');
        const employeeName = employeeTag.dataset.employeeName;
        const employee = shiftManager.getEmployee(employeeName);
        const day = cell.dataset.day;
        const shift = cell.dataset.shift;

        if (cell.classList.contains('schedule')) {
            employee.clearAssignedShifts();
        } else {
            employee.removeAvailability(day, shift);
        }

        employeeTag.remove();
        this.showNotification(`Removed ${employeeName} from ${shift} on ${day}`, 'info');
    }

    clearAvailability() {
        document.querySelectorAll('.availability').forEach(cell => {
            while (cell.firstChild) {
                cell.firstChild.remove();
            }
        });
        shiftManager.employees.forEach(employee => employee.availableShifts.clear());
        this.showNotification('All availability cleared', 'info');
    }

    updateCellWithMultipleEmployees(cell, employeeNames, isScheduleTag = false) {
        if (!isScheduleTag) {
            const existingEmployees = Array.from(cell.children)
                .map(tag => tag.dataset.employeeName);
            employeeNames = [...new Set([...existingEmployees, ...employeeNames])];
        } else {
            cell.innerHTML = '';
        }

        employeeNames.forEach(name => {
            const employee = shiftManager.getEmployee(name);
            const tag = employee.createEmployeeTag(isScheduleTag);
            cell.appendChild(tag);
        });
    }

    clearSelections() {
        this.selectedEmployees.forEach(emp => {
            emp.classList.remove('selected');
        });
        this.selectedEmployees.clear();
    }
}


// ShiftGenerator Class
class ShiftGenerator {
    constructor(shiftManager) {
        this.shiftManager = shiftManager;
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
        const sortedEmployees = Array.from(this.shiftManager.employees.values())
            .sort((a, b) => {
                const aConstraints = this.countAvailabilityConstraints(a);
                const bConstraints = this.countAvailabilityConstraints(b);
                return bConstraints - aConstraints;
            });

        // First, assign night shifts (most constrained)
        this.assignNightShifts(schedule, sortedEmployees);

        // Then assign other shifts in order of requirements
        DAYS.forEach(day => {
            const shiftsToAssign = Object.entries(this.shiftManager.shiftRequirements[day])
                .filter(([shift]) => shift !== 'Night')
                .sort((a, b) => b[1] - a[1]);

            shiftsToAssign.forEach(([shift, required]) => {
                this.assignShiftsForDay(day, shift, required, schedule, sortedEmployees);
            });
        });

        return schedule;
    }

    countAvailabilityConstraints(employee) {
        let count = 0;
        DAYS.forEach(day => {
            const available = employee.availableShifts.get(day);
            if (!available || available.size === 0) count++;
        });
        return count;
    }

    assignNightShifts(schedule, employees) {
        DAYS.forEach(day => {
            const required = this.shiftManager.shiftRequirements[day]['Night'];
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
                if (aShifts !== bShifts) return aShifts - bShifts;
                return a.availableShifts.size - b.availableShifts.size;
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

// RequirementsModal Class
class RequirementsModal {
    constructor() {
        this.modal = this.createModal();
        document.body.appendChild(this.modal);
    }

    createModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">Edit Shift Requirements</div>
            <div class="modal-content">
                <table id="requirements-table">
                    <thead>
                        <tr>
                            <th>Day</th>
                            <th>Morning A</th>
                            <th>Morning B</th>
                            <th>Noon</th>
                            <th>Night</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
                <div class="modal-actions">
                    <button class="save-btn">Save Changes</button>
                    <button class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;

        modal.querySelector('.save-btn').addEventListener('click', () => this.saveRequirements());
        modal.querySelector('.cancel-btn').addEventListener('click', () => this.close());

        return modal;
    }

    open() {
        this.populateTable();
        this.modal.style.display = 'block';
    }

    close() {
        this.modal.style.display = 'none';
    }

    populateTable() {
        const tbody = this.modal.querySelector('tbody');
        tbody.innerHTML = '';

        DAYS.forEach(day => {
            const requirements = shiftManager.shiftRequirements[day];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${day}</td>
                <td><input type="number" min="0" value="${requirements['Morning A']}" data-day="${day}" data-shift="Morning A"></td>
                <td><input type="number" min="0" value="${requirements['Morning B']}" data-day="${day}" data-shift="Morning B"></td>
                <td><input type="number" min="0" value="${requirements['Noon']}" data-day="${day}" data-shift="Noon"></td>
                <td><input type="number" min="0" value="${requirements['Night']}" data-day="${day}" data-shift="Night"></td>
            `;
            tbody.appendChild(row);
        });
    }

    saveRequirements() {
        const newRequirements = {};
        DAYS.forEach(day => {
            newRequirements[day] = {
                'Morning A': parseInt(this.modal.querySelector(`input[data-day="${day}"][data-shift="Morning A"]`).value),
                'Morning B': parseInt(this.modal.querySelector(`input[data-day="${day}"][data-shift="Morning B"]`).value),
                'Noon': parseInt(this.modal.querySelector(`input[data-day="${day}"][data-shift="Noon"]`).value),
                'Night': parseInt(this.modal.querySelector(`input[data-day="${day}"][data-shift="Night"]`).value)
            };
        });

        shiftManager.updateShiftRequirements(newRequirements);
        this.close();
        uiManager.showNotification('Shift requirements updated successfully', 'success');
    }
}

// Initialize managers and event listeners
let shiftManager;
let uiManager;
let requirementsModal;

// Add required styles
const style = document.createElement('style');
style.textContent = `
    .employee.selected {
        outline: 2px solid #04052e;
        transform: scale(1.05);
        position: relative;
        z-index: 1;
    }

    .multi-select-mode .employee:hover {
        outline: 2px dashed #04052e;
        cursor: pointer;
    }

    .employee-group-drag {
        opacity: 0.7;
    }

    .dropzone.multi-drop-hover {
        background-color: rgba(137, 112, 212, 0.2);
        border: 2px dashed #8970d4;
    }

    .shift-tooltip.multi {
        max-width: 300px;
        white-space: normal;
    }

    .employee {
        cursor: grab;
        user-select: none;
    }
    
    .employee.dragging {
        opacity: 0.5;
        cursor: grabbing;
    }
`;
document.head.appendChild(style);

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    try {
        shiftManager = new ShiftManager();
        uiManager = new UIManager();
        requirementsModal = new RequirementsModal();
        
        // Setup buttons
        document.querySelectorAll('.action-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = button.id || button.getAttribute('onclick')?.replace(/[()]/g, '');
                if (action === 'clearAvailability') uiManager.clearAvailability();
                if (action === 'clearSchedule') shiftManager.clearSchedule();
                if (action === 'generateShifts') shiftManager.generateSchedule();
            });
        });

        // Export functionality
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            const exportButton = document.createElement('button');
            exportButton.className = 'action-button';
            exportButton.textContent = 'Export Schedule';
            exportButton.onclick = exportSchedule;
            actionButtons.appendChild(exportButton);
        }

    } catch (error) {
        console.error('Error initializing Shift Manager:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'initialization-error';
        errorDiv.textContent = `Failed to initialize: ${error.message}`;
        document.body.prepend(errorDiv);
    }
});

// Export functionality
function exportSchedule() {
    const schedule = {};
    DAYS.forEach(day => {
        schedule[day] = {};
        Object.keys(SHIFTS).forEach(shiftKey => {
            const shiftId = SHIFTS[shiftKey].id;
            const cell = document.querySelector(`.schedule[data-day="${day}"][data-shift="${shiftId}"]`);
            schedule[day][shiftId] = Array.from(cell.children).map(tag => tag.dataset.employeeName);
        });
    });

    const blob = new Blob([JSON.stringify(schedule, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Function to open requirements modal
function openRequirementsModal() {
    requirementsModal.open();
}


class MultiSelectionManager {
    constructor() {
        this.selectedEmployee = null;
        this.selectedTimeframes = new Set();
        this.isCtrlPressed = false;
    }

    initialize() {
        // Setup keyboard listeners
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Control') {
                this.isCtrlPressed = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Control') {
                this.isCtrlPressed = false;
            }
        });

        // Setup click handlers for employees
        this.setupEmployeeClickHandlers();
        this.setupTimeframeClickHandlers();
    }

    handleEmployeeClick(employee, event) {
        if (this.isCtrlPressed && event.button === 0) {  // Left click
            this.selectedEmployee = employee;
            this.selectedTimeframes.clear();
            this.highlightEmployee(employee);
        }
    }

    handleTimeframeClick(timeframe, event) {
        if (this.selectedEmployee && this.isCtrlPressed) {
            this.selectedTimeframes.add(timeframe);
            this.highlightTimeframe(timeframe);
        }
    }

    saveSelections() {
        if (this.selectedEmployee && this.selectedTimeframes.size > 0) {
            this.selectedTimeframes.forEach(timeframe => {
                this.selectedEmployee.setAvailability(timeframe.day, timeframe.shift);
            });
            this.clearSelections();
        }
    }
}
