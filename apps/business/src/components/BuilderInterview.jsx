import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';

const BUILDER_SYSTEM_PROMPT = `You are Alex, the AI assistant for TitleApp. You're helping someone build their own AI service (called a "Worker") that others can subscribe to on the TitleApp RAAS Store.

Your job is to have a genuine, warm conversation that extracts enough information to generate their Worker. You're like a great podcast interviewer — you make people feel brilliant about what they know.

CONVERSATION FLOW:

Phase 1 — Discovery (4-5 exchanges minimum)
Ask about:
- What they're an expert in. What do people always come to them for?
- Who needs this knowledge. Who would pay for an AI that knows what they know?
- Their specific process or workflow. How do they approach problems in their domain?
- What makes their approach unique. What's their secret sauce?

Be genuinely curious. Reflect back what you hear. Build excitement.
Example: "Oh wow, so you've basically built a whole system for [X] over the years. And most people in [field] don't know this stuff — they'd kill to have someone like you guiding them..."

Phase 2 — Synthesis (1-2 exchanges)
After you have a solid understanding (minimum 4 user messages), summarize everything into a Worker concept. Present it like you're pitching them their own product:

"Ok, I think I'm seeing something really cool here. Based on everything you've told me, here's what I think your AI service could look like:

**[Worker Name]** — [one-line description]

What it does:
- [Key capability 1]
- [Key capability 2]
- [Key capability 3]

Who it's for: [target audience]
Suggested price: [$X/month]

The magic is that subscribers would get an AI that thinks like you — someone who's spent [X years] doing this and knows all the shortcuts, pitfalls, and insider knowledge."

Ask if they want to adjust anything.

Phase 3 — The Build Moment
When they confirm (or after adjustments), say something like:

"Alright, I'm genuinely excited about this one. Let me build it out for you — I'll create your workspace, set up your Worker with all the rules and workflows we discussed, and you'll be able to preview everything before it goes live. Give me just a moment..."

Then on a new line at the very end of your message, emit this token followed by a JSON object:
[CREATE_WORKSPACE]{"serviceName":"Worker Name","serviceDescription":"One line description","capabilities":["cap1","cap2","cap3"],"targetAudience":"target audience","priceMonthly":9,"rules":["rule1","rule2","rule3"],"vertical":"custom"}

RULES:
- NEVER rush. Minimum 4 user messages before proposing the Worker concept.
- NEVER mention workspace creation, dashboards, or technical details during the interview.
- Be warm, excited, genuinely curious. Not corporate or stiff.
- If their idea is vague, help them sharpen it through questions. Don't just accept vagueness.
- Pricing suggestion should be reasonable ($5-49/month depending on value and audience).
- Keep messages conversational length — 2-4 short paragraphs max. Not walls of text.
- The [CREATE_WORKSPACE] token must ONLY appear ONCE, at the very end of Phase 3, AFTER the user has confirmed the concept.`;

const REGULATED_DOMAINS = [
  {
    keywords: ["financial", "investment", "securities", "trading", "portfolio", "hedge fund", "wealth management"],
    domain: "financial",
    notice: "Platform notice: AI services in financial domains must include a disclaimer that they do not provide investment advice. This will be automatically added to your Worker.",
  },
  {
    keywords: ["medical", "health", "diagnosis", "treatment", "clinical", "patient", "therapy", "prescription"],
    domain: "medical",
    notice: "Platform notice: AI services in health domains must include a disclaimer that they do not provide medical advice. This will be automatically added to your Worker.",
  },
  {
    keywords: ["legal", "attorney", "law firm", "contract review", "litigation", "compliance"],
    domain: "legal",
    notice: "Platform notice: AI services in legal domains must include a disclaimer that they do not provide legal advice. This will be automatically added to your Worker.",
  },
  {
    keywords: ["real estate", "property", "mortgage", "title", "brokerage", "listings"],
    domain: "real-estate",
    notice: "Platform notice: AI services in real estate must include appropriate licensing disclaimers. This will be automatically added to your Worker.",
  },
];

function detectRegulatedDomain(text) {
  const lower = text.toLowerCase();
  for (const domain of REGULATED_DOMAINS) {
    if (domain.keywords.some(kw => lower.includes(kw))) {
      return domain;
    }
  }
  return null;
}

export default function BuilderInterview({ onComplete, onCancel }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState('');
  const [regulatedDomainWarned, setRegulatedDomainWarned] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Initial greeting
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Hey! I'm excited to help you build an AI service. Let's figure out what yours should look like.\n\nWhat's something you know a LOT about — the thing people always come to you for?",
    }]);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  async function createWorkspaceAndWorker(spec) {
    setCreating(true);
    setCreateStatus('Creating your workspace...');

    try {
      const token = await currentUser.getIdToken();
      const apiBase = import.meta.env.VITE_API_BASE || 'https://titleapp-frontdoor.titleapp-core.workers.dev';

      // Step 1: Create workspace
      const wsResp = await fetch(`${apiBase}/api?path=/v1/workspaces`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vertical: 'custom',
          name: spec.serviceName || 'My AI Service',
          tagline: spec.serviceDescription || '',
          jurisdiction: 'GLOBAL',
        }),
      });
      const wsData = await wsResp.json();

      if (!wsData.ok) {
        throw new Error(wsData.error || 'Failed to create workspace');
      }

      const workspace = wsData.workspace;
      setCreateStatus('Building your AI Worker...');

      // Step 2: Create Worker document
      const workerResp = await fetch(`${apiBase}/api?path=/v1/workers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Id': workspace.id,
        },
        body: JSON.stringify({
          name: spec.serviceName || 'My AI Service',
          description: spec.serviceDescription || '',
          targetAudience: spec.targetAudience || '',
          capabilities: spec.capabilities || [],
          priceMonthly: spec.priceMonthly || 900,
          vertical: 'custom',
          status: 'draft',
        }),
      });

      const workerData = await workerResp.json();

      // Even if Worker creation fails, workspace is valid
      if (workerData.ok && workerData.worker) {
        localStorage.setItem('BUILDER_WORKER_ID', workerData.worker.id || '');
      }

      setCreateStatus('Done. Launching your workspace...');

      // Set localStorage for the workspace
      localStorage.setItem('VERTICAL', 'custom');
      localStorage.setItem('WORKSPACE_ID', workspace.id);
      localStorage.setItem('WORKSPACE_NAME', workspace.name);
      localStorage.setItem('COMPANY_NAME', workspace.name);
      localStorage.setItem('TENANT_ID', workspace.id);

      // Small delay for the user to see the success state
      await new Promise(r => setTimeout(r, 1200));

      onComplete(workspace);
    } catch (err) {
      console.error('Builder workspace creation failed:', err);
      setCreating(false);
      setCreateStatus('');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Something went wrong creating the workspace: ${err.message}. Let's try again — just say "build it" when you're ready.`,
      }]);
    }
  }

  function parseCreateToken(text) {
    const tokenIdx = text.indexOf('[CREATE_WORKSPACE]');
    if (tokenIdx === -1) return null;

    const afterToken = text.substring(tokenIdx + '[CREATE_WORKSPACE]'.length).trim();
    // Try to find JSON block
    const jsonMatch = afterToken.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  function stripCreateToken(text) {
    const tokenIdx = text.indexOf('[CREATE_WORKSPACE]');
    if (tokenIdx === -1) return text;
    return text.substring(0, tokenIdx).trim();
  }

  async function sendMessage(e) {
    e?.preventDefault();
    const messageToSend = input.trim();
    if (!messageToSend || isSending || creating) return;

    if (!currentUser) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Please sign in to continue.',
      }]);
      return;
    }

    setInput('');
    setIsSending(true);
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setIsTyping(true);

    try {
      const token = await currentUser.getIdToken();
      const apiBase = import.meta.env.VITE_API_BASE || 'https://titleapp-frontdoor.titleapp-core.workers.dev';

      // Build conversation history for context
      const history = [...messages, { role: 'user', content: messageToSend }];

      const response = await fetch(`${apiBase}/api?path=/v1/chat:message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          context: {
            source: 'builder_interview',
            systemPrompt: BUILDER_SYSTEM_PROMPT,
            conversationHistory: history.map(m => ({
              role: m.role,
              content: m.content,
            })),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setIsTyping(false);

      const aiText = data.response || 'No response received.';
      const spec = parseCreateToken(aiText);
      const displayText = stripCreateToken(aiText);

      if (displayText) {
        setMessages(prev => {
          const updated = [...prev, { role: 'assistant', content: displayText }];

          // Check for regulated domain keywords across entire conversation
          if (!regulatedDomainWarned) {
            const allText = updated.map(m => m.content).join(' ');
            const detected = detectRegulatedDomain(allText);
            if (detected) {
              setRegulatedDomainWarned(detected.domain);
              updated.push({ role: 'system', content: detected.notice });
            }
          }

          return updated;
        });
      }

      // If the AI included [CREATE_WORKSPACE], trigger workspace creation
      if (spec) {
        // Include compliance flags if regulated domain was detected
        if (regulatedDomainWarned) {
          spec.complianceFlags = { regulatedDomain: regulatedDomainWarned, disclaimerRequired: true };
        }
        await createWorkspaceAndWorker(spec);
      }
    } catch (err) {
      console.error('Builder chat failed:', err);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err.message || 'Failed to send message. Please try again.',
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

  // Creating overlay
  if (creating) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
      }}>
        <div style={{
          width: 64, height: 64, marginBottom: 24,
          animation: 'spinKey 1.5s ease-in-out infinite',
        }}>
          <svg width="64" height="64" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="95" fill="#7c3aed"/>
            <circle cx="100" cy="100" r="80" fill="#7c3aed" stroke="white" strokeWidth="2"/>
            <circle cx="100" cy="100" r="70" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3,5"/>
            <circle cx="100" cy="80" r="18" fill="white"/>
            <circle cx="100" cy="80" r="8" fill="#7c3aed"/>
            <rect x="94" y="90" width="12" height="35" fill="white"/>
            <rect x="94" y="115" width="8" height="4" fill="white"/>
            <rect x="94" y="122" width="5" height="3" fill="white"/>
          </svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
          {createStatus}
        </div>
        <div style={{ fontSize: 14, color: '#64748b' }}>
          This takes a few seconds
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f8fafc',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid #e2e8f0',
        background: 'white',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="28" height="28" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="95" fill="#7c3aed"/>
            <circle cx="100" cy="100" r="80" fill="#7c3aed" stroke="white" strokeWidth="2"/>
            <circle cx="100" cy="80" r="18" fill="white"/>
            <circle cx="100" cy="80" r="8" fill="#7c3aed"/>
            <rect x="94" y="90" width="12" height="35" fill="white"/>
            <rect x="94" y="115" width="8" height="4" fill="white"/>
            <rect x="94" y="122" width="5" height="3" fill="white"/>
          </svg>
          <div>
            <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: 18 }}>TitleApp AI</span>
            <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: 14 }}>Build an AI Service</span>
          </div>
        </div>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '6px 16px',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: 14,
          }}
        >
          Exit
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        maxWidth: 720,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>
        {messages.map((msg, idx) => (
          msg.role === 'system' ? (
            <div key={idx} style={{
              margin: '8px 0 16px',
              padding: '10px 14px',
              background: '#fefce8',
              border: '1px solid #fde68a',
              borderRadius: 8,
              fontSize: 12,
              color: '#92400e',
              lineHeight: 1.5,
            }}>
              {msg.content}
            </div>
          ) : (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 16,
            }}
          >
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? '#7c3aed' : 'white',
              color: msg.role === 'user' ? 'white' : '#1e293b',
              fontSize: 14,
              lineHeight: 1.6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
          )
        ))}

        {isTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '16px 16px 16px 4px',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <svg width="24" height="24" viewBox="0 0 200 200" fill="none" style={{ animation: 'spinKey 1.5s ease-in-out infinite' }}>
                <circle cx="100" cy="100" r="95" fill="#7c3aed"/>
                <circle cx="100" cy="100" r="80" fill="#7c3aed" stroke="white" strokeWidth="2"/>
                <circle cx="100" cy="100" r="70" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3,5"/>
                <circle cx="100" cy="80" r="18" fill="white"/>
                <circle cx="100" cy="80" r="8" fill="#7c3aed"/>
                <rect x="94" y="90" width="12" height="35" fill="white"/>
                <rect x="94" y="115" width="8" height="4" fill="white"/>
                <rect x="94" y="122" width="5" height="3" fill="white"/>
              </svg>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid #e2e8f0',
        background: 'white',
        flexShrink: 0,
      }}>
        <form
          onSubmit={sendMessage}
          style={{
            maxWidth: 720,
            margin: '0 auto',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me about your expertise..."
            rows={1}
            disabled={isSending}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: 12,
              fontSize: 14,
              lineHeight: 1.5,
              outline: 'none',
              resize: 'none',
              minHeight: 44,
              maxHeight: 120,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#7c3aed')}
            onBlur={e => (e.target.style.borderColor = '#d1d5db')}
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isSending || !input.trim() ? '#d1d5db' : '#7c3aed',
              border: 'none',
              cursor: isSending || !input.trim() ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
