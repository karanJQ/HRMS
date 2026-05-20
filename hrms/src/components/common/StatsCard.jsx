import React from 'react';
export default function StatsCard({ title, value, icon: Icon, color, sub }) {
  return (
    <div className="stat-card flex items-start gap-4">
      <div className="p-3 rounded-xl" style={{ background: color + '20' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
