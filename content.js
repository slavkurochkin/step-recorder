// Re-initialize on every injection to handle extension reloads.
// Wrapped in IIFE so let/const declarations don't clash across re-injections.
// DOM listener attachment is guarded by window.__stepRecorderListenersAttached to prevent duplicates.
(function() {
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
  let captureFeatureFlags = true;
  let trackNavigation = true;

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

  // Window-level dedup so a navigation/pageload to the same URL isn't recorded
  // multiple times when several content-script instances/listeners coexist
  // (re-injection across reloads) or different code paths fire close together.
  function navAlreadyRecorded(url) {
    const now = Date.now();
    const last = window.__stepRecorderLastNav;
    if (last && last.url === url && now - last.t < 800) return true;
    window.__stepRecorderLastNav = { url: url, t: now };
    return false;
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

        // Record page load/redirect if this is a new page (guard prevents duplicates across multiple injections)
        if (isNewPageLoad && trackNavigation && !navAlreadyRecorded(window.location.href)) {
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
  chrome.storage.local.get(['recordFocusEvents', 'captureConsoleErrors', 'captureNetworkErrors', 'captureAllLogs', 'filterByDomain', 'domainFilter', 'captureFeatureFlags', 'trackNavigation'], (result) => {
    if (chrome.runtime.lastError) return;
    recordFocusEvents = result.recordFocusEvents || false;
    captureConsoleErrors = result.captureConsoleErrors || false;
    captureNetworkErrors = result.captureNetworkErrors || false;
    captureAllLogs = result.captureAllLogs || false;
    filterByDomain = result.filterByDomain === true;
    domainFilterPattern = result.domainFilter || '';
    captureFeatureFlags = result.captureFeatureFlags !== false;
    trackNavigation = result.trackNavigation !== false;
  });


  function recordNavigation(label) {
    if (!isExtensionValid() || !trackNavigation) return;

    const now = Date.now();
    const url = window.location.href;

    if (navAlreadyRecorded(url)) return;

    chrome.runtime.sendMessage({ type: 'getRecordingState' }, (response) => {
      if (chrome.runtime.lastError || !response?.isRecording) return;

      chrome.runtime.sendMessage({
        type: 'stepRecorded',
        step: {
          type: 'pageload',
          timestamp: now,
          tagName: 'browser',
          selector: '',
          text: document.title || url,
          url: url
        }
      }).catch(() => {});
    });
  }

  // Handle bfcache (back/forward button) - pageshow fires when page is restored
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      checkAndResumeRecording();
      recordNavigation('Browser back/forward');
    }
  });

  // Record browser back/forward navigation
  window.addEventListener('popstate', () => {
    recordNavigation('Browser back/forward');
  });

  // SPA route changes (history.pushState/replaceState fire no events) — poll the URL.
  // Captures client-side navigation regardless of router, without MAIN-world patching.
  if (!window.__stepRecorderNavWatcher) {
    window.__stepRecorderNavWatcher = true;
    let lastWatchedUrl = window.location.href;
    setInterval(() => {
      if (!isRecording || isPaused || !trackNavigation) return;
      if (window.location.href !== lastWatchedUrl) {
        lastWatchedUrl = window.location.href;
        recordNavigation();
      }
    }, 400);
  }

  // Listen for messages from panel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
      // Record the starting page so the exported flow has an entry point.
      if (trackNavigation && !navAlreadyRecorded(window.location.href)) {
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
    } else if (message.type === 'enterScreenshotMode') {
      enterScreenshotMode();
      sendResponse({ status: 'screenshotMode' });
    } else if (message.type === 'exitScreenshotMode') {
      exitScreenshotMode();
      sendResponse({ status: 'normal' });
    } else if (message.type === 'setRecordingSettings') {
      recordFocusEvents = message.recordFocus || false;
      captureConsoleErrors = message.captureConsole;
      captureNetworkErrors = message.captureNetwork;
      captureAllLogs = message.captureAllLogs || false;
      filterByDomain = message.filterByDomain !== false;
      domainFilterPattern = message.domainFilter || '';
      if (typeof message.captureFeatureFlags !== 'undefined') {
        captureFeatureFlags = message.captureFeatureFlags;
      }
      if (typeof message.trackNavigation !== 'undefined') {
        trackNavigation = message.trackNavigation;
      }
      sendResponse({ status: 'ok' });
    } else if (message.type === 'highlightResponseData') {
      highlightResponseData(message.responseBody);
      sendResponse({ status: 'ok' });
    } else if (message.type === 'clearHighlights') {
      clearResponseHighlights();
      sendResponse({ status: 'ok' });
    }
    return true;
  });

  // ============ Response Data Highlighting ============

  function extractResponseValues(responseBody) {
    const values = new Set();
    if (!responseBody || responseBody === '[binary]') return values;

    let parsed;
    try { parsed = JSON.parse(responseBody); } catch { return values; }

    const SKIP = new Set(['true', 'false', 'null', 'undefined', 'none', 'n/a']);

    function walk(obj, depth) {
      if (depth > 12 || values.size > 300) return;
      if (typeof obj === 'string') {
        const t = obj.trim();
        if (t.length >= 4 && !SKIP.has(t.toLowerCase())) values.add(t);
      } else if (typeof obj === 'number' && isFinite(obj)) {
        const s = String(obj);
        if (s.length >= 2) values.add(s);
      } else if (Array.isArray(obj)) {
        obj.forEach(v => walk(v, depth + 1));
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(v => walk(v, depth + 1));
      }
    }
    walk(parsed, 0);
    return values;
  }

  function highlightResponseData(responseBody) {
    clearResponseHighlights();

    const values = extractResponseValues(responseBody);
    if (values.size === 0) return;

    // Inject highlight styles once
    if (!document.getElementById('__srHighlightStyle')) {
      const style = document.createElement('style');
      style.id = '__srHighlightStyle';
      style.textContent = `
        .__sr-highlight {
          outline: 2px solid #00897B !important;
          background-color: rgba(0, 137, 123, 0.08) !important;
          border-radius: 2px;
        }
      `;
      document.head.appendChild(style);
    }

    const highlighted = new Set();
    const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'meta', 'head', 'svg', 'path']);
    // Inline wrappers — bubble up one level for a better target
    const INLINE = new Set(['span', 'em', 'strong', 'b', 'i', 'small', 'mark', 'u', 'abbr', 'cite']);

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(parent.tagName.toLowerCase())) return NodeFilter.FILTER_REJECT;
          // Skip invisible nodes
          const cs = window.getComputedStyle(parent);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return NodeFilter.FILTER_SKIP;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      if (!text) continue;

      let matched = false;
      for (const val of values) {
        if (text === val || text.includes(val)) { matched = true; break; }
      }
      if (!matched) continue;

      // Find best element to outline: bubble past pure inline wrappers
      let el = node.parentElement;
      for (let i = 0; i < 3 && el && el !== document.body; i++) {
        const tag = el.tagName.toLowerCase();
        if (!INLINE.has(tag)) break;
        if (el.parentElement && el.parentElement !== document.body) el = el.parentElement;
        else break;
      }

      if (el && el !== document.body && !highlighted.has(el)) {
        el.classList.add('__sr-highlight');
        highlighted.add(el);
      }
    }
  }

  function clearResponseHighlights() {
    document.querySelectorAll('.__sr-highlight').forEach(el => el.classList.remove('__sr-highlight'));
  }

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

  // ============ Screenshot Selection Mode ============

  let isScreenshotMode = false;
  let screenshotDimOverlay = null;
  let screenshotSelectionBox = null;
  let screenshotSelectionStart = null;

  function enterScreenshotMode() {
    isScreenshotMode = true;

    screenshotDimOverlay = document.createElement('div');
    screenshotDimOverlay.id = '__step-recorder-screenshot-overlay';
    screenshotDimOverlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.35);
      z-index: 2147483645;
      cursor: crosshair;
      user-select: none;
    `;

    screenshotSelectionBox = document.createElement('div');
    screenshotSelectionBox.id = '__step-recorder-selection-box';
    screenshotSelectionBox.style.cssText = `
      position: fixed;
      border: 2px solid #2196F3;
      background: rgba(33,150,243,0.15);
      display: none;
      pointer-events: none;
      z-index: 2147483646;
      box-sizing: border-box;
    `;

    document.body.appendChild(screenshotDimOverlay);
    document.body.appendChild(screenshotSelectionBox);

    screenshotDimOverlay.addEventListener('mousedown', handleSelectionMousedown);
    document.addEventListener('mousemove', handleSelectionMousemove, true);
    document.addEventListener('mouseup', handleSelectionMouseup, true);
    document.addEventListener('keydown', handleScreenshotKeydown, true);
  }

  function exitScreenshotMode() {
    isScreenshotMode = false;
    screenshotSelectionStart = null;
    if (screenshotDimOverlay) { screenshotDimOverlay.remove(); screenshotDimOverlay = null; }
    if (screenshotSelectionBox) { screenshotSelectionBox.remove(); screenshotSelectionBox = null; }
    document.removeEventListener('mousemove', handleSelectionMousemove, true);
    document.removeEventListener('mouseup', handleSelectionMouseup, true);
    document.removeEventListener('keydown', handleScreenshotKeydown, true);
  }

  function handleSelectionMousedown(e) {
    e.preventDefault();
    screenshotSelectionStart = { x: e.clientX, y: e.clientY };
    screenshotSelectionBox.style.left = e.clientX + 'px';
    screenshotSelectionBox.style.top = e.clientY + 'px';
    screenshotSelectionBox.style.width = '0';
    screenshotSelectionBox.style.height = '0';
    screenshotSelectionBox.style.display = 'block';
  }

  function handleSelectionMousemove(e) {
    if (!screenshotSelectionStart || !screenshotSelectionBox) return;
    const x = Math.min(e.clientX, screenshotSelectionStart.x);
    const y = Math.min(e.clientY, screenshotSelectionStart.y);
    const w = Math.abs(e.clientX - screenshotSelectionStart.x);
    const h = Math.abs(e.clientY - screenshotSelectionStart.y);
    screenshotSelectionBox.style.left = x + 'px';
    screenshotSelectionBox.style.top = y + 'px';
    screenshotSelectionBox.style.width = w + 'px';
    screenshotSelectionBox.style.height = h + 'px';
  }

  function handleSelectionMouseup(e) {
    if (!screenshotSelectionStart) return;
    const x = Math.min(e.clientX, screenshotSelectionStart.x);
    const y = Math.min(e.clientY, screenshotSelectionStart.y);
    const w = Math.abs(e.clientX - screenshotSelectionStart.x);
    const h = Math.abs(e.clientY - screenshotSelectionStart.y);
    screenshotSelectionStart = null;

    exitScreenshotMode();

    if (w < 5 || h < 5) return; // too small, cancel

    chrome.runtime.sendMessage({
      type: 'screenshotRegionSelected',
      region: { x, y, width: w, height: h, devicePixelRatio: window.devicePixelRatio || 1 }
    }).catch(() => {});
  }

  function handleScreenshotKeydown(e) {
    if (e.key === 'Escape') {
      exitScreenshotMode();
    }
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

// Robust XPath: anchor on the nearest ancestor id, else absolute tag[index] path.
function getXPath(element) {
  if (element.id) return `//*[@id="${element.id}"]`;
  const parts = [];
  let el = element;
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    if (el.id) { parts.unshift(`*[@id="${el.id}"]`); return '//' + parts.join('/'); }
    let idx = 1;
    for (let sib = el.previousElementSibling; sib; sib = sib.previousElementSibling) {
      if (sib.tagName === el.tagName) idx++;
    }
    parts.unshift(`${el.tagName.toLowerCase()}[${idx}]`);
    el = el.parentElement;
  }
  return '/' + parts.join('/');
}

// Accessible name approximation (for getByRole/getByText).
function accessibleName(element) {
  const aria = element.getAttribute('aria-label');
  if (aria) return aria.trim();
  const text = (element.textContent || '').trim().replace(/\s+/g, ' ');
  if (text && text.length <= 60) return text;
  return (element.getAttribute('alt') || element.getAttribute('placeholder') || element.getAttribute('title') || '').trim();
}

// Implicit ARIA role from tag/type when no explicit role attribute is set.
function implicitRole(element) {
  const explicit = element.getAttribute('role');
  if (explicit) return explicit;
  const tag = element.tagName.toLowerCase();
  if (tag === 'a') return element.hasAttribute('href') ? 'link' : null;
  if (tag === 'input') {
    const type = (element.getAttribute('type') || 'text').toLowerCase();
    return { checkbox: 'checkbox', radio: 'radio', button: 'button', submit: 'button',
             reset: 'button', range: 'slider', search: 'searchbox', number: 'spinbutton' }[type] || 'textbox';
  }
  return { button: 'button', select: 'combobox', textarea: 'textbox', img: 'img', nav: 'navigation',
           ul: 'list', ol: 'list', li: 'listitem', table: 'table', form: 'form',
           h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading' }[tag] || null;
}

// Associated <label> text for a form control (for getByLabel).
function labelText(element) {
  const labelledby = element.getAttribute('aria-labelledby');
  if (labelledby) {
    const txt = labelledby.split(/\s+/)
      .map(id => { const e = document.getElementById(id); return e ? e.textContent.trim() : ''; })
      .filter(Boolean).join(' ');
    if (txt) return txt.replace(/\s+/g, ' ');
  }
  if (element.id) {
    try {
      const forLbl = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (forLbl) return forLbl.textContent.trim().replace(/\s+/g, ' ');
    } catch (_) {}
  }
  const wrap = element.closest('label');
  if (wrap) return wrap.textContent.trim().replace(/\s+/g, ' ');
  return '';
}

function getSelectorAlternatives(element) {
  const alts = [];
  const tag = element.tagName.toLowerCase();
  const esc = (s) => s.replace(/'/g, "\\'");

  if (element.id)
    alts.push({ label: 'id', selector: `#${element.id}` });

  for (const attr of ['data-testid', 'data-test', 'data-cy', 'data-qa', 'data-test-id']) {
    const val = element.getAttribute(attr);
    if (val) alts.push({ label: attr, selector: `[${attr}="${val}"]` });
  }

  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) alts.push({ label: 'aria-label', selector: `[aria-label="${ariaLabel}"]` });

  const name = element.getAttribute('name');
  if (name) alts.push({ label: 'name', selector: `${tag}[name="${name}"]` });

  const placeholder = element.getAttribute('placeholder');
  if (placeholder) alts.push({ label: 'placeholder', selector: `[placeholder="${placeholder}"]` });

  const role = element.getAttribute('role');
  if (role) alts.push({ label: 'role', selector: `[role="${role}"]` });

  // Role-based (Playwright / Testing Library style) — always derivable.
  const impRole = implicitRole(element);
  const accName = accessibleName(element);
  if (impRole) {
    alts.push({
      label: 'getByRole',
      selector: accName ? `getByRole('${impRole}', { name: '${esc(accName)}' })` : `getByRole('${impRole}')`
    });
  }

  // Text-based — handy for buttons, links, labels.
  if (accName && accName.length <= 60)
    alts.push({ label: 'getByText', selector: `getByText('${esc(accName)}')` });

  // getByLabel — form controls associated with a <label>.
  if (/^(input|select|textarea)$/.test(tag) || element.isContentEditable) {
    const lbl = labelText(element);
    if (lbl && lbl.length <= 60)
      alts.push({ label: 'getByLabel', selector: `getByLabel('${esc(lbl)}')` });
  }

  // Playwright/TL attribute variants of attributes we already detect.
  const ph = element.getAttribute('placeholder');
  if (ph) alts.push({ label: 'getByPlaceholder', selector: `getByPlaceholder('${esc(ph)}')` });
  const testId = element.getAttribute('data-testid') || element.getAttribute('data-test-id');
  if (testId) alts.push({ label: 'getByTestId', selector: `getByTestId('${esc(testId)}')` });
  const altText = element.getAttribute('alt');
  if (altText) alts.push({ label: 'getByAltText', selector: `getByAltText('${esc(altText)}')` });

  // Framework-agnostic text XPath — only when the element has its own text.
  const visText = (element.textContent || '').trim().replace(/\s+/g, ' ');
  if (visText && visText.length <= 60) {
    const q = visText.includes('"') ? `'${visText}'` : `"${visText}"`;
    alts.push({ label: 'text xpath', selector: `//${tag}[normalize-space()=${q}]` });
  }

  // Attribute selectors for common targeted elements.
  if (tag === 'a' && element.getAttribute('href'))
    alts.push({ label: 'href', selector: `a[href="${element.getAttribute('href')}"]` });
  if (tag === 'input' && element.getAttribute('type'))
    alts.push({ label: 'type', selector: `input[type="${element.getAttribute('type')}"]` });

  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c => c && c.length < 40 && !c.includes(':'));
    if (classes.length > 0 && classes.length <= 4)
      alts.push({ label: 'class', selector: `.${classes.join('.')}` });
  }

  const cssPath = getSelector(element);
  if (cssPath && !alts.some(a => a.selector === cssPath))
    alts.push({ label: 'css path', selector: cssPath });

  // XPath — always available as a last-resort, fully-qualified locator.
  alts.push({ label: 'xpath', selector: getXPath(element) });

  return alts;
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
    selectorAlternatives: getSelectorAlternatives(element),
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

// Bridge feature-flag events from the MAIN-world hook (flag-hook.js) to the panel.
// Dedupe per kind so we only forward when a flag's value is first seen (for that kind)
// or actually changes — variation() fires on every render, the SDK re-polls bootstrap.
const flagLastValue = new Map(); // `${provider}:${key}:${kind}` -> JSON string of value

function forwardFlagStep(provider, kind, key, value, extra, ts) {
  if (!isExtensionValid() || !isRecording || isPaused || !captureFeatureFlags) return;
  const serialized = JSON.stringify(value === undefined ? null : value);
  const dedupeKey = `${provider}:${key}:${kind}`;
  if (kind !== 'change' && flagLastValue.get(dedupeKey) === serialized) return;
  flagLastValue.set(dedupeKey, serialized);

  chrome.runtime.sendMessage({
    type: 'flagCaptured',
    step: Object.assign({
      type: 'flag',
      provider,
      kind,
      key,
      value,
      timestamp: ts || Date.now()
    }, extra || {})
  }).catch(() => {});
}

// Only attach the postMessage listener once across re-injections.
if (!window.__stepRecorderFlagBridge) {
  window.__stepRecorderFlagBridge = true;
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== 'step-recorder-flags') return;

    const provider = data.provider || 'Unknown';
    if (data.kind === 'eval') {
      // Point-of-use: timestamp at the actual variation() call (data.t).
      forwardFlagStep(provider, 'eval', data.key, data.value, data.reason ? { reason: data.reason } : null, data.t);
    } else if (data.kind === 'change' && data.changes) {
      for (const key of Object.keys(data.changes)) {
        const c = data.changes[key] || {};
        forwardFlagStep(provider, 'change', key, c.current, { previous: c.previous }, data.t);
      }
    } else if ((data.kind === 'bootstrap' || data.kind === 'ready' || data.kind === 'snapshot') && data.flags) {
      for (const key of Object.keys(data.flags)) {
        forwardFlagStep(provider, 'bootstrap', key, data.flags[key], null, data.t);
      }
    }
  });
}

// Patch globals only once — re-injection would create a chain of wrappers otherwise
if (!window.__stepRecorderPatched) {
  window.__stepRecorderPatched = true;

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

} // end __stepRecorderPatched guard
})(); // end IIFE

