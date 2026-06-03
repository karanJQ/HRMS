import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import StatsCard from '../components/common/StatsCard';
import Badge from '../components/common/Badge';
import Loader from '../components/common/Loader';
import {
  Users, IndianRupee, Calendar, AlertTriangle, UserPlus, TrendingUp,
  Star, Fingerprint, Gift, Briefcase, Sun, Cake, Bell, Trash2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { reportsAPI, leaveAPI, onboardingAPI, attendanceAPI, empAPI, announcementAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import PunchModal from '../components/PunchModal';

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
  const [probationAlerts, setProbationAlerts] = useState([]);
  const [probationModal, setProbationModal] = useState(null); // { emp_id, action, name }
  const [probationNotes, setProbationNotes] = useState('');
  const [extendDays, setExtendDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [punchLoading, setPunchLoading] = useState(false);
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', type: 'General', content: '', sendMail: false });
  const [annSubmitting, setAnnSubmitting] = useState(false);

  useEffect(() => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    Promise.all([
      reportsAPI.dashboard().catch(() => ({ data: { data: null } })),
      reportsAPI.headcount().catch(() => null),
      leaveAPI.listApplications(user?.role === 'employee' ? {} : { status: 'Pending' }).catch(() => ({ data: { data: [] } })),
      onboardingAPI.list().catch(() => ({ data: { data: [] } })),
      empAPI.birthdays({ month: currentMonth }).catch(() => ({ data: { data: [] } })),
      empAPI.anniversaries({ month: currentMonth }).catch(() => ({ data: { data: [] } })),
      attendanceAPI.getHolidays({ year: currentYear }).catch(() => ({ data: { data: [] } })),
      reportsAPI.probationAlerts().catch(() => ({ data: { data: [] } })),
      announcementAPI.list().catch(() => ({ data: { data: [] } })),
    ]).then(([s, h, l, o, b, a, hol, prob, ann]) => {
      setStats(s?.data?.data || null);
      setHeadcount(h?.data?.data || null);
      setLeaves((l?.data?.data || []).slice(0, 5));
      const activeOnboarding = ((o?.data?.data || [])).filter(cand => cand.status !== 'Completed' && cand.status !== 'Cancelled');
      setOnboarding(activeOnboarding.slice(0, 5));
      setBirthdays(b?.data?.data?.slice(0, 6) || []);
      setAnniversaries(a?.data?.data?.slice(0, 6) || []);
      setHolidays(hol?.data?.data?.slice(0, 6) || []);
      setProbationAlerts(prob?.data?.data || []);
      setAnnouncements(ann?.data?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const hasEmpId = !!user?.emp_id;

  const submitPunch = async (payload) => {
    if (!hasEmpId) return;
    try {
      setPunchLoading(true);
      const response = await attendanceAPI.sync({ emp_id: user.emp_id, ...payload });
      setMsg(response.data?.message || 'Biometric punch synced successfully!');
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.message || e.message));
      setTimeout(() => setMsg(''), 5000);
    } finally {
      setPunchLoading(false);
    }
  };

  const submitProbationAction = async () => {
    if (!probationModal) return;
    try {
      setLoading(true);
      await empAPI.probationAction(probationModal.emp_id, {
        action: probationModal.action,
        days: extendDays,
        notes: probationNotes
      });
      setMsg(`Probation ${probationModal.action}ed successfully.`);
      setProbationModal(null);
      setProbationNotes('');
      // Refresh alerts
      const res = await reportsAPI.probationAlerts();
      setProbationAlerts(res.data?.data || []);
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 5000);
    }
  };

  const submitAnnouncement = async () => {
    if (!annForm.title || !annForm.content) return setMsg('Error: Title and content are required');
    try {
      setAnnSubmitting(true);
      await announcementAPI.create(annForm);
      setMsg('Announcement created successfully!');
      setShowAnnModal(false);
      setAnnForm({ title: '', type: 'General', content: '', sendMail: false });
      const res = await announcementAPI.list();
      setAnnouncements(res.data?.data || []);
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setAnnSubmitting(false);
      setTimeout(() => setMsg(''), 5000);
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await announcementAPI.delete(id);
      setMsg('Announcement deleted.');
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setTimeout(() => setMsg(''), 5000);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatsCard title="Total Employees" value={stats?.total_employees || 0} icon={Users} color="#68aae8" sub={`${stats?.active_employees || 0} Active`} theme="light" delay={0} />
        <StatsCard title="Monthly Payroll" value={`₹${((stats?.monthly_payroll || 0) / 100000).toFixed(1)}L`} icon={IndianRupee} color="#10b981" sub="Current month" theme="light" delay={60} />
        <StatsCard title="Pending Leaves" value={stats?.pending_leaves || 0} icon={Calendar} color="#f59e0b" sub="Awaiting approval" theme="light" delay={120} />
        <StatsCard title="Open Grievances" value={stats?.open_grievances || 0} icon={AlertTriangle} color="#ef4444" sub="Needs attention" theme="light" delay={180} />
        <StatsCard title="This Month" value={`${birthdays.length + anniversaries.length}`} icon={Star} color="#ec4899" sub="Celebrations" theme="light" delay={240} />
      </div>
      {/* Announcements */}
      <div className="mb-6 p-4 rounded-xl transition-all duration-300 animate-slide-up"
        style={{
          background: '#fff', border: '1px solid rgba(22, 38, 96, 0.08)',
          boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-blue-500" />
            <h3 className="text-lg font-semibold" style={{ color: '#162660' }}>Announcements</h3>
          </div>
          {['hr_manager', 'super_admin', 'hr_staff'].includes(user?.role) && (
            <button onClick={() => setShowAnnModal(true)} className="btn btn-primary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all">
              + Add Announcement
            </button>
          )}
        </div>
        {announcements.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">No recent announcements.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.slice(0, 3).map(a => (
              <div key={a.id} className="p-3 rounded-xl border border-slate-100 flex flex-col justify-between" style={{ background: 'rgba(22, 38, 96, 0.02)' }}>
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      a.type === 'Important' ? 'bg-red-100 text-red-600' :
                      a.type === 'Event' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                    }`}>{a.type}</span>
                    {['hr_manager', 'super_admin', 'hr_staff'].includes(user?.role) && (
                      <button onClick={() => deleteAnnouncement(a.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: '#162660' }}>{a.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{a.content}</p>
                </div>
                <div className="mt-3 text-[10px] text-slate-400 flex justify-between">
                  <span>{a.creator_name}</span>
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions + Birthdays + Anniversaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
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
                onClick={() => setShowPunchModal(true)}
                disabled={punchLoading}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
              >
                {punchLoading ? <span>Syncing...</span> : <><Fingerprint size={16} /><span>Punch In/Out</span></>}
              </button>
            ) : (
              <p className="text-xs text-center py-1.5" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>Not available for admin accounts</p>
            )}
          </div>
        </div>

        <PunchModal isOpen={showPunchModal} onClose={() => setShowPunchModal(false)} onPunch={submitPunch} />

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
                    <p className="text-[10px]" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>{b.dept_name}</p>
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
                    <p className="text-[10px]" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>{a.dept_name}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-500">{new Date(a.doj).getDate()} {MONTHS[new Date(a.doj).getMonth()]} • {a.years_completed} {parseInt(a.years_completed) === 1 ? 'Year' : 'Years'} 🎉</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className={`grid ${user?.role !== 'employee' ? 'grid-cols-2' : 'grid-cols-1'} gap-6 mb-6`}>
        {user?.role !== 'employee' && (
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
        )}

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
      {user?.role !== 'employee' && (
        <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col p-6 hover-card animate-slide-up"
          style={{
            background: '#fff', border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Recent Pending Leaves</h3>
          {leaves.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No pending leaves</p> :
            <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px' }}>
              <table>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                    {['Employee', 'Type', 'Days', 'Status'].map(h => (
                      <th key={h} className="whitespace-nowrap px-4 py-3" style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{leaves.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.05)' }}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium" style={{ color: '#162660' }}>{l.emp_name}</td>
                    <td className="whitespace-nowrap px-4 py-3"><span className="px-2 py-1 rounded text-xs font-bold" style={{ background: 'rgba(22, 38, 96, 0.08)', color: '#162660' }}>{l.leave_type}</span></td>
                    <td className="whitespace-nowrap px-4 py-3" style={{ color: '#162660' }}>{l.days}</td>
                    <td className="whitespace-nowrap px-4 py-3"><Badge text={l.status} /></td>
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
      )}

      {/* My Leave Status (Employee) */}
      {user?.role === 'employee' && (
        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="flex flex-col p-6 hover-card animate-slide-up"
            style={{
              background: '#fff', border: '1px solid rgba(22, 38, 96, 0.08)',
              borderRadius: '16px', boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>My Recent Leaves</h3>
            {leaves.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No recent leaves</p> :
              <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px' }}>
                <table>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                      {['Type', 'From', 'To', 'Days', 'Status'].map(h => (
                        <th key={h} className="whitespace-nowrap px-4 py-3" style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{leaves.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.05)' }}>
                      <td className="whitespace-nowrap px-4 py-3"><span className="px-2.5 py-1 rounded-md text-xs font-bold" style={{ background: 'rgba(22, 38, 96, 0.08)', color: '#162660' }}>{l.leave_type}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium" style={{ color: '#162660' }}>{new Date(l.from_date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium" style={{ color: '#162660' }}>{new Date(l.to_date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-center" style={{ color: '#162660' }}>{l.days}</td>
                      <td className="whitespace-nowrap px-4 py-3"><Badge text={l.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>}
          </div>
        </div>
      )}

      {/* Probation Alerts Row */}
      {probationAlerts.length > 0 && (
        <div className="mb-6 flex flex-col p-6 hover-card animate-slide-up"
          style={{
            background: '#fff', border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '16px', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.05)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-red-500" />
            <h3 className="text-lg font-semibold text-red-600">Probation Ending Soon / Overdue</h3>
          </div>
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  <th style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>Employee</th>
                  <th style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>Department</th>
                  <th style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>End Date</th>
                  <th style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>{probationAlerts.map(p => {
                const isOverdue = new Date(p.probation_end_date) < new Date();
                return (
                  <tr key={p.emp_id} style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.05)', background: isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                    <td>
                      <div className="font-semibold text-slate-800">{p.first_name} {p.last_name}</div>
                      <div className="text-xs text-slate-500">{p.emp_id}</div>
                    </td>
                    <td className="text-slate-600">{p.dept_name}</td>
                    <td>
                      <div className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                        {new Date(p.probation_end_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500">{isOverdue ? 'Overdue' : 'Ending soon'}</div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => setProbationModal({ emp_id: p.emp_id, name: p.first_name, action: 'accept' })} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold hover:bg-emerald-200">Accept</button>
                        <button onClick={() => setProbationModal({ emp_id: p.emp_id, name: p.first_name, action: 'extend' })} className="px-3 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold hover:bg-amber-200">Extend</button>
                        <button onClick={() => setProbationModal({ emp_id: p.emp_id, name: p.first_name, action: 'reject' })} className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200">Reject</button>
                      </div>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Probation Action Modal */}
      {probationModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-slate-800 capitalize">{probationModal.action} Probation</h3>
              <button onClick={() => setProbationModal(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-600">You are about to <strong>{probationModal.action}</strong> the probation for <strong>{probationModal.name}</strong>.</p>
              
              {probationModal.action === 'extend' && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Extension Days</label>
                  <input type="number" className="input w-full" value={extendDays} onChange={e => setExtendDays(e.target.value)} />
                </div>
              )}
              
              <div>
                <label className="text-xs text-slate-400 block mb-1">Review Notes / Reason (Required)</label>
                <textarea className="input w-full h-24 resize-none" value={probationNotes} onChange={e => setProbationNotes(e.target.value)} placeholder={`Enter reason for ${probationModal.action}...`} />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t">
              <button onClick={() => setProbationModal(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
              <button 
                onClick={submitProbationAction} 
                disabled={!probationNotes.trim()}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg ${!probationNotes.trim() ? 'bg-slate-400 cursor-not-allowed' : probationModal.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Creation Modal */}
      {showAnnModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-slate-800">Create Announcement</h3>
              <button onClick={() => setShowAnnModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Title</label>
                <input type="text" className="input w-full" value={annForm.title} onChange={e => setAnnForm({ ...annForm, title: e.target.value })} placeholder="e.g., Happy Fun Friday!" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Type</label>
                <select className="input w-full" value={annForm.type} onChange={e => setAnnForm({ ...annForm, type: e.target.value })}>
                  <option value="General">General</option>
                  <option value="Important">Important</option>
                  <option value="Event">Event</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Content</label>
                <textarea className="input w-full h-24 resize-none" value={annForm.content} onChange={e => setAnnForm({ ...annForm, content: e.target.value })} placeholder="Write your announcement..." />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="sendMail" className="w-4 h-4 accent-blue-600" checked={annForm.sendMail} onChange={e => setAnnForm({ ...annForm, sendMail: e.target.checked })} />
                <label htmlFor="sendMail" className="text-sm font-medium text-slate-700 cursor-pointer">Send email to all employees</label>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t">
              <button onClick={() => setShowAnnModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
              <button 
                onClick={submitAnnouncement} 
                disabled={annSubmitting || !annForm.title || !annForm.content}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg ${annSubmitting || !annForm.title || !annForm.content ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {annSubmitting ? 'Posting...' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
