// Re-initialize on every injection to handle extension reloads.
// DOM listener attachment is guarded by window.__stepRecorderListenersAttached to prevent duplicates.
window.__stepRecorderInjected = true;

  let isRecording = false;
  let isPaused = false;
  let eventListenersAttached = false;
  let isAssertionMode = false;
  let recordFocusEvents = false;
  let captureConsoleErrors = false;
  let captureNetworkErrors = false;
  let captureAllLogs = false;
  let filterByDomain = false;
  let domainFilterPattern = '';
  let recordingJustStarted = false;

  // Use window-level deduplication to handle any edge cases
  if (!window.__stepRecorderDedup) {
    window.__stepRecorderDedup = { lastStep: null, lastTime: 0 };
  }

  // Log that content script is loaded
  console.log('Step Recorder content script loaded on:', window.location.href);

  // Check if extension context is still valid
  function isExtensionValid() {
    try {
      return chrome.runtime && !!chrome.runtime.id;
    } catch {
      return false;
    }
  }

  // Check if recording was active (e.g., after page navigation)
  function checkAndResumeRecording(isNewPageLoad = false) {
    chrome.runtime.sendMessage({ type: 'getRecordingState' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Could not get recording state:', chrome.runtime.lastError.message);
        return;
      }
      if (response?.isRecording) {
        console.log('Recording was active, resuming...');
        isRecording = true;
        isPaused = false;
        if (!eventListenersAttached) {
          attachEventListeners();
          eventListenersAttached = true;
        }

        // Record page load/redirect if this is a new page
        if (isNewPageLoad) {
          chrome.runtime.sendMessage({
            type: 'stepRecorded',
            step: {
              type: 'pageload',
              timestamp: Date.now(),
              tagName: 'browser',
              selector: '',
              text: document.title || 'Page loaded',
              url: window.location.href
            }
          }).catch(() => {});
        }
      }
    });
  }

  // Check on initial load - this catches redirects from clicks
  checkAndResumeRecording(true);

  // Load recording settings from storage
  chrome.storage.local.get(['recordFocusEvents', 'captureConsoleErrors', 'captureNetworkErrors', 'captureAllLogs', 'filterByDomain', 'domainFilter'], (result) => {
    if (chrome.runtime.lastError) return;
    recordFocusEvents = result.recordFocusEvents || false;
    captureConsoleErrors = result.captureConsoleErrors || false;
    captureNetworkErrors = result.captureNetworkErrors || false;
    captureAllLogs = result.captureAllLogs || false;
    filterByDomain = result.filterByDomain === true;
    domainFilterPattern = result.domainFilter || '';
  });

  // Track last navigation to prevent duplicates
  let lastNavUrl = null;
  let lastNavTime = 0;

  function recordNavigation() {
    if (!isExtensionValid()) return;

    const now = Date.now();
    const url = window.location.href;

    // Prevent duplicate navigation events within 500ms
    if (url === lastNavUrl && now - lastNavTime < 500) return;

    chrome.runtime.sendMessage({ type: 'getRecordingState' }, (response) => {
      if (chrome.runtime.lastError || !response?.isRecording) return;

      lastNavUrl = url;
      lastNavTime = now;

      chrome.runtime.sendMessage({
        type: 'stepRecorded',
        step: {
          type: 'navigate',
          timestamp: now,
          tagName: 'browser',
          selector: '',
          text: 'Browser back/forward',
          url: url
        }
      }).catch(() => {});
    });
  }

  // Handle bfcache (back/forward button) - pageshow fires when page is restored
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      console.log('Page restored from bfcache');
      checkAndResumeRecording();
      recordNavigation();
    }
  });

  // Record browser back/forward navigation
  window.addEventListener('popstate', () => {
    recordNavigation();
  });

  // Listen for messages from panel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message, 'from:', sender);
    if (message.type === 'ping') {
      sendResponse({ status: 'ok' });
      return true;
    } else if (message.type === 'startRecording') {
      isRecording = true;
      isPaused = false;
      recordingJustStarted = true;
      setTimeout(() => { recordingJustStarted = false; }, 500); // Ignore events for 500ms after start
      if (!eventListenersAttached) {
        attachEventListeners();
        eventListenersAttached = true;
      }
      console.log('Recording started, isRecording:', isRecording);
      sendResponse({ status: 'started' });
    } else if (message.type === 'pauseRecording') {
      isPaused = true;
      console.log('Recording paused');
      sendResponse({ status: 'paused' });
    } else if (message.type === 'stopRecording') {
      isRecording = false;
      isPaused = false;
      console.log('Recording stopped');
      sendResponse({ status: 'stopped' });
    } else if (message.type === 'enterAssertionMode') {
      enterAssertionMode();
      sendResponse({ status: 'assertionMode' });
    } else if (message.type === 'exitAssertionMode') {
      exitAssertionMode();
      sendResponse({ status: 'normal' });
    } else if (message.type === 'setRecordingSettings') {
      recordFocusEvents = message.recordFocus || false;
      captureConsoleErrors = message.captureConsole;
      captureNetworkErrors = message.captureNetwork;
      captureAllLogs = message.captureAllLogs || false;
      filterByDomain = message.filterByDomain !== false;
      domainFilterPattern = message.domainFilter || '';
      sendResponse({ status: 'ok' });
    }
    return true;
  });

  // Store references for event handlers so we can access isRecording/isPaused
  window.__stepRecorderState = {
    get isRecording() { return isRecording; },
    get isPaused() { return isPaused; }
  };

  // ============ Assertion Mode ============

  let highlightOverlay = null;

  function createHighlightOverlay() {
    if (highlightOverlay) return;
    // Wait for body to exist (since we run at document_start)
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', createHighlightOverlay);
      return;
    }
    highlightOverlay = document.createElement('div');
    highlightOverlay.id = '__step-recorder-highlight';
    highlightOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      border: 2px solid #9C27B0;
      background: rgba(156, 39, 176, 0.1);
      z-index: 999999;
      display: none;
    `;
    document.body.appendChild(highlightOverlay);
  }

  function removeHighlightOverlay() {
    if (highlightOverlay) {
      highlightOverlay.remove();
      highlightOverlay = null;
    }
  }

  function updateHighlight(element) {
    if (!highlightOverlay || !element) return;
    const rect = element.getBoundingClientRect();
    highlightOverlay.style.left = rect.left + 'px';
    highlightOverlay.style.top = rect.top + 'px';
    highlightOverlay.style.width = rect.width + 'px';
    highlightOverlay.style.height = rect.height + 'px';
    highlightOverlay.style.display = 'block';
  }

  function handleAssertionMouseMove(e) {
    updateHighlight(e.target);
  }

  function handleAssertionClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const element = e.target;
    const rect = element.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 &&
      window.getComputedStyle(element).visibility !== 'hidden' &&
      window.getComputedStyle(element).display !== 'none';

    const elementData = {
      selector: getSelector(element),
      tagName: element.tagName.toLowerCase(),
      text: element.textContent ? element.textContent.trim().substring(0, 100) : '',
      isVisible: isVisible
    };

    console.log('Assertion captured:', elementData);

    // Send to background to forward to panel
    chrome.runtime.sendMessage({
      type: 'assertionCaptured',
      elementData: elementData
    }).catch(() => {});

    exitAssertionMode();
  }

  function enterAssertionMode() {
    isAssertionMode = true;
    createHighlightOverlay();
    document.addEventListener('mousemove', handleAssertionMouseMove, true);
    document.addEventListener('click', handleAssertionClick, true);
    if (document.body) document.body.style.cursor = 'crosshair';
    console.log('Entered assertion mode');
  }

  function exitAssertionMode() {
    isAssertionMode = false;
    removeHighlightOverlay();
    document.removeEventListener('mousemove', handleAssertionMouseMove, true);
    document.removeEventListener('click', handleAssertionClick, true);
    if (document.body) document.body.style.cursor = '';
    console.log('Exited assertion mode');
  }

function getSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c => c);
    if (classes.length > 0) {
      return `.${classes.join('.')}`;
    }
  }
  
  // Try to build a path
  const path = [];
  let current = element;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    }
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        selector += `.${classes[0]}`;
      }
    }
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children);
      const index = siblings.indexOf(current);
      if (siblings.length > 1) {
        selector += `:nth-child(${index + 1})`;
      }
    }
    path.unshift(selector);
    current = current.parentElement;
    if (path.length > 5) break; // Limit path depth
  }
  
  return path.join(' > ');
}

function recordStep(type, element, additionalData = {}) {
  // Check if extension context is still valid
  if (!isExtensionValid()) {
    console.log('Step Recorder: Extension context invalidated, stopping');
    isRecording = false;
    return;
  }

  // Skip recording if in assertion mode
  if (isAssertionMode) {
    return;
  }

  const state = window.__stepRecorderState;
  if (!state || !state.isRecording || state.isPaused) {
    return;
  }

  // Check domain filter if enabled
  if (filterByDomain && domainFilterPattern) {
    const currentUrl = window.location.href;
    if (!currentUrl.startsWith(domainFilterPattern)) {
      console.log('Step Recorder: Skipping step - domain filter mismatch:', currentUrl, 'does not match', domainFilterPattern);
      return;
    }
  }

  if (!element || !element.tagName) {
    console.warn('Invalid element for recording:', element);
    return;
  }

  const selector = getSelector(element);
  const now = Date.now();

  // Deduplicate: skip if same type and selector within 500ms
  const stepKey = `${type}:${selector}`;
  const dedup = window.__stepRecorderDedup;
  if (dedup.lastStep === stepKey && (now - dedup.lastTime) < 500) {
    console.log('Step Recorder: Skipping duplicate step:', stepKey);
    return;
  }
  dedup.lastStep = stepKey;
  dedup.lastTime = now;

  const step = {
    type,
    timestamp: now,
    tagName: element.tagName.toLowerCase(),
    selector: selector,
    text: element.textContent ? element.textContent.trim().substring(0, 100) : '',
    ...additionalData
  };

  console.log('Recording step:', step);

  // Send to background, which will forward to DevTools panel
  chrome.runtime.sendMessage({
    type: 'stepRecorded',
    step: step
  }).catch(() => {
    // Ignore errors - service worker may be restarting
  });
}

function attachEventListeners() {
  // Prevent double attachment using window-level flag
  if (window.__stepRecorderListenersAttached) {
    console.log('Step Recorder: Event listeners already attached, skipping');
    return;
  }
  window.__stepRecorderListenersAttached = true;

  // These work even at document_start since we attach to document, not body
  document.addEventListener('click', handleClick, true);
  document.addEventListener('change', handleChange, true);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('focus', handleFocus, true);
  console.log('Step Recorder: Event listeners attached');
}

function handleClick(event) {
  if (isAssertionMode) return; // Skip during assertion mode
  if (recordingJustStarted) return; // Skip clicks right after recording starts

  recordStep('click', event.target, {
    x: event.clientX,
    y: event.clientY,
    button: event.button
  });
}

function handleChange(event) {
  const element = event.target;
  if (element.tagName === 'SELECT' || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    recordStep('input', element, {
      value: element.value,
      inputType: element.type || 'text'
    });
  }
}

function handleKeyDown(event) {
  // Only record special keys, not regular typing (to avoid spam)
  const specialKeys = [
    'Enter', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 
    'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 
    'PageDown', 'Delete', 'Backspace', 'F1', 'F2', 'F3', 
    'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
  ];
  
  if (specialKeys.includes(event.key) || 
      (event.ctrlKey || event.metaKey || event.altKey)) {
    recordStep('keydown', event.target, {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey
    });
  }
}

// Track last focus to prevent duplicates at event handler level
let lastFocusedElement = null;
let lastFocusTime = 0;

function handleFocus(event) {
  if (!recordFocusEvents) return; // Skip if focus recording is disabled
  if (isAssertionMode) return; // Skip during assertion mode
  if (recordingJustStarted) return; // Skip focus events right after recording starts

  // Only record focus on form elements
  const formElements = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];
  if (formElements.includes(event.target.tagName)) {
    // Extra deduplication for focus: skip if same element focused within 1 second
    const now = Date.now();
    if (event.target === lastFocusedElement && (now - lastFocusTime) < 1000) {
      console.log('Step Recorder: Skipping duplicate focus on same element');
      return;
    }
    lastFocusedElement = event.target;
    lastFocusTime = now;

    recordStep('focus', event.target);
  }
}

// ============ Error Capture ============

// Track recent errors to avoid duplicates
const recentErrors = new Set();
const ERROR_DEDUPE_WINDOW = 2000; // 2 seconds

// Helper to check if a value looks like an error
function extractErrorFromArgs(args) {
  for (const arg of args) {
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}`;
    }
    if (arg && typeof arg === 'object') {
      const name = arg.name || arg.constructor?.name || '';
      const code = arg.code || '';
      const message = arg.message || '';

      // Axios errors
      if (arg.isAxiosError || name === 'AxiosError' || name.includes('Axios') ||
          code === 'ERR_BAD_RESPONSE' || code === 'ERR_NETWORK' || code === 'ERR_BAD_REQUEST') {
        let errorMsg = message || 'Axios Error';
        if (arg.response?.status) errorMsg += ` (HTTP ${arg.response.status})`;
        if (arg.config?.url) errorMsg += ` - ${arg.config.url}`;
        return errorMsg;
      }
      // Generic error objects
      if (name.endsWith('Error') || (message && arg.stack)) {
        return `${name || 'Error'}: ${message}`;
      }
      // HTTP error responses
      if (arg.status >= 400 || arg.statusCode >= 400) {
        return `HTTP ${arg.status || arg.statusCode}: ${message || arg.statusText || 'Error'}`;
      }
    }
  }
  return null;
}

function shouldCaptureUrl(url) {
  // If domain filtering is disabled, capture everything
  if (!filterByDomain || !domainFilterPattern) return true;

  // For console errors without URL, check current page
  if (!url) {
    return window.location.href.startsWith(domainFilterPattern);
  }

  // Check if URL matches the domain filter
  return url.startsWith(domainFilterPattern);
}

function sendErrorToPanel(errorType, message, url = '') {
  if (!isExtensionValid() || !isRecording || isPaused) return;

  // Check domain filter for network errors
  if (errorType === 'network' && !shouldCaptureUrl(url)) {
    return;
  }

  // For console errors, check if we're on the right domain
  if (errorType === 'console' && !shouldCaptureUrl('')) {
    return;
  }

  // Create a key for deduplication
  const errorKey = `${errorType}:${message}:${url}`;
  if (recentErrors.has(errorKey)) return;

  recentErrors.add(errorKey);
  setTimeout(() => recentErrors.delete(errorKey), ERROR_DEDUPE_WINDOW);

  chrome.runtime.sendMessage({
    type: 'errorCaptured',
    errorType: errorType,
    step: {
      type: 'error',
      errorType: errorType,
      timestamp: Date.now(),
      tagName: errorType === 'network' ? 'network' : 'console',
      selector: '',
      text: '',
      message: (message || '').substring(0, 500),
      url: url
    }
  }).catch(() => {});
}

// Capture console.error
const originalConsoleError = console.error;
console.error = function(...args) {
  originalConsoleError.apply(console, args);

  if (!isExtensionValid() || !isRecording || isPaused) return;

  const message = args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}`;
    }
    if (typeof arg === 'object') {
      try { return JSON.stringify(arg); } catch { return String(arg); }
    }
    return String(arg);
  }).join(' ');

  sendErrorToPanel('console', message);
};

// Also capture console.warn (many libs use warn for errors)
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
  originalConsoleWarn.apply(console, args);

  if (!isExtensionValid() || !isRecording || isPaused) return;

  // If "Capture ALL logs" is enabled, capture all warnings
  if (captureAllLogs) {
    const message = args.map(arg => {
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg).substring(0, 300); } catch { return String(arg); }
      }
      return String(arg);
    }).join(' ').substring(0, 500);

    if (message.trim()) {
      sendErrorToPanel('console', `[warn] ${message}`);
    }
    return;
  }

  // Only capture warnings that look like errors
  const firstArg = String(args[0] || '').toLowerCase();
  if (firstArg.includes('error') || firstArg.includes('fail') || firstArg.includes('exception')) {
    const message = args.map(arg => {
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch { return String(arg); }
      }
      return String(arg);
    }).join(' ');

    sendErrorToPanel('console', `[warn] ${message}`);
  }
};

// Also capture console.log for error-like messages (Axios, etc. often use console.log)
const originalConsoleLog = console.log;
console.log = function(...args) {
  originalConsoleLog.apply(console, args);

  if (!isExtensionValid() || !isRecording || isPaused) return;

  // Ignore our own Step Recorder logs
  const firstArg = String(args[0] || '');
  if (firstArg.includes('Step Recorder') || firstArg.includes('Error capture settings') ||
      firstArg.includes('Loaded error capture') || firstArg.startsWith('Recording')) {
    return;
  }

  // If "Capture ALL logs" is enabled, capture everything
  if (captureAllLogs) {
    const message = args.map(arg => {
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg).substring(0, 300); } catch { return String(arg); }
      }
      return String(arg);
    }).join(' ').substring(0, 500);

    if (message.trim()) {
      sendErrorToPanel('console', `[log] ${message}`);
    }
    return;
  }

  // Otherwise, only capture error-like messages
  const errorMessage = extractErrorFromArgs(args);
  if (errorMessage) {
    sendErrorToPanel('console', errorMessage);
  }
};

// Capture unhandled errors
window.addEventListener('error', (event) => {
  sendErrorToPanel('console', `${event.message} at ${event.filename}:${event.lineno}`);
});

// Capture unhandled promise rejections (catches Axios errors, async failures, etc.)
window.addEventListener('unhandledrejection', (event) => {
  if (!isExtensionValid() || !isRecording || isPaused) return;

  const reason = event.reason;
  let message = extractErrorFromArgs([reason]);

  if (!message) {
    if (reason instanceof Error) {
      message = `${reason.name}: ${reason.message}`;
    } else if (typeof reason === 'object' && reason) {
      message = reason.message || JSON.stringify(reason).substring(0, 200);
    } else {
      message = String(reason || 'Unhandled Promise Rejection');
    }
  }

  sendErrorToPanel('console', message);
});

// Also try to catch errors via window.onerror (backup)
const originalOnError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (originalOnError) {
    originalOnError.call(window, message, source, lineno, colno, error);
  }

  if (!isExtensionValid() || !isRecording || isPaused) return;

  let errorMsg = message;
  if (error) {
    errorMsg = extractErrorFromArgs([error]) || `${error.name}: ${error.message}`;
  }

  sendErrorToPanel('console', `${errorMsg} at ${source}:${lineno}`);
};

// Capture network errors - intercept fetch
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
  try {
    const response = await originalFetch.apply(this, args);
    if (!response.ok) {
      sendErrorToPanel('network', `HTTP ${response.status} ${response.statusText}`, url.substring(0, 200));
    }
    return response;
  } catch (error) {
    sendErrorToPanel('network', error.message || 'Network error', url.substring(0, 200));
    throw error;
  }
};

// Capture XHR errors
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  this._stepRecorderUrl = url;
  this._stepRecorderMethod = method;
  return originalXHROpen.apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.send = function(...args) {
  this.addEventListener('loadend', () => {
    if (this.status >= 400 || this.status === 0) {
      const url = (this._stepRecorderUrl || 'unknown').substring(0, 200);
      const message = this.status === 0 ? 'Network error' : `HTTP ${this.status} ${this.statusText}`;
      sendErrorToPanel('network', message, url);
    }
  });
  return originalXHRSend.apply(this, args);
};

// Use PerformanceObserver as backup to catch network errors
// This catches errors even if XHR/fetch was patched by other scripts first
try {
  const networkObserver = new PerformanceObserver((list) => {
    if (!isExtensionValid() || !isRecording || isPaused) return;

    for (const entry of list.getEntries()) {
      // Check for failed requests (responseStatus 4xx or 5xx, or 0 for network failures)
      if (entry.responseStatus >= 400 || entry.responseStatus === 0) {
        // Avoid duplicates by checking if we recently sent this error
        const url = entry.name.substring(0, 200);
        sendErrorToPanel('network', `HTTP ${entry.responseStatus || 'error'}`, url);
      }
    }
  });
  networkObserver.observe({ type: 'resource', buffered: false });
} catch (e) {
  // PerformanceObserver not supported or no permission
  console.log('Step Recorder: PerformanceObserver not available');
}

