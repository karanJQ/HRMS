import React from 'react';

// Dark-theme glassmorphism badge colors: rgba background + bright vivid text
const colors = {
  // Green — success states
  Active:                     'rgba(16,185,129,0.18):#34d399',
  Paid:                       'rgba(16,185,129,0.18):#34d399',
  Completed:                  'rgba(16,185,129,0.18):#34d399',
  Approved:                   'rgba(16,185,129,0.18):#34d399',
  Cleared:                    'rgba(16,185,129,0.18):#34d399',
  Resolved:                   'rgba(16,185,129,0.18):#34d399',
  Outstanding:                'rgba(16,185,129,0.18):#34d399',
  'Documents Verified':       'rgba(16,185,129,0.18):#34d399',

  // Blue — info states
  'Very Good':                'rgba(59,130,246,0.18):#60a5fa',
  Upcoming:                   'rgba(59,130,246,0.18):#60a5fa',
  'On Leave':                 'rgba(59,130,246,0.18):#60a5fa',

  // Indigo — moderate positive
  Good:                       'rgba(99,102,241,0.18):#818cf8',

  // Amber — pending states
  Pending:                    'rgba(245,158,11,0.18):#fbbf24',
  'Pending DPC':              'rgba(245,158,11,0.18):#fbbf24',
  'Pending Approval':         'rgba(245,158,11,0.18):#fbbf24',
  'Under Review':             'rgba(245,158,11,0.18):#fbbf24',
  'Pending Self-Assessment':  'rgba(245,158,11,0.18):#fbbf24',
  'Pending Reporting Officer':'rgba(245,158,11,0.18):#fbbf24',
  'Pending Reviewing Officer':'rgba(245,158,11,0.18):#fbbf24',
  'Joining Formalities':      'rgba(245,158,11,0.18):#fbbf24',
  Medium:                     'rgba(245,158,11,0.18):#fbbf24',
  Average:                    'rgba(245,158,11,0.18):#fbbf24',

  // Red — danger states
  'Inquiry Ongoing':          'rgba(239,68,68,0.18):#f87171',
  'Pending Documents':        'rgba(239,68,68,0.18):#f87171',
  High:                       'rgba(239,68,68,0.18):#f87171',
  Poor:                       'rgba(239,68,68,0.18):#f87171',

  // Slate — low priority
  Low:                        'rgba(148,163,184,0.18):#94a3b8',
};

export default function Badge({ text }) {
  const [bg, color] = (colors[text] || 'rgba(148,163,184,0.18):#94a3b8').split(':');
  return (
    <span
      className="badge"
      style={{ background: bg, color, border: `1px solid ${color}40` }}
    >
      {text}
    </span>
  );
}
