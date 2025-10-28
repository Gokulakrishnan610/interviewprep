/**
 * Conversation Extractor for Beyond Presence
 * 
 * This utility attempts to extract conversation data from the Beyond Presence iframe
 * using various techniques since the iframe doesn't expose data via postMessage.
 */

export interface ConversationMessage {
  speaker: 'interviewer' | 'candidate';
  message: string;
  timestamp: string;
}

/**
 * Method 1: Try to access iframe content (will fail due to CORS, but worth trying)
 */
export function tryDirectIframeAccess(iframeElement: HTMLIFrameElement): ConversationMessage[] {
  try {
    const iframeDocument = iframeElement.contentDocument || iframeElement.contentWindow?.document;
    
    if (!iframeDocument) {
      console.log('❌ Cannot access iframe document (CORS restriction)');
      return [];
    }

    // Try to find chat/transcript elements
    const messages: ConversationMessage[] = [];
    
    // Common selectors for chat interfaces
    const selectors = [
      '.message',
      '.chat-message',
      '[data-message]',
      '[role="log"]',
      '.transcript-item',
      '.conversation-message'
    ];

    for (const selector of selectors) {
      const elements = iframeDocument.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} messages with selector: ${selector}`);
        
        elements.forEach(el => {
          const text = el.textContent?.trim();
          if (text) {
            messages.push({
              speaker: el.classList.contains('agent') || el.classList.contains('interviewer') 
                ? 'interviewer' 
                : 'candidate',
              message: text,
              timestamp: new Date().toISOString()
            });
          }
        });
        
        return messages;
      }
    }

    console.log('⚠️ No messages found with common selectors');
    return [];
  } catch (error) {
    console.log('❌ Direct iframe access failed (expected due to CORS):', error);
    return [];
  }
}

/**
 * Method 2: Use MutationObserver to detect changes in iframe
 */
export function setupMutationObserver(
  iframeElement: HTMLIFrameElement,
  onMessageDetected: (message: ConversationMessage) => void
): () => void {
  try {
    const iframeDocument = iframeElement.contentDocument || iframeElement.contentWindow?.document;
    
    if (!iframeDocument) {
      console.log('❌ Cannot setup MutationObserver (CORS restriction)');
      return () => {};
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const text = element.textContent?.trim();
            
            if (text && text.length > 10) {
              console.log('📝 New content detected:', text.substring(0, 50) + '...');
              
              onMessageDetected({
                speaker: element.classList.contains('agent') ? 'interviewer' : 'candidate',
                message: text,
                timestamp: new Date().toISOString()
              });
            }
          }
        });
      });
    });

    observer.observe(iframeDocument.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    console.log('✅ MutationObserver setup successfully');

    return () => observer.disconnect();
  } catch (error) {
    console.log('❌ MutationObserver setup failed:', error);
    return () => {};
  }
}

/**
 * Method 3: Intercept network requests (requires browser extension or proxy)
 */
export function setupNetworkInterception() {
  console.log('ℹ️ Network interception requires browser extension or service worker');
  
  // This would need a browser extension or service worker to intercept
  // Beyond Presence API calls and extract conversation data
  
  return {
    message: 'Network interception not available in standard web app',
    suggestion: 'Consider using a browser extension or Puppeteer for this approach'
  };
}

/**
 * Method 4: Use Web Speech API to capture audio
 */
export function setupSpeechRecognition(
  onTranscript: (speaker: 'interviewer' | 'candidate', text: string) => void
): () => void {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.log('❌ Speech Recognition not supported in this browser');
    return () => {};
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event: any) => {
    const last = event.results.length - 1;
    const transcript = event.results[last][0].transcript;

    console.log('🎤 Speech recognized:', transcript);
    
    // Note: We can't automatically determine speaker, would need additional logic
    onTranscript('candidate', transcript);
  };

  recognition.onerror = (event: any) => {
    console.error('❌ Speech recognition error:', event.error);
  };

  try {
    recognition.start();
    console.log('✅ Speech recognition started');
  } catch (error) {
    console.error('❌ Failed to start speech recognition:', error);
  }

  return () => {
    try {
      recognition.stop();
      console.log('🔇 Speech recognition stopped');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  };
}

/**
 * Method 5: Screen recording + OCR (requires additional libraries)
 */
export async function captureScreenAndExtractText(): Promise<string> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    });

    console.log('✅ Screen capture started');
    console.log('ℹ️ OCR extraction would require Tesseract.js or similar library');

    // Stop the stream immediately (we're just demonstrating)
    stream.getTracks().forEach(track => track.stop());

    return 'Screen capture available, but OCR not implemented';
  } catch (error) {
    console.error('❌ Screen capture failed:', error);
    return '';
  }
}

/**
 * Method 6: Browser Extension Approach (recommended for production)
 */
export function getBrowserExtensionInstructions() {
  return {
    title: 'Browser Extension Solution',
    description: 'Create a Chrome/Firefox extension that can access iframe content',
    steps: [
      '1. Create manifest.json with permissions for bey.chat',
      '2. Use content script to access iframe DOM',
      '3. Extract conversation from Beyond Presence elements',
      '4. Send data to your React app via custom events',
      '5. Extension can bypass CORS restrictions'
    ],
    example: `
// manifest.json
{
  "manifest_version": 3,
  "name": "Interview Conversation Extractor",
  "permissions": ["activeTab", "scripting"],
  "host_permissions": ["*://bey.chat/*"],
  "content_scripts": [{
    "matches": ["*://localhost:3000/*"],
    "js": ["content.js"],
    "all_frames": true
  }]
}

// content.js
if (window.location.hostname === 'bey.chat') {
  // Extract conversation from Beyond Presence DOM
  const observer = new MutationObserver(() => {
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => {
      window.parent.postMessage({
        type: 'conversation',
        data: msg.textContent
      }, '*');
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
    `
  };
}

/**
 * Main extraction function - tries all available methods
 */
export async function extractConversation(
  iframeElement: HTMLIFrameElement,
  onMessageExtracted: (message: ConversationMessage) => void
): Promise<{
  success: boolean;
  method: string;
  messages: ConversationMessage[];
  cleanup?: () => void;
}> {
  console.log('🔍 Attempting to extract conversation from Beyond Presence...');

  // Try Method 1: Direct iframe access
  const directMessages = tryDirectIframeAccess(iframeElement);
  if (directMessages.length > 0) {
    directMessages.forEach(onMessageExtracted);
    return {
      success: true,
      method: 'Direct iframe access',
      messages: directMessages
    };
  }

  // Try Method 2: MutationObserver
  const cleanup = setupMutationObserver(iframeElement, onMessageExtracted);
  if (cleanup !== (() => {})) {
    return {
      success: true,
      method: 'MutationObserver',
      messages: [],
      cleanup
    };
  }

  // If all methods fail, return instructions
  console.log('❌ All automatic extraction methods failed');
  console.log('ℹ️ Beyond Presence uses CORS protection');
  console.log('💡 Recommended solutions:');
  console.log('   1. Manual capture (current implementation)');
  console.log('   2. Browser extension (best for production)');
  console.log('   3. Speech recognition (experimental)');
  console.log('   4. Contact Beyond Presence for API access');

  return {
    success: false,
    method: 'None - CORS protected',
    messages: []
  };
}
