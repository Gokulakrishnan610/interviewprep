/**
 * Parent Listener
 * Runs in your React app (localhost:3000)
 * Receives messages from the Beyond Presence extractor
 */

console.log('👂 Parent Listener loaded - ready to receive conversation data');

// Listen for messages from the Beyond Presence iframe
window.addEventListener('message', (event) => {
  // Log all messages for debugging
  console.log('📨 Received message:', event.origin, event.data);
  
  // Handle conversation data from Beyond Presence extractor
  if (event.data.type === 'beyond-presence-conversation') {
    console.log('✅ Received conversation data from Beyond Presence!');
    console.log(`   Messages: ${event.data.messages.length}`);
    console.log(`   Total extracted: ${event.data.totalExtracted}`);
    
    // Dispatch custom event that React can listen to
    const customEvent = new CustomEvent('beyondPresenceConversation', {
      detail: event.data
    });
    window.dispatchEvent(customEvent);
    
    // Also store in sessionStorage for React to access
    const existing = JSON.parse(sessionStorage.getItem('beyondPresenceMessages') || '[]');
    const updated = [...existing, ...event.data.messages];
    sessionStorage.setItem('beyondPresenceMessages', JSON.stringify(updated));
    
    console.log('💾 Stored in sessionStorage');
  }
  
  // Handle extractor status
  if (event.data.type === 'extractor-status') {
    console.log('📊 Extractor status:', event.data.status);
    
    const statusEvent = new CustomEvent('extractorStatus', {
      detail: event.data
    });
    window.dispatchEvent(statusEvent);
  }
});

// Provide a way for React to request extraction
window.requestConversationExtraction = function() {
  console.log('📤 Requesting conversation extraction from iframe');
  
  const iframe = document.querySelector('iframe[src*="bey.chat"]');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      type: 'extract-conversation'
    }, '*');
  } else {
    console.warn('⚠️ Beyond Presence iframe not found');
  }
};

console.log('✅ Parent Listener ready');
console.log('💡 Use window.requestConversationExtraction() to manually trigger extraction');
