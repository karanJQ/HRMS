import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
export default function Layout({ title, children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="main-content flex-1">
        <Header title={title} />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
