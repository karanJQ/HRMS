import React from 'react';
export default function StatsCard({ title, value, icon: Icon, color, sub }) {
  return (
    <div className="glass-card flex items-start gap-4">
      <div className="p-3 rounded-xl" style={{ background: color + '20' }}>
        <Icon size={24} style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-slate-400 font-medium">{title}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}
