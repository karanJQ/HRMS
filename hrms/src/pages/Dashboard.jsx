import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import StatsCard from '../components/common/StatsCard';
import Badge from '../components/common/Badge';
import Loader from '../components/common/Loader';
import { Users, DollarSign, Clock, AlertTriangle, UserPlus, TrendingUp, Calendar, Star } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { reportsAPI, leaveAPI, onboardingAPI } from '../api/endpoints';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [headcount, setHeadcount] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [onboarding, setOnboarding] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setOnboarding(o.data.data.slice(0,4));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Dashboard"><Loader /></Layout>;

  const deptData = headcount?.by_dept?.slice(0,6) || [];
  const catData = headcount?.by_category || [];

  return (
    <Layout title="HRMS Dashboard">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Employees" value={stats?.total_employees||0} icon={Users} color="#3b82f6" sub={`${stats?.active_employees||0} Active`} />
        <StatsCard title="Monthly Payroll" value={`₹${((stats?.monthly_payroll||0)/100000).toFixed(1)}L`} icon={DollarSign} color="#22c55e" sub="Current month" />
        <StatsCard title="Pending Leaves" value={stats?.pending_leaves||0} icon={Calendar} color="#f59e0b" sub="Awaiting approval" />
        <StatsCard title="Open Grievances" value={stats?.open_grievances||0} icon={AlertTriangle} color="#ef4444" sub="Needs attention" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatsCard title="Onboarding Pending" value={stats?.pending_onboarding||0} icon={UserPlus} color="#8b5cf6" sub="New joiners" />
        <StatsCard title="Pending Transfers" value={stats?.pending_transfers||0} icon={TrendingUp} color="#06b6d4" sub="Awaiting approval" />
        <StatsCard title="Departments" value={deptData.length} icon={Star} color="#f97316" sub="Active departments" />
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="section-title">Employees by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dept" tick={{fontSize:11}} angle={-20} textAnchor="end" height={50}/>
                <YAxis tick={{fontSize:12}} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-16">No data</p>}
        </div>
        <div className="card">
          <h3 className="section-title">Category-wise Distribution</h3>
          <div className="space-y-3 mt-2">
            {catData.map((c,i) => {
              const colors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6'];
              const total = catData.reduce((s,x)=>s+parseInt(x.count),0)||1;
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-16 text-gray-700">{c.category}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div className="h-3 rounded-full" style={{width:`${(parseInt(c.count)/total)*100}%`,background:colors[i%colors.length]}}></div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-6">{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="section-title">Recent Pending Leaves</h3>
          {leaves.length===0 ? <p className="text-gray-400 text-sm text-center py-8">No pending leaves</p> :
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>
              {['Employee','Type','Days','Status'].map(h=><th key={h} style={{padding:'8px',textAlign:'left',fontSize:13,color:'#64748b',borderBottom:'1px solid #e2e8f0'}}>{h}</th>)}
            </tr></thead>
            <tbody>{leaves.map(l=>(
              <tr key={l.id}>
                <td style={{padding:'8px',fontSize:13,borderBottom:'1px solid #f1f5f9'}}>{l.emp_name}</td>
                <td style={{padding:'8px',fontSize:13,borderBottom:'1px solid #f1f5f9'}}>{l.leave_type}</td>
                <td style={{padding:'8px',fontSize:13,borderBottom:'1px solid #f1f5f9'}}>{l.days}</td>
                <td style={{padding:'8px',borderBottom:'1px solid #f1f5f9'}}><Badge text={l.status} /></td>
              </tr>
            ))}</tbody>
          </table>}
        </div>
        <div className="card">
          <h3 className="section-title">Onboarding Pipeline</h3>
          {onboarding.length===0 ? <p className="text-gray-400 text-sm text-center py-8">No active onboarding</p> :
          onboarding.map(o=>(
            <div key={o.id} className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">{o.name}</p>
                <p className="text-xs text-gray-500">{o.post} • {o.dept_name_full||o.dept_name}</p>
              </div>
              <Badge text={o.status} />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
