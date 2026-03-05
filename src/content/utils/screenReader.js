export const getPageContent = () => {
  // Simple text extraction for now. 
  // In a real app, we might use @mozilla/readability
  const clone = document.cloneNode(true);
  
  // Remove scripts, styles, and our own overlay
  const scripts = clone.querySelectorAll('script, style, noscript, #live-on-screen-ai-root');
  scripts.forEach(script => script.remove());

  // Get text content
  let text = clone.body.innerText || clone.body.textContent;
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Limit length to avoid token limits (Gemini Flash has 1M context, so we are generous)
  return text.substring(0, 50000); 
};
