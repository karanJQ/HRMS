import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import EmployeeMaster from './pages/EmployeeMaster';
import Payroll from './pages/Payroll';
import Attendance from './pages/Attendance';
import Transfer from './pages/Transfer';
import Promotion from './pages/Promotion';
import APAR from './pages/APAR';
import ServiceBook from './pages/ServiceBook';
import Training from './pages/Training';
import Retirement from './pages/Retirement';
import Grievance from './pages/Grievance';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#64748b'}}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const Prot = ({ comp: Comp, roles }) => (
  <ProtectedRoute roles={roles}><Comp /></ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Prot comp={Dashboard} />} />
          <Route path="/onboarding" element={<Prot comp={Onboarding} roles={['super_admin','hr_manager','hr_staff']} />} />
          <Route path="/employees" element={<Prot comp={EmployeeMaster} roles={['super_admin','hr_manager','dept_head','hr_staff']} />} />
          <Route path="/my-profile" element={<Prot comp={EmployeeMaster} roles={['employee']} />} />
          <Route path="/payroll" element={<Prot comp={Payroll} />} />
          <Route path="/attendance" element={<Prot comp={Attendance} />} />
          <Route path="/transfer" element={<Prot comp={Transfer} roles={['super_admin','hr_manager','dept_head','hr_staff']} />} />
          <Route path="/promotion" element={<Prot comp={Promotion} roles={['super_admin','hr_manager','dept_head','hr_staff']} />} />
          <Route path="/apar" element={<Prot comp={APAR} />} />
          <Route path="/servicebook" element={<Prot comp={ServiceBook} />} />
          <Route path="/training" element={<Prot comp={Training} />} />
          <Route path="/retirement" element={<Prot comp={Retirement} roles={['super_admin','hr_manager','hr_staff']} />} />
          <Route path="/grievance" element={<Prot comp={Grievance} />} />
          <Route path="/reports" element={<Prot comp={Reports} roles={['super_admin','hr_manager','dept_head','hr_staff']} />} />
          <Route path="/users" element={<Prot comp={UserManagement} roles={['super_admin']} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
