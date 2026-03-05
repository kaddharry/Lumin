import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Mic, X, Send, Monitor, Move, Copy, Check, Square } from 'lucide-react';
import { getPageContent } from './utils/screenReader';
import { generateResponse } from './utils/gemini';

// Component to render messages with code blocks
const MessageBubble = ({ message }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderContent = (text) => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).split('\n');
        const language = lines[0].trim() || 'code';
        const code = lines.slice(1).join('\n').trim();

        return (
          <div key={index} className="code-block-container">
            <div className="code-block-header">
              <span className="code-language">{language}</span>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(code, index)}
                title="Copy code"
              >
                {copiedIndex === index ? <Check size={14} /> : <Copy size={14} />}
                {copiedIndex === index ? ' Copied!' : ' Copy'}
              </button>
            </div>
            <pre className="code-block">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={`message ${message.role}`}>
      {renderContent(message.text)}
    </div>
  );
};

const ContentApp = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [position, setPosition] = useState({ top: 20, right: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const abortControllerRef = useRef(null);

  const [messages, setMessages] = useState([{ role: 'ai', text: "Hello! I'm reading your screen. How can I help?" }]);
  const [input, setInput] = useState('');
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const messageListener = (request) => {
      if (request.action === 'toggle_ui') {
        setIsVisible((prev) => !prev);
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startTop: position.top,
      startRight: position.right
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        e.preventDefault();
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        const newTop = Math.max(0, Math.min(window.innerHeight - 100, dragStartRef.current.startTop + deltaY));
        const newRight = Math.max(0, Math.min(window.innerWidth - 100, dragStartRef.current.startRight - deltaX));

        setPosition({
          top: newTop,
          right: newRight
        });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages(prev => [...prev, { role: 'ai', text: "Stopped." }]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'ai', text: "API Key not configured. Please check your .env file." }]);
      return;
    }

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const screenText = getPageContent();
      const response = await generateResponse(apiKey, userMsg, screenText);

      if (abortControllerRef.current?.signal.aborted) return;

      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      if (error.name === 'AbortError') return;
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, something went wrong. Check your API key." }]);
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleScreenshotAsk = async () => {
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'ai', text: "API Key not configured. Please check your .env file." }]);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', text: "[Scanning Screen...]" }]);
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    chrome.runtime.sendMessage({ action: 'capture_screen' }, async (response) => {
      if (response && response.dataUrl) {
        try {
          const screenText = getPageContent();

          const prompt = `You are an Expert Senior Software Engineer & AI Assistant. Your goal is to be helpful, clear, and easy to understand.

ANALYZE THE SCREEN:
1. Identify the core problem or topic (coding question, error message, documentation, etc.).
2. Provide a brief, natural summary (2-3 sentences). Avoid complex jargon unless necessary.

RULES FOR INTERACTION:
1. **Readability is Key**: Use plain English. Avoid "walls of symbols" or excessive mathematical notation.
2. **Explain Like a Mentor**: When explaining logic, break it down into simple steps.
   - Example: "First, we check if the list is empty. Then, we look at each number one by one..."
   - NOT: "Let $S$ be the set of..."
3. **General Debugging**: You are here to help with ANY technical issue, not just LeetCode. If you see an error, explain what it means and how to fix it.
4. **Code Solutions**:
   - ONLY provide code if the user explicitly asks (e.g., "solve this", "show code").
   - If asked, provide clean, optimized code with comments.
   - After the code, explain *why* it works and the time/space complexity in simple terms.

Format code solutions like this ONLY when asked:
\`\`\`language
code here
\`\`\`

Be friendly, professional, and focus on clarity!`;

          const aiResponse = await generateResponse(apiKey, prompt, screenText, response.dataUrl);

          if (abortControllerRef.current?.signal.aborted) return;

          setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
        } catch (e) {
          if (e.name === 'AbortError') return;
          setMessages(prev => [...prev, { role: 'ai', text: "Failed to analyze image." }]);
        } finally {
          abortControllerRef.current = null;
          setIsLoading(false);
        }
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: "Failed to capture screen." }]);
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    });
  };

  if (!isVisible) return null;

  return (
    <div
      className="ai-overlay-container"
      style={{ top: `${position.top}px`, right: `${position.right}px` }}
    >
      <div className="glass-panel floating-bar">
        <div
          className="icon-btn"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          title="Drag to move"
        >
          <Move size={16} />
        </div>
        <button
          className={`icon-btn ${isChatOpen ? 'active' : ''}`}
          onClick={() => setIsChatOpen(!isChatOpen)}
          title="Chat"
        >
          <MessageSquare size={20} />
        </button>
        <button
          className="icon-btn"
          onClick={handleScreenshotAsk}
          title="Scan Screen"
        >
          <Monitor size={20} />
        </button>
        <button className="icon-btn" title="Voice (Coming Soon)">
          <Mic size={20} />
        </button>
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }}></div>
        <button className="icon-btn" onClick={() => setIsVisible(false)}>
          <X size={20} />
        </button>
      </div>

      {isChatOpen && (
        <div className="glass-panel chat-window">
          <div className="chat-header">
            <span>AI Assistant</span>
            <button className="icon-btn" onClick={() => setIsChatOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
            {isLoading && <div className="message ai loading-pulse">Thinking...</div>}
          </div>
          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              disabled={isLoading}
            />
            {isLoading ? (
              <button className="icon-btn stop-btn" onClick={handleStop} title="Stop">
                <Square size={18} />
              </button>
            ) : (
              <button className="icon-btn active" onClick={handleSend}>
                <Send size={18} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentApp;
