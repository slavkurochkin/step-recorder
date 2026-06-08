let steps = [];
let networkSteps = [];
// Feature flags rendered inline in the step timeline (like network requests).
// flagSteps is the time-ordered log of flag captures. Each entry has a `kind`:
//   - bootstrap: flag present in the SDK's initial/streamed flag set (page load)
//   - eval:      app actually read the flag via variation() — timestamped at point-of-use
//   - change:    flag value changed mid-session (streaming patch / change event)
let flagSteps = [];
let flagDedup = new Map();   // `${provider}:${key}:${kind}` -> last value (suppress repeats)
let flagCurrent = new Map(); // `${provider}:${key}` -> last value (change detection across kinds)
let hiddenMethods = new Set(JSON.parse(localStorage.getItem('srHiddenMethods') || '[]'));
let networkSearchQuery = '';
let isRecording = false;
let isPaused = false;
let recordingStartTime = null;
let isAssertionMode = false;
let pendingAssertType = null;
let insertAfterIndex = null; // For inserting assertions after a specific step
let isScreenshotMode = false;
let pendingScreenshotRegion = null;
let rawCaptureResolve = null; // resolver for an in-flight single viewport capture
let isCapturingFullPage = false;

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
const rawStepsTextarea = document.getElementById('rawStepsTextarea');
const llmStepsTextarea = document.getElementById('llmStepsTextarea');
const assertModal = document.getElementById('assertModal');
const assertionBanner = document.getElementById('assertionBanner');
const btnScreenshot = document.getElementById('btnScreenshot');
const screenshotModal = document.getElementById('screenshotModal');
const screenshotBanner = document.getElementById('screenshotBanner');
const contextMenu = document.getElementById('contextMenu');
const btnCopyRaw = document.getElementById('btnCopyRaw');
const btnCopyLLM = document.getElementById('btnCopyLLM');
const llmModeSelect = document.getElementById('llmMode');
const recordFocusEvents = document.getElementById('recordFocusEvents');
const captureConsoleErrors = document.getElementById('captureConsoleErrors');
const captureNetworkErrors = document.getElementById('captureNetworkErrors');
const captureAllLogs = document.getElementById('captureAllLogs');
const filterByDomain = document.getElementById('filterByDomain');
const domainFilter = document.getElementById('domainFilter');
const captureNetworkRequests = document.getElementById('captureNetworkRequests');
const captureFeatureFlags = document.getElementById('captureFeatureFlags');
const trackNavigation = document.getElementById('trackNavigation');
const networkUrlFilterInput = document.getElementById('networkUrlFilter');
const methodFiltersEl = document.getElementById('methodFilters');
const networkSearchInput = document.getElementById('networkSearchInput');
const apiFilterBar = document.getElementById('apiFilterBar');
const btnAddError = document.getElementById('btnAddError');
const errorModal = document.getElementById('errorModal');
const errorTypeSelect = document.getElementById('errorType');
const errorMessageInput = document.getElementById('errorMessage');

let errorInsertAfterIndex = null; // For inserting errors after a specific step
let capturedErrors = []; // Store recent errors for selection
let expandedApiSteps = new Set(); // Step indices whose API rows are expanded
let expandedFlagSteps = new Set(); // Step indices whose flag rows are expanded
const MAX_CAPTURED_ERRORS = 20;

// Establish connection to background script
let port = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Send over the DevTools port, transparently reconnecting if the background
// service worker idled out and the port went dead (MV3). Without this, the first
// click after an idle period (e.g. Start after Stop) silently no-ops on a dead port.
function safePost(message) {
  try {
    if (!port) connectToBackground();
    port.postMessage(message);
  } catch (e) {
    console.log('Panel: port send failed, reconnecting…', e && e.message);
    try {
      connectToBackground();
      port.postMessage(message);
    } catch (e2) {
      console.log('Panel: resend after reconnect failed:', e2 && e2.message);
    }
  }
}

function connectToBackground() {
  try {
    port = chrome.runtime.connect({ name: 'devtools-panel' });
  } catch (e) {
    console.log('Panel: Failed to connect (extension context invalidated):', e.message);
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
      console.log('Panel: Max reconnection attempts reached. Please reload DevTools.');
    }
  });

  port.onMessage.addListener(handlePortMessage);

  // Get the inspected tab ID and send it to background
  try {
    if (chrome.devtools && chrome.devtools.inspectedWindow && typeof chrome.devtools.inspectedWindow.tabId !== 'undefined') {
      const tabId = chrome.devtools.inspectedWindow.tabId;
      safePost({ type: 'setInspectedTab', tabId: tabId });
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
    if (message.step.type === 'network') {
      addNetworkStep(message.step);
    } else {
      addStep(message.step);
    }
  } else if (message.type === 'assertionCaptured' && isAssertionMode) {
    handleAssertionCaptured(message.elementData);
  } else if (message.type === 'screenshotRegionSelected') {
    pendingScreenshotRegion = message.region;
    exitScreenshotSelectionMode();
    triggerScreenshotCapture(message.region);
  } else if (message.type === 'screenshotCaptured') {
    handleScreenshotCaptured(message.dataUrl, message.region);
  } else if (message.type === 'rawScreenshot') {
    if (rawCaptureResolve) {
      const resolve = rawCaptureResolve;
      rawCaptureResolve = null;
      resolve(message.error ? null : message.dataUrl);
    }
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
  } else if (message.type === 'flagCaptured' && isRecording && !isPaused) {
    if (captureFeatureFlags.checked) addFlag(message.step);
  }
}

function addFlag(step) {
  const provider = step.provider || 'Unknown';
  const kind = step.kind || 'eval';
  const flagId = `${provider}:${step.key}`;
  const dedupeKey = `${flagId}:${kind}`;
  const serialized = JSON.stringify(step.value === undefined ? null : step.value);

  // Suppress repeats of the same kind+value (variation() fires every render; the SDK
  // re-polls the same bootstrap set). Changes always pass through. A first eval is kept
  // even when it matches the bootstrap value, because its point-of-use timestamp matters.
  if (kind !== 'change' && flagDedup.get(dedupeKey) === serialized) return;
  flagDedup.set(dedupeKey, serialized);

  const prevCurrent = flagCurrent.get(flagId);
  const changed = prevCurrent !== undefined && prevCurrent !== serialized;
  flagCurrent.set(flagId, serialized);

  flagSteps.push({
    type: 'flag',
    provider,
    key: step.key,
    value: step.value,
    previous: changed ? JSON.parse(prevCurrent) : step.previous,
    changed: changed || kind === 'change',
    kind,
    timestamp: step.timestamp || Date.now()
  });
  renderSteps();
}

// --- LaunchDarkly network-response parsing (primary capture path) ---
function isLaunchDarklyEvalUrl(u) {
  if (!u) return false;
  if (u.indexOf('launchdarkly.com') === -1 && u.indexOf('launchdarkly.us') === -1) return false;
  return /clientstream\./.test(u) || /clientsdk\./.test(u) || /\/eval/.test(u) || /\/sdk\/eval/.test(u);
}

function ldFlagValue(entry) {
  return (entry && typeof entry === 'object' && 'value' in entry) ? entry.value : entry;
}

// Ingest a `{ flagKey: { value, ... } }` map. Returns true if any flag was found.
// The network feed only ever carries the SDK's flag set, so these are `bootstrap`.
function ingestLDFlagMap(map, kind) {
  if (!map || typeof map !== 'object') return false;
  let any = false;
  for (const key of Object.keys(map)) {
    const entry = map[key];
    // Real LD entries are objects carrying a `value`; skip anything else.
    if (entry && typeof entry === 'object' && !('value' in entry)) continue;
    addFlag({ provider: 'LaunchDarkly', kind: kind || 'bootstrap', key, value: ldFlagValue(entry), timestamp: Date.now() });
    any = true;
  }
  return any;
}

function parseLaunchDarklyResponse(url, body) {
  if (!body) return;

  // 1) Plain JSON map — polling / evalx / bootstrap responses.
  try {
    let obj = JSON.parse(body);
    if (obj && obj.data && typeof obj.data === 'object') obj = obj.data;
    if (ingestLDFlagMap(obj)) return;
  } catch (_) {}

  // 2) SSE stream text — lines of `event: put|patch` followed by `data: {...}`.
  let currentEvent = null;
  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      try {
        let d = JSON.parse(line.slice(5).trim());
        if (d && d.data && typeof d.data === 'object') d = d.data;
        if (currentEvent === 'patch' && d && d.key) {
          addFlag({ provider: 'LaunchDarkly', kind: 'change', key: d.key, value: ldFlagValue(d), timestamp: Date.now() });
        } else {
          ingestLDFlagMap(d);
        }
      } catch (_) {}
    }
  }
}

function formatFlagValue(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// Flags captured within a step's time window [step.timestamp, nextStep.timestamp).
function flagsForStepWindow(thisTs, nextTs) {
  return flagSteps
    .map((fs, fi) => ({ fs, fi }))
    .filter(({ fs }) => fs.timestamp >= thisTs && fs.timestamp < nextTs);
}

connectToBackground();

// API URL filter accepts multiple comma-separated patterns; a request is captured
// if its URL contains ANY of them (empty filter = capture everything).
function matchesNetworkFilter(url) {
  const terms = networkUrlFilterInput.value.split(',').map(s => s.trim()).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.some(t => url.includes(t));
}

// DevTools Network API — reliable capture without content script patching
if (chrome.devtools && chrome.devtools.network) {
  chrome.devtools.network.onRequestFinished.addListener((request) => {
    if (!isRecording || isPaused) return;

    const url = request.request.url;

    // Feature-flag capture — read LaunchDarkly's eval/stream responses directly from
    // the DevTools network feed. Independent of the API-requests toggle, and works
    // regardless of page CSP / SDK bundling.
    if (captureFeatureFlags.checked && isLaunchDarklyEvalUrl(url)) {
      request.getContent((body) => parseLaunchDarklyResponse(url, body));
    }

    if (!captureNetworkRequests.checked) return;
    if (!matchesNetworkFilter(url)) return;

    request.getContent((body, encoding) => {
      const step = {
        type: 'network',
        timestamp: Date.now(),
        method: request.request.method,
        url,
        status: request.response.status,
        statusText: request.response.statusText,
        requestHeaders: request.request.headers || [],
        requestBody: request.request.postData?.text?.substring(0, 5000) || null,
        responseHeaders: request.response.headers || [],
        responseBody: encoding === 'base64' ? '[binary]' : (body || '').substring(0, 100000),
        duration: Math.round(request.time),
        tagName: 'network',
        selector: '',
        text: `${request.request.method} ${url}`
      };
      addNetworkStep(step);
    });
  });
}

function addStep(step) {
  steps.push(step);
  renderSteps(true);
}

function addNetworkStep(step) {
  networkSteps.push(step);
  renderMethodFilters();
  renderSteps();
}

function renderMethodFilters() {
  const methods = [...new Set(networkSteps.map(s => s.method).filter(Boolean))].sort();
  apiFilterBar.style.display = methods.length > 0 ? '' : 'none';
  methodFiltersEl.innerHTML = methods.map(m =>
    `<button class="method-pill${hiddenMethods.has(m) ? ' off' : ''}" data-method="${m}" style="${methodStyle(m)}">${m}</button>`
  ).join('');
}

methodFiltersEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.method-pill');
  if (!btn) return;
  const method = btn.dataset.method;
  if (hiddenMethods.has(method)) hiddenMethods.delete(method);
  else hiddenMethods.add(method);
  localStorage.setItem('srHiddenMethods', JSON.stringify([...hiddenMethods]));
  renderMethodFilters();
  renderSteps();
});

networkSearchInput.addEventListener('input', () => {
  networkSearchQuery = networkSearchInput.value.trim();
  renderSteps();
});

const METHOD_COLORS = {
  GET:     { color: '#1565C0', bg: '#e3f2fd' },
  POST:    { color: '#2e7d32', bg: '#e8f5e9' },
  PUT:     { color: '#e65100', bg: '#fff3e0' },
  PATCH:   { color: '#6a1b9a', bg: '#f3e5f5' },
  DELETE:  { color: '#c62828', bg: '#ffebee' },
  OPTIONS: { color: '#546e7a', bg: '#eceff1' },
  HEAD:    { color: '#4a148c', bg: '#f3e5f5' },
};

function methodStyle(method) {
  const c = METHOD_COLORS[method] || { color: '#555', bg: '#eee' };
  return `color:${c.color};background:${c.bg};border-color:${c.color};`;
}


// Generate raw text from steps, interleaving network calls under the UI step that triggered them
function generateRawStepsText() {
  const visibleNetworkSteps = networkSteps.filter(ns => !hiddenMethods.has(ns.method));

  if (steps.length === 0 && visibleNetworkSteps.length === 0) return '';
  if (steps.length === 0) return visibleNetworkSteps.map(generateStepText).join('\n');
  if (visibleNetworkSteps.length === 0) return steps.map(generateStepText).join('\n');

  const lines = [];

  // Orphan network steps before first UI step
  const firstUiTs = steps[0].timestamp;
  visibleNetworkSteps.filter(ns => ns.timestamp < firstUiTs).forEach(ns => lines.push(generateStepText(ns)));

  // Each UI step followed by its triggered API calls
  steps.forEach((step, index) => {
    lines.push(generateStepText(step));
    const thisTs = step.timestamp;
    const nextTs = steps[index + 1]?.timestamp ?? Infinity;
    visibleNetworkSteps
      .filter(ns => ns.timestamp >= thisTs && ns.timestamp < nextTs)
      .forEach(ns => lines.push('  → ' + generateStepText(ns)));
  });

  return lines.join('\n');
}

// Generate text for a single step
function generateStepText(step) {
  // If user has custom text, use that
  if (step.customText) {
    return step.customText;
  }

  const elementName = step.text?.trim() || step.selector || 'element';
  const tag = step.tagName || '';

  let elementType = '';
  if (tag === 'button') elementType = 'button';
  else if (tag === 'a') elementType = 'link';
  else if (tag === 'input') elementType = step.inputType === 'checkbox' ? 'checkbox' : 'field';
  else if (tag === 'select') elementType = 'dropdown';
  else if (tag === 'textarea') elementType = 'text area';

  if (step.type === 'error') {
    const errorLabel = step.errorType === 'network' ? 'Network error' :
                      step.errorType === 'console' ? 'Console error' : 'Note';
    let text = `${errorLabel}: ${step.message || 'Unknown'}`;
    if (step.url) text += ` (${step.url})`;
    return text;
  } else if (step.type === 'click') {
    return `Click "${elementName}"${elementType ? ` (${elementType})` : ''}`;
  } else if (step.type === 'input' || step.type === 'change') {
    return `Enter "${step.value || ''}" in "${elementName}"${elementType ? ` (${elementType})` : ''}`;
  } else if (step.type === 'focus') {
    return `Focus "${elementName}"${elementType ? ` (${elementType})` : ''}`;
  } else if (step.type === 'keydown') {
    return `Press ${step.key}`;
  } else if (step.type === 'navigate') {
    return `Navigate to ${step.url || 'page'}`;
  } else if (step.type === 'pageload') {
    return `Page loaded: ${step.url || step.text || 'Unknown'}`;
  } else if (step.type === 'screenshot') {
    return step.screenshotType === 'partial' ? 'Screenshot (partial)' : 'Screenshot (full page)';
  } else if (step.type === 'assert') {
    const assertType = step.assertType === 'exists' ? 'exists' :
                      step.assertType === 'visible' ? 'is visible' : 'contains text';
    return `Verify "${elementName}" ${assertType}`;
  } else if (step.type === 'network') {
    const urlPath = step.url ? step.url.replace(/^https?:\/\/[^/]+/, '') || step.url : 'unknown';
    let text = `${step.method || 'GET'} ${urlPath}`;
    if (step.status) text += ` → ${step.status}`;
    if (step.statusText) text += ` ${step.statusText}`;
    if (step.duration) text += ` (${step.duration}ms)`;
    return text;
  }
  return `${step.type}: ${elementName}`;
}

// Update raw steps textarea
function updateRawStepsTextarea() {
  rawStepsTextarea.value = generateRawStepsText();
}

function renderSteps(scrollToBottom = false) {
  if (steps.length === 0) {
    stepsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div>No steps recorded yet. Click "Start" to begin recording.</div>
      </div>
    `;
    updateRawStepsTextarea();
    return;
  }

  stepsContainer.innerHTML = steps.map((step, index) => {
    const relativeTime = step.timestamp - (recordingStartTime || step.timestamp);
    const timeStr = formatTime(relativeTime);

    const isAssert = step.type === 'assert';
    const isError = step.type === 'error';
    let badgeClass = '';
    let typeLabel = step.type;

    if (isAssert) {
      badgeClass = 'assert';
      const assertLabels = { exists: 'assert', visible: 'assert', textContains: 'assert' };
      typeLabel = assertLabels[step.assertType] || 'assert';
    } else if (isError) {
      badgeClass = 'error';
      typeLabel = step.errorType === 'note' ? 'note' : step.errorType === 'network' ? 'net err' : 'err';
    } else if (step.type === 'screenshot') {
      badgeClass = 'screenshot';
      typeLabel = 'screenshot';
    }

    const stepText = escapeHtml(generateStepText(step));

    const hasAlts = step.selectorAlternatives?.length > 0;
    const currentSel = step.selector || '';

    // Find network calls that happened between this UI step and the next, applying filters
    const thisTs = step.timestamp;
    const nextTs = steps[index + 1]?.timestamp ?? Infinity;
    const query = networkSearchQuery.toLowerCase();
    const relatedNet = [];
    networkSteps.forEach((ns, ni) => {
      if (ns.timestamp < thisTs || ns.timestamp >= nextTs) return;
      if (hiddenMethods.has(ns.method)) return;
      if (query && !ns.url?.toLowerCase().includes(query)) return;
      relatedNet.push({ ns, ni });
    });

    let netRowsHtml = '';
    if (relatedNet.length > 0) {
      const isExpanded = expandedApiSteps.has(index);
      const count = relatedNet.length;
      const label = isExpanded
        ? `▾ hide ${count} API call${count > 1 ? 's' : ''}`
        : `▸ ${count} API call${count > 1 ? 's' : ''}`;
      netRowsHtml = `<div class="step-api-toggle${isExpanded ? ' expanded' : ''}" data-step-index="${index}">${label}</div>`;
      if (isExpanded) {
        netRowsHtml += relatedNet.map(({ ns, ni }) => {
          const urlPath = ns.url ? ns.url.replace(/^https?:\/\/[^/]+/, '') || ns.url : 'unknown';
          const isErr = !ns.status || ns.status >= 400;
          const mStyle = methodStyle(ns.method || 'GET');
          return `<div class="step-api-row" data-network-index="${ni}">
            <span class="step-api-arrow">↳</span>
            <span class="step-badge" style="${mStyle};font-size:9px;padding:1px 4px;min-width:0;">${escapeHtml(ns.method || 'GET')}</span>
            <span class="step-api-url">${escapeHtml(urlPath)}</span>
            <span class="network-status${isErr ? ' error' : ''}" style="font-size:10px;">${ns.status || '?'}</span>
            ${ns.duration ? `<span class="network-duration">${ns.duration}ms</span>` : ''}
          </div>`;
        }).join('');
      }
    }

    // Find feature flags captured in this step's time window (like network calls).
    const relatedFlags = flagsForStepWindow(thisTs, nextTs);

    let flagRowsHtml = '';
    if (relatedFlags.length > 0) {
      const isExpanded = expandedFlagSteps.has(index);
      const count = relatedFlags.length;
      const label = isExpanded
        ? `▾ hide ${count} flag${count > 1 ? 's' : ''}`
        : `▸ ${count} flag${count > 1 ? 's' : ''}`;
      flagRowsHtml = `<div class="step-flag-toggle${isExpanded ? ' expanded' : ''}" data-flag-step-index="${index}">${label}</div>`;
      if (isExpanded) {
        flagRowsHtml += relatedFlags.map(({ fs }) => {
          const valStr = escapeHtml(formatFlagValue(fs.value));
          const boolFalseClass = fs.value === false ? ' bool-false' : '';
          const changedBadge = fs.changed
            ? `<span class="flag-changed" title="Changed from ${escapeHtml(formatFlagValue(fs.previous))}">changed</span>`
            : '';
          return `<div class="step-flag-row">
            <span class="step-api-arrow">↳</span>
            <span class="flag-provider">${escapeHtml(fs.provider)}</span>
            <span class="flag-kind flag-kind-${escapeHtml(fs.kind)}">${escapeHtml(fs.kind)}</span>
            <span class="flag-key">${escapeHtml(fs.key)}</span>
            ${changedBadge}
            <span class="flag-value${boolFalseClass}">${valStr}</span>
          </div>`;
        }).join('');
      }
    }

    const thumbHtml = step.type === 'screenshot' && step.dataUrl
      ? `<img class="step-screenshot-thumb" src="${step.dataUrl}" data-index="${index}" title="Click to view full size" />`
      : '';

    const hasApis = relatedNet.length > 0;
    // Stack buttons right-to-left: × (5px), # (26px), ↓ (47px)
    // Padding grows to fit however many buttons are showing
    let paddingRight = 28;
    if (hasAlts) paddingRight = Math.max(paddingRight, 46);
    if (hasApis) paddingRight = Math.max(paddingRight, hasAlts ? 68 : 46);
    const exportBtnRight = hasAlts ? 47 : 26;

    return `
      <div class="step-item" data-index="${index}" style="padding-right:${paddingRight}px;">
        <div class="step-number${badgeClass ? ' ' + badgeClass : ''}">${index + 1}</div>
        <div class="step-content">
          <span class="step-badge${badgeClass ? ' ' + badgeClass : ''}">${typeLabel}</span>
          <span class="step-text-editable step-details" data-index="${index}" title="Click to edit">${stepText}</span>
          <span class="step-timestamp">+${timeStr}</span>
          ${thumbHtml}
        </div>
        ${hasAlts ? `<button class="step-selector-btn" data-index="${index}" title="Switch selector&#10;current: ${escapeHtml(currentSel)}">#</button>` : ''}
        ${hasApis ? `<button class="step-export-apis-btn" data-index="${index}" title="Export API calls" style="right:${exportBtnRight}px;">↓</button>` : ''}
        <button class="step-delete" data-index="${index}" title="Delete step">×</button>
      </div>
      ${netRowsHtml}
      ${flagRowsHtml}
    `;
  }).join('');

  if (scrollToBottom) stepsContainer.scrollTop = stepsContainer.scrollHeight;

  // Update raw steps textarea
  updateRawStepsTextarea();
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

function prettyJson(text) {
  if (!text) return '';
  try { return JSON.stringify(JSON.parse(text), null, 2); }
  catch { return text; }
}

let _currentNetworkStep = null;

function showNetworkDetail(step) {
  _currentNetworkStep = step;
  const modal = document.getElementById('networkDetailModal');

  // Reset AI output
  document.getElementById('aiMockOutput').style.display = 'none';
  document.getElementById('aiMockOutputPre').textContent = '';
  document.getElementById('btnGenerateMock').textContent = 'Generate';
  document.getElementById('btnGenerateMock').disabled = false;

  // Reset highlight button
  const hlBtn = document.getElementById('btnHighlightOnPage');
  hlBtn.textContent = '🔍 Highlight';
  hlBtn.classList.remove('active');

  const detailMethod = document.getElementById('detailMethod');
  detailMethod.textContent = step.method || 'GET';
  detailMethod.style.cssText = methodStyle(step.method || 'GET');

  const isErr = !step.status || step.status >= 400;
  const detailStatus = document.getElementById('detailStatus');
  detailStatus.textContent = `${step.status || '?'}${step.statusText ? ' ' + step.statusText : ''}`;
  detailStatus.className = `network-status${isErr ? ' error' : ''}`;

  document.getElementById('detailDuration').textContent = step.duration ? `${step.duration}ms` : '';
  document.getElementById('detailUrl').textContent = step.url || '';

  const headersSection = document.getElementById('detailRequestHeaders');
  const headersContent = document.getElementById('detailRequestHeadersContent');
  const headersArrow = document.getElementById('headersToggleArrow');
  const headers = step.requestHeaders || [];
  if (headers.length > 0) {
    headersSection.style.display = '';
    headersContent.style.display = 'none';
    headersArrow.classList.remove('open');
    headersContent.innerHTML = `<table class="headers-table"><tbody>${
      headers.map(h => `<tr><td>${escapeHtml(h.name)}</td><td>${escapeHtml(h.value)}</td></tr>`).join('')
    }</tbody></table>`;
  } else {
    headersSection.style.display = 'none';
  }

  const reqSection = document.getElementById('detailRequestBody');
  if (step.requestBody) {
    reqSection.style.display = '';
    document.getElementById('detailRequestBodyContent').textContent = prettyJson(step.requestBody);
  } else {
    reqSection.style.display = 'none';
  }

  // Reset beautify state
  _responseRaw = '';
  _responseIsFormatted = false;
  const beautyBtn = document.getElementById('btnBeautifyResponse');
  beautyBtn.textContent = 'Beautify';
  beautyBtn.classList.remove('active');

  const resSection = document.getElementById('detailResponseBody');
  if (step.responseBody === '[binary]') {
    resSection.style.display = '';
    _responseRaw = '[binary data]';
    document.getElementById('detailResponseBodyContent').textContent = _responseRaw;
  } else if (step.responseBody && step.responseBody.length > 0) {
    resSection.style.display = '';
    _responseRaw = step.responseBody;
    // Try to auto-format; fall back to raw
    const formatted = prettyJson(_responseRaw);
    if (formatted !== _responseRaw) {
      document.getElementById('detailResponseBodyContent').textContent = formatted;
      beautyBtn.textContent = 'Raw';
      beautyBtn.classList.add('active');
      _responseIsFormatted = true;
    } else {
      document.getElementById('detailResponseBodyContent').textContent = _responseRaw;
    }
  } else {
    resSection.style.display = 'none';
  }

  modal.classList.add('show');
}

function hideNetworkDetail() {
  document.getElementById('networkDetailModal').classList.remove('show');
  sendClearHighlights();
}

function sendClearHighlights() {
  let tabId = null;
  try { tabId = chrome.devtools?.inspectedWindow?.tabId; } catch(e) {}
  if (tabId) safePost({ type: 'broadcastToContent', tabId, message: { type: 'clearHighlights' } });
}

// ============ Selector Picker ============

let _pickerStepIndex = null;
const selectorPicker = document.getElementById('selectorPicker');

function showSelectorPicker(stepIndex, btnEl) {
  const step = steps[stepIndex];
  if (!step?.selectorAlternatives?.length) return;

  _pickerStepIndex = stepIndex;

  const isUsingText = !!step.text && !step.customText;
  const savedText = step._originalText;

  const altRows = step.selectorAlternatives.map((alt, i) =>
    `<div class="selector-option${!isUsingText && alt.selector === step.selector ? ' active' : ''}" data-picker-idx="${i}">
      <span class="selector-option-label">${escapeHtml(alt.label)}</span>
      <span class="selector-option-value">${escapeHtml(alt.selector)}</span>
    </div>`
  ).join('');

  // Offer "text content" as an option if there's saved or current text to restore/keep
  const textValue = isUsingText ? step.text : savedText;
  const textRow = textValue
    ? `<div class="selector-option${isUsingText ? ' active' : ''}" data-picker-text="1">
        <span class="selector-option-label">text content</span>
        <span class="selector-option-value">${escapeHtml(textValue)}</span>
      </div>`
    : '';

  selectorPicker.innerHTML =
    `<div class="selector-picker-title">Choose Selector</div>` +
    textRow + altRows;

  const rect = btnEl.getBoundingClientRect();
  const left = Math.min(rect.left, window.innerWidth - 470);
  selectorPicker.style.left = left + 'px';
  selectorPicker.style.top = (rect.bottom + 4) + 'px';
  selectorPicker.classList.add('show');
}

function hideSelectorPicker() {
  selectorPicker.classList.remove('show');
  _pickerStepIndex = null;
}

selectorPicker.addEventListener('click', (e) => {
  e.stopPropagation();
  const option = e.target.closest('.selector-option');
  if (!option || _pickerStepIndex === null) return;
  const step = steps[_pickerStepIndex];
  if (!step) { hideSelectorPicker(); return; }

  if (option.dataset.pickerText) {
    // Restore text content as element name
    const textToRestore = step._originalText || step.text;
    if (textToRestore) {
      step.text = textToRestore;
      delete step._originalText;
      renderSteps();
    }
    hideSelectorPicker();
    return;
  }

  const idx = parseInt(option.dataset.pickerIdx, 10);
  if (step.selectorAlternatives?.[idx]) {
    const chosen = step.selectorAlternatives[idx];
    const changed = chosen.selector !== step.selector;
    step.selector = chosen.selector;
    // When switching away from text-based display, save the text and clear it
    // so the chosen selector becomes the visible element name in the step row.
    if (changed && step.text && !step.customText) {
      step._originalText = step.text;
      step.text = '';
    }
    renderSteps();
  }
  hideSelectorPicker();
});

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
  safePost(message);

  // Also send recording settings
  safePost({
    type: 'broadcastToContent',
    tabId: tabId,
    message: {
      type: 'setRecordingSettings',
      recordFocus: recordFocusEvents.checked,
      captureConsole: captureConsoleErrors.checked,
      captureNetwork: captureNetworkErrors.checked,
      captureAllLogs: captureAllLogs.checked,
      captureFeatureFlags: captureFeatureFlags.checked,
      trackNavigation: trackNavigation.checked,
      filterByDomain: filterByDomain.checked,
      domainFilter: domainFilter.value.trim()
    }
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
  
  safePost({ 
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
  
  safePost({ 
    type: 'broadcastToContent',
    tabId: tabId,
    message: { type: 'stopRecording' }
  });
});

btnClear.addEventListener('click', () => {
  if (confirm('Clear all recorded steps?')) {
    steps = [];
    networkSteps = [];
    flagSteps = [];
    flagDedup.clear();
    flagCurrent.clear();
    recordingStartTime = null;
    networkSearchQuery = '';
    networkSearchInput.value = '';
    expandedApiSteps.clear();
    expandedFlagSteps.clear();
    rawStepsTextarea.value = '';
    llmStepsTextarea.value = '';
    renderMethodFilters();
    renderSteps();
  }
});

function buildExportData() {
  return {
    timestamp: new Date().toISOString(),
    steps: steps,
    networkRequests: networkSteps,
    featureFlags: flagSteps,
    totalSteps: steps.length,
    totalNetworkRequests: networkSteps.length,
    totalFeatureFlags: flagSteps.length
  };
}

btnExport.addEventListener('click', () => {
  if (steps.length === 0 && networkSteps.length === 0 && flagSteps.length === 0) {
    alert('No steps to export');
    return;
  }

  const blob = new Blob([JSON.stringify(buildExportData(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `step-recording-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// ---- Send to Journey Map endpoint ----
const endpointInput = document.getElementById('endpointInput');
const endpointStatus = document.getElementById('endpointStatus');
const btnSaveEndpoint = document.getElementById('btnSaveEndpoint');
const btnSend = document.getElementById('btnSend');
const sendStatus = document.getElementById('sendStatus');

// Journey Map send is optional — only surface the button once an endpoint is configured.
function updateSendVisibility() {
  const hasEndpoint = !!endpointInput.value.trim();
  btnSend.style.display = hasEndpoint ? '' : 'none';
  sendStatus.style.display = hasEndpoint ? '' : 'none';
}

async function loadEndpoint() {
  try {
    const { journeyMapEndpoint } = await chrome.storage.local.get(['journeyMapEndpoint']);
    if (journeyMapEndpoint) {
      endpointInput.value = journeyMapEndpoint;
      endpointStatus.textContent = '✓ Saved';
      endpointStatus.className = 'api-key-status';
    } else {
      endpointStatus.textContent = 'Not set';
      endpointStatus.className = 'api-key-status missing';
    }
  } catch (e) {
    console.error('Error loading endpoint:', e);
  }
  updateSendVisibility();
}

async function saveEndpoint() {
  const endpoint = endpointInput.value.trim();
  if (!endpoint) { alert('Please enter an endpoint URL'); return; }
  await chrome.storage.local.set({ journeyMapEndpoint: endpoint });
  endpointStatus.textContent = '✓ Saved';
  endpointStatus.className = 'api-key-status';
  updateSendVisibility();
}

btnSaveEndpoint.addEventListener('click', saveEndpoint);
loadEndpoint();

// Collapsible Settings section (collapsed by default; expand to configure optional keys)
const settingsSection = document.getElementById('settingsSection');
const settingsToggle = document.getElementById('settingsToggle');
if (settingsToggle) {
  settingsToggle.addEventListener('click', () => {
    settingsSection.classList.toggle('collapsed');
  });
}

btnSend.addEventListener('click', async () => {
  if (steps.length === 0 && networkSteps.length === 0) {
    alert('No steps to send');
    return;
  }
  const endpoint = endpointInput.value.trim();
  if (!endpoint) {
    alert('Set a Journey Map endpoint first (e.g. http://localhost:3001/api/sessions/ingest)');
    return;
  }

  btnSend.disabled = true;
  sendStatus.style.color = '#888';
  sendStatus.textContent = 'Sending…';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recording: buildExportData() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    sendStatus.style.color = '#16a34a';
    sendStatus.textContent = `✓ Sent — "${data.title || 'journey'}" (${data.stations ?? 0} stations)`;
  } catch (e) {
    sendStatus.style.color = '#dc2626';
    sendStatus.textContent = `✕ ${e.message}`;
  } finally {
    btnSend.disabled = false;
  }
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

// LLM Generation using OpenAI API
async function generateWithLLM() {
  if (steps.length === 0 && networkSteps.length === 0) {
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

  const mode = llmModeSelect.value;

  // Disable button and show loading
  btnGenerate.disabled = true;
  btnGenerate.textContent = 'Generating...';
  llmStepsTextarea.value = 'Generating...';

  try {
    // Format UI steps for the prompt
    const uiDescription = steps.map((step, index) => {
      const elementName = step.text?.trim() || step.selector || 'element';
      const tag = step.tagName || '';

      let elementType = '';
      if (tag === 'button') elementType = 'button';
      else if (tag === 'a') elementType = 'link';
      else if (tag === 'input') elementType = step.inputType === 'checkbox' ? 'checkbox' : 'field';
      else if (tag === 'select') elementType = 'dropdown';
      else if (tag === 'textarea') elementType = 'text area';

      let desc = `${index + 1}. ${step.type.toUpperCase()}`;

      if (step.type === 'error') {
        const errorLabel = step.errorType === 'network' ? 'NETWORK ERROR' :
                          step.errorType === 'console' ? 'CONSOLE ERROR' : 'NOTE';
        desc = `${index + 1}. **${errorLabel}**: ${step.message || 'Unknown error'}`;
        if (step.url) desc += ` (URL: ${step.url})`;
      } else if (step.type === 'navigate') {
        desc += `: Navigate to URL ${step.url || 'previous page'}`;
      } else if (step.type === 'pageload') {
        desc += `: Page loaded at URL ${step.url || step.text || 'new page'}`;
      } else if (step.type === 'assert') {
        const assertDesc = { exists: 'exists', visible: 'is visible', textContains: 'text exists' };
        desc += `: "${elementName}" ${elementType} ${assertDesc[step.assertType] || 'exists'}`;
      } else {
        desc += `: "${elementName}"`;
        if (elementType) desc += ` (${elementType})`;
      }

      if (step.value) desc += ` value="${step.value.substring(0, 50)}"`;
      if (step.key) desc += ` key=${step.key}`;
      return desc;
    }).join('\n');

    // Format network requests
    const networkDescription = networkSteps.map((step, index) => {
      const urlPath = step.url ? step.url.replace(/^https?:\/\/[^/]+/, '') || step.url : '/unknown';
      let desc = `${index + 1}. ${step.method || 'GET'} ${urlPath} → ${step.status || '?'} ${step.statusText || ''}`;
      if (step.duration) desc += ` (${step.duration}ms)`;
      if (step.requestBody) desc += `\n   Request: ${step.requestBody.substring(0, 200)}`;
      if (step.responseBody) desc += `\n   Response: ${step.responseBody.substring(0, 300)}`;
      return desc;
    }).join('\n');

    let stepsDescription = uiDescription;
    if (networkDescription) {
      stepsDescription += '\n\n**API Requests:**\n' + networkDescription;
    }

    const hasErrors = steps.some(step => step.type === 'error');

    // Get prompt and system message based on mode
    const { systemMessage, prompt } = getLLMPrompt(mode, stepsDescription, hasErrors);

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
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
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
    llmStepsTextarea.value = data.choices[0].message.content;
    testCasesSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (error) {
    console.error('Error generating:', error);
    llmStepsTextarea.value = `Error: ${error.message}`;
  } finally {
    btnGenerate.disabled = false;
    btnGenerate.textContent = 'Generate';
  }
}

function getLLMPrompt(mode, stepsDescription, hasErrors) {
  switch (mode) {
    case 'steps':
      return {
        systemMessage: 'You convert recorded steps into concise reproduction steps. One step per line, no bullets or numbers. Only include what is in the input - never invent steps or errors.\n\nExample:\nClick "Add Todo" button\nEnter "Test item" in input field\nClick "Submit" button',
        prompt: `Convert these recorded steps into brief "Steps to Reproduce":

${stepsDescription}

Rules:
- One step per line, no bullets, no numbers, no prefixes
- Use element text in quotes, include element type (button, link, field)
- Be concise: "Click 'Submit' button" not "Click Submit"
- Combine focus + click into just click
- No intro or outro
- ONLY include steps from the list above - do NOT add or invent anything${hasErrors ? '\n- Include ALL errors from the list, format as: "Observe: [error message]"' : ''}`
      };

    case 'testcases':
      return {
        systemMessage: 'You generate multiple test cases from recorded user interactions. Create happy path, negative, and edge case scenarios.',
        prompt: `Based on these recorded steps, generate multiple test cases:

${stepsDescription}

Generate the following test cases:

**1. Happy Path**
The successful flow as recorded

**2. Negative Test Cases**
What happens with invalid inputs, empty fields, wrong data types

**3. Edge Cases**
Boundary conditions, special characters, very long inputs, etc.

**4. Error Handling**
How the system should handle failures gracefully

Format each test case as:
**[Test Case Name]**
Preconditions: [if any]
Steps:
1. [step]
2. [step]
Expected Result: [outcome]

Be practical and specific to the functionality being tested.${hasErrors ? '\n\nNote: Errors were observed during recording - include test cases that verify proper error handling.' : ''}`
      };

    case 'bugreport':
      return {
        systemMessage: 'You create concise bug reports from recorded steps. Include title, steps, expected vs actual behavior.',
        prompt: `Create a bug report from these recorded steps:

${stepsDescription}

Format:
**Title:** [Brief descriptive title]

**Steps to Reproduce:**
[Numbered steps]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened - use any errors from the steps]

Rules:
- Be concise
- Title should summarize the bug
- Include all errors as the actual result${!hasErrors ? '\n- If no errors recorded, leave Actual Result as "TBD" or describe unexpected behavior if apparent' : ''}`
      };

    case 'exploratory':
      return {
        systemMessage: 'You are a senior QA engineer providing exploratory testing guidance based on observed user flows.',
        prompt: `Based on these recorded steps, provide exploratory testing considerations:

${stepsDescription}

Provide:

**1. Areas to Explore**
What related functionality should be tested beyond the recorded flow?

**2. Questions to Answer**
What behaviors are unclear and need investigation?

**3. Test Charters**
3-5 focused exploratory testing sessions (timeboxed missions)
Format: "Explore [target] with [resources] to discover [information]"

**4. Boundary Conditions**
What limits and edge cases should be probed?

**5. Integration Points**
What other systems/features might be affected?

**6. User Personas**
How might different types of users interact differently?

Be specific to the functionality observed in the steps.${hasErrors ? '\n\nNote: Errors were observed - include investigation of error conditions and recovery scenarios.' : ''}`
      };

    case 'riskbased':
      return {
        systemMessage: 'You are a QA architect performing risk-based testing analysis.',
        prompt: `Based on these recorded steps, provide a risk-based testing analysis:

${stepsDescription}

Provide:

**1. Risk Assessment**
| Risk Area | Likelihood | Impact | Priority |
|-----------|------------|--------|----------|
[Identify 5-8 risks based on the functionality]

**2. High-Priority Test Scenarios**
Tests that must pass before release (based on highest risks)

**3. Data Risks**
What could go wrong with data integrity, validation, or storage?

**4. Security Considerations**
Potential security vulnerabilities to test (injection, auth bypass, etc.)

**5. Performance Concerns**
What might cause slowness or failures under load?

**6. Regression Risks**
What existing functionality might break?

**7. Recommended Test Coverage**
Prioritized list of what to test given limited time

Be specific and actionable.${hasErrors ? '\n\nNote: Errors were already observed during recording - factor these into the risk assessment.' : ''}`
      };

    case 'playwright': {
      const hasNetworkSteps = steps.some(s => s.type === 'network');
      return {
        systemMessage: 'You convert recorded steps into Playwright test code. Use modern Playwright syntax with async/await.',
        prompt: `Convert these recorded steps into a Playwright test:

${stepsDescription}

Rules:
- Use modern Playwright syntax (async/await)
- For "Page loaded"/"Navigate" steps, call page.goto() with the EXACT URL shown — never invent or use placeholder URLs
- Use appropriate locators (getByRole, getByText, locator)
- Include assertions for any errors or verification steps
- Wrap in test() function
- Be practical - use realistic selectors
- No explanatory comments, just clean code${hasNetworkSteps ? `
- For each **API** step, add a page.route() mock BEFORE the test actions using the recorded URL, method, status, and response body
- Use route.fulfill() with the actual recorded response data
- Group all page.route() calls at the top of the test` : ''}`
      };
    }

    default:
      return getLLMPrompt('steps', stepsDescription, hasErrors);
  }
}

btnGenerate.addEventListener('click', generateWithLLM);

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

  safePost({
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

  safePost({
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

// ============ Screenshot Mode ============

function showScreenshotModal() {
  screenshotModal.classList.add('show');
}

function hideScreenshotModal() {
  screenshotModal.classList.remove('show');
}

function getInspectedTabId() {
  try {
    return chrome.devtools?.inspectedWindow?.tabId || null;
  } catch (e) { return null; }
}

function triggerScreenshotCapture(region) {
  safePost({
    type: 'captureScreenshot',
    tabId: getInspectedTabId(),
    region: region || null
  });
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Run an expression in the inspected page and resolve with its value.
function evalInPage(expression) {
  return new Promise((resolve, reject) => {
    try {
      chrome.devtools.inspectedWindow.eval(expression, (result, exc) => {
        if (exc) reject(new Error(exc.value || exc.description || 'eval failed'));
        else resolve(result);
      });
    } catch (e) {
      reject(e);
    }
  });
}

// Grab one viewport via the background, returning a Promise of the dataUrl.
function captureVisibleOnce() {
  return new Promise((resolve) => {
    rawCaptureResolve = resolve;
    safePost({ type: 'captureScreenshotRaw', tabId: getInspectedTabId() });
    setTimeout(() => {
      if (rawCaptureResolve) { rawCaptureResolve = null; resolve(null); }
    }, 6000);
  });
}

// Neutralize fixed/sticky elements during capture so they don't repeat in every
// stitched segment (fixed → absolute, sticky → static); originals restored after.
const NEUTRALIZE_FIXED = `(function(){
  window.__srFixedPatch = [];
  var els = document.querySelectorAll('body *');
  for (var i = 0; i < els.length; i++) {
    var pos = getComputedStyle(els[i]).position;
    if (pos === 'fixed' || pos === 'sticky') {
      window.__srFixedPatch.push([els[i], els[i].style.position, els[i].style.getPropertyPriority('position')]);
      els[i].style.setProperty('position', pos === 'fixed' ? 'absolute' : 'static', 'important');
    }
  }
  // Hide the scrollbar so it isn't baked into the stitched image.
  var s = document.createElement('style');
  s.id = '__srHideScroll';
  s.textContent = '::-webkit-scrollbar{width:0 !important;height:0 !important;display:none !important}html{scrollbar-width:none !important}';
  (document.head || document.documentElement).appendChild(s);
  return window.__srFixedPatch.length;
})()`;

const RESTORE_FIXED = `(function(){
  (window.__srFixedPatch || []).forEach(function(p){
    if (p[1]) p[0].style.setProperty('position', p[1], p[2]); else p[0].style.removeProperty('position');
  });
  window.__srFixedPatch = null;
  var s = document.getElementById('__srHideScroll');
  if (s) s.remove();
})()`;

// Full-page screenshot via scroll-and-stitch (captureVisibleTab only sees the viewport).
async function captureFullPage() {
  const shots = [];
  let d;
  try {
    await evalInPage(NEUTRALIZE_FIXED);

    d = await evalInPage(`(function(){
      var de = document.documentElement, b = document.body;
      return {
        sh: Math.max(de.scrollHeight, b ? b.scrollHeight : 0, de.clientHeight),
        ih: window.innerHeight, iw: window.innerWidth,
        dpr: window.devicePixelRatio || 1, sx: window.scrollX, sy: window.scrollY
      };
    })()`);

    const segments = Math.max(1, Math.ceil(d.sh / d.ih));
    for (let i = 0; i < segments; i++) {
      const y = await evalInPage(`(function(){ window.scrollTo(0, ${i * d.ih}); return window.scrollY; })()`);
      await delay(350); // let the page repaint + respect captureVisibleTab rate limits
      const dataUrl = await captureVisibleOnce();
      if (dataUrl) shots.push({ dataUrl, y });
    }
  } finally {
    // Always restore scroll + fixed/sticky positioning, even if capture failed.
    if (d) await evalInPage(`window.scrollTo(${d.sx}, ${d.sy})`);
    await evalInPage(RESTORE_FIXED);
  }

  if (!d || shots.length === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(d.iw * d.dpr);
  canvas.height = Math.round(d.sh * d.dpr);
  const ctx = canvas.getContext('2d');
  for (const { dataUrl, y } of shots) {
    const img = await loadImage(dataUrl);
    ctx.drawImage(img, 0, Math.round(y * d.dpr));
  }
  return canvas.toDataURL('image/png');
}

async function runFullPageCapture() {
  if (isCapturingFullPage) return;
  isCapturingFullPage = true;
  btnScreenshot.disabled = true;
  try {
    let dataUrl;
    try {
      dataUrl = await captureFullPage();
    } catch (e) {
      console.log('Full-page capture failed, falling back to viewport:', e && e.message);
      dataUrl = null;
    }
    if (dataUrl) {
      steps.push({ type: 'screenshot', screenshotType: 'full', timestamp: Date.now(), dataUrl, region: null });
      renderSteps(true);
    } else {
      // Fallback: single visible-viewport capture through the normal path.
      triggerScreenshotCapture(null);
    }
  } finally {
    isCapturingFullPage = false;
    btnScreenshot.disabled = false;
  }
}

async function cropScreenshot(dataUrl, region) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const dpr = region.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(region.width * dpr);
      canvas.height = Math.round(region.height * dpr);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        Math.round(region.x * dpr), Math.round(region.y * dpr),
        Math.round(region.width * dpr), Math.round(region.height * dpr),
        0, 0,
        canvas.width, canvas.height
      );
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

async function handleScreenshotCaptured(dataUrl, region) {
  let finalDataUrl = dataUrl;
  let screenshotType = 'full';

  if (region) {
    screenshotType = 'partial';
    finalDataUrl = await cropScreenshot(dataUrl, region);
  }

  const screenshotStep = {
    type: 'screenshot',
    screenshotType,
    timestamp: Date.now(),
    dataUrl: finalDataUrl,
    region: region || null
  };

  steps.push(screenshotStep);
  renderSteps(true);
}

function enterScreenshotSelectionMode() {
  isScreenshotMode = true;
  hideScreenshotModal();
  screenshotBanner.classList.add('show');
  btnScreenshot.classList.add('active');

  safePost({
    type: 'broadcastToContent',
    tabId: getInspectedTabId(),
    message: { type: 'enterScreenshotMode' }
  });
}

function exitScreenshotSelectionMode() {
  isScreenshotMode = false;
  screenshotBanner.classList.remove('show');
  btnScreenshot.classList.remove('active');

  safePost({
    type: 'broadcastToContent',
    tabId: getInspectedTabId(),
    message: { type: 'exitScreenshotMode' }
  });
}

btnScreenshot.addEventListener('click', showScreenshotModal);

document.getElementById('screenshotFullPage').addEventListener('click', () => {
  hideScreenshotModal();
  runFullPageCapture();
});

document.getElementById('screenshotPartial').addEventListener('click', () => {
  enterScreenshotSelectionMode();
});

document.getElementById('btnCancelScreenshot').addEventListener('click', hideScreenshotModal);

screenshotModal.addEventListener('click', (e) => {
  if (e.target === screenshotModal) hideScreenshotModal();
});

// Click thumbnail to open full size
stepsContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('step-screenshot-thumb')) {
    const win = window.open();
    win.document.write(`<img src="${e.target.src}" style="max-width:100%;">`);
  }
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

// Escape key to cancel assertion mode or close modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isAssertionMode) {
      exitAssertionMode();
    } else if (isScreenshotMode) {
      exitScreenshotSelectionMode();
    } else if (assertModal.classList.contains('show')) {
      hideAssertModal();
    } else if (screenshotModal.classList.contains('show')) {
      hideScreenshotModal();
    } else if (document.getElementById('networkDetailModal').classList.contains('show')) {
      hideNetworkDetail();
    } else if (selectorPicker.classList.contains('show')) {
      hideSelectorPicker();
    }
    hideContextMenu();
  }
});

// ============ Context Menu ============

let contextMenuStepIndex = null;

function getRelatedNetworkCalls(stepIndex) {
  const step = steps[stepIndex];
  if (!step) return [];
  const thisTs = step.timestamp;
  const nextTs = steps[stepIndex + 1]?.timestamp ?? Infinity;
  return networkSteps.filter(ns => ns.timestamp >= thisTs && ns.timestamp < nextTs);
}

function showContextMenu(x, y, stepIndex) {
  contextMenuStepIndex = stepIndex;
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
  contextMenu.classList.add('show');
  const hasApis = getRelatedNetworkCalls(stepIndex).length > 0;
  document.getElementById('ctxExportApis').style.display = hasApis ? '' : 'none';
}

function exportApiCallsForStep(stepIndex) {
  const calls = getRelatedNetworkCalls(stepIndex);
  calls.forEach((ns, i) => {
    const urlPath = ns.url ? ns.url.replace(/^https?:\/\/[^/]+/, '') : 'unknown';
    const safeName = `${ns.method || 'GET'}${urlPath}`.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const data = {
      method: ns.method,
      url: ns.url,
      status: ns.status,
      statusText: ns.statusText,
      duration: ns.duration,
      timestamp: ns.timestamp,
      requestHeaders: ns.requestHeaders,
      requestBody: ns.requestBody,
      responseHeaders: ns.responseHeaders,
      responseBody: ns.responseBody
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.json`;
    setTimeout(() => { a.click(); URL.revokeObjectURL(url); }, i * 200);
  });
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
  if (action === 'export-apis') {
    if (contextMenuStepIndex !== null) exportApiCallsForStep(contextMenuStepIndex);
    hideContextMenu();
  } else if (action === 'assert-after') {
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

// Network detail modal close
document.getElementById('btnCloseNetworkDetail').addEventListener('click', hideNetworkDetail);
document.getElementById('btnCloseNetworkDetail2').addEventListener('click', hideNetworkDetail);
document.getElementById('networkDetailModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('networkDetailModal')) hideNetworkDetail();
});

// ============ Highlight on Page ============

document.getElementById('btnHighlightOnPage').addEventListener('click', () => {
  const step = _currentNetworkStep;
  const btn = document.getElementById('btnHighlightOnPage');

  // Toggle off if already highlighted
  if (btn.classList.contains('active')) {
    sendClearHighlights();
    btn.textContent = '🔍 Highlight';
    btn.classList.remove('active');
    return;
  }

  if (!step?.responseBody || step.responseBody === '[binary]') {
    btn.textContent = '🔍 No data';
    setTimeout(() => { btn.textContent = '🔍 Highlight'; }, 1500);
    return;
  }

  let tabId = null;
  try { tabId = chrome.devtools?.inspectedWindow?.tabId; } catch(e) {}
  if (!tabId) return;

  btn.textContent = '🔍 …';
  btn.disabled = true;

  safePost({
    type: 'broadcastToContent',
    tabId,
    message: { type: 'highlightResponseData', responseBody: step.responseBody }
  });

  // Read back the match count from the page after content script runs
  setTimeout(() => {
    chrome.devtools.inspectedWindow.eval(
      'document.querySelectorAll(".__sr-highlight").length',
      (count, err) => {
        btn.disabled = false;
        if (err || count === 0) {
          btn.textContent = '🔍 No matches';
          btn.classList.remove('active');
          setTimeout(() => { btn.textContent = '🔍 Highlight'; }, 1800);
        } else {
          btn.textContent = `🔍 ${count} found`;
          btn.classList.add('active');
        }
      }
    );
  }, 350);
});

// ============ AI Mock Generation ============

const AI_MOCK_PROMPTS = {
  'playwright-mock': (step, urlPath) => `Generate a single Playwright page.route() mock for this request. Return ONLY the code — no markdown fences, no explanation.

Method: ${step.method}
URL: ${step.url}
Status: ${step.status}${step.statusText ? ' ' + step.statusText : ''}
${step.requestBody ? `Request Body:\n${step.requestBody.substring(0, 600)}\n` : ''}${step.responseBody && step.responseBody !== '[binary]' ? `Response Body:\n${step.responseBody.substring(0, 3000)}` : ''}

Use route.fulfill() with the actual status and response data. Match on the URL path pattern "${urlPath}".`,

  'playwright-abort': (step, urlPath) => `Generate a Playwright page.route() that aborts this request. Return ONLY the code — no markdown fences, no explanation.

Method: ${step.method}
URL: ${step.url}

Use route.abort() and match on the URL path pattern "${urlPath}".`,

  'msw': (step, urlPath) => `Generate an MSW (Mock Service Worker) v2 handler for this request. Return ONLY the code — no markdown fences, no explanation.

Method: ${step.method}
URL: ${step.url}
Status: ${step.status}${step.statusText ? ' ' + step.statusText : ''}
${step.requestBody ? `Request Body:\n${step.requestBody.substring(0, 600)}\n` : ''}${step.responseBody && step.responseBody !== '[binary]' ? `Response Body:\n${step.responseBody.substring(0, 3000)}` : ''}

Use http.${step.method.toLowerCase()}() with HttpResponse and the actual response data.`,

  'cy-intercept': (step, urlPath) => `Generate a Cypress cy.intercept() stub for this request. Return ONLY the code — no markdown fences, no explanation.

Method: ${step.method}
URL: ${step.url}
Status: ${step.status}${step.statusText ? ' ' + step.statusText : ''}
${step.requestBody ? `Request Body:\n${step.requestBody.substring(0, 600)}\n` : ''}${step.responseBody && step.responseBody !== '[binary]' ? `Response Body:\n${step.responseBody.substring(0, 3000)}` : ''}

Use cy.intercept() with { statusCode, body } and the actual response data. Match on method "${step.method}" and URL path pattern "${urlPath}".`
};

document.getElementById('btnGenerateMock').addEventListener('click', async () => {
  const step = _currentNetworkStep;
  if (!step) return;

  const result = await chrome.storage.local.get(['openaiApiKey']);
  const apiKey = result.openaiApiKey;
  if (!apiKey) {
    alert('Please set your OpenAI API key in Settings first.');
    return;
  }

  const mode = document.getElementById('aiMockMode').value;
  const urlPath = step.url ? step.url.replace(/^https?:\/\/[^/]+/, '') || step.url : '/unknown';
  const promptFn = AI_MOCK_PROMPTS[mode];
  if (!promptFn) return;

  const btn = document.getElementById('btnGenerateMock');
  const outputEl = document.getElementById('aiMockOutput');
  const outputPre = document.getElementById('aiMockOutputPre');

  btn.textContent = '…';
  btn.disabled = true;
  outputPre.textContent = '';
  outputEl.style.display = 'none';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a test automation expert. Output only raw code with no markdown code fences, no language tags, and no explanation.' },
          { role: 'user', content: promptFn(step, urlPath) }
        ],
        temperature: 0.1,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API ${response.status}`);
    }

    const data = await response.json();
    let code = data.choices[0].message.content
      .replace(/^```(?:javascript|typescript|js|ts|python)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    outputPre.textContent = code;
    outputEl.style.display = '';
  } catch (err) {
    outputPre.textContent = `Error: ${err.message}`;
    outputEl.style.display = '';
  } finally {
    btn.textContent = 'Generate';
    btn.disabled = false;
  }
});

document.getElementById('btnCopyMock').addEventListener('click', () => {
  const text = document.getElementById('aiMockOutputPre').textContent;
  if (!text) return;
  const btn = document.getElementById('btnCopyMock');
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
  });
});

// Request headers collapse toggle
document.getElementById('headersToggle').addEventListener('click', () => {
  const content = document.getElementById('detailRequestHeadersContent');
  const arrow = document.getElementById('headersToggleArrow');
  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : '';
  arrow.classList.toggle('open', !isOpen);
});

// Beautify / Raw toggle for response body
let _responseRaw = '';
let _responseIsFormatted = false;

document.getElementById('btnBeautifyResponse').addEventListener('click', () => {
  const btn = document.getElementById('btnBeautifyResponse');
  const pre = document.getElementById('detailResponseBodyContent');
  if (!_responseIsFormatted) {
    const formatted = prettyJson(_responseRaw);
    if (formatted !== _responseRaw) {
      pre.textContent = formatted;
      btn.textContent = 'Raw';
      btn.classList.add('active');
      _responseIsFormatted = true;
    } else {
      btn.textContent = 'Not JSON';
      setTimeout(() => { btn.textContent = 'Beautify'; }, 1500);
    }
  } else {
    pre.textContent = _responseRaw;
    btn.textContent = 'Beautify';
    btn.classList.remove('active');
    _responseIsFormatted = false;
  }
});

// Copy response body to clipboard
document.getElementById('btnCopyResponse').addEventListener('click', () => {
  const btn = document.getElementById('btnCopyResponse');
  const text = document.getElementById('detailResponseBodyContent').textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
  });
});

// Hide context menu and selector picker on click elsewhere
document.addEventListener('click', (e) => {
  hideContextMenu();
  if (!e.target.closest('#selectorPicker') && !e.target.classList.contains('step-selector-btn')) {
    hideSelectorPicker();
  }
});

// Delete / selector-picker button clicks on steps
stepsContainer.addEventListener('click', (e) => {
  // Toggle collapsed API rows
  const apiToggle = e.target.closest('.step-api-toggle');
  if (apiToggle) {
    const idx = parseInt(apiToggle.dataset.stepIndex, 10);
    if (expandedApiSteps.has(idx)) expandedApiSteps.delete(idx);
    else expandedApiSteps.add(idx);
    renderSteps();
    return;
  }

  // Toggle collapsed feature-flag rows
  const flagToggle = e.target.closest('.step-flag-toggle');
  if (flagToggle) {
    const idx = parseInt(flagToggle.dataset.flagStepIndex, 10);
    if (expandedFlagSteps.has(idx)) expandedFlagSteps.delete(idx);
    else expandedFlagSteps.add(idx);
    renderSteps();
    return;
  }

  // Click on an inline API row → open network detail modal
  const apiRow = e.target.closest('.step-api-row');
  if (apiRow) {
    const ni = parseInt(apiRow.dataset.networkIndex, 10);
    if (!isNaN(ni) && ni >= 0 && ni < networkSteps.length) {
      showNetworkDetail(networkSteps[ni]);
    }
    return;
  }

  if (e.target.classList.contains('step-export-apis-btn')) {
    e.stopPropagation();
    const index = parseInt(e.target.dataset.index, 10);
    if (!isNaN(index)) exportApiCallsForStep(index);
    return;
  }

  if (e.target.classList.contains('step-selector-btn')) {
    e.stopPropagation();
    const index = parseInt(e.target.dataset.index, 10);
    showSelectorPicker(index, e.target);
    return;
  }

  if (e.target.classList.contains('step-delete')) {
    e.stopPropagation();
    const index = parseInt(e.target.dataset.index, 10);
    if (!isNaN(index) && index >= 0 && index < steps.length) {
      steps.splice(index, 1);
      renderSteps();
    }
  }

  // Inline edit on step text click
  if (e.target.classList.contains('step-text-editable')) {
    const index = parseInt(e.target.dataset.index, 10);
    if (isNaN(index) || index < 0 || index >= steps.length) return;

    const span = e.target;
    const currentText = generateStepText(steps[index]);

    // Replace span with input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'step-edit-input';
    input.value = currentText;
    span.replaceWith(input);
    input.focus();
    input.select();

    // Save on blur or Enter
    const saveEdit = () => {
      const newText = input.value.trim();
      if (newText && newText !== currentText) {
        steps[index].customText = newText;
      }
      renderSteps();
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        renderSteps(); // Cancel edit
      }
    });
  }
});

// ============ Copy Steps ============

function copyToClipboard(text, button) {
  if (!text) {
    alert('No steps to copy.');
    return;
  }

  const escapedText = text
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\r?\n/g, '\\n');

  chrome.devtools.inspectedWindow.eval(
    `(function() {
      const text = \`${escapedText}\`.replace(/\\\\n/g, '\\n');
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
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      button.textContent = 'Copied!';
      button.classList.add('copied');
      setTimeout(() => {
        button.textContent = 'Copy';
        button.classList.remove('copied');
      }, 2000);
    }
  );
}

btnCopyRaw.addEventListener('click', () => {
  copyToClipboard(rawStepsTextarea.value, btnCopyRaw);
});

btnCopyLLM.addEventListener('click', () => {
  copyToClipboard(llmStepsTextarea.value, btnCopyLLM);
});

// ============ Error Capture Toggles ============

// Load saved recording settings
async function loadRecordingSettings() {
  try {
    const result = await chrome.storage.local.get(['recordFocusEvents', 'captureConsoleErrors', 'captureNetworkErrors', 'captureAllLogs', 'captureNetworkRequests', 'captureFeatureFlags', 'trackNavigation', 'networkUrlFilter', 'filterByDomain', 'domainFilter']);
    recordFocusEvents.checked = result.recordFocusEvents || false;
    captureConsoleErrors.checked = result.captureConsoleErrors || false;
    captureNetworkErrors.checked = result.captureNetworkErrors || false;
    captureAllLogs.checked = result.captureAllLogs || false;
    captureNetworkRequests.checked = result.captureNetworkRequests || false;
    captureFeatureFlags.checked = result.captureFeatureFlags !== false;
    trackNavigation.checked = result.trackNavigation !== false;
    networkUrlFilterInput.value = result.networkUrlFilter || '';
    filterByDomain.checked = result.filterByDomain === true;
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
      captureFeatureFlags: captureFeatureFlags.checked,
      trackNavigation: trackNavigation.checked,
      captureNetworkRequests: captureNetworkRequests.checked,
      networkUrlFilter: networkUrlFilterInput.value.trim(),
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

  safePost({
    type: 'broadcastToContent',
    tabId: tabId,
    message: {
      type: 'setRecordingSettings',
      recordFocus: recordFocusEvents.checked,
      captureConsole: captureConsoleErrors.checked,
      captureNetwork: captureNetworkErrors.checked,
      captureAllLogs: captureAllLogs.checked,
      captureFeatureFlags: captureFeatureFlags.checked,
      trackNavigation: trackNavigation.checked,
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
captureNetworkRequests.addEventListener('change', handleRecordingSettingsChange);
captureFeatureFlags.addEventListener('change', handleRecordingSettingsChange);
trackNavigation.addEventListener('change', handleRecordingSettingsChange);
networkUrlFilterInput.addEventListener('change', handleRecordingSettingsChange);
networkUrlFilterInput.addEventListener('blur', handleRecordingSettingsChange);
filterByDomain.addEventListener('change', handleRecordingSettingsChange);
domainFilter.addEventListener('change', handleRecordingSettingsChange);
domainFilter.addEventListener('blur', handleRecordingSettingsChange);

// Load settings on startup
loadRecordingSettings();

// Initialize
updateStatus();

