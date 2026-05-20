import React from 'react';
export default function Loader({ text = 'Loading...' }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:12 }}>
      <div style={{ width:36, height:36, border:'3px solid #e2e8f0', borderTop:'3px solid #3b82f6', borderRadius:'50%', animation:'spin 1s linear infinite' }}></div>
      <p style={{ color:'#94a3b8', fontSize:14 }}>{text}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}