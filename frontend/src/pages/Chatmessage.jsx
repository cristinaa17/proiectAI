import { motion } from 'framer-motion';
import { Sparkles, User } from 'lucide-react';

function renderInline(text, keyPrefix) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return tokens.map((tok, i) => {
    const key = `${keyPrefix}-${i}`;
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return <strong key={key} style={{ fontWeight: 700, color: '#e2e8f0' }}>{tok.slice(2, -2)}</strong>;
    }
    if (tok.startsWith('`') && tok.endsWith('`')) {
      return <code key={key} style={s.inlineCode}>{tok.slice(1, -1)}</code>;
    }
    if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
      return <em key={key}>{tok.slice(1, -1)}</em>;
    }
    return <span key={key}>{tok}</span>;
  });
}

function renderContent(text) {
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; 
      blocks.push(
        <pre key={blocks.length} style={s.codeBlock}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    const headerMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const HeaderTag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5';
      blocks.push(
        <HeaderTag key={blocks.length} style={s.heading}>
          {renderInline(headerMatch[2], `h${blocks.length}`)}
        </HeaderTag>
      );
      i++;
      continue;
    }

    const listItemMatch = line.match(/^\s*([-*]|\d+[\.\)])\s+(.*)/);
    if (listItemMatch) {
      const ordered = /\d/.test(listItemMatch[1]);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*([-*]|\d+[\.\)])\s+(.*)/);
        if (!m) break;
        items.push(m[2]);
        i++;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        <ListTag key={blocks.length} style={s.list}>
          {items.map((item, j) => (
            <li key={j} style={s.listItem}>{renderInline(item, `li${blocks.length}-${j}`)}</li>
          ))}
        </ListTag>
      );
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].match(/^(#{1,3})\s+/) &&
      !lines[i].match(/^\s*([-*]|\d+[\.\)])\s+/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={blocks.length} style={s.paragraph}>
        {paraLines.map((l, j) => (
          <span key={j}>
            {renderInline(l, `p${blocks.length}-${j}`)}
            {j < paraLines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  }

  return blocks;
}

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
        {isBot &&
          message.sources &&
          message.sources.length > 0 && (
            <div style={s.sources}>
              <div style={s.sourcesTitle}>Surse:</div>

              {message.sources.map((source, index) => (
                <div
                  key={index}
                  style={s.sourceItem}
                >
                  📄 {source.filename} (pagina {source.page})
                </div>
              ))}
            </div>
          )}
        <p style={s.time}>{message.time}</p>
      </div>

      {!isBot && (
        <div style={s.userAvatar}>
          <User size={14} style={{ color: '#818cf8' }} />
        </div>
      )}
    </motion.div>
  );
}

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
  paragraph: {
    margin: '0 0 10px', fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.88)',
  },
  heading: {
    margin: '14px 0 8px', fontWeight: 700, color: '#fff', lineHeight: 1.4,
  },
  list: {
    margin: '0 0 10px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 4,
  },
  listItem: {
    fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.88)',
  },
  inlineCode: {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 4, padding: '1px 5px', fontSize: 12.5,
    fontFamily: 'monospace', color: '#a5b4fc',
  },
  codeBlock: {
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '12px 14px', overflowX: 'auto',
    fontSize: 12.5, fontFamily: 'monospace', color: '#cbd5e1',
    margin: '0 0 10px', lineHeight: 1.6,
  },
  time: {
    fontSize: 10, color: 'rgba(255,255,255,0.25)',
    margin: '6px 0 0', textAlign: 'right',
  },
  dot: {
    display: 'inline-block', width: 7, height: 7,
    borderRadius: '50%', background: 'rgba(255,255,255,0.35)',
  },

  sources: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },

  sourcesTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 6,
  },

  sourceItem: {
    fontSize: 12,
    color: '#cbd5e1',
    marginBottom: 4,
  },
};