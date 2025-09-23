# Capacity Forecast Chatbot MVP

A simple web-based chatbot that helps Operations Leads quickly forecast production capacity for their teams.

## Features

- **Natural Language Input**: Ask questions like "What's my capacity for October?" or "How much can we deliver next month?"
- **Smart Input Collection**: Automatically extracts information from your questions or prompts for missing details
- **Working Days Calculation**: Automatically excludes weekends and calculates based on 8-hour workdays
- **Visual Dashboard Results**: Interactive dashboard with metrics, efficiency gauge, and calculation breakdown
- **Reset Functionality**: Calculate multiple scenarios with easy reset button
- **PDF Export**: Download professional PDF reports of capacity forecasts
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Quick Start

1. **Start the application:**
   ```bash
   python3 -m http.server 8080
   ```

2. **Open in browser:**
   Navigate to `http://localhost:8080`

3. **Start chatting:**
   Type a question like: "What's my capacity for November 2025?"

## Usage Examples

### Complete Query
```
"What's my capacity for October 2025 with 10 staff, 2 hours average implementation time, and 80% availability?"
```

### Partial Query (Bot will prompt for missing info)
```
User: "What's my capacity for next month?"
Bot: "How many staff members are on your team?"
User: "15"
Bot: "What's the average implementation time per task in hours?"
User: "3"
Bot: "What's your expected availability ratio? (e.g., 80% or 0.8)"
User: "85%"
Bot: [Displays interactive dashboard with capacity forecast]
```

### Dashboard Features
The result is displayed as a visual dashboard containing:
- **Large New Implementation task count** prominently displayed
- **Work type breakdown** showing New Implementation tasks (65%) and Update Request hours (35%)
- **Key metrics layout**:
  - **Top row**: Team Members, Working Days, and Availability in equal columns
  - **Bottom row**: Available Hours in a full-width highlighted card
- **Detailed calculation breakdown** with step-by-step math for both work types
- **Action buttons** for resetting calculations and downloading PDF reports
- **Responsive design** that works on all screen sizes

### Action Features
- **🔄 Calculate Another Scenario**: Reset the session to calculate a new capacity forecast
- **📄 Download PDF Report**: Generate and download a professional PDF report with consistent layout matching the dashboard

#### PDF Features:
- **High-quality output**: Vector-based PDF generation preserving exact dashboard styling
- **Professional formatting**: Clean layout optimized for printing and sharing
- **Consistent design**: Maintains original dashboard colors, fonts, and layout
- **Fallback support**: Print-optimized version if PDF generation fails
- **Auto-generated filename**: Timestamped files (e.g., `capacity-forecast-2025-09-22_14-30.pdf`)

## Supported Time Formats

- **Specific months**: "October 2025", "Jan 2026"
- **Relative time**: "next month", "this month"
- **Quarters**: "Q1 2026", "Q4 2025"

## Required Inputs

1. **Time Window**: When you want the forecast for
2. **Staff Count**: Number of team members
3. **Average New Implementation Time**: Hours per new implementation task
4. **Availability Ratio**: Percentage of time available for work (e.g., 80% accounts for meetings, breaks, etc.)

## Calculation Formula

The system allocates capacity between two work types:
- **New Implementation**: 65% of available hours (calculated as task count)
- **Update Request**: 35% of available hours (tracked as allocated hours)

```
Available Hours = [Working days × 8 hours × Staff count] × Availability ratio
New Implementation Hours = Available Hours × 65%
Update Request Hours = Available Hours × 35%

New Implementation Tasks = New Implementation Hours ÷ Avg New Implementation Time
Update Request Hours = Available for flexible update work (not converted to task count)
```

Where working days = Monday through Friday (weekends excluded)

## Testing

Open `test.html` in your browser to run automated tests of the core functionality:

```
http://localhost:8080/test.html
```

## Files Structure

- `index.html` - Main application interface
- `style.css` - Styling and responsive design
- `script.js` - Core chatbot logic and calculations
- `test.html` - Automated tests
- `README.md` - This documentation

## AI-Powered Features (Optional)

The chatbot includes optional AI enhancements powered by Google Gemini API:

### Setting Up AI Features

1. **Get a Google Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key for the Gemini model
   - Keep your API key secure and never share it publicly

2. **Configure the API Key**:
   - In the chat interface, type: `set api key YOUR_API_KEY_HERE`
   - The key is stored securely in your browser's localStorage
   - The key never leaves your browser or gets transmitted to our servers

3. **AI Features Include**:
   - **Smart Insights**: AI-generated analysis of your capacity forecasts
   - **Optimization Recommendations**: Intelligent suggestions for improving capacity
   - **Advanced Query Handling**: Ask complex questions about your forecasts
   - **Industry Benchmarking**: AI-powered comparisons with best practices

### Example AI Queries

```
"How does this compare to industry standards?"
"What are the risks with this capacity plan?"
"Give me optimization recommendations"
"How can I improve team efficiency?"
```

### Security & Privacy

- ✅ API keys are stored locally in your browser only
- ✅ No API keys are hardcoded or transmitted to our servers
- ✅ All AI queries are sent directly to Google's Gemini API
- ✅ Your forecast data is only processed for generating insights
- ⚠️ Keep your API key private and rotate it regularly
- ⚠️ Don't share your API key with others or include it in screenshots

## Browser Compatibility

Works in all modern browsers (Chrome, Firefox, Safari, Edge)