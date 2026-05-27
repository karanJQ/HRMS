import React from 'react';

// Premium high-contrast badge styles with matching background, text, and indicator dot colors
const statusStyles = {
  // Success states (Green)
  Active:                     { bg: 'rgba(16, 185, 129, 0.08)', text: '#065f46', dot: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  Paid:                       { bg: 'rgba(16, 185, 129, 0.08)', text: '#065f46', dot: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  Completed:                  { bg: 'rgba(16, 185, 129, 0.08)', text: '#065f46', dot: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  Approved:                   { bg: 'rgba(16, 185, 129, 0.08)', text: '#065f46', dot: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  Cleared:                    { bg: 'rgba(16, 185, 129, 0.08)', text: '#065f46', dot: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  Resolved:                   { bg: 'rgba(16, 185, 129, 0.08)', text: '#065f46', dot: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  Outstanding:                { bg: 'rgba(16, 185, 129, 0.08)', text: '#065f46', dot: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  'Documents Verified':       { bg: 'rgba(16, 185, 129, 0.08)', text: '#065f46', dot: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },

  // Info states (Blue)
  'Very Good':                { bg: 'rgba(59, 130, 246, 0.08)', text: '#1e40af', dot: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
  Upcoming:                   { bg: 'rgba(59, 130, 246, 0.08)', text: '#1e40af', dot: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
  'On Leave':                 { bg: 'rgba(59, 130, 246, 0.08)', text: '#1e40af', dot: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },

  // Indigo / Moderate states
  Good:                       { bg: 'rgba(99, 102, 241, 0.08)', text: '#3730a3', dot: '#6366f1', border: 'rgba(99, 102, 241, 0.2)' },

  // Warning / Pending states (Amber)
  Pending:                    { bg: 'rgba(245, 158, 11, 0.08)', text: '#92400e', dot: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  'Pending DPC':              { bg: 'rgba(245, 158, 11, 0.08)', text: '#92400e', dot: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  'Pending Approval':         { bg: 'rgba(245, 158, 11, 0.08)', text: '#92400e', dot: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  'Under Review':             { bg: 'rgba(245, 158, 11, 0.08)', text: '#92400e', dot: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  'Pending Self-Assessment':  { bg: 'rgba(245, 158, 11, 0.08)', text: '#92400e', dot: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  'Pending Reporting Officer':{ bg: 'rgba(245, 158, 11, 0.08)', text: '#92400e', dot: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  'Pending Reviewing Officer':{ bg: 'rgba(245, 158, 11, 0.08)', text: '#92400e', dot: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  'Joining Formalities':      { bg: 'rgba(245, 158, 11, 0.08)', text: '#92400e', dot: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  Medium:                     { bg: 'rgba(245, 158, 11, 0.08)', text: '#92400e', dot: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  Average:                    { bg: 'rgba(245, 158, 11, 0.08)', text: '#92400e', dot: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },

  // Danger / Inquiry states (Red)
  'Inquiry Ongoing':          { bg: 'rgba(239, 68, 68, 0.08)', text: '#991b1b', dot: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
  'Pending Documents':        { bg: 'rgba(239, 68, 68, 0.08)', text: '#991b1b', dot: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
  High:                       { bg: 'rgba(239, 68, 68, 0.08)', text: '#991b1b', dot: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
  Poor:                       { bg: 'rgba(239, 68, 68, 0.08)', text: '#991b1b', dot: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
  Suspended:                  { bg: 'rgba(239, 68, 68, 0.08)', text: '#991b1b', dot: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
  Resigned:                   { bg: 'rgba(148, 163, 184, 0.08)', text: '#475569', dot: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)' },
  Retired:                    { bg: 'rgba(148, 163, 184, 0.08)', text: '#475569', dot: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)' },
};

export default function Badge({ text }) {
  const style = statusStyles[text] || { bg: 'rgba(148, 163, 184, 0.08)', text: '#475569', dot: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)' };

  return (
    <span
      className="badge transition-all duration-300"
      style={{
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12.5px',
        fontWeight: '600',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        userSelect: 'none',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
      }}
    >
      <span 
        style={{ 
          width: '6px', 
          height: '6px', 
          borderRadius: '50%', 
          background: style.dot,
          display: 'inline-block',
          boxShadow: `0 0 4px ${style.dot}`
        }} 
      />
      {text}
    </span>
  );
}
