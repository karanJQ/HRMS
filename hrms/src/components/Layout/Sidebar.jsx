import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, UserPlus, Users, IndianRupee, Calendar, ArrowLeftRight, TrendingUp, Star, BookOpen, GraduationCap, Clock, AlertTriangle, BarChart3, Building2, LogOut, Shield, Workflow } from 'lucide-react';

const allNav = [
  { label:'Dashboard', icon:LayoutDashboard, path:'/dashboard', roles:['super_admin','hr_manager','dept_head','hr_staff','employee'] },
  { label:'Onboarding', icon:UserPlus, path:'/onboarding', roles:['super_admin','hr_manager','hr_staff'] },
  { label:'Employee Master', icon:Users, path:'/employees', roles:['super_admin','hr_manager','dept_head','hr_staff'] },
  { label:'My Profile', icon:Users, path:'/my-profile', roles:['employee'] },
  { label:'Payroll', icon:IndianRupee, path:'/payroll', roles:['super_admin','hr_manager','hr_staff','employee'] },
  { label:'Attendance & Leave', icon:Calendar, path:'/attendance', roles:['super_admin','hr_manager','dept_head','hr_staff','employee'] },
  { label:'Transfer & Posting', icon:ArrowLeftRight, path:'/transfer', roles:['super_admin','hr_manager','dept_head','hr_staff'] },
  { label:'Promotion & Seniority', icon:TrendingUp, path:'/promotion', roles:['super_admin','hr_manager','dept_head','hr_staff'] },
  { label:'APAR / Performance', icon:Star, path:'/apar', roles:['super_admin','hr_manager','dept_head','hr_staff','employee'] },
  { label:'Service Book', icon:BookOpen, path:'/servicebook', roles:['super_admin','hr_manager','hr_staff','employee'] },
  { label:'Training', icon:GraduationCap, path:'/training', roles:['super_admin','hr_manager','dept_head','hr_staff','employee'] },
  { label:'Retirement', icon:Clock, path:'/retirement', roles:['super_admin','hr_manager','hr_staff'] },
  { label:'Grievance & Discipline', icon:AlertTriangle, path:'/grievance', roles:['super_admin','hr_manager','dept_head','hr_staff','employee'] },
  { label:'Reports', icon:BarChart3, path:'/reports', roles:['super_admin','hr_manager','dept_head','hr_staff'] },
  { label:'Workflow Tasks', icon:Workflow, path:'/tasks', roles:['super_admin','hr_manager','dept_head','hr_staff','employee'] },
  { label:'User Management', icon:Shield, path:'/users', roles:['super_admin'] },
];

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const nav = allNav.filter(n => n.roles.includes(user?.role));
  const roleLabel = { super_admin:'Super Admin', hr_manager:'HR Manager', dept_head:'Dept Head', hr_staff:'HR Staff', employee:'Employee' };
  const initials = user ? `${user.first_name?.[0]||''}${user.last_name?.[0]||user.username?.[0]||''}`.toUpperCase() : 'SA';

  return (
    <div 
      className="sidebar fixed top-0 left-0 flex flex-col transition-all duration-300" 
      style={{ zIndex: 40, width: collapsed ? '80px' : '280px' }}
    >
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Building2 size={20} color="#fff" />
          </div>
          {!collapsed && (
            <div className="transition-all duration-300">
              <p className="text-white font-bold text-sm leading-tight">Gujarat Govt.</p>
              <p className="text-slate-400 text-xs">HRMS Portal</p>
            </div>
          )}
        </div>
      </div>
      <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden">
        {nav.map(item => (
          <div 
            key={item.path} 
            className={`nav-item mb-0.5 ${location.pathname===item.path?'active':''}`} 
            onClick={()=>navigate(item.path)}
            title={collapsed ? item.label : ''}
            style={{ 
              padding: collapsed ? '12px 0' : '12px 20px', 
              justifyContent: collapsed ? 'center' : 'flex-start',
              margin: collapsed ? '4px 8px' : '4px 16px'
            }}
          >
            <item.icon size={16} className="flex-shrink-0" />
            {!collapsed && <span className="transition-all duration-300">{item.label}</span>}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3 justify-center">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{initials}</div>
          {!collapsed && (
            <div className="flex-1 min-w-0 transition-all duration-300">
              <p className="text-white text-xs font-medium truncate">{user?.first_name||user?.username}</p>
              <p className="text-slate-400 text-xs">{roleLabel[user?.role]||user?.role}</p>
            </div>
          )}
        </div>
        <button 
          onClick={logout} 
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
          title={collapsed ? 'Sign Out' : ''}
          style={{ 
            padding: collapsed ? '12px 0' : '12px 20px', 
            justifyContent: collapsed ? 'center' : 'flex-start',
            margin: collapsed ? '4px 8px' : '4px 16px'
          }}
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && <span className="transition-all duration-300">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}