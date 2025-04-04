// AI Scheduling Integration for Shift Management System
// Add this file to your project and include it in your HTML after all other scripts

// First, load the OpenAI Schedule Generator
document.addEventListener('DOMContentLoaded', () => {
    // Create script for the OpenAI Schedule Generator
    const openAIScheduleScript = document.createElement('script');
    openAIScheduleScript.src = 'OpenAIScheduleGenerator.js';
    openAIScheduleScript.onload = () => {
      console.log('OpenAI Schedule Generator loaded');
      
      // Then, load the Schedule UI component
      const scheduleUIScript = document.createElement('script');
      scheduleUIScript.src = 'ScheduleUIManager.js';
      scheduleUIScript.onload = () => {
        console.log('Schedule UI Manager loaded');
        
        // Finally, load the AI Schedule Integration
        const aiIntegrationScript = document.createElement('script');
        aiIntegrationScript.src = 'AIScheduleIntegration.js';
        aiIntegrationScript.onload = () => {
          console.log('AI Schedule Integration loaded');
        };
        document.head.appendChild(aiIntegrationScript);
      };
      document.head.appendChild(scheduleUIScript);
    };
    document.head.appendChild(openAIScheduleScript);
  });
  
  // You can also load the styles
  const style = document.createElement('style');
  style.textContent = `
  /* AI Schedule Styles */
  .ai-schedule-section {
    margin-top: 2rem;
  }
  
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