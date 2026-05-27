import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
export default function Layout({ title, children, theme, bg }) {
  const [collapsed, setCollapsed] = useState(false);
  const isLight = theme === 'light';

  return (
    <div className="flex">
      <Sidebar collapsed={collapsed} />
      <div 
        className="main-content flex-1 transition-all duration-300"
        style={{
          background: bg || (isLight ? '#FEFEFA' : 'var(--bg-gradient)'),
          minHeight: '100vh',
          marginLeft: collapsed ? '80px' : '280px',
        }}
      >
        <Header title={title} theme={theme} bg={bg} onToggleSidebar={() => setCollapsed(!collapsed)} collapsed={collapsed} />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
