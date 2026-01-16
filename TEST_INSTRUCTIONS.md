# Quick Test Instructions

## Step 1: Check Background Script Console

1. Go to `chrome://extensions/`
2. Find "Step Recorder" extension
3. Click on **"service worker"** link (or "background page" in older Chrome)
4. This opens the background script console
5. You should see: "Background: Connection received, port name: devtools-panel"

## Step 2: Check DevTools Panel Console

1. Open your page (localhost:3000)
2. Open DevTools (F12)
3. Go to "Step Recorder" tab
4. Open the **Console** tab in DevTools (not the page console)
5. You should see:
   - "Panel: Attempting to connect to background..."
   - "Panel: Panel loaded, testing connection..."
   - "Panel: Background confirmed connection!"
   - "Panel: Test response received! Connection is working."

## Step 3: Check Page Console

1. In the page itself (not DevTools), right-click → Inspect → Console
2. You should see: "Step Recorder content script loaded on: http://localhost:3000/"

## Step 4: Test Recording

1. In DevTools Step Recorder panel, click "Start"
2. Check **background script console** - should see "Background: Received message from panel"
3. Check **page console** - should see "Content script received message: {type: 'startRecording'}"
4. Click something on the page
5. Check **page console** - should see "Recording step: ..."
6. Check **DevTools console** - should see "Panel: Received message via port: ..."

## If You Don't See Background Script Logs

The background script might not be running. Try:
1. Reload the extension in `chrome://extensions/`
2. Close and reopen DevTools
3. Make sure the Step Recorder tab is open in DevTools
