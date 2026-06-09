import { useState, useEffect, useRef } from 'react';
import { FileText, MessageSquare, MoreHorizontal, Sparkles, Star } from 'lucide-react';
import ChatSidebar from './Chatsidebar';
import ChatMessage, { TypingIndicator } from './ChatMessage';
import ChatInput from './ChatInput';
import './Chat.css';

function makeInitialMsg() {
  return {
    id: 1,
    role: 'assistant',
    content: 'Bună! Sunt **MindCore**, asistentul tău academic AI.\n\nÎncarcă cursurile tale și pune orice întrebare — rezumate, explicații, exerciții, tot ce ai nevoie.',
    time: new Date().toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' }),
  };
}

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

export default function ChatPage() {
  const [chats, setChats] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(0);
  const endRef = useRef(null);

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {

    try {

      const token = localStorage.getItem('token');

      const res = await fetch(
        'http://localhost:8000/api/chat/conversations',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const conversations = await res.json();

      console.log("CONVERSATIONS:", conversations);

      const chatsObj = {};

      conversations.forEach(c => {

        chatsObj[c.id] = {
          id: c.id,
          title: c.title || "Conversație",
          date: new Date(c.created_at).toLocaleDateString('ro'),
          pinned: false,
          createdAt: new Date(c.created_at).getTime(),
          messages: []
        };

      });

      setChats(chatsObj);

    } catch (err) {
      console.error(err);
    }
  };

  const activeChat = chats[activeId] || null;

  const messages =
    activeChat?.messages?.length
      ? activeChat.messages
      : [makeInitialMsg()];

  const chatTitle =
    activeChat?.title || 'Conversație nouă';

  const history = Object.values(chats).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleNewChat = () => {
    setActiveId(null);
    setInput('');
    setIsTyping(false);
  };

  const handleSend = async () => {

    if (!input.trim() || isTyping) return;

    const token = localStorage.getItem('token')

    const t = new Date().toLocaleTimeString('ro', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: input,
      time: t
    };

    let chatId = activeId;

    try {

      if (!chatId) {

        const createRes = await fetch('http://localhost:8000/api/chat/conversation', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const createData = await createRes.json()

        chatId = createData.conversation_id

        const newChat = {
          id: chatId,
          title: generateTitle(input),
          date: todayLabel(),
          pinned: false,
          createdAt: Date.now(),
          messages: [makeInitialMsg(), userMsg],
        }

        setChats(prev => ({
          ...prev,
          [chatId]: newChat
        }))

        setActiveId(chatId)

        await new Promise(resolve => setTimeout(resolve, 0))

      } else {

        setChats(prev => {

          const existingMessages =
            prev[chatId]?.messages || []

          return {
            ...prev,
            [chatId]: {
              ...prev[chatId],
              messages: [
                ...existingMessages,
                userMsg
              ],
            },
          }
        })
      }

      const userInput = input;

      setInput('');
      setIsTyping(true);

      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: userInput,
          conversation_id: chatId
        })
      })

      const data = await res.json()

      console.log("CHAT RESPONSE:", data)

      setIsTyping(false)

      const botMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.answer || 'Nu am primit răspuns.',
        sources: data.sources || [],
        time: new Date().toLocaleTimeString('ro', {
          hour: '2-digit',
          minute: '2-digit'
        }),
      }

      setChats(prev => {

        const existingMessages =
          prev[chatId]?.messages || []

        return {
          ...prev,
          [chatId]: {
            ...prev[chatId],
            messages: [
              ...existingMessages,
              botMsg
            ],
          },
        }
      })

    } catch (err) {

      console.error(err)

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

      setChats(prev => {

        const existingMessages =
          prev[chatId]?.messages || []

        return {
          ...prev,
          [chatId]: {
            ...prev[chatId],
            messages: [
              ...existingMessages,
              errorMsg
            ],
          },
        }
      })
    }
  };

  const handleSetActive = async (id) => {

    try {

      const token = localStorage.getItem('token');

      const res = await fetch(
        `http://localhost:8000/api/chat/conversations/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const messages = await res.json();

      console.log("MESSAGES:", messages);

      setChats(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          messages: messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            time: new Date(m.created_at)
              .toLocaleTimeString('ro', {
                hour: '2-digit',
                minute: '2-digit'
              })
          }))
        }
      }));

      setActiveId(id);

    } catch (err) {

      console.error(err);

    }
  };

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
              <FileText size={12} /> <span>{documentsCount} cursuri active</span>
            </div>
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn"><Star size={15} /></button>
            <button className="topbar-icon-btn"><MoreHorizontal size={15} /></button>
            <div className="model-badge">
              <Sparkles size={11} /> MindCore AI
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