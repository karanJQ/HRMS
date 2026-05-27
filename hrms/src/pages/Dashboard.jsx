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
      reportsAPI.headcount().catch(()=>null),
      leaveAPI.listApplications({ status:'Pending' }).catch(()=>({data:{data:[]}})),
      onboardingAPI.list().catch(()=>({data:{data:[]}})),
    ]).then(([s, h, l, o]) => {
      setStats(s.data.data);
      setHeadcount(h?.data?.data || null);
      setLeaves(l.data.data.slice(0,4));
      const activeOnboarding = (o.data.data || []).filter(cand => cand.status !== 'Completed' && cand.status !== 'Cancelled');
      setOnboarding(activeOnboarding.slice(0,4));
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

  const deptData = headcount?.by_dept?.slice(0,6) || [];
  const catData = headcount?.by_category || [];

  return (
    <Layout title="HRMS Dashboard">
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${
          msg.startsWith('Error') 
            ? 'bg-red-900/50 text-red-200 border border-red-500/30' 
            : 'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30'
        }`}>
          {msg}
        </div>
      )}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Employees" value={stats?.total_employees||0} icon={Users} color="#3b82f6" sub={`${stats?.active_employees||0} Active`} />
        <StatsCard title="Monthly Payroll" value={`₹${((stats?.monthly_payroll||0)/100000).toFixed(1)}L`} icon={IndianRupee} color="#22c55e" sub="Current month" />
        <StatsCard title="Pending Leaves" value={stats?.pending_leaves||0} icon={CalendarIcon} color="#f59e0b" sub="Awaiting approval" />
        <StatsCard title="Open Grievances" value={stats?.open_grievances||0} icon={AlertTriangle} color="#ef4444" sub="Needs attention" />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatsCard title="Onboarding Pending" value={stats?.pending_onboarding||0} icon={UserPlus} color="#8b5cf6" sub="New joiners" />
        <StatsCard title="Pending Transfers" value={stats?.pending_transfers||0} icon={TrendingUp} color="#06b6d4" sub="Awaiting approval" />
        <StatsCard title="Departments" value={deptData.length} icon={Star} color="#f97316" sub="Active departments" />
        
        <div className="glass-card flex flex-col justify-between p-4 hover-scale">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Quick Action</p>
              <h4 className="text-white text-base font-bold mt-1">Biometric Attendance</h4>
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
              <p className="text-xs text-slate-500 text-center py-1.5">
                Not available for admin accounts
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Employees by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="dept" tick={{fill:'#94a3b8', fontSize:11}} axisLine={false} tickLine={false} height={50}/>
                <YAxis tick={{fill:'#94a3b8', fontSize:12}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{backgroundColor:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#fff'}} itemStyle={{color:'#fff'}} />
                <Bar dataKey="count" fill="url(#colorDept)" radius={[4,4,0,0]} barSize={30} />
                <defs>
                  <linearGradient id="colorDept" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No data</p>}
        </div>
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Category-wise Distribution</h3>
          <div className="space-y-4 mt-4">
            {catData.map((c,i) => {
              const colors = ['linear-gradient(90deg, #3b82f6, #60a5fa)','linear-gradient(90deg, #10b981, #34d399)','linear-gradient(90deg, #f59e0b, #fbbf24)','linear-gradient(90deg, #ef4444, #f87171)','linear-gradient(90deg, #8b5cf6, #a78bfa)'];
              const total = catData.reduce((s,x)=>s+parseInt(x.count),0)||1;
              return (
                <div key={c.category} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-20 text-slate-300">{c.category}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-2.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{width:`${(parseInt(c.count)/total)*100}%`,background:colors[i%colors.length]}}></div>
                  </div>
                  <span className="text-sm font-bold text-white w-8 text-right">{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Pending Leaves</h3>
          {leaves.length===0 ? <p className="text-slate-400 text-sm text-center py-8">No pending leaves</p> :
          <div className="table-wrap">
            <table>
              <thead><tr>
                {['Employee','Type','Days','Status'].map(h=><th key={h}>{h}</th>)}
              </tr></thead>
              <tbody>{leaves.map(l=>(
                <tr key={l.id}>
                  <td>{l.emp_name}</td>
                  <td><span className="bg-white/10 px-2 py-1 rounded text-xs text-slate-300">{l.leave_type}</span></td>
                  <td>{l.days}</td>
                  <td><Badge text={l.status} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>}
        </div>
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Onboarding Pipeline</h3>
          {onboarding.length===0 ? <p className="text-slate-400 text-sm text-center py-8">No active onboarding</p> :
          <div className="space-y-3">
            {onboarding.map(o=>(
              <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">{o.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{o.post} • {o.dept_name_full||o.dept_name}</p>
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
