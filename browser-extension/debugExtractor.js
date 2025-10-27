/**
 * Debug Extractor - Run this in Beyond Presence console to find the right selectors
 * Open DevTools (F12) on the Beyond Presence page and paste this code
 */

console.log('🔍 Beyond Presence DOM Inspector');
console.log('================================');

// Function to find all potential message containers
function findMessageContainers() {
  const results = [];
  
  // Look for elements with "conversation" in class or id
  const conversationElements = document.querySelectorAll('[class*="onversation"], [id*="onversation"]');
  console.log(`\n📦 Found ${conversationElements.length} elements with "conversation" in class/id`);
  conversationElements.forEach((el, i) => {
    console.log(`  ${i + 1}. Tag: ${el.tagName}, Classes: ${el.className}`);
  });
  
  // Look for elements with "chat" in class or id
  const chatElements = document.querySelectorAll('[class*="chat"], [id*="chat"]');
  console.log(`\n💬 Found ${chatElements.length} elements with "chat" in class/id`);
  chatElements.forEach((el, i) => {
    console.log(`  ${i + 1}. Tag: ${el.tagName}, Classes: ${el.className}`);
  });
  
  // Look for elements with "message" in class or id
  const messageElements = document.querySelectorAll('[class*="message"], [id*="message"]');
  console.log(`\n📨 Found ${messageElements.length} elements with "message" in class/id`);
  messageElements.forEach((el, i) => {
    const text = el.textContent?.trim().substring(0, 50);
    console.log(`  ${i + 1}. Tag: ${el.tagName}, Classes: ${el.className}, Text: "${text}..."`);
  });
  
  // Look for the specific "Conversation" header
  const headers = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent?.trim() === 'Conversation' && el.children.length === 0
  );
  console.log(`\n🎯 Found ${headers.length} elements with text "Conversation"`);
  headers.forEach((el, i) => {
    console.log(`  ${i + 1}. Tag: ${el.tagName}, Classes: ${el.className}`);
    console.log(`     Parent: ${el.parentElement?.tagName}, Classes: ${el.parentElement?.className}`);
  });
  
  // Look for elements containing "Priya"
  const priyaElements = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent?.includes('Priya') && el.textContent.length < 200
  );
  console.log(`\n👤 Found ${priyaElements.length} elements mentioning "Priya"`);
  priyaElements.forEach((el, i) => {
    const text = el.textContent?.trim().substring(0, 80);
    console.log(`  ${i + 1}. Tag: ${el.tagName}, Classes: ${el.className}, Text: "${text}..."`);
  });
  
  // Look for text bubbles (common in chat UIs)
  const bubbles = document.querySelectorAll('[class*="bubble"], [class*="Bubble"]');
  console.log(`\n💭 Found ${bubbles.length} elements with "bubble" in class`);
  bubbles.forEach((el, i) => {
    const text = el.textContent?.trim().substring(0, 50);
    console.log(`  ${i + 1}. Tag: ${el.tagName}, Classes: ${el.className}, Text: "${text}..."`);
  });
  
  // Try to find the conversation panel by looking for the close button (X)
  const closeButtons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(el =>
    el.textContent?.trim() === '×' || el.textContent?.trim() === 'X' || el.innerHTML?.includes('close')
  );
  console.log(`\n❌ Found ${closeButtons.length} close buttons`);
  closeButtons.forEach((el, i) => {
    console.log(`  ${i + 1}. Parent container classes: ${el.closest('[class*="onversation"], [class*="panel"], [class*="modal"]')?.className}`);
  });
}

// Run the inspector
findMessageContainers();

console.log('\n================================');
console.log('💡 Instructions:');
console.log('1. Look at the output above');
console.log('2. Find the selector that contains your messages');
console.log('3. Update beyondPresenceExtractor.js with the correct selector');
console.log('\n🔧 To extract messages manually, run:');
console.log('   extractManually()');

// Manual extraction function
window.extractManually = function() {
  console.log('\n🚀 Manual Extraction Started');
  
  // Try all possible selectors
  const selectors = [
    '[class*="onversation"] [class*="message"]',
    '[class*="onversation"] p',
    '[class*="onversation"] div > div',
    '[class*="chat"] [class*="message"]',
    '[class*="message"]',
    'p'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`\n✅ Found ${elements.length} elements with selector: "${selector}"`);
      elements.forEach((el, i) => {
        const text = el.textContent?.trim();
        if (text && text.length > 10 && text.length < 500) {
          console.log(`  ${i + 1}. "${text.substring(0, 100)}..."`);
        }
      });
      
      if (elements.length > 0 && elements.length < 50) {
        console.log(`\n💡 This selector looks promising: "${selector}"`);
        return selector;
      }
    }
  }
};

console.log('\n✅ Debug extractor loaded. Run findMessageContainers() again anytime.');
