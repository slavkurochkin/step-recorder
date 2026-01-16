# Step Recorder - Chrome DevTools Extension

A Chrome DevTools extension that records user interactions (clicks, inputs, keyboard events) on web pages for testing and automation purposes.

## Features

- **Record Interactions**: Captures clicks, text inputs, form changes, and keyboard events
- **Start/Pause/Stop Controls**: Full control over recording session
- **Visual Timeline**: See all recorded steps with timestamps
- **Export Functionality**: Export recorded steps as JSON
- **Smart Selectors**: Automatically generates CSS selectors for recorded elements
- **AI Steps to Reproduce**: Transform recorded steps into clear, human-readable reproduction steps for debugging using OpenAI (LangChain-ready)

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `step-recorder` directory
5. The extension will be installed and ready to use

## Usage

1. Open any webpage you want to record interactions on
2. Open Chrome DevTools (F12 or Right-click → Inspect)
3. Navigate to the "Step Recorder" tab in DevTools
4. Click "Start" to begin recording
5. Interact with the page (click buttons, enter text, etc.)
6. Use "Pause" to temporarily stop recording
7. Use "Stop" to end the recording session
8. Click "Export Steps" to save the recorded steps as JSON
9. Click "Generate Steps to Reproduce" to convert recorded steps into clear reproduction instructions for debugging (requires OpenAI API key)

## AI Steps to Reproduce Generation

The extension can automatically convert your recorded steps into clear, human-readable "Steps to Reproduce" format perfect for bug reports and debugging.

### Setup

1. Get an OpenAI API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. In the Step Recorder panel, enter your API key in the Settings section
3. Click "Save" to store your API key securely (stored locally in Chrome storage)
4. Record the steps that reproduce a bug or issue
5. Click "Generate Steps to Reproduce" to get clear, actionable instructions

### How It Works

The extension uses the OpenAI API (GPT-4o-mini) to analyze your recorded steps and generate:
- Clear, actionable step-by-step instructions
- Natural language descriptions that anyone can follow
- Specific element descriptions (button text, field labels, etc.)
- Focus on reproducibility for debugging and bug reports

### LangChain Integration

The extension is designed to work with LangChain. See `LANGCHAIN_INTEGRATION.md` for details on using LangChain for more advanced features like chains, agents, and complex workflows.

## Recorded Events

The extension records:
- **Clicks**: Button clicks, link clicks, and other clickable elements
- **Input**: Text entered into input fields and textareas
- **Change**: Form field changes (selects, checkboxes, etc.)
- **Keydown**: Special keyboard keys (Enter, Escape, Arrow keys, etc.)
- **Focus**: Focus events on form elements

## Exported Data Format

The exported JSON includes:
- Timestamp of the recording session
- Array of steps with:
  - Type of interaction
  - Timestamp (relative to recording start)
  - Element selector
  - Element details (text, value, etc.)
  - Additional metadata (coordinates, key codes, etc.)

## Development

### Project Structure

```
step-recorder/
├── manifest.json       # Extension manifest
├── devtools.html       # DevTools page entry point
├── devtools.js         # DevTools panel creation
├── panel.html          # DevTools panel UI
├── panel.js            # Panel logic and UI handling
├── content.js          # Content script for event capture
├── background.js       # Background service worker
└── README.md           # This file
```

### Icons

You'll need to add icon files:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

**To create icons:**

1. **Option 1 (Recommended)**: Open `generate-icons.html` in your browser and save each icon with the correct filename.

2. **Option 2**: If you have ImageMagick installed, run:
   ```bash
   ./create-icons.sh
   ```

3. **Option 3**: Create your own icons using any image editor and save them as `icon16.png`, `icon48.png`, and `icon128.png`.

## License

MIT
