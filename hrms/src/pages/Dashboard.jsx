import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import StatsCard from '../components/common/StatsCard';
import Badge from '../components/common/Badge';
import Loader from '../components/common/Loader';
import {
  Users, IndianRupee, Calendar, AlertTriangle, UserPlus, TrendingUp,
  Star, Fingerprint, Gift, Briefcase, Sun, Cake
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { reportsAPI, leaveAPI, onboardingAPI, attendanceAPI, empAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [headcount, setHeadcount] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [onboarding, setOnboarding] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [anniversaries, setAnniversaries] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [punchLoading, setPunchLoading] = useState(false);

  useEffect(() => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    Promise.all([
      reportsAPI.dashboard().catch(() => ({ data: { data: null } })),
      reportsAPI.headcount().catch(() => null),
      leaveAPI.listApplications({ status: 'Pending' }).catch(() => ({ data: { data: [] } })),
      onboardingAPI.list().catch(() => ({ data: { data: [] } })),
      empAPI.birthdays({ month: currentMonth }).catch(() => ({ data: { data: [] } })),
      empAPI.anniversaries({ month: currentMonth }).catch(() => ({ data: { data: [] } })),
      attendanceAPI.getHolidays({ year: currentYear }).catch(() => ({ data: { data: [] } })),
    ]).then(([s, h, l, o, b, a, hol]) => {
      setStats(s?.data?.data || null);
      setHeadcount(h?.data?.data || null);
      setLeaves((l?.data?.data || []).slice(0, 5));
      const activeOnboarding = ((o?.data?.data || [])).filter(cand => cand.status !== 'Completed' && cand.status !== 'Cancelled');
      setOnboarding(activeOnboarding.slice(0, 5));
      setBirthdays(b?.data?.data?.slice(0, 6) || []);
      setAnniversaries(a?.data?.data?.slice(0, 6) || []);
      setHolidays(hol?.data?.data?.slice(0, 6) || []);
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

  if (loading) return <Layout title="Dashboard" theme="light" bg="#F8F8FF"><Loader /></Layout>;

  const deptData = headcount?.by_dept?.slice(0, 6) || [];
  const catData = headcount?.by_category || [];

  return (
    <Layout title="HRMS Dashboard" theme="light" bg="#F8F8FF">
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')
          ? 'bg-red-50 text-red-800 border border-red-200'
          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          {msg}
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatsCard title="Total Employees" value={stats?.total_employees || 0} icon={Users} color="#68aae8" sub={`${stats?.active_employees || 0} Active`} theme="light" delay={0} />
        <StatsCard title="Monthly Payroll" value={`₹${((stats?.monthly_payroll || 0) / 100000).toFixed(1)}L`} icon={IndianRupee} color="#10b981" sub="Current month" theme="light" delay={60} />
        <StatsCard title="Pending Leaves" value={stats?.pending_leaves || 0} icon={Calendar} color="#f59e0b" sub="Awaiting approval" theme="light" delay={120} />
        <StatsCard title="Open Grievances" value={stats?.open_grievances || 0} icon={AlertTriangle} color="#ef4444" sub="Needs attention" theme="light" delay={180} />
        <StatsCard title="This Month" value={`${birthdays.length + anniversaries.length}`} icon={Star} color="#ec4899" sub="Celebrations" theme="light" delay={240} />
      </div>

      {/* Quick Actions + Birthdays + Anniversaries */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Quick Punch Card */}
        <div className="flex flex-col justify-between p-4 hover-scale transition-all duration-300"
          style={{
            background: '#fff', border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Quick Action</p>
              <h4 className="text-base font-bold mt-1" style={{ color: '#162660' }}>Biometric Attendance</h4>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Fingerprint className="text-emerald-500" size={20} />
            </div>
          </div>
          <div className="mt-3">
            {hasEmpId ? (
              <button
                className="w-full btn btn-success flex items-center justify-center gap-2 py-2 font-bold text-white rounded-lg transition-all"
                onClick={handleQuickPunch}
                disabled={punchLoading}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
              >
                {punchLoading ? <span>Syncing...</span> : <><Fingerprint size={16} /><span>Simulate Punch</span></>}
              </button>
            ) : (
              <p className="text-xs text-center py-1.5" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>Not available for admin accounts</p>
            )}
          </div>
        </div>

        {/* Birthdays Card */}
        <div className="p-4 transition-all duration-300"
          style={{
            background: '#fff', border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Cake size={18} className="text-pink-500" />
            <h4 className="text-sm font-bold" style={{ color: '#162660' }}>Birthdays — {MONTHS[new Date().getMonth()]}</h4>
          </div>
          {birthdays.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>No birthdays this month</p>
          ) : (
            <div className="space-y-2">
              {birthdays.map((b, i) => (
                <div key={b.emp_id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: i % 2 === 0 ? 'rgba(236, 72, 153, 0.04)' : 'transparent' }}>
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xs font-bold">
                    {b.first_name?.[0]}{b.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: '#162660' }}>{b.first_name} {b.last_name}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>{b.dept_name} • {b.designation_name || ''}</p>
                  </div>
                  <span className="text-xs font-bold text-pink-500">{new Date(b.dob).getDate()} {MONTHS[new Date(b.dob).getMonth()]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anniversaries Card */}
        <div className="p-4 transition-all duration-300"
          style={{
            background: '#fff', border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={18} className="text-amber-500" />
            <h4 className="text-sm font-bold" style={{ color: '#162660' }}>Work Anniversaries — {MONTHS[new Date().getMonth()]}</h4>
          </div>
          {anniversaries.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>No anniversaries this month</p>
          ) : (
            <div className="space-y-2">
              {anniversaries.map((a, i) => (
                <div key={a.emp_id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: i % 2 === 0 ? 'rgba(245, 158, 11, 0.04)' : 'transparent' }}>
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-bold">
                    {a.first_name?.[0]}{a.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: '#162660' }}>{a.first_name} {a.last_name}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>{a.dept_name} • {a.designation_name || ''}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-500">{new Date(a.doj).getDate()} {MONTHS[new Date(a.doj).getMonth()]} • {a.years_completed} {parseInt(a.years_completed) === 1 ? 'Year' : 'Years'} 🎉</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col p-6 hover-card animate-slide-up"
          style={{
            background: '#fff', border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Employees by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,38,96,0.06)" vertical={false} />
                <XAxis dataKey="dept" tick={{ fill: 'rgba(22, 38, 96, 0.6)', fontSize: 11 }} axisLine={false} tickLine={false} height={50} />
                <YAxis tick={{ fill: 'rgba(22, 38, 96, 0.6)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(22,38,96,0.1)', borderRadius: '8px', color: '#162660' }} />
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

        {/* Holidays Card */}
        <div className="flex flex-col p-6 hover-card animate-slide-up"
          style={{
            background: '#fff', border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sun size={20} className="text-pink-500" />
            <h3 className="text-lg font-semibold" style={{ color: '#162660' }}>Upcoming Holidays</h3>
          </div>
          {holidays.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No holidays found</p>
          ) : (
            <div className="space-y-2">
              {holidays.map((h, i) => {
                const d = new Date(h.date + 'T00:00:00');
                const today = new Date();
                const isUpcoming = d >= today;
                return (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: isUpcoming ? 'rgba(236, 72, 153, 0.04)' : 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[40px]">
                        <div className="text-lg font-bold" style={{ color: isUpcoming ? '#ec4899' : 'rgba(22,38,96,0.4)' }}>{d.getDate()}</div>
                        <div className="text-[10px] font-medium" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>{d.toLocaleDateString('en-IN', { month: 'short' })}</div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#162660' }}>{h.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>{h.type} • {d.toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                      </div>
                    </div>
                    {isUpcoming && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-100 text-pink-600">Upcoming</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Pending Leaves + Onboarding */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col p-6 hover-card animate-slide-up"
          style={{
            background: '#fff', border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
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
                    <td><span className="px-2 py-1 rounded text-xs font-medium" style={{ background: 'rgba(22, 38, 96, 0.05)', color: '#162660' }}>{l.leave_type}</span></td>
                    <td style={{ color: '#162660' }}>{l.days}</td>
                    <td><Badge text={l.status} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>}
        </div>
        <div className="flex flex-col p-6 hover-card animate-slide-up"
          style={{
            background: '#fff', border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Onboarding Pipeline</h3>
          {onboarding.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No active onboarding</p> :
            <div className="space-y-3">
              {onboarding.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: '#fff', border: '1px solid rgba(22, 38, 96, 0.06)' }}>
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
