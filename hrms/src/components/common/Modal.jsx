import React from 'react';
import { X } from 'lucide-react';
export default function Modal({ title, onClose, children, wide, theme }) {
  const isLight = theme === 'light';
  return (
    <div className="modal-overlay">
      <div 
        className="modal" 
        style={{ 
          maxWidth: wide ? 800 : 600,
          background: isLight ? '#fff' : '#1e293b',
          border: isLight ? '1px solid rgba(22, 38, 96, 0.12)' : '1px solid var(--glass-border)',
          boxShadow: isLight ? '0 20px 40px rgba(22, 38, 96, 0.15)' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: isLight ? '#162660' : '#fff' }}>{title}</h2>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full transition-colors"
            style={{
              color: isLight ? 'rgba(22, 38, 96, 0.5)' : '#94a3b8',
              background: 'transparent'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isLight ? 'rgba(22, 38, 96, 0.05)' : 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = isLight ? '#162660' : '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = isLight ? 'rgba(22, 38, 96, 0.5)' : '#94a3b8';
            }}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
