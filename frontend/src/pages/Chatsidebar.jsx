import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, LayoutDashboard, MessageSquare, Search,
  Trash2, BookOpen, X, Clock, Pin, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Docs mock (înlocuiește cu state real când ai backend) ───
const MOCK_DOCS = [
  { id: 'd1', name: 'SO_Curs3.pdf', size: '2.4 MB', icon: '📄' },
  { id: 'd2', name: 'Algoritmi.pdf', size: '1.1 MB', icon: '📄' },
  { id: 'd3', name: 'MatAlg_Lab2.docx', size: '340 KB', icon: '📝' },
];

// ─── HistoryItem ─────────────────────────────────────────────
function HistoryItem({ h, active, onClick, onPin, onDelete }) {
  const [hovered, setHovered] = useState(false);

  const itemStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 10px', borderRadius: 10, cursor: 'pointer',
    transition: 'background 0.15s', position: 'relative', marginBottom: 2,
    background: active
      ? 'rgba(99,102,241,0.12)'
      : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
    border: active ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
  };

  return (
    <div
      style={itemStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MessageSquare size={13} style={{ color: active ? '#818cf8' : 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.8)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {h.title}
        </p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: '1px 0 0' }}>{h.date}</p>
      </div>

      {hovered ? (
        <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
          <button style={actionBtn} onClick={onPin} title={h.pinned ? 'Desprinde' : 'Fixează'}>
            <Pin size={11} style={{ color: h.pinned ? '#818cf8' : 'rgba(255,255,255,0.4)' }} />
          </button>
          <button style={actionBtn} onClick={onDelete} title="Șterge">
            <Trash2 size={11} style={{ color: 'rgba(255,100,100,0.6)' }} />
          </button>
        </div>
      ) : (
        active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#818cf8', flexShrink: 0 }} />
      )}
    </div>
  );
}

const actionBtn = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6, padding: '3px 5px', cursor: 'pointer',
  display: 'flex', alignItems: 'center',
};

// ─── ChatSidebar ─────────────────────────────────────────────
export default function ChatSidebar({ history, activeChat, setActiveChat, onNewChat, onPin, onDelete }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [docsOpen, setDocsOpen] = useState(false);

  const filtered = history.filter(h => h.title.toLowerCase().includes(search.toLowerCase()));
  const pinned = filtered.filter(h => h.pinned);
  const recent = filtered.filter(h => !h.pinned);

  return (
    <aside className="chat-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        Mind<span>Core</span>
      </div>

      {/* New Chat */}
      <button className="new-chat-btn" onClick={onNewChat}>
        <Plus size={16} />
        <span>Conversație nouă</span>
      </button>

      {/* Search */}
      <div className="sidebar-search">
        <Search size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută conversații…"
        />
      </div>

      {/* History list */}
      <div className="history-scroll">
        {history.length === 0 && (
          <p className="history-empty">Nicio conversație încă.<br />Începe una nouă!</p>
        )}

        {pinned.length > 0 && (
          <>
            <p className="section-label"><Pin size={11} /> FIXATE</p>
            {pinned.map(h => (
              <HistoryItem key={h.id} h={h} active={activeChat === h.id}
                onClick={() => setActiveChat(h.id)}
                onPin={() => onPin(h.id)}
                onDelete={() => onDelete(h.id)} />
            ))}
          </>
        )}

        {recent.length > 0 && (
          <>
            <p className="section-label"><Clock size={11} /> RECENTE</p>
            {recent.map(h => (
              <HistoryItem key={h.id} h={h} active={activeChat === h.id}
                onClick={() => setActiveChat(h.id)}
                onPin={() => onPin(h.id)}
                onDelete={() => onDelete(h.id)} />
            ))}
          </>
        )}
      </div>

      {/* Docs panel */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12, padding: '2px 0', marginBottom: 8,
      }}>
        <button onClick={() => setDocsOpen(!docsOpen)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={14} style={{ color: '#22c55e' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Cursuri încărcate</span>
          </div>
          <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.3)', transform: docsOpen ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
        </button>

        <AnimatePresence>
          {docsOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              {MOCK_DOCS.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 15 }}>{d.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.7)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: 0 }}>{d.size}</p>
                  </div>
                  <X size={12} style={{ color: 'rgba(255,255,255,0.25)', cursor: 'pointer', flexShrink: 0 }} />
                </div>
              ))}
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                margin: '8px 14px', background: 'rgba(34,197,94,0.08)',
                border: '1px dashed rgba(34,197,94,0.25)', borderRadius: 8,
                color: '#22c55e', fontSize: 11, fontWeight: 600, padding: '7px 10px',
                cursor: 'pointer', width: 'calc(100% - 28px)',
              }}>
                <Plus size={13} /> Adaugă curs
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="footer-dash-btn" onClick={() => navigate('/')}>
          <LayoutDashboard size={15} />
          <span>Dashboard</span>
        </button>
        <div className="user-chip">
          <div className="user-chip-avatar">VS</div>
          <span className="user-chip-email">vladeugen.stoia@ulbsibiu.ro</span>
        </div>
      </div>
    </aside>
  );
}