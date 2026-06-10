import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, User, CheckCircle, XCircle, RefreshCw, BookOpen } from 'lucide-react';

function parseQuestions(text) {
  const questions = [];
  const blocks = text.split(/\n(?=\d+[\.\)])/g).filter(b => b.trim());

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    const questionLine = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
    const options = {};
    let correctKey = null;

    for (const line of lines.slice(1)) {
      const optMatch = line.match(/^([A-D])[\.\)]\s*(.+)/i);
      if (optMatch) {
        options[optMatch[1].toUpperCase()] = optMatch[2].trim();
      }
      const ansMatch = line.match(/r[aă]spuns\s*corect\s*:?\s*([A-D])/i);
      if (ansMatch) {
        correctKey = ansMatch[1].toUpperCase();
      }
    }

    if (questionLine && Object.keys(options).length >= 2) {
      questions.push({ question: questionLine, options, correctKey });
    }
  }
  return questions;
}

function QuestionCard({ q, index, total, onAnswer, answered }) {
  const letters = Object.keys(q.options);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      style={s.questionCard}
    >
      <div style={s.questionHeader}>
        <span style={s.questionNum}>Întrebarea {index + 1} / {total}</span>
        {answered && (
          answered.correct
            ? <span style={s.correctBadge}><CheckCircle size={13} /> Corect</span>
            : <span style={s.wrongBadge}><XCircle size={13} /> Greșit</span>
        )}
      </div>

      <p style={s.questionText}>{q.question}</p>

      <div style={s.optionsGrid}>
        {letters.map(letter => {
          let btnStyle = { ...s.optionBtn };
          if (answered) {
            if (letter === q.correctKey) btnStyle = { ...s.optionBtn, ...s.optionCorrect };
            else if (letter === answered.chosen && !answered.correct) btnStyle = { ...s.optionBtn, ...s.optionWrong };
            else btnStyle = { ...s.optionBtn, ...s.optionDimmed };
          }
          return (
            <button
              key={letter}
              style={btnStyle}
              disabled={!!answered}
              onClick={() => onAnswer(index, letter)}
            >
              <span style={s.optionLetter}>{letter}</span>
              <span style={s.optionText}>{q.options[letter]}</span>
            </button>
          );
        })}
      </div>

      {answered && !answered.correct && q.correctKey && (
        <div style={s.explanation}>
          ✅ Răspunsul corect este <strong>{q.correctKey}) {q.options[q.correctKey]}</strong>
        </div>
      )}
    </motion.div>
  );
}

export default function QuizMode({ conversationId, onClose }) {
  const [phase, setPhase] = useState('loading'); 
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); 
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { generateQuiz(); }, []);

  const generateQuiz = async () => {
    setPhase('loading');
    setAnswers({});
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question: `Generează exact 5 întrebări de tip quiz din cursurile încărcate.
Format OBLIGATORIU pentru fiecare întrebare:
1. [textul întrebării]
A) [variantă]
B) [variantă]
C) [variantă]
D) [variantă]
Răspuns corect: [litera]

Folosește STRICT acest format pentru toate cele 5 întrebări.`,
          conversation_id: conversationId,
        }),
      });
      const data = await res.json();
      const text = data.answer || '';
      setRawText(text);
      const parsed = parseQuestions(text);
      if (parsed.length === 0) {
        if (text.trim()) {
          setPhase('raw');
        } else {
          setError('Nu am putut genera întrebări. Asigură-te că ai cursuri încărcate.');
          setPhase('error');
        }
      } else {
        setQuestions(parsed);
        setPhase('questions');
      }
    } catch {
      setError('Eroare la generarea quiz-ului.');
      setPhase('error');
    }
  };

  const handleAnswer = (index, chosen) => {
    const q = questions[index];
    const correct = chosen === q.correctKey;
    setAnswers(prev => ({ ...prev, [index]: { chosen, correct } }));
  };

  const score = Object.values(answers).filter(a => a.correct).length;
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.iconWrap}><Sparkles size={16} style={{ color: '#818cf8' }} /></div>
          <div>
            <p style={s.headerTitle}>Quiz interactiv</p>
            <p style={s.headerSub}>Răspunde la întrebări din cursurile tale</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.regenBtn} onClick={generateQuiz}>
            <RefreshCw size={13} /> Generează din nou
          </button>
          <button style={s.closeBtn} onClick={onClose}>
            <BookOpen size={13} /> Înapoi la chat
          </button>
        </div>
      </div>

      <div style={s.scroll}>
        {phase === 'loading' && (
          <div style={s.center}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <RefreshCw size={28} style={{ color: '#818cf8' }} />
            </motion.div>
            <p style={s.loadingText}>Se generează întrebările din cursurile tale…</p>
          </div>
        )}

        {phase === 'error' && (
          <div style={s.center}>
            <XCircle size={32} style={{ color: 'rgba(255,100,100,0.6)' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>{error}</p>
            <button style={s.regenBtn} onClick={generateQuiz}>Încearcă din nou</button>
          </div>
        )}

        {phase === 'raw' && (
          <div style={s.questionsList}>
            <div style={s.questionCard}>
              <p style={{ ...s.questionNum, marginBottom: 12 }}>
                Nu am putut formata întrebările ca quiz interactiv — iată răspunsul AI:
              </p>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap' }}>
                {rawText}
              </div>
            </div>
            <button style={s.regenBtn} onClick={generateQuiz}>
              <RefreshCw size={13} /> Încearcă din nou
            </button>
          </div>
        )}

        {phase === 'questions' && (
          <div style={s.questionsList}>
            {questions.map((q, i) => (
              <QuestionCard
                key={i}
                q={q}
                index={i}
                total={questions.length}
                onAnswer={handleAnswer}
                answered={answers[i] || null}
              />
            ))}

            <AnimatePresence>
              {allAnswered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={s.scoreCard}
                >
                  <p style={s.scoreEmoji}>
                    {score === questions.length ? '🏆' : score >= questions.length / 2 ? '👍' : '📚'}
                  </p>
                  <p style={s.scoreTitle}>
                    Ai răspuns corect la {score} din {questions.length} întrebări
                  </p>
                  <p style={s.scoreSub}>
                    {score === questions.length
                      ? 'Perfect! Stăpânești foarte bine materia.'
                      : score >= questions.length / 2
                        ? 'Bine! Mai revezi întrebările greșite.'
                        : 'Mai studiază cursul și încearcă din nou.'}
                  </p>
                  <button style={s.regenBtn} onClick={generateQuiz}>
                    <RefreshCw size={13} /> Încearcă alt quiz
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' },
  scroll: { flex: 1, overflowY: 'auto', padding: '32px 32px' },
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', gap: 16, minHeight: 300,
  },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 12 },
  questionsList: {
    maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20,
  },
  questionCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, padding: '22px 24px',
  },
  questionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  questionNum: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' },
  correctBadge: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 12, fontWeight: 600, color: '#4ade80',
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: 20, padding: '3px 10px',
  },
  wrongBadge: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 12, fontWeight: 600, color: '#f87171',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 20, padding: '3px 10px',
  },
  questionText: { fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, margin: '0 0 16px' },
  optionsGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  optionBtn: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 10, padding: '11px 16px', cursor: 'pointer',
    textAlign: 'left', transition: 'all 0.15s', color: 'rgba(255,255,255,0.8)',
  },
  optionCorrect: {
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)',
    color: '#4ade80',
  },
  optionWrong: {
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171',
  },
  optionDimmed: { opacity: 0.35 },
  optionLetter: {
    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
    background: 'rgba(255,255,255,0.07)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700,
  },
  optionText: { fontSize: 13, lineHeight: 1.4 },
  explanation: {
    marginTop: 12, padding: '10px 14px',
    background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)',
    borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5,
  },
  scoreCard: {
    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 20, padding: '32px', textAlign: 'center',
  },
  scoreEmoji: { fontSize: 48, margin: '0 0 12px' },
  scoreTitle: { fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px' },
  scoreSub: { fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 20px' },
  regenBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
    color: '#818cf8', borderRadius: 10, padding: '8px 16px',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  closeBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '8px 16px',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
};