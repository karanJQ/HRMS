import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout/Layout';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import Pagination from '../components/common/Pagination';
import { usePaginationAndSearch } from '../hooks/usePaginationAndSearch';
import {
  Target, Plus, ChevronDown, ChevronUp, Check, X, Sparkles, Send,
  RefreshCw, Lock, Unlock, Edit3, Award, TrendingUp, Users, Eye,
  BarChart2, MessageSquare, DollarSign, Star, AlertCircle, Search, Calendar, Trash2
} from 'lucide-react';
import { kpiYearlyAPI, empAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const BRAND  = '#162660';
const BRAND2 = '#1e3a8a';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_META = {
  'Draft':                  { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', icon: '✏️' },
  'Goals Set':              { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', icon: '🎯' },
  'Self Assessment Open':   { bg: '#fef3c7', text: '#b45309', border: '#fde68a', icon: '📝' },
  'Submitted':              { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', icon: '📤' },
  'Manager Review':         { bg: '#fef9c3', text: '#a16207', border: '#fef08a', icon: '👔' },
  'CPO Review':             { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe', icon: '🔍' },
  'Sales Lead Review':      { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', icon: '📊' },
  'MD Review':              { bg: '#fdf4ff', text: '#86198f', border: '#f0abfc', icon: '🏛️' },
  'Approved':               { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0', icon: '✅' },
  'Published':              { bg: '#d1fae5', text: '#064e3b', border: '#6ee7b7', icon: '🎉' },
  'Returned':               { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', icon: '↩️' },
};

const APPROVAL_NODE_META = {
  Pending:  { bg: '#fffbeb', border: '#fbbf24', text: '#b45309', pulse: true  },
  Approved: { bg: '#ecfdf5', border: '#34d399', text: '#065f46', pulse: false },
  Returned: { bg: '#fef2f2', border: '#f87171', text: '#b91c1c', pulse: false },
  Waiting:  { bg: '#f8fafc', border: '#cbd5e1', text: '#94a3b8', pulse: false },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META['Draft'];
  return (
    <span style={{ background: m.bg, color: m.text, border: `1px solid ${m.border}`, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {m.icon} {status}
    </span>
  );
};

const EmpTypeBadge = ({ type }) => {
  const colors = {
    developer:  { bg: '#eff6ff', text: '#1d4ed8' },
    tester:     { bg: '#f0fdf4', text: '#166534' },
    designer:   { bg: '#fdf4ff', text: '#86198f' },
    sales_lead: { bg: '#fff7ed', text: '#c2410c' },
    salesperson:{ bg: '#fef9c3', text: '#a16207' },
    other:      { bg: '#f1f5f9', text: '#475569' },
  };
  const c = colors[type] || colors.other;
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {type?.replace('_', ' ') || 'other'}
    </span>
  );
};

// ─── Score Gauge ──────────────────────────────────────────────────────────────
function ScoreGauge({ score, label = 'Score', size = 88 }) {
  const pct = Math.min(Math.max(parseFloat(score) || 0, 0), 100);
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
  const r = size * 0.386; const c = 2 * Math.PI * r; const filled = (pct / 100) * c;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={size * 0.09}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size * 0.09}
          strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
        <text x={size/2} y={size/2 + size*0.07} textAnchor="middle" fontSize={size*0.2} fontWeight="800" fill={color}>
          {pct.toFixed(0)}
        </text>
        <text x={size/2} y={size/2 + size*0.18} textAnchor="middle" fontSize={size*0.1} fill="#94a3b8">/100</text>
      </svg>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Workflow Pipeline ────────────────────────────────────────────────────────
function WorkflowPipeline({ report, onAction, canAct }) {
  const [actingOn, setActingOn] = useState(null);
  const [remarksInput, setRemarksInput] = useState({});

  const approvals = report?.approvals || [];
  const getApproval = (role) => approvals.find(a => a.approver_role === role);

  // Build pipeline steps based on department
  const deptName = report?.dept_name;
  let steps = [
    { role: 'reporting_manager', label: 'Reporting Manager', icon: '👔' },
  ];
  if (deptName === 'Sales') {
    steps.push({ role: 'sales_lead', label: 'Sales Lead', icon: '📊' });
  } else {
    steps.push({ role: 'cpo', label: 'CPO Review', icon: '🔍' });
  }
  steps.push({ role: 'md', label: 'MD Review', icon: '🏛️' });
  steps.push({ role: 'published', label: 'Published', icon: '🎉' });
  steps.push({ role: 'kra', label: 'KRA Discussion', icon: '💰' });

  const getStepStatus = (role) => {
    if (role === 'published') return report?.status === 'Published' ? 'done' : 'waiting';
    if (role === 'kra') return report?.kra_discussion ? 'done' : (report?.status === 'Published' ? 'pending' : 'waiting');
    const ap = getApproval(role);
    if (ap?.status === 'Approved') return 'done';
    if (ap?.status === 'Pending') return 'active';
    if (ap?.status === 'Returned') return 'returned';
    return 'waiting';
  };

  const stepColors = {
    done: { bg: '#ecfdf5', border: '#34d399', text: '#065f46', dot: '#10b981' },
    active: { bg: '#eff6ff', border: '#60a5fa', text: '#1d4ed8', dot: '#3b82f6' },
    returned: { bg: '#fef2f2', border: '#f87171', text: '#b91c1c', dot: '#ef4444' },
    waiting: { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8', dot: '#cbd5e1' },
    pending: { bg: '#fef3c7', border: '#fbbf24', text: '#b45309', dot: '#f59e0b' },
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
        {steps.map((step, i) => {
          const status = getStepStatus(step.role);
          const c = stepColors[status] || stepColors.waiting;
          const ap = getApproval(step.role);
          const isActing = actingOn === step.role;
          const canActThis = canAct?.[step.role] && status === 'active';

          return (
            <React.Fragment key={step.role}>
              {i > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: 24, flexShrink: 0 }}>
                  <div style={{ width: 32, height: 2, background: status === 'done' ? '#10b981' : '#e2e8f0' }}/>
                  <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `6px solid ${status === 'done' ? '#10b981' : '#e2e8f0'}` }}/>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 130, maxWidth: 160 }}>
                {/* Step card */}
                <div style={{
                  background: c.bg, border: `2px solid ${c.border}`, borderRadius: 14,
                  padding: '12px 14px', width: '100%', boxSizing: 'border-box',
                  boxShadow: status === 'active' ? `0 0 0 4px ${c.border}30` : '0 1px 4px rgba(0,0,0,0.04)',
                  animation: status === 'active' ? 'kpi-pulse 2s ease-in-out infinite' : 'none',
                  position: 'relative',
                }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{step.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, color: c.text, textTransform: 'uppercase' }}>{step.label}</div>
                  <div style={{ marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }}/>
                    <span style={{ fontSize: 10, color: c.text, fontWeight: 600 }}>
                      {status === 'done' ? 'Approved' : status === 'active' ? 'Pending' : status === 'returned' ? 'Returned' : status === 'pending' ? 'Awaiting' : 'Waiting'}
                    </span>
                  </div>
                  {ap?.acted_at && (
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3 }}>
                      {new Date(ap.acted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                  )}
                  {ap?.remarks && (
                    <div style={{ fontSize: 9, color: BRAND, fontStyle: 'italic', marginTop: 3, lineHeight: 1.3 }}>
                      "{ap.remarks.slice(0, 50)}{ap.remarks.length > 50 ? '…' : ''}"
                    </div>
                  )}

                  {/* Action buttons */}
                  {canActThis && !isActing && (
                    <button onClick={() => setActingOn(step.role)}
                      style={{ marginTop: 8, width: '100%', padding: '5px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: `linear-gradient(135deg,${BRAND},${BRAND2})`, color: '#fff', border: 'none' }}>
                      Act Now
                    </button>
                  )}
                  {canActThis && isActing && (
                    <div style={{ marginTop: 6 }}>
                      <textarea rows={2} placeholder="Remarks (optional)"
                        value={remarksInput[step.role] || ''}
                        onChange={e => setRemarksInput(p => ({ ...p, [step.role]: e.target.value }))}
                        style={{ width: '100%', borderRadius: 6, border: '1px solid rgba(22,38,96,0.2)', fontSize: 10, padding: '4px 6px', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#1e293b', background: '#fff' }}/>
                      <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                        <button onClick={() => { onAction(step.role, 'approve', remarksInput[step.role]); setActingOn(null); }}
                          style={{ flex: 1, padding: '4px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✓ Approve</button>
                        <button onClick={() => { onAction(step.role, 'return', remarksInput[step.role]); setActingOn(null); }}
                          style={{ flex: 1, padding: '4px', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>↩ Return</button>
                      </div>
                      <button onClick={() => setActingOn(null)}
                        style={{ width: '100%', marginTop: 3, padding: '3px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(22,38,96,0.15)', fontSize: 9, cursor: 'pointer', color: BRAND }}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Goals Editor ─────────────────────────────────────────────────────────────
function GoalsEditor({ reportId, existingItems, onSaved, readOnly = false }) {
  const [items, setItems] = useState(
    existingItems?.length > 0
      ? existingItems.map(i => ({ ...i, weightage: String(i.weightage) }))
      : [{ item_name: '', description: '', weightage: '', target: '' }]
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const totalWeight = items.reduce((s, i) => s + (parseFloat(i.weightage) || 0), 0);
  const isValid = Math.abs(totalWeight - 10) < 0.01 && items.every(i => i.item_name.trim());

  const addItem = () => setItems(p => [...p, { item_name: '', description: '', weightage: '', target: '' }]);
  const removeItem = (idx) => setItems(p => p.filter((_, i) => i !== idx));
  const update = (idx, f, v) => setItems(p => p.map((item, i) => i === idx ? { ...item, [f]: v } : item));

  const save = async () => {
    if (!isValid) { setMsg('Weightages must sum to 10 and all items need names.'); return; }
    setSaving(true);
    try {
      await kpiYearlyAPI.saveGoals(reportId, { items });
      setMsg('✓ Goals saved'); onSaved?.();
    } catch (e) { setMsg('Error: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3500); }
  };

  const weightColor = Math.abs(totalWeight - 10) < 0.01 ? '#10b981' : totalWeight > 10 ? '#ef4444' : '#f59e0b';

  return (
    <div>
      {/* Weightage header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 3 }}>TOTAL WEIGHTAGE</div>
          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min((totalWeight / 10) * 100, 100)}%`, height: '100%', background: weightColor, borderRadius: 99, transition: 'width 0.3s, background 0.3s' }}/>
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: weightColor, minWidth: 60, textAlign: 'right' }}>{totalWeight.toFixed(1)}/10</div>
        {isValid && <Check size={18} color="#10b981"/>}
      </div>

      {msg && <div style={{ padding: '7px 12px', borderRadius: 8, marginBottom: 10, fontSize: 12, background: msg.startsWith('Error') ? '#fef2f2' : '#ecfdf5', color: msg.startsWith('Error') ? '#b91c1c' : '#065f46', border: `1px solid ${msg.startsWith('Error') ? '#fecaca' : '#a7f3d0'}` }}>{msg}</div>}

      {items.map((item, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid rgba(22,38,96,0.1)', borderRadius: 12, padding: '14px', marginBottom: 8, position: 'relative' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 3 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(22,38,96,0.5)', display: 'block', marginBottom: 3 }}>KPI / GOAL *</label>
              <input value={item.item_name} onChange={e => update(i, 'item_name', e.target.value)}
                disabled={readOnly}
                placeholder="e.g. Complete 95% of assigned tickets on time"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(22,38,96,0.15)', fontSize: 12, outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: readOnly ? '#f8fafc' : '#fff' }}/>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(22,38,96,0.5)', display: 'block', marginBottom: 3 }}>WEIGHT *</label>
              <input type="number" min="0.1" max="10" step="0.1" value={item.weightage} onChange={e => update(i, 'weightage', e.target.value)}
                disabled={readOnly}
                placeholder="2.5"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${item.weightage && parseFloat(item.weightage) > 0 ? 'rgba(22,38,96,0.15)' : '#fbbf24'}`, fontSize: 12, outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: readOnly ? '#f8fafc' : '#fff' }}/>
            </div>
            {!readOnly && (
              <button onClick={() => removeItem(i)} style={{ marginTop: 18, padding: '7px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer', color: '#ef4444', flexShrink: 0, height: 34 }}>
                <X size={13}/>
              </button>
            )}
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(22,38,96,0.5)', display: 'block', marginBottom: 3 }}>TARGET / MILESTONE</label>
            <input value={item.target || ''} onChange={e => update(i, 'target', e.target.value)}
              disabled={readOnly}
              placeholder="Measurable target for this KPI..."
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(22,38,96,0.12)', fontSize: 11, outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: readOnly ? '#f8fafc' : '#fff' }}/>
          </div>
          {item.description !== undefined && (
            <div style={{ marginTop: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(22,38,96,0.5)', display: 'block', marginBottom: 3 }}>DESCRIPTION</label>
              <textarea value={item.description || ''} onChange={e => update(i, 'description', e.target.value)}
                disabled={readOnly} rows={2} placeholder="Additional context..."
                style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(22,38,96,0.12)', fontSize: 11, outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: readOnly ? '#f8fafc' : '#fff', resize: 'vertical', fontFamily: 'inherit' }}/>
            </div>
          )}
        </div>
      ))}

      {!readOnly && (
        <>
          <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, background: 'rgba(22,38,96,0.04)', border: '1px dashed rgba(22,38,96,0.2)', color: BRAND, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
            <Plus size={13}/> Add KPI Item
          </button>
          <button onClick={save} disabled={saving || !isValid}
            style={{ padding: '9px 22px', borderRadius: 10, background: isValid ? `linear-gradient(135deg,${BRAND},${BRAND2})` : '#e2e8f0', color: isValid ? '#fff' : '#94a3b8', border: 'none', fontWeight: 700, fontSize: 13, cursor: isValid ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
            {saving ? '⏳ Saving…' : '💾 Save Goals'}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Self Assessment Panel ────────────────────────────────────────────────────
function SelfAssessmentPanel({ report, onSaved }) {
  const [items, setItems] = useState(report.items?.map(i => ({ ...i, self_score: i.self_score ?? '', self_remarks: i.self_remarks || '' })) || []);
  const [empRemarks, setEmpRemarks] = useState(report.employee_remarks || '');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const allScored = items.every(i => i.self_score !== '' && i.self_score !== null && i.self_score !== undefined);
  const update = (idx, f, v) => setItems(p => p.map((item, i) => i === idx ? { ...item, [f]: v } : item));

  const save = async () => {
    setSaving(true);
    try {
      await kpiYearlyAPI.saveSelfAssessment(report.id, { items, employee_remarks: empRemarks });
      setMsg('✓ Saved'); onSaved?.();
    } catch (e) { setMsg('Error: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  const submit = async () => {
    if (!allScored) { setMsg('Please score all KPI items before submitting.'); return; }
    setSubmitting(true);
    try {
      await kpiYearlyAPI.saveSelfAssessment(report.id, { items, employee_remarks: empRemarks });
      await kpiYearlyAPI.submitSelfAssessment(report.id);
      setMsg('✓ Submitted for manager review!'); onSaved?.();
    } catch (e) { setMsg('Error: ' + (e.response?.data?.message || e.message)); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      {msg && <div style={{ padding: '7px 12px', borderRadius: 8, marginBottom: 12, fontSize: 12, background: msg.startsWith('Error') ? '#fef2f2' : '#ecfdf5', color: msg.startsWith('Error') ? '#b91c1c' : '#065f46', border: `1px solid ${msg.startsWith('Error') ? '#fecaca' : '#a7f3d0'}` }}>{msg}</div>}

      <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
        📝 Score each KPI item from 0–10 based on your actual achievement against the agreed target.
      </div>

      {items.map((item, i) => {
        const score = parseFloat(item.self_score) || 0;
        const scoreColor = score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444';
        return (
          <div key={i} style={{ background: '#fff', border: '1px solid rgba(22,38,96,0.1)', borderRadius: 12, padding: '14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: BRAND }}>{item.item_name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Weight: <strong>{item.weightage}</strong> · Target: {item.target || 'N/A'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="number" min="0" max="10" value={item.self_score ?? ''}
                  onChange={e => update(i, 'self_score', e.target.value)}
                  placeholder="Score"
                  style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: `2px solid ${item.self_score !== '' ? scoreColor : '#e2e8f0'}`, fontSize: 14, fontWeight: 800, color: scoreColor, textAlign: 'center', outline: 'none', background: '#fff' }}/>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>/10</span>
              </div>
            </div>
            <div style={{ height: 4, background: '#f1f5f9', borderRadius: 99, marginBottom: 8 }}>
              <div style={{ width: `${score * 10}%`, height: '100%', background: scoreColor, borderRadius: 99, transition: 'width 0.3s' }}/>
            </div>
            <input value={item.self_remarks || ''} onChange={e => update(i, 'self_remarks', e.target.value)}
              placeholder="Your remarks on this KPI..."
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(22,38,96,0.12)', fontSize: 11, outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#fff' }}/>
          </div>
        );
      })}

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(22,38,96,0.5)', display: 'block', marginBottom: 4 }}>YOUR OVERALL REMARKS</label>
        <textarea rows={3} value={empRemarks} onChange={e => setEmpRemarks(e.target.value)}
          placeholder="Overall self-assessment remarks..."
          style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(22,38,96,0.15)', fontSize: 12, padding: '8px 12px', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#fff' }}/>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={save} disabled={saving}
          style={{ padding: '9px 18px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {saving ? '⏳ Saving…' : '💾 Save Draft'}
        </button>
        <button onClick={submit} disabled={submitting || !allScored}
          style={{ flex: 1, padding: '9px 22px', borderRadius: 10, background: allScored ? `linear-gradient(135deg,#10b981,#059669)` : '#e2e8f0', color: allScored ? '#fff' : '#94a3b8', border: 'none', fontWeight: 700, fontSize: 13, cursor: allScored ? 'pointer' : 'not-allowed' }}>
          {submitting ? '⏳ Submitting…' : '📤 Submit for Manager Review'}
        </button>
      </div>
    </div>
  );
}

// ─── Manager Scoring Panel ────────────────────────────────────────────────────
function ManagerScoringPanel({ report, empType, onAction }) {
  const [items, setItems] = useState(report.items?.map(i => ({ ...i, manager_score: i.manager_score ?? '', manager_item_remarks: i.manager_item_remarks || '' })) || []);
  const [mgrRemarks, setMgrRemarks] = useState(report.manager_remarks || '');
  const [action, setAction] = useState(null); // 'forward' | 'return'
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const update = (idx, f, v) => setItems(p => p.map((item, i) => i === idx ? { ...item, [f]: v } : item));

  const submit = async () => {
    setLoading(true);
    try {
      await kpiYearlyAPI.managerReview(report.id, { action, items, manager_remarks: mgrRemarks });
      setMsg(action === 'forward' ? '✓ Report forwarded for review' : '✓ Report returned to employee');
      onAction?.();
    } catch (e) { setMsg('Error: ' + (e.response?.data?.message || e.message)); }
    finally { setLoading(false); }
  };

  // Determine where it goes next
  const nextStageLabel = (() => {
    if (report.dept_name === 'Sales') return 'Sales Lead';
    return 'CPO';
  })();

  return (
    <div>
      {msg && <div style={{ padding: '7px 12px', borderRadius: 8, marginBottom: 12, fontSize: 12, background: msg.startsWith('Error') ? '#fef2f2' : '#ecfdf5', color: msg.startsWith('Error') ? '#b91c1c' : '#065f46', border: `1px solid ${msg.startsWith('Error') ? '#fecaca' : '#a7f3d0'}` }}>{msg}</div>}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: BRAND, marginBottom: 8 }}>Score Each KPI Item (0–10)</div>
        {items.map((item, i) => {
          const selfScore = parseFloat(item.self_score) || 0;
          const mgrScore = parseFloat(item.manager_score) || 0;
          const diff = mgrScore - selfScore;
          return (
            <div key={i} style={{ background: '#fff', border: '1px solid rgba(22,38,96,0.1)', borderRadius: 12, padding: '12px 14px', marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: BRAND }}>{item.item_name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Weight: {item.weightage} · Target: {item.target || 'N/A'}</div>
                  <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 1 }}>
                    Employee self-score: <strong>{item.self_score ?? '—'}/10</strong>
                    {item.self_remarks && <span style={{ color: '#94a3b8', fontStyle: 'italic' }}> — "{item.self_remarks}"</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10 }}>
                  <input type="number" min="0" max="10" value={item.manager_score ?? ''}
                    onChange={e => update(i, 'manager_score', e.target.value)}
                    placeholder="Score"
                    style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: '2px solid rgba(22,38,96,0.2)', fontSize: 14, fontWeight: 800, color: BRAND, textAlign: 'center', outline: 'none' }}/>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>/10</span>
                  {item.manager_score !== '' && item.self_score !== null && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#94a3b8' }}>
                      {diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
              <input value={item.manager_item_remarks || ''} onChange={e => update(i, 'manager_item_remarks', e.target.value)}
                placeholder="Manager remarks on this KPI..."
                style={{ width: '100%', padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(22,38,96,0.12)', fontSize: 11, outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#fff' }}/>
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(22,38,96,0.5)', display: 'block', marginBottom: 4 }}>OVERALL MANAGER REMARKS</label>
        <textarea rows={3} value={mgrRemarks} onChange={e => setMgrRemarks(e.target.value)}
          placeholder="Overall performance assessment..."
          style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(22,38,96,0.15)', fontSize: 12, padding: '8px 12px', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#fff' }}/>
      </div>

      {!action ? (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setAction('return')}
            style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ↩ Return to Employee
          </button>
          <button onClick={() => setAction('forward')}
            style={{ flex: 2, padding: '10px', borderRadius: 10, background: `linear-gradient(135deg,${BRAND},${BRAND2})`, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Forward to {nextStageLabel} →
          </button>
        </div>
      ) : (
        <div style={{ background: action === 'return' ? '#fef2f2' : '#ecfdf5', border: `1px solid ${action === 'return' ? '#fecaca' : '#a7f3d0'}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: action === 'return' ? '#b91c1c' : '#065f46', marginBottom: 10 }}>
            {action === 'return' ? '↩ Return report to employee for revision?' : `Forward to ${nextStageLabel} for review?`}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submit} disabled={loading}
              style={{ flex: 1, padding: '9px', borderRadius: 8, background: action === 'return' ? '#ef4444' : '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {loading ? '⏳…' : 'Confirm'}
            </button>
            <button onClick={() => setAction(null)}
              style={{ padding: '9px 16px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KRA Discussion Panel ─────────────────────────────────────────────────────
function KRADiscussionPanel({ report, existingKRA, onSaved }) {
  const [form, setForm] = useState({
    increment_percentage: existingKRA?.increment_percentage || '',
    increment_amount: existingKRA?.increment_amount || '',
    new_grade: existingKRA?.new_grade || '',
    new_designation: existingKRA?.new_designation || '',
    kra_score: existingKRA?.kra_score || '',
    discussion_notes: existingKRA?.discussion_notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setSaving(true);
    try {
      await kpiYearlyAPI.recordKRA(report.id, form);
      setMsg('✓ KRA discussion recorded'); onSaved?.();
    } catch (e) { setMsg('Error: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3500); }
  };

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  return (
    <div>
      {msg && <div style={{ padding: '7px 12px', borderRadius: 8, marginBottom: 12, fontSize: 12, background: msg.startsWith('Error') ? '#fef2f2' : '#ecfdf5', color: msg.startsWith('Error') ? '#b91c1c' : '#065f46', border: `1px solid ${msg.startsWith('Error') ? '#fecaca' : '#a7f3d0'}` }}>{msg}</div>}

      <div style={{ background: 'linear-gradient(135deg,#1e3a8a10,#7c3aed10)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid rgba(124,58,237,0.15)' }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: BRAND, marginBottom: 4 }}>📋 KRA Discussion Summary</div>
        <div style={{ fontSize: 12, color: '#475569' }}>
          Employee: <strong>{report.emp_name}</strong> · Year: <strong>{report.year}</strong> · Final Score: <strong>{parseFloat(report.overall_score || 0).toFixed(1)}/100</strong>
        </div>
        {report.ai_insights?.increment_suggestion && (
          <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 4 }}>
            🤖 AI Suggestion: <strong>{report.ai_insights.increment_suggestion}</strong>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {[
          { label: 'INCREMENT %', field: 'increment_percentage', placeholder: 'e.g. 12.5', suffix: '%' },
          { label: 'INCREMENT AMOUNT (₹)', field: 'increment_amount', placeholder: 'e.g. 8000' },
          { label: 'NEW GRADE', field: 'new_grade', placeholder: 'e.g. L3 / Senior' },
          { label: 'NEW DESIGNATION', field: 'new_designation', placeholder: 'Optional' },
          { label: 'KRA SCORE (0-100)', field: 'kra_score', placeholder: 'Discussion score' },
        ].map(f => (
          <div key={f.field}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(22,38,96,0.5)', display: 'block', marginBottom: 4 }}>{f.label}</label>
            <input type="text" value={form[f.field]} onChange={e => upd(f.field, e.target.value)} placeholder={f.placeholder}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(22,38,96,0.15)', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#fff' }}/>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(22,38,96,0.5)', display: 'block', marginBottom: 4 }}>DISCUSSION NOTES</label>
        <textarea rows={4} value={form.discussion_notes} onChange={e => upd('discussion_notes', e.target.value)}
          placeholder="Key points discussed, rationale for increment decision, future goals agreed upon..."
          style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(22,38,96,0.15)', fontSize: 12, padding: '8px 12px', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#fff' }}/>
      </div>

      <button onClick={save} disabled={saving}
        style={{ padding: '10px 24px', borderRadius: 10, background: `linear-gradient(135deg,#7c3aed,#4f46e5)`, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <DollarSign size={15}/> {saving ? 'Recording…' : existingKRA ? 'Update KRA Decision' : 'Record KRA Decision'}
      </button>
    </div>
  );
}

// ─── AI Insights Card ─────────────────────────────────────────────────────────
function AIInsightsCard({ insights, onClose }) {
  if (!insights) return null;
  const rColor = { 'Outstanding': '#065f46', 'Exceeds Expectations': '#1d4ed8', 'Meets Expectations': '#b45309', 'Needs Improvement': '#b91c1c', 'Unsatisfactory': '#7f1d1d' };
  const rBg    = { 'Outstanding': '#ecfdf5', 'Exceeds Expectations': '#eff6ff', 'Meets Expectations': '#fef3c7', 'Needs Improvement': '#fef2f2', 'Unsatisfactory': '#fee2e2' };
  return (
    <Modal title="✨ AI Annual Performance Insights" onClose={onClose} theme="light">
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {insights.overall_rating && (
          <div style={{ background: rBg[insights.overall_rating] || '#f1f5f9', borderRadius: 12, padding: '12px 16px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>OVERALL ANNUAL RATING</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: rColor[insights.overall_rating] || '#1e293b' }}>{insights.overall_rating}</div>
            {insights.increment_suggestion && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>💡 Suggested Increment: <strong style={{ color: '#059669' }}>{insights.increment_suggestion}</strong></div>
            )}
          </div>
        )}
        {[
          { title: 'SUMMARY', content: insights.summary },
          { title: 'SCORE ANALYSIS', content: insights.score_analysis },
          { title: 'RECOMMENDATION', content: insights.recommendation },
        ].map(s => s.content && (
          <div key={s.title} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>{s.title}</div>
            <p style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6, margin: 0 }}>{s.content}</p>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#ecfdf5', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>💪 KEY STRENGTHS</div>
            {(insights.key_strengths || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: 3 }}>
                <Check size={11} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }}/>
                <span style={{ fontSize: 12, color: '#065f46' }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#fef2f2', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', marginBottom: 6 }}>📈 AREAS TO IMPROVE</div>
            {(insights.areas_for_improvement || []).map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: 3 }}>
                <TrendingUp size={11} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }}/>
                <span style={{ fontSize: 12, color: '#b91c1c' }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Report Detail Drawer ─────────────────────────────────────────────────────
function ReportDetail({ report: initialReport, currentUser, onAction, onClose }) {
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState(report?.ai_insights || null);
  const [showAI, setShowAI] = useState(false);
  const [activePanel, setActivePanel] = useState('overview'); // overview | goals | self | manager | kra
  const [msg, setMsg] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await kpiYearlyAPI.getReport(report.id);
      setReport(r.data.data);
    } catch(e) {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReport.id]);

  const isManager = currentUser.id === report.reporting_manager_id || currentUser.role === 'super_admin' || currentUser.role === 'hr_manager';
  const isEmployee = currentUser.emp_id === report.emp_id;
  const isCPO = currentUser.role === 'hr_manager' || currentUser.role === 'super_admin';
  const isMD = currentUser.role === 'super_admin';

  const handleApprovalAction = async (role, actionType, remarks) => {
    try {
      if (role === 'cpo') await kpiYearlyAPI.cpoAction(report.id, { action: actionType, remarks });
      else if (role === 'sales_lead') await kpiYearlyAPI.salesLeadAction(report.id, { action: actionType, remarks });
      else if (role === 'md') await kpiYearlyAPI.mdAction(report.id, { action: actionType, remarks });
      setMsg('✓ Action recorded'); refresh(); onAction?.();
    } catch(e) { setMsg('Error: ' + (e.response?.data?.message || e.message)); }
  };

  const handlePublish = async () => {
    try {
      await kpiYearlyAPI.publishReport(report.id);
      setMsg('✓ Report published!'); refresh(); onAction?.();
    } catch(e) { setMsg('Error: ' + (e.response?.data?.message || e.message)); }
  };

  const handleFinalizeGoals = async () => {
    try {
      await kpiYearlyAPI.finalizeGoals(report.id);
      setMsg('✓ Goals finalized and locked'); refresh();
    } catch(e) { setMsg('Error: ' + (e.response?.data?.message || e.message)); }
  };

  const handleUnfreezeGoals = async () => {
    try {
      await kpiYearlyAPI.unfreezeGoals(report.id, { reason: 'Manager override' });
      setMsg('✓ Goals unlocked for editing'); refresh();
    } catch(e) { setMsg('Error: ' + (e.response?.data?.message || e.message)); }
  };

  const handleOpenSelfAssessment = async () => {
    try {
      await kpiYearlyAPI.openSelfAssessment(report.id);
      setMsg('✓ Self-assessment window opened'); refresh();
    } catch(e) { setMsg('Error: ' + (e.response?.data?.message || e.message)); }
  };

  const handleAI = async () => {
    setAiLoading(true);
    try {
      const r = await kpiYearlyAPI.aiInsights(report.id);
      setAiInsights(r.data.data);
      setShowAI(true);
    } catch(e) { setMsg('Error: ' + e.message); }
    finally { setAiLoading(false); }
  };

  // Compute can-act flags for workflow tree
  const canAct = {
    reporting_manager: isManager && report.status === 'Submitted',
    cpo: isCPO && report.status === 'CPO Review',
    sales_lead: (currentUser.role === 'dept_head' || currentUser.role === 'hr_manager' || currentUser.role === 'super_admin') && report.status === 'Sales Lead Review',
    md: isMD && report.status === 'MD Review',
  };

  const PANELS = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'goals', label: 'KPI Goals', icon: Target },
    ...(isEmployee && report.status === 'Self Assessment Open' ? [{ id: 'self', label: 'Self Assess', icon: Edit3 }] : []),
    ...(isManager && report.status === 'Submitted' ? [{ id: 'manager', label: 'Manager Review', icon: Award }] : []),
    ...(isMD && report.status === 'Published' ? [{ id: 'kra', label: 'KRA Discussion', icon: DollarSign }] : []),
    ...(isCPO && report.status === 'Published' && !isMD && !report.kra_discussion ? [{ id: 'kra', label: 'KRA Discussion', icon: DollarSign }] : []),
  ];

  return (
    <>
      {showAI && aiInsights && <AIInsightsCard insights={aiInsights} onClose={() => setShowAI(false)}/>}

      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 680, background: '#fff', boxShadow: '-8px 0 32px rgba(22,38,96,0.12)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg,${BRAND},${BRAND2})`, padding: '20px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{report.emp_name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{report.dept_name} · {report.designation_name || ''} · {report.cycle_name}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {['Submitted', 'CPO Review', 'Sales Lead Review', 'MD Review', 'Approved', 'Published'].includes(report.status) && (
                <button onClick={handleAI} disabled={aiLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {aiLoading ? <RefreshCw size={12} style={{ animation: 'kpi-spin 1s linear infinite' }}/> : <Sparkles size={12}/>} AI Insights
                </button>
              )}
              {report.status === 'Approved' && isMD && (
                <button onClick={handlePublish}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  <Send size={12}/> Publish
                </button>
              )}
              <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18}/>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge status={report.status}/>
            <EmpTypeBadge type={report.employee_type}/>
            {report.goals_frozen && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>
                <Lock size={9}/> Goals Frozen
              </span>
            )}
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
            {[
              { label: 'Self Score', value: report.overall_self_score ? `${parseFloat(report.overall_self_score).toFixed(1)}` : '—' },
              { label: 'Mgr Score', value: report.overall_manager_score ? `${parseFloat(report.overall_manager_score).toFixed(1)}` : '—' },
              { label: 'Final Score', value: report.overall_score ? `${parseFloat(report.overall_score).toFixed(1)}` : '—' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Manager actions bar */}
        {isManager && (
          <div style={{ padding: '10px 24px', background: '#f8fafc', borderBottom: '1px solid rgba(22,38,96,0.08)', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
            {report.status === 'Draft' && !report.goals_frozen && (report.items?.length > 0) && (
              <button onClick={handleFinalizeGoals}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: `linear-gradient(135deg,${BRAND},${BRAND2})`, color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                <Lock size={11}/> Finalize & Lock Goals
              </button>
            )}
            {report.status === 'Goals Set' && (
              <>
                <button onClick={handleOpenSelfAssessment}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  <Edit3 size={11}/> Open Self-Assessment
                </button>
                <button onClick={handleUnfreezeGoals}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  <Unlock size={11}/> Edit Goals (Unfreeze)
                </button>
              </>
            )}
            {['Goals Set', 'Self Assessment Open'].includes(report.status) && report.goals_frozen && (
              <button onClick={handleUnfreezeGoals}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                <Unlock size={11}/> Unfreeze Goals
              </button>
            )}
          </div>
        )}

        {msg && (
          <div style={{ margin: '8px 24px 0', padding: '7px 12px', borderRadius: 8, fontSize: 12, background: msg.startsWith('Error') ? '#fef2f2' : '#ecfdf5', color: msg.startsWith('Error') ? '#b91c1c' : '#065f46', border: `1px solid ${msg.startsWith('Error') ? '#fecaca' : '#a7f3d0'}`, flexShrink: 0 }}>{msg}</div>
        )}

        {/* Tabs */}
        <div style={{ padding: '10px 24px 0', borderBottom: '1px solid rgba(22,38,96,0.08)', display: 'flex', gap: 4, flexShrink: 0, overflowX: 'auto' }}>
          {PANELS.map(p => (
            <button key={p.id} onClick={() => setActivePanel(p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                background: activePanel === p.id ? '#fff' : 'transparent',
                color: activePanel === p.id ? BRAND : 'rgba(22,38,96,0.45)',
                borderBottom: activePanel === p.id ? `2px solid ${BRAND}` : '2px solid transparent' }}>
              <p.icon size={12}/>{p.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading && <div style={{ textAlign: 'center', padding: 40 }}><Loader/></div>}

          {/* Overview tab */}
          {activePanel === 'overview' && !loading && (
            <div>
              {/* Workflow */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: BRAND, marginBottom: 8 }}>Approval Pipeline</div>
                <WorkflowPipeline report={report} onAction={handleApprovalAction} canAct={canAct}/>
              </div>

              {/* Score cards */}
              {(report.overall_score > 0 || report.overall_self_score > 0) && (
                <div style={{ display: 'flex', gap: 20, marginBottom: 20, justifyContent: 'center' }}>
                  {report.overall_self_score > 0 && <ScoreGauge score={report.overall_self_score} label="Self Score" size={80}/>}
                  {report.overall_manager_score > 0 && <ScoreGauge score={report.overall_manager_score} label="Manager Score" size={80}/>}
                  {report.overall_score > 0 && <ScoreGauge score={report.overall_score} label="Final Score" size={100}/>}
                </div>
              )}

              {/* Remarks */}
              {[
                { label: 'Employee Remarks', value: report.employee_remarks, color: '#7c3aed' },
                { label: 'Manager Remarks', value: report.manager_remarks, color: BRAND },
                { label: 'CPO Remarks', value: report.cpo_remarks, color: '#065f46' },
                { label: 'MD Remarks', value: report.md_remarks, color: '#86198f' },
              ].filter(r => r.value).map(r => (
                <div key={r.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 8, borderLeft: `3px solid ${r.color}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: r.color, marginBottom: 3 }}>{r.label.toUpperCase()}</div>
                  <div style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.5 }}>{r.value}</div>
                </div>
              ))}

              {/* KRA Decision */}
              {report.kra_discussion && (
                <div style={{ background: 'linear-gradient(135deg,#1e3a8a08,#7c3aed08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: 16, marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', marginBottom: 10 }}>💰 KRA Discussion Outcome</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    {[
                      { label: 'Increment %', value: report.kra_discussion.increment_percentage ? `${report.kra_discussion.increment_percentage}%` : '—' },
                      { label: 'Increment Amount', value: report.kra_discussion.increment_amount ? `₹${parseFloat(report.kra_discussion.increment_amount).toLocaleString()}` : '—' },
                      { label: 'New Grade', value: report.kra_discussion.new_grade || '—' },
                    ].map(d => (
                      <div key={d.label} style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: '10px 6px' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#7c3aed' }}>{d.value}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{d.label}</div>
                      </div>
                    ))}
                  </div>
                  {report.kra_discussion.discussion_notes && (
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, fontStyle: 'italic' }}>"{report.kra_discussion.discussion_notes}"</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Goals tab */}
          {activePanel === 'goals' && !loading && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: BRAND }}>KPI Goals for {report.cycle_name}</div>
                {report.goals_frozen && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#64748b', borderRadius: 20, padding: '3px 10px', fontSize: 10 }}><Lock size={9}/> Locked</span>}
              </div>
              <GoalsEditor
                reportId={report.id}
                existingItems={report.items}
                readOnly={report.goals_frozen && !isManager}
                onSaved={() => refresh()}
              />
            </div>
          )}

          {/* Self Assessment tab */}
          {activePanel === 'self' && !loading && (
            <SelfAssessmentPanel report={report} onSaved={() => { refresh(); onAction?.(); }}/>
          )}

          {/* Manager Review tab */}
          {activePanel === 'manager' && !loading && (
            <ManagerScoringPanel report={report} empType={report.employee_type} onAction={() => { refresh(); onAction?.(); }}/>
          )}

          {/* KRA Discussion tab */}
          {activePanel === 'kra' && !loading && (
            <KRADiscussionPanel report={report} existingKRA={report.kra_discussion} onSaved={() => { refresh(); onAction?.(); }}/>
          )}
        </div>
      </div>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }}/>
    </>
  );
}

// ─── Report Card (list view) ──────────────────────────────────────────────────
function ReportCard({ report, onOpen, onDelete, currentUser }) {
  const score = parseFloat(report.overall_score) || 0;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const m = STATUS_META[report.status] || STATUS_META['Draft'];
  
  const isElevated = currentUser?.role === 'super_admin' || currentUser?.role === 'hr_manager';
  const isManager = currentUser?.id === report.reporting_manager_id;
  const canDelete = isElevated || (isManager && report.status === 'Draft');
  return (
    <div onClick={() => onOpen(report)}
      style={{ background: '#fff', border: '1px solid rgba(22,38,96,0.1)', borderRadius: 16, padding: '14px 18px', marginBottom: 8, cursor: 'pointer', boxShadow: '0 2px 10px rgba(22,38,96,0.04)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 14 }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(22,38,96,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(22,38,96,0.04)'; e.currentTarget.style.transform = 'none'; }}>
      {/* Score circle */}
      <div style={{ width: 46, height: 46, borderRadius: '50%', border: `3px solid ${score > 0 ? scoreColor : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: score > 0 ? scoreColor : '#94a3b8', background: '#f8fafc', flexShrink: 0 }}>
        {score > 0 ? score.toFixed(0) : '—'}
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: BRAND, marginBottom: 2 }}>{report.emp_name}</div>
        <div style={{ fontSize: 11, color: 'rgba(22,38,96,0.5)' }}>{report.dept_name} · {report.designation_name || ''}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <EmpTypeBadge type={report.employee_type}/>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>{report.cycle_name}</span>
        </div>
      </div>
      {/* Status & arrow */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <StatusBadge status={report.status}/>
        {report.kra_discussion && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: 20 }}>
            💰 {report.kra_discussion.increment_percentage}% increment
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          {canDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(report.id); }}
              style={{ padding: 4, borderRadius: 6, background: '#fef2f2', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Delete Report"
            >
              <Trash2 size={13}/>
            </button>
          )}
          <ChevronDown size={14} color="rgba(22,38,96,0.3)"/>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KPIYearly() {
  const { user, isMin } = useAuth();

  const [reports, setReports] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [tab, setTab] = useState('reports'); // reports | cycles | create
  const [msg, setMsg] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Create report form
  const [createForm, setCreateForm] = useState({ cycle_id: '', emp_id: '' });
  const [createLoading, setCreateLoading] = useState(false);

  // Create cycle form
  const [cycleForm, setCycleForm] = useState({ year: new Date().getFullYear(), name: '', start_date: '', end_date: '', goal_deadline: '', self_assessment_deadline: '' });
  const [cycleLoading, setCycleLoading] = useState(false);

  const showMsg = useCallback((m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, cRes] = await Promise.all([
        kpiYearlyAPI.listReports().catch(() => ({ data: { data: [] } })),
        kpiYearlyAPI.listCycles().catch(() => ({ data: { data: [] } })),
      ]);
      setReports(rRes.data.data || []);
      setCycles(cRes.data.data || []);
      // Load employees for everyone — backend filters what they can create for
      const eRes = await empAPI.list({ limit: 300, status: 'Active' }).catch(() => ({ data: { data: { employees: [] } } }));
      setEmployees(eRes.data.data?.employees || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateReport = async () => {
    if (!createForm.cycle_id || !createForm.emp_id) { showMsg('Please select cycle and employee.'); return; }
    setCreateLoading(true);
    try {
      await kpiYearlyAPI.createReport(createForm);
      showMsg('✓ Report created');
      setCreateForm({ cycle_id: '', emp_id: '' });
      setTab('reports');
      loadData();
    } catch (e) { showMsg('Error: ' + (e.response?.data?.message || e.message)); }
    finally { setCreateLoading(false); }
  };

  const handleCreateCycle = async () => {
    if (!cycleForm.year || !cycleForm.start_date || !cycleForm.end_date) { showMsg('Year, start date and end date are required.'); return; }
    setCycleLoading(true);
    try {
      await kpiYearlyAPI.createCycle({ ...cycleForm, name: cycleForm.name || `FY ${cycleForm.year}-${parseInt(cycleForm.year) + 1}` });
      showMsg('✓ Cycle created/updated');
      setCycleForm({ year: new Date().getFullYear(), name: '', start_date: '', end_date: '', goal_deadline: '', self_assessment_deadline: '' });
      loadData();
    } catch (e) { showMsg('Error: ' + (e.response?.data?.message || e.message)); }
    finally { setCycleLoading(false); }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm('Are you sure you want to delete this KPI report? This action cannot be undone.')) return;
    try {
      await kpiYearlyAPI.deleteReport(id);
      showMsg('✓ Report deleted successfully');
      loadData();
    } catch (e) { showMsg('Error: ' + (e.response?.data?.message || e.message)); }
  };

  // Derived counts
  // For the employee dropdown in "New Report" tab:
  // dept_head+ sees all employees; reporting manager sees their reportees (filter by their emp_id)
  const myReportees = isMin('dept_head')
    ? employees
    : employees.filter(e => e.reporting_manager_id === user?.emp_id);

  // Can act as manager: dept_head+ OR has employees reporting to them
  const canManage = isMin('dept_head') || myReportees.length > 0;

  const myPendingCount = reports.filter(r => {
    if (user?.role === 'hr_manager') return r.status === 'CPO Review';
    if (user?.role === 'super_admin') return ['MD Review', 'Approved'].includes(r.status);
    // Reporting managers see their team's Drafts, Goals Set (need to open self-assess), and Submitted reports as pending
    if (r.reporting_manager_id === user?.id) return ['Draft', 'Goals Set', 'Submitted'].includes(r.status);
    // Employees see Self Assessment Open as pending
    if (r.emp_id === user?.emp_id) return r.status === 'Self Assessment Open';
    return false;
  }).length;

  const activeCycle = cycles.find(c => c.is_active);

  const { searchQuery, setSearchQuery, currentPage, setCurrentPage, paginatedData, totalPages } =
    usePaginationAndSearch(reports, ['emp_name', 'emp_id', 'dept_name', 'status', 'cycle_name'], 12);

  const TABS = [
    { id: 'reports', label: myPendingCount > 0 ? `Reports (${myPendingCount} pending)` : 'Reports', icon: BarChart2 },
    ...(canManage ? [{ id: 'create', label: 'New Report', icon: Plus }] : []),
    ...(isMin('hr_manager') ? [{ id: 'cycles', label: 'Manage Cycles', icon: Calendar }] : []),
  ];

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(22,38,96,0.15)', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#fff' };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'rgba(22,38,96,0.55)', display: 'block', marginBottom: 5 };

  return (
    <Layout title="KPI & KRA" theme="light" bg="#F8F8FF">
      <style>{`
        @keyframes kpi-spin  { to{transform:rotate(360deg)} }
        @keyframes kpi-pulse { 0%,100%{box-shadow:0 0 0 4px rgba(59,130,246,0.2)} 50%{box-shadow:0 0 0 8px rgba(59,130,246,0.05)} }
        @keyframes kpi-fade  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .kpi-anim { animation: kpi-fade 0.3s ease; }
      `}</style>

      {/* Hero stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Reports', value: reports.length, icon: BarChart2, color: BRAND },
          { label: 'Active Cycle', value: activeCycle?.name || '—', icon: Calendar, color: '#7c3aed' },
          { label: 'Published', value: reports.filter(r => r.status === 'Published').length, icon: Award, color: '#10b981' },
          { label: 'Pending Review', value: reports.filter(r => ['CPO Review', 'MD Review', 'Submitted', 'Sales Lead Review'].includes(r.status)).length, icon: AlertCircle, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(22,38,96,0.08)', boxShadow: '0 2px 8px rgba(22,38,96,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={18} color={s.color}/>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {msg && <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 14, fontSize: 13, background: msg.startsWith('Error') ? '#fef2f2' : '#ecfdf5', color: msg.startsWith('Error') ? '#b91c1c' : '#065f46', border: `1px solid ${msg.startsWith('Error') ? '#fecaca' : '#a7f3d0'}` }}>{msg}</div>}

      {/* Main card */}
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(22,38,96,0.1)', boxShadow: '0 4px 20px rgba(22,38,96,0.06)', overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(22,38,96,0.08)', padding: '0 24px', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: 'transparent', whiteSpace: 'nowrap',
                color: tab === t.id ? BRAND : 'rgba(22,38,96,0.45)',
                borderBottom: tab === t.id ? `3px solid ${BRAND}` : '3px solid transparent' }}>
              <t.icon size={14}/>{t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {/* ── Reports Tab ─────────────────────────────────────────────────── */}
          {tab === 'reports' && (
            <div className="kpi-anim">
              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
                <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by employee, department, status..."
                  style={{ ...inputStyle, paddingLeft: 36 }}/>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><Loader/></div>
              ) : paginatedData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                  <Target size={40} style={{ opacity: 0.2, marginBottom: 10 }}/>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>No KPI reports found</div>
                  {canManage && <div style={{ fontSize: 12, marginTop: 4 }}>Create a report from the "New Report" tab</div>}
                </div>
              ) : (
                <>
                  {paginatedData.map(r => (
                    <ReportCard key={r.id} report={r} onOpen={setSelectedReport} onDelete={handleDeleteReport} currentUser={user}/>
                  ))}
                  <div style={{ marginTop: 16 }}>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}/>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Create Report Tab ──────────────────────────────────────────── */}
          {tab === 'create' && canManage && (
            <div className="kpi-anim" style={{ maxWidth: 520 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: BRAND, marginBottom: 4 }}>Create Yearly KPI Report</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Initiate a new annual KPI appraisal for an employee. You will set the KPI goals after creation.</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>CYCLE (YEAR) *</label>
                  <select value={createForm.cycle_id} onChange={e => setCreateForm(p => ({ ...p, cycle_id: e.target.value }))} style={inputStyle}>
                    <option value="">Select cycle...</option>
                    {cycles.map(c => <option key={c.id} value={c.id}>{c.name} — {c.year}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>EMPLOYEE *</label>
                  <select value={createForm.emp_id} onChange={e => setCreateForm(p => ({ ...p, emp_id: e.target.value }))} style={inputStyle}>
                    <option value="">Select employee...</option>
                    {myReportees.map(e => <option key={e.emp_id} value={e.emp_id}>{e.first_name} {e.last_name} ({e.emp_id})</option>)}
                  </select>
                </div>
                <button onClick={handleCreateReport} disabled={createLoading || !createForm.cycle_id || !createForm.emp_id}
                  style={{ padding: '11px 24px', borderRadius: 10, background: (createForm.cycle_id && createForm.emp_id) ? `linear-gradient(135deg,${BRAND},${BRAND2})` : '#e2e8f0', color: (createForm.cycle_id && createForm.emp_id) ? '#fff' : '#94a3b8', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Plus size={15}/> {createLoading ? 'Creating…' : 'Create Report & Set KPI Goals'}
                </button>
              </div>
            </div>
          )}

          {/* ── Cycles Tab ────────────────────────────────────────────────── */}
          {tab === 'cycles' && isMin('hr_manager') && (
            <div className="kpi-anim">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                {/* Create/update cycle */}
                <div style={{ background: '#f8fafc', borderRadius: 14, padding: 20, border: '1px solid rgba(22,38,96,0.08)' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: BRAND, marginBottom: 16 }}>Create / Update Cycle</div>
                  {[
                    { label: 'YEAR *', field: 'year', type: 'number', placeholder: '2026' },
                    { label: 'CYCLE NAME', field: 'name', type: 'text', placeholder: 'FY 2026-27' },
                    { label: 'START DATE *', field: 'start_date', type: 'date' },
                    { label: 'END DATE *', field: 'end_date', type: 'date' },
                    { label: 'GOAL DEADLINE', field: 'goal_deadline', type: 'date' },
                    { label: 'SELF ASSESSMENT DEADLINE', field: 'self_assessment_deadline', type: 'date' },
                  ].map(f => (
                    <div key={f.field} style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>{f.label}</label>
                      <input type={f.type} value={cycleForm[f.field] || ''} placeholder={f.placeholder || ''}
                        onChange={e => setCycleForm(p => ({ ...p, [f.field]: e.target.value }))}
                        style={inputStyle}/>
                    </div>
                  ))}
                  <button onClick={handleCreateCycle} disabled={cycleLoading}
                    style={{ padding: '10px 20px', borderRadius: 10, background: `linear-gradient(135deg,${BRAND},${BRAND2})`, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    {cycleLoading ? 'Saving…' : '💾 Save Cycle'}
                  </button>
                </div>

                {/* List cycles */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: BRAND, marginBottom: 14 }}>All Cycles</div>
                  {cycles.map(c => (
                    <div key={c.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 8, border: '1px solid rgba(22,38,96,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: BRAND, fontSize: 14 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {new Date(c.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} → {new Date(c.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        {c.goal_deadline && <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 1 }}>Goal deadline: {new Date(c.goal_deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>}
                      </div>
                      {c.is_active && (
                        <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>Active</span>
                      )}
                    </div>
                  ))}
                  {cycles.length === 0 && <div style={{ color: '#94a3b8', fontSize: 12 }}>No cycles yet.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Detail Drawer */}
      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          currentUser={user}
          onAction={loadData}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </Layout>
  );
}
