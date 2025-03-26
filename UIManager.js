// UI Manager - Handles updates to the DOM
class UIManager {
    #shiftManager;
    #employeeManager;
    #requirementsManager;
    #availabilityManager;
    #storageManager;
    
    constructor(shiftManager, employeeManager, requirementsManager, availabilityManager, storageManager) {
        this.#shiftManager = shiftManager;
        this.#employeeManager = employeeManager;
        this.#requirementsManager = requirementsManager;
        this.#availabilityManager = availabilityManager;
        this.#storageManager = storageManager;
        
        // Initialize UI components
        this.initDateSelectors();
        this.initAvailabilityForm();
        this.initTableFilters();
        this.initModals();
        this.initExportImportButtons();
        
        // Update UI with current data
        this.updateDashboardStats();
        this.updateRequirementsTable();
        this.updateAvailabilityTable();
        
        // Show/hide schedule elements based on current state
        this.updateScheduleVisibility();
    }
    
    // Initialize date selectors and navigation
    initDateSelectors() {
        const currentDateElem = document.getElementById('current-date');
        const weekRangeElem = document.getElementById('week-range');
        const prevDayBtn = document.getElementById('prev-day');
        const nextDayBtn = document.getElementById('next-day');
        const prevWeekBtn = document.getElementById('prev-week');
        const nextWeekBtn = document.getElementById('next-week');
        
        // Set current date and dates in forms
        let currentDate = new Date();
        const today = new Date();
        const sunday = Utils.getWeekStartDate(today);
        
        // Set today's date in daily view
        if (currentDateElem) {
            currentDateElem.textContent = Utils.formatDate(currentDate);
        }
        
        // Set availability week to current week's Sunday
        const availabilityWeekInput = document.getElementById('availability-week');
        const scheduleWeekInput = document.getElementById('schedule-week');
        
        if (availabilityWeekInput) {
            availabilityWeekInput.value = Utils.formatDateForInput(sunday);
        }
        
        if (scheduleWeekInput) {
            scheduleWeekInput.value = Utils.formatDateForInput(this.#shiftManager.currentWeek || sunday);
        }
        
        // Day navigation
        if (prevDayBtn) {
            prevDayBtn.addEventListener('click', () => {
                currentDate.setDate(currentDate.getDate() - 1);
                if (currentDateElem) {
                    currentDateElem.textContent = Utils.formatDate(currentDate);
                }
                this.updateDailyScheduleView(currentDate);
            });
        }
        
        if (nextDayBtn) {
            nextDayBtn.addEventListener('click', () => {
                currentDate.setDate(currentDate.getDate() + 1);
                if (currentDateElem) {
                    currentDateElem.textContent = Utils.formatDate(currentDate);
                }
                this.updateDailyScheduleView(currentDate);
            });
        }
        
        // Week navigation
        if (prevWeekBtn || nextWeekBtn) {
            let currentWeekStart = this.#shiftManager.currentWeek ? 
                new Date(this.#shiftManager.currentWeek) : 
                Utils.getWeekStartDate(new Date());
            
            const updateWeekDisplay = () => {
                if (weekRangeElem) {
                    const weekEnd = new Date(currentWeekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    weekRangeElem.textContent = `${Utils.formatDate(currentWeekStart)} - ${Utils.formatDate(weekEnd)}`;
                }
            };
            
            // Initial week display
            updateWeekDisplay();
            
            if (prevWeekBtn) {
                prevWeekBtn.addEventListener('click', () => {
                    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
                    updateWeekDisplay();
                });
            }
            
            if (nextWeekBtn) {
                nextWeekBtn.addEventListener('click', () => {
                    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
                    updateWeekDisplay();
                });
            }
        }
    }
    
    // Initialize the availability submission form
    initAvailabilityForm() {
        const form = document.getElementById('availability-form');
        if (!form) return;
        
        const resetBtn = document.getElementById('reset-availability');
        
        // Reset button
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                form.reset();
                document.querySelectorAll('.availability-check').forEach(check => {
                    check.checked = false;
                });
            });
        }
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const employeeName = document.getElementById('employee-name').value;
            const weekStarting = document.getElementById('availability-week').value;
            const notes = document.getElementById('availability-notes').value;
            
            if (!employeeName || !weekStarting) {
                Utils.showNotification('Please select your name and week', 'error');
                return;
            }
            
            // Collect availability data
            const availableShifts = {};
            DAYS.forEach(day => {
                availableShifts[day] = [];
            });
            
            document.querySelectorAll('.availability-check:checked').forEach(check => {
                const day = check.dataset.day;
                const shift = check.dataset.shift;
                
                if (day && shift) {
                    if (!availableShifts[day]) {
                        availableShifts[day] = [];
                    }
                    availableShifts[day].push(shift);
                }
            });
            
            // Check if any shifts were selected
            let hasShifts = false;
            Object.values(availableShifts).forEach(shifts => {
                if (shifts.length > 0) {
                    hasShifts = true;
                }
            });
            
            if (!hasShifts) {
                Utils.showNotification('Please select at least one shift you are available for', 'error');
                return;
            }
            
            // Save to availability manager
            const submission = this.#availabilityManager.saveSubmission(
                employeeName, weekStarting, availableShifts, notes
            );
            
            if (submission) {
                Utils.showNotification('Availability submitted successfully', 'success');
                form.reset();
                document.querySelectorAll('.availability-check').forEach(check => {
                    check.checked = false;
                });
                
                // Update UI components
                this.updateAvailabilityTable();
                this.updateDashboardStats();
                
                // Add the employee to the manager if not present
                this.#employeeManager.getEmployee(employeeName);
                this.#employeeManager.saveEmployees();
                
                // Switch to the saved availability tab
                showTab('saved-availability-tab');
            }
        });
    }
    
    // Initialize table filters
    initTableFilters() {
        const weekFilter = document.getElementById('availability-week-filter');
        if (weekFilter) {
            weekFilter.addEventListener('change', () => {
                this.updateAvailabilityTable();
            });
        }
    }
    
    // Initialize modal handlers
    initModals() {
        // Requirements modal
        const requirementsModal = document.getElementById('requirementsModal');
        if (requirementsModal) {
            const saveBtn = document.getElementById('saveRequirements');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveRequirementsFromForm();
                    const bsModal = bootstrap.Modal.getInstance(requirementsModal);
                    bsModal.hide();
                });
            }
            
            // Add event listener for when the modal is shown
            requirementsModal.addEventListener('shown.bs.modal', () => {
                // Make sure we populate the form after the modal is fully shown
                this.populateRequirementsForm();
            });
        }
        
        // Schedule generation modal
        const scheduleGenBtn = document.getElementById('generate-schedule-btn');
        const scheduleGenerationModal = document.getElementById('scheduleGenerationModal');
        const confirmGenerateBtn = document.getElementById('confirmGenerateSchedule');
        const scheduleWeekInput = document.getElementById('schedule-week');
        
        if (scheduleGenBtn && scheduleGenerationModal && confirmGenerateBtn && scheduleWeekInput) {
            // Setup the generation modal
            scheduleGenBtn.addEventListener('click', () => {
                // Check if we have availability data
                const selectedWeek = scheduleWeekInput.value;
                this.updateScheduleGenerationModal(selectedWeek);
                
                const bsModal = new bootstrap.Modal(scheduleGenerationModal);
                bsModal.show();
            });
            
            // Check availability when week changes
            scheduleWeekInput.addEventListener('change', () => {
                this.updateScheduleGenerationModal(scheduleWeekInput.value);
            });
            
            // Generate schedule button
            confirmGenerateBtn.addEventListener('click', () => {
                const selectedWeek = scheduleWeekInput.value;
                
                const schedule = this.#shiftManager.generateSchedule(selectedWeek, this.#availabilityManager);
                
                if (schedule) {
                    Utils.showNotification('Schedule generated successfully', 'success');
                    
                    // Update UI
                    this.updateDailyScheduleView();
                    this.updateWeeklyScheduleView();
                    this.updateDashboardStats();
                    this.updateScheduleVisibility();
                    
                    // Close the modal
                    const bsModal = bootstrap.Modal.getInstance(scheduleGenerationModal);
                    bsModal.hide();
                    
                    // Switch to the daily view tab
                    showTab('daily-tab');
                }
            });
        }
        
        // Print buttons
        const printDailyBtn = document.getElementById('print-daily-btn');
        const printWeeklyBtn = document.getElementById('print-weekly-btn');
        
        if (printDailyBtn) {
            printDailyBtn.addEventListener('click', () => {
                window.print();
            });
        }
        
        if (printWeeklyBtn) {
            printWeeklyBtn.addEventListener('click', () => {
                window.print();
            });
        }
    }
    
    // Initialize export/import buttons
    initExportImportButtons() {
        // Export buttons
        const exportScheduleBtn = document.getElementById('export-schedule-btn');
        const exportAvailabilityBtn = document.getElementById('export-availability-btn');
        
        if (exportScheduleBtn) {
            exportScheduleBtn.addEventListener('click', () => {
                this.#shiftManager.exportSchedule();
            });
        }
        
        if (exportAvailabilityBtn) {
            exportAvailabilityBtn.addEventListener('click', () => {
                const weekFilter = document.getElementById('availability-week-filter');
                const selectedWeek = weekFilter && weekFilter.value !== 'all' ? weekFilter.value : null;
                this.#availabilityManager.exportAvailability(selectedWeek);
            });
        }
    }
    
    // Update the schedule generation modal based on availability
    updateScheduleGenerationModal(weekStarting) {
        const availabilityCheckResult = document.getElementById('availability-check-result');
        const availabilityCheckMessage = document.getElementById('availability-check-message');
        const confirmGenerateBtn = document.getElementById('confirmGenerateSchedule');
        
        if (!weekStarting || !availabilityCheckResult || !availabilityCheckMessage || !confirmGenerateBtn) {
            return;
        }
        
        // Check if we have availability data
        const availabilityCheck = this.#shiftManager.checkAvailabilityForSchedule(weekStarting, this.#availabilityManager);
        
        if (availabilityCheck.valid) {
            // Hide warning and enable button
            availabilityCheckResult.classList.add('d-none');
            confirmGenerateBtn.disabled = false;
        } else {
            // Show warning and disable button
            availabilityCheckResult.classList.remove('d-none');
            availabilityCheckResult.className = 'alert alert-warning';
            availabilityCheckMessage.textContent = availabilityCheck.reason;
            confirmGenerateBtn.disabled = true;
        }
    }
    
    // Update dashboard statistics
    updateDashboardStats() {
        // Update total employees count
        const totalEmployeesElem = document.getElementById('total-employees');
        if (totalEmployeesElem) {
            totalEmployeesElem.textContent = this.#employeeManager.count;
        }
        
        // Update availability submissions count
        const availabilityCountElem = document.getElementById('availability-count');
        if (availabilityCountElem) {
            availabilityCountElem.textContent = this.#availabilityManager.count;
        }
        
        // Update weekly shifts needed
        const weeklyShiftsElem = document.getElementById('weekly-shifts');
        if (weeklyShiftsElem) {
            weeklyShiftsElem.textContent = this.#requirementsManager.calculateTotalRequirements();
        }
        
        // Update schedule status
        const scheduleStatusElem = document.getElementById('schedule-status');
        if (scheduleStatusElem) {
            if (this.#shiftManager.hasSchedule) {
                scheduleStatusElem.textContent = 'Generated';
                scheduleStatusElem.style.color = 'var(--success-color)';
            } else {
                scheduleStatusElem.textContent = 'Not Generated';
                scheduleStatusElem.style.color = 'var(--warning-color)';
            }
        }
    }
    
    // Update requirements table on dashboard
    updateRequirementsTable() {
        const table = document.getElementById('requirements-overview-table');
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Create rows for each shift
        Object.values(SHIFTS).forEach(shift => {
            const row = document.createElement('tr');
            
            // Shift name cell
            const nameCell = document.createElement('td');
            nameCell.innerHTML = `${shift.id}<br>(${shift.start}:00 - ${shift.end}:00)`;
            row.appendChild(nameCell);
            
            // Day cells and calculate total
            let total = 0;
            DAYS.forEach(day => {
                const cell = document.createElement('td');
                const count = this.#requirementsManager.getRequirement(day, shift.id);
                cell.textContent = count;
                total += count;
                row.appendChild(cell);
            });
            
            // Total cell
            const totalCell = document.createElement('td');
            totalCell.textContent = total;
            row.appendChild(totalCell);
            
            tbody.appendChild(row);
        });
        
        // Add total row
        const totalRow = document.createElement('tr');
        totalRow.className = 'table-light';
        
        const totalLabelCell = document.createElement('td');
        totalLabelCell.innerHTML = '<strong>Total per day</strong>';
        totalRow.appendChild(totalLabelCell);
        
        // Calculate totals for each day
        let grandTotal = 0;
        DAYS.forEach(day => {
            const totalCell = document.createElement('td');
            const dayTotal = this.#requirementsManager.calculateDayTotal(day);
            totalCell.textContent = dayTotal;
            grandTotal += dayTotal;
            totalRow.appendChild(totalCell);
        });
        
        // Grand total
        const grandTotalCell = document.createElement('td');
        grandTotalCell.textContent = grandTotal;
        totalRow.appendChild(grandTotalCell);
        
        tbody.appendChild(totalRow);
    }
    
    // Save requirements from form
    saveRequirementsFromForm() {
        const form = document.getElementById('requirementsForm');
        if (!form) return;
        
        DAYS.forEach(day => {
            Object.values(SHIFTS).forEach(shift => {
                const input = form.querySelector(`input[data-day="${day}"][data-shift="${shift.id}"]`);
                if (input) {
                    const count = parseInt(input.value) || 0;
                    this.#requirementsManager.setRequirement(day, shift.id, count);
                }
            });
        });
        
        // Update UI components
        this.updateRequirementsTable();
        this.updateDashboardStats();
        
        Utils.showNotification('Shift requirements updated successfully', 'success');
    }
    
    // Populate the requirements form
    populateRequirementsForm() {
        console.log("Populating requirements form");
        const form = document.getElementById('requirementsForm');
        if (!form) {
            console.error("Requirements form not found");
            return;
        }
        
        form.innerHTML = '';
        
        // Create a section for each day
        DAYS.forEach(day => {
            const daySection = document.createElement('div');
            daySection.className = 'mb-3';
            
            const dayHeading = document.createElement('h5');
            dayHeading.textContent = day;
            daySection.appendChild(dayHeading);
            
            const shiftsContainer = document.createElement('div');
            shiftsContainer.className = 'row g-2';
            
            // Create input for each shift
            Object.values(SHIFTS).forEach(shift => {
                const col = document.createElement('div');
                col.className = 'col-md-3';
                
                const inputGroup = document.createElement('div');
                inputGroup.className = 'input-group input-group-sm';
                
                const label = document.createElement('span');
                label.className = 'input-group-text';
                label.textContent = shift.id;
                
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'form-control';
                input.min = '0';
                input.value = this.#requirementsManager.getRequirement(day, shift.id);
                input.dataset.day = day;
                input.dataset.shift = shift.id;
                
                inputGroup.appendChild(label);
                inputGroup.appendChild(input);
                col.appendChild(inputGroup);
                shiftsContainer.appendChild(col);
            });
            
            daySection.appendChild(shiftsContainer);
            form.appendChild(daySection);
        });
    }
    
    // Update the availability submissions table
    updateAvailabilityTable() {
        const table = document.getElementById('saved-availability-table');
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Get all submissions
        const submissions = this.#availabilityManager.submissions;
        
        // Get selected week filter
        const weekFilter = document.getElementById('availability-week-filter');
        const selectedWeek = weekFilter ? weekFilter.value : 'all';
        
        // Update week filter options
        if (weekFilter) {
            // Store current selection
            const currentSelection = weekFilter.value;
            
            // Clear all options except "All Weeks"
            while (weekFilter.options.length > 1) {
                weekFilter.remove(1);
            }
            
            // Get unique weeks
            const weeks = this.#availabilityManager.getUniqueWeeks();
            
            // Add options
            weeks.forEach(week => {
                const option = document.createElement('option');
                option.value = week;
                option.textContent = Utils.formatDate(new Date(week));
                weekFilter.appendChild(option);
            });
            
            // Restore selection if possible
            if (currentSelection !== 'all' && weeks.includes(currentSelection)) {
                weekFilter.value = currentSelection;
            }
        }
        
        // Filter submissions by week if needed
        let filteredSubmissions = submissions;
        if (selectedWeek !== 'all') {
            filteredSubmissions = submissions.filter(
                submission => submission.weekStarting === selectedWeek
            );
        }
        
        // Sort by most recent first
        filteredSubmissions.sort((a, b) => new Date(b.submittedOn) - new Date(a.submittedOn));
        
        // Show/hide no availability alert
        const noAvailabilityAlert = document.getElementById('no-availability-alert');
        if (noAvailabilityAlert) {
            noAvailabilityAlert.classList.toggle('d-none', filteredSubmissions.length > 0);
        }
        
        // Add rows
        filteredSubmissions.forEach(submission => {
            const row = document.createElement('tr');
            
            // Employee name
            const nameCell = document.createElement('td');
            nameCell.textContent = submission.employee;
            row.appendChild(nameCell);
            
            // Week starting
            const weekCell = document.createElement('td');
            weekCell.textContent = Utils.formatDate(new Date(submission.weekStarting));
            row.appendChild(weekCell);
            
            // Available shifts count
            const shiftsCell = document.createElement('td');
            let availableCount = 0;
            
            Object.values(submission.availableShifts).forEach(shifts => {
                availableCount += shifts.length;
            });
            
            shiftsCell.innerHTML = `<span class="badge bg-primary">${availableCount}</span>`;
            row.appendChild(shiftsCell);
            
            // Submitted on
            const dateCell = document.createElement('td');
            dateCell.textContent = Utils.formatDate(new Date(submission.submittedOn));
            row.appendChild(dateCell);
            
            // Actions
            const actionsCell = document.createElement('td');
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-sm btn-outline-primary me-2';
            viewBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
            viewBtn.addEventListener('click', () => {
                this.showAvailabilityDetails(submission);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-outline-danger';
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this availability submission?')) {
                    this.#availabilityManager.deleteSubmission(submission.id);
                    this.updateAvailabilityTable();
                    this.updateDashboardStats();
                    Utils.showNotification('Availability submission deleted', 'info');
                }
            });
            
            actionsCell.appendChild(viewBtn);
            actionsCell.appendChild(deleteBtn);
            row.appendChild(actionsCell);
            
            tbody.appendChild(row);
        });
        
        // If no submissions, show a message
        if (tbody.children.length === 0 && filteredSubmissions.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 5;
            cell.textContent = 'No availability submissions for the selected filter';
            cell.className = 'text-center';
            row.appendChild(cell);
            tbody.appendChild(row);
        }
    }
    
    // Show availability details modal
    showAvailabilityDetails(submission) {
        const modal = document.getElementById('availabilityDetailModal');
        if (!modal) return;
        
        const modalTitle = modal.querySelector('.modal-title');
        modalTitle.textContent = `${submission.employee}'s Availability - Week of ${Utils.formatDate(new Date(submission.weekStarting))}`;
        
        const table = modal.querySelector('#availability-detail-table tbody');
        table.innerHTML = '';
        
        // Create rows for each shift
        Object.values(SHIFTS).forEach(shift => {
            const row = document.createElement('tr');
            
            // Shift name cell
            const shiftCell = document.createElement('td');
            shiftCell.textContent = shift.id;
            row.appendChild(shiftCell);
            
            // Day cells
            DAYS.forEach(day => {
                const cell = document.createElement('td');
                const isAvailable = submission.availableShifts[day] && 
                    submission.availableShifts[day].includes(shift.id);
                
                if (isAvailable) {
                    cell.innerHTML = '<i class="fa-solid fa-check text-success"></i>';
                } else {
                    cell.innerHTML = '<i class="fa-solid fa-xmark text-danger"></i>';
                }
                
                row.appendChild(cell);
            });
            
            table.appendChild(row);
        });
        
        // Notes
        const notesElem = modal.querySelector('#detail-notes');
        notesElem.textContent = submission.notes || 'No additional notes provided.';
        
        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
    
    // Update daily schedule view
    updateDailyScheduleView(date = new Date()) {
        if (!this.#shiftManager.hasSchedule) return;
        
        const dayName = DAYS[date.getDay()];
        const daySchedule = this.#shiftManager.getDaySchedule(dayName);
        
        if (!daySchedule) return;
        
        // Set current date in header
        const currentDateElem = document.getElementById('current-date');
        if (currentDateElem) {
            currentDateElem.textContent = Utils.formatDate(date);
        }
        
        // Update each shift row
        Object.values(SHIFTS).forEach(shift => {
            const cellSelector = `.assigned-employees[data-shift="${shift.id}"]`;
            const cell = document.querySelector(cellSelector);
            if (!cell) return;
            
            // Clear existing content
            cell.innerHTML = '';
            
            // Add assigned employees
            const assignedEmployees = daySchedule[shift.id] || [];
            assignedEmployees.forEach(empName => {
                const employee = this.#employeeManager.getEmployee(empName);
                const tag = employee.createEmployeeTag();
                cell.appendChild(tag);
            });
            
            // Update status cell
            const row = cell.closest('tr');
            const statusCell = row.querySelector('td:last-child');
            const requiredCell = row.querySelector('td:nth-child(3)');
            
            if (statusCell && requiredCell) {
                const required = parseInt(requiredCell.querySelector('.badge').textContent);
                const assigned = assignedEmployees.length;
                
                let status, badgeClass;
                if (assigned === 0) {
                    status = 'Unfilled';
                    badgeClass = 'bg-danger';
                } else if (assigned < required) {
                    status = 'Partial';
                    badgeClass = 'bg-warning';
                } else {
                    status = 'Filled';
                    badgeClass = 'bg-success';
                }
                
                statusCell.innerHTML = `<span class="badge ${badgeClass}">${status}</span>`;
            }
        });
    }
    
    // Update weekly schedule view
    updateWeeklyScheduleView() {
        if (!this.#shiftManager.hasSchedule) return;
        
        const weeklyTable = document.getElementById('weekly-schedule-table');
        if (!weeklyTable) return;
        
        const tbody = weeklyTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        // Set week range in header
        const weekStart = new Date(this.#shiftManager.currentWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const weekRangeElem = document.getElementById('week-range');
        if (weekRangeElem) {
            weekRangeElem.textContent = `${Utils.formatDate(weekStart)} - ${Utils.formatDate(weekEnd)}`;
        }
        
        // Create tracking of assigned employees to avoid duplicates
        const assignedEmployees = new Set();
        
        // First, identify all employees in the schedule
        DAYS.forEach(day => {
            const daySchedule = this.#shiftManager.getDaySchedule(day);
            if (!daySchedule) return;
            
            Object.values(SHIFTS).forEach(shift => {
                const employees = daySchedule[shift.id] || [];
                employees.forEach(emp => assignedEmployees.add(emp));
            });
        });
        
        // Create a row for each employee
        [...assignedEmployees].sort().forEach(empName => {
            const employee = this.#employeeManager.getEmployee(empName);
            const row = document.createElement('tr');
            
            // Employee name cell
            const nameCell = document.createElement('td');
            nameCell.textContent = empName;
            nameCell.style.fontWeight = 'bold';
            row.appendChild(nameCell);
            
            // Day cells
            let totalHours = 0;
            DAYS.forEach(day => {
                const cell = document.createElement('td');
                const daySchedule = this.#shiftManager.getDaySchedule(day);
                
                // Find if employee is assigned to any shift on this day
                let assigned = false;
                
                if (daySchedule) {
                    Object.values(SHIFTS).forEach(shift => {
                        const employees = daySchedule[shift.id] || [];
                        if (employees.includes(empName)) {
                            assigned = true;
                            
                            // Calculate hours
                            const hours = shift.end > shift.start ? 
                                shift.end - shift.start : 
                                (24 - shift.start) + shift.end;
                            
                            totalHours += hours;
                            
                            // Create badge
                            const badge = document.createElement('span');
                            badge.className = 'badge';
                            badge.style.backgroundColor = employee.backgroundColor;
                            badge.style.color = employee.textColor;
                            badge.innerHTML = `${shift.id}<br>${shift.start}:00-${shift.end}:00`;
                            
                            cell.appendChild(badge);
                        }
                    });
                }
                
                if (!assigned) {
                    cell.textContent = '-';
                }
                
                row.appendChild(cell);
            });
            
            // Total hours cell
            const hoursCell = document.createElement('td');
            hoursCell.textContent = totalHours;
            row.appendChild(hoursCell);
            
            tbody.appendChild(row);
        });
        
        // If no employees in schedule, show message
        if (tbody.children.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 9;
            cell.textContent = 'No schedule data available';
            cell.className = 'text-center';
            row.appendChild(cell);
            tbody.appendChild(row);
        }
    }
    
    // Update schedule visibility based on current state
    updateScheduleVisibility() {
        const hasSchedule = this.#shiftManager.hasSchedule;
        
        // Show/hide no schedule alerts
        const noScheduleAlert = document.getElementById('no-schedule-alert');
        const noWeeklyScheduleAlert = document.getElementById('no-weekly-schedule-alert');
        
        if (noScheduleAlert) {
            noScheduleAlert.classList.toggle('d-none', hasSchedule);
        }
        
        if (noWeeklyScheduleAlert) {
            noWeeklyScheduleAlert.classList.toggle('d-none', hasSchedule);
        }
        
        // Update schedule views if available
        if (hasSchedule) {
            this.updateDailyScheduleView();
            this.updateWeeklyScheduleView();
        }
    }
}