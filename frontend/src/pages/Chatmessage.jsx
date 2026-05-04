import { motion } from 'framer-motion';
import { Sparkles, User, Download, Star } from 'lucide-react';

// ─── Markdown-lite renderer ───────────────────────────────────
function renderContent(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ fontWeight: 600, color: '#e2e8f0' }}>{part.slice(2, -2)}</strong>
      : part.split('\n').map((line, j) => (
          <span key={`${i}-${j}`}>{line}{j < part.split('\n').length - 1 && <br />}</span>
        ))
  );
}

// ─── TypingIndicator ─────────────────────────────────────────
export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <div style={s.botAvatar}>
        <Sparkles size={14} style={{ color: '#22c55e' }} />
      </div>
      <div style={{ ...s.botBubble, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {[0, 1, 2].map(i => (
            <motion.span key={i} style={s.dot}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── ChatMessage ─────────────────────────────────────────────
export default function ChatMessage({ message }) {
  const isBot = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ ...s.wrapper, justifyContent: isBot ? 'flex-start' : 'flex-end' }}
    >
      {isBot && (
        <div style={s.botAvatar}>
          <Sparkles size={14} style={{ color: '#22c55e' }} />
        </div>
      )}

      <div style={isBot ? s.botBubble : s.userBubble}>
        <div style={s.text}>{renderContent(message.content)}</div>
        <p style={s.time}>{message.time}</p>
        {isBot && (
          <div style={s.actions}>
            <button style={s.actionBtn} title="Copiază"><Download size={11} /></button>
            <button style={s.actionBtn} title="Salvează"><Star size={11} /></button>
          </div>
        )}
      </div>

      {!isBot && (
        <div style={s.userAvatar}>
          <User size={14} style={{ color: '#818cf8' }} />
        </div>
      )}
    </motion.div>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = {
  wrapper: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
  },
  botAvatar: {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  userAvatar: {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  botBubble: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    borderRadius: '4px 16px 16px 16px',
    padding: '14px 18px',
    maxWidth: '75%', position: 'relative',
  },
  userBubble: {
    background: 'linear-gradient(135deg, #4f52c9, #6366f1)',
    borderRadius: '16px 4px 16px 16px',
    padding: '14px 18px',
    maxWidth: '70%', position: 'relative',
    boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
  },
  text: {
    fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.88)',
  },
  time: {
    fontSize: 10, color: 'rgba(255,255,255,0.25)',
    margin: '6px 0 0', textAlign: 'right',
  },
  actions: { display: 'flex', gap: 4, marginTop: 8 },
  actionBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.35)',
    borderRadius: 6, padding: '3px 7px',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
  },
  dot: {
    display: 'inline-block', width: 7, height: 7,
    borderRadius: '50%', background: 'rgba(255,255,255,0.35)',
  },
};