import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import './FloatingChat.css';

export default function FloatingChat({ demoMode = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(demoMode ? [
    { role: 'assistant', content: 'Hi! I\'m your Velocity Motors AI assistant. Ask me about customer inquiries, inventory, service appointments, or trade-in valuations.' },
    { role: 'user', content: 'Show me pending customer inquiries' },
    { role: 'assistant', content: 'You have 4 pending customer inquiries:\n\n1. Sarah Chen - 2024 Honda Accord EX-L - Financing options\n2. Mike Torres - Trade-in evaluation for 2019 Toyota Camry\n3. Lisa Park - Service appointment for brake inspection\n4. James Wilson - Test drive request for 2025 Mazda CX-5\n\nWould you like to respond to any of these?' }
  ] : []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const conversationRef = useRef(null);

  const auth = demoMode ? null : getAuth();
  const db = demoMode ? null : getFirestore();
  const currentUser = auth?.currentUser;

  // Load conversation history when chat opens
  useEffect(() => {
    if (!demoMode && isOpen && currentUser && messages.length === 0) {
      loadConversationHistory();
    }
  }, [isOpen, currentUser]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  async function loadConversationHistory() {
    try {
      const q = query(
        collection(db, 'messageEvents'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'asc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      const loadedMessages = [];

      snapshot.forEach((doc) => {
        const evt = doc.data();
        if (evt.type === 'chat:message:received') {
          loadedMessages.push({ role: 'user', content: evt.message });
        } else if (evt.type === 'chat:message:responded') {
          loadedMessages.push({ role: 'assistant', content: evt.response });
        }
      });

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessage = input.trim();
    setInput('');
    setIsSending(true);

    // Add user message optimistically
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // Show typing indicator
    setIsTyping(true);

    // Demo mode - mock response
    if (demoMode) {
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `This is a demo response to: "${userMessage}"\n\nIn production, I'll connect to Claude/ChatGPT and provide real assistance with your records and documents. Enable Firebase Auth to see the full experience!`
        }]);
        setIsSending(false);
      }, 1500);
      return;
    }

    try {
      const token = await currentUser.getIdToken();

      const response = await fetch('https://titleapp-frontdoor.titleapp-core.workers.dev/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': 'public'
        },
        body: JSON.stringify({
          message: userMessage,
          context: { source: 'consumer_admin' },
          preferredModel: 'claude'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      // Remove typing indicator and add AI response
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response received.' }]);

    } catch (error) {
      console.error('Send failed:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: error.message || 'Failed to send message. Please try again.',
        isError: true
      }]);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        className={`floating-chat-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      <div className={`floating-chat-panel ${isOpen ? 'open' : ''}`}>
        <div className="chat-panel-header">
          <div className="chat-panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>AI Assistant</span>
          </div>
          <button
            className="chat-panel-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="chat-panel-conversation" ref={conversationRef}>
          {messages.length === 0 && !isTyping && (
            <div className="chat-welcome">
              <p>👋 Hi! I'm your AI assistant.</p>
              <p>Ask me anything about your records, documents, or help managing your assets.</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
              <div className="chat-bubble">{msg.content}</div>
            </div>
          ))}

          {isTyping && (
            <div className="chat-message assistant">
              <div className="chat-typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
        </div>

        <form className="chat-panel-input" onSubmit={sendMessage}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            rows={1}
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            aria-label="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>

      {/* Overlay */}
      {isOpen && <div className="floating-chat-overlay" onClick={() => setIsOpen(false)} />}
    </>
  );
}
