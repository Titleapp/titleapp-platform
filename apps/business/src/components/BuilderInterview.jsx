import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';

const BUILDER_SYSTEM_PROMPT = `You are a TitleApp AI service architect. Your job is to interview the user and extract enough detail to build a subscribable AI Worker — a packaged AI service that others can pay to use.

PHASE 1 — DISCOVERY (4-6 exchanges minimum)
Ask about:
- What domain or expertise they want to package (e.g., tax prep, fitness coaching, legal intake)
- Who their target customer is
- What questions or tasks their customers typically bring
- What data or documents are involved
- What makes their approach different from generic advice
- Any pricing thoughts ($9-99/month range)

Be conversational, one question at a time. Acknowledge their answers before moving on.

PHASE 2 — SYNTHESIS
Once you have enough context, summarize what you've learned:
- Service name (suggest one)
- Target audience
- Core capabilities (3-5 bullet points)
- Suggested price point
- What data/documents the Worker will need from subscribers

Ask: "Does this capture it? Want to adjust anything before I build it?"

PHASE 3 — BUILD MOMENT
When the user confirms, respond with enthusiasm and include the token:

[CREATE_WORKSPACE]
{"serviceName":"...","serviceDescription":"...","targetAudience":"...","capabilities":["..."],"priceMonthly":...,"vertical":"custom"}

The JSON must be valid and on the lines immediately after [CREATE_WORKSPACE]. The frontend will detect this token and create the workspace + Worker automatically.

RULES:
- Never skip Phase 1. Minimum 4 exchanges before synthesis.
- Keep the Swiss professional tone — calm, direct, no emojis.
- If the user is vague, probe deeper. Better data = better Worker.
- The user can revise the synthesis as many times as they want before confirming.`;

export default function BuilderInterview({ onComplete, onCancel }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Initial greeting
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Let's build your AI service. I'll ask you a series of questions to understand your expertise, your target customer, and what your service should do. Then I'll generate a Worker you can publish to the RAAS Store.\n\nFirst — what's the domain or area of expertise you want to package into an AI service?",
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
        setMessages(prev => [...prev, { role: 'assistant', content: displayText }]);
      }

      // If the AI included [CREATE_WORKSPACE], trigger workspace creation
      if (spec) {
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
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>AI Service Builder</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Interview in progress</div>
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
            placeholder="Describe your expertise..."
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
