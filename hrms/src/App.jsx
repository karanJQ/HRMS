import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import EmployeeMaster from './pages/EmployeeMaster';
import MyProfile from './pages/MyProfile';
import Payroll from './pages/Payroll';
import Attendance from './pages/Attendance';
import Transfer from './pages/Transfer';
import APAR from './pages/APAR';
import ServiceBook from './pages/ServiceBook';
import Training from './pages/Training';

import Probation from './pages/Probation';
import Grievance from './pages/Grievance';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import Tasks from './pages/Tasks';
import DocumentUpload from './pages/DocumentUpload';
import DocumentVerification from './pages/DocumentVerification';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#64748b'}}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
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
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Prot comp={Dashboard} />} />
          <Route path="/onboarding" element={<Prot comp={Onboarding} roles={['super_admin','hr_manager','hr_staff']} />} />
          <Route path="/employees" element={<Prot comp={EmployeeMaster} roles={['super_admin','hr_manager','dept_head','hr_staff']} />} />
          <Route path="/my-profile" element={<Prot comp={MyProfile} roles={['employee']} />} />
          <Route path="/my-documents" element={<Prot comp={DocumentUpload} roles={['employee', 'hr_staff', 'hr_manager', 'super_admin']} />} />
          <Route path="/document-verification" element={<Prot comp={DocumentVerification} roles={['super_admin','hr_manager','hr_staff']} />} />
          <Route path="/payroll" element={<Prot comp={Payroll} />} />
          <Route path="/attendance" element={<Prot comp={Attendance} />} />
          <Route path="/transfer" element={<Prot comp={Transfer} roles={['super_admin','hr_manager','dept_head','hr_staff']} />} />
          <Route path="/apar" element={<Prot comp={APAR} />} />
          <Route path="/servicebook" element={<Prot comp={ServiceBook} />} />
          <Route path="/training" element={<Prot comp={Training} />} />

          <Route path="/probation" element={<Prot comp={Probation} roles={['super_admin','hr_manager','dept_head','hr_staff']} />} />
          <Route path="/grievance" element={<Prot comp={Grievance} />} />
          <Route path="/reports" element={<Prot comp={Reports} roles={['super_admin','hr_manager','dept_head','hr_staff']} />} />
          <Route path="/users" element={<Prot comp={UserManagement} roles={['super_admin']} />} />
          <Route path="/tasks" element={<Prot comp={Tasks} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
