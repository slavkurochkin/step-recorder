# Step Recorder - Chrome DevTools Extension

A Chrome DevTools extension that records user interactions on web pages for testing, bug reporting, and test automation purposes.

## Features

### Recording
- **User Interactions**: Captures clicks, text inputs, form changes, and keyboard events
- **Page Navigation**: Tracks page loads, redirects, and browser back/forward
- **Optional Focus Events**: Toggle recording of focus events on form elements
- **Inline Editing**: Click on any recorded step to edit its description
- **Delete Steps**: Remove individual steps from the recording

### Error Capture
- **Console Errors**: Automatically capture JavaScript console errors
- **Network Errors**: Capture failed HTTP requests (4xx, 5xx)
- **Capture ALL Logs**: Option to capture all console output (log, warn, error)
- **Domain Filtering**: Filter errors to only capture from specific domains
- **Manual Errors/Notes**: Add custom error messages or notes to the recording

### Assertions
- **Add Assertions**: Click elements to verify they exist, are visible, or contain specific text
- **Context Menu**: Right-click steps to insert assertions at specific positions

### Output Formats
Two side-by-side text areas for easy comparison:

**Raw Steps** (left)
- Auto-generated from recorded steps
- Updates in real-time as you record
- Editable - changes sync back when you edit steps

**LLM Output** (right) - Multiple generation modes:
- **Steps to Reproduce**: Clean reproduction steps for bug reports
- **Test Cases**: Multiple test cases (happy path, negative, edge cases, error handling)
- **Bug Report**: Formatted bug report with title, steps, expected/actual results
- **Exploratory Testing**: Test charters, areas to explore, boundary conditions
- **Risk-Based Testing**: Risk assessment table, security/performance concerns
- **Playwright**: Automated test code for Playwright

### Export
- **Export JSON**: Save all recorded steps with full metadata

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `step-recorder` directory
5. The extension will be installed and ready to use

## Usage

### Basic Recording

1. Open any webpage you want to record
2. Open Chrome DevTools (F12 or Right-click → Inspect)
3. Navigate to the "Step Recorder" tab in DevTools
4. Click **Start** to begin recording
5. Interact with the page (click buttons, enter text, etc.)
6. Use **Pause** to temporarily stop recording
7. Use **Stop** to end the recording session

### Capturing Errors

1. Check **Console errors** to capture JavaScript errors
2. Check **Network errors** to capture failed HTTP requests
3. Check **ALL logs** to capture everything (useful for debugging)
4. Use **Only capture from** to filter by domain (e.g., `http://localhost:3000`)
5. Click **+ Error** to manually add an error or note

### Adding Assertions

1. Click **+ Assert** button
2. Choose assertion type (exists, visible, text contains)
3. Click an element on the page to create the assertion
4. Or right-click any step → "Add Assertion After"

### Editing Steps

- Click on any step's text to edit it inline
- Press **Enter** to save, **Escape** to cancel
- Click the **×** button to delete a step

### Generating Output

1. Enter your OpenAI API key in Settings
2. Select a mode from the dropdown (Steps to Reproduce, Test Cases, etc.)
3. Click **Generate**
4. Use **Copy** to copy either raw steps or LLM output

## LLM Generation Modes

### Steps to Reproduce
Simple, clean reproduction steps - one per line, no formatting.

### Test Cases
Generates multiple test cases:
- Happy Path - the successful flow
- Negative Test Cases - invalid inputs, empty fields
- Edge Cases - boundary conditions, special characters
- Error Handling - graceful failure scenarios

### Bug Report
Formatted bug report with:
- Title
- Steps to Reproduce
- Expected Result
- Actual Result

### Exploratory Testing
Provides:
- Areas to Explore
- Questions to Answer
- Test Charters (timeboxed missions)
- Boundary Conditions
- Integration Points
- User Personas

### Risk-Based Testing
Provides:
- Risk Assessment Table (likelihood, impact, priority)
- High-Priority Test Scenarios
- Data Risks
- Security Considerations
- Performance Concerns
- Regression Risks
- Recommended Test Coverage

### Playwright
Generates Playwright test code with:
- Modern async/await syntax
- Appropriate locators
- Assertions for verification steps

## Recorded Events

| Event | Description |
|-------|-------------|
| Click | Button clicks, link clicks, clickable elements |
| Input | Text entered into input fields and textareas |
| Change | Form field changes (selects, checkboxes) |
| Keydown | Special keys (Enter, Escape, Arrow keys, F1-F12) |
| Focus | Focus on form elements (optional) |
| Navigate | Browser back/forward navigation |
| Pageload | Page loads and redirects |
| Assert | User-added assertions |
| Error | Captured or manually added errors |

## Exported Data Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "steps": [
    {
      "type": "click",
      "timestamp": 1234567890,
      "tagName": "button",
      "selector": ".submit-btn",
      "text": "Submit",
      "x": 100,
      "y": 200
    }
  ],
  "totalSteps": 1
}
```

## Project Structure

```
step-recorder/
├── manifest.json       # Extension manifest (MV3)
├── devtools.html       # DevTools page entry point
├── devtools.js         # DevTools panel creation
├── panel.html          # DevTools panel UI
├── panel.js            # Panel logic and UI handling
├── content.js          # Content script for event capture
├── background.js       # Background service worker
├── icon16.png          # Extension icon (16x16)
├── icon48.png          # Extension icon (48x48)
├── icon128.png         # Extension icon (128x128)
└── README.md           # This file
```

## Requirements

- Chrome browser (Manifest V3 compatible)
- OpenAI API key (for LLM features)

## License

MIT
