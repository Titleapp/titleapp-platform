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

const PERSONAL_CONTEXTUAL_MESSAGES = {
  dashboard: "Welcome to your Vault. This is your personal command center -- vehicles, properties, documents, and certifications all in one place.",
  "my-vehicles": "Your vehicle records. I can help you add a new vehicle, look up a VIN, or check on registration and insurance status.",
  "my-properties": "Your property records. I can help you add a property, track mortgage details, or organize tax and insurance documents.",
  "my-documents": "Your important documents. I can help you store and organize IDs, contracts, tax records, insurance policies, and anything else that matters.",
  "my-certifications": "Your certifications and credentials. I can help you add licenses, track expiration dates, and set up renewal reminders.",
  "my-logbook": "Your activity logbook. Every Digital Title Certificate and action is recorded here permanently.",
  settings: "Your Vault settings. You can update your profile, configure your Chief of Staff, and manage notification preferences.",
};

export default function ChatPanel({ currentSection, onboardingStep }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [lastContextStep, setLastContextStep] = useState(null);
  const conversationRef = useRef(null);

  const [dealContext, setDealContext] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const [fileUploading, setFileUploading] = useState(false);

  // Listen for "discuss with AI" events from other components
  useEffect(() => {
    function handleChatPrompt(e) {
      if (e.detail?.message) {
        setInput(e.detail.message);
      }
      if (e.detail?.dealContext) {
        setDealContext(e.detail.dealContext);
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
    const vertical = localStorage.getItem('VERTICAL') || 'auto';
    const isPersonal = vertical === 'consumer';
    if (stepKey && stepKey !== lastContextStep && stepKey !== 'checking' && stepKey !== 'welcome' && stepKey !== 'magic') {
      const contextMsg = isPersonal
        ? (PERSONAL_CONTEXTUAL_MESSAGES[stepKey] || CONTEXTUAL_MESSAGES[stepKey])
        : CONTEXTUAL_MESSAGES[stepKey];
      if (contextMsg) {
        setLastContextStep(stepKey);
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

    let userMessage = input.trim();
    const currentFile = attachedFile;
    if (currentFile) {
      userMessage += ` [File attached: ${currentFile.name}]`;
      setAttachedFile(null);
    }
    setInput('');
    setIsSending(true);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // Read file as base64 if attached
    let filePayload = null;
    if (currentFile) {
      setFileUploading(true);
      setMessages(prev => [...prev, { role: 'assistant', content: `Uploading ${currentFile.name}...`, isSystem: true }]);
      try {
        filePayload = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: currentFile.name, type: currentFile.type, data: reader.result });
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(currentFile);
        });
        setMessages(prev => {
          const updated = [...prev];
          const uploadIdx = updated.findLastIndex(m => m.isSystem && m.content.startsWith('Uploading '));
          if (uploadIdx >= 0) {
            updated[uploadIdx] = { ...updated[uploadIdx], content: `File ready: ${currentFile.name}` };
          }
          return updated;
        });
      } catch (err) {
        console.error('File read failed:', err);
        setMessages(prev => {
          const updated = [...prev];
          const uploadIdx = updated.findLastIndex(m => m.isSystem && m.content.startsWith('Uploading '));
          if (uploadIdx >= 0) {
            updated[uploadIdx] = { ...updated[uploadIdx], content: `Could not read ${currentFile.name}. Message sent without file.` };
          }
          return updated;
        });
      } finally {
        setFileUploading(false);
      }
    }

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
          ...(filePayload ? { file: filePayload } : {}),
          context: {
            source: 'business_portal',
            currentSection: currentSection || 'dashboard',
            vertical,
            jurisdiction,
            ...(dealContext ? { dealContext } : {}),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setIsTyping(false);
      setDealContext(null);

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

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function stopVoiceInput() {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }

  function renderStructuredData(data) {
    if (!data || typeof data !== 'object') return null;

    if (data.type === 'record_created') {
      const typeColors = { vehicle: '#7c3aed', property: '#22c55e', document: '#6366f1', certification: '#d97706', valuable: '#ec4899' };
      const typeLabels = { vehicle: 'Vehicle', property: 'Real Estate', document: 'Document', certification: 'Certification', valuable: 'Valuable' };
      const color = typeColors[data.recordType] || '#64748b';
      const label = typeLabels[data.recordType] || 'Record';
      const meta = data.metadata || {};
      const displayFields = Object.entries(meta).filter(([k, v]) => k !== 'title' && v);

      return (
        <div style={{ border: `2px solid ${color}30`, borderRadius: '14px', overflow: 'hidden', marginTop: '8px' }}>
          <div style={{ background: `${color}12`, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{meta.title || 'New Record'}</div>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: `${color}20`, color }}>{label}</span>
          </div>
          {displayFields.length > 0 && (
            <div style={{ padding: '10px 16px' }}>
              {displayFields.map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
                  <span style={{ color: '#64748b', flexShrink: 0, marginRight: '12px' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                  <span style={{ fontWeight: 500, color: '#1e293b', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Digital Title Certificate Created
            </span>
          </div>
        </div>
      );
    }

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
        <span>{(() => {
          const v = localStorage.getItem('VERTICAL') || 'auto';
          if (v === 'consumer') {
            try {
              const cfg = JSON.parse(localStorage.getItem('COS_CONFIG') || '{}');
              return cfg.name ? `${cfg.name} -- Chief of Staff` : 'Chief of Staff';
            } catch { return 'Chief of Staff'; }
          }
          return 'AI Assistant';
        })()}</span>
      </div>

      <div className="chatPanelMessages" ref={conversationRef}>
        {messages.length === 0 && !isTyping && (
          <div className="chat-welcome">
            {(() => {
              const v = localStorage.getItem('VERTICAL') || 'auto';
              if (v === 'consumer') {
                let cosName = 'your personal Chief of Staff';
                try {
                  const cfg = JSON.parse(localStorage.getItem('COS_CONFIG') || '{}');
                  if (cfg.name) cosName = `${cfg.name}, your Chief of Staff`;
                } catch {}
                return (
                  <>
                    <p>Hi. I'm {cosName}.</p>
                    {currentUser ? (
                      <p>I can help you manage your vehicles, properties, documents, and certifications. What would you like to do?</p>
                    ) : (
                      <p>Please sign in to start chatting.</p>
                    )}
                  </>
                );
              }
              return (
                <>
                  <p>Hi. I'm your TitleApp AI assistant.</p>
                  {currentUser ? (
                    <p>Ask me anything about your records, documents, customers, inventory, or business operations.</p>
                  ) : (
                    <p>Please sign in to start chatting.</p>
                  )}
                </>
              );
            })()}
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
        {attachedFile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: '#f1f5f9', borderRadius: '8px', fontSize: '12px', color: '#64748b', marginBottom: '4px', width: '100%' }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachedFile.name}</span>
            <button type="button" onClick={() => setAttachedFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', padding: '0 2px' }}>x</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', width: '100%' }}>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#94a3b8' }}
            aria-label="Attach file"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          </button>
          <button
            type="button"
            onClick={isRecording ? stopVoiceInput : startVoiceInput}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: isRecording ? '#ef4444' : 'transparent', border: isRecording ? 'none' : '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isRecording ? 'white' : '#94a3b8' }}
            aria-label={isRecording ? 'Stop recording' : 'Voice input'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            rows={1}
            disabled={isSending || fileUploading}
            style={{ minHeight: '48px' }}
          />
          <button
            type="submit"
            disabled={isSending || fileUploading || !input.trim()}
            aria-label="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </form>

    </div>
  );
}
