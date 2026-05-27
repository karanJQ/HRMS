import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import StatsCard from '../components/common/StatsCard';
import Badge from '../components/common/Badge';
import Loader from '../components/common/Loader';
import { Users, IndianRupee, Calendar, AlertTriangle, UserPlus, TrendingUp, Calendar as CalendarIcon, Star, Fingerprint } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { reportsAPI, leaveAPI, onboardingAPI, attendanceAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [headcount, setHeadcount] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [onboarding, setOnboarding] = useState([]);   
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [punchLoading, setPunchLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      reportsAPI.dashboard(),
      reportsAPI.headcount().catch(() => null),
      leaveAPI.listApplications({ status: 'Pending' }).catch(() => ({ data: { data: [] } })),
      onboardingAPI.list().catch(() => ({ data: { data: [] } })),
    ]).then(([s, h, l, o]) => {
      setStats(s.data.data);
      setHeadcount(h?.data?.data || null);
      setLeaves(l.data.data.slice(0, 4));
      setOnboarding(o.data.data.slice(0, 4));
    }).finally(() => setLoading(false));
  }, []);

  const hasEmpId = !!user?.emp_id;

  const handleQuickPunch = async () => {
    if (!hasEmpId) return;
    try {
      setPunchLoading(true);
      const response = await attendanceAPI.sync({ emp_id: user.emp_id });
      setMsg(response.data?.message || 'Biometric punch synced successfully!');
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.message || e.message));
      setTimeout(() => setMsg(''), 5000);
    } finally {
      setPunchLoading(false);
    }
  };

  if (loading) return <Layout title="Dashboard"><Loader /></Layout>;

  const deptData = headcount?.by_dept?.slice(0, 6) || [];
  const catData = headcount?.by_category || [];

  return (
    <Layout title="HRMS Dashboard" theme="light">
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')
          ? 'bg-red-900/50 text-red-200 border border-red-500/30'
          : 'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30'
          }`}>
          {msg}
        </div>
      )}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Employees" value={stats?.total_employees || 0} icon={Users} color="#68aae8" sub={`${stats?.active_employees || 0} Active`} theme="light" delay={0} />
        <StatsCard title="Monthly Payroll" value={`₹${((stats?.monthly_payroll || 0) / 100000).toFixed(1)}L`} icon={IndianRupee} color="#10b981" sub="Current month" theme="light" delay={60} />
        <StatsCard title="Pending Leaves" value={stats?.pending_leaves || 0} icon={Calendar} color="#f59e0b" sub="Awaiting approval" theme="light" delay={120} />
        <StatsCard title="Open Grievances" value={stats?.open_grievances || 0} icon={AlertTriangle} color="#ef4444" sub="Needs attention" theme="light" delay={180} />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatsCard title="Onboarding Pending" value={stats?.pending_onboarding || 0} icon={UserPlus} color="#8b5cf6" sub="New joiners" theme="light" delay={240} />
        <StatsCard title="Pending Transfers" value={stats?.pending_transfers || 0} icon={TrendingUp} color="#06b6d4" sub="Awaiting approval" theme="light" delay={300} />
        <StatsCard title="Departments" value={deptData.length} icon={Star} color="#f1e4d1" sub="Active departments" theme="light" delay={360} />

        <div 
          className="flex flex-col justify-between p-4 hover-scale transition-all duration-300"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
            animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
            animationDelay: '420ms'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Quick Action</p>
              <h4 className="text-base font-bold mt-1" style={{ color: '#162660' }}>Biometric Attendance</h4>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Fingerprint className={`text-emerald-400 ${hasEmpId ? 'animate-pulse' : ''}`} size={20} />
            </div>
          </div>
          <div className="mt-3">
            {hasEmpId ? (
              <button
                className="w-full btn btn-success flex items-center justify-center gap-2 py-2 font-bold text-white rounded-lg transition-all"
                onClick={handleQuickPunch}
                disabled={punchLoading}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                }}
              >
                {punchLoading ? (
                  <span>Syncing...</span>
                ) : (
                  <>
                    <Fingerprint size={16} />
                    <span>Simulate Punch</span>
                  </>
                )}
              </button>
            ) : (
              <p className="text-xs text-center py-1.5" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>
                Not available for admin accounts
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div 
          className="flex flex-col p-6 hover-card animate-slide-up"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
            animationDelay: '480ms'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Employees by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,38,96,0.06)" vertical={false} />
                <XAxis dataKey="dept" tick={{ fill: 'rgba(22, 38, 96, 0.6)', fontSize: 11 }} axisLine={false} tickLine={false} height={50} />
                <YAxis tick={{ fill: 'rgba(22, 38, 96, 0.6)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(22,38,96,0.1)', borderRadius: '8px', color: '#162660' }} itemStyle={{ color: '#162660' }} />
                <Bar dataKey="count" fill="url(#colorDept)" radius={[4, 4, 0, 0]} barSize={30} />
                <defs>
                  <linearGradient id="colorDept" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#68aae8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#162660" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No data</p>}
        </div>
        <div 
          className="flex flex-col p-6 hover-card animate-slide-up"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
            animationDelay: '540ms'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Category-wise Distribution</h3>
          <div className="space-y-4 mt-4">
            {catData.map((c, i) => {
              const colors = [
                'linear-gradient(90deg, #68aae8, #D0E6FD)',
                'linear-gradient(90deg, #162660, #68aae8)',
                'linear-gradient(90deg, #818cf8, #4f46e5)',
                'linear-gradient(90deg, #f1e4d1, #fefefa)',
                'linear-gradient(90deg, #06b6d4, #67e8f9)'
              ];
              const total = catData.reduce((s, x) => s + parseInt(x.count), 0) || 1;
              return (
                <div key={c.category} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-20" style={{ color: 'rgba(22, 38, 96, 0.8)' }}>{c.category}</span>
                  <div className="flex-1 rounded-full h-2.5 overflow-hidden" style={{ background: 'rgba(22, 38, 96, 0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(parseInt(c.count) / total) * 100}%`, background: colors[i % colors.length] }}></div>
                  </div>
                  <span className="text-sm font-bold w-8 text-right" style={{ color: '#162660' }}>{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div 
          className="flex flex-col p-6 hover-card animate-slide-up"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
            animationDelay: '600ms'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Recent Pending Leaves</h3>
          {leaves.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No pending leaves</p> :
            <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                    {['Employee', 'Type', 'Days', 'Status'].map(h => (
                      <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{leaves.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.05)' }}>
                    <td style={{ color: '#162660' }}>{l.emp_name}</td>
                    <td>
                      <span style={{ background: 'rgba(22, 38, 96, 0.05)', color: '#162660' }} className="px-2 py-1 rounded text-xs">
                        {l.leave_type}
                      </span>
                    </td>
                    <td style={{ color: '#162660' }}>{l.days}</td>
                    <td><Badge text={l.status} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>}
        </div>
        <div 
          className="flex flex-col p-6 hover-card animate-slide-up"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
            animationDelay: '660ms'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Onboarding Pipeline</h3>
          {onboarding.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No active onboarding</p> :
            <div className="space-y-3">
              {onboarding.map(o => (
                <div 
                  key={o.id} 
                  className="flex items-center justify-between p-3 rounded-xl transition-all duration-200"
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(22, 38, 96, 0.06)',
                    boxShadow: '0 2px 6px rgba(22, 38, 96, 0.02)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(22, 38, 96, 0.02)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#162660' }}>{o.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{o.post} • {o.dept_name_full || o.dept_name}</p>
                  </div>
                  <Badge text={o.status} />
                </div>
              ))}
            </div>}
        </div>
      </div>
    </Layout>
  );
}
