# Debugging Guide

If nothing is being recorded, follow these steps:

## 1. Check Content Script is Loaded

1. Open the webpage you want to record
2. Open the browser console (not DevTools console, but the page console)
3. You should see: "Step Recorder content script loaded on: [URL]"
4. If you don't see this, the content script isn't loading

## 2. Check DevTools Panel Connection

1. Open DevTools (F12)
2. Go to the "Step Recorder" tab
3. Open the DevTools console (click the "Console" tab in DevTools)
4. You should see: "Panel loaded"
5. If you see "Content script is responding!", the connection is working

## 3. Test Recording

1. Click "Start" in the Step Recorder panel
2. Check the DevTools console - you should see "Panel: Starting recording"
3. Check the page console - you should see "Content script received message: {type: 'startRecording'}"
4. Click something on the page
5. Check the page console - you should see "Recording step: ..."
6. Check the DevTools console - you should see "Panel received message via port: ..."

## 4. Common Issues

### Content Script Not Loading
- Make sure you reloaded the page after installing the extension
- Check `chrome://extensions/` for any errors
- Try reloading the extension

### Messages Not Received
- Check both consoles for error messages
- Make sure the page isn't blocking the extension (some pages have CSP)
- Try a simple page like `about:blank` or `google.com`

### Events Not Recorded
- Make sure you clicked "Start" before interacting
- Check that `isRecording` is true in the content script console
- Verify event listeners are attached (check page console logs)

## 5. Manual Testing

Open the page console and run:
```javascript
// Test if content script is loaded
chrome.runtime.sendMessage({type: 'ping'}, (response) => {
  console.log('Response:', response);
});

// Manually start recording
chrome.runtime.sendMessage({type: 'startRecording'}, (response) => {
  console.log('Recording started:', response);
});
```

Then click something on the page and check if it's recorded.
