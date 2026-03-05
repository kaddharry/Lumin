import { useState } from 'react'
import './App.css'

function App() {
  const handleToggle = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const tab = tabs[0];

        chrome.tabs.sendMessage(tab.id, { action: 'toggle_ui' }, (response) => {
          if (chrome.runtime.lastError) {
            alert("Please refresh the page! The extension was reloaded and needs the page to be refreshed.");
          } else {
            window.close();
          }
        });
      }
    });
  };

  return (
    <div className="popup-container">
      <h1>LUMIN</h1>
      <p>Press <b>Alt+S</b> to toggle the overlay.</p>
      <button onClick={handleToggle} className="primary-btn">
        Toggle Overlay Now
      </button>
      <p className="hint">
        If it doesn't appear, refresh the page.
      </p>
    </div>
  )
}

export default App
