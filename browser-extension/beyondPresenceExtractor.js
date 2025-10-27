/**
 * Beyond Presence Conversation Extractor
 * Runs inside the Beyond Presence iframe (bey.chat domain)
 * Extracts conversation and sends to parent window
 */

console.log('🔌 Beyond Presence Extractor loaded');

// Configuration
const CONFIG = {
  // Selectors to try for finding messages
  messageSelectors: [
    // Beyond Presence specific selectors (based on visible UI)
    '[class*="Conversation"] [class*="message"]',
    '[class*="conversation"] [class*="message"]',
    '[class*="chat"] [class*="bubble"]',
    '[class*="message-bubble"]',
    '[class*="chat-bubble"]',
    // Generic selectors
    '.message',
    '.chat-message',
    '[data-message]',
    '[role="log"] > *',
    '.transcript-item',
    '.conversation-message',
    '[class*="message"]',
    '[class*="chat"]',
    '[class*="transcript"]',
    // Try to find any text content in conversation area
    'div[class*="onversation"] p',
    'div[class*="onversation"] div[class*="text"]'
  ],
  
  // Selectors for identifying speaker
  agentSelectors: [
    '.agent',
    '.interviewer',
    '.bot',
    '[data-speaker="agent"]',
    '[class*="agent"]',
    '[class*="interviewer"]'
  ],
  
  // Minimum message length to consider valid
  minMessageLength: 5,
  
  // Polling interval (ms)
  pollingInterval: 2000
};

// Store extracted messages to avoid duplicates
const extractedMessages = new Set();
let messageCount = 0;

/**
 * Determine if element represents an agent/interviewer message
 */
function isAgentMessage(element) {
  // Check element classes
  for (const selector of CONFIG.agentSelectors) {
    if (element.matches(selector) || element.closest(selector)) {
      return true;
    }
  }
  
  // Check for common patterns in text content
  const text = element.textContent?.toLowerCase() || '';
  if (text.includes('priya') || text.includes('interviewer')) {
    return true;
  }
  
  return false;
}

/**
 * Extract messages from DOM
 */
function extractMessages() {
  const messages = [];
  
  for (const selector of CONFIG.messageSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
        
        elements.forEach((el, index) => {
          const text = el.textContent?.trim();
          
          if (text && text.length >= CONFIG.minMessageLength) {
            const messageKey = `${text.substring(0, 50)}_${index}`;
            
            if (!extractedMessages.has(messageKey)) {
              extractedMessages.add(messageKey);
              
              const message = {
                speaker: isAgentMessage(el) ? 'interviewer' : 'candidate',
                message: text,
                timestamp: new Date().toISOString(),
                source: 'beyond-presence-extractor'
              };
              
              messages.push(message);
              messageCount++;
              
              console.log(`💬 Extracted message #${messageCount}:`, {
                speaker: message.speaker,
                preview: text.substring(0, 50) + '...'
              });
            }
          }
        });
        
        if (messages.length > 0) {
          break; // Found messages with this selector, no need to try others
        }
      }
    } catch (error) {
      console.error(`Error with selector ${selector}:`, error);
    }
  }
  
  return messages;
}

/**
 * Send messages to parent window
 */
function sendMessagesToParent(messages) {
  if (messages.length === 0) return;
  
  try {
    // Send to parent window (your React app)
    window.parent.postMessage({
      type: 'beyond-presence-conversation',
      messages: messages,
      totalExtracted: messageCount
    }, '*');
    
    console.log(`📤 Sent ${messages.length} messages to parent window`);
  } catch (error) {
    console.error('❌ Error sending messages to parent:', error);
  }
}

/**
 * Setup MutationObserver to detect new messages
 */
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let hasNewContent = false;
    
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        hasNewContent = true;
      }
    });
    
    if (hasNewContent) {
      console.log('🔄 DOM changed, extracting new messages...');
      const messages = extractMessages();
      sendMessagesToParent(messages);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('👂 MutationObserver active');
}

/**
 * Polling fallback (in case MutationObserver misses something)
 */
function startPolling() {
  setInterval(() => {
    const messages = extractMessages();
    if (messages.length > 0) {
      sendMessagesToParent(messages);
    }
  }, CONFIG.pollingInterval);
  
  console.log(`⏰ Polling every ${CONFIG.pollingInterval}ms`);
}

/**
 * Try to extract from common chat UI patterns
 */
function tryCommonChatPatterns() {
  // Pattern 1: Look for elements with "message" in class or data attributes
  const allElements = document.querySelectorAll('*');
  const messageElements = Array.from(allElements).filter(el => {
    const className = el.className?.toString().toLowerCase() || '';
    const dataAttrs = Array.from(el.attributes || [])
      .map(attr => attr.name.toLowerCase())
      .join(' ');
    
    return className.includes('message') || 
           className.includes('chat') || 
           className.includes('transcript') ||
           dataAttrs.includes('message');
  });
  
  if (messageElements.length > 0) {
    console.log(`🔍 Found ${messageElements.length} potential message elements`);
    return messageElements;
  }
  
  // Pattern 2: Look for role="log" or similar ARIA roles
  const logElements = document.querySelectorAll('[role="log"], [role="region"]');
  if (logElements.length > 0) {
    console.log(`🔍 Found ${logElements.length} log/region elements`);
    return Array.from(logElements);
  }
  
  return [];
}

/**
 * Initialize extractor
 */
function init() {
  console.log('🚀 Initializing Beyond Presence Conversation Extractor');
  console.log('📍 Current URL:', window.location.href);
  
  // Wait for page to fully load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    return;
  }
  
  // Try immediate extraction
  setTimeout(() => {
    console.log('🔍 Attempting initial extraction...');
    const messages = extractMessages();
    
    if (messages.length > 0) {
      sendMessagesToParent(messages);
    } else {
      console.log('⚠️ No messages found yet, will monitor for changes');
      
      // Try common patterns
      const potentialElements = tryCommonChatPatterns();
      if (potentialElements.length > 0) {
        console.log('💡 Found potential message containers, monitoring...');
      }
    }
    
    // Setup continuous monitoring
    setupMutationObserver();
    startPolling();
    
    // Send status update
    window.parent.postMessage({
      type: 'extractor-status',
      status: 'active',
      url: window.location.href
    }, '*');
    
  }, 2000); // Wait 2 seconds for Beyond Presence to load
}

// Start extraction
init();

// Listen for messages from parent (in case parent wants to trigger extraction)
window.addEventListener('message', (event) => {
  if (event.data.type === 'extract-conversation') {
    console.log('📥 Received extraction request from parent');
    const messages = extractMessages();
    sendMessagesToParent(messages);
  }
});

console.log('✅ Beyond Presence Extractor ready');
