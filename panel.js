let steps = [];
let isRecording = false;
let isPaused = false;
let recordingStartTime = null;
let isAssertionMode = false;
let pendingAssertType = null;
let insertAfterIndex = null; // For inserting assertions after a specific step

const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnStop = document.getElementById('btnStop');
const btnClear = document.getElementById('btnClear');
const btnExport = document.getElementById('btnExport');
const btnGenerate = document.getElementById('btnGenerate');
const btnSaveKey = document.getElementById('btnSaveKey');
const btnAssert = document.getElementById('btnAssert');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const status = document.getElementById('status');
const stepsContainer = document.getElementById('stepsContainer');
const testCasesSection = document.getElementById('testCasesSection');
const testCasesContent = document.getElementById('testCasesContent');
const assertModal = document.getElementById('assertModal');
const assertionBanner = document.getElementById('assertionBanner');
const contextMenu = document.getElementById('contextMenu');
const btnCopySteps = document.getElementById('btnCopySteps');
const recordFocusEvents = document.getElementById('recordFocusEvents');
const captureConsoleErrors = document.getElementById('captureConsoleErrors');
const captureNetworkErrors = document.getElementById('captureNetworkErrors');
const captureAllLogs = document.getElementById('captureAllLogs');
const filterByDomain = document.getElementById('filterByDomain');
const domainFilter = document.getElementById('domainFilter');
const btnAddError = document.getElementById('btnAddError');
const errorModal = document.getElementById('errorModal');
const errorTypeSelect = document.getElementById('errorType');
const errorMessageInput = document.getElementById('errorMessage');

let generatedStepsText = ''; // Store generated steps for copying
let errorInsertAfterIndex = null; // For inserting errors after a specific step
let capturedErrors = []; // Store recent errors for selection
const MAX_CAPTURED_ERRORS = 20;

// Establish connection to background script
let port = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function connectToBackground() {
  try {
    port = chrome.runtime.connect({ name: 'devtools-panel' });
  } catch (e) {
    console.error('Panel: Failed to connect:', e);
    return;
  }

  console.log('Panel: Connected to background');
  reconnectAttempts = 0; // Reset on successful connect

  port.onDisconnect.addListener(() => {
    const error = chrome.runtime.lastError;
    console.log('Panel: Port disconnected', error ? error.message : '');

    // Limit reconnection attempts
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = Math.min(1000 * reconnectAttempts, 5000); // Exponential backoff, max 5s
      console.log(`Panel: Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(connectToBackground, delay);
    } else {
      console.error('Panel: Max reconnection attempts reached. Please reload DevTools.');
    }
  });

  port.onMessage.addListener(handlePortMessage);

  // Get the inspected tab ID and send it to background
  try {
    if (chrome.devtools && chrome.devtools.inspectedWindow && typeof chrome.devtools.inspectedWindow.tabId !== 'undefined') {
      const tabId = chrome.devtools.inspectedWindow.tabId;
      port.postMessage({ type: 'setInspectedTab', tabId: tabId });
    }
  } catch (e) {
    console.log('Panel: Could not get tab ID:', e);
  }
}

function handlePortMessage(message) {
  console.log('Panel: Received message via port:', message);
  if (message.type === 'connectionConfirmed') {
    console.log('Panel: Background confirmed connection!');
  } else if (message.type === 'testResponse') {
    console.log('Panel: Test response received! Connection is working.');
  } else if (message.type === 'stepRecorded' && isRecording && !isPaused) {
    addStep(message.step);
  } else if (message.type === 'assertionCaptured' && isAssertionMode) {
    handleAssertionCaptured(message.elementData);
  } else if (message.type === 'errorCaptured') {
    // Always store captured errors for later selection
    capturedErrors.unshift(message.step);
    if (capturedErrors.length > MAX_CAPTURED_ERRORS) {
      capturedErrors.pop();
    }
    // Update error list if modal is open
    updateErrorList();

    // Auto-add to steps only if corresponding toggle is enabled
    if ((message.errorType === 'console' && captureConsoleErrors.checked) ||
        (message.errorType === 'network' && captureNetworkErrors.checked)) {
      addStep(message.step);
    }
  }
}

connectToBackground();

function addStep(step) {
  steps.push(step);
  renderSteps();
}

function renderSteps() {
  if (steps.length === 0) {
    stepsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div>No steps recorded yet. Click "Start" to begin recording.</div>
      </div>
    `;
    return;
  }

  stepsContainer.innerHTML = steps.map((step, index) => {
    const relativeTime = step.timestamp - (recordingStartTime || step.timestamp);
    const timeStr = formatTime(relativeTime);

    const isAssert = step.type === 'assert';
    let details = '';
    let typeLabel = step.type.toUpperCase();

    if (isAssert) {
      const assertLabels = {
        exists: 'ASSERT EXISTS',
        visible: 'ASSERT VISIBLE',
        textContains: 'ASSERT TEXT'
      };
      typeLabel = assertLabels[step.assertType] || 'ASSERT';
      details = `Element: ${step.selector || step.tagName || 'Unknown'}`;
      if (step.text) details += `<br>Text: "${escapeHtml(step.text)}"`;
    } else if (step.type === 'click') {
      details = `Element: ${step.selector || step.tagName || 'Unknown'}<br>Text: ${step.text || 'N/A'}`;
    } else if (step.type === 'input') {
      details = `Element: ${step.selector || step.tagName || 'Unknown'}<br>Value: ${escapeHtml(step.value || '')}`;
    } else if (step.type === 'change') {
      details = `Element: ${step.selector || step.tagName || 'Unknown'}<br>Value: ${escapeHtml(step.value || '')}`;
    } else if (step.type === 'keydown') {
      details = `Key: ${step.key} (${step.code})`;
    } else if (step.type === 'navigate') {
      details = `URL: ${step.url || 'N/A'}`;
    } else if (step.type === 'pageload') {
      details = `Page: ${step.text || 'Unknown'}<br>URL: ${step.url || 'N/A'}`;
    } else if (step.type === 'error') {
      if (step.errorType === 'note') {
        typeLabel = 'NOTE';
      } else {
        typeLabel = step.errorType === 'network' ? 'NETWORK ERROR' : 'CONSOLE ERROR';
      }
      details = escapeHtml(step.message || 'Unknown error');
      if (step.url) details += `<br>URL: ${step.url}`;
    }

    const isError = step.type === 'error';
    const isNote = step.type === 'error' && step.errorType === 'note';

    return `
      <div class="step-item" data-index="${index}">
        <div class="step-number${isAssert ? ' assert' : ''}${isError ? ' error' : ''}">${index + 1}</div>
        <div class="step-content">
          <div class="step-type${isAssert ? ' assert' : ''}${isError ? ' error' : ''}">${typeLabel}</div>
          <div class="step-details">${details}</div>
          <div class="step-timestamp">+${timeStr}</div>
        </div>
        <button class="step-delete" data-index="${index}" title="Delete step">×</button>
      </div>
    `;
  }).join('');
  
  // Scroll to bottom
  stepsContainer.scrollTop = stepsContainer.scrollHeight;
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const remainingMs = ms % 1000;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else if (seconds > 0) {
    return `${remainingSeconds}.${Math.floor(remainingMs / 100)}s`;
  } else {
    return `${remainingMs}ms`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateStatus() {
  if (isRecording && !isPaused) {
    status.textContent = 'Recording';
    status.className = 'status recording';
    btnStart.disabled = true;
    btnPause.disabled = false;
    btnStop.disabled = false;
  } else if (isPaused) {
    status.textContent = 'Paused';
    status.className = 'status paused';
    btnStart.disabled = false;
    btnPause.disabled = true;
    btnStop.disabled = false;
  } else {
    status.textContent = 'Idle';
    status.className = 'status idle';
    btnStart.disabled = false;
    btnPause.disabled = true;
    btnStop.disabled = true;
  }
}

btnStart.addEventListener('click', () => {
  if (!isRecording) {
    recordingStartTime = Date.now();
  }
  isRecording = true;
  isPaused = false;
  updateStatus();

  console.log('Panel: Starting recording');

  // Get tab ID and send message
  let tabId = null;
  try {
    if (chrome.devtools && chrome.devtools.inspectedWindow && typeof chrome.devtools.inspectedWindow.tabId !== 'undefined') {
      tabId = chrome.devtools.inspectedWindow.tabId;
      console.log('Got tabId:', tabId);
    }
  } catch (e) {
    console.log('Could not get tab ID:', e);
  }

  const message = {
    type: 'broadcastToContent',
    tabId: tabId,
    message: { type: 'startRecording' }
  };

  console.log('Sending message via port:', message);
  port.postMessage(message);

  // Also send recording settings
  port.postMessage({
    type: 'broadcastToContent',
    tabId: tabId,
    message: {
      type: 'setRecordingSettings',
      recordFocus: recordFocusEvents.checked,
      captureConsole: captureConsoleErrors.checked,
      captureNetwork: captureNetworkErrors.checked,
      captureAllLogs: captureAllLogs.checked,
      filterByDomain: filterByDomain.checked,
      domainFilter: domainFilter.value.trim()
    }
  });

  // Also try direct broadcast as fallback
  chrome.runtime.sendMessage({
    type: 'broadcastToContent',
    message: { type: 'startRecording' }
  }).catch(err => {
    console.log('Direct message failed:', err);
  });
});

btnPause.addEventListener('click', () => {
  isPaused = true;
  updateStatus();
  
  let tabId = null;
  try {
    if (chrome.devtools && chrome.devtools.inspectedWindow && typeof chrome.devtools.inspectedWindow.tabId !== 'undefined') {
      tabId = chrome.devtools.inspectedWindow.tabId;
    }
  } catch (e) {}
  
  port.postMessage({ 
    type: 'broadcastToContent',
    tabId: tabId,
    message: { type: 'pauseRecording' }
  });
});

btnStop.addEventListener('click', () => {
  isRecording = false;
  isPaused = false;
  updateStatus();
  
  let tabId = null;
  try {
    if (chrome.devtools && chrome.devtools.inspectedWindow && typeof chrome.devtools.inspectedWindow.tabId !== 'undefined') {
      tabId = chrome.devtools.inspectedWindow.tabId;
    }
  } catch (e) {}
  
  port.postMessage({ 
    type: 'broadcastToContent',
    tabId: tabId,
    message: { type: 'stopRecording' }
  });
});

btnClear.addEventListener('click', () => {
  if (confirm('Clear all recorded steps?')) {
    steps = [];
    recordingStartTime = null;
    renderSteps();
  }
});

btnExport.addEventListener('click', () => {
  if (steps.length === 0) {
    alert('No steps to export');
    return;
  }
  
  const exportData = {
    timestamp: new Date().toISOString(),
    steps: steps,
    totalSteps: steps.length
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `step-recording-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// API Key Management
async function loadApiKey() {
  try {
    const result = await chrome.storage.local.get(['openaiApiKey']);
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
      apiKeyStatus.textContent = '✓ Saved';
      apiKeyStatus.className = 'api-key-status';
    } else {
      apiKeyStatus.textContent = 'Not set';
      apiKeyStatus.className = 'api-key-status missing';
    }
  } catch (error) {
    console.error('Error loading API key:', error);
  }
}

async function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter an API key');
    return;
  }
  
  try {
    await chrome.storage.local.set({ openaiApiKey: apiKey });
    apiKeyStatus.textContent = '✓ Saved';
    apiKeyStatus.className = 'api-key-status';
    alert('API key saved successfully!');
  } catch (error) {
    console.error('Error saving API key:', error);
    alert('Failed to save API key');
  }
}

btnSaveKey.addEventListener('click', saveApiKey);

// Load API key on startup
loadApiKey();

// Steps to Reproduce Generation using OpenAI API
async function generateStepsToReproduce() {
  if (steps.length === 0) {
    alert('No steps recorded. Please record some steps first.');
    return;
  }

  // Get API key
  const result = await chrome.storage.local.get(['openaiApiKey']);
  const apiKey = result.openaiApiKey;
  
  if (!apiKey) {
    alert('Please set your OpenAI API key in Settings first.');
    apiKeyInput.focus();
    return;
  }

  // Disable button and show loading
  btnGenerate.disabled = true;
  btnGenerate.textContent = 'Generating...';
  testCasesSection.style.display = 'block';
  testCasesContent.innerHTML = '<div class="loading">🔄 Generating steps to reproduce...</div>';

  try {
    // Get current page URL if available
    let pageUrl = '';
    try {
      if (chrome.devtools && chrome.devtools.inspectedWindow) {
        pageUrl = chrome.devtools.inspectedWindow.tabId ? 'Current page' : '';
      }
    } catch (e) {}

    // Format steps for the prompt - include element context
    const stepsDescription = steps.map((step, index) => {
      const elementName = step.text?.trim() || step.selector || 'element';
      const tag = step.tagName || '';

      // Determine element type description
      let elementType = '';
      if (tag === 'button') elementType = 'button';
      else if (tag === 'a') elementType = 'link';
      else if (tag === 'input') elementType = step.inputType === 'checkbox' ? 'checkbox' : 'field';
      else if (tag === 'select') elementType = 'dropdown';
      else if (tag === 'textarea') elementType = 'text area';
      else if (['li', 'span', 'div'].includes(tag) && step.selector?.includes('menu')) elementType = 'menu item';

      let desc = `${index + 1}. ${step.type.toUpperCase()}`;

      if (step.type === 'error') {
        // ERROR STEPS - make them prominent
        const errorLabel = step.errorType === 'network' ? 'NETWORK ERROR' :
                          step.errorType === 'console' ? 'CONSOLE ERROR' : 'NOTE';
        desc = `${index + 1}. **${errorLabel}**: ${step.message || 'Unknown error'}`;
        if (step.url) desc += ` (URL: ${step.url})`;
      } else if (step.type === 'navigate') {
        desc += `: Browser back/forward to "${step.url || 'previous page'}"`;
      } else if (step.type === 'pageload') {
        desc += `: Redirected to "${step.text || step.url || 'new page'}"`;
      } else if (step.type === 'assert') {
        const assertDesc = {
          exists: 'exists',
          visible: 'is visible',
          textContains: 'text exists'
        };
        desc += `: "${elementName}" ${elementType} ${assertDesc[step.assertType] || 'exists'}`;
      } else {
        desc += `: "${elementName}"`;
        if (elementType) desc += ` (${elementType})`;
      }

      if (step.value) desc += ` value="${step.value.substring(0, 50)}"`;
      if (step.key) desc += ` key=${step.key}`;
      return desc;
    }).join('\n');

    // Check if there are any error steps
    const hasErrors = steps.some(step => step.type === 'error');

    // Create prompt for OpenAI
    let rules = `Rules:
- One step per line, no bullets, no numbers, no prefixes
- Use element text in quotes, include element type (button, link, menu item, field)
- Be concise: "Click 'Submit' button" not "Click Submit"
- Combine focus + click into just click
- No intro or outro
- ONLY include steps from the list above - do NOT add or invent anything`;

    if (hasErrors) {
      rules += `
- Include ALL errors from the list, format as: "Observe: [error message]"`;
    }

    const prompt = `Convert these recorded steps into brief "Steps to Reproduce":

${stepsDescription}

${rules}`;

    // System message - plain lines, no prefixes
    const systemMessage = 'You convert recorded steps into concise reproduction steps. One step per line, no bullets or numbers. Only include what is in the input - never invent steps or errors.\n\nExample:\nClick "Add Todo" button\nEnter "Test item" in input field\nClick "Submit" button';

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const stepsToReproduce = data.choices[0].message.content;

    // Store for copying
    generatedStepsText = stepsToReproduce;

    // Display steps to reproduce in editable textarea
    testCasesContent.innerHTML = `<textarea class="test-case-textarea" id="stepsTextarea">${escapeHtml(stepsToReproduce)}</textarea>`;

    // Update stored text when user edits
    document.getElementById('stepsTextarea').addEventListener('input', (e) => {
      generatedStepsText = e.target.value;
    });
    
    // Scroll to steps section
    testCasesSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (error) {
    console.error('Error generating steps to reproduce:', error);
    testCasesContent.innerHTML = `<div class="error">❌ Error: ${escapeHtml(error.message)}</div>`;
  } finally {
    btnGenerate.disabled = false;
    btnGenerate.textContent = 'Generate Steps to Reproduce';
  }
}

btnGenerate.addEventListener('click', generateStepsToReproduce);

// ============ Assertion Mode ============

function showAssertModal() {
  assertModal.classList.add('show');
}

function hideAssertModal() {
  assertModal.classList.remove('show');
}

function enterAssertionMode(assertType) {
  isAssertionMode = true;
  pendingAssertType = assertType;
  hideAssertModal();
  assertionBanner.classList.add('show');
  btnAssert.classList.add('active');

  // Tell content script to enter assertion mode
  let tabId = null;
  try {
    if (chrome.devtools?.inspectedWindow?.tabId) {
      tabId = chrome.devtools.inspectedWindow.tabId;
    }
  } catch (e) {}

  port.postMessage({
    type: 'broadcastToContent',
    tabId: tabId,
    message: { type: 'enterAssertionMode' }
  });
}

function exitAssertionMode() {
  isAssertionMode = false;
  pendingAssertType = null;
  insertAfterIndex = null;
  assertionBanner.classList.remove('show');
  btnAssert.classList.remove('active');

  // Tell content script to exit assertion mode
  let tabId = null;
  try {
    if (chrome.devtools?.inspectedWindow?.tabId) {
      tabId = chrome.devtools.inspectedWindow.tabId;
    }
  } catch (e) {}

  port.postMessage({
    type: 'broadcastToContent',
    tabId: tabId,
    message: { type: 'exitAssertionMode' }
  });
}

function handleAssertionCaptured(elementData) {
  const assertStep = {
    type: 'assert',
    assertType: pendingAssertType,
    timestamp: Date.now(),
    selector: elementData.selector,
    tagName: elementData.tagName,
    text: elementData.text,
    isVisible: elementData.isVisible
  };

  // Insert at specific position or add to end
  if (insertAfterIndex !== null) {
    steps.splice(insertAfterIndex + 1, 0, assertStep);
  } else {
    steps.push(assertStep);
  }

  renderSteps();
  exitAssertionMode();
}

// Assert button click - show modal
btnAssert.addEventListener('click', () => {
  insertAfterIndex = null; // Adding to end
  showAssertModal();
});

// Modal option clicks
assertModal.querySelectorAll('.modal-option').forEach(option => {
  option.addEventListener('click', () => {
    const assertType = option.dataset.type;
    enterAssertionMode(assertType);
  });
});

// Cancel button
document.getElementById('btnCancelAssert').addEventListener('click', hideAssertModal);

// Close modal on overlay click
assertModal.addEventListener('click', (e) => {
  if (e.target === assertModal) hideAssertModal();
});

// Escape key to cancel assertion mode
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isAssertionMode) {
      exitAssertionMode();
    } else if (assertModal.classList.contains('show')) {
      hideAssertModal();
    }
    hideContextMenu();
  }
});

// ============ Context Menu ============

let contextMenuStepIndex = null;

function showContextMenu(x, y, stepIndex) {
  contextMenuStepIndex = stepIndex;
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
  contextMenu.classList.add('show');
}

function hideContextMenu() {
  contextMenu.classList.remove('show');
  contextMenuStepIndex = null;
}

// Right-click on steps
stepsContainer.addEventListener('contextmenu', (e) => {
  const stepItem = e.target.closest('.step-item');
  if (stepItem) {
    e.preventDefault();
    const index = parseInt(stepItem.dataset.index, 10);
    showContextMenu(e.clientX, e.clientY, index);
  }
});

// Context menu item clicks
contextMenu.addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  if (action === 'assert-after') {
    insertAfterIndex = contextMenuStepIndex;
    hideContextMenu();
    showAssertModal();
  } else if (action === 'error-after') {
    errorInsertAfterIndex = contextMenuStepIndex;
    hideContextMenu();
    showErrorModal();
  } else if (action === 'delete') {
    if (contextMenuStepIndex !== null) {
      steps.splice(contextMenuStepIndex, 1);
      renderSteps();
    }
    hideContextMenu();
  }
});

// ============ Error/Note Modal ============

function showErrorModal() {
  errorModal.classList.add('show');
  errorMessageInput.value = '';
  updateErrorList();
}

function hideErrorModal() {
  errorModal.classList.remove('show');
  errorInsertAfterIndex = null;
}

function updateErrorList() {
  const errorListContainer = document.getElementById('errorListContainer');
  if (!errorListContainer) return;

  if (capturedErrors.length === 0) {
    errorListContainer.innerHTML = '<div class="error-list-empty">No errors captured yet. Errors will appear here as they occur.</div>';
    return;
  }

  errorListContainer.innerHTML = capturedErrors.map((err, index) => {
    const typeLabel = err.errorType === 'network' ? '🌐' : '⚠️';
    const message = (err.message || '').substring(0, 150);
    const url = err.url ? err.url.substring(0, 100) : '';
    const time = new Date(err.timestamp).toLocaleTimeString();

    // Build display text with message and URL
    let displayText = escapeHtml(message);
    if (url) {
      displayText += `<br><span class="error-list-url">${escapeHtml(url)}</span>`;
    }

    return `
      <div class="error-list-item" data-error-index="${index}">
        <span class="error-list-type">${typeLabel}</span>
        <div class="error-list-message">${displayText}</div>
        <span class="error-list-time">${time}</span>
      </div>
    `;
  }).join('');
}

function selectCapturedError(index) {
  const error = capturedErrors[index];
  if (!error) return;

  const errorStep = {
    type: 'error',
    errorType: error.errorType,
    timestamp: Date.now(),
    tagName: error.tagName || '',
    selector: error.selector || '',
    text: error.text || '',
    message: error.message,
    url: error.url
  };

  // Insert at specific position or add to end
  if (errorInsertAfterIndex !== null) {
    steps.splice(errorInsertAfterIndex + 1, 0, errorStep);
  } else {
    steps.push(errorStep);
  }

  renderSteps();
  hideErrorModal();
}

function addErrorStep() {
  const message = errorMessageInput.value.trim();
  if (!message) {
    alert('Please enter a message');
    return;
  }

  const errorStep = {
    type: 'error',
    errorType: errorTypeSelect.value,
    timestamp: Date.now(),
    tagName: '',
    selector: '',
    text: '',
    message: message
  };

  // Insert at specific position or add to end
  if (errorInsertAfterIndex !== null) {
    steps.splice(errorInsertAfterIndex + 1, 0, errorStep);
  } else {
    steps.push(errorStep);
  }

  renderSteps();
  hideErrorModal();
}

// Error button click
btnAddError.addEventListener('click', () => {
  errorInsertAfterIndex = null;
  showErrorModal();
});

// Confirm error
document.getElementById('btnConfirmError').addEventListener('click', addErrorStep);

// Cancel error
document.getElementById('btnCancelError').addEventListener('click', hideErrorModal);

// Close modal on overlay click
errorModal.addEventListener('click', (e) => {
  if (e.target === errorModal) hideErrorModal();
});

// Click on error list item to select it
document.getElementById('errorListContainer')?.addEventListener('click', (e) => {
  const item = e.target.closest('.error-list-item');
  if (item) {
    const index = parseInt(item.dataset.errorIndex, 10);
    selectCapturedError(index);
  }
});

// Enter key to submit
errorMessageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    addErrorStep();
  }
});

// Hide context menu on click elsewhere
document.addEventListener('click', (e) => {
  hideContextMenu();
});

// Delete button click on steps
stepsContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('step-delete')) {
    e.stopPropagation();
    const index = parseInt(e.target.dataset.index, 10);
    if (!isNaN(index) && index >= 0 && index < steps.length) {
      steps.splice(index, 1);
      renderSteps();
    }
  }
});

// ============ Copy Generated Steps ============

btnCopySteps.addEventListener('click', () => {
  if (!generatedStepsText) {
    alert('No steps to copy. Generate steps first.');
    return;
  }

  // Use execCommand in inspected page context (doesn't require focus like clipboard API)
  const textToCopy = generatedStepsText
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\r?\n/g, '\\n');

  chrome.devtools.inspectedWindow.eval(
    `(function() {
      const text = \`${textToCopy}\`.replace(/\\\\n/g, '\\n');
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    })()`,
    (result, error) => {
      if (error || !result) {
        console.error('Copy failed:', error);
        // Fallback: copy within DevTools panel context
        const textarea = document.createElement('textarea');
        textarea.value = generatedStepsText;
        textarea.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      btnCopySteps.textContent = 'Copied!';
      btnCopySteps.classList.add('copied');
      setTimeout(() => {
        btnCopySteps.textContent = 'Copy';
        btnCopySteps.classList.remove('copied');
      }, 2000);
    }
  );
});

// ============ Error Capture Toggles ============

// Load saved recording settings
async function loadRecordingSettings() {
  try {
    const result = await chrome.storage.local.get(['recordFocusEvents', 'captureConsoleErrors', 'captureNetworkErrors', 'captureAllLogs', 'filterByDomain', 'domainFilter']);
    recordFocusEvents.checked = result.recordFocusEvents || false;
    captureConsoleErrors.checked = result.captureConsoleErrors || false;
    captureNetworkErrors.checked = result.captureNetworkErrors || false;
    captureAllLogs.checked = result.captureAllLogs || false;
    filterByDomain.checked = result.filterByDomain !== false; // Default to true
    domainFilter.value = result.domainFilter || '';

    // Auto-detect domain from inspected page if not set
    if (!result.domainFilter) {
      try {
        chrome.devtools.inspectedWindow.eval('window.location.origin', (origin, error) => {
          if (!error && origin) {
            domainFilter.value = origin;
            saveRecordingSettings();
          }
        });
      } catch (e) {}
    }
  } catch (error) {
    console.error('Error loading recording settings:', error);
  }
}

// Save settings to storage
async function saveRecordingSettings() {
  try {
    await chrome.storage.local.set({
      recordFocusEvents: recordFocusEvents.checked,
      captureConsoleErrors: captureConsoleErrors.checked,
      captureNetworkErrors: captureNetworkErrors.checked,
      captureAllLogs: captureAllLogs.checked,
      filterByDomain: filterByDomain.checked,
      domainFilter: domainFilter.value.trim()
    });
  } catch (error) {
    console.error('Error saving recording settings:', error);
  }
}

// Send settings to content script
function sendRecordingSettings() {
  let tabId = null;
  try {
    if (chrome.devtools?.inspectedWindow?.tabId) {
      tabId = chrome.devtools.inspectedWindow.tabId;
    }
  } catch (e) {}

  port.postMessage({
    type: 'broadcastToContent',
    tabId: tabId,
    message: {
      type: 'setRecordingSettings',
      recordFocus: recordFocusEvents.checked,
      captureConsole: captureConsoleErrors.checked,
      captureNetwork: captureNetworkErrors.checked,
      captureAllLogs: captureAllLogs.checked,
      filterByDomain: filterByDomain.checked,
      domainFilter: domainFilter.value.trim()
    }
  });
}

// Save and send when settings change
function handleRecordingSettingsChange() {
  saveRecordingSettings();
  sendRecordingSettings();
}

recordFocusEvents.addEventListener('change', handleRecordingSettingsChange);
captureConsoleErrors.addEventListener('change', handleRecordingSettingsChange);
captureNetworkErrors.addEventListener('change', handleRecordingSettingsChange);
captureAllLogs.addEventListener('change', handleRecordingSettingsChange);
filterByDomain.addEventListener('change', handleRecordingSettingsChange);
domainFilter.addEventListener('change', handleRecordingSettingsChange);
domainFilter.addEventListener('blur', handleRecordingSettingsChange);

// Load settings on startup
loadRecordingSettings();

// Initialize
updateStatus();
