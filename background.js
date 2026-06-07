// Background service worker for the extension

// Store connection to DevTools panel
let devtoolsPort = null;
let inspectedTabId = null;
let isRecordingActive = false; // Track recording state across page navigations

// Helper to send message to a specific tab with injection fallback
function sendToTab(tabId, message) {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      const errorMsg = chrome.runtime.lastError.message;
      console.log('Background: Could not send to tab', tabId, ':', errorMsg);

      // Content script not loaded - inject it programmatically
      console.log('Background: Injecting content script into tab', tabId);
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }).then(() => {
        console.log('Background: Content script injected, retrying message');
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, message, (retryResponse) => {
            if (chrome.runtime.lastError) {
              console.log('Background: Retry after injection failed:', chrome.runtime.lastError.message);
            } else {
              console.log('Background: ✓ Message sent after injection to tab', tabId);
            }
          });
        }, 100);
      }).catch(err => {
        console.log('Background: Could not inject script into tab', tabId, ':', err.message);
      });
    } else {
      console.log('Background: ✓ Message sent successfully to tab', tabId);
    }
  });
}

// Listen for connections from DevTools panel
chrome.runtime.onConnect.addListener((port) => {
  console.log('Background: Connection received, port name:', port.name);
  if (port.name === 'devtools-panel') {
    devtoolsPort = port;
    console.log('Background: DevTools panel connected!');
    
    // Send confirmation
    port.postMessage({ type: 'connectionConfirmed' });
    
    port.onDisconnect.addListener(() => {
      console.log('Background: DevTools panel disconnected');
      devtoolsPort = null;
      inspectedTabId = null;
    });
    
    // Listen for messages from panel
    port.onMessage.addListener((message) => {
      console.log('Background: Received message from panel:', message);
      if (message.type === 'testConnection') {
        console.log('Background: Test connection received!');
        port.postMessage({ type: 'testResponse', success: true });
      } else if (message.type === 'broadcastToContent') {
        // Get the inspected tab ID from the sender
        if (message.tabId) {
          inspectedTabId = message.tabId;
          console.log('Background: Using tabId:', inspectedTabId);
        }

        // Track recording state
        if (message.message?.type === 'startRecording') {
          isRecordingActive = true;
        } else if (message.message?.type === 'stopRecording') {
          isRecordingActive = false;
        }

        // Only send to the inspected tab (not all tabs)
        if (inspectedTabId) {
          console.log('Background: Sending to inspected tab', inspectedTabId);
          sendToTab(inspectedTabId, message.message);
        } else {
          console.log('Background: No inspected tab ID, cannot send message');
        }
      } else if (message.type === 'setInspectedTab') {
        inspectedTabId = message.tabId;
        console.log('Background: Set inspected tab ID:', inspectedTabId);
      } else if (message.type === 'captureScreenshot') {
        const tabId = message.tabId || inspectedTabId;
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
          if (devtoolsPort) {
            devtoolsPort.postMessage({ type: 'screenshotCaptured', dataUrl, region: message.region || null });
          }
        });
      } else if (message.type === 'captureScreenshotRaw') {
        // Single viewport grab for the full-page scroll-and-stitch routine.
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
          const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : null;
          if (devtoolsPort) {
            devtoolsPort.postMessage({ type: 'rawScreenshot', dataUrl: dataUrl || null, error: err });
          }
        });
      }
    });
  } else {
    console.log('Background: Unknown port name:', port.name);
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getRecordingState') {
    // Content script asking if recording is active (e.g., after page navigation)
    // Only return true if this is the inspected tab
    const isThisTabRecording = isRecordingActive && sender.tab && sender.tab.id === inspectedTabId;
    sendResponse({ isRecording: isThisTabRecording });
    return true;
  } else if (message.type === 'stepRecorded' || message.type === 'assertionCaptured' || message.type === 'errorCaptured' || message.type === 'screenshotRegionSelected' || message.type === 'flagCaptured') {
    // Only accept steps from the inspected tab
    if (sender.tab && sender.tab.id !== inspectedTabId) {
      console.log('Background: Ignoring step from non-inspected tab', sender.tab.id);
      return true;
    }

    // Forward to DevTools panel via port
    if (devtoolsPort) {
      devtoolsPort.postMessage(message);
    } else {
      console.log('DevTools port not connected, message not forwarded');
    }
  } else if (message.type === 'broadcastToContent') {
    // Handle direct messages (fallback) - only to inspected tab
    if (inspectedTabId) {
      sendToTab(inspectedTabId, message.message);
    }
  }
  return true;
});
