// OpenAI Schedule Generator
class OpenAIScheduleGenerator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.model = "gpt-4o";
        this.maxTokens = 300;
    }

    // Fetch availability submissions from GitHub
    async fetchAvailabilitySubmissions() {
        try {
            // List of files in the shifts/availability directory
            const availabilityFiles = [
                'shifts/availability/OmerS_availability_30/03-05/04_2025.json',
                'shifts/availability/OmerK_availability_13/04-19/04_2025.json',
                'shifts/availability/Alex_availability_30/03-05/04_2025.json'
            ];

            // Fetch all availability submissions
            const submissions = await Promise.all(
                availabilityFiles.map(async (file) => {
                    const response = await fetch(file);
                    return response.json();
                })
            );

            return submissions;
        } catch (error) {
            console.error('Error fetching availability submissions:', error);
            return [];
        }
    }

    // Generate schedule using OpenAI
    async generateSchedule() {
        try {
            // Fetch availability submissions
            const availabilityData = await this.fetchAvailabilitySubmissions();

            // Prepare the prompt
            const prompt = this.createPrompt(availabilityData);

            // Make API call to OpenAI
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: "You are an advanced scheduling assistant that generates optimal work schedules."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: this.maxTokens,
                    temperature: 0.7,
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            
            // Extract and parse the schedule
            const schedule = JSON.parse(data.choices[0].message.content);
            
            return schedule;
        } catch (error) {
            console.error('Error generating schedule:', error);
            throw error;
        }
    }

    // Create a detailed prompt for schedule generation
    createPrompt(availabilityData) {
        return `Generate an optimal weekly schedule based on the following availability data:

AVAILABILITY DETAILS:
${JSON.stringify(availabilityData, null, 2)}

SCHEDULING REQUIREMENTS:
- 3 employees for Morning A shifts each day
- 2 employees for Morning B shifts each day
- 3 employees for Noon shifts each day
- 2 employees for Night shifts each day

CONSTRAINTS:
1. No employee works more than 3 shifts per week
2. An employee cannot work more than one shift per day
3. Night shift limited to 1 per employee per week
4. Ensure at least 8 hours rest between shifts
5. Distribute shifts fairly among available employees

Provide the schedule in this JSON format:
{
  "schedule": {
    "Sunday": {
      "Morning A": ["Employee1", "Employee2", "Employee3"],
      "Morning B": ["Employee4", "Employee5"],
      "Noon": ["Employee6", "Employee7", "Employee8"],
      "Night": ["Employee9", "Employee10"]
    },
    // Similar structure for other days
  }
}`;
    }
}

// Integrate with existing project
function initOpenAIScheduleIntegration() {
    // Add button to schedule generation modal
    const modalFooter = document.querySelector('#scheduleGenerationModal .modal-footer');
    if (modalFooter) {
        const openaiButton = document.createElement('button');
        openaiButton.type = 'button';
        openaiButton.className = 'btn btn-primary me-auto';
        openaiButton.id = 'generate-openai-schedule-btn';
        openaiButton.innerHTML = '<i class="fa-solid fa-robot me-2"></i>Generate with OpenAI';
        
        openaiButton.addEventListener('click', async () => {
            // Replace with your actual OpenAI API key
            const API_KEY = 'your-openai-api-key';
            
            try {
                // Close the modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleGenerationModal'));
                if (modal) modal.hide();
                
                // Create scheduler
                const scheduler = new OpenAIScheduleGenerator(API_KEY);
                
                // Generate schedule
                const generatedSchedule = await scheduler.generateSchedule();
                
                // Display the generated schedule
                displayGeneratedSchedule(generatedSchedule);
            } catch (error) {
                console.error('Schedule generation error:', error);
                Utils.showNotification('Failed to generate schedule', 'error');
            }
        });
        
        // Add the button to the modal footer
        modalFooter.prepend(openaiButton);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initOpenAIScheduleIntegration);