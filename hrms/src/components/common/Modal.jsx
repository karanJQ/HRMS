import React from 'react';
import { X } from 'lucide-react';
export default function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: wide ? 800 : 600 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
