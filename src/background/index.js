console.log('Background script loaded');

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-ai') {
    console.log('Toggle command received');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        // Check for chrome:// URLs which we can't inject into
        if (tabs[0].url && tabs[0].url.startsWith('chrome://')) return;

        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle_ui' }, (response) => {
          // Catch errors if content script isn't ready (e.g. unrefreshed tab)
          if (chrome.runtime.lastError) {
            console.log("Could not send message to tab:", chrome.runtime.lastError.message);
          }
        });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture_screen') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 80 }, (dataUrl) => {
      sendResponse({ dataUrl });
    });
    return true; // Required for async sendResponse
  }
});
