// Popup script for Beyond Presence Conversation Extractor

document.addEventListener('DOMContentLoaded', function() {
  const statusEl = document.getElementById('status');
  const extractBtn = document.getElementById('extractBtn');
  const clearBtn = document.getElementById('clearBtn');
  const messageCountEl = document.getElementById('messageCount');
  const lastUpdateEl = document.getElementById('lastUpdate');
  
  // Check if extension is active
  function checkStatus() {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs && tabs[0]) {
            const currentTab = tabs[0];
            
            if (currentTab.url && (currentTab.url.includes('localhost') || currentTab.url.includes('127.0.0.1'))) {
              statusEl.className = 'status active';
              statusEl.textContent = '✅ Status: Active on Interview Page';
            } else {
              statusEl.className = 'status inactive';
              statusEl.textContent = '⚠️ Status: Navigate to Interview Page';
            }
          }
        });
      }
      
      // Get message count from sessionStorage (simpler approach)
      const count = sessionStorage.getItem('beyondPresenceMessageCount') || '0';
      const lastUpdate = sessionStorage.getItem('beyondPresenceLastUpdate') || 'Never';
      messageCountEl.textContent = count;
      lastUpdateEl.textContent = lastUpdate;
    } catch (error) {
      console.error('Error checking status:', error);
      statusEl.className = 'status inactive';
      statusEl.textContent = 'ℹ️ Extension loaded';
    }
  }
  
  // Extract conversation
  extractBtn.addEventListener('click', function() {
    alert('💡 Tip: The extension automatically extracts conversations.\n\nIf not working, use the green 💬 button on the interview page for manual capture.');
  });
  
  // Clear data
  clearBtn.addEventListener('click', function() {
    if (confirm('Clear all captured conversation data?')) {
      sessionStorage.clear();
      messageCountEl.textContent = '0';
      lastUpdateEl.textContent = 'Never';
      alert('✅ Data cleared');
    }
  });
  
  // Initial status check
  checkStatus();
  
  // Update every 2 seconds
  setInterval(checkStatus, 2000);
});
