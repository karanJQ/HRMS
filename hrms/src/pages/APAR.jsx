import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import {
  Star, Plus, ChevronDown, ChevronUp, Check, X, Sparkles,
  Send, Settings, TrendingUp, Award, AlertCircle, Layers,
  RefreshCw, FileText, Target, Eye
} from 'lucide-react';
import { aparAPI, kpiAPI, empAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BRAND  = '#162660';
const GRADES = ['Outstanding', 'Very Good', 'Good', 'Average', 'Poor'];
const GRADE_COLOR = {
  Outstanding: '#22c55e', 'Very Good': '#3b82f6',
  Good: '#6366f1', Average: '#f59e0b', Poor: '#ef4444',
};

// ─── KPI Status helpers ───────────────────────────────────────────────────────
const KPI_STATUS_COLOR = {
  'Draft':          { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
  'Submitted':      { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  'CPO/COO Review': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  'MD Review':      { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  'Approved':       { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  'Published':      { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  'Returned':       { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
};
const NODE_COLOR = {
  Pending:  { bg: '#fffbeb', border: '#fbbf24', text: '#b45309', pulse: true  },
  Approved: { bg: '#ecfdf5', border: '#34d399', text: '#065f46', pulse: false },
  Returned: { bg: '#fef2f2', border: '#f87171', text: '#b91c1c', pulse: false },
  Waiting:  { bg: '#f8fafc', border: '#cbd5e1', text: '#94a3b8', pulse: false },
};

const kpiStatusBadge = (status) => {
  const s = KPI_STATUS_COLOR[status] || { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
};

// ─── Animated approval tree ───────────────────────────────────────────────────
function WorkflowTree({ approvals, onAction, canActCPO, canActCOO, canActMD, reportStatus }) {
  const [remarksInput, setRemarksInput] = useState({ cpo: '', coo: '', md: '' });
  const [actingOn, setActingOn] = useState(null);

  const getNode = (role) => approvals?.find(a => a.approver_role === role) || { status: 'Waiting', approver_role: role };
  const cpo = getNode('cpo'), coo = getNode('coo'), md = getNode('md');

  const renderNodeCard = (node, canAct, label, roleLabel) => {
    const color = NODE_COLOR[node.status] || NODE_COLOR.Waiting;
    const isActing = actingOn === node.approver_role;
    return (
      <div style={{
        background: color.bg, border: `2px solid ${color.border}`, borderRadius: 14,
        padding: '14px 16px', minWidth: 155, maxWidth: 195, position: 'relative',
        boxShadow: node.status === 'Pending' ? `0 0 0 4px ${color.border}30` : '0 2px 8px rgba(0,0,0,0.05)',
        animation: color.pulse ? 'pa-pulse 2s ease-in-out infinite' : 'none',
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: color.text, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: BRAND, marginBottom: 5 }}>{roleLabel}</div>
        <span style={{ display: 'inline-block', background: color.bg, color: color.text, border: `1px solid ${color.border}`, borderRadius: 12, padding: '1px 8px', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>
          {node.status === 'Pending' ? '⏳ Pending' : node.status === 'Approved' ? '✓ Approved' : node.status === 'Returned' ? '↩ Returned' : '● Waiting'}
        </span>
        {node.acted_at && <div style={{ fontSize: 10, color: 'rgba(22,38,96,0.4)', marginBottom: 3 }}>{new Date(node.acted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>}
        {node.remarks && <div style={{ fontSize: 10, color: BRAND, background: 'rgba(22,38,96,0.04)', borderRadius: 6, padding: '4px 8px', marginBottom: 8, fontStyle: 'italic' }}>"{node.remarks.slice(0, 60)}{node.remarks.length > 60 ? '…' : ''}"</div>}

        {canAct && node.status === 'Pending' && !isActing && (
          <button onClick={() => setActingOn(node.approver_role)}
            style={{ width: '100%', padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#162660,#1e40af)', color: '#fff', border: 'none' }}>
            Add Remarks & Act
          </button>
        )}
        {canAct && node.status === 'Pending' && isActing && (
          <div>
            <textarea rows={2} placeholder="Remarks (optional)"
              value={remarksInput[node.approver_role]}
              onChange={e => setRemarksInput(p => ({ ...p, [node.approver_role]: e.target.value }))}
              style={{ width: '100%', borderRadius: 6, border: '1px solid rgba(22,38,96,0.2)', fontSize: 11, padding: '4px 6px', resize: 'none', marginBottom: 6, fontFamily: 'inherit', boxSizing: 'border-box', color: '#1e293b', background: '#fff' }}/>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => { onAction(node.approver_role, 'approve', remarksInput[node.approver_role]); setActingOn(null); }}
                style={{ flex: 1, padding: '5px 0', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✓ Approve</button>
              <button onClick={() => { onAction(node.approver_role, 'return', remarksInput[node.approver_role]); setActingOn(null); }}
                style={{ flex: 1, padding: '5px 0', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>↩ Return</button>
            </div>
            <button onClick={() => setActingOn(null)} style={{ width: '100%', marginTop: 4, padding: '4px 0', borderRadius: 6, background: 'transparent', border: '1px solid rgba(22,38,96,0.15)', fontSize: 10, cursor: 'pointer', color: BRAND }}>Cancel</button>
          </div>
        )}
        {(!canAct && node.status === 'Pending') && <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>👁 View Only</div>}
        {node.status === 'Waiting' && <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>Awaiting prior stage</div>}
      </div>
    );
  };

  return (
    <div style={{ padding: '12px 0 8px', position: 'relative' }}>
      <style>{`
        @keyframes pa-pulse { 0%,100%{box-shadow:0 0 0 4px rgba(251,191,36,0.25)} 50%{box-shadow:0 0 0 8px rgba(251,191,36,0.08)} }
        @keyframes pa-spin { to{transform:rotate(360deg)} }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* CPO + COO parallel fork */}
        <div style={{ display: 'flex', gap: 28, position: 'relative' }}>
          <div style={{ position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)', width: 240, height: 36, pointerEvents: 'none' }}>
            <svg width="240" height="36" style={{ overflow: 'visible', position: 'absolute', top: 0 }}>
              <line x1="120" y1="0" x2="120" y2="12" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,2"/>
              <line x1="40"  y1="12" x2="200" y2="12" stroke="#cbd5e1" strokeWidth="2"/>
              <line x1="40"  y1="12" x2="40"  y2="36" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,2"/>
              <line x1="200" y1="12" x2="200" y2="36" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,2"/>
            </svg>
          </div>
          <div style={{ marginTop: 28 }}>{renderNodeCard(cpo, canActCPO, "CPO", "HR Manager")}</div>
          <div style={{ marginTop: 28 }}>{renderNodeCard(coo, canActCOO, "COO", "Super Admin")}</div>
        </div>

        {/* Converge → MD */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <svg width="240" height="36" style={{ overflow: 'visible', position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
            <line x1="40"  y1="0"  x2="40"  y2="14" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,2"/>
            <line x1="200" y1="0"  x2="200" y2="14" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,2"/>
            <line x1="40"  y1="14" x2="200" y2="14" stroke="#cbd5e1" strokeWidth="2"/>
            <line x1="120" y1="14" x2="120" y2="36" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,2"/>
          </svg>
          <div style={{ marginTop: 36 }}>{renderNodeCard(md, canActMD, "MD", "Managing Director")}</div>
        </div>

        {/* Published terminal */}
        {reportStatus === 'Published' && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width="2" height="20"><line x1="1" y1="0" x2="1" y2="20" stroke="#34d399" strokeWidth="2" strokeDasharray="4,2"/></svg>
            <div style={{ background: '#ecfdf5', border: '2px solid #34d399', borderRadius: 14, padding: '10px 28px', color: '#065f46', fontWeight: 800, fontSize: 13 }}>🎉 Published</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────
function ScoreGauge({ score }) {
  const pct = Math.min(Math.max(parseFloat(score) || 0, 0), 100);
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
  const r = 34; const c = 2 * Math.PI * r; const filled = (pct / 100) * c;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8"/>
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round"
          transform="rotate(-90 44 44)" style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
        <text x="44" y="48" textAnchor="middle" fontSize="16" fontWeight="800" fill={color}>{pct.toFixed(0)}</text>
        <text x="44" y="59" textAnchor="middle" fontSize="9" fill="#94a3b8">/100</text>
      </svg>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Overall Score</div>
    </div>
  );
}

// ─── Weightage Bar ────────────────────────────────────────────────────────────
function WeightageBar({ items }) {
  const total = items.length * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `100%`, height: '100%', background: '#10b981', borderRadius: 99 }}/>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#065f46', minWidth: 50 }}>Max {total} pts</span>
      <Check size={13} color="#10b981"/>
    </div>
  );
}

// ─── AI Insights Modal ────────────────────────────────────────────────────────
function AIInsightsModal({ insights, onClose }) {
  if (!insights) return null;
  const rColor = { 'Outstanding': '#065f46', 'Exceeds Expectations': '#1d4ed8', 'Meets Expectations': '#b45309', 'Needs Improvement': '#b91c1c', 'Unsatisfactory': '#7f1d1d' };
  const rBg    = { 'Outstanding': '#ecfdf5', 'Exceeds Expectations': '#eff6ff', 'Meets Expectations': '#fef3c7', 'Needs Improvement': '#fef2f2', 'Unsatisfactory': '#fee2e2' };
  return (
    <Modal title="✨ AI Performance Insights" onClose={onClose} theme="light">
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {insights.overall_rating && (
          <div style={{ background: rBg[insights.overall_rating] || '#f1f5f9', border: `1px solid ${rColor[insights.overall_rating] || '#64748b'}30`, borderRadius: 12, padding: '10px 16px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>OVERALL RATING</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: rColor[insights.overall_rating] || '#1e293b' }}>{insights.overall_rating}</div>
          </div>
        )}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>SUMMARY</div>
          <p style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6, margin: 0 }}>{insights.summary || insights.kpi_alignment}</p>
        </div>
        {insights.score_analysis && (
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>SCORE ANALYSIS</div>
            <p style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6, margin: 0 }}>{insights.score_analysis}</p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
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
        {insights.recommendation && (
          <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', borderRadius: 10, padding: '12px 14px', border: '1px solid #bae6fd' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', marginBottom: 4 }}>💡 RECOMMENDATION</div>
            <p style={{ fontSize: 13, color: '#0c4a6e', lineHeight: 1.6, margin: 0 }}>{insights.recommendation}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── KPI Report Card ──────────────────────────────────────────────────────────
function KPIReportCard({ report, onAction, onAIInsights, currentUser, grouped = false }) {
  const [expanded, setExpanded] = useState(false);
  const [fullReport, setFullReport] = useState(null);
  const [loading, setLoading]   = useState(false);

  const canActCPO = currentUser.role === 'hr_manager' || currentUser.role === 'super_admin';
  const canActCOO = currentUser.role === 'super_admin';
  const canActMD  = currentUser.role === 'super_admin';

  const loadFull = async () => {
    if (fullReport) { setExpanded(e => !e); return; }
    setLoading(true);
    try { const r = await kpiAPI.getReport(report.id); setFullReport(r.data.data); setExpanded(true); }
    catch(e) {} finally { setLoading(false); }
  };

  const approvals = fullReport?.approvals || report.approvals || [];
  const score = parseFloat(report.overall_score) || 0;

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(22,38,96,0.1)', borderRadius: 16, overflow: 'hidden', marginBottom: 10, boxShadow: '0 2px 10px rgba(22,38,96,0.05)' }}>
      <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, border: `3px solid ${score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: score >= 80 ? '#065f46' : score >= 60 ? '#b45309' : '#b91c1c', background: '#f8fafc' }}>
          {score.toFixed(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {!grouped && <div style={{ fontWeight: 700, fontSize: 13, color: BRAND }}>{report.emp_name}</div>}
          <div style={{ fontSize: grouped ? 13 : 11, fontWeight: grouped ? 700 : 400, color: grouped ? BRAND : 'rgba(22,38,96,0.5)' }}>{!grouped && `${report.dept_name} • `}{report.cycle_name}</div>
        </div>
        {kpiStatusBadge(report.status)}
        {['Submitted','CPO/COO Review','MD Review','Approved','Published','Returned'].includes(report.status) && (
          <button onClick={() => onAIInsights(report.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Sparkles size={11}/> AI Insights
          </button>
        )}
        {report.status === 'Approved' && canActMD && (
          <button onClick={() => onAction('publish', report.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Send size={11}/> Publish
          </button>
        )}
        <button onClick={loadFull} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(22,38,96,0.35)', padding: 4 }}>
          {loading ? <RefreshCw size={15} style={{ animation: 'pa-spin 1s linear infinite' }}/> : expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
        </button>
      </div>

      {expanded && fullReport && (
        <div style={{ borderTop: '1px solid rgba(22,38,96,0.06)', padding: '14px 16px', background: '#fafafe' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'start', marginBottom: 16 }}>
            <div>
              <ScoreGauge score={fullReport.overall_score}/>
              {fullReport.manager_remarks && (
                <div style={{ marginTop: 8, background: '#f1f5f9', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#475569', fontStyle: 'italic', maxWidth: 160 }}>"{fullReport.manager_remarks}"</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: BRAND, marginBottom: 8 }}>KPI Items</div>
              {fullReport.items?.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'rgba(22,38,96,0.03)' }}>
                      {['KPI Item','Weight','Score','Weighted','Remarks'].map(h => (
                        <th key={h} style={{ padding: '5px 8px', textAlign: 'left', color: 'rgba(22,38,96,0.5)', fontWeight: 600, fontSize: 10, borderBottom: '1px solid rgba(22,38,96,0.08)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fullReport.items.map((item, i) => {
                      const sc = item.score >= 80 ? '#065f46' : item.score >= 60 ? '#b45309' : '#b91c1c';
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(22,38,96,0.04)' }}>
                          <td style={{ padding: '6px 8px', color: BRAND, fontWeight: 600 }}>{item.item_name}</td>
                          <td style={{ padding: '6px 8px', color: '#64748b' }}>100</td>
                          <td style={{ padding: '6px 8px' }}><span style={{ color: sc, fontWeight: 700 }}>{item.score}</span><span style={{ color: '#94a3b8' }}>/100</span></td>
                          <td style={{ padding: '6px 8px', fontWeight: 700, color: sc }}>{(parseFloat(item.score||0) / fullReport.items.length).toFixed(1)}%</td>
                          <td style={{ padding: '6px 8px', color: '#64748b', fontStyle: 'italic', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.manager_remarks||'—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : <div style={{ color: '#94a3b8', fontSize: 12 }}>No KPI items yet.</div>}
            </div>
          </div>

          {/* Approval tree */}
          <div style={{ borderTop: '1px solid rgba(22,38,96,0.06)', paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: BRAND, marginBottom: 4 }}>Approval Workflow</div>
            <WorkflowTree
              approvals={fullReport.approvals}
              reportStatus={fullReport.status}
              canActCPO={canActCPO} canActCOO={canActCOO} canActMD={canActMD}
              onAction={(role, action, remarks) => onAction(role, fullReport.id, action, remarks)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Employee KPI Group (Accordion) ───────────────────────────────────────────
function EmployeeKPIGroup({ group, onAction, onAIInsights, currentUser }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.1)', borderRadius:14, marginBottom:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(22,38,96,0.03)' }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ padding:'12px 20px', background:'#f8fafc', borderBottom: expanded ? '1px solid rgba(22,38,96,0.08)' : 'none', display:'flex', justifyContent:'space-between', alignItems:'center', cursor: 'pointer' }}
      >
        <div>
          <div style={{ fontWeight:800, color:BRAND, fontSize:15 }}>{group.emp_name}</div>
          <div style={{ fontSize:12, color:'rgba(22,38,96,0.6)' }}>{group.dept_name} • {group.emp_id}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#64748b' }}>{group.reports.length} Reports</div>
          {expanded ? <ChevronUp size={16} color="rgba(22,38,96,0.5)" /> : <ChevronDown size={16} color="rgba(22,38,96,0.5)" />}
        </div>
      </div>
      {expanded && (
        <div style={{ padding:'12px', background: '#f8fafc' }}>
          {group.reports.sort((a,b) => a.cycle_name.localeCompare(b.cycle_name)).map(r => (
            <div key={r.id} style={{ marginBottom: group.reports.length > 1 ? 8 : 0 }}>
               <KPIReportCard report={r} onAction={onAction} onAIInsights={onAIInsights} currentUser={currentUser} grouped={true}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── KPI Items Editor ─────────────────────────────────────────────────────────
function ItemsEditor({ reportId, onSaved }) {
  const [items, setItems] = useState([{ item_name:'', description:'', weightage:'100', target:'', score:'', manager_remarks:'' }]);
  const [managerRemarks, setManagerRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const addItem = () => setItems(p => [...p, { item_name:'', description:'', weightage:'', target:'', score:'', manager_remarks:'' }]);
  const removeItem = (i) => setItems(p => p.filter((_,idx) => idx !== i));
  const update = (i, f, v) => setItems(p => p.map((item, idx) => idx === i ? {...item,[f]:v} : item));

  const save = async () => {
    setSaving(true);
    try {
      await kpiAPI.saveItems(reportId, { items, manager_remarks: managerRemarks });
      setMsg('✓ Saved'); onSaved?.();
    } catch(e) { setMsg('Error: '+(e.response?.data?.message||e.message)); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  return (
    <div>
      <WeightageBar items={items}/>
      {msg && <div style={{ padding:'6px 12px', borderRadius:8, marginBottom:10, fontSize:12, background:msg.startsWith('Error')?'#fef2f2':'#ecfdf5', color:msg.startsWith('Error')?'#b91c1c':'#065f46', border:`1px solid ${msg.startsWith('Error')?'#fecaca':'#a7f3d0'}` }}>{msg}</div>}
      {items.map((item, i) => (
        <div key={i} style={{ background:'#f8fafc', border:'1px solid rgba(22,38,96,0.1)', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
          <div style={{ display:'flex', gap:8, marginBottom:6 }}>
            <div style={{ flex:2 }}>
              <label style={{ fontSize:10, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:2 }}>KPI ITEM *</label>
              <input value={item.item_name} onChange={e => update(i,'item_name',e.target.value)} placeholder="e.g. Target Achievement"
                style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid rgba(22,38,96,0.15)', fontSize:12, outline:'none', boxSizing:'border-box', color:'#1e293b', background:'#fff' }}/>
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:10, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:2 }}>WEIGHT</label>
              <input type="text" value="100" disabled
                style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid rgba(22,38,96,0.15)', fontSize:12, outline:'none', boxSizing:'border-box', color:'#1e293b', background:'#f1f5f9', cursor:'not-allowed' }}/>
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:10, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:2 }}>SCORE /100</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" value={item.score} onChange={e => update(i,'score',e.target.value)} placeholder="0"
                style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid rgba(22,38,96,0.15)', fontSize:12, outline:'none', boxSizing:'border-box', color:'#1e293b', background:'#fff' }}/>
            </div>
            <button onClick={() => removeItem(i)} style={{ marginTop:18, padding:'6px', borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca', cursor:'pointer', color:'#ef4444' }}><X size={12}/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:2 }}>TARGET</label>
              <input value={item.target} onChange={e => update(i,'target',e.target.value)} placeholder="What is the expected target?"
                style={{ width:'100%', padding:'5px 10px', borderRadius:8, border:'1px solid rgba(22,38,96,0.12)', fontSize:11, outline:'none', boxSizing:'border-box', color:'#1e293b', background:'#fff' }}/>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:2 }}>REMARKS</label>
              <input value={item.manager_remarks} onChange={e => update(i,'manager_remarks',e.target.value)} placeholder="Optional remarks"
                style={{ width:'100%', padding:'5px 10px', borderRadius:8, border:'1px solid rgba(22,38,96,0.12)', fontSize:11, outline:'none', boxSizing:'border-box', color:'#1e293b', background:'#fff' }}/>
            </div>
          </div>
          <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1, height:3, background:'#e2e8f0', borderRadius:99, overflow:'hidden' }}>
              <div style={{ width:`${item.score}%`, height:'100%', background:item.score>=80?'#10b981':item.score>=60?'#f59e0b':'#ef4444', borderRadius:99, transition:'width 0.3s' }}/>
            </div>
            <span style={{ fontSize:10, color:'#94a3b8', minWidth:38 }}>{(parseFloat(item.score||0) / items.length).toFixed(1)}% of Total</span>
          </div>
        </div>
      ))}
      <button onClick={addItem} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:10, background:'rgba(22,38,96,0.04)', border:'1px dashed rgba(22,38,96,0.2)', color:BRAND, fontSize:12, fontWeight:600, cursor:'pointer', marginBottom:10 }}>
        <Plus size={12}/> Add KPI Item
      </button>
      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:10, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:3 }}>OVERALL MANAGER REMARKS</label>
        <textarea rows={2} value={managerRemarks} onChange={e => setManagerRemarks(e.target.value)} placeholder="Overall assessment..."
          style={{ width:'100%', borderRadius:10, border:'1px solid rgba(22,38,96,0.15)', fontSize:12, padding:'7px 10px', resize:'vertical', fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:'#1e293b', background:'#fff' }}/>
      </div>
      <button onClick={save} disabled={saving}
        style={{ padding:'9px 20px', borderRadius:10, background:'linear-gradient(135deg,#162660,#1e40af)', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer' }}>
        {saving ? 'Saving…' : 'Save KPI Items'}
      </button>
    </div>
  );
}

// ─── APAR grade tag ───────────────────────────────────────────────────────────
const GradeTag = ({ val }) => val
  ? <span style={{ color: GRADE_COLOR[val], fontWeight: 600, fontSize: 12 }}>{val}</span>
  : <span style={{ color: 'rgba(22,38,96,0.2)', fontSize: 12 }}>—</span>;

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function APAR() {
  const { isMin, user } = useAuth();


  // Shared state
  const [tab, setTab]             = useState('kpi');
  const [aiInsights, setAIInsights] = useState(null);
  const [aiLoading, setAILoading]   = useState(false);
  const [msg, setMsg]             = useState('');

  // KPI state
  const [kpiReports, setKpiReports]   = useState([]);
  const [kpiCycles, setKpiCycles]     = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [kpiLoading, setKpiLoading]   = useState(true);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [showCreateCycle, setShowCreateCycle]   = useState(false);
  const [showItemsEditor, setShowItemsEditor]   = useState(null);
  const [submitLoading, setSubmitLoading]       = useState(null);
  const [createReportForm, setCreateReportForm] = useState({ cycle_id: '', emp_id: '' });
  const [cycleForm, setCycleForm] = useState({ quarter: '', year: new Date().getFullYear() });

  const currentYear = new Date().getFullYear();
  const maxCycleYear = Math.max(currentYear + 1, ...kpiCycles.map(c => parseInt(c.year) || 0));
  const FY_OPTIONS = [];
  for (let y = maxCycleYear; y >= 2023; y--) {
    for (let q = 4; q >= 1; q--) {
      FY_OPTIONS.push(`Q${q} ${y}`);
    }
  }

  // APAR state
  const [aparData, setAparData]       = useState([]);
  const [aparLoading, setAparLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selected, setSelected]         = useState(null);
  const [fillMode, setFillMode]         = useState(null);
  const [aparForm, setAparForm]         = useState({ grade: '', remarks: '' });
  const [initForm, setInitForm]         = useState({ emp_id: '', cycle_name: '' });
  const [showInit, setShowInit]         = useState(false);
  const [showYearlyReport, setShowYearlyReport] = useState(false);
  const [yearlyForm, setYearlyForm]     = useState({ emp_id: '', year: '2026' });
  const [yearlyResult, setYearlyResult] = useState(null);
  const [yearlyLoading, setYearlyLoading] = useState(false);

  const showMsg = useCallback((m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); }, []);

  // KPI loaders
  const loadKPI = useCallback(async () => {
    setKpiLoading(true);
    try {
      const [r, c] = await Promise.all([
        kpiAPI.listReports().catch(() => ({ data: { data: [] } })),
        kpiAPI.listCycles().catch(() => ({ data: { data: [] } })),
      ]);
      setKpiReports(r.data.data || []);
      setKpiCycles(c.data.data || []);
      if (isMin('hr_staff')) {
        const e = await empAPI.list({ limit: 200, status: 'Active' }).catch(() => ({ data: { data: { employees: [] } } }));
        setEmployees(e.data.data?.employees || []);
      }
    } finally { setKpiLoading(false); }
  }, [isMin]);

  // APAR loaders
  const loadAPAR = useCallback((yr) => {
    setAparLoading(true);
    aparAPI.list({ year: yr || selectedYear })
      .then(r => setAparData(r.data.data || []))
      .finally(() => setAparLoading(false));
  }, [selectedYear]);

  useEffect(() => { loadKPI(); }, [loadKPI]);
  useEffect(() => { loadAPAR(selectedYear); }, [selectedYear]);

  // KPI actions
  const handleKPIAction = async (role, reportId, action, remarks) => {
    try {
      if (role === 'cpo')     await kpiAPI.cpoAction(reportId, { action, remarks });
      else if (role === 'coo') await kpiAPI.cooAction(reportId, { action, remarks });
      else if (role === 'md')  await kpiAPI.mdAction(reportId, { action, remarks });
      else if (role === 'publish') await kpiAPI.publishReport(reportId);
      showMsg('Action completed');
      loadKPI();
    } catch(e) { showMsg('Error: '+(e.response?.data?.message||e.message)); }
  };

  const handleAIInsights = async (id, isApar = false) => {
    setAILoading(true);
    try {
      const res = isApar ? await aparAPI.aiInsights(id) : await kpiAPI.aiInsights(id);
      setAIInsights(res.data.data);
    } catch(e) { showMsg('Error: '+e.message); }
    finally { setAILoading(false); }
  };

  const handleSubmitKPI = async (reportId) => {
    setSubmitLoading(reportId);
    try { await kpiAPI.submitReport(reportId); showMsg('Report submitted for CPO/COO review'); loadKPI(); }
    catch(e) { showMsg('Error: '+(e.response?.data?.message||e.message)); }
    finally { setSubmitLoading(null); }
  };

  const createKPIReport = async () => {
    try { await kpiAPI.createReport(createReportForm); showMsg('Report created'); setShowCreateReport(false); setCreateReportForm({ cycle_id:'', emp_id:'' }); loadKPI(); }
    catch(e) { showMsg('Error: '+(e.response?.data?.message||e.message)); }
  };

  const createKPICycle = async () => {
    try {
      if (!cycleForm.quarter || !cycleForm.year) throw new Error("Quarter and Year are required.");
      const year = cycleForm.year;
      const q = parseInt(cycleForm.quarter);
      let start_date = '', end_date = '';
      if (q === 1) { start_date = `${year}-01-01`; end_date = `${year}-03-31`; }
      else if (q === 2) { start_date = `${year}-04-01`; end_date = `${year}-06-30`; }
      else if (q === 3) { start_date = `${year}-07-01`; end_date = `${year}-09-30`; }
      else if (q === 4) { start_date = `${year}-10-01`; end_date = `${year}-12-31`; }

      await kpiAPI.createCycle({ ...cycleForm, start_date, end_date, name: `Q${cycleForm.quarter}-${cycleForm.year}` });
      showMsg('Cycle created'); setShowCreateCycle(false);
      setCycleForm({ quarter:'', year:new Date().getFullYear() });
      loadKPI();
    } catch(e) { showMsg('Error: '+(e.response?.data?.message||e.message||e)); }
  };

  // APAR actions
  const submitAparFill = async () => {
    try {
      if (fillMode === 'reporting') await aparAPI.fillReporting(selected.id, { reporting_grade: aparForm.grade, reporting_remarks: aparForm.remarks });
      else if (fillMode === 'reviewing') await aparAPI.fillReviewing(selected.id, { reviewing_grade: aparForm.grade, reviewing_remarks: aparForm.remarks, final_grade: aparForm.grade, final_remarks: aparForm.remarks });
      showMsg('APAR updated'); setFillMode(null); setSelected(null); setAparForm({ grade:'', remarks:'' }); loadAPAR();
    } catch(e) { showMsg('Error: '+(e.response?.data?.message||e.message)); }
  };

  const initAPAR = async () => {
    try { await aparAPI.initiate(initForm); showMsg('APAR initiated'); setShowInit(false); loadAPAR(); }
    catch(e) { showMsg('Error: '+(e.response?.data?.message||e.message)); }
  };

  const handleGenerateYearlyReport = async (manual = false) => {
    const targetEmpId = user?.role === 'employee' ? user.emp_id : yearlyForm.emp_id;

    if (targetEmpId === 'all') {
      setYearlyLoading(true); setYearlyResult(null);
      let successCount = 0; let errorCount = 0;
      let allData = [];
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        showMsg(`Generating report for ${emp.first_name} ${emp.last_name} (${i + 1}/${employees.length})...`);
        try {
          const res = await aparAPI.yearlyReportAI({ emp_id: emp.emp_id, year: yearlyForm.year, manual: manual });
          const data = res.data.data;
          allData.push({
            emp_name: `${emp.first_name} ${emp.last_name}`,
            short_name: `${emp.first_name.charAt(0)}. ${emp.last_name}`,
            emp_id: emp.emp_id,
            score: data.average_percentage || 0,
            grade: data.suggested_annual_grade || 'None'
          });
          successCount++;
        } catch(e) { errorCount++; }
      }
      showMsg(`Batch Generation Complete: ${successCount} successful, ${errorCount} failed.`);
      setYearlyLoading(false);
      loadAPAR();
      
      setYearlyResult({
        is_all: true,
        year: yearlyForm.year,
        employees_data: allData.sort((a,b) => b.score - a.score)
      });
      return;
    }

    setYearlyLoading(true); setYearlyResult(null);
    try {
      const res = await aparAPI.yearlyReportAI({ emp_id: targetEmpId, year: yearlyForm.year, manual: manual });
      setYearlyResult(res.data.data);
      loadAPAR();
    } catch(e) {
      showMsg('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setYearlyLoading(false);
    }
  };

  const handleAutoGenerateFinal = async () => {
    setAILoading(true);
    try {
      const res = await aparAPI.aiInsights(selected.id);
      const data = res.data.data;
      if (data) {
        let gradeToSet = 'Good';
        const rec = data.recommendation || '';
        const lowerRec = rec.toLowerCase();
        if (lowerRec.includes('outstanding')) gradeToSet = 'Outstanding';
        else if (lowerRec.includes('very good')) gradeToSet = 'Very Good';
        else if (lowerRec.includes('average')) gradeToSet = 'Average';
        else if (lowerRec.includes('below average')) gradeToSet = 'Below Average';
        
        const generatedRemarks = `Summary: ${data.summary}\nKPI Alignment: ${data.kpi_alignment}\nStrengths: ${(data.key_strengths||[]).join(', ')}\nAreas for Improvement: ${(data.areas_for_improvement||[]).join(', ')}\nRecommendation: ${data.recommendation}`;
        
        setAparForm({ grade: gradeToSet, remarks: generatedRemarks });
        showMsg('Form populated with AI Insights. Please review before submitting.');
      }
    } catch(e) {
      showMsg('Error generating insights: '+e.message);
    } finally {
      setAILoading(false);
    }
  };

  // Derived KPI data
  const kpiPending   = kpiReports.filter(r => ['CPO/COO Review','MD Review'].includes(r.status));
  const kpiMyDrafts  = kpiReports.filter(r => ['Draft','Returned'].includes(r.status));
  const kpiPublished = kpiReports.filter(r => r.status === 'Published');
  const avgScore = kpiReports.length ? (kpiReports.reduce((s,r) => s + parseFloat(r.overall_score||0), 0) / kpiReports.length).toFixed(1) : '—';
  const activeCycle = kpiCycles.find(c => c.is_active);

  const groupedKpiReports = Object.values(kpiReports.reduce((acc, r) => {
    if (!acc[r.emp_id]) acc[r.emp_id] = { emp_name: r.emp_name, emp_id: r.emp_id, dept_name: r.dept_name, reports: [] };
    acc[r.emp_id].reports.push(r);
    return acc;
  }, {})).sort((a,b) => a.emp_name.localeCompare(b.emp_name));

  const TABS = [
    { id: 'kpi',    label: 'KPI Appraisal',   icon: Target },
    { id: 'apar',   label: 'Annual Reports',   icon: Star   },
    ...(isMin('hr_manager') ? [{ id: 'cycles', label: 'Cycles', icon: TrendingUp }] : []),
  ];

  const KPI_SUB_TABS = [
    { id: 'overview', label: 'Overview' },
    ...(isMin('dept_head') ? [
      { id: 'review',   label: `Review Queue${kpiPending.length > 0 ? ` (${kpiPending.length})` : ''}` },
      { id: 'manage',   label: 'Manage' }
    ] : []),
  ];
  const [kpiSubTab, setKpiSubTab] = useState('overview');

  return (
    <Layout title="Performance Appraisal" theme="light" bg="#F8F8FF">
      <style>{`
        @keyframes pa-spin { to{transform:rotate(360deg)} }
        @keyframes pa-fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
        .pa-anim { animation: pa-fadeIn 0.3s ease; }
      `}</style>

      {msg && (
        <div style={{ padding:'10px 16px', borderRadius:10, marginBottom:12, fontSize:13, background:msg.startsWith('Error')?'#fef2f2':'#ecfdf5', color:msg.startsWith('Error')?'#b91c1c':'#065f46', border:`1px solid ${msg.startsWith('Error')?'#fecaca':'#a7f3d0'}` }}>{msg}</div>
      )}

      {/* Main tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:18, borderBottom:'1px solid rgba(22,38,96,0.08)', paddingBottom:10, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 18px', borderRadius:22, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.2s', background:tab===t.id?BRAND:'transparent', color:tab===t.id?'#fff':'rgba(22,38,96,0.55)', border:tab===t.id?`1px solid ${BRAND}`:'1px solid transparent', boxShadow:tab===t.id?'0 4px 14px rgba(22,38,96,0.18)':'none' }}>
            <t.icon size={14}/>{t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════ KPI TAB ══════════════════════════════ */}
      {tab === 'kpi' && (
        <div className="pa-anim">
          {/* KPI sub-tabs */}
          {KPI_SUB_TABS.length > 1 && (
            <div style={{ display:'flex', gap:4, marginBottom:14, flexWrap:'wrap' }}>
              {KPI_SUB_TABS.map(t => (
                <button key={t.id} onClick={() => setKpiSubTab(t.id)}
                  style={{ padding:'5px 14px', borderRadius:16, fontSize:12, fontWeight:600, cursor:'pointer', background:kpiSubTab===t.id?'rgba(22,38,96,0.1)':'transparent', color:kpiSubTab===t.id?BRAND:'rgba(22,38,96,0.5)', border:kpiSubTab===t.id?'1px solid rgba(22,38,96,0.15)':'1px solid transparent' }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {kpiLoading ? <Loader/> : (
            <>
            {/* Overview */}
            {kpiSubTab === 'overview' && (
              <div className="pa-anim">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                  {[
                    { label:'Total Reports', value:kpiReports.length, color:'#6366f1', icon:FileText },
                    { label:'Pending Review', value:kpiPending.length, color:'#f59e0b', icon:Eye },
                    { label:'Published', value:kpiPublished.length, color:'#10b981', icon:Award },
                    { label:'Avg Score', value:avgScore, color:'#8b5cf6', icon:Target },
                  ].map((s,i) => (
                    <div key={i} style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.08)', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 2px 8px rgba(22,38,96,0.04)' }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:`${s.color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}><s.icon size={16} color={s.color}/></div>
                      <div><div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div><div style={{ fontSize:11, color:'rgba(22,38,96,0.5)' }}>{s.label}</div></div>
                    </div>
                  ))}
                </div>

                {activeCycle && (
                  <div style={{ background:'linear-gradient(135deg,#162660,#1e40af)', borderRadius:14, padding:'16px 20px', color:'#fff', marginBottom:14, display:'flex', alignItems:'center', gap:16 }}>
                    <Target size={26} style={{ opacity:0.7 }}/>
                    <div>
                      <div style={{ fontSize:10, opacity:0.7, fontWeight:700, letterSpacing:1 }}>ACTIVE CYCLE</div>
                      <div style={{ fontSize:17, fontWeight:800 }}>{activeCycle.name}</div>
                      <div style={{ fontSize:11, opacity:0.7 }}>{new Date(activeCycle.start_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} — {new Date(activeCycle.end_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
                    </div>
                    <div style={{ marginLeft:'auto', textAlign:'right' }}><div style={{ fontSize:26, fontWeight:800 }}>Q{activeCycle.quarter}</div><div style={{ fontSize:11, opacity:0.7 }}>{activeCycle.year}</div></div>
                  </div>
                )}

                {groupedKpiReports.map(group => (
                  <EmployeeKPIGroup key={group.emp_id} group={group} onAction={handleKPIAction} onAIInsights={id => handleAIInsights(id,false)} currentUser={user} />
                ))}
                {kpiReports.length === 0 && (
                  <div style={{ textAlign:'center', padding:'48px 0', color:'#94a3b8' }}>
                    <Target size={34} style={{ marginBottom:8, opacity:0.3 }}/><div style={{ fontWeight:600 }}>No KPI reports yet</div>
                    {isMin('dept_head') && <div style={{ fontSize:12, marginTop:4 }}>Create a report from the "Manage" tab</div>}
                  </div>
                )}
              </div>
            )}



            {/* Review Queue */}
            {kpiSubTab === 'review' && (
              <div className="pa-anim">
                <div style={{ fontSize:12, color:'rgba(22,38,96,0.5)', marginBottom:10 }}>Reports requiring your review — expand to see and act on the approval tree.</div>
                {kpiPending.length === 0 && (
                  <div style={{ textAlign:'center', padding:'48px 0', color:'#94a3b8' }}>
                    <Check size={32} style={{ marginBottom:8, opacity:0.3 }}/><div style={{ fontWeight:600 }}>No reports pending your review</div>
                  </div>
                )}
                {kpiPending.map(r => <KPIReportCard key={r.id} report={r} onAction={handleKPIAction} onAIInsights={id => handleAIInsights(id,false)} currentUser={user}/>)}
              </div>
            )}

            {/* Manage */}
            {kpiSubTab === 'manage' && (
              <div className="pa-anim">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:BRAND }}>Draft / Returned Reports</div>
                  {isMin('dept_head') && (
                    <button onClick={() => setShowCreateReport(true)}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:10, background:BRAND, color:'#fff', border:'none', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      <Plus size={13}/> New Report
                    </button>
                  )}
                </div>
                {kpiMyDrafts.map(r => (
                  <div key={r.id} style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.1)', borderRadius:14, overflow:'hidden', marginBottom:10 }}>
                    <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, color:BRAND }}>{r.emp_name}</div>
                        <div style={{ fontSize:11, color:'rgba(22,38,96,0.5)' }}>{r.cycle_name} • {r.dept_name}</div>
                      </div>
                      {kpiStatusBadge(r.status)}
                      <button onClick={() => setShowItemsEditor(r.id)}
                        style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, background:'rgba(22,38,96,0.06)', color:BRAND, border:'none', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                        <Settings size={11}/> Edit Items
                      </button>
                      <button onClick={() => handleSubmitKPI(r.id)} disabled={submitLoading===r.id}
                        style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, background:BRAND, color:'#fff', border:'none', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        {submitLoading===r.id ? <RefreshCw size={11} style={{ animation:'pa-spin 1s linear infinite' }}/> : <Send size={11}/>} Submit
                      </button>
                    </div>
                  </div>
                ))}
                {kpiMyDrafts.length === 0 && <div style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8' }}><FileText size={30} style={{ marginBottom:8, opacity:0.3 }}/><div>No drafts. Create one above.</div></div>}
              </div>
            )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════ ANNUAL REPORTS TAB ══════════════════════════════ */}
      {tab === 'apar' && (
        <div className="pa-anim">
          <div style={{ background:'#fff', borderRadius:16, border:'1px solid rgba(22,38,96,0.1)', boxShadow:'0 4px 16px rgba(22,38,96,0.04)', padding: 24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <Sparkles size={18} color="#10b981"/>
              <span style={{ fontSize:16, fontWeight:800, color:BRAND }}>Generate Annual Report</span>
            </div>
            
            {yearlyLoading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Loader/></div>
            ) : !yearlyResult ? (
              <div style={{ maxWidth: 500 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  {user?.role !== 'employee' && (
                    <div>
                      <label style={{ fontSize:11, fontWeight:700, color:'rgba(22,38,96,0.6)', display:'block', marginBottom:6 }}>EMPLOYEE *</label>
                      <select value={yearlyForm.emp_id} onChange={e => setYearlyForm({...yearlyForm, emp_id:e.target.value})}
                        style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid rgba(22,38,96,0.15)', fontSize:13, outline:'none', background:'#fff', color:'#1e293b', boxShadow:'0 2px 4px rgba(0,0,0,0.02)' }}>
                        <option value="">Select Employee...</option>
                        <option value="all" style={{ fontWeight: 'bold', color: '#10b981' }}>All Employees (Batch Generate)</option>
                        {employees.map(e => <option key={e.emp_id} value={e.emp_id}>{e.first_name} {e.last_name} ({e.emp_id})</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'rgba(22,38,96,0.6)', display:'block', marginBottom:6 }}>YEAR *</label>
                    <select value={yearlyForm.year} onChange={e => setYearlyForm({...yearlyForm, year:e.target.value})}
                      style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid rgba(22,38,96,0.15)', fontSize:13, outline:'none', background:'#fff', color:'#1e293b', boxShadow:'0 2px 4px rgba(0,0,0,0.02)' }}>
                      <option value="">Select Year...</option>
                      {Array.from(new Set(FY_OPTIONS.map(o => o.split(' ')[1]))).filter(Boolean).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                    <button disabled={(!yearlyForm.emp_id && user?.role !== 'employee') || !yearlyForm.year} onClick={() => handleGenerateYearlyReport(false)}
                      style={{ flex: 1, padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', fontWeight:700, fontSize:14, cursor:'pointer', opacity:(!yearlyForm.emp_id && user?.role !== 'employee')?0.5:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <Sparkles size={16}/> {yearlyForm.emp_id === 'all' && user?.role !== 'employee' ? 'Batch Generate with AI' : 'Generate with AI'}
                    </button>
                    <button disabled={(!yearlyForm.emp_id && user?.role !== 'employee') || !yearlyForm.year} onClick={() => handleGenerateYearlyReport(true)}
                      style={{ flex: 1, padding:'12px', borderRadius:10, background:'#f1f5f9', color:'#475569', border:'1px solid #e2e8f0', fontWeight:700, fontSize:14, cursor:'pointer', opacity:(!yearlyForm.emp_id && user?.role !== 'employee')?0.5:1 }}>
                      {yearlyForm.emp_id === 'all' && user?.role !== 'employee' ? 'Batch Generate Manually' : 'Generate Manually'}
                    </button>
                  </div>
                </div>
              </div>
            ) : yearlyResult.is_all ? (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:20, fontWeight:800, color:BRAND }}>Organization Annual Report: {yearlyResult.year}</div>
                    <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>Average Performance of All Employees</div>
                  </div>
                  <button onClick={() => setYearlyResult(null)}
                    style={{ padding:'8px 16px', borderRadius:8, background:'#f1f5f9', color:'#475569', border:'none', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                    Close Report
                  </button>
                </div>

                <div style={{ padding: 20, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:12 }}>EMPLOYEE PERFORMANCE (ANNUAL AVERAGE SCORE)</div>
                  <div style={{ height: 320, width: '100%', marginTop: 8 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearlyResult.employees_data} margin={{ top: 10, right: 20, left: -20, bottom: 40 }} barSize={36}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="short_name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} angle={-30} textAnchor="end" />
                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px', zIndex: 10 }}
                          labelStyle={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}
                          itemStyle={{ fontWeight: 600, color: '#3b82f6' }}
                          cursor={{ fill: '#f1f5f9' }}
                          formatter={(value, name, props) => [`${value}/100 (${props.payload.grade})`, 'Score']}
                        />
                        <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                          {yearlyResult.employees_data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.score > 80 ? '#22c55e' : entry.score > 50 ? '#3b82f6' : '#f59e0b'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:20, fontWeight:800, color:BRAND }}>Annual Performance Report: {yearlyForm.year}</div>
                    <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>
                      {user?.role === 'employee' ? `${user.first_name} ${user.last_name}` : `${employees.find(e => e.emp_id === yearlyForm.emp_id)?.first_name || ''} ${employees.find(e => e.emp_id === yearlyForm.emp_id)?.last_name || ''}`}
                    </div>
                  </div>
                  <button onClick={() => setYearlyResult(null)}
                    style={{ padding:'8px 16px', borderRadius:8, background:'#f1f5f9', color:'#475569', border:'none', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                    Generate Another
                  </button>
                </div>

                <div style={{ padding:20, background:'#f8fafc', borderRadius:12, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:4 }}>SUGGESTED ANNUAL GRADE</div>
                  <div style={{ fontSize:24, fontWeight:800, color:BRAND }}>
                    {yearlyResult.suggested_annual_grade}
                    {yearlyResult.average_percentage !== undefined && <span style={{ color:'#64748b', fontSize:16, marginLeft:8 }}>({yearlyResult.average_percentage}%)</span>}
                  </div>
                </div>

                {yearlyResult.quarterly_data && yearlyResult.quarterly_data.length > 0 && (
                  <div style={{ padding: 20, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:12 }}>PERFORMANCE TRAJECTORY (KPI SCORE / 100)</div>
                    <div style={{ height: 260, width: '100%', marginTop: 8 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yearlyResult.quarterly_data.map(d => ({ ...d, shortQuarter: d.quarter.split('-')[0] }))} margin={{ top: 10, right: 20, left: -20, bottom: 0 }} barSize={36}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="shortQuarter" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px', zIndex: 10 }}
                            labelStyle={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}
                            itemStyle={{ fontWeight: 600, color: '#3b82f6' }}
                            cursor={{ fill: '#f1f5f9' }}
                            formatter={(value, name, props) => [`${value}/100 (${props.payload.grade})`, 'Score']}
                          />
                          <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                            {yearlyResult.quarterly_data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.score > 80 ? '#22c55e' : entry.score > 50 ? '#3b82f6' : '#f59e0b'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop: 8 }}>
                  <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#065f46', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><Check size={14}/> KEY STRENGTHS</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {(yearlyResult.key_annual_strengths||[]).map((s,i) => (
                        <span key={i} style={{ background:'#dcfce7', color:'#166534', padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:600 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#b91c1c', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><TrendingUp size={14}/> DEVELOPMENT AREAS</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {(yearlyResult.annual_development_areas||[]).map((s,i) => (
                        <span key={i} style={{ background:'#fee2e2', color:'#991b1b', padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:600 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PREVIOUSLY GENERATED REPORTS */}
          <div style={{ marginTop: 24, background:'#fff', borderRadius:16, border:'1px solid rgba(22,38,96,0.1)', boxShadow:'0 4px 16px rgba(22,38,96,0.04)', padding: 24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Star size={18} color={BRAND}/>
                <span style={{ fontSize:16, fontWeight:800, color:BRAND }}>Saved Reports ({selectedYear})</span>
              </div>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                style={{ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(22,38,96,0.15)', fontSize:13, color:BRAND, outline:'none', background:'#f8fafc', fontWeight:600 }}>
                {Array.from(new Set(FY_OPTIONS.map(o => o.split(' ')[1]))).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {aparLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Loader/></div> : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'rgba(22,38,96,0.03)', borderBottom:'1px solid rgba(22,38,96,0.08)' }}>
                      {['Employee', 'Department', 'Year', 'Annual Grade', 'Actions'].map(h => (
                        <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'rgba(22,38,96,0.55)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aparData.length === 0 && (
                      <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>No reports saved for {selectedYear}</td></tr>
                    )}
                    {aparData.map(a => (
                      <tr key={a.id} style={{ borderBottom:'1px solid rgba(22,38,96,0.04)', transition:'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(22,38,96,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ fontWeight:700, color:BRAND }}>{a.emp_name}</div>
                          <div style={{ fontSize:11, color:'rgba(22,38,96,0.5)' }}>{a.emp_id}</div>
                        </td>
                        <td style={{ padding:'12px 16px', color:'rgba(22,38,96,0.7)', fontSize:13 }}>{a.dept_name}</td>
                        <td style={{ padding:'12px 16px', color:'rgba(22,38,96,0.7)', fontWeight:600 }}>{a.cycle_name}</td>
                        <td style={{ padding:'12px 16px' }}><GradeTag val={a.final_grade}/></td>
                        <td style={{ padding:'12px 16px' }}>
                          <button onClick={() => {
                            if (a.final_remarks) {
                              try {
                                const parsed = JSON.parse(a.final_remarks);
                                setYearlyForm({ emp_id: a.emp_id, year: a.cycle_name });
                                setYearlyResult(parsed);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } catch(e) { showMsg('Error opening report'); }
                            }
                          }}
                            style={{ padding:'6px 14px', borderRadius:8, background:'rgba(16,185,129,0.1)', color:'#059669', border:'1px solid rgba(16,185,129,0.2)', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                            <Star size={12}/> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════ CYCLES TAB ══════════════════════════════ */}
      {tab === 'cycles' && isMin('hr_manager') && (
        <div className="pa-anim">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:BRAND }}>KPI Cycles</div>
            <button onClick={() => setShowCreateCycle(true)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:10, background:BRAND, color:'#fff', border:'none', fontWeight:700, fontSize:12, cursor:'pointer' }}>
              <Plus size={13}/> New Cycle
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:12 }}>
            {kpiCycles.map(c => (
              <div key={c.id} style={{ background:c.is_active?'linear-gradient(135deg,#162660,#1e40af)':'#fff', border:c.is_active?'none':'1px solid rgba(22,38,96,0.1)', borderRadius:14, padding:'16px 18px', color:c.is_active?'#fff':BRAND }}>
                <div style={{ fontSize:10, fontWeight:700, opacity:0.7, letterSpacing:1 }}>Q{c.quarter} • {c.year}</div>
                <div style={{ fontSize:16, fontWeight:800, marginTop:2 }}>{c.name}</div>
                <div style={{ fontSize:11, opacity:0.65, marginTop:4 }}>
                  {new Date(c.start_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} — {new Date(c.end_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
                </div>
                {c.is_active && <div style={{ marginTop:6, fontSize:10, fontWeight:700, background:'rgba(255,255,255,0.2)', borderRadius:10, padding:'2px 8px', display:'inline-block' }}>● ACTIVE</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════ MODALS ══════════════════════════════ */}

      {/* AI Insights */}
      {aiLoading && <Modal title="Generating AI Insights…" onClose={() => {}} theme="light"><Loader/></Modal>}
      {aiInsights && !aiLoading && <AIInsightsModal insights={aiInsights} onClose={() => setAIInsights(null)}/>}

      {/* Create KPI Report */}
      {showCreateReport && (
        <Modal title="Create KPI Report" onClose={() => setShowCreateReport(false)} theme="light">
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:4 }}>CYCLE *</label>
              <select value={createReportForm.cycle_id} onChange={e => setCreateReportForm(p => ({...p, cycle_id:e.target.value}))}
                style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1px solid rgba(22,38,96,0.15)', fontSize:13, outline:'none', background:'#fff', color:'#1e293b' }}>
                <option value="">Select cycle…</option>
                {kpiCycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:4 }}>EMPLOYEE *</label>
              <select value={createReportForm.emp_id} onChange={e => setCreateReportForm(p => ({...p, emp_id:e.target.value}))}
                style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1px solid rgba(22,38,96,0.15)', fontSize:13, outline:'none', background:'#fff', color:'#1e293b' }}>
                <option value="">Select employee…</option>
                {employees.map(e => <option key={e.emp_id} value={e.emp_id}>{e.first_name} {e.last_name} ({e.emp_id})</option>)}
              </select>
            </div>
            <button onClick={createKPIReport}
              style={{ padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#162660,#1e40af)', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              Create Report
            </button>
          </div>
        </Modal>
      )}

      {/* Create Cycle */}
      {showCreateCycle && (
        <Modal title="Create KPI Cycle" onClose={() => setShowCreateCycle(false)} theme="light">
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:3 }}>QUARTER *</label>
                <select value={cycleForm.quarter} onChange={e => setCycleForm(p => ({...p, quarter:e.target.value}))}
                  style={{ width:'100%', padding:'7px 10px', borderRadius:9, border:'1px solid rgba(22,38,96,0.15)', fontSize:13, outline:'none', background:'#fff', color:'#1e293b' }}>
                  <option value="">Select…</option>
                  {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:3 }}>YEAR *</label>
                <input type="number" value={cycleForm.year} onChange={e => setCycleForm(p => ({...p, year:e.target.value}))}
                  style={{ width:'100%', padding:'7px 10px', borderRadius:9, border:'1px solid rgba(22,38,96,0.15)', fontSize:13, outline:'none', boxSizing:'border-box', color:'#1e293b', background:'#fff' }}/>
              </div>
            </div>

            <button onClick={createKPICycle}
              style={{ padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#162660,#1e40af)', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer', marginTop:4 }}>
              Create Cycle
            </button>
          </div>
        </Modal>
      )}

      {/* KPI Items Editor */}
      {showItemsEditor && (
        <Modal title="Edit KPI Items" onClose={() => setShowItemsEditor(null)} theme="light">
          <ItemsEditor reportId={showItemsEditor} onSaved={() => { setShowItemsEditor(null); loadKPI(); }}/>
        </Modal>
      )}

      {/* APAR Grade Fill */}
      {fillMode && selected && (
        <Modal title={`APAR — ${fillMode.charAt(0).toUpperCase()+fillMode.slice(1)} Assessment`} onClose={() => { setFillMode(null); setSelected(null); }} theme="light">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <p style={{ fontSize:13, color:'rgba(22,38,96,0.7)', margin:0 }}>
              Employee: <strong style={{ color:BRAND }}>{selected.emp_name}</strong> &nbsp;|&nbsp; Quarter: <strong style={{ color:BRAND }}>{selected.cycle_name}</strong>
            </p>
            {fillMode === 'reviewing' && (
              <button onClick={handleAutoGenerateFinal}
                style={{ padding:'5px 12px', borderRadius:8, background:'rgba(124,58,237,0.1)', color:'#7c3aed', border:'1px solid rgba(124,58,237,0.3)', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                <Sparkles size={12}/> Auto-Generate Final Report
              </button>
            )}
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:700, color:BRAND, display:'block', marginBottom:8 }}>Grade</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {GRADES.map(g => (
                <button key={g} onClick={() => setAparForm({...aparForm, grade:g})}
                  style={{ padding:'7px 14px', borderRadius:9, fontSize:13, border:'1px solid', fontWeight:600, cursor:'pointer', transition:'all 0.15s',
                    background: aparForm.grade===g ? GRADE_COLOR[g] : '#fff',
                    color: aparForm.grade===g ? '#fff' : '#162660',
                    borderColor: aparForm.grade===g ? GRADE_COLOR[g] : 'rgba(22,38,96,0.15)',
                    boxShadow: aparForm.grade===g ? `0 4px 12px ${GRADE_COLOR[g]}50` : 'none',
                  }}>{g}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:4 }}>REMARKS</label>
            <textarea rows={3} value={aparForm.remarks} onChange={e => setAparForm({...aparForm, remarks:e.target.value})}
              style={{ width:'100%', borderRadius:10, border:'1px solid rgba(22,38,96,0.15)', fontSize:13, padding:'8px 12px', resize:'vertical', fontFamily:'inherit', outline:'none', boxSizing:'border-box', color:'#1e293b', background:'#fff' }}/>
          </div>
          <button disabled={!aparForm.grade} onClick={submitAparFill}
            style={{ width:'100%', padding:'11px', borderRadius:10, background:'linear-gradient(135deg,#162660,#1e40af)', color:'#fff', border:'none', fontWeight:700, fontSize:14, cursor:'pointer', opacity:aparForm.grade?1:0.5 }}>
            Submit
          </button>
        </Modal>
      )}

      {/* APAR Initiate */}
      {showInit && (
        <Modal title="Initiate APAR" onClose={() => setShowInit(false)} theme="light">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:4 }}>EMPLOYEE ID</label>
              <input value={initForm.emp_id} onChange={e => setInitForm({...initForm, emp_id:e.target.value})}
                style={{ width:'100%', padding:'8px 12px', borderRadius:9, border:'1px solid rgba(22,38,96,0.15)', fontSize:13, outline:'none', boxSizing:'border-box', color:'#1e293b', background:'#fff' }}/>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'rgba(22,38,96,0.5)', display:'block', marginBottom:4 }}>QUARTER</label>
              <select value={initForm.cycle_name} onChange={e => setInitForm({...initForm, cycle_name:e.target.value})}
                style={{ width:'100%', padding:'8px 12px', borderRadius:9, border:'1px solid rgba(22,38,96,0.15)', fontSize:13, outline:'none', background:'#fff', color:'#1e293b' }}>
                <option value="">Select…</option>
                {Array.from(new Set(FY_OPTIONS.map(o => o.split(' ')[1]))).map(year => (
                  <optgroup key={year} label={`Year ${year}`}>
                    {FY_OPTIONS.filter(o => o.endsWith(year)).map(y => <option key={y} value={y}>{y}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <button onClick={initAPAR}
            style={{ padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#162660,#1e40af)', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer', marginTop:4 }}>
            Initiate APAR
          </button>
        </Modal>
      )}


    </Layout>
  );
}