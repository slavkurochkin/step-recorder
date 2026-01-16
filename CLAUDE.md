# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Step Recorder is a Chrome DevTools extension (Manifest V3) that records user interactions on web pages for testing and automation purposes. It captures clicks, text inputs, form changes, and keyboard events.

## Development Setup

1. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select this directory

2. After code changes, reload the extension at `chrome://extensions/`

3. To test: Open any webpage → Open DevTools (F12) → Navigate to "Step Recorder" tab

## Architecture

The extension uses a three-component architecture with message passing:

```
DevTools Panel (panel.js)
    ↓↑ chrome.runtime.connect (port)
Background Service Worker (background.js)
    ↓↑ chrome.runtime.sendMessage / chrome.tabs.sendMessage
Content Script (content.js)
```

### Key Files

- **manifest.json**: Extension configuration (Manifest V3)
- **devtools.js**: Creates the DevTools panel entry point
- **panel.js**: UI logic for recording controls and step display; connects to background via port
- **background.js**: Service worker that relays messages between panel and content script
- **content.js**: Injected into all pages; attaches DOM event listeners and sends recorded steps

### Message Flow

1. Panel sends `broadcastToContent` message via port to background
2. Background broadcasts to all tabs via `chrome.tabs.sendMessage`
3. Content script receives `startRecording`/`pauseRecording`/`stopRecording`
4. Content script captures events and sends `stepRecorded` messages to background
5. Background forwards steps to panel via port connection

### Key Message Types

- `startRecording`, `pauseRecording`, `stopRecording`: Recording control
- `stepRecorded`: Event data from content script to panel
- `broadcastToContent`: Panel-to-content routing through background
- `testConnection`, `connectionConfirmed`: Connection verification

## Debugging

Check three console locations for issues:
1. **Background script console**: `chrome://extensions/` → click "service worker" link
2. **DevTools panel console**: DevTools → Console tab (while in Step Recorder panel)
3. **Page console**: Right-click on page → Inspect → Console

See DEBUGGING.md and TEST_INSTRUCTIONS.md for detailed troubleshooting steps.
