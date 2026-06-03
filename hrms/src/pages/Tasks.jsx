import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout/Layout';
import Loader from '../components/common/Loader';
import Badge from '../components/common/Badge';
import StatsCard from '../components/common/StatsCard';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList, Plus, Clock, CheckCircle, AlertCircle,
  Calendar, User, Trash2, Edit3, X, Flag, ChevronDown, AlertTriangle,
  Archive, ArchiveRestore, Columns
} from 'lucide-react';
import { taskAPI, authAPI } from '../api/endpoints';

// ── Priority config ──────────────────────────────────
const PRIORITY = {
  Urgent: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Urgent' },
  High:   { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'High' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Medium' },
  Low:    { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Low' },
};

// ── Deadline helper ──────────────────────────────────
function DeadlineBadge({ daysRemaining, isOverdue, dueDate }) {
  if (!dueDate) return null;
  const label = isOverdue
    ? `Overdue by ${Math.abs(daysRemaining)}d`
    : daysRemaining === 0
    ? 'Due today!'
    : `${daysRemaining}d left`;
  const color = isOverdue ? '#ef4444' : daysRemaining <= 2 ? '#f97316' : daysRemaining <= 7 ? '#f59e0b' : '#22c55e';
  const bg    = isOverdue ? 'rgba(239,68,68,0.12)' : daysRemaining <= 2 ? 'rgba(249,115,22,0.12)' : daysRemaining <= 7 ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.1)';
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color, background: bg, border: `1px solid ${color}40` }}>
      <Clock size={9} />
      {label}
    </span>
  );
}

// ── Task Card ────────────────────────────────────────
function TaskCard({ task, canManage, onStatusChange, onEdit, onDelete }) {
  const p = PRIORITY[task.priority] || PRIORITY.Medium;
  const isOverdue = task.is_overdue;
  return (
    <div 
      className="rounded-xl p-4 border transition-all hover:translate-y-[-2px] group"
      style={{ 
        background: isOverdue ? '#fef2f2' : '#fff',
        borderColor: isOverdue ? 'rgba(239, 68, 68, 0.25)' : 'rgba(22, 38, 96, 0.08)',
        boxShadow: '0 4px 12px rgba(22, 38, 96, 0.03)',
      }}
    >
      
      {/* Top row: priority flag + actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: p.color, background: p.bg }}>
            <Flag size={9} />
            {task.priority}
          </span>
          {isOverdue && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">
              <AlertTriangle size={9} /> OVERDUE
            </span>
          )}
        </div>
        {canManage && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => onEdit(task)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
              <Edit3 size={13} />
            </button>
            <button onClick={() => onDelete(task.id)}
              className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold mb-1 leading-snug line-clamp-2" style={{ color: '#162660' }}>{task.title}</h4>
      {task.description && (
        <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{task.description}</p>
      )}

      {/* Assignee */}
      {task.assignee_name && task.assignee_name.trim() !== '' ? (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-[9px] font-bold text-blue-600">
            {task.assignee_name?.trim()?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="text-xs truncate font-medium" style={{ color: '#162660' }}>{task.assignee_name?.trim() || task.assignee_username}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mb-2">
          <User size={12} className="text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Unassigned</span>
        </div>
      )}

      {/* Due date */}
      {task.due_date && (
        <div className="mb-3">
          <DeadlineBadge
            daysRemaining={task.days_remaining}
            isOverdue={task.is_overdue}
            dueDate={task.due_date}
          />
        </div>
      )}

      {/* Status changer */}
      <div className="relative">
        <select
          className="w-full text-xs rounded-lg px-2.5 py-1.5 pr-7 outline-none appearance-none cursor-pointer border transition-all"
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value)}
          style={{
            background: '#fff',
            borderColor: 'rgba(22, 38, 96, 0.15)',
            color: '#162660'
          }}
        >
          {['Todo', 'In Progress', 'In Review', 'Done'].map(s => (
            <option key={s} value={s} style={{ background: '#fff', color: '#162660' }}>{s}</option>
          ))}
        </select>
        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
    </div>
  );
}

// ── Task Form Modal ──────────────────────────────────
function TaskModal({ task, users, onClose, onSave, currentUserId }) {
  const isEdit = !!task?.id;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assigned_to: task?.assigned_to || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'Todo',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal" 
        style={{ 
          maxWidth: 520,
          background: '#fff',
          borderColor: 'rgba(22, 38, 96, 0.1)',
          boxShadow: '0 20px 40px rgba(22, 38, 96, 0.15)'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: '#162660' }}>{isEdit ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs mb-1.5 font-semibold text-slate-500">Task Title *</label>
            <input required className="input" value={form.title}
              onChange={e => set('title', e.target.value)} placeholder="What needs to be done?" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs mb-1.5 font-semibold text-slate-500">Description</label>
            <textarea className="input min-h-[80px] resize-none" value={form.description}
              onChange={e => set('description', e.target.value)} placeholder="Detailed instructions..." />
          </div>

          {/* Assign To + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5 font-semibold text-slate-500">
                <User size={11} className="inline mr-1" />Assign To
              </label>
              <select className="input" value={form.assigned_to}
                onChange={e => set('assigned_to', e.target.value)}>
                <option value="" className="bg-white text-slate-800">— Unassigned —</option>
                {users.filter(u => u.id !== currentUserId).map(u => (
                  <option key={u.id} value={u.id} className="bg-white text-slate-800">
                    {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                    {u.role ? ` (${u.role.replace('_', ' ')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-semibold text-slate-500">
                <Flag size={11} className="inline mr-1" />Priority
              </label>
              <select className="input" value={form.priority}
                onChange={e => set('priority', e.target.value)}>
                {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                  <option key={p} value={p} className="bg-white text-slate-800">{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5 font-semibold text-slate-500">
                <Calendar size={11} className="inline mr-1" />Due Date
              </label>
              <input type="date" className="input" value={form.due_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => set('due_date', e.target.value)} />
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-semibold text-slate-500">Status</label>
              <select className="input" value={form.status}
                onChange={e => set('status', e.target.value)}>
                {['Todo', 'In Progress', 'In Review', 'Done'].map(s => (
                  <option key={s} value={s} className="bg-white text-slate-800">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Deadline reminder note */}
          {form.due_date && form.assigned_to && !isEdit && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <AlertCircle size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                The assignee will receive an in-app notification immediately, and a deadline reminder when the due date approaches.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn btn-secondary" style={{ background: 'rgba(22, 38, 96, 0.05)', color: '#162660', border: '1px solid rgba(22, 38, 96, 0.1)' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Task' : 'Create & Notify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Columns config (active board — Done goes to Archive) ──
const COLUMNS = [
  { key: 'Todo',        label: 'To Do',      icon: ClipboardList, color: '#3b82f6' },
  { key: 'In Progress', label: 'In Progress', icon: Clock,         color: '#f59e0b' },
  { key: 'In Review',   label: 'In Review',   icon: AlertCircle,   color: '#8b5cf6' },
];

// ── Archive Row ──────────────────────────────────────
function ArchiveRow({ task, canManage, onRestore, onDelete }) {
  const p = PRIORITY[task.priority] || PRIORITY.Medium;
  const completedOn = task.completed_at
    ? new Date(task.completed_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
    : task.updated_at
    ? new Date(task.updated_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
    : '—';
  const dueDateFmt = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
    : '—';
  const wasOverdue = task.due_date && task.completed_at && new Date(task.completed_at) > new Date(task.due_date);

  return (
    <tr 
      className="transition-colors group"
      style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.05)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <td>
        <div className="font-medium text-sm" style={{ color: '#162660' }}>{task.title}</div>
        {task.description && (
          <div className="text-xs mt-0.5 truncate max-w-xs" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>{task.description}</div>
        )}
      </td>
      <td>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ color: p.color, background: p.bg }}>
          <Flag size={9}/>{task.priority}
        </span>
      </td>
      <td>
        {task.assignee_name?.trim() ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-[9px] font-bold text-blue-600">
              {task.assignee_name.trim()[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium" style={{ color: '#162660' }}>{task.assignee_name.trim()}</span>
          </div>
        ) : <span className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.4)' }}>Unassigned</span>}
      </td>
      <td>
        <span className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{task.creator_name?.trim() || '—'}</span>
      </td>
      <td>
        <span className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{dueDateFmt}</span>
      </td>
      <td>
        <div className="flex flex-col gap-0.5">
          <span className="text-emerald-600 text-xs font-semibold">{completedOn}</span>
          {wasOverdue && (
            <span className="text-[10px] text-red-500 font-medium">Completed late</span>
          )}
        </div>
      </td>
      <td>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {canManage && (
            <button onClick={() => onRestore(task.id)}
              title="Restore to board"
              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-slate-500 hover:text-blue-600 transition-colors">
              <ArchiveRestore size={14} />
            </button>
          )}
          {canManage && (
            <button onClick={() => onDelete(task.id)}
              title="Delete permanently"
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ────────────────────────────────────────
export default function Tasks() {
  const { user, isMin } = useAuth();
  const canManage = isMin('dept_head');

  const [tasks, setTasks]     = useState([]);
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'create' | task object (edit)
  const [msg, setMsg]         = useState('');
  const [filter, setFilter]   = useState('all');   // 'all' | 'mine' | 'overdue'
  const [view, setView]       = useState('board');  // 'board' | 'archive'
  const [archiveSearch, setArchiveSearch] = useState('');

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const load = useCallback(async () => {
    try {
      const [tRes, sRes] = await Promise.all([taskAPI.list(), taskAPI.stats()]);
      setTasks(tRes.data.data || []);
      setStats(sRes.data.data || null);
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (canManage) {
      authAPI.listUsers().then(res => setUsers(res.data.data || [])).catch(() => {});
    }
  }, [load, canManage]);

  const handleSave = async (form) => {
    if (modal?.id) {
      await taskAPI.update(modal.id, form);
      showMsg('Task updated successfully');
    } else {
      await taskAPI.create(form);
      showMsg(form.assigned_to ? '✓ Task created & notification sent!' : '✓ Task created!');
    }
    load();
  };

  const handleStatusChange = async (id, status) => {
    try {
      await taskAPI.updateStatus(id, { status });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      load();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await taskAPI.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      showMsg('Task deleted');
      load();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRestore = async (id) => {
    try {
      await taskAPI.updateStatus(id, { status: 'In Progress' });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'In Progress', completed_at: null } : t));
      showMsg('✓ Task restored to board');
      load();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // Board tasks — exclude Done (those go to Archive)
  const boardTasks = tasks.filter(t => t.status !== 'Done');
  const filteredTasks = boardTasks.filter(t => {
    if (filter === 'mine') return t.assigned_to === user?.id || t.created_by === user?.id;
    if (filter === 'overdue') return t.is_overdue;
    return true;
  });

  // Archive tasks — only Done
  const archiveTasks = tasks
    .filter(t => t.status === 'Done')
    .filter(t => {
      if (!archiveSearch.trim()) return true;
      const q = archiveSearch.toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        t.assignee_name?.toLowerCase().includes(q) ||
        t.creator_name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    });

  return (
    <Layout title="Task Management" theme="light" bg="#F8F8FF">
      {/* Message banner */}
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${
          msg.startsWith('Error') || msg.startsWith('Failed')
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>{msg}</div>
      )}

      {/* Stats row */}
      {(() => {
        const displayStats = {
          total: filteredTasks.length + archiveTasks.length,
          in_progress: filteredTasks.filter(t => t.status === 'In Progress').length,
          in_review: filteredTasks.filter(t => t.status === 'In Review').length,
          overdue: filteredTasks.filter(t => t.is_overdue).length,
          done: archiveTasks.length,
        };
        return (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 w-full">
            <StatsCard title="Total Tasks" value={displayStats.total} icon={ClipboardList} color="#3b82f6" theme="light" delay={0} />
            <StatsCard title="In Progress" value={displayStats.in_progress} icon={Clock} color="#f59e0b" theme="light" delay={60} />
            <StatsCard title="In Review" value={displayStats.in_review} icon={AlertCircle} color="#8b5cf6" theme="light" delay={120} />
            <StatsCard title="Overdue" value={displayStats.overdue} icon={AlertTriangle} color="#ef4444" theme="light" delay={180} />
            <StatsCard title="Completed" value={displayStats.done} icon={CheckCircle} color="#10b981" theme="light" delay={240} />
          </div>
        );
      })()}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        {/* View toggle */}
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-slate-200 shadow-sm">
          <button onClick={() => setView('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              view === 'board' 
                ? 'bg-[#F5FFFA] text-[#162660] border border-[rgba(22,38,96,0.15)] shadow-sm' 
                : 'text-slate-400 hover:text-[#162660] hover:bg-[#FFE5B4]'
            }`}>
            <Columns size={13} /> Board
          </button>
          <button onClick={() => setView('archive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              view === 'archive' 
                ? 'bg-[#FFE5B4] text-[#162660] border border-[rgba(22,38,96,0.15)] shadow-sm' 
                : 'text-slate-400 hover:text-[#162660] hover:bg-[#F5FFFA]'
            }`}>
            <Archive size={13} />
            Archive
            {stats?.done > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                view === 'archive' ? 'bg-[#162660] text-white' : 'bg-emerald-50 text-emerald-600'
              }`}>{stats.done}</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Board filters — only visible on board view */}
          {view === 'board' && (
            <div className="flex gap-2">
              {[
                { key: 'all',     label: 'All' },
                { key: 'mine',    label: 'Mine' },
                { key: 'overdue', label: `Overdue${stats?.overdue > 0 ? ` (${stats.overdue})` : ''}` },
              ].map(f => {
                const isActive = filter === f.key;
                return (
                  <button 
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'bg-[#F5FFFA] text-[#162660] border-[rgba(22,38,96,0.2)] shadow-sm'
                        : 'bg-white text-[#162660]/60 border-[#162660]/15 hover:bg-[#FFE5B4] hover:text-[#162660] hover:border-[rgba(22,38,96,0.2)]'
                    }`}
                  >
                    {f.key === 'overdue' && stats?.overdue > 0 && <AlertTriangle size={10} className="inline mr-1 text-red-500" />}
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Archive search */}
          {view === 'archive' && (
            <input
              value={archiveSearch}
              onChange={e => setArchiveSearch(e.target.value)}
              placeholder="Search archive..."
              className="input py-1.5 text-xs w-52"
            />
          )}

          {canManage && view === 'board' && (
            <button 
              onClick={() => setModal('create')} 
              className="btn font-semibold transition-all duration-200 bg-[#F5FFFA] text-[#162660] border border-[rgba(22,38,96,0.2)] shadow-sm hover:bg-[#FFE5B4] hover:shadow-[0_6px_20px_rgba(22,38,96,0.08)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Plus size={16} /> Assign Task
            </button>
          )}
        </div>
      </div>

      {/* ── Board View ─────────────────────────────── */}
      {view === 'board' && (
        loading ? <Loader /> : (
          <div className="grid grid-cols-3 gap-4">
            {COLUMNS.map(col => {
              const colTasks = filteredTasks.filter(t => t.status === col.key);
              return (
                <div key={col.key} className="flex flex-col min-h-[500px]">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                      <h3 className="text-sm font-semibold text-[#162660]">{col.label}</h3>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(22, 38, 96, 0.05)', color: 'rgba(22, 38, 96, 0.6)' }}>
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="flex-1 space-y-3 p-3 rounded-2xl border" style={{ background: 'rgba(22, 38, 96, 0.02)', borderColor: 'rgba(22, 38, 96, 0.08)' }}>
                    {colTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                        <col.icon size={28} className="mb-2 opacity-30" />
                        <p className="text-xs">No tasks here</p>
                      </div>
                    ) : (
                      colTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          canManage={canManage}
                          onStatusChange={handleStatusChange}
                          onEdit={t => setModal(t)}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Archive View ───────────────────────────── */}
      {view === 'archive' && (
        loading ? <Loader /> : (
          <div 
            className="hover-card animate-slide-up"
            style={{ 
              background: '#fff', 
              borderRadius: '16px', 
              padding: '24px', 
              border: '1px solid rgba(22, 38, 96, 0.1)', 
              boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)'
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Archive size={18} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base" style={{ color: '#162660' }}>Completed Tasks</h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>
                  {archiveTasks.length} task{archiveTasks.length !== 1 ? 's' : ''} archived{archiveSearch ? ' (filtered)' : ''}
                </p>
              </div>
            </div>

            {archiveTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Archive size={48} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">{archiveSearch ? 'No matching tasks' : 'No completed tasks yet'}</p>
                <p className="text-xs mt-1 text-slate-500">
                  {archiveSearch ? 'Try a different search term' : 'Completed tasks will appear here'}
                </p>
              </div>
            ) : (
              <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                      {['Task', 'Priority', 'Assigned To', 'Assigned By', 'Due Date', 'Completed On', ''].map(h => (
                        <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {archiveTasks.map(task => (
                      <ArchiveRow
                        key={task.id}
                        task={task}
                        canManage={canManage}
                        onRestore={handleRestore}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}

      {/* Deadline Reminder Banner — shown if overdue tasks exist */}
      {!loading && stats?.overdue > 0 && (
        <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 animate-pulse">
          <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">
            <strong>{stats.overdue} task{stats.overdue > 1 ? 's are' : ' is'} overdue</strong> — please update their status or reassign them.
          </p>
        </div>
      )}

      {/* Due Today Banner */}
      {!loading && stats?.due_today > 0 && (
        <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <Clock size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{stats.due_today} task{stats.due_today > 1 ? 's are' : ' is'} due today</strong> — make sure to complete them!
          </p>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <TaskModal
          task={modal === 'create' ? null : modal}
          users={users}
          currentUserId={user?.id}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </Layout>
  );
}
