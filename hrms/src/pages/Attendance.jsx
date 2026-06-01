import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import {
  Calendar, Plus, Check, X, Fingerprint, Clock, Settings, Home,
  ChevronLeft, ChevronRight, FileText, Activity, Sun, LogIn, LogOut,
  Coffee, MapPin, Smartphone
} from 'lucide-react';
import { leaveAPI, empAPI, attendanceAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  Present:    { bg: 'bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Present',  border: 'border-emerald-200', badge: 'bg-emerald-500', bgHex: '#ecfdf5', textHex: '#047857', borderHex: '#a7f3d0' },
  Absent:     { bg: 'bg-red-50',     dot: 'bg-red-500',     text: 'text-red-700',     label: 'Absent',   border: 'border-red-200',     badge: 'bg-red-500',     bgHex: '#fef2f2', textHex: '#b91c1c', borderHex: '#fecaca' },
  'Half Day': { bg: 'bg-purple-50',  dot: 'bg-purple-500',  text: 'text-purple-700',  label: 'Half Day', border: 'border-purple-200', badge: 'bg-purple-500', bgHex: '#faf5ff', textHex: '#7e22ce', borderHex: '#e9d5ff' },
  WFH:        { bg: 'bg-amber-50',   dot: 'bg-amber-500',   text: 'text-amber-700',   label: 'WFH',      border: 'border-amber-200',   badge: 'bg-amber-500',  bgHex: '#fffbeb', textHex: '#b45309', borderHex: '#fde68a' },
  Leave:      { bg: 'bg-blue-50',    dot: 'bg-blue-500',    text: 'text-blue-700',    label: 'Leave',    border: 'border-blue-200',    badge: 'bg-blue-500',   bgHex: '#eff6ff', textHex: '#1d4ed8', borderHex: '#bfdbfe' },
  Late:       { bg: 'bg-orange-50',  dot: 'bg-orange-500',  text: 'text-orange-700',  label: 'Late',     border: 'border-orange-200',  badge: 'bg-orange-500', bgHex: '#fff7ed', textHex: '#c2410c', borderHex: '#fed7aa' },
  Holiday:    { bg: 'bg-pink-50',    dot: 'bg-pink-500',    text: 'text-pink-700',    label: 'Holiday',  border: 'border-pink-200',    badge: 'bg-pink-500',   bgHex: '#fdf2f8', textHex: '#be185d', borderHex: '#fbcfe8' },
  Weekend:    { bg: 'bg-gray-50',    dot: 'bg-gray-300',    text: 'text-gray-400',    label: 'Weekend',  border: 'border-gray-100',    badge: 'bg-gray-300',   bgHex: '#f9fafb', textHex: '#9ca3af', borderHex: '#f3f4f6' },
  'No Record':{ bg: 'bg-white',      dot: 'bg-gray-200',    text: 'text-gray-300',    label: '—',        border: 'border-gray-50',    badge: 'bg-gray-200',   bgHex: '#ffffff', textHex: '#d1d5db', borderHex: '#f9fafb' },
  Upcoming:   { bg: 'bg-white',      dot: 'bg-transparent', text: 'text-gray-400',    label: '',         border: 'border-transparent', badge: 'bg-transparent', bgHex: '#ffffff', textHex: '#9ca3af', borderHex: 'transparent' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function Attendance() {
  const { isMin, user } = useAuth();
  const [tab, setTab] = useState('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [settings, setSettings] = useState({ shift_start: '09:00:00', shift_end: '18:00:00', grace_period_mins: 30 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const [showWfhForm, setShowWfhForm] = useState(false);
  const [showDateAction, setShowDateAction] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [showBalanceEdit, setShowBalanceEdit] = useState(false);
  const [editBalance, setEditBalance] = useState({ emp_id: '', emp_name: '', year: new Date().getFullYear(), cl_entitled: 0, cl_used: 0, el_entitled: 0, el_used: 0, ml_entitled: 0, ml_used: 0 });
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ emp_id:'', leave_type:'CL', from_date:'', to_date:'', reason:'', half_day_type:'', contact_number:'', leave_address:'' });
  const [regForm, setRegForm] = useState({ date: '', requested_in: '', requested_out: '', reason: '', half_day_type: '', regularization_type: 'full_day' });
  const [wfhForm, setWfhForm] = useState({ date: '', reason: '' });
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '', type: 'Festival' });
  const [showHolidayForm, setShowHolidayForm] = useState(false);

  const daysDiff = (f,t) => f&&t ? Math.max(0, Math.ceil((new Date(t)-new Date(f))/86400000)+1) : 0;

  const showMsg = useCallback((m) => { setMsg(m); setTimeout(() => setMsg(''), 5000); }, []);

  const loadCalendar = useCallback(async (empId) => {
    const eId = empId || (user?.role === 'employee' ? user.emp_id : selectedEmpId);
    if (!eId) return;
    try {
      const [calRes, statsRes] = await Promise.all([
        attendanceAPI.calendar({ month: currentMonth + 1, year: currentYear, emp_id: eId }),
        attendanceAPI.stats({ month: currentMonth + 1, year: currentYear, emp_id: eId }),
      ]);
      if (calRes.data?.success === false) { showMsg('Error loading calendar: ' + (calRes.data?.message || 'Unknown')); return; }
      setCalendarData(calRes.data.data?.calendar || []);
      setMonthlyStats(statsRes.data.data || null);
    } catch (e) {
      showMsg('Error loading calendar: ' + (e.response?.data?.message || e.message));
    }
  }, [currentMonth, currentYear, selectedEmpId, user]);

  const loadAttendanceOnly = useCallback((empId) => {
    const activeEmpId = empId || (user?.role === 'employee' ? user.emp_id : selectedEmpId);
    if (!activeEmpId) { setAttendanceRecords([]); return; }
    attendanceAPI.get({ emp_id: activeEmpId }).then(r => setAttendanceRecords(r.data.data || [])).catch(() => setAttendanceRecords([]));
  }, [selectedEmpId, user]);

  const load = useCallback(async (empId) => {
    setLoading(true);
    const activeEmpId = empId !== undefined ? empId : (user?.role === 'employee' ? user.emp_id : selectedEmpId);
    try {
      const [l, b, a, rReg, wRes, hRes, rSet] = await Promise.all([
        leaveAPI.listApplications().catch(() => ({ data: { data: [] } })),
        leaveAPI.listBalances().catch(() => ({ data: { data: [] } })),
        activeEmpId ? attendanceAPI.get({ emp_id: activeEmpId }).catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
        attendanceAPI.getRegularizations().catch(() => ({ data: { data: [] } })),
        attendanceAPI.getWFH().catch(() => ({ data: { data: [] } })),
        attendanceAPI.getHolidays({ year: currentYear }).catch(() => ({ data: { data: [] } })),
        isMin('hr_staff') ? attendanceAPI.getSettings().catch(() => ({ data: { data: null } })) : Promise.resolve({ data: { data: null } }),
      ]);
      setLeaves(l.data.data||[]); setBalances(b.data.data||[]); setAttendanceRecords(a.data.data||[]);
      setRegularizations(rReg.data.data||[]); setWfhRequests(wRes.data.data||[]); setHolidays(hRes.data.data||[]);
      if (rSet.data.data) setSettings(rSet.data.data);
      if (activeEmpId) await loadCalendar(activeEmpId);
    } finally { setLoading(false); }
  }, [currentYear, isMin, loadCalendar, selectedEmpId, user]);

  useEffect(() => {
    if (tab === 'calendar' && (selectedEmpId || user?.role === 'employee')) loadCalendar();
  }, [currentMonth, currentYear, tab, loadCalendar, selectedEmpId, user]);

  useEffect(() => {
    if (user && user.role !== 'employee') {
      empAPI.list({ limit: 100, status: 'Active' }).then(r => {
        const emps = r.data.data.employees || [];
        setEmployees(emps);
        if (emps.length > 0) { setSelectedEmpId(emps[0].emp_id); load(emps[0].emp_id); }
        else load();
      }).catch(() => load());
    } else load(user?.emp_id);
  }, []);

  const review = async (id, status) => {
    try { await leaveAPI.review(id, { status }); showMsg(`Leave ${status.toLowerCase()}`); load(); }
    catch(e) { showMsg('Error: '+e.response?.data?.message); }
  };
  const reviewRegularization = async (id, status) => {
    try { await attendanceAPI.reviewRegularization(id, { status }); showMsg(`Regularization ${status.toLowerCase()}`); load(); }
    catch(e) { showMsg('Error: '+e.response?.data?.message); }
  };
  const reviewWFH = async (id, status) => {
    try { await attendanceAPI.reviewWFH(id, { status }); showMsg(`WFH ${status.toLowerCase()}`); load(); }
    catch(e) { showMsg('Error: '+e.response?.data?.message); }
  };

  const submitLeave = async () => {
    try {
      const payload = user.role==='employee' ? { ...form, emp_id: user.emp_id } : form;
      await leaveAPI.apply(payload);
      showMsg('Leave application submitted'); setShowForm(false);
      setForm({ emp_id:'', leave_type:'CL', from_date:'', to_date:'', reason:'', half_day_type:'', contact_number:'', leave_address:'' });
      load();
    } catch(e) { showMsg('Error: '+e.response?.data?.message); }
  };
  const submitRegularization = async () => {
    try {
      const payload = user?.role === 'employee' ? regForm : { ...regForm, emp_id: selectedEmpId };
      await attendanceAPI.applyRegularization(payload);
      showMsg('Regularization request submitted'); setShowRegForm(false);
      setRegForm({ date: '', requested_in: '', requested_out: '', reason: '', half_day_type: '', regularization_type: 'full_day' });
      load();
    } catch(e) { showMsg('Error: '+e.response?.data?.message); }
  };
  const submitWFH = async () => {
    try {
      await attendanceAPI.applyWFH(wfhForm);
      showMsg('Work from home request submitted'); setShowWfhForm(false);
      setWfhForm({ date: '', reason: '' }); load();
    } catch(e) { showMsg('Error: '+e.response?.data?.message); }
  };
  const saveSettings = async () => {
    try { await attendanceAPI.updateSettings(settings); showMsg('Settings saved'); load(); }
    catch(e) { showMsg('Error: '+e.response?.data?.message); }
  };
  const syncBiometrics = async () => {
    try {
      setLoading(true);
      const activeEmpId = user?.role === 'employee' ? user.emp_id : selectedEmpId;
      if (!activeEmpId) { showMsg('Select an employee first.'); setLoading(false); return; }
      await attendanceAPI.sync({ emp_id: activeEmpId });
      showMsg('Biometric sync completed'); loadAttendanceOnly(activeEmpId);
    } catch(e) { showMsg('Error: '+e.response?.data?.message); } finally { setLoading(false); }
  };
  const addHoliday = async () => {
    try {
      await attendanceAPI.addHoliday(holidayForm); showMsg('Holiday added'); setShowHolidayForm(false);
      setHolidayForm({ date: '', name: '', type: 'Festival' });
      const hRes = await attendanceAPI.getHolidays({ year: currentYear }); setHolidays(hRes.data.data || []);
    } catch(e) { showMsg('Error: '+e.response?.data?.message); }
  };
  const deleteHoliday = async (id) => {
    try { await attendanceAPI.deleteHoliday(id); showMsg('Holiday deleted'); const hRes = await attendanceAPI.getHolidays({ year: currentYear }); setHolidays(hRes.data.data || []); }
    catch(e) { showMsg('Error: '+e.response?.data?.message); }
  };

  const handleDateClick = (day) => {
    if (!day.date || day.status === 'prev' || day.status === 'next') return;
    setSelectedDate(day.date);
    setSelectedDayData(day);
    setShowDateAction(true);
  };

  const handleDateAction = (action) => {
    setShowDateAction(false);
    const dateStr = selectedDate;
    if (action === 'leave') setForm({ ...form, from_date: dateStr, to_date: dateStr, half_day_type: '' });
    else if (action === 'first_half') setForm({ ...form, from_date: dateStr, to_date: dateStr, half_day_type: 'FIRST_HALF' });
    else if (action === 'second_half') setForm({ ...form, from_date: dateStr, to_date: dateStr, half_day_type: 'SECOND_HALF' });
    else if (action === 'wfh') setWfhForm({ ...wfhForm, date: dateStr });
    else if (action === 'regularize') setRegForm({ ...regForm, date: dateStr });
    if (action !== 'regularize' && action !== 'wfh') setShowForm(true);
    else if (action === 'wfh') setShowWfhForm(true);
    else if (action === 'regularize') setShowRegForm(true);
  };

  const getCalendarGrid = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startDay = firstDay.getDay();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    const today = new Date().toISOString().split('T')[0];

    const days = [];
    for (let i = startDay - 1; i >= 0; i--)
      days.push({ day: prevMonthDays - i, date: null, status: 'prev', data: null, isToday: false });
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      const dayData = calendarData.find(d => {
        const dStr = d.date ? d.date.split('T')[0] : '';
        return dStr === dateStr;
      });
      days.push({ day: i, date: dateStr, status: dayData?.status || 'Upcoming', data: dayData, isToday: dateStr === today });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++)
      days.push({ day: i, date: null, status: 'next', data: null, isToday: false });
    return days;
  };

  const navigateMonth = (delta) => {
    let m = currentMonth + delta, y = currentYear;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setCurrentMonth(m); setCurrentYear(y);
  };

  const formatDate = (d) => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : '';

  const days = getCalendarGrid();
  const statsArr = [
    { label:'Present', value:monthlyStats?.present||0, color:'#10b981', icon:LogIn },
    { label:'Absent', value:monthlyStats?.absent||0, color:'#ef4444', icon:LogOut },
    { label:'Half Day', value:monthlyStats?.half_days||0, color:'#a855f7', icon:Coffee },
    { label:'WFH', value:monthlyStats?.wfh||0, color:'#f59e0b', icon:Home },
    { label:'Leave', value:monthlyStats?.leave_days||0, color:'#3b82f6', icon:Calendar },
    { label:'Late', value:monthlyStats?.late||0, color:'#f97316', icon:Clock },
  ];

  return (
    <Layout title="Attendance & Leave Management" theme="light" bg="#F8F8FF">
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm mb-4 border transition-all duration-300 ${
          msg.startsWith('Error') ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>{msg}</div>
      )}

      <div className="flex flex-wrap gap-2 mb-5 pb-3 items-center" style={{ borderBottom:'1px solid rgba(22,38,96,0.08)' }}>
        {[
          { id:'calendar', label:'Calendar', icon:Calendar },
          { id:'applications', label:'Leave Applications', icon:FileText },
          { id:'balance', label:'Leave Balance', icon:Clock },
          { id:'wfh', label:'WFH', icon:Home },
          { id:'regularize', label:'Regularization', icon:Activity },
          { id:'biometrics', label:'Daily Log', icon:Fingerprint },
          ...(isMin('hr_staff') ? [{ id:'holidays', label:'Holidays', icon:Sun }] : []),
          ...(isMin('hr_staff') ? [{ id:'settings', label:'Settings', icon:Settings }] : []),
        ].map(t => (
          <button key={t.id}
            className="flex items-center gap-1.5 font-semibold transition-all duration-200 whitespace-nowrap"
            style={{
              padding:'7px 16px', borderRadius:'20px', fontSize:'12px',
              background: tab===t.id ? '#162660' : 'transparent',
              color: tab===t.id ? '#FEFEFA' : 'rgba(22,38,96,0.6)',
              boxShadow: tab===t.id ? '0 4px 12px rgba(22,38,96,0.15)' : 'none',
              border: tab===t.id ? '1px solid #162660' : '1px solid transparent',
            }}
            onClick={()=>setTab(t.id)}>
            <t.icon size={13}/>{t.label}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : tab === 'calendar' ? (
        <div className="animate-fadeIn">
          {/* Month Navigation Header */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {user?.role !== 'employee' && (
              <select className="text-xs rounded-lg px-3 py-2 outline-none font-semibold"
                style={{ border:'1px solid rgba(22,38,96,0.15)', background:'#fff', color:'#162660' }}
                value={selectedEmpId} onChange={e=>{ setSelectedEmpId(e.target.value); load(e.target.value); }}>
                <option value="">All Employees</option>
                {employees.map(e => (
                  <option key={e.emp_id} value={e.emp_id}>{e.first_name} {e.last_name}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1 ml-auto bg-white rounded-xl shadow-sm border" style={{ border:'1px solid rgba(22,38,96,0.08)' }}>
              <button className="p-2.5 rounded-l-xl hover:bg-gray-50 transition-all" onClick={()=>navigateMonth(-1)}>
                <ChevronLeft size={18} style={{ color:'#162660' }}/>
              </button>
              <div className="px-5 py-2 min-w-[200px] text-center border-x" style={{ borderColor:'rgba(22,38,96,0.08)' }}>
                <span className="font-bold text-base" style={{ color:'#162660' }}>{MONTHS[currentMonth]}</span>
                <span className="font-semibold text-sm ml-2" style={{ color:'rgba(22,38,96,0.5)' }}>{currentYear}</span>
              </div>
              <button className="p-2.5 rounded-r-xl hover:bg-gray-50 transition-all" onClick={()=>navigateMonth(1)}>
                <ChevronRight size={18} style={{ color:'#162660' }}/>
              </button>
            </div>
            <button className="text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:shadow-md"
              style={{ background:'rgba(22,38,96,0.06)', color:'#162660' }}
              onClick={()=>{ setCurrentMonth(new Date().getMonth()); setCurrentYear(new Date().getFullYear()); }}>
              Today
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-6 gap-3 mb-5">
            {statsArr.map((s,i) => (
              <div key={s.label}
                className="relative overflow-hidden p-3 rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                style={{
                  background:'#fff', border:'1px solid rgba(22,38,96,0.06)',
                  boxShadow:'0 2px 8px rgba(22,38,96,0.04)'
                }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg" style={{ background:`${s.color}15` }}>
                    <s.icon size={13} style={{ color:s.color }}/>
                  </div>
                  <span className="text-[11px] font-medium" style={{ color:'rgba(22,38,96,0.5)' }}>{s.label}</span>
                </div>
                <div className="text-2xl font-bold ml-1" style={{ color:s.color }}>{s.value}</div>
                <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full opacity-[0.04]" style={{ background:s.color }}/>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.08)' }}>
            {/* Day headers */}
            <div className="grid grid-cols-7">
              {DAYS.map(d => (
                <div key={d} className="py-3 text-center text-xs font-bold uppercase tracking-wider"
                  style={{ color:'rgba(22,38,96,0.4)', background:'rgba(22,38,96,0.02)', borderBottom:'1px solid rgba(22,38,96,0.06)' }}>
                  {d}
                </div>
              ))}
              {/* Day cells */}
              {days.map((day, idx) => {
                const st = day.data?.status || day.status;
                const style = STATUS_STYLES[st] || STATUS_STYLES.Upcoming;
                const isPrevNext = day.status === 'prev' || day.status === 'next';
                const hasData = day.date && day.data?.status && st !== 'Upcoming' && !isPrevNext;

                return (
                  <div
                    key={idx}
                    onClick={() => handleDateClick(day)}
                    className={`relative min-h-[90px] p-2.5 border-b border-r transition-all duration-150 cursor-pointer group
                      ${hasData ? 'hover:shadow-inner hover:z-10' : ''}
                      ${day.isToday ? 'ring-2 ring-inset' : ''}`}
                    style={{
                      borderColor: 'rgba(22,38,96,0.05)',
                      background: hasData ? style.bgHex : (isPrevNext ? '#fafafa' : '#fff'),
                      opacity: isPrevNext ? 0.3 : 1,
                      ringColor: day.isToday ? '#162660' : 'transparent',
                    }}
                  >
                    {/* Date number */}
                    <div className={`text-sm font-semibold mb-1.5 ${day.isToday ? 'text-white' : style.text}`}>
                      {day.isToday ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#162660] text-white text-xs font-bold shadow-sm">
                          {day.day}
                        </span>
                      ) : (
                        <span className="text-xs">{day.day}</span>
                      )}
                    </div>

                    {/* Status indicator */}
                    {hasData && (
                      <div className="flex flex-col gap-0.5">
                        {/* Status label */}
                        <span className={`text-[10px] font-semibold mt-0.5 ${style.text}`}>
                          {st === 'Half Day' ? '½ Day' : st === 'Present' ? '' : st === 'Leave' ? day.data?.leave_type||'Leave' : st}
                        </span>

                        {/* Punch times */}
                        {day.data?.punch_in && (
                          <span className="text-[9px]" style={{ color:'rgba(22,38,96,0.4)' }}>
                            {day.data.punch_in.slice(0,5)}
                            {day.data.punch_out ? `-${day.data.punch_out.slice(0,5)}` : ''}
                          </span>
                        )}

                        {/* Holiday name */}
                        {day.data?.holiday_name && (
                          <span className="text-[9px] font-medium truncate" style={{ color:'rgba(236,72,153,0.7)' }}>
                            {day.data.holiday_name}
                          </span>
                        )}

                        {/* WFH indicator */}
                        {st === 'WFH' && (
                          <span className="text-[9px]">🏠 WFH</span>
                        )}

                        {/* Half day type */}
                        {day.data?.half_day_type && (
                          <span className="text-[9px] font-medium text-purple-600">
                            {day.data.half_day_type === 'FIRST_HALF' ? '1st Half' : '2nd Half'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Hover effect */}
                    {hasData && (
                      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                        style={{ boxShadow:'inset 0 0 0 2px rgba(22,38,96,0.08)' }}/>
                    )}

                    {/* Weekend/Holiday subtle indicator */}
                    {(st === 'Weekend' || st === 'Holiday') && !isPrevNext && (
                      <div className="absolute bottom-1.5 right-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 p-4 rounded-xl bg-white border" style={{ borderColor:'rgba(22,38,96,0.06)' }}>
            {[
              { label:'Present', color:'#10b981' }, { label:'Absent', color:'#ef4444' },
              { label:'Half Day', color:'#a855f7' }, { label:'WFH', color:'#f59e0b' },
              { label:'Leave', color:'#3b82f6' }, { label:'Late', color:'#f97316' },
              { label:'Holiday', color:'#ec4899' }, { label:'Weekend', color:'#d1d5db' },
            ].map(({label,color}) => (
              <div key={label} className="flex items-center gap-1.5 text-xs font-medium" style={{ color:'rgba(22,38,96,0.6)' }}>
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor:color }}/>
                {label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs font-medium ml-auto" style={{ color:'rgba(22,38,96,0.4)' }}>
              <div className="w-7 h-7 rounded-full bg-[#162660] flex items-center justify-center text-white text-[9px] font-bold">•</div>
              Today
            </div>
          </div>

          {/* Date Action Modal */}
          {showDateAction && selectedDate && (
            <Modal title={formatDate(selectedDate)} onClose={()=>setShowDateAction(false)} theme="light">
              {selectedDayData && selectedDayData.status && (() => {
                const st = STATUS_STYLES[selectedDayData.status] || STATUS_STYLES.Upcoming;
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                const dd = selectedDayData.data || {};
                return (
                <>
                  <div className="mb-4 p-4 rounded-xl" style={{ background: st.bgHex, border: `1px solid ${st.borderHex}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-base" style={{ color: st.textHex }}>{st.label || dd.status}</span>
                      <span className="text-xs" style={{ color:'rgba(22,38,96,0.4)' }}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dd.dayOfWeek]}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-white/60 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:'rgba(22,38,96,0.35)' }}>In</div>
                        <div className="font-bold text-sm" style={{ color: dd.punch_in ? '#162660' : 'rgba(22,38,96,0.25)' }}>{dd.punch_in ? dd.punch_in.slice(0,5) : 'Not punched'}</div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:'rgba(22,38,96,0.35)' }}>Out</div>
                        <div className="font-bold text-sm" style={{ color: dd.punch_out ? '#162660' : 'rgba(22,38,96,0.25)' }}>{dd.punch_out ? dd.punch_out.slice(0,5) : 'Not punched'}</div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:'rgba(22,38,96,0.35)' }}>Hours</div>
                        <div className="font-bold text-sm" style={{ color:'#162660' }}>{dd.working_hours || '0'}h</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span style={{ color:'rgba(22,38,96,0.5)' }}>
                        Leave: <strong style={{ color:'#162660' }}>{dd.leave_type || (dd.status === 'Leave' ? 'Applied' : '—')}</strong>
                      </span>
                      <span style={{ color:'rgba(22,38,96,0.5)' }}>
                        WFH: <strong style={{ color:'#162660' }}>
                          {dd.wfh_status === 'Approved' ? 'Approved' : dd.wfh_status === 'Pending' ? 'Pending' : '—'}
                        </strong>
                      </span>
                      <span style={{ color:'rgba(22,38,96,0.5)' }}>
                        Holiday: <strong style={{ color:'#162660' }}>{dd.is_holiday && dd.holiday_name ? dd.holiday_name : '—'}</strong>
                      </span>
                      <span style={{ color:'rgba(22,38,96,0.5)' }}>
                        Regularized: <strong style={{ color: dd.is_regularized ? '#059669' : 'rgba(22,38,96,0.3)' }}>{dd.is_regularized ? 'Yes' : 'No'}</strong>
                      </span>
                      {dd.half_day_type && (
                        <span style={{ color:'rgba(22,38,96,0.5)' }}>
                          Half: <strong style={{ color:'#7e22ce' }}>{dd.half_day_type === 'FIRST_HALF' ? 'First Half' : 'Second Half'}</strong>
                        </span>
                      )}
                      {dd.biometric_sync && (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <Fingerprint size={12}/> Biometric verified
                        </span>
                      )}
                    </div>
                    {(dd.photo_url || dd.location) && (
                      <div className="mt-3 flex items-center gap-3">
                        {dd.photo_url && (
                          <a href={`http://localhost:5000${dd.photo_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Smartphone size={14}/> View Photo
                          </a>
                        )}
                        {dd.location && (() => {
                          const loc = typeof dd.location === 'string' ? JSON.parse(dd.location) : dd.location;
                          return loc?.lat ? (
                            <a href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                              <MapPin size={14}/> View Map
                            </a>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-semibold mb-3" style={{ color:'rgba(22,38,96,0.5)' }}>QUICK ACTIONS</p>
                  <div className="space-y-2.5">
                    <button className="w-full text-sm font-semibold p-3.5 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
                      style={{ background:'linear-gradient(135deg,#162660,#1e3a8a)', color:'#fff' }}
                      onClick={()=>handleDateAction('leave')}>Apply Full Day Leave</button>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      <button className="text-sm font-semibold p-3 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
                        style={{ background:'linear-gradient(135deg,#a855f7,#7c3aed)', color:'#fff' }}
                        onClick={()=>handleDateAction('first_half')}>First Half Leave</button>
                      <button className="text-sm font-semibold p-3 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
                        style={{ background:'linear-gradient(135deg,#a855f7,#7c3aed)', color:'#fff' }}
                        onClick={()=>handleDateAction('second_half')}>Second Half Leave</button>
                    </div>

                    <button className="w-full text-sm font-semibold p-3.5 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
                      style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff' }}
                      onClick={()=>handleDateAction('wfh')}><Home size={15} className="inline mr-1.5"/>Apply Work From Home</button>

                    {selectedDate <= todayStr && (
                      <button className="w-full text-sm font-semibold p-3.5 rounded-xl transition-all hover:shadow-md"
                        style={{ background:'rgba(22,38,96,0.04)', color:'#162660', border:'1px solid rgba(22,38,96,0.12)' }}
                        onClick={()=>handleDateAction('regularize')}>Request Regularization</button>
                    )}
                  </div>
                </>
              )})()}
            </Modal>
          )}
        </div>

      ) : tab === 'applications' ? (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <div className="grid grid-cols-4 gap-4 flex-1">
              {[
                { title:'Total', value:leaves.length, color:'#818cf8' },
                { title:'Pending', value:leaves.filter(l=>l.status==='Pending').length, color:'#fbbf24' },
                { title:'Approved', value:leaves.filter(l=>l.status==='Approved').length, color:'#34d399' },
                { title:'Rejected', value:leaves.filter(l=>l.status==='Rejected').length, color:'#f87171' },
              ].map((c,i) => (
                <div key={c.title} className="p-4 rounded-xl" style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.08)' }}>
                  <div className="text-2xl font-bold" style={{ color:c.color }}>{c.value}</div>
                  <div className="text-xs mt-1 font-medium" style={{ color:'rgba(22,38,96,0.5)' }}>{c.title}</div>
                </div>
              ))}
            </div>
            <button className="font-semibold px-5 py-2.5 rounded-xl ml-4 transition-all hover:shadow-lg"
              style={{ background:'#162660', color:'#FEFEFA', whiteSpace:'nowrap' }}
              onClick={()=>setShowForm(true)}><Plus size={16} className="inline mr-1"/>Apply Leave</button>
          </div>
          <div className="rounded-xl overflow-hidden bg-white border" style={{ borderColor:'rgba(22,38,96,0.1)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background:'rgba(22,38,96,0.03)', borderBottom:'1px solid rgba(22,38,96,0.08)' }}>
                    {['Employee','Dept','Type','Half Day','From','To','Days','Reason','Status','Action'].map(h => (
                      <th key={h} className="p-3 text-left text-xs font-semibold" style={{ color:'rgba(22,38,96,0.6)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{leaves.map((l,i)=>(
                  <tr key={l.id} className="hover:bg-gray-50/50 transition-colors" style={{ borderBottom:'1px solid rgba(22,38,96,0.04)' }}>
                    <td className="p-3"><div className="font-medium text-sm" style={{ color:'#162660' }}>{l.emp_name}</div><div className="text-[11px]" style={{ color:'rgba(22,38,96,0.4)' }}>{l.emp_id}</div></td>
                    <td className="p-3 text-xs" style={{ color:'rgba(22,38,96,0.5)' }}>{l.dept_name}</td>
                    <td className="p-3"><span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background:'rgba(79,70,229,0.08)', color:'#4f46e5' }}>{l.leave_type}</span></td>
                    <td className="p-3 text-xs">{l.half_day_type ? <span className="text-purple-600 font-semibold">{l.half_day_type==='FIRST_HALF'?'1st Half':'2nd Half'}</span> : '—'}</td>
                    <td className="p-3 text-sm" style={{ color:'#162660' }}>{l.from_date?.split('T')[0]}</td>
                    <td className="p-3 text-sm" style={{ color:'#162660' }}>{l.to_date?.split('T')[0]}</td>
                    <td className="p-3 font-semibold text-sm" style={{ color:'#162660' }}>{l.days}</td>
                    <td className="p-3 text-xs max-w-[150px] truncate" style={{ color:'rgba(22,38,96,0.5)' }}>{l.reason}</td>
                    <td className="p-3"><Badge text={l.status}/></td>
                    <td className="p-3">{l.status==='Pending' && isMin('hr_staff') && (
                      <div className="flex gap-1.5">
                        <button className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all" onClick={()=>review(l.id,'Approved')}><Check size={14}/></button>
                        <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all" onClick={()=>review(l.id,'Rejected')}><X size={14}/></button>
                      </div>
                    )}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      ) : tab === 'balance' ? (
        <div className="animate-fadeIn rounded-xl bg-white p-6 border" style={{ borderColor:'rgba(22,38,96,0.1)' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color:'#162660' }}>Leave Balance — {new Date().getFullYear()}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(22,38,96,0.08)', background:'rgba(22,38,96,0.02)' }}>
                  {['Employee','CL','EL','ML','Used CL','Used EL','Used ML','CL Left','EL Left','ML Left', ...(isMin('hr_staff') ? ['Action'] : [])].map(h => (
                    <th key={h} className="p-3 text-left text-xs font-semibold" style={{ color:'rgba(22,38,96,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{balances.map((b,i)=>(
                <tr key={b.id} className="hover:bg-gray-50/50" style={{ borderBottom:'1px solid rgba(22,38,96,0.04)' }}>
                  <td className="p-3"><div className="font-medium text-sm" style={{ color:'#162660' }}>{b.emp_name}</div></td>
                  <td className="p-3 font-semibold text-emerald-600">{b.cl_entitled}</td>
                  <td className="p-3 font-semibold text-blue-600">{b.el_entitled}</td>
                  <td className="p-3 font-semibold text-purple-600">{b.ml_entitled}</td>
                  <td className="p-3 text-red-500 font-medium">{b.cl_used}</td>
                  <td className="p-3 text-red-500 font-medium">{b.el_used}</td>
                  <td className="p-3 text-red-500 font-medium">{b.ml_used}</td>
                  <td className="p-3 font-bold" style={{ color:(b.cl_entitled-b.cl_used)>0?'#065f46':'#991b1b' }}>{b.cl_entitled-b.cl_used}</td>
                  <td className="p-3 font-bold" style={{ color:(b.el_entitled-b.el_used)>0?'#065f46':'#991b1b' }}>{b.el_entitled-b.el_used}</td>
                  <td className="p-3 font-bold" style={{ color:(b.ml_entitled-b.ml_used)>0?'#065f46':'#991b1b' }}>{b.ml_entitled-b.ml_used}</td>
                  {isMin('hr_staff') && <td className="p-3">
                    <button className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={{ background:'rgba(22,38,96,0.06)', color:'#162660' }}
                      onClick={() => { setEditBalance({...b}); setShowBalanceEdit(true); }}
                    >Edit</button>
                  </td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : tab === 'wfh' ? (
        <div className="animate-fadeIn rounded-xl bg-white p-6 border" style={{ borderColor:'rgba(22,38,96,0.1)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold" style={{ color:'#162660' }}>Work From Home</h3>
            <button className="font-semibold px-5 py-2.5 rounded-xl transition-all"
              style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff' }}
              onClick={()=>setShowWfhForm(true)}><Plus size={16} className="inline mr-1"/>Request WFH</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(22,38,96,0.08)', background:'rgba(22,38,96,0.02)' }}>
                  {user?.role!=='employee' && <th className="p-3 text-left text-xs font-semibold" style={{ color:'rgba(22,38,96,0.5)' }}>Employee</th>}
                  {['Date','Reason','Status','Action'].map(h => (
                    <th key={h} className="p-3 text-left text-xs font-semibold" style={{ color:'rgba(22,38,96,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{wfhRequests.length===0 ? (
                <tr><td colSpan={user?.role!=='employee'?5:4} className="p-8 text-center text-sm" style={{ color:'rgba(22,38,96,0.3)' }}>No WFH requests</td></tr>
              ) : wfhRequests.map((w,i)=>(
                <tr key={w.id} className="hover:bg-gray-50/50" style={{ borderBottom:'1px solid rgba(22,38,96,0.04)' }}>
                  {user?.role!=='employee' && <td className="p-3"><span className="font-medium text-sm" style={{ color:'#162660' }}>{w.first_name} {w.last_name}</span></td>}
                  <td className="p-3 text-sm" style={{ color:'#162660' }}>{new Date(w.date).toLocaleDateString()}</td>
                  <td className="p-3 text-xs max-w-[200px] truncate" style={{ color:'rgba(22,38,96,0.5)' }}>{w.reason}</td>
                  <td className="p-3"><Badge text={w.status}/></td>
                  <td className="p-3">{w.status==='Pending' && isMin('hr_staff') && (
                    <div className="flex gap-1.5">
                      <button className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" onClick={()=>reviewWFH(w.id,'Approved')}><Check size={14}/></button>
                      <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" onClick={()=>reviewWFH(w.id,'Rejected')}><X size={14}/></button>
                    </div>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : tab === 'regularize' ? (
        <div className="animate-fadeIn rounded-xl bg-white p-6 border" style={{ borderColor:'rgba(22,38,96,0.1)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold" style={{ color:'#162660' }}>Regularizations</h3>
            <button className="font-semibold px-5 py-2.5 rounded-xl transition-all"
              style={{ background:'#fff', color:'#162660', border:'1px solid rgba(22,38,96,0.15)' }}
              onClick={()=>setShowRegForm(true)}><Plus size={16} className="inline mr-1"/>Request Regularization</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(22,38,96,0.08)', background:'rgba(22,38,96,0.02)' }}>
                  {user?.role!=='employee' && <th className="p-3 text-left text-xs font-semibold" style={{ color:'rgba(22,38,96,0.5)' }}>Employee</th>}
                  {['Date','Type','In','Out','Reason','Status','Action'].map(h => (
                    <th key={h} className="p-3 text-left text-xs font-semibold" style={{ color:'rgba(22,38,96,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{regularizations.length===0 ? (
                <tr><td colSpan={user?.role!=='employee'?8:7} className="p-8 text-center text-sm" style={{ color:'rgba(22,38,96,0.3)' }}>No regularization requests</td></tr>
              ) : regularizations.map((r,i)=>(
                <tr key={r.id} className="hover:bg-gray-50/50" style={{ borderBottom:'1px solid rgba(22,38,96,0.04)' }}>
                  {user?.role!=='employee' && <td className="p-3"><span className="font-medium text-sm" style={{ color:'#162660' }}>{r.first_name} {r.last_name}</span></td>}
                  <td className="p-3 text-sm" style={{ color:'#162660' }}>{new Date(r.date).toLocaleDateString()}</td>
                  <td className="p-3 text-xs">{r.regularization_type==='half_day' ? 'Half Day' : 'Full Day'}{r.half_day_type ? ` (${r.half_day_type==='FIRST_HALF'?'1st':'2nd'})` : ''}</td>
                  <td className="p-3 text-sm" style={{ color:'#162660' }}>{r.requested_in?.slice(0,5)||'--:--'}</td>
                  <td className="p-3 text-sm" style={{ color:'#162660' }}>{r.requested_out?.slice(0,5)||'--:--'}</td>
                  <td className="p-3 text-xs max-w-[150px] truncate" style={{ color:'rgba(22,38,96,0.5)' }}>{r.reason}</td>
                  <td className="p-3"><Badge text={r.status}/></td>
                  <td className="p-3">{r.status==='Pending' && isMin('hr_staff') && (
                    <div className="flex gap-1.5">
                      <button className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" onClick={()=>reviewRegularization(r.id,'Approved')}><Check size={14}/></button>
                      <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" onClick={()=>reviewRegularization(r.id,'Rejected')}><X size={14}/></button>
                    </div>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : tab === 'biometrics' ? (
        <div className="animate-fadeIn rounded-xl bg-white p-6 border" style={{ borderColor:'rgba(22,38,96,0.1)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold" style={{ color:'#162660' }}>Daily Log</h3>
              {user?.role!=='employee' && (
                <select className="text-xs rounded-lg px-3 py-2 outline-none font-semibold ml-3"
                  style={{ border:'1px solid rgba(22,38,96,0.15)', background:'#fff', color:'#162660' }}
                  value={selectedEmpId} onChange={e=>{ setSelectedEmpId(e.target.value); loadAttendanceOnly(e.target.value); }}>
                  <option value="">Select Employee</option>
                  {employees.map(e => (<option key={e.emp_id} value={e.emp_id}>{e.first_name} {e.last_name}</option>))}
                </select>
              )}
            </div>
            <button className="font-semibold px-5 py-2.5 rounded-xl text-white transition-all"
              style={{ background:'linear-gradient(135deg,#10b981,#059669)' }}
              onClick={syncBiometrics} disabled={user?.role!=='employee' && !selectedEmpId}>
              <Fingerprint size={15} className="inline mr-1.5"/>Simulate Punch
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(22,38,96,0.08)', background:'rgba(22,38,96,0.02)' }}>
                  {['Date','In','Out','Hours','Status','Regularized','Biometric'].map(h => (
                    <th key={h} className="p-3 text-left text-xs font-semibold" style={{ color:'rgba(22,38,96,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{attendanceRecords.length===0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-sm" style={{ color:'rgba(22,38,96,0.3)' }}>No records</td></tr>
              ) : attendanceRecords.map((a,i)=>(
                <tr key={a.id} className="hover:bg-gray-50/50" style={{ borderBottom:'1px solid rgba(22,38,96,0.04)' }}>
                  <td className="p-3 text-sm" style={{ color:'#162660' }}>{new Date(a.date).toLocaleDateString()}</td>
                  <td className="p-3 text-sm" style={{ color:'#162660' }}>{a.punch_in?.slice(0,5)||'--:--'}</td>
                  <td className="p-3 text-sm" style={{ color:'#162660' }}>{a.punch_out?.slice(0,5)||'--:--'}</td>
                  <td className="p-3 text-sm" style={{ color:'#162660' }}>{a.working_hours ? `${a.working_hours}h` : '—'}</td>
                  <td className="p-3"><Badge text={a.status}/></td>
                  <td className="p-3">{a.is_regularized ? <Check size={15} className="text-emerald-500"/> : <X size={15} className="text-red-300"/>}</td>
                  <td className="p-3">{a.biometric_sync ? <Smartphone size={15} className="text-emerald-500"/> : <X size={15} className="text-red-300"/>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : tab === 'holidays' ? (
        <div className="animate-fadeIn rounded-xl bg-white p-6 border" style={{ borderColor:'rgba(22,38,96,0.1)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold" style={{ color:'#162660' }}>Holidays — {currentYear}</h3>
            <button className="font-semibold px-5 py-2.5 rounded-xl transition-all"
              style={{ background:'#162660', color:'#FEFEFA' }}
              onClick={()=>setShowHolidayForm(true)}><Plus size={16} className="inline mr-1"/>Add Holiday</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(22,38,96,0.08)', background:'rgba(22,38,96,0.02)' }}>
                  {['Date','Day','Name','Type','Action'].map(h => (
                    <th key={h} className="p-3 text-left text-xs font-semibold" style={{ color:'rgba(22,38,96,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{holidays.length===0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-sm" style={{ color:'rgba(22,38,96,0.3)' }}>No holidays</td></tr>
              ) : holidays.map((h,i)=>{
                const d = new Date(h.date+'T00:00:00');
                return (
                  <tr key={h.id} className="hover:bg-gray-50/50" style={{ borderBottom:'1px solid rgba(22,38,96,0.04)' }}>
                    <td className="p-3 text-sm font-medium" style={{ color:'#162660' }}>{d.toLocaleDateString('en-IN')}</td>
                    <td className="p-3 text-xs" style={{ color:'rgba(22,38,96,0.5)' }}>{d.toLocaleDateString('en-IN',{weekday:'long'})}</td>
                    <td className="p-3 text-sm font-semibold" style={{ color:'#162660' }}>{h.name}</td>
                    <td className="p-3"><span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background:'rgba(236,72,153,0.08)', color:'#ec4899' }}>{h.type}</span></td>
                    <td className="p-3"><button className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all" onClick={()=>deleteHoliday(h.id)}><X size={14}/></button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="animate-fadeIn max-w-xl mx-auto rounded-xl bg-white p-8 border" style={{ borderColor:'rgba(22,38,96,0.1)' }}>
          <div className="flex items-center gap-2.5 mb-6">
            <Settings size={22} style={{ color:'#4F46E5' }}/>
            <h3 className="text-lg font-bold" style={{ color:'#162660' }}>Attendance Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color:'rgba(22,38,96,0.5)' }}>Shift Start</label>
                <input type="time" step="1" className="input w-full" value={settings.shift_start}
                  onChange={e=>setSettings({...settings,shift_start:e.target.value})}
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color:'rgba(22,38,96,0.5)' }}>Shift End</label>
                <input type="time" step="1" className="input w-full" value={settings.shift_end}
                  onChange={e=>setSettings({...settings,shift_end:e.target.value})}
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color:'rgba(22,38,96,0.5)' }}>Grace Period (min)</label>
                <input type="number" className="input w-full" value={settings.grace_period_mins}
                  onChange={e=>setSettings({...settings,grace_period_mins:parseInt(e.target.value)||0})}
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color:'rgba(22,38,96,0.5)' }}>Working Days</label>
                <select className="input w-full" value={settings.working_days}
                  onChange={e=>setSettings({...settings,working_days:e.target.value})}
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}>
                  {['Monday-Friday','Monday-Saturday','Sunday-Thursday','All Days'].map(d => (<option key={d} value={d}>{d}</option>))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color:'rgba(22,38,96,0.5)' }}>Half Day Cutoff</label>
                <input type="time" className="input w-full" value={settings.half_day_cutoff}
                  onChange={e=>setSettings({...settings,half_day_cutoff:e.target.value})}
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color:'rgba(22,38,96,0.5)' }}>Auto Absent (min)</label>
                <input type="number" className="input w-full" value={settings.auto_absent_minutes}
                  onChange={e=>setSettings({...settings,auto_absent_minutes:parseInt(e.target.value)||0})}
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={settings.enable_overtime}
                onChange={e=>setSettings({...settings,enable_overtime:e.target.checked})}
                style={{ accentColor:'#162660', width:'16px', height:'16px' }}/>
              <span className="text-sm font-medium" style={{ color:'rgba(22,38,96,0.7)' }}>Enable Overtime Tracking</span>
            </label>
            {settings.enable_overtime && (
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl" style={{ background:'rgba(22,38,96,0.03)' }}>
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Weekday</label>
                  <input type="number" step="0.1" className="input w-full" value={settings.ot_rate_weekday}
                    onChange={e=>setSettings({...settings,ot_rate_weekday:parseFloat(e.target.value)||1.5})}
                    style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'8px', padding:'8px 10px' }}/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Weekend</label>
                  <input type="number" step="0.1" className="input w-full" value={settings.ot_rate_weekend}
                    onChange={e=>setSettings({...settings,ot_rate_weekend:parseFloat(e.target.value)||2.0})}
                    style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'8px', padding:'8px 10px' }}/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Holiday</label>
                  <input type="number" step="0.1" className="input w-full" value={settings.ot_rate_holiday}
                    onChange={e=>setSettings({...settings,ot_rate_holiday:parseFloat(e.target.value)||2.5})}
                    style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'8px', padding:'8px 10px' }}/>
                </div>
              </div>
            )}
            <button className="w-full font-semibold py-3 rounded-xl transition-all hover:shadow-lg mt-4"
              style={{ background:'#162660', color:'#FEFEFA' }}
              onClick={saveSettings}>Save Settings</button>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {showForm && (
        <Modal title={form.half_day_type ? `Apply ${form.half_day_type==='FIRST_HALF'?'First Half':'Second Half'} Leave` : 'Apply Leave'} onClose={()=>setShowForm(false)} theme="light">
          <div className="grid grid-cols-2 gap-3">
            {user.role!=='employee' && (
              <div className="col-span-2">
                <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Employee</label>
                <input className="input w-full" list="employee-ids" value={form.emp_id} onChange={e=>setForm({...form,emp_id:e.target.value})} placeholder="EMP00001"
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
                <datalist id="employee-ids">{employees.map(e => (<option key={e.emp_id} value={e.emp_id}/>))}</datalist>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Type</label>
              <select className="input w-full" value={form.leave_type} onChange={e=>setForm({...form,leave_type:e.target.value})}
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}>
                {['CL','EL','ML','Maternity','Paternity','CCL','Study Leave','LWP','Compensatory','WFH','Outdoor Duty'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Days: {form.half_day_type ? '0.5' : daysDiff(form.from_date,form.to_date)||'—'}</label>
              {form.half_day_type && (
                <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700">
                  {form.half_day_type==='FIRST_HALF'?'First Half':'Second Half'}
                </span>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>From</label>
              <input type="date" className="input w-full" value={form.from_date} onChange={e=>setForm({...form,from_date:e.target.value})}
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>To</label>
              <input type="date" className="input w-full" value={form.to_date} disabled={!!form.half_day_type} onChange={e=>setForm({...form,to_date:e.target.value})}
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Contact</label>
              <input className="input w-full" value={form.contact_number} onChange={e=>setForm({...form,contact_number:e.target.value})} placeholder="Mobile"
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Address</label>
              <input className="input w-full" value={form.leave_address} onChange={e=>setForm({...form,leave_address:e.target.value})} placeholder="Leave address"
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Reason</label>
              <textarea className="input w-full min-h-[80px]" rows={3} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
            </div>
          </div>
          <button className="w-full mt-5 font-semibold py-3.5 rounded-xl transition-all hover:shadow-lg"
            style={{ background:'#162660', color:'#FEFEFA' }} onClick={submitLeave}>Submit</button>
        </Modal>
      )}

      {/* Regularization Modal */}
      {showRegForm && (
        <Modal title="Request Regularization" onClose={()=>setShowRegForm(false)} theme="light">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Date</label>
              <input type="date" className="input w-full" value={regForm.date} onChange={e=>setRegForm({...regForm,date:e.target.value})}
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Type</label>
              <select className="input w-full" value={regForm.regularization_type} onChange={e=>setRegForm({...regForm,regularization_type:e.target.value})}
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}>
                <option value="full_day">Full Day</option>
                <option value="half_day">Half Day / Short Leave</option>
              </select>
            </div>
            {regForm.regularization_type==='half_day' && (
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Half Day</label>
                <select className="input w-full" value={regForm.half_day_type} onChange={e=>setRegForm({...regForm,half_day_type:e.target.value})}
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}>
                  <option value="">Select</option>
                  <option value="FIRST_HALF">First Half</option>
                  <option value="SECOND_HALF">Second Half</option>
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Punch In</label>
                <input type="time" className="input w-full" value={regForm.requested_in} onChange={e=>setRegForm({...regForm,requested_in:e.target.value})}
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Punch Out</label>
                <input type="time" className="input w-full" value={regForm.requested_out} onChange={e=>setRegForm({...regForm,requested_out:e.target.value})}
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Reason</label>
              <textarea className="input w-full min-h-[70px]" rows={3} value={regForm.reason} onChange={e=>setRegForm({...regForm,reason:e.target.value})} placeholder="e.g. Forgot to punch, short leave, system down..."
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
            </div>
          </div>
          <button className="w-full mt-5 font-semibold py-3.5 rounded-xl transition-all"
            style={{ background:'#162660', color:'#FEFEFA' }} onClick={submitRegularization} disabled={!regForm.date||!regForm.reason}>Submit</button>
        </Modal>
      )}

      {/* WFH Modal */}
      {showWfhForm && (
        <Modal title="Work From Home" onClose={()=>setShowWfhForm(false)} theme="light">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Date</label>
              <input type="date" className="input w-full" value={wfhForm.date} onChange={e=>setWfhForm({...wfhForm,date:e.target.value})}
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Reason</label>
              <textarea className="input w-full min-h-[80px]" rows={3} value={wfhForm.reason} onChange={e=>setWfhForm({...wfhForm,reason:e.target.value})} placeholder="e.g. Medical reason, personal work..."
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
            </div>
          </div>
          <button className="w-full mt-5 font-semibold py-3.5 rounded-xl transition-all"
            style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff' }}
            onClick={submitWFH} disabled={!wfhForm.date||!wfhForm.reason}>Submit WFH</button>
        </Modal>
      )}

      {/* Holiday Modal */}
      {showHolidayForm && (
        <Modal title="Add Holiday" onClose={()=>setShowHolidayForm(false)} theme="light">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Date</label>
              <input type="date" className="input w-full" value={holidayForm.date} onChange={e=>setHolidayForm({...holidayForm,date:e.target.value})}
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Name</label>
              <input className="input w-full" value={holidayForm.name} onChange={e=>setHolidayForm({...holidayForm,name:e.target.value})} placeholder="e.g. Diwali"
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Type</label>
              <select className="input w-full" value={holidayForm.type} onChange={e=>setHolidayForm({...holidayForm,type:e.target.value})}
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}>
                {['National','Festival','Regional','Optional'].map(t => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
          </div>
          <button className="w-full mt-5 font-semibold py-3.5 rounded-xl transition-all"
            style={{ background:'#162660', color:'#FEFEFA' }}
            onClick={addHoliday} disabled={!holidayForm.date||!holidayForm.name}>Add</button>
        </Modal>
      )}

      {showBalanceEdit && (
        <Modal title={`Edit Leave Balance — ${editBalance.emp_name}`} onClose={()=>setShowBalanceEdit(false)} theme="light" wide>
          <div className="grid grid-cols-3 gap-4">
            {['cl_entitled','cl_used','el_entitled','el_used','ml_entitled','ml_used'].map(f => (
              <div key={f}>
                <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>{f.replace('_',' ').toUpperCase()}</label>
                <input type="number" step="0.5" className="input w-full" value={editBalance[f]||0}
                  onChange={e=>setEditBalance({...editBalance,[f]:parseFloat(e.target.value)||0})}
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button className="flex-1 font-semibold py-3.5 rounded-xl transition-all"
              style={{ background:'#162660', color:'#FEFEFA' }}
              onClick={async ()=>{
                try {
                  await leaveAPI.updateBalance(editBalance.emp_id, editBalance);
                  setMsg('Leave balance updated!');
                  setShowBalanceEdit(false);
                  const bRes = await leaveAPI.listBalances();
                  setBalances(bRes.data.data||[]);
                } catch(e) { setMsg('Error: '+(e.response?.data?.message||e.message)); }
                setTimeout(()=>setMsg(''),5000);
              }}>Save Changes</button>
            <button className="flex-1 font-semibold py-3.5 rounded-xl transition-all"
              style={{ background:'rgba(22,38,96,0.06)', color:'#162660' }}
              onClick={()=>setShowBalanceEdit(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
