import { useState, useEffect, useRef } from 'react';
import { FileText, MessageSquare, MoreHorizontal, Sparkles, Star } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import ChatMessage, { TypingIndicator } from './ChatMessage';
import ChatInput from './ChatInput';
import './Chat.css';

// ─── Helpers ─────────────────────────────────────────────────
function makeInitialMsg() {
  return {
    id: 1,
    role: 'assistant',
    content: 'Bună! Sunt **MindCore**, asistentul tău academic AI.\n\nÎncarcă cursurile tale și pune orice întrebare — rezumate, explicații, exerciții, tot ce ai nevoie.',
    time: new Date().toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Generează automat titlul conversației din primul mesaj al userului.
 * Taie la ~40 de caractere la limita unui cuvânt.
 */
function generateTitle(text) {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= 40) return clean;
  const cut = clean.slice(0, 40);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + '…';
}

function todayLabel() {
  return new Date().toLocaleDateString('ro', { day: 'numeric', month: 'short' });
}

// ─── ChatPage ─────────────────────────────────────────────────
export default function ChatPage() {
  // chats[id] = { id, title, date, pinned, createdAt, messages[] }
  const [chats, setChats] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef(null);

  // Conversația activă
  const activeChat = activeId ? chats[activeId] : null;
  const messages = activeChat ? activeChat.messages : [makeInitialMsg()];
  const chatTitle = activeChat ? activeChat.title : 'Conversație nouă';

  // Istoric pentru sidebar (pinned primii, apoi desc după createdAt)
  const history = Object.values(chats).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  // ── Scroll la final ──────────────────────────────────────────
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── New Chat ─────────────────────────────────────────────────
  const handleNewChat = () => {
    setActiveId(null);
    setInput('');
    setIsTyping(false);
  };

  // ── Send message ─────────────────────────────────────────────
const handleSend = async () => {
      if (!input.trim() || isTyping) return;

    const t = new Date().toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: Date.now(), role: 'user', content: input, time: t };

    let chatId = activeId;

    if (!chatId) {
      // ── Primul mesaj: creăm conversația cu titlu auto-generat ──
      chatId = `chat-${Date.now()}`;
      const newChat = {
        id: chatId,
        title: generateTitle(input),   // <── titlu automat din textul userului
        date: todayLabel(),
        pinned: false,
        createdAt: Date.now(),
        messages: [makeInitialMsg(), userMsg],
      };
      setChats(prev => ({ ...prev, [chatId]: newChat }));
      setActiveId(chatId);
    } else {
  setChats(prev => ({
    ...prev,
    [chatId]: {
      ...prev[chatId],
      messages: [...prev[chatId].messages, userMsg],
    },
  }));
}

    const userInput = input;   // ✅ salvăm mesajul
setInput('');
setIsTyping(true);

const capturedId = chatId;
const token = localStorage.getItem('token')

try {
  const res = await fetch('http://localhost:8000/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      question: userInput   // ✅ folosim valoarea salvată
    })
  })

  const data = await res.json()

  setIsTyping(false)

  const botMsg = {
    id: Date.now() + 1,
    role: 'assistant',
    content: data.answer,
    time: new Date().toLocaleTimeString('ro', {
      hour: '2-digit',
      minute: '2-digit'
    }),
  }

  setChats(prev => ({
  ...prev,
  [capturedId]: {
    ...prev[capturedId],
    messages: [...prev[capturedId].messages, botMsg],
  },
}))

} catch (err) {
  setIsTyping(false)

  const errorMsg = {
    id: Date.now() + 1,
    role: 'assistant',
    content: 'Eroare la conectarea cu serverul.',
    time: new Date().toLocaleTimeString('ro', {
      hour: '2-digit',
      minute: '2-digit'
    }),
  }

  setChats(prev => ({
    ...prev,
    [capturedId]: {
      ...prev[capturedId],
      messages: [...prev[capturedId].messages, errorMsg],
    },
  }))
}
  };

  // ── Switch chat ──────────────────────────────────────────────
  const handleSetActive = (id) => {
    setActiveId(id);
    const userInput = input
    setInput('');
    setIsTyping(false);
  };

  // ── Pin / Delete ─────────────────────────────────────────────
  const handlePin = (id) => {
    setChats(prev => ({
      ...prev,
      [id]: { ...prev[id], pinned: !prev[id].pinned },
    }));
  };

  const handleDelete = (id) => {
    setChats(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeId === id) setActiveId(null);
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="chat-universe">
      <div className="aurora-bg" />
      <div className="aurora-bg-2" />

      <ChatSidebar
        history={history}
        activeChat={activeId}
        setActiveChat={handleSetActive}
        onNewChat={handleNewChat}
        onPin={handlePin}
        onDelete={handleDelete}
      />

      <main className="chat-main">
        {/* Topbar */}
        <header className="chat-topbar">
          <div className="topbar-left">
            <div className="topbar-chat-title">
              <MessageSquare size={16} style={{ color: '#818cf8' }} />
              <span>{chatTitle}</span>
            </div>
            <div className="topbar-docs-badge">
              <FileText size={12} /> <span>3 cursuri active</span>
            </div>
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn"><Star size={15} /></button>
            <button className="topbar-icon-btn"><MoreHorizontal size={15} /></button>
            <div className="model-badge">
              <Sparkles size={11} /> GPT-4o
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="chat-messages-area">
          <div className="messages-inner">
            {messages.map(m => <ChatMessage key={m.id} message={m} />)}
            {isTyping && <TypingIndicator />}
            <div ref={endRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          isTyping={isTyping}
        />
      </main>
    </div>
  );
}