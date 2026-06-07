// flag-hook.js — runs in the page's MAIN world (see manifest.json content_scripts).
//
// Captures feature-flag evaluations from client-side SDKs and forwards them to the
// isolated-world content script via window.postMessage. content.js relays them to
// the DevTools panel as `flagCaptured` steps.
//
// Capture strategy (most robust first):
//   1. Network layer — patch EventSource (LD streaming), fetch and XHR (LD polling).
//      Works even when the SDK is bundled (no window.LDClient global), which is the
//      common case for React/Vite/Webpack apps.
//   2. LDClient global hook — wraps LDClient.initialize / variation when the SDK is
//      exposed on window (older script-tag setups).
//   3. Generic API — window.__stepRecorderRecordFlags(provider, flags) for other SDKs.
(function () {
  if (window.__stepRecorderFlagHookInstalled) return;
  window.__stepRecorderFlagHookInstalled = true;

  const SOURCE = 'step-recorder-flags';

  function post(provider, kind, payload) {
    try {
      window.postMessage(
        Object.assign({ source: SOURCE, provider, kind, t: Date.now() }, payload),
        '*'
      );
    } catch (_) {
      /* cloning failure — ignore */
    }
  }

  // Normalize an arbitrary value into something structured-clone-safe and compact.
  function safeValue(v) {
    if (v === null || v === undefined) return v;
    const t = typeof v;
    if (t === 'string') return v.length > 500 ? v.slice(0, 500) + '…' : v;
    if (t === 'number' || t === 'boolean') return v;
    try {
      return JSON.parse(JSON.stringify(v));
    } catch (_) {
      return String(v);
    }
  }

  // ---------------------------------------------------------------------------
  // LaunchDarkly network interception (works regardless of how the SDK is loaded)
  // ---------------------------------------------------------------------------

  function isLDEvalUrl(u) {
    let s;
    try { s = String(u || ''); } catch (_) { return false; }
    if (s.indexOf('launchdarkly.com') === -1 && s.indexOf('launchdarkly.us') === -1) return false;
    return /clientstream\./.test(s) || /clientsdk\./.test(s) || /\/eval/.test(s) || /\/sdk\/eval/.test(s);
  }

  // An LD eval payload is a map: { flagKey: { value, version, ... } } (or value directly).
  function flagsFromEvalMap(obj) {
    if (!obj || typeof obj !== 'object') return null;
    const flags = {};
    for (const k of Object.keys(obj)) {
      const entry = obj[k];
      flags[k] = (entry && typeof entry === 'object' && 'value' in entry) ? safeValue(entry.value) : safeValue(entry);
    }
    return flags;
  }

  function parseEvalData(text) {
    try {
      let obj = JSON.parse(text);
      // Some payloads wrap the flags under `.data`.
      if (obj && obj.data && typeof obj.data === 'object') obj = obj.data;
      return flagsFromEvalMap(obj);
    } catch (_) {
      return null;
    }
  }

  function postSnapshot(flags) {
    if (flags && Object.keys(flags).length) post('LaunchDarkly', 'bootstrap', { flags });
  }

  // -- EventSource (streaming, the LD default) --
  const OrigES = window.EventSource;
  if (OrigES) {
    function PatchedEventSource(url, config) {
      const es = new OrigES(url, config);
      try {
        if (isLDEvalUrl(url)) {
          es.addEventListener('put', (e) => postSnapshot(parseEvalData(e.data)));
          es.addEventListener('patch', (e) => {
            try {
              const d = JSON.parse(e.data);
              const key = d && d.key;
              const value = d && (('value' in d) ? d.value : (d.flag && d.flag.value));
              if (key) post('LaunchDarkly', 'change', { changes: { [key]: { current: safeValue(value) } } });
            } catch (_) {}
          });
        }
      } catch (_) {}
      return es;
    }
    PatchedEventSource.prototype = OrigES.prototype;
    PatchedEventSource.CONNECTING = OrigES.CONNECTING;
    PatchedEventSource.OPEN = OrigES.OPEN;
    PatchedEventSource.CLOSED = OrigES.CLOSED;
    try { window.EventSource = PatchedEventSource; } catch (_) {}
  }

  // -- fetch (polling / bootstrap) --
  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (...args) {
      let url;
      try { url = (args[0] && typeof args[0] === 'object') ? args[0].url : args[0]; } catch (_) {}
      const p = origFetch.apply(this, args);
      if (isLDEvalUrl(url)) {
        p.then((res) => {
          try { res.clone().text().then((t) => postSnapshot(parseEvalData(t))); } catch (_) {}
        }).catch(() => {});
      }
      return p;
    };
  }

  // -- XHR (polling fallback) --
  const OrigOpen = XMLHttpRequest.prototype.open;
  const OrigSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__ldEvalUrl = url;
    return OrigOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (isLDEvalUrl(this.__ldEvalUrl)) {
      this.addEventListener('load', () => {
        try { postSnapshot(parseEvalData(this.responseText)); } catch (_) {}
      });
    }
    return OrigSend.apply(this, args);
  };

  // ---------------------------------------------------------------------------
  // Generic API: any provider/page code can push flags through here.
  // window.__stepRecorderRecordFlags('MyProvider', { flagA: true, flagB: 'x' })
  // ---------------------------------------------------------------------------
  window.__stepRecorderRecordFlags = function (provider, flags) {
    if (!flags || typeof flags !== 'object') return;
    const clean = {};
    for (const k of Object.keys(flags)) clean[k] = safeValue(flags[k]);
    post(provider || 'Generic', 'bootstrap', { flags: clean });
  };

  // ---------------------------------------------------------------------------
  // LaunchDarkly global hook (script-tag setups that expose window.LDClient)
  // ---------------------------------------------------------------------------
  function wrapLDClient(ld) {
    if (!ld || ld.__stepRecorderWrapped || typeof ld.initialize !== 'function') return ld;
    const originalInitialize = ld.initialize.bind(ld);
    ld.initialize = function (...args) {
      const client = originalInitialize(...args);
      try { instrumentLDInstance(client); } catch (_) {}
      return client;
    };
    ld.__stepRecorderWrapped = true;
    return ld;
  }

  function instrumentLDInstance(client) {
    if (!client || client.__stepRecorderInstrumented) return;
    client.__stepRecorderInstrumented = true;

    const dumpAll = () => {
      try {
        const all = typeof client.allFlags === 'function' ? client.allFlags() : null;
        if (all && typeof all === 'object') {
          const clean = {};
          for (const k of Object.keys(all)) clean[k] = safeValue(all[k]);
          postSnapshot(clean);
        }
      } catch (_) {}
    };

    if (typeof client.on === 'function') {
      client.on('ready', dumpAll);
      client.on('initialized', dumpAll);
      client.on('change', (changes) => {
        if (!changes || typeof changes !== 'object') return;
        const clean = {};
        for (const k of Object.keys(changes)) {
          const c = changes[k] || {};
          clean[k] = { current: safeValue(c.current), previous: safeValue(c.previous) };
        }
        post('LaunchDarkly', 'change', { changes: clean });
      });
    }

    if (typeof client.variation === 'function') {
      const originalVariation = client.variation.bind(client);
      client.variation = function (key, defaultValue) {
        const value = originalVariation(key, defaultValue);
        post('LaunchDarkly', 'eval', { key, value: safeValue(value) });
        return value;
      };
    }
  }

  if (window.LDClient) {
    wrapLDClient(window.LDClient);
  } else {
    let _ld;
    try {
      Object.defineProperty(window, 'LDClient', {
        configurable: true,
        enumerable: true,
        get() { return _ld; },
        set(v) { _ld = wrapLDClient(v); }
      });
    } catch (_) {
      let tries = 0;
      const iv = setInterval(() => {
        if (window.LDClient) { wrapLDClient(window.LDClient); clearInterval(iv); }
        else if (++tries > 100) clearInterval(iv);
      }, 100);
    }
  }
})();
