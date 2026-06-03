import React, { useState } from 'react';

export default function StatsCard({ title, value, icon: Icon, color, sub, theme, delay = 0 }) {
  const isLight = theme === 'light';
  const [hovered, setHovered] = useState(false);
  
  if (!isLight) {
    // Return original dark glassmorphism styling
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

  return (
    <div 
      className="relative flex flex-col justify-between p-4 sm:p-5 transition-all duration-300 overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1px solid ${hovered ? color : 'rgba(22, 38, 96, 0.07)'}`,
        borderRadius: '16px',
        boxShadow: hovered ? '0 15px 35px rgba(22, 38, 96, 0.08)' : '0 10px 30px rgba(22, 38, 96, 0.04)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        minHeight: '110px',
        animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        animationDelay: `${delay}ms`,
        cursor: 'pointer'
      }}
    >
      {/* Right Edge Colored Vertical Bar (animates height and width on hover) */}
      <div 
        style={{
          position: 'absolute',
          right: '6px',
          top: hovered ? '12px' : '24px',
          bottom: hovered ? '12px' : '24px',
          width: hovered ? '6px' : '4px',
          borderRadius: '9999px',
          background: color,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      />

      {/* Top Row: Icon on left */}
      <div className="flex items-center justify-between w-full">
        <div 
          className="flex items-center justify-center"
          style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '10px', 
            background: hovered ? color + '15' : 'rgba(22, 38, 96, 0.03)', 
            color: hovered ? color : '#162660',
            transform: hovered ? 'scale(1.1) rotate(-5deg)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <Icon size={18} />
        </div>
      </div>

      {/* Bottom Details Row */}
      <div className="mt-3 pr-3">
        <p className="text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase truncate" title={title} style={{ color: 'rgba(22, 38, 96, 0.5)' }}>
          {title}
        </p>
        <h4 className="text-xl sm:text-2xl font-extrabold mt-1 leading-none truncate" style={{ color: '#162660' }}>
          {value}
        </h4>
        {sub && (
          <p className="text-[10px] sm:text-[11px] font-medium mt-1 truncate" title={sub} style={{ color: 'rgba(22, 38, 96, 0.45)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
