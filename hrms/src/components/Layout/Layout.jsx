import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
export default function Layout({ title, children, theme }) {
  const isLight = theme === 'light';
  return (
    <div className="flex">
      <Sidebar />
      <div 
        className="main-content flex-1 transition-all duration-300"
        style={{
          background: isLight ? '#FEFEFA' : 'var(--bg-gradient)',
          minHeight: '100vh',
        }}
      >
        <Header title={title} theme={theme} />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
