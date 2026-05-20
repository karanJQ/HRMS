import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
export default function ErrorMsg({ message, onRetry }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, gap:12 }}>
      <AlertCircle size={32} color="#ef4444" />
      <p style={{ color:'#64748b', fontSize:14 }}>{message || 'Something went wrong.'}</p>
      {onRetry && <button className="btn btn-secondary" onClick={onRetry}><RefreshCw size={14}/>Retry</button>}
    </div>
  );
}