import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

const CONTEXTUAL_MESSAGES = {
  terms: "This is our standard terms and liability agreement. Take a look and let me know if you have questions.",
  idVerify: "Quick identity check -- keeps your records secure and verified. $2, once a year.",
  details: "This is where we set your foundation. The jurisdiction matters because compliance rules vary by state.",
  raas: "Tell me how you want your AI assistant to work. I'll follow these rules in every interaction.",
  criteria: "This is your target box. Every deal gets screened against these numbers automatically.",
  sampleDeals: "Drop your deal memos here. I'll pull out the key data so you don't have to enter it manually.",
  dealerData: "Upload your dealership data. The more I know about your inventory and customers, the more I can help.",
  brokerage: "Tell me about your brokerage. I'll help you track listings, manage documents, and stay compliant.",
  propertyMgmt: "Let's set up your property portfolio. I'll help you track units, leases, and maintenance.",
  dashboard: "Welcome to your workspace. Everything starts from here -- your deals, your analysis, your pipeline.",
  analyst: "Your deal analysis hub. Upload deals and I'll screen them against your criteria.",
};

export default function ChatPanel({ currentSection, onboardingStep }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [lastContextStep, setLastContextStep] = useState(null);
  const conversationRef = useRef(null);

  // Listen for "discuss with AI" events from other components
  useEffect(() => {
    function handleChatPrompt(e) {
      if (e.detail?.message) {
        setInput(e.detail.message);
      }
    }
    window.addEventListener('ta:chatPrompt', handleChatPrompt);
    return () => window.removeEventListener('ta:chatPrompt', handleChatPrompt);
  }, []);

  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth?.currentUser;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser && authReady && messages.length === 0) {
      loadConversationHistory();
    }
  }, [currentUser, authReady]);

  // Send contextual messages when onboarding step or section changes
  useEffect(() => {
    const stepKey = onboardingStep || currentSection;
    if (stepKey && stepKey !== lastContextStep && stepKey !== 'checking' && stepKey !== 'welcome' && stepKey !== 'magic') {
      const contextMsg = CONTEXTUAL_MESSAGES[stepKey];
      if (contextMsg) {
        setLastContextStep(stepKey);
        // Small delay so it feels natural
        const timer = setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: contextMsg, isSystem: true }]);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [onboardingStep, currentSection]);

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  async function loadConversationHistory() {
    try {
      // Check for landing page session continuity
      const platformSid = sessionStorage.getItem('ta_platform_sid');

      const constraints = [
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'asc'),
        limit(50),
      ];

      if (platformSid) {
        constraints.splice(1, 0, where('sessionId', '==', platformSid));
      }

      const q = query(collection(db, 'messageEvents'), ...constraints);
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

      if (platformSid && loadedMessages.length > 0) {
        loadedMessages.push({
          role: 'assistant',
          content: 'Welcome to your business platform. Your onboarding steps are on the left -- I\'m right here if you need help.',
          isSystem: true,
        });
      }

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || isSending) return;

    if (!currentUser) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Please sign in to use the AI assistant.',
        isError: true,
      }]);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setIsSending(true);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const token = await currentUser.getIdToken();
      const tenantId = localStorage.getItem('TENANT_ID') || 'public';
      const vertical = localStorage.getItem('VERTICAL') || 'auto';
      const jurisdiction = localStorage.getItem('JURISDICTION') || 'IL';

      const apiBase = import.meta.env.VITE_API_BASE || 'https://titleapp-frontdoor.titleapp-core.workers.dev';
      const response = await fetch(`${apiBase}/api?path=/v1/chat:message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
          'X-Vertical': vertical,
          'X-Jurisdiction': jurisdiction,
        },
        body: JSON.stringify({
          message: userMessage,
          context: {
            source: 'business_portal',
            currentSection: currentSection || 'dashboard',
            vertical,
            jurisdiction,
          },
          preferredModel: 'claude',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'No response received.',
        structuredData: data.structuredData,
      }]);
    } catch (error) {
      console.error('Send failed:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: error.message || 'Failed to send message. Please try again.',
        isError: true,
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

  function renderStructuredData(data) {
    if (!data || typeof data !== 'object') return null;

    if (data.type === 'analyst_result') {
      return (
        <div className="structured-analyst-result">
          <div className="analyst-header">
            <span className="analyst-emoji">{data.verdict_emoji}</span>
            <h4>{data.verdict}</h4>
            <span className="analyst-score">{data.score}/100</span>
          </div>
          {data.summary && <p className="analyst-summary">{data.summary}</p>}
          {data.key_findings && data.key_findings.length > 0 && (
            <div className="analyst-findings">
              <h5>Key Findings:</h5>
              <ul>
                {data.key_findings.map((finding, i) => (
                  <li key={i}>{finding}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (data.type === 'dtc_preview') {
      return (
        <div className="structured-dtc-preview">
          <div className="dtc-header">
            <h4>{data.asset_type} DTC Preview</h4>
            {data.blockchain_verified && <span className="dtc-verified">Verified</span>}
          </div>
          {data.details && (
            <div className="dtc-details">
              {Object.entries(data.details).map(([key, value]) => (
                <div key={key} className="dtc-field">
                  <span className="dtc-label">{key}:</span>
                  <span className="dtc-value">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (data.type === 'trade_summary') {
      return (
        <div className="structured-trade-summary">
          <h4>Trade Summary</h4>
          <div className="trade-details">
            <div className="trade-field"><strong>Your Vehicle:</strong> {data.your_vehicle}</div>
            <div className="trade-field"><strong>Trade Value:</strong> ${data.trade_value?.toLocaleString()}</div>
            <div className="trade-field"><strong>New Vehicle:</strong> {data.new_vehicle}</div>
            <div className="trade-field"><strong>Price:</strong> ${data.new_price?.toLocaleString()}</div>
            <div className="trade-field"><strong>Net Cost:</strong> ${data.net_cost?.toLocaleString()}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="structured-generic">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="chatPanelContainer">
      <div className="chatPanelHeader">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>AI Assistant</span>
      </div>

      <div className="chatPanelMessages" ref={conversationRef}>
        {messages.length === 0 && !isTyping && (
          <div className="chat-welcome">
            <p>Hi. I'm your TitleApp AI assistant.</p>
            {currentUser ? (
              <p>Ask me anything about your records, documents, customers, inventory, or business operations.</p>
            ) : (
              <p>Please sign in to start chatting.</p>
            )}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
            <div className="chat-bubble">{msg.content}</div>
            {msg.structuredData && (
              <div className="chat-structured-data">
                {renderStructuredData(msg.structuredData)}
              </div>
            )}
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

      <form className="chatPanelInput" onSubmit={sendMessage}>
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
  );
}
