import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

const CONTEXTUAL_MESSAGES = {
  "choose-path": "Welcome. Pick the path that fits -- I'll tailor everything from there.",
  "business-basics": "Just the essentials. I'll use this to configure your AI assistant and compliance rules.",
  integrations: "Tell me what you already use. I'll build the connectors so your data flows in automatically.",
  "data-import": "You can upload your own files or explore with sample data. Either way, you'll see value in about 60 seconds.",
  "first-value": "I already scanned your data and found a few things worth your attention.",
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
  inventory: "Your inventory hub. I can look up any vehicle, check aging, and recommend pricing actions.",
  customers: "Your customer database. I can pull up any customer's history, identify outreach opportunities, and draft communications.",
  "fi-products": "Your F&I product catalog. I can match products to any customer profile and calculate payment impacts.",
  "auto-service": "Your service schedule. I can identify upsell opportunities, draft service reminders, and flag warranty expirations.",
  "sales-pipeline": "Your active deals. I can prioritize follow-ups, draft communications, and recommend next steps for each deal.",
};

const PERSONAL_CONTEXTUAL_MESSAGES = {
  dashboard: "Welcome to your Vault. This is your personal command center -- vehicles, properties, documents, and certifications all in one place.",
  "my-vehicles": "Your vehicle records. I can help you add a new vehicle, look up a VIN, or check on registration and insurance status.",
  "my-properties": "Your property records. I can help you add a property, track mortgage details, or organize tax and insurance documents.",
  "my-documents": "Your important documents. I can help you store and organize IDs, contracts, tax records, insurance policies, and anything else that matters.",
  "my-certifications": "Your certifications and credentials. I can help you add licenses, track expiration dates, and set up renewal reminders.",
  "my-logbook": "Your activity logbook. Every Digital Title Certificate and action is recorded here permanently.",
  settings: "Your Vault settings. You can update your profile, configure your AI assistant, and manage notification preferences.",
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

  // Conversation queue: pending actions for customers with in-progress discussions
  const [pendingActions, setPendingActions] = useState([]);

  // Listen for "discuss with AI" events from other components
  useEffect(() => {
    function handleChatPrompt(e) {
      const msg = e.detail?.message;
      if (e.detail?.dealContext) {
        setDealContext(e.detail.dealContext);
      }
      // Track customer context from dispatched prompts
      const customer = e.detail?.customerName || extractCustomerName(msg);
      if (customer) {
        // If there's an active discussion about a different customer, bookmark it
        if (dealContext?.customerName && dealContext.customerName !== customer) {
          setPendingActions(prev => {
            const exists = prev.find(p => p.customerName === dealContext.customerName);
            if (exists) return prev;
            return [...prev, {
              customerName: dealContext.customerName,
              actionType: "draft",
              status: "pending",
              context: dealContext.summary || "Discussion in progress",
              createdAt: new Date().toISOString(),
            }];
          });
        }
        setDealContext(prev => ({ ...prev, customerName: customer, summary: msg }));
      }
      if (msg) {
        setInput(msg);
        setTimeout(() => sendMessage(null, msg), 200);
      }
    }
    window.addEventListener('ta:chatPrompt', handleChatPrompt);
    return () => window.removeEventListener('ta:chatPrompt', handleChatPrompt);
  }, [dealContext]);

  function extractCustomerName(msg) {
    if (!msg) return null;
    // Match common patterns: "for Maria Gonzalez", "about Amanda Liu", customer names after "--"
    const patterns = [
      /(?:for|about|regarding|on)\s+([A-Z][a-z]+ [A-Z][a-z]+)/,
      /--\s*([A-Z][a-z]+ [A-Z][a-z]+)/,
    ];
    for (const p of patterns) {
      const m = msg.match(p);
      if (m) return m[1];
    }
    return null;
  }

  function resumePendingAction(action) {
    setPendingActions(prev => prev.filter(p => p.customerName !== action.customerName));
    setDealContext({ customerName: action.customerName, summary: action.context });
    setInput(`Let's get back to ${action.customerName}. ${action.context}`);
  }

  function dismissPendingAction(customerName) {
    setPendingActions(prev => prev.filter(p => p.customerName !== customerName));
  }

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
      // Check if user arrived from landing page discovery chat
      const rawCtx = sessionStorage.getItem("ta_discovered_context");
      if (rawCtx) {
        try {
          const dCtx = JSON.parse(rawCtx);
          if (dCtx.vertical) {
            const greeting = "Welcome! I set up your workspace based on our conversation. Take a look around and let me know if anything needs adjusting.";
            setMessages([{ role: 'assistant', content: greeting, isSystem: true }]);
            sessionStorage.removeItem("ta_discovered_context");
            return;
          }
        } catch (e) { /* ignore parse errors */ }
      }
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

      const tenantIdFilter = localStorage.getItem('TENANT_ID') || localStorage.getItem('WORKSPACE_ID');
      const constraints = [
        where('userId', '==', currentUser.uid),
        ...(tenantIdFilter ? [where('tenantId', '==', tenantIdFilter)] : []),
        orderBy('createdAt', 'asc'),
        limit(50),
      ];

      if (platformSid) {
        constraints.splice(tenantIdFilter ? 2 : 1, 0, where('sessionId', '==', platformSid));
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

  async function sendMessage(e, overrideMessage) {
    e?.preventDefault();
    const messageToSend = (overrideMessage || input).trim();
    if (!messageToSend || isSending) return;

    if (!currentUser) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Please sign in to use the AI assistant.',
        isError: true,
      }]);
      return;
    }

    let userMessage = messageToSend;
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
      const tenantId = localStorage.getItem('TENANT_ID') || localStorage.getItem('WORKSPACE_ID') || '';
      const vertical = localStorage.getItem('VERTICAL') || 'auto';
      const jurisdiction = localStorage.getItem('JURISDICTION') || '';

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
            workspaceId: localStorage.getItem('WORKSPACE_ID') || '',
            workspaceName: localStorage.getItem('WORKSPACE_NAME') || '',
            ...(dealContext ? { dealContext } : {}),
            ...(pendingActions.length > 0 ? { pendingActions: pendingActions.map(a => ({ customerName: a.customerName, actionType: a.actionType, context: a.context })) } : {}),
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
          try {
            const cfg = JSON.parse(localStorage.getItem('COS_CONFIG') || '{}');
            return cfg.name ? `${cfg.name} -- AI Assistant` : 'AI Assistant';
          } catch { return 'AI Assistant'; }
        })()}</span>
      </div>

      <div className="chatPanelMessages" ref={conversationRef}>
        {/* Pending action chips */}
        {pendingActions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "8px 12px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
            {pendingActions.map(a => (
              <div
                key={a.customerName}
                onClick={() => resumePendingAction(a)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px",
                  borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a",
                }}
              >
                <span>{a.customerName}</span>
                <span style={{ fontSize: "10px", opacity: 0.7 }}>draft</span>
                <button
                  onClick={(e) => { e.stopPropagation(); dismissPendingAction(a.customerName); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e", fontSize: "14px", padding: 0, lineHeight: 1 }}
                >x</button>
              </div>
            ))}
            {dealContext?.customerName && (
              <div style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px",
                borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe",
              }}>
                <span>{dealContext.customerName}</span>
                <span style={{ fontSize: "10px", opacity: 0.7 }}>active</span>
              </div>
            )}
          </div>
        )}

        {messages.length === 0 && !isTyping && (
          <div className="chat-welcome">
            {(() => {
              const v = localStorage.getItem('VERTICAL') || 'auto';
              if (v === 'consumer') {
                let cosName = 'your AI assistant';
                try {
                  const cfg = JSON.parse(localStorage.getItem('COS_CONFIG') || '{}');
                  if (cfg.name) cosName = `${cfg.name}, your AI assistant`;
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
              if (v === 'auto') {
                return currentUser ? (
                  <>
                    <p>Good evening. I've been reviewing the lot and customer database. Here's what I found:</p>
                    <p>Maria Gonzalez's Corolla lease expires in 60 days -- she's a cash buyer. I've matched her to 3 vehicles in stock.</p>
                    <p>The BMW X3 on the used lot is at 143 days. I recommend marking it down to $31,999 and pushing it to Marketplace.</p>
                    <p>Charles Cox is due for his 60K service -- his factory warranty is about to expire. Good opportunity to pitch Extra Care Gold.</p>
                    <p>Want me to start with any of these?</p>
                  </>
                ) : (
                  <p>Please sign in to start chatting.</p>
                );
              }
              let cosLabel = 'your AI assistant';
              try {
                const cfg2 = JSON.parse(localStorage.getItem('COS_CONFIG') || '{}');
                if (cfg2.name) cosLabel = `${cfg2.name}, your AI assistant`;
              } catch {}
              return (
                <>
                  <p>Hi. I'm {cosLabel}.</p>
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
            rows={3}
            disabled={isSending || fileUploading}
            style={{ minHeight: '72px' }}
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
