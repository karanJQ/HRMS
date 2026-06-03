import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Clock, ClipboardList, AlertCircle, Menu } from 'lucide-react';
import { notificationAPI } from '../../api/endpoints';
import { useNavigate } from 'react-router-dom';

export default function Header({ title, theme, bg, collapsed, onToggleSidebar }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchUnread = async () => {
    try {
      const res = await notificationAPI.unreadCount();
      setUnreadCount(res.data.data.count || 0);
    } catch (_) {}
  };

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.list();
      setNotifications(res.data.data || []);
    } catch (_) {}
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (notif) => {
    if (!notif.is_read) {
      await notificationAPI.markRead(notif.id);
      setUnreadCount(c => Math.max(0, c - 1));
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    if (notif.ref_id) {
      setOpen(false);
      navigate('/tasks');
    }
  };

  const handleMarkAll = async () => {
    await notificationAPI.markAllRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const typeIcon = (type) => {
    if (type === 'TASK_ASSIGNED') return <ClipboardList size={14} className="text-blue-400" />;
    if (type === 'TASK_DEADLINE') return <Clock size={14} className="text-amber-400" />;
    if (type === 'TASK_COMPLETED') return <CheckCheck size={14} className="text-emerald-400" />;
    return <AlertCircle size={14} className="text-slate-400" />;
  };

  const timeAgo = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const isLight = theme === 'light';
  return (
    <div 
      className="sticky top-0 z-30 backdrop-blur-xl px-6 py-4 flex items-center justify-between transition-all duration-300"
      style={{
        background: bg || (isLight ? '#FEFEFA' : 'rgba(15, 23, 42, 0.5)'),
        borderBottom: isLight ? '1px solid rgba(22, 38, 96, 0.1)' : '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="p-2 rounded-xl transition-colors border"
          style={{
            borderColor: isLight ? 'rgba(22, 38, 96, 0.1)' : 'rgba(255,255,255,0.1)',
            color: isLight ? '#162660' : '#cbd5e1',
            background: 'transparent'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = isLight ? 'rgba(22, 38, 96, 0.05)' : 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          title={collapsed ? "Open Sidebar" : "Close Sidebar"}
        >
          <Menu size={20} />
        </button>
        <h1 
          className="text-xl sm:text-2xl md:text-3xl font-bold text-glow transition-all duration-300 m-0 leading-none truncate max-w-[180px] sm:max-w-[300px] md:max-w-none"
          style={{
            color: isLight ? '#162660' : '#fff',
            textShadow: isLight ? '0 0 20px rgba(22, 38, 96, 0.1)' : '0 0 20px rgba(129, 140, 248, 0.5)'
          }}
        >
          {title}
        </h1>
      </div>

      {/* Notification Bell */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(o => !o)}
          className="relative p-2.5 rounded-xl transition-colors border border-transparent"
          style={{
            background: 'transparent',
            color: isLight ? '#162660' : '#cbd5e1'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = isLight ? 'rgba(22, 38, 96, 0.05)' : 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 border-2 border-slate-900 rounded-full text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-12 w-96 max-h-[500px] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAll}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Bell size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n)}
                    className={`flex gap-3 px-4 py-3 cursor-pointer border-b border-white/5 hover:bg-white/5 transition-colors ${!n.is_read ? 'bg-blue-500/5' : ''}`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${!n.is_read ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                      {typeIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${!n.is_read ? 'text-white' : 'text-slate-300'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-blue-400"></div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-white/10 text-center">
                <button onClick={() => { setOpen(false); navigate('/tasks'); }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  View all tasks →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
