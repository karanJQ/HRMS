import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ title, children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex">
      <Sidebar collapsed={collapsed} />
      <div 
        className="main-content flex-1 transition-all duration-300"
        style={{ marginLeft: collapsed ? '80px' : '280px' }}
      >
        <Header title={title} onToggleSidebar={() => setCollapsed(!collapsed)} collapsed={collapsed} />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
