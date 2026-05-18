import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Copy, Trash2, Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus, Shield, Target, BarChart3, Zap, AlertTriangle, DollarSign, ChevronRight, ThumbsUp, ThumbsDown, Mic, MicOff } from 'lucide-react';
import './GenieChat.css';
import chatGenie from '../assets/chat_genie.png';
import * as api from '../services/api';

// ── Suggested questions ───────────────────────────────────────────
function getSuggestedQuestions(profile) {
  if (!profile) return [];
  const questions = [
    'How should I rebalance my portfolio?',
    'How much tax will I save with ELSS?',
    'What is my ideal SIP amount for retirement?',
    'Should I increase my equity allocation?',
  ];
  if (profile.risk_appetite === 'High') questions.unshift('Can I take more risk for higher returns?');
  if (profile.age > 45) questions.unshift('How should I shift my portfolio as I near retirement?');
  return questions.slice(0, 4);
}

// ── Parse ACTION_CARD blocks from AI response ─────────────────────
function parseActionCards(text) {
  const cards = [];
  const regex = /<<<ACTION_CARD>>>\s*([\s\S]*?)\s*<<<END_ACTION_CARD>>>/g;
  let match;
  let cleanText = text;
  while ((match = regex.exec(text)) !== null) {
    try {
      let jsonStr = match[1].replace(/^```json?\s*/gm, '').replace(/^```\s*$/gm, '').trim();
      const card = JSON.parse(jsonStr);
      cards.push(card);
      cleanText = cleanText.replace(match[0], '');
    } catch (e) {
      console.warn('[GenieChat] Failed to parse action card:', e.message);
    }
  }
  return { cleanText: cleanText.trim(), cards };
}

// ── Severity theme config ─────────────────────────────────────────
const severityColors = {
  info: { bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.25)', accent: '#38bdf8', glow: 'rgba(56,189,248,0.15)' },
  success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', accent: '#22c55e', glow: 'rgba(34,197,94,0.15)' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', accent: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
  critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', accent: '#ef4444', glow: 'rgba(239,68,68,0.15)' },
};
const cardIcons = { rebalance: <BarChart3 size={18}/>, sip_stepup: <TrendingUp size={18}/>, tax_save: <Shield size={18}/>, goal_insight: <Target size={18}/>, market_alert: <AlertTriangle size={18}/>, fee_xray: <DollarSign size={18}/> };
const trendIcons = { up: <TrendingUp size={13} style={{color:'#22c55e'}}/>, down: <TrendingDown size={13} style={{color:'#ef4444'}}/>, neutral: <Minus size={13} style={{color:'#64748b'}}/> };

// ── Sparkline Mini-Chart (inline bar chart for metrics) ───────────
function SparkBars({ data, color }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data);
  return (
    <div className="spark-bars">
      {data.map((v, i) => (
        <div key={i} className="spark-bar" style={{ height: `${(v / max) * 100}%`, background: color || '#38bdf8', opacity: 0.4 + (i / data.length) * 0.6 }} />
      ))}
    </div>
  );
}

// ── Action Card Component ─────────────────────────────────────────
function ActionCard({ card, onAction }) {
  const colors = severityColors[card.severity] || severityColors.info;
  const icon = cardIcons[card.type] || <Zap size={18}/>;
  const [executed, setExecuted] = useState(null);

  const handleAction = (action) => {
    if (action.action === 'navigate' && action.target) window.location.hash = action.target;
    setExecuted(action.label);
    if (onAction) onAction(action);
  };

  return (
    <div className="action-card" style={{ '--ac-bg': colors.bg, '--ac-border': colors.border, '--ac-accent': colors.accent, '--ac-glow': colors.glow }}>
      <div className="ac-header">
        <div className="ac-icon-wrap" style={{ color: colors.accent }}>{icon}</div>
        <div className="ac-header-text">
          <div className="ac-title">{card.title}</div>
          <div className="ac-subtitle">{card.subtitle}</div>
        </div>
        <div className="ac-severity-dot" style={{ background: colors.accent }} />
      </div>
      {card.metrics?.length > 0 && (
        <div className="ac-metrics">
          {card.metrics.map((m, i) => (
            <div key={i} className="ac-metric">
              <div className="ac-metric-label">{m.label}</div>
              <div className="ac-metric-value">{m.value}{m.trend && <span className="ac-trend">{trendIcons[m.trend]}</span>}</div>
            </div>
          ))}
        </div>
      )}
      {card.sparkData && <SparkBars data={card.sparkData} color={colors.accent} />}
      {card.insight && (
        <div className="ac-insight">
          <Sparkles size={12} style={{ color: colors.accent, flexShrink: 0, marginTop: 2 }} />
          <span>{card.insight}</span>
        </div>
      )}
      {card.actions?.length > 0 && (
        <div className="ac-actions">
          {card.actions.map((action, i) => (
            <button key={i} className={`ac-btn ${i === 0 ? 'ac-btn-primary' : 'ac-btn-secondary'} ${executed === action.label ? 'ac-btn-executed' : ''}`} onClick={() => handleAction(action)} disabled={!!executed} style={i === 0 ? { '--btn-accent': colors.accent } : {}}>
              {executed === action.label ? <>✓ Done</> : <>{action.label}<ChevronRight size={14} /></>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Confidence Meter ──────────────────────────────────────────────
function ConfidenceMeter({ level }) {
  const pct = level === 'high' ? 95 : level === 'medium' ? 70 : 40;
  const color = pct > 80 ? '#22c55e' : pct > 55 ? '#f59e0b' : '#ef4444';
  return (
    <div className="confidence-meter" title={`AI Confidence: ${pct}%`}>
      <div className="confidence-track"><div className="confidence-fill" style={{ width: `${pct}%`, background: color }} /></div>
      <span className="confidence-label" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ── Message Feedback (thumbs up/down) ─────────────────────────────
function MessageFeedback({ msgIndex }) {
  const [feedback, setFeedback] = useState(null);
  return (
    <div className="msg-feedback">
      <button className={`fb-btn ${feedback === 'up' ? 'fb-active-up' : ''}`} onClick={() => setFeedback('up')} title="Helpful"><ThumbsUp size={11} /></button>
      <button className={`fb-btn ${feedback === 'down' ? 'fb-active-down' : ''}`} onClick={() => setFeedback('down')} title="Not helpful"><ThumbsDown size={11} /></button>
    </div>
  );
}

// ── Inline Markdown renderer ──────────────────────────────────────
function renderInline(line) {
  if (!line) return null;
  const cleaned = line.replace(/^#{1,3}\s+/, '').replace(/^[*-]\s+/, '').replace(/^>\s+/, '');
  const parts = cleaned.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

// ── Message Content with Action Cards ─────────────────────────────
function MessageContent({ content, onAction }) {
  if (!content) return null;
  const { cleanText, cards } = parseActionCards(content);
  const lines = cleanText.split('\n');
  return (
    <span className="genie-message-content">
      {lines.map((line, li) => {
        if (!line.trim() && li === lines.length - 1) return null;
        return <span key={li}>{renderInline(line)}{li < lines.length - 1 && <br />}</span>;
      })}
      {cards.map((card, i) => <ActionCard key={i} card={card} onAction={onAction} />)}
    </span>
  );
}

// ── Streamed Typing Effect ────────────────────────────────────────
function useStreamedText(text, speed = 8) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!text) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      if (i >= text.length) { setDisplayed(text); setDone(true); clearInterval(id); }
      else setDisplayed(text.slice(0, i));
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { displayed, done };
}

// ── Message Bubble ────────────────────────────────────────────────
const MessageBubble = ({ msg, onAction, isLatest }) => {
  const [copied, setCopied] = useState(false);
  const isAssistant = msg.role === 'assistant';
  const shouldStream = isAssistant && isLatest && !msg._streamed;
  const { displayed, done } = useStreamedText(shouldStream ? msg.content : null, 6);
  const content = shouldStream ? (done ? msg.content : displayed) : msg.content;

  useEffect(() => { if (done && shouldStream) msg._streamed = true; }, [done]);

  const handleCopy = () => { const { cleanText } = parseActionCards(msg.content); navigator.clipboard.writeText(cleanText); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--genie'}`}>
      {isAssistant && <div className="bubble-avatar"><span className="ba-letter">G</span></div>}
      <div className="bubble-body">
        <div className="bubble-text">
          <MessageContent content={content} onAction={onAction} />
          {shouldStream && !done && <span className="stream-cursor">|</span>}
        </div>
        <div className="bubble-meta">
          <span className="bubble-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isAssistant && msg.latency_ms && <span className="bubble-latency">{(msg.latency_ms / 1000).toFixed(1)}s</span>}
          {isAssistant && <MessageFeedback msgIndex={0} />}
          {isAssistant && <button className="bubble-copy" onClick={handleCopy} title="Copy">{copied ? '✓' : <Copy size={12} />}</button>}
        </div>
      </div>
    </div>
  );
};

// ── Proactive Nudge Banner ────────────────────────────────────────
function ProactiveNudge({ profile, onAsk }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !profile) return null;
  let nudge = null;
  if (profile.risk_appetite === 'High' && profile.age > 50) nudge = { icon: '⚠️', text: 'Your risk level is high but you\'re over 50. Ask me about safer allocations.', question: 'Should I reduce my equity exposure at my age?' };
  else if (profile.monthly_savings && profile.monthly_savings < (profile.monthly_income || 0) * 0.2) nudge = { icon: '💡', text: 'You\'re saving less than 20% of your income. Let me optimize your budget.', question: 'How can I increase my monthly savings rate?' };
  if (!nudge) return null;
  return (
    <div className="proactive-nudge">
      <span className="nudge-icon">{nudge.icon}</span>
      <span className="nudge-text">{nudge.text}</span>
      <button className="nudge-btn" onClick={() => { onAsk(nudge.question); setDismissed(true); }}>Ask Genie</button>
      <button className="nudge-dismiss" onClick={() => setDismissed(true)}>✕</button>
    </div>
  );
}

// ── Portfolio Snapshot Widget ─────────────────────────────────────
function PortfolioSnapshot({ profile }) {
  if (!profile) return null;
  const annualIncome = profile.annualIncome || (profile.monthly_income || profile.income || 0) * 12;
  const riskLabel = profile.risk_appetite || profile.riskCategory || 'N/A';
  const items = [
    { label: 'Income', value: `₹${(annualIncome / 100000).toFixed(1)}L`, color: '#38bdf8' },
    { label: 'Risk', value: riskLabel, color: riskLabel === 'High' ? '#ef4444' : riskLabel === 'Medium' ? '#f59e0b' : '#22c55e' },
    { label: 'Regime', value: (profile.taxRegime || 'new').toUpperCase(), color: '#a855f7' },
  ];
  return (
    <div className="portfolio-snapshot">
      {items.map((item, i) => (
        <div key={i} className="snapshot-item">
          <div className="snapshot-label">{item.label}</div>
          <div className="snapshot-value" style={{ color: item.color }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Contextual Follow-Up Pills ────────────────────────────────────
function generateContextualPills(lastQ) {
  if (!lastQ) return [];
  const q = lastQ.toLowerCase();
  if (q.includes('rebalance') || q.includes('allocation')) return ['Show ideal asset allocation', 'What if I go 80/20 equity?', 'Compare to balanced fund'];
  if (q.includes('tax')) return ['Which regime saves more?', 'Section 80C breakdown', 'Post-tax FD return'];
  if (q.includes('sip') || q.includes('invest') || q.includes('step')) return ['10-year SIP projection', 'Ideal yearly step-up %', 'What if I double my SIP?'];
  if (q.includes('retire') || q.includes('goal')) return ['Am I on track?', 'Retire 5 years early?', 'SIP for ₹1 crore'];
  if (q.includes('crash') || q.includes('market')) return ['40% crash impact?', 'Invest during crashes?', 'Portfolio risk score'];
  return ['Rebalance my portfolio', 'Tax savings this year'];
}

// ── FAB Button ────────────────────────────────────────────────────
const GenieFAB = ({ onClick, hasNudge }) => (
  <button className="genie-fab" onClick={onClick} title="Ask Genie">
    <img src={chatGenie} alt="Genie AI" className="genie-fab-logo" />
    <span className="genie-fab-ring"></span>
    {hasNudge && <span className="fab-nudge-dot" />}
  </button>
);

// ── Main Component ────────────────────────────────────────────────
const GenieChat = ({ profile, recommendations }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rateLimit, setRateLimit] = useState({ remaining: 30, total: 30 });
  const [isListening, setIsListening] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    const stored = sessionStorage.getItem('genie_session_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    sessionStorage.setItem('genie_session_id', newId);
    return newId;
  });
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  const lastAssistantMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0];

  useEffect(() => { if (isOpen && sessionId && messages.length === 0) loadHistory(); }, [isOpen]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  // Voice recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN';
      recognitionRef.current.onresult = (e) => { const t = e.results[0][0].transcript; setInput(prev => prev + t); setIsListening(false); };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  const loadHistory = async () => {
    try {
      const data = await api.getChatHistory(sessionId);
      if (data.conversations?.[0]?.messages) {
        setMessages(data.conversations[0].messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content, timestamp: m.timestamp || new Date().toISOString(), latency_ms: m.metadata?.latency_ms, _streamed: true })));
      }
    } catch (_) {}
  };

  const handleAction = useCallback((action) => console.log('[GenieChat] Action:', action), []);

  const sendMessage = useCallback(async (text) => {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;
    setInput(''); setError(null);
    setMessages(prev => [...prev, { role: 'user', content: messageText, timestamp: new Date().toISOString() }]);
    setIsLoading(true);
    try {
      const data = await api.sendChatMessage(messageText, sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: new Date().toISOString(), latency_ms: data.latency_ms, _streamed: false }]);
      setRateLimit({ remaining: data.rate_limit_remaining, total: 30 });
    } catch (err) { setError(err.message || 'Genie is temporarily unavailable.'); }
    finally { setIsLoading(false); inputRef.current?.focus(); }
  }, [input, isLoading, sessionId]);

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const clearChat = async () => {
    try { await api.clearChatSession(sessionId); } catch (_) {}
    setMessages([]); setError(null); setRateLimit({ remaining: 30, total: 30 });
    const newId = crypto.randomUUID(); sessionStorage.setItem('genie_session_id', newId); setSessionId(newId);
  };

  const suggestedQuestions = getSuggestedQuestions(profile);
  const pills = generateContextualPills(lastUserMessage);

  return (
    <>
      {!isOpen && <GenieFAB onClick={() => setIsOpen(true)} hasNudge={!!profile} />}
      {isOpen && (
        <div className="genie-panel">
          {/* Header */}
          <div className="genie-panel-header">
            <div className="genie-header-left">
              <div className="genie-avatar-wrap"><span className="ba-letter">G</span></div>
              <div>
                <div className="genie-header-title">Genie <span className="genie-agentic-badge">AGENTIC AI</span></div>
                <div className="genie-header-sub"><span className="online-dot"></span> Financial Co-Pilot · Powered by Gemini</div>
              </div>
            </div>
            <div className="genie-header-actions">
              <span className={`rate-limit-badge ${rateLimit.remaining <= 5 ? 'rate-limit-warning' : ''}`}>{rateLimit.remaining <= 0 ? 'Limit reached' : `${rateLimit.remaining}/${rateLimit.total}`}</span>
              <button onClick={clearChat} title="Clear chat"><Trash2 size={16} /></button>
              <button onClick={() => setIsOpen(false)} title="Close"><X size={18} /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="genie-messages">
            {messages.length === 0 && !isLoading && (
              <div className="genie-welcome">
                <div className="genie-welcome-glow" />
                <div className="genie-welcome-avatar"><div className="welcome-avatar-ring"><span className="ba-letter ba-large">G</span></div></div>
                <p className="welcome-headline">Hi{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! I'm <strong>Genie</strong></p>
                <p className="welcome-sub">Your agentic financial co-pilot. I generate <strong style={{ color: '#38bdf8' }}>interactive action plans</strong> with one-click execution.</p>
                <PortfolioSnapshot profile={profile} />
                <div className="welcome-capability-cards">
                  <div className="capability-card"><BarChart3 size={15} style={{color:'#38bdf8'}}/><span>Rebalancing</span></div>
                  <div className="capability-card"><Shield size={15} style={{color:'#22c55e'}}/><span>Tax Saving</span></div>
                  <div className="capability-card"><TrendingUp size={15} style={{color:'#a855f7'}}/><span>SIP Step-Up</span></div>
                  <div className="capability-card"><Target size={15} style={{color:'#f59e0b'}}/><span>Goal Tracking</span></div>
                </div>
                {suggestedQuestions.length > 0 && (
                  <div className="welcome-suggestions">
                    {suggestedQuestions.map((q, i) => <button key={i} className="suggestion-pill" onClick={() => sendMessage(q)}><Sparkles size={12} /> {q}</button>)}
                  </div>
                )}
              </div>
            )}

            <ProactiveNudge profile={profile} onAsk={sendMessage} />

            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} onAction={handleAction} isLatest={i === messages.length - 1} />)}

            {isLoading && (
              <div className="chat-bubble chat-bubble--genie">
                <div className="bubble-avatar"><span className="ba-letter">G</span></div>
                <div className="typing-indicator">
                  <div className="typing-label">Genie is analyzing your finances</div>
                  <div className="typing-dots"><span></span><span></span><span></span></div>
                </div>
              </div>
            )}
            {error && <div className="chat-error-banner">{error}</div>}
            <div ref={chatEndRef} />
          </div>

          {/* Follow-up pills */}
          {messages.length > 0 && !isLoading && lastAssistantMsg?.content?.length > 50 && (
            <div className="quick-replies">
              {pills.map((p, i) => <button key={i} className="quick-chip follow-up" onClick={() => sendMessage(p)}><Sparkles size={12} /> {p}</button>)}
            </div>
          )}

          {/* Input Bar */}
          <div className="genie-input-bar">
            {recognitionRef.current && (
              <button className={`voice-btn ${isListening ? 'voice-active' : ''}`} onClick={toggleVoice} title="Voice input">
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={isListening ? 'Listening...' : 'Ask Genie for a financial action plan...'} className="genie-input" maxLength={1000} disabled={isLoading || rateLimit.remaining === 0} />
            <button className="genie-send-btn" onClick={() => sendMessage()} disabled={isLoading || !input.trim() || rateLimit.remaining === 0}>
              {isLoading ? <RefreshCw size={18} className="spin-icon" /> : <Send size={18} />}
            </button>
          </div>
          <div className="genie-disclaimer">Agentic AI Co-Pilot · Not SEBI-registered advice · Powered by Gemini + Groq</div>
        </div>
      )}
    </>
  );
};

export default GenieChat;
