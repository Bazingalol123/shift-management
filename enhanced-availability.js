// Enhanced Availability Submission Interface
function enhanceAvailabilityForm() {
    const availabilityTable = document.getElementById('availability-input-table');
    if (!availabilityTable) return;
    
    // Get the container where the form is located
    const formContainer = document.querySelector('#availability-view .card-body');
    if (!formContainer) return;
    
    // Create a modern replacement interface
    const modernInterface = document.createElement('div');
    modernInterface.id = 'modern-availability-interface';
    modernInterface.className = 'mb-4';
    
    // Create instructions
    modernInterface.innerHTML = `
      <div class="alert alert-info mb-3">
        <i class="fa-solid fa-circle-info me-2"></i>
        <strong>Interactive Availability Selection:</strong> Drag shifts to the calendar or click to toggle.
      </div>
      <div class="availability-grid">
        <div class="shift-palette">
          <h6 class="text-center mb-3">Available Shifts</h6>
          <div class="shift-options">
            <div class="shift-option" data-shift="Morning A" draggable="true">
              <div class="shift-pill morning-a">
                <i class="fa-solid fa-sun me-2"></i>Morning A
                <small>07:00 - 15:00</small>
              </div>
            </div>
            <div class="shift-option" data-shift="Morning B" draggable="true">
              <div class="shift-pill morning-b">
                <i class="fa-solid fa-sun me-2"></i>Morning B
                <small>09:00 - 17:00</small>
              </div>
            </div>
            <div class="shift-option" data-shift="Noon" draggable="true">
              <div class="shift-pill noon">
                <i class="fa-solid fa-cloud-sun me-2"></i>Noon
                <small>15:00 - 23:00</small>
              </div>
            </div>
            <div class="shift-option" data-shift="Night" draggable="true">
              <div class="shift-pill night">
                <i class="fa-solid fa-moon me-2"></i>Night
                <small>23:00 - 07:00</small>
              </div>
            </div>
          </div>
        </div>
        <div class="availability-calendar">
          <div class="days-header">
            <div class="day-header">Sunday</div>
            <div class="day-header">Monday</div>
            <div class="day-header">Tuesday</div>
            <div class="day-header">Wednesday</div>
            <div class="day-header">Thursday</div>
            <div class="day-header">Friday</div>
            <div class="day-header">Saturday</div>
          </div>
          <div class="days-grid">
            <!-- Day cells will be added here -->
          </div>
        </div>
      </div>
    `;
    
    // Insert before the original table
    availabilityTable.parentNode.insertBefore(modernInterface, availabilityTable);
    
    // Hide the original table
    availabilityTable.style.display = 'none';
    
    // Create the day cells
    const daysGrid = modernInterface.querySelector('.days-grid');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    days.forEach(day => {
      const dayCell = document.createElement('div');
      dayCell.className = 'day-cell';
      dayCell.dataset.day = day;
      
      const dayLabel = document.createElement('div');
      dayLabel.className = 'day-label';
      dayLabel.textContent = day;
      
      const shiftsContainer = document.createElement('div');
      shiftsContainer.className = 'shifts-container';
      shiftsContainer.dataset.day = day;
      
      dayCell.appendChild(shiftsContainer);
      daysGrid.appendChild(dayCell);
    });
    
    // Add the CSS styles
    const styles = document.createElement('style');
    styles.textContent = `
      .availability-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
      }
      
      @media (min-width: 992px) {
        .availability-grid {
          flex-direction: row;
        }
        
        .shift-palette {
          width: 20%;
        }
        
        .availability-calendar {
          width: 80%;
        }
      }
      
      .shift-palette {
        background-color: #f8f9fa;
        border-radius: 0.5rem;
        padding: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      .shift-options {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      
      .shift-option {
        cursor: grab;
      }
      
      .shift-pill {
        border-radius: 1rem;
        padding: 0.5rem 1rem;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        transition: all 0.2s;
      }
      
      .shift-pill:hover {
        transform: translateY(-2px);
        box-shadow: 0 3px 6px rgba(0,0,0,0.1);
      }
      
      .shift-pill small {
        font-size: 0.75rem;
        opacity: 0.8;
      }
      
      .morning-a {
        background-color: #4e73df;
      }
      
      .morning-b {
        background-color: #36b9cc;
      }
      
      .noon {
        background-color: #f6c23e;
        color: #444;
      }
      
      .night {
        background-color: #1a1a2e;
      }
      
      .availability-calendar {
        border: 1px solid #dee2e6;
        border-radius: 0.5rem;
        overflow: hidden;
      }
      
      .days-header {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        background-color: var(--light-gray);
        border-bottom: 1px solid #dee2e6;
      }
      
      .day-header {
        padding: 0.75rem;
        text-align: center;
        font-weight: 600;
        border-right: 1px solid #dee2e6;
      }
      
      .day-header:last-child {
        border-right: none;
      }
      
      .days-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        height: 250px;
      }
      
      .day-cell {
        border-right: 1px solid #dee2e6;
        position: relative;
        display: flex;
        flex-direction: column;
      }
      
      .day-cell:last-child {
        border-right: none;
      }
      
      .day-label {
        padding: 0.25rem;
        font-size: 0.8rem;
        text-align: center;
        border-bottom: 1px solid #dee2e6;
        font-weight: 500;
      }
      
      .shifts-container {
        flex-grow: 1;
        padding: 0.5rem;
        overflow-y: auto;
        min-height: 200px;
      }
      
      .shifts-container.drag-over {
        background-color: var(--light-purple);
      }
      
      .selected-shift {
        margin-bottom: 0.5rem;
        opacity: 0.9;
        animation: fadeIn 0.3s;
      }
      
      .selected-shift .shift-pill {
        cursor: pointer;
      }
      
      .selected-shift:hover {
        opacity: 1;
      }
      
      .selected-shift .remove-shift {
        display: none;
        position: absolute;
        right: 5px;
        top: 5px;
        background: rgba(255,255,255,0.7);
        border-radius: 50%;
        width: 22px;
        height: 22px;
        text-align: center;
        line-height: 20px;
        color: #dc3545;
      }
      
      .selected-shift:hover .remove-shift {
        display: block;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 0.9; transform: translateY(0); }
      }
      
      .shift-count-badge {
        position: absolute;
        top: 0;
        right: 0;
        background-color: var(--secondary-color);
        color: white;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        transform: translate(50%, -50%);
      }
    `;
    document.head.appendChild(styles);
    
    // Initialize drag and drop
    initDragAndDrop();
    
    // Add the JavaScript functions for the drag and drop functionality
    function initDragAndDrop() {
      const shiftOptions = document.querySelectorAll('.shift-option');
      const shiftContainers = document.querySelectorAll('.shifts-container');
      
      // Make shift options draggable
      shiftOptions.forEach(option => {
        option.addEventListener('dragstart', handleDragStart);
        option.addEventListener('click', handleShiftOptionClick);
      });
      
      // Setup drop zones
      shiftContainers.forEach(container => {
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragenter', handleDragEnter);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
        container.addEventListener('click', handleContainerClick);
      });
      
      // Initialize from existing checkbox data
      initializeFromCheckboxes();
      
      // Add submit handler to sync with checkboxes
      const form = document.getElementById('availability-form');
      if (form) {
        form.addEventListener('submit', syncWithCheckboxes, true);
      }
    }
    
    function handleDragStart(e) {
      e.dataTransfer.setData('text/plain', e.currentTarget.dataset.shift);
      e.currentTarget.classList.add('dragging');
    }
    
    function handleDragOver(e) {
      e.preventDefault(); // Allow drop
    }
    
    function handleDragEnter(e) {
      e.preventDefault();
      e.currentTarget.classList.add('drag-over');
    }
    
    function handleDragLeave(e) {
      e.currentTarget.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
      e.preventDefault();
      const container = e.currentTarget;
      container.classList.remove('drag-over');
      
      const shift = e.dataTransfer.getData('text/plain');
      const day = container.dataset.day;
      
      addShiftToDay(shift, day, container);
      
      // Update the original checkbox
      updateCheckbox(day, shift, true);
      
      // Update count badge
      updateShiftCount(container);
    }
    
    function handleShiftOptionClick(e) {
      // Show a dropdown to select which day to add this shift to
      const shift = e.currentTarget.dataset.shift;
      
      // Create dropdown menu
      const dropdown = document.createElement('div');
      dropdown.className = 'dropdown-menu show';
      dropdown.style.position = 'absolute';
      dropdown.style.left = `${e.pageX}px`;
      dropdown.style.top = `${e.pageY}px`;
      dropdown.style.zIndex = '1050';
      
      // Add days as options
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      days.forEach(day => {
        const option = document.createElement('a');
        option.className = 'dropdown-item';
        option.href = '#';
        option.textContent = day;
        option.addEventListener('click', (event) => {
          event.preventDefault();
          
          // Find the container for this day
          const container = document.querySelector(`.shifts-container[data-day="${day}"]`);
          if (container) {
            addShiftToDay(shift, day, container);
            updateCheckbox(day, shift, true);
            updateShiftCount(container);
          }
          
          // Remove dropdown
          document.body.removeChild(dropdown);
        });
        dropdown.appendChild(option);
      });
      
      // Add to document body
      document.body.appendChild(dropdown);
      
      // Remove dropdown when clicking outside
      setTimeout(() => {
        const clickHandler = () => {
          if (document.body.contains(dropdown)) {
            document.body.removeChild(dropdown);
          }
          document.removeEventListener('click', clickHandler);
        };
        document.addEventListener('click', clickHandler);
      }, 100);
    }
    
    function handleContainerClick(e) {
      // Only handle clicks directly on the container, not its children
      if (e.target !== e.currentTarget) return;
      
      const container = e.currentTarget;
      const day = container.dataset.day;
      
      // Show a dropdown to add shifts
      const dropdown = document.createElement('div');
      dropdown.className = 'dropdown-menu show';
      dropdown.style.position = 'absolute';
      dropdown.style.left = `${e.pageX}px`;
      dropdown.style.top = `${e.pageY}px`;
      dropdown.style.zIndex = '1050';
      
      // Add shift options
      const shifts = ['Morning A', 'Morning B', 'Noon', 'Night'];
      shifts.forEach(shift => {
        const option = document.createElement('a');
        option.className = 'dropdown-item';
        option.href = '#';
        
        // Check if this shift is already added to this day
        const existingShift = container.querySelector(`.selected-shift[data-shift="${shift}"]`);
        if (existingShift) {
          option.classList.add('text-danger');
          option.innerHTML = `<i class="fa-solid fa-times me-2"></i>Remove ${shift}`;
          option.addEventListener('click', (event) => {
            event.preventDefault();
            container.removeChild(existingShift);
            updateCheckbox(day, shift, false);
            updateShiftCount(container);
            document.body.removeChild(dropdown);
          });
        } else {
          option.innerHTML = `<i class="fa-solid fa-plus me-2"></i>Add ${shift}`;
          option.addEventListener('click', (event) => {
            event.preventDefault();
            addShiftToDay(shift, day, container);
            updateCheckbox(day, shift, true);
            updateShiftCount(container);
            document.body.removeChild(dropdown);
          });
        }
        
        dropdown.appendChild(option);
      });
      
      // Add to document body
      document.body.appendChild(dropdown);
      
      // Remove dropdown when clicking outside
      setTimeout(() => {
        const clickHandler = () => {
          if (document.body.contains(dropdown)) {
            document.body.removeChild(dropdown);
          }
          document.removeEventListener('click', clickHandler);
        };
        document.addEventListener('click', clickHandler);
      }, 100);
    }
    
    function addShiftToDay(shift, day, container) {
      // Check if this shift is already added
      const existingShift = container.querySelector(`.selected-shift[data-shift="${shift}"]`);
      if (existingShift) return;
      
      // Create the shift element
      const shiftElement = document.createElement('div');
      shiftElement.className = 'selected-shift position-relative';
      shiftElement.dataset.shift = shift;
      
      // Get the appropriate CSS class for this shift
      const shiftClass = shift.toLowerCase().replace(' ', '-');
      
      shiftElement.innerHTML = `
        <div class="shift-pill ${shiftClass}">
          ${getShiftIcon(shift)} ${shift}
        </div>
        <span class="remove-shift" title="Remove this shift">&times;</span>
      `;
      
      // Add click handler to remove
      const removeBtn = shiftElement.querySelector('.remove-shift');
      removeBtn.addEventListener('click', () => {
        container.removeChild(shiftElement);
        updateCheckbox(day, shift, false);
        updateShiftCount(container);
      });
      
      // Add to container
      container.appendChild(shiftElement);
    }
    
    function getShiftIcon(shift) {
      switch(shift) {
        case 'Morning A':
        case 'Morning B':
          return '<i class="fa-solid fa-sun me-1"></i>';
        case 'Noon':
          return '<i class="fa-solid fa-cloud-sun me-1"></i>';
        case 'Night':
          return '<i class="fa-solid fa-moon me-1"></i>';
        default:
          return '<i class="fa-solid fa-clock me-1"></i>';
      }
    }
    
    function updateCheckbox(day, shift, checked) {
      const checkbox = document.querySelector(`.availability-check[data-day="${day}"][data-shift="${shift}"]`);
      if (checkbox) {
        checkbox.checked = checked;
      }
    }
    
    function updateShiftCount(container) {
      const count = container.querySelectorAll('.selected-shift').length;
      
      // Find or create the badge
      let badge = container.querySelector('.shift-count-badge');
      
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'shift-count-badge';
          container.appendChild(badge);
        }
        badge.textContent = count;
      } else if (badge) {
        container.removeChild(badge);
      }
    }
    
    function initializeFromCheckboxes() {
      // Get all checked checkboxes
      const checkedBoxes = document.querySelectorAll('.availability-check:checked');
      
      // Add shifts to the appropriate containers
      checkedBoxes.forEach(checkbox => {
        const day = checkbox.dataset.day;
        const shift = checkbox.dataset.shift;
        
        // Find the container
        const container = document.querySelector(`.shifts-container[data-day="${day}"]`);
        if (container) {
          addShiftToDay(shift, day, container);
          updateShiftCount(container);
        }
      });
    }
    
    function syncWithCheckboxes(e) {
      // This ensures the new UI updates the checkboxes before submission
      // The form's normal submit handler will handle sending the data
      console.log('Syncing modern interface with checkboxes');
    }
  }
  
  // Initialize the enhanced form when the DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure the original form is loaded
    setTimeout(() => {
      enhanceAvailabilityForm();
    }, 1000);
  });