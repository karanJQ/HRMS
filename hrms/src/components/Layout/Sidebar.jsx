import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { taskAPI } from '../../api/endpoints';
import { 
  LayoutDashboard, UserPlus, Users, IndianRupee, Calendar, 
  ArrowLeftRight, TrendingUp, Star, BookOpen, GraduationCap, 
  Clock, AlertTriangle, BarChart3, Building2, LogOut, Shield, 
  Workflow, Search, ChevronDown 
} from 'lucide-react';

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
  const [taskCount, setTaskCount] = useState(24);
  const [grievanceCount, setGrievanceCount] = useState(8);

  useEffect(() => {
    if (user) {
      taskAPI.stats()
        .then(res => {
          const inProgress = res.data?.data?.in_progress || 0;
          const inReview = res.data?.data?.in_review || 0;
          const total = res.data?.data?.total || 0;
          setTaskCount(inProgress + inReview || total || 24);
        })
        .catch(() => {});
    }
  }, [user]);

  const nav = allNav.filter(n => n.roles.includes(user?.role));
  
  // Section 1: Top items (Dashboard, Tasks)
  const group1 = nav.filter(item => 
    ['/dashboard', '/tasks'].includes(item.path)
  );

  // Section 2: Middle items (Attendance & Leave, Payroll, Service Book, APAR / Performance)
  const group2 = nav.filter(item => 
    ['/attendance', '/payroll', '/servicebook', '/apar'].includes(item.path)
  );

  // Section 3: Bottom items (Employee Master, Onboarding, Transfer, Promotion, Training, Retirement, Grievance, Reports, User Management)
  const group3 = nav.filter(item => 
    !['/dashboard', '/tasks', '/attendance', '/payroll', '/servicebook', '/apar'].includes(item.path)
  );

  const roleLabel = { 
    super_admin:'Super Admin', 
    hr_manager:'HR Manager', 
    dept_head:'Dept Head', 
    hr_staff:'HR Staff', 
    employee:'Employee' 
  };
  const initials = user ? `${user.first_name?.[0]||''}${user.last_name?.[0]||user.username?.[0]||''}`.toUpperCase() : 'SA';

  const getBadge = (path) => {
    if (path === '/tasks') return <span className="ml-auto bg-[#a3e635] text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{taskCount}</span>;
    if (path === '/grievance') return <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{grievanceCount}</span>;
    return null;
  };

  const hasDropdown = (path) => {
    return ['/employees', '/attendance', '/grievance'].includes(path);
  };

  return (
    <div className="sidebar fixed top-0 left-0 flex flex-col shadow-[4px_0_24px_rgba(22,38,96,0.1)] transition-all duration-300" style={{ zIndex: 40, borderRight: '1px solid rgba(22, 38, 96, 0.1)', background: '#c8bcea', width: collapsed ? '80px' : '280px' }}>
      
      {/* Header Info */}
      <div className="px-6 pt-7 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#162660] flex items-center justify-center shadow-[0_4px_12px_rgba(22,38,96,0.2)] flex-shrink-0">
            <TrendingUp size={16} color="#fff" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-extrabold text-base leading-tight tracking-tight" style={{ color: '#162660' }}>Gujarat HRMS</p>
            </div>
          )}
        </div>
      </div>

      {/* Search Input Box */}
      {!collapsed && (
        <div className="px-4 mb-4 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(22, 38, 96, 0.6)' }} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs placeholder-[rgba(22,38,96,0.4)] border-none outline-none transition-all duration-200 focus:ring-1 focus:ring-[#162660]/30" 
              style={{ background: '#ffffff', color: '#162660', border: '1px solid rgba(22, 38, 96, 0.08)' }}
            />
          </div>
        </div>
      )}

      {/* Navigation Area */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto no-scrollbar space-y-0.5">
        
        {/* Group 1 */}
        {group1.map(item => (
          <div 
            key={item.path} 
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`} 
            onClick={() => navigate(item.path)}
            title={collapsed ? item.label : ''}
            style={{ 
              padding: collapsed ? '12px 0' : undefined, 
              justifyContent: collapsed ? 'center' : undefined,
              margin: collapsed ? '4px 8px' : undefined
            }}
          >
            <item.icon size={16} className="flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && getBadge(item.path)}
            {!collapsed && hasDropdown(item.path) && <ChevronDown size={12} className="ml-auto" />}
          </div>
        ))}

        {group2.length > 0 && (
          <>
            <hr style={{ borderColor: 'rgba(22, 38, 96, 0.1)' }} className="my-3 mx-4" />
            {group2.map(item => (
              <div 
                key={item.path} 
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`} 
                onClick={() => navigate(item.path)}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
                {getBadge(item.path)}
                {hasDropdown(item.path) && <ChevronDown size={12} className="ml-auto" />}
              </div>
            ))}
          </>
        )}

        {group3.length > 0 && (
          <>
            <hr style={{ borderColor: 'rgba(22, 38, 96, 0.1)' }} className="my-3 mx-4" />
            {group3.map(item => (
              <div 
                key={item.path} 
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`} 
                onClick={() => navigate(item.path)}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
                {getBadge(item.path)}
                {hasDropdown(item.path) && <ChevronDown size={12} className="ml-auto" />}
              </div>
            ))}
          </>
        )}
      </nav>

      {/* Profile Box at the Bottom */}
      <div className="p-4 border-t flex-shrink-0" style={{ backgroundColor: 'rgba(22, 38, 96, 0.03)', borderColor: 'rgba(22, 38, 96, 0.08)' }}>
        <div className="flex items-center gap-3 p-3 rounded-2xl border bg-white/60 hover:bg-white/80 transition-all duration-200" style={{ borderColor: 'rgba(22, 38, 96, 0.08)', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          {/* Avatar circle */}
          <div className="w-10 h-10 rounded-full bg-[#162660] text-white flex items-center justify-center text-xs font-extrabold shadow-sm flex-shrink-0">
            {initials}
          </div>
          {/* Name & Role details */}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: '#162660' }}>{user?.first_name || user?.username}</p>
              <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{roleLabel[user?.role] || user?.role}</p>
            </div>
          )}
          {/* Sign out action option */}
          <button 
            onClick={logout} 
            className="p-1.5 hover:text-red-600 hover:bg-black/5 rounded-lg transition-colors cursor-pointer" 
            style={{ color: 'rgba(22, 38, 96, 0.6)' }}
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}