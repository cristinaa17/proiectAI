import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ChevronLeft, ChevronRight, BookOpen, RotateCcw, Sparkles } from 'lucide-react';

function parseFlashcards(text) {
  const cards = [];

  const lines = text.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const termMatch = line.match(/\*?\*?[Tt]ermen\*?\*?\s*:?\s*(.+?)\s*[\|│]\s*\*?\*?[Dd]efini[tț]ie\*?\*?\s*:?\s*(.+)/);
    if (termMatch) {
      cards.push({ front: termMatch[1].trim(), back: termMatch[2].trim() });
      continue;
    }

    const fataMatch = line.match(/\*?\*?[Ff]a[tț][aă]\*?\*?\s*:?\s*(.+?)\s*[\|│]\s*\*?\*?[Vv]erso\*?\*?\s*:?\s*(.+)/);
    if (fataMatch) {
      cards.push({ front: fataMatch[1].trim(), back: fataMatch[2].trim() });
      continue;
    }

    const numberedMatch = line.match(/^\d+[\.\)]\s*(.+?)\s*[—–-]\s*(.+)/);
    if (numberedMatch && numberedMatch[1].length < 80) {
      cards.push({ front: numberedMatch[1].trim(), back: numberedMatch[2].trim() });
    }
  }

  if (cards.length === 0) {
    for (let i = 0; i < lines.length - 1; i++) {
      const t = lines[i].replace(/\*\*/g, '').replace(/^[Tt]ermen\s*:?\s*/, '').trim();
      const d = lines[i + 1].replace(/\*\*/g, '').replace(/^[Dd]efini[tț]ie\s*:?\s*/, '').trim();
      if (t && d && t.length < 100 && !t.includes(':')) {
        cards.push({ front: t, back: d });
        i++;
      }
    }
  }

  return cards;
}

function Flashcard({ card, index, total }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => { setFlipped(false); }, [index]);

  return (
    <div style={s.cardScene} onClick={() => setFlipped(f => !f)}>
      <motion.div
        style={s.cardInner}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Fata */}
        <div style={{ ...s.cardFace, ...s.cardFront }}>
          <span style={s.faceLabel}>Termen</span>
          <p style={s.cardText}>{card.front}</p>
          <span style={s.flipHint}>Click pentru definiție →</span>
        </div>

        {/* Verso */}
        <div style={{ ...s.cardFace, ...s.cardBack }}>
          <span style={s.faceLabel}>Definiție</span>
          <p style={s.cardText}>{card.back}</p>
          <span style={s.flipHint}>← Click pentru termen</span>
        </div>
      </motion.div>

      {/* Progress dots */}
      <div style={s.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ ...s.dot, ...(i === index ? s.dotActive : {}) }} />
        ))}
      </div>
    </div>
  );
}

export default function FlashcardsMode({ conversationId, onClose }) {
  const [phase, setPhase] = useState('loading');
  const [cards, setCards] = useState([]);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState(1);

  useEffect(() => { generateCards(); }, []);

  const generateCards = async () => {
    setPhase('loading');
    setCards([]);
    setCurrent(0);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question: `Creează exact 8 flashcard-uri din cursurile încărcate.
Format OBLIGATORIU pentru fiecare card, câte unul pe linie:
**Termen:** [termenul sau conceptul scurt] | **Definiție:** [explicația clară și concisă]

Generează exact 8 linii în acest format, fără alte texte sau numerotare.`,
          conversation_id: conversationId,
        }),
      });
      const data = await res.json();
      const parsed = parseFlashcards(data.answer || '');
      if (parsed.length === 0) {
        setError('Nu am putut genera flashcard-uri. Asigură-te că ai cursuri încărcate.');
        setPhase('error');
      } else {
        setCards(parsed);
        setPhase('cards');
      }
    } catch {
      setError('Eroare la generarea flashcard-urilor.');
      setPhase('error');
    }
  };

  const goNext = () => {
    if (current < cards.length - 1) { setDirection(1); setCurrent(c => c + 1); }
  };
  const goPrev = () => {
    if (current > 0) { setDirection(-1); setCurrent(c => c - 1); }
  };

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.iconWrap}><Sparkles size={16} style={{ color: '#22c55e' }} /></div>
          <div>
            <p style={s.headerTitle}>Flashcard-uri</p>
            <p style={s.headerSub}>
              {phase === 'cards' ? `${current + 1} / ${cards.length} — click pe card pentru a-l întoarce` : 'Se generează…'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.regenBtn} onClick={generateCards}><RefreshCw size={13} /> Regenerează</button>
          <button style={s.closeBtn} onClick={onClose}><BookOpen size={13} /> Înapoi la chat</button>
        </div>
      </div>

      <div style={s.body}>
        {phase === 'loading' && (
          <div style={s.center}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <RefreshCw size={28} style={{ color: '#22c55e' }} />
            </motion.div>
            <p style={s.loadingText}>Se generează flashcard-urile din cursurile tale…</p>
          </div>
        )}

        {phase === 'error' && (
          <div style={s.center}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{error}</p>
            <button style={s.regenBtn} onClick={generateCards}>Încearcă din nou</button>
          </div>
        )}

        {phase === 'cards' && (
          <div style={s.cardArea}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                initial={{ opacity: 0, x: direction * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -60 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
              >
                <Flashcard card={cards[current]} index={current} total={cards.length} />
              </motion.div>
            </AnimatePresence>

            {/* Navigare */}
            <div style={s.nav}>
              <button
                style={{ ...s.navBtn, opacity: current === 0 ? 0.3 : 1 }}
                onClick={goPrev}
                disabled={current === 0}
              >
                <ChevronLeft size={20} /> Anterior
              </button>

              <button style={s.resetBtn} onClick={() => setCurrent(0)} title="Înapoi la primul card">
                <RotateCcw size={14} />
              </button>

              <button
                style={{ ...s.navBtn, opacity: current === cards.length - 1 ? 0.3 : 1 }}
                onClick={goNext}
                disabled={current === cards.length - 1}
              >
                Următor <ChevronRight size={20} />
              </button>
            </div>

            {/* Toate cardurile — mini grid */}
            <div style={s.miniGrid}>
              {cards.map((c, i) => (
                <button
                  key={i}
                  style={{ ...s.miniCard, ...(i === current ? s.miniCardActive : {}) }}
                  onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                >
                  <span style={s.miniNum}>{i + 1}</span>
                  <span style={s.miniText}>{c.front.slice(0, 28)}{c.front.length > 28 ? '…' : ''}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CARD_W = 520;
const CARD_H = 300;

const s = {
  container: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1 },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' },
  body: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  center: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 8 },
  cardArea: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '32px 24px', gap: 28,
  },

  // Flashcard 3D
  cardScene: {
    width: CARD_W, maxWidth: '90vw',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
    cursor: 'pointer',
    perspective: 1200,
  },
  cardInner: {
    width: '100%', height: CARD_H,
    position: 'relative', transformStyle: 'preserve-3d',
  },
  cardFace: {
    position: 'absolute', inset: 0,
    borderRadius: 20,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '32px 36px', backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    gap: 16,
  },
  cardFront: {
    background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.12) 100%)',
    border: '1px solid rgba(99,102,241,0.3)',
  },
  cardBack: {
    background: 'linear-gradient(135deg, rgba(34,197,94,0.14) 0%, rgba(99,102,241,0.1) 100%)',
    border: '1px solid rgba(34,197,94,0.25)',
    transform: 'rotateY(180deg)',
  },
  faceLabel: {
    fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
    color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
    alignSelf: 'flex-start',
  },
  cardText: {
    fontSize: 18, fontWeight: 600, color: '#fff',
    textAlign: 'center', lineHeight: 1.55, margin: 0, flex: 1,
    display: 'flex', alignItems: 'center',
  },
  flipHint: {
    fontSize: 11, color: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-end',
  },
  dots: { display: 'flex', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', transition: 'all 0.2s' },
  dotActive: { background: '#818cf8', width: 18, borderRadius: 3 },

  // Navigation
  nav: { display: 'flex', alignItems: 'center', gap: 16 },
  navBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '10px 18px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
  },
  resetBtn: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.4)', borderRadius: 10, padding: '10px',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
  },

  // Mini grid
  miniGrid: {
    display: 'flex', flexWrap: 'wrap', gap: 8,
    justifyContent: 'center', maxWidth: 680,
  },
  miniCard: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8, padding: '6px 12px', cursor: 'pointer', transition: 'all 0.15s',
    maxWidth: 200,
  },
  miniCardActive: {
    background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)',
  },
  miniNum: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', flexShrink: 0 },
  miniText: { fontSize: 11, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  regenBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
    color: '#4ade80', borderRadius: 10, padding: '8px 16px',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  closeBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '8px 16px',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
};