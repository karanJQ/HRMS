import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ title, children, theme, bg }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const isLight = theme === 'light';

  useEffect(() => {
    let lastWidth = window.innerWidth;
    
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const mobile = newWidth < 768;
      setIsMobile(mobile);
      
      // Only close sidebar if the width actually changed (e.g. orientation flip or desktop resize)
      // This prevents the sidebar from closing when scrolling on mobile (which triggers height resize)
      if (newWidth !== lastWidth) {
        if (mobile) setCollapsed(true);
        lastWidth = newWidth;
      }
    };
    
    window.addEventListener('resize', handleResize);
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
        className="main-content transition-all duration-300"
        style={{
          background: bg || (isLight ? '#FEFEFA' : 'var(--bg-gradient)'),
          minHeight: '100vh',
          marginLeft: isMobile ? '0' : (collapsed ? '80px' : '280px'),
          width: isMobile ? '100%' : (collapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)'),
        }}
      >
        <Header title={title} theme={theme} bg={bg} onToggleSidebar={() => setCollapsed(!collapsed)} collapsed={collapsed} />
        <div className="px-2 py-4 sm:p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
