import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Copy, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import './GenieChat.css';
import chatGenie from '../assets/chat_genie.png';
import * as api from '../services/api';

// ── Suggested questions derived from user profile context ─────────
function getSuggestedQuestions(profile) {
  if (!profile) return [];
  const questions = [
    'How much tax will I pay this financial year?',
    'Is ELSS better than PPF for my tax bracket?',
    'What is my actual post-tax return on an FD right now?',
    'How much should I invest monthly to retire at 60?',
  ];
  if (profile.risk_appetite === 'High') {
    questions.unshift('Should I increase my equity allocation?');
  }
  if (profile.age > 45) {
    questions.unshift('How should I shift my portfolio as I near retirement?');
  }
  return questions.slice(0, 4);
}

// ── FAB Button ────────────────────────────────────────────────────
const GenieFAB = ({ onClick }) => (
  <button className="genie-fab" onClick={onClick} title="Ask Genie">
    <img src={chatGenie} alt="Genie AI" className="genie-fab-logo" />
    <span className="genie-fab-ring"></span>
  </button>
);

// ── Message Bubble ────────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--genie'}`}>
      {msg.role === 'assistant' && <div className="bubble-avatar">🧞</div>}
      <div className="bubble-body">
        <div className="bubble-text">
          <MessageContent content={msg.content} />
        </div>
        <div className="bubble-meta">
          <span className="bubble-time">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.role === 'assistant' && msg.latency_ms && (
            <span className="bubble-latency">{(msg.latency_ms / 1000).toFixed(1)}s</span>
          )}
          {msg.role === 'assistant' && (
            <button className="bubble-copy" onClick={handleCopy} title="Copy">
              {copied ? '✓' : <Copy size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Renders message content with basic markdown ───────────────────
function MessageContent({ content }) {
  const formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
  return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
}

// ── Quick Reply Chips ─────────────────────────────────────────────
const QuickReplies = ({ chips, onSelect }) => (
  <div className="quick-replies">
    {chips.map((chip, i) => (
      <button key={i} className="quick-chip" onClick={() => onSelect(chip)}>
        <Sparkles size={12} /> {chip}
      </button>
    ))}
  </div>
);

// ── Main Component ────────────────────────────────────────────────
const GenieChat = ({ profile, recommendations }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rateLimit, setRateLimit] = useState({ remaining: 30, total: 30 });
  const [sessionId, setSessionId] = useState(() => {
    const stored = sessionStorage.getItem('genie_session_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    sessionStorage.setItem('genie_session_id', newId);
    return newId;
  });

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load history on open
  useEffect(() => {
    if (isOpen && sessionId && messages.length === 0) {
      loadHistory();
    }
  }, [isOpen]);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadHistory = async () => {
    try {
      const data = await api.getChatHistory(sessionId);
      if (data.conversations?.[0]?.messages) {
        setMessages(data.conversations[0].messages.map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.content,
          timestamp: m.timestamp || new Date().toISOString(),
          latency_ms: m.metadata?.latency_ms,
        })));
      }
    } catch (_) {
      // New session — no history
    }
  };

  const sendMessage = useCallback(async (text) => {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;

    setInput('');
    setError(null);

    const userMsg = { role: 'user', content: messageText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const data = await api.sendChatMessage(messageText, sessionId);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        latency_ms: data.latency_ms,
      }]);

      setRateLimit({
        remaining: data.rate_limit_remaining,
        total: 30,
      });
    } catch (err) {
      const errorMsg = err.message || 'Genie is temporarily unavailable. Please try again.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, sessionId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    try {
      await api.clearChatSession(sessionId);
    } catch (_) {}
    setMessages([]);
    setError(null);
    setRateLimit({ remaining: 30, total: 30 });
    const newId = crypto.randomUUID();
    sessionStorage.setItem('genie_session_id', newId);
    setSessionId(newId);
  };

  const suggestedQuestions = getSuggestedQuestions(profile);

  return (
    <>
      {!isOpen && <GenieFAB onClick={() => setIsOpen(true)} />}

      {isOpen && (
        <div className="genie-panel">
          {/* ── Header ──────────────────────────────────── */}
          <div className="genie-panel-header">
            <div className="genie-header-left">
              <span className="genie-avatar">🧞</span>
              <div>
                <div className="genie-header-title">Genie</div>
                <div className="genie-header-sub">
                  <span className="online-dot"></span> Your Financial Advisor
                </div>
              </div>
            </div>
            <div className="genie-header-actions">
              <span className="rate-limit-badge">
                {rateLimit.remaining}/{rateLimit.total}
              </span>
              <button onClick={clearChat} title="Clear chat"><Trash2 size={16} /></button>
              <button onClick={() => setIsOpen(false)} title="Close"><X size={18} /></button>
            </div>
          </div>

          {/* ── Messages ────────────────────────────────── */}
          <div className="genie-messages">
            {messages.length === 0 && !isLoading && (
              <div className="genie-welcome">
                <span style={{ fontSize: '2.5rem' }}>🧞</span>
                <p>Hi{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! I'm <strong>Genie</strong>, your personal financial advisor.</p>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Ask me anything about your investments, tax planning, or financial goals. I have your complete profile loaded.
                </p>
                {suggestedQuestions.length > 0 && (
                  <div className="welcome-suggestions">
                    {suggestedQuestions.map((q, i) => (
                      <button key={i} className="suggestion-pill" onClick={() => sendMessage(q)}>
                        <Sparkles size={12} /> {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {isLoading && (
              <div className="chat-bubble chat-bubble--genie">
                <div className="bubble-avatar">🧞</div>
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            {error && (
              <div className="chat-error-banner">{error}</div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ── Quick Replies ───────────────────────────── */}
          {messages.length > 0 && !isLoading && (
            <QuickReplies
              chips={['Tell me more', 'How does this affect my taxes?', 'What are the risks?']}
              onSelect={sendMessage}
            />
          )}

          {/* ── Input Bar ──────────────────────────────── */}
          <div className="genie-input-bar">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Genie about your investments, tax, or goals..."
              className="genie-input"
              maxLength={1000}
              disabled={isLoading || rateLimit.remaining === 0}
            />
            <button
              className="genie-send-btn"
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim() || rateLimit.remaining === 0}
            >
              {isLoading ? <RefreshCw size={18} className="spin-icon" /> : <Send size={18} />}
            </button>
          </div>

          {/* ── Disclaimer ─────────────────────────────── */}
          <div className="genie-disclaimer">
            ⚠️ For informational purposes only. Not registered investment advice.
          </div>
        </div>
      )}
    </>
  );
};

export default GenieChat;
