import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ title, children, theme, bg }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const isLight = theme === 'light';

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex relative overflow-x-hidden">
      <Sidebar collapsed={collapsed} isMobile={isMobile} setCollapsed={setCollapsed} />
      {/* Mobile Overlay */}
      {isMobile && !collapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 transition-opacity" 
          onClick={() => setCollapsed(true)}
        />
      )}
      <div 
        className="main-content flex-1 transition-all duration-300 w-full"
        style={{
          background: bg || (isLight ? '#FEFEFA' : 'var(--bg-gradient)'),
          minHeight: '100vh',
          marginLeft: isMobile ? '0' : (collapsed ? '80px' : '280px'),
        }}
      >
        <Header title={title} theme={theme} bg={bg} onToggleSidebar={() => setCollapsed(!collapsed)} collapsed={collapsed} />
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
