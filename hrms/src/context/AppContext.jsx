import React, { createContext, useContext, useState } from 'react';
const AppContext = createContext();
export const AppProvider = ({ children }) => {
  const [user] = useState({ name: 'Super Admin', role: 'super_admin', dept: 'All' });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return <AppContext.Provider value={{ user, sidebarOpen, setSidebarOpen }}>{children}</AppContext.Provider>;
};
export const useApp = () => useContext(AppContext);
