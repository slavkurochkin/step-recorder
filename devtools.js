let panel = null;
let panelWindow = null;

chrome.devtools.panels.create(
  "Step Recorder",
  "icon48.png",
  "panel.html",
  (createdPanel) => {
    panel = createdPanel;
    
    createdPanel.onShown.addListener((window) => {
      panelWindow = window;
    });
  }
);
