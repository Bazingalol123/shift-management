// OpenAI Schedule Generator with GitHub Weekly Files Integration
class OpenAIScheduleGenerator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.model = "gpt-4.5-preview";
        this.maxTokens = 5000;
        this.temperature = 1.9;
        this.top_p = 0;
    }

    // Fetch availability submissions from GitHub weekly files
    async fetchAvailabilitySubmissions() {
        try {
            // Use the GitHub integration function to get available weekly files
            const weeklyFiles = await fetchAvailableWeeklyFiles();
            
            // If no files found, return empty array
            if (weeklyFiles.length === 0) {
                console.warn('No weekly availability files found');
                return [];
            }

            // Fetch the most recent week's data
            const mostRecentWeek = weeklyFiles[0];
            
            // Fetch the specific weekly file
            const weeklyData = await fetchWeeklyAvailabilityFile(mostRecentWeek.weekStart);
            
            // Return the submissions from the file
            return weeklyData?.submissions || [];
        } catch (error) {
            console.error('Error fetching availability submissions:', error);
            return [];
        }
    }

    // Generate schedule using OpenAI
    async generateSchedule() {
        try {
            debugger;
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
                    max_tokens: this.maxTokens,
                    temperature: this.temperature,
                    top_p: this.top_p,
                    messages: [
                        {
                            role: "system",
                            content: `You are an advanced shift scheduling AI. Your responsibilities include:
                            - Ensuring that the days is staffed with the following requirements:
                            For sundays: 
                              - 1 employee for Morning A shifts
                              - 1 employees for Morning B shifts
                              - 2 employees for Noon shifts
                              - 1 employee for Night shifts
                            For Saturdays: 
                              - 1 employee for Morning A shifts
                              - 0 employees for Morning B shifts
                              - 1 employees for Noon shifts
                              - 1 employee for Night shifts
                            For monday to friday: 
                              - 1 employee for Morning A shifts
                              - 1 employees for Morning B shifts
                              - 2 employees for Noon shifts
                              - 1 employee for Night shifts
                            
                            - Adhering to the following constraints:
                              - No employee works less than 3 shifts per week
                              - No employee works night shifts more than once per week
                             - an employee can't work two shifts on the same day
                              - Respecting individual shift preferences
                              - Ensuring adequate rest between shifts
                             - If you can, gap with at least 2 shifts between schedueling emplyoees
                             - If you can't fill the schedule, leave places blank
                            Please only respond with a JSON object of the availabiltiy.schedule`

                        },
                        {
                            role: "user",
                            content: `{
                                "weekStart": "2025-04-20",
                                "weekEnd": "2025-04-26",
                                "lastUpdated": "2025-04-03T00:44:06.821Z",
                                "submissions": [
                                  {
                                    "employee": "Tomer",
                                    "submittedOn": "2025-04-03T00:37:58.193Z",
                                    "notes": "",
                                    "availableShifts": {
                                      "Sunday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Monday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Tuesday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Wednesday": [
                                        "Night"
                                      ],
                                      "Thursday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Friday": [
                                        "Morning A"
                                      ],
                                      "Saturday": []
                                    }
                                  },
                                  {
                                    "employee": "OmerK",
                                    "submittedOn": "2025-04-03T00:39:14.014Z",
                                    "notes": "",
                                    "availableShifts": {
                                      "Sunday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Monday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Tuesday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Wednesday": [],
                                      "Thursday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Friday": [
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Saturday": []
                                    }
                                  },
                                  {
                                    "employee": "Ariel",
                                    "submittedOn": "2025-04-03T00:41:03.430Z",
                                    "notes": "",
                                    "availableShifts": {
                                      "Sunday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Monday": [
                                        "Morning A"
                                      ],
                                      "Tuesday": [],
                                      "Wednesday": [],
                                      "Thursday": [
                                        "Night"
                                      ],
                                      "Friday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Saturday": [
                                        "Morning B",
                                        "Noon",
                                        "Night"
                                      ]
                                    }
                                  },
                                  {
                                    "employee": "Dor",
                                    "submittedOn": "2025-04-03T00:41:51.922Z",
                                    "notes": "",
                                    "availableShifts": {
                                      "Sunday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Monday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Tuesday": [
                                        "Noon"
                                      ],
                                      "Wednesday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Thursday": [
                                        "Morning A"
                                      ],
                                      "Friday": [],
                                      "Saturday": [
                                        "Night"
                                      ]
                                    }
                                  },
                                  {
                                    "employee": "Yoav",
                                    "submittedOn": "2025-04-03T00:43:12.773Z",
                                    "notes": "",
                                    "availableShifts": {
                                      "Sunday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon",
                                        "Night"
                                      ],
                                      "Monday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Tuesday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Wednesday": [],
                                      "Thursday": [],
                                      "Friday": [
                                        "Morning A",
                                        "Night"
                                      ],
                                      "Saturday": [
                                        "Morning A",
                                        "Night"
                                      ]
                                    }
                                  },
                                  {
                                    "employee": "Maya",
                                    "submittedOn": "2025-04-03T00:44:06.820Z",
                                    "notes": "",
                                    "availableShifts": {
                                      "Sunday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Monday": [
                                        "Noon",
                                        "Night"
                                      ],
                                      "Tuesday": [
                                        "Noon",
                                        "Night"
                                      ],
                                      "Wednesday": [
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Thursday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Friday": [
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Saturday": [
                                        "Noon"
                                      ]
                                    }
                                  }
                                ]
                              }`
                        },
                        
                        {
                            role: "assistant",
                            content:`{
                                "schedule": {
                                  "Sunday": {
                                    "Morning A": [
                                      "Ariel"
                                    ],
                                    "Morning B": [
                                      "Dor",
                                      "Maya"
                                    ],
                                    "Noon": [
                                      "Tomer",
                                      "OmerK"
                                    ],
                                    "Night": [
                                      "Yoav"
                                    ]
                                  },
                                  "Monday": {
                                    "Morning A": [
                                      "Ariel"
                                    ],
                                    "Morning B": [
                                      "Tomer",
                                      "OmerK"
                                    ],
                                    "Noon": [],
                                    "Night": [
                                      "Maya"
                                    ]
                                  },
                                  "Tuesday": {
                                    "Morning A": [
                                      "Tomer"
                                    ],
                                    "Morning B": [
                                      "OmerK",
                                      "Yoav"
                                    ],
                                    "Noon": [
                                      "Dor"
                                    ],
                                    "Night": []
                                  },
                                  "Wednesday": {
                                    "Morning A": [
                                      "Dor"
                                    ],
                                    "Morning B": [
                                      "Maya"
                                    ],
                                    "Noon": [],
                                    "Night": [
                                      "Tomer"
                                    ]
                                  },
                                  "Thursday": {
                                    "Morning A": [
                                      "Dor"
                                    ],
                                    "Morning B": [
                                      "OmerK",
                                      "Maya"
                                    ],
                                    "Noon": [],
                                    "Night": [
                                      "Ariel"
                                    ]
                                  },
                                  "Friday": {
                                    "Morning A": [
                                      "Yoav"
                                    ],
                                    "Morning B": [
                                      "OmerK",
                                      "Maya"
                                    ],
                                    "Noon": [],
                                    "Night": []
                                  },
                                  "Saturday": {
                                    "Morning A": [
                                      "Yoav"
                                    ],
                                    "Morning B": [
                                      "Ariel"
                                    ],
                                    "Noon": [
                                      "Maya"
                                    ],
                                    "Night": [
                                      "Dor"
                                    ]
                                  }
                                }
                              }`
                        },
                        {
                            role: "user",
                            content: `{
                                "weekStart": "2025-04-20",
                                "weekEnd": "2025-04-26",
                                "lastUpdated": "2025-04-03T00:44:06.821Z",
                                "submissions": [
                                  {
                                    "employee": "Tomer",
                                    "submittedOn": "2025-04-03T00:37:58.193Z",
                                    "notes": "",
                                    "availableShifts": {
                                      "Sunday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Monday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Tuesday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Wednesday": [
                                        "Night"
                                      ],
                                      "Thursday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Friday": [
                                        "Morning A"
                                      ],
                                      "Saturday": []
                                    }
                                  },
                                  {
                                    "employee": "OmerK",
                                    "submittedOn": "2025-04-03T00:39:14.014Z",
                                    "notes": "",
                                    "availableShifts": {
                                      "Sunday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Monday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Tuesday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Wednesday": [],
                                      "Thursday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Friday": [
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Saturday": []
                                    }
                                  },
                                  {
                                    "employee": "Ariel",
                                    "submittedOn": "2025-04-03T00:41:03.430Z",
                                    "notes": "",
                                    "availableShifts": {
                                      "Sunday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Monday": [
                                        "Morning A"
                                      ],
                                      "Tuesday": [],
                                      "Wednesday": [],
                                      "Thursday": [
                                        "Night"
                                      ],
                                      "Friday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Saturday": [
                                        "Morning B",
                                        "Noon",
                                        "Night"
                                      ]
                                    }
                                  },
                                  {
                                    "employee": "Dor",
                                    "submittedOn": "2025-04-03T00:41:51.922Z",
                                    "notes": "",
                                    "availableShifts": {
                                      "Sunday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Monday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Tuesday": [
                                        "Noon"
                                      ],
                                      "Wednesday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Thursday": [
                                        "Morning A"
                                      ],
                                      "Friday": [],
                                      "Saturday": [
                                        "Night"
                                      ]
                                    }
                                  },
                                  {
                                    "employee": "Yoav",
                                    "submittedOn": "2025-04-03T00:43:12.773Z",
                                    "notes": "",
                                    "availableShifts": {
                                      "Sunday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon",
                                        "Night"
                                      ],
                                      "Monday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Tuesday": [
                                        "Morning A",
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Wednesday": [],
                                      "Thursday": [],
                                      "Friday": [
                                        "Morning A",
                                        "Night"
                                      ],
                                      "Saturday": [
                                        "Morning A",
                                        "Night"
                                      ]
                                    }
                                  },
                                  {
                                    "employee": "Maya",
                                    "submittedOn": "2025-04-03T00:44:06.820Z",
                                    "notes": "",
                                    "availableShifts": {
                                      "Sunday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Monday": [
                                        "Noon",
                                        "Night"
                                      ],
                                      "Tuesday": [
                                        "Noon",
                                        "Night"
                                      ],
                                      "Wednesday": [
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Thursday": [
                                        "Morning A",
                                        "Morning B"
                                      ],
                                      "Friday": [
                                        "Morning B",
                                        "Noon"
                                      ],
                                      "Saturday": [
                                        "Noon"
                                      ]
                                    }
                                  }
                                ]
                              }`
                        },
                        {
                            role: "assistant",
                            content: `{
                                "schedule": {
                                  "Sunday": {
                                    "Morning A": "Tomer",
                                    "Morning B": "Ariel",
                                    "Noon": [
                                      "OmerK",
                                      "Yoav"
                                    ],
                                    "Night": ""
                                  },
                                  "Monday": {
                                    "Morning A": "Dor",
                                    "Morning B": "Tomer",
                                    "Noon": [
                                      "Maya",
                                      ""
                                    ],
                                    "Night": ""
                                  },
                                  "Tuesday": {
                                    "Morning A": "Yoav",
                                    "Morning B": "OmerK",
                                    "Noon": [
                                      "Tomer",
                                      "Maya"
                                    ],
                                    "Night": ""
                                  },
                                  "Wednesday": {
                                    "Morning A": "",
                                    "Morning B": "Dor",
                                    "Noon": [
                                      "Maya",
                                      ""
                                    ],
                                    "Night": "Tomer"
                                  },
                                  "Thursday": {
                                    "Morning A": "OmerK",
                                    "Morning B": "Tomer",
                                    "Noon": [
                                      "",
                                      ""
                                    ],
                                    "Night": "Ariel"
                                  },
                                  "Friday": {
                                    "Morning A": "",
                                    "Morning B": "Maya",
                                    "Noon": [
                                      "OmerK",
                                      "Ariel"
                                    ],
                                    "Night": "Yoav"
                                  },
                                  "Saturday": {
                                    "Morning A": "",
                                    "Morning B": "",
                                    "Noon": [
                                      "Ariel"
                                    ],
                                    "Night": "Dor"
                                  }
                                }
                              }`
                        }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            console.log(data);
            
            // Extract and parse the schedule
            let schedule = data.choices[0].message.content;
            
            
            
            return schedule;
        } catch (error) {
            console.error('Error generating schedule:', error);
            throw error;
        }
    }

    // Create a detailed prompt for schedule generation
    createPrompt(availabilityData) {
        
        return JSON.stringify(availabilityData, null, 2)};
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
            const API_KEY = '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';
            
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

// Export for potential external use
window.OpenAIScheduleGenerator = OpenAIScheduleGenerator;