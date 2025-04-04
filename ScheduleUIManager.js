// Schedule UI Manager with Drag and Drop
class ScheduleUIManager {
    constructor(containerId, scheduleData, onScheduleChange) {
        this.container = document.getElementById(containerId);
        this.scheduleData = scheduleData;
        this.onScheduleChange = onScheduleChange;
        this.initialize();
    }

    initialize() {
        if (!this.container) {
            console.error('Container element not found');
            return;
        }

        this.renderSchedule();
        this.initializeDragAndDrop();
    }

    renderSchedule() {
        if (!this.scheduleData || !this.scheduleData.schedule) {
            this.showError('Invalid schedule data');
            return;
        }

        this.container.innerHTML = ''; // Clear container
        
        // Create the schedule table
        const table = document.createElement('table');
        table.className = 'table table-bordered schedule-table';
        
        // Create header row
        const thead = document.createElement('thead');
        thead.className = 'table-light';
        const headerRow = document.createElement('tr');
        
        // Add empty cell for shift labels
        headerRow.appendChild(document.createElement('th'));
        
        // Add day headers
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        days.forEach(day => {
            const th = document.createElement('th');
            th.textContent = day;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Create a row for each shift
        const shifts = ['Morning A', 'Morning B', 'Noon', 'Night'];
        
        shifts.forEach(shift => {
            const row = document.createElement('tr');
            
            // Add shift label
            const shiftLabel = document.createElement('td');
            shiftLabel.textContent = shift;
            shiftLabel.className = 'shift-label';
            row.appendChild(shiftLabel);
            
            // Add day cells
            days.forEach(day => {
                const cell = document.createElement('td');
                cell.className = 'schedule-cell';
                cell.dataset.day = day;
                cell.dataset.shift = shift;
                
                // Create drop zone for the cell
                const dropZone = document.createElement('div');
                dropZone.className = 'employee-drop-zone';
                dropZone.dataset.day = day;
                dropZone.dataset.shift = shift;
                cell.appendChild(dropZone);
                
                // Add employee tags
                const employees = this.scheduleData.schedule[day]?.[shift] || [];
                employees.forEach(empName => {
                    const empTag = this.createEmployeeTag(empName, day, shift);
                    dropZone.appendChild(empTag);
                });
                
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        this.container.appendChild(table);
        
        // Add unassigned employees section
        this.renderUnassignedEmployees();
        
        // Add stats section
        this.renderStats();
    }
    
    renderUnassignedEmployees() {
        const unassignedSection = document.createElement('div');
        unassignedSection.className = 'unassigned-employees-section mt-4';
        
        const heading = document.createElement('h5');
        heading.textContent = 'Unassigned Employees';
        unassignedSection.appendChild(heading);
        
        const dropZone = document.createElement('div');
        dropZone.className = 'employee-drop-zone unassigned-drop-zone';
        dropZone.dataset.unassigned = 'true';
        unassignedSection.appendChild(dropZone);
        
        // Get all employees and filter out those who are already assigned
        const assignedEmployees = new Set();
        
        Object.values(this.scheduleData.schedule).forEach(daySchedule => {
            Object.values(daySchedule).forEach(shiftEmployees => {
                shiftEmployees.forEach(emp => assignedEmployees.add(emp));
            });
        });
        
        // Get all employee names from the stats
        if (this.scheduleData.stats && this.scheduleData.stats.employeeStats) {
            const allEmployees = Object.keys(this.scheduleData.stats.employeeStats);
            const unassignedEmployees = allEmployees.filter(emp => !assignedEmployees.has(emp));
            
            unassignedEmployees.forEach(empName => {
                const empTag = this.createEmployeeTag(empName);
                dropZone.appendChild(empTag);
            });
        }
        
        this.container.appendChild(unassignedSection);
    }
    
    renderStats() {
        if (!this.scheduleData.stats) return;
        
        const statsSection = document.createElement('div');
        statsSection.className = 'schedule-stats mt-4';
        
        const heading = document.createElement('h5');
        heading.textContent = 'Schedule Statistics';
        statsSection.appendChild(heading);
        
        const statsList = document.createElement('div');
        statsList.className = 'row';
        
        // Total assigned shifts
        const totalShifts = document.createElement('div');
        totalShifts.className = 'col-md-4';
        totalShifts.innerHTML = `
            <div class="stats-card card">
                <div class="card-body">
                    <h6 class="card-subtitle mb-2 text-muted">Total Assigned Shifts</h6>
                    <h2 class="card-title">${this.scheduleData.stats.totalAssignedShifts}</h2>
                </div>
            </div>
        `;
        statsList.appendChild(totalShifts);
        
        // Unfilled positions
        const unfilled = document.createElement('div');
        unfilled.className = 'col-md-4';
        unfilled.innerHTML = `
            <div class="stats-card card">
                <div class="card-body">
                    <h6 class="card-subtitle mb-2 text-muted">Unfilled Positions</h6>
                    <h2 class="card-title">${this.scheduleData.stats.unfilledPositions || 0}</h2>
                </div>
            </div>
        `;
        statsList.appendChild(unfilled);
        
        // Employees scheduled
        const employees = document.createElement('div');
        employees.className = 'col-md-4';
        employees.innerHTML = `
            <div class="stats-card card">
                <div class="card-body">
                    <h6 class="card-subtitle mb-2 text-muted">Employees Scheduled</h6>
                    <h2 class="card-title">${Object.keys(this.scheduleData.stats.employeeStats).length}</h2>
                </div>
            </div>
        `;
        statsList.appendChild(employees);
        
        statsSection.appendChild(statsList);
        
        // Employee shift distribution
        const empDistribution = document.createElement('div');
        empDistribution.className = 'employee-distribution mt-3';
        
        const empTable = document.createElement('table');
        empTable.className = 'table table-sm';
        empTable.innerHTML = `
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Assigned Shifts</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(this.scheduleData.stats.employeeStats)
                    .map(([emp, count]) => `
                        <tr>
                            <td>${emp}</td>
                            <td><span class="badge bg-primary">${count}</span></td>
                        </tr>
                    `).join('')}
            </tbody>
        `;
        
        empDistribution.appendChild(empTable);
        statsSection.appendChild(empDistribution);
        
        this.container.appendChild(statsSection);
    }
    
    createEmployeeTag(name, day = null, shift = null) {
        const employee = window.ShiftApp?.employeeManager?.getEmployee(name) || 
                        { backgroundColor: '#8970D4', textColor: '#FFFFFF' };
        
        const tag = document.createElement('div');
        tag.className = 'employee-tag';
        tag.draggable = true;
        tag.textContent = name;
        tag.dataset.employee = name;
        
        if (day && shift) {
            tag.dataset.day = day;
            tag.dataset.shift = shift;
        }
        
        // Apply styling from Employee class if available
        tag.style.backgroundColor = employee.backgroundColor || '#8970D4';
        tag.style.color = employee.textColor || '#FFFFFF';
        
        return tag;
    }
    
    initializeDragAndDrop() {
        // Make employee tags draggable
        const employeeTags = this.container.querySelectorAll('.employee-tag');
        employeeTags.forEach(tag => {
            tag.addEventListener('dragstart', this.handleDragStart.bind(this));
            tag.addEventListener('dragend', this.handleDragEnd.bind(this));
        });
        
        // Set up drop zones
        const dropZones = this.container.querySelectorAll('.employee-drop-zone');
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', this.handleDragOver.bind(this));
            zone.addEventListener('dragenter', this.handleDragEnter.bind(this));
            zone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            zone.addEventListener('drop', this.handleDrop.bind(this));
        });
    }
    
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            employee: e.target.dataset.employee,
            fromDay: e.target.dataset.day,
            fromShift: e.target.dataset.shift
        }));
        
        e.target.classList.add('dragging');
    }
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }
    
    handleDragOver(e) {
        e.preventDefault(); // Allow drop
    }
    
    handleDragEnter(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const employee = data.employee;
            const fromDay = data.fromDay;
            const fromShift = data.fromShift;
            
            // Get target information
            const toDay = e.currentTarget.dataset.day;
            const toShift = e.currentTarget.dataset.shift;
            const isUnassigned = e.currentTarget.dataset.unassigned === 'true';
            
            // Make a copy of the schedule data
            const newSchedule = JSON.parse(JSON.stringify(this.scheduleData));
            
            // Remove from previous position if it was assigned
            if (fromDay && fromShift) {
                const fromShiftEmployees = newSchedule.schedule[fromDay][fromShift];
                const index = fromShiftEmployees.indexOf(employee);
                
                if (index !== -1) {
                    fromShiftEmployees.splice(index, 1);
                    
                    // Update employee stats
                    if (newSchedule.stats && newSchedule.stats.employeeStats[employee]) {
                        newSchedule.stats.employeeStats[employee]--;
                        newSchedule.stats.totalAssignedShifts--;
                    }
                }
            }
            
            // Add to new position if not going to unassigned
            if (!isUnassigned && toDay && toShift) {
                // Make sure the day and shift exist in the schedule
                if (!newSchedule.schedule[toDay]) {
                    newSchedule.schedule[toDay] = {};
                }
                
                if (!newSchedule.schedule[toDay][toShift]) {
                    newSchedule.schedule[toDay][toShift] = [];
                }
                
                // Check if employee is already in this shift
                if (!newSchedule.schedule[toDay][toShift].includes(employee)) {
                    // Add employee to the shift
                    newSchedule.schedule[toDay][toShift].push(employee);
                    
                    // Update employee stats
                    if (newSchedule.stats) {
                        if (!newSchedule.stats.employeeStats) {
                            newSchedule.stats.employeeStats = {};
                        }
                        
                        if (!newSchedule.stats.employeeStats[employee]) {
                            newSchedule.stats.employeeStats[employee] = 0;
                        }
                        
                        newSchedule.stats.employeeStats[employee]++;
                        newSchedule.stats.totalAssignedShifts++;
                    }
                }
            }
            
            // Update the schedule
            this.scheduleData = newSchedule;
            this.renderSchedule();
            this.initializeDragAndDrop();
            
            // Call the change handler
            if (this.onScheduleChange) {
                this.onScheduleChange(newSchedule);
            }
            
        } catch (error) {
            console.error('Error handling drop:', error);
        }
    }
    
    showError(message) {
        this.container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fa-solid fa-triangle-exclamation me-2"></i>
                ${message}
            </div>
        `;
    }
    
    updateSchedule(newScheduleData) {
        this.scheduleData = newScheduleData;
        this.renderSchedule();
        this.initializeDragAndDrop();
    }
}

// Add CSS for drag and drop
const style = document.createElement('style');
style.textContent = `
.schedule-table {
    width: 100%;
    table-layout: fixed;
}

.schedule-cell {
    height: 120px;
    vertical-align: top;
    padding: 8px;
}

.shift-label {
    font-weight: bold;
    background-color: var(--light-gray);
}

.employee-drop-zone {
    min-height: 100%;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.employee-drop-zone.drag-over {
    background-color: var(--light-purple);
}

.unassigned-drop-zone {
    min-height: 80px;
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.employee-tag {
    cursor: grab;
    user-select: none;
}

.employee-tag.dragging {
    opacity: 0.6;
}
`;
document.head.appendChild(style);

// Example usage:
/*
const scheduleContainer = document.getElementById('schedule-container');
const scheduleUI = new ScheduleUIManager('schedule-container', scheduleData, (updatedSchedule) => {
    console.log('Schedule updated:', updatedSchedule);
    // Save or process the updated schedule
});
*/