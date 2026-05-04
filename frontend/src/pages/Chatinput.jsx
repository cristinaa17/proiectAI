import { useEffect, useRef } from 'react';
import { Send, Paperclip, Image } from 'lucide-react';

const CHIPS = ['Rezumă cursul', 'Explică conceptul', 'Generează întrebări', 'Compară cu…'];

export default function ChatInput({ input, setInput, handleSend, isTyping }) {
  const textareaRef = useRef(null);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const canSend = input.trim() && !isTyping;

  return (
    <div className="chat-input-area">
      {/* Suggestion chips */}
      <div style={s.chips}>
        {CHIPS.map(c => (
          <button key={c} style={s.chip} onClick={() => setInput(c)}>{c}</button>
        ))}
      </div>

      {/* Input box */}
      <div style={s.box}>
        <div style={s.left}>
          <button style={s.iconBtn} title="Atașează fișier">
            <Paperclip size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </button>
          <button style={s.iconBtn} title="Imagine">
            <Image size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Întreabă MindCore orice despre cursuri…"
          rows={1}
          style={s.textarea}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{ ...s.sendBtn, ...(canSend ? s.sendBtnActive : {}) }}
        >
          <Send size={16} />
        </button>
      </div>

      <p style={s.hint}>MindCore poate face greșeli. Verifică informațiile importante.</p>
    </div>
  );
}

const s = {
  chips: {
    display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap',
  },
  chip: {
    fontSize: 11, fontWeight: 500,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.45)',
    borderRadius: 20, padding: '5px 12px',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  box: {
    display: 'flex', alignItems: 'flex-end', gap: 10,
    background: 'rgba(20,20,35,0.7)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(20px)',
    borderRadius: 18, padding: '10px 14px',
    boxShadow: '0 0 0 1px rgba(99,102,241,0.05) inset',
  },
  left: { display: 'flex', gap: 4, paddingBottom: 2 },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center',
    transition: 'background 0.15s',
  },
  textarea: {
    flex: 1, background: 'transparent', border: 'none',
    color: '#fff', outline: 'none', resize: 'none',
    fontSize: 14, lineHeight: 1.6, maxHeight: 160,
    overflowY: 'auto', padding: '4px 0',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 12, border: 'none',
    background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'default', transition: 'all 0.2s', flexShrink: 0,
  },
  sendBtnActive: {
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    color: '#fff', cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
  },
  hint: {
    fontSize: 10, color: 'rgba(255,255,255,0.2)',
    textAlign: 'center', margin: '8px 0 0',
  },
};