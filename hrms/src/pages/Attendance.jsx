import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import {
  Calendar, Plus, Check, X, Fingerprint, Clock, Settings, Home,
  ChevronLeft, ChevronRight, FileText, Activity, Sun, LogIn, LogOut,
  Coffee, MapPin, Smartphone, AlertCircle, AlertTriangle, CheckCircle2,
  XCircle, CoffeeIcon, CalendarDays, Watch, CheckCircle, Trash2, Ban, Search
} from 'lucide-react';
import { leaveAPI, empAPI, attendanceAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { usePaginationAndSearch } from '../hooks/usePaginationAndSearch';
import Pagination from '../components/common/Pagination';
import { getActiveRequestsForDate, getBlockedSlots, checkDateRules, canApply, isAnySlotAvailable } from '../utils/conflictValidator';

// Status → visual config (soft light tints — professional, corporate look)
const STATUS_STYLES = {
  Present:     { bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a', label: 'Present',    icon: CheckCircle2 },
  Absent:      { bg: '#fef2f2', border: '#fecaca', accent: '#dc2626', label: 'Absent',     icon: XCircle },
  'Half Day':  { bg: '#f5f3ff', border: '#ddd6fe', accent: '#7c3aed', label: 'Half Day',   icon: Clock },
  WFH:         { bg: '#fefce8', border: '#fef08a', accent: '#ca8a04', label: 'WFH',        icon: Home },
  Leave:       { bg: '#eff6ff', border: '#bfdbfe', accent: '#2563eb', label: 'Leave',      icon: CalendarDays },
  Late:        { bg: '#fff7ed', border: '#fed7aa', accent: '#ea580c', label: 'Late',       icon: AlertTriangle },
  Holiday:     { bg: '#fdf2f8', border: '#fbcfe8', accent: '#db2777', label: 'Holiday',    icon: Sun },
  Weekend:     { bg: '#f8fafc', border: '#e2e8f0', accent: '#94a3b8', label: 'Weekend',    icon: null },
  'Miss Punch':{ bg: '#fff7ed', border: '#fed7aa', accent: '#ea580c', label: 'Miss Punch', icon: AlertCircle },
  'No Record': { bg: '#ffffff', border: '#f1f5f9', accent: '#cbd5e1', label: '—',          icon: null },
  Upcoming:    { bg: '#ffffff', border: 'transparent', accent: '#cbd5e1', label: '',       icon: null },
  Aggregate:   { bg: '#ffffff', border: '#e2e8f0', accent: '#64748b', label: 'Aggregate',  icon: null },
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
  const [editBalance, setEditBalance] = useState({ emp_id: '', emp_name: '', year: new Date().getFullYear(), sl_entitled: 0, sl_used: 0, ml_entitled: 0, ml_used: 0, el_entitled: 0, el_used: 0, dl_entitled: 0, dl_used: 0 });
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ emp_id:'', leave_type:'SL', from_date:'', to_date:'', reason:'', half_day_type:'', contact_number:'', leave_address:'' });
  const [regForm, setRegForm] = useState({ date: '', reason: '', half_day_type: '', regularization_type: 'full_day' });
  const [wfhForm, setWfhForm] = useState({ date: '', reason: '', half_day_type: '', wfh_type: 'full_day' });
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '', type: 'Festival' });
  const [showHolidayForm, setShowHolidayForm] = useState(false);

  const {
    searchQuery: leaveSearch, setSearchQuery: setLeaveSearch,
    currentPage: leavePage, setCurrentPage: setLeavePage,
    paginatedData: paginatedLeaves, totalPages: leaveTotalPages
  } = usePaginationAndSearch(leaves, ['emp_name', 'emp_id', 'leave_type', 'dept_name', 'status'], 10);

  const {
    searchQuery: balSearch, setSearchQuery: setBalSearch,
    currentPage: balPage, setCurrentPage: setBalPage,
    paginatedData: paginatedBalances, totalPages: balTotalPages
  } = usePaginationAndSearch(balances, ['emp_name'], 10);

  const {
    searchQuery: wfhSearch, setSearchQuery: setWfhSearch,
    currentPage: wfhPage, setCurrentPage: setWfhPage,
    paginatedData: paginatedWfh, totalPages: wfhTotalPages
  } = usePaginationAndSearch(wfhRequests, ['first_name', 'last_name', 'reason', 'status'], 10);

  const {
    searchQuery: regSearch, setSearchQuery: setRegSearch,
    currentPage: regPage, setCurrentPage: setRegPage,
    paginatedData: paginatedRegs, totalPages: regTotalPages
  } = usePaginationAndSearch(regularizations, ['first_name', 'last_name', 'reason', 'status'], 10);

  const {
    searchQuery: attSearch, setSearchQuery: setAttSearch,
    currentPage: attPage, setCurrentPage: setAttPage,
    paginatedData: paginatedAtt, totalPages: attTotalPages
  } = usePaginationAndSearch(attendanceRecords, ['status'], 10);

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

  const cancelLeave = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    try { await leaveAPI.cancel(id); showMsg('Leave cancelled'); load(); }
    catch(e) { showMsg('Error: '+(e.response?.data?.message || e.message)); }
  };
  const cancelWFH = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this WFH request?')) return;
    try { await attendanceAPI.cancelWFH(id); showMsg('WFH request cancelled'); load(); }
    catch(e) { showMsg('Error: '+(e.response?.data?.message || e.message)); }
  };
  const cancelRegularization = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this regularization request?')) return;
    try { await attendanceAPI.cancelRegularization(id); showMsg('Regularization cancelled'); load(); }
    catch(e) { showMsg('Error: '+(e.response?.data?.message || e.message)); }
  };

  const submitLeave = async () => {
    try {
      const empId = user.role==='employee' ? user.emp_id : (form.emp_id || user.emp_id);
      const slot = form.half_day_type ? form.half_day_type : 'FULL_DAY';
      const start = new Date(form.from_date);
      const end = new Date(form.to_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toLocaleDateString('en-CA');
        const activeReqs = getActiveRequestsForDate(dateStr, empId, leaves, wfhRequests, regularizations);
        const { allowed, reason } = canApply(dateStr, 'leave', slot, activeReqs, holidays, isMin('hr_staff'));
        if (!allowed) return showMsg(`Validation Error on ${dateStr}: ` + reason);
      }

      const payload = user.role==='employee' ? { ...form, emp_id: user.emp_id } : form;
      await leaveAPI.apply(payload);
      showMsg('Leave application submitted'); setShowForm(false);
      setForm({ emp_id:'', leave_type:'SL', from_date:'', to_date:'', reason:'', half_day_type:'', contact_number:'', leave_address:'' });
      load();
    } catch(e) { showMsg('Error: '+e.response?.data?.message); }
  };
  const submitRegularization = async () => {
    try {
      const empId = user?.role === 'employee' ? user.emp_id : selectedEmpId;
      const slot = regForm.regularization_type === 'half_day' ? regForm.half_day_type : 'FULL_DAY';
      if (regForm.regularization_type === 'half_day' && !regForm.half_day_type) {
        return showMsg('Please select a half day type (First or Second half)');
      }
      const activeReqs = getActiveRequestsForDate(regForm.date, empId, leaves, wfhRequests, regularizations);
      const { allowed, reason } = canApply(regForm.date, 'regularize', slot, activeReqs, holidays, isMin('hr_staff'));
      if (!allowed) return showMsg('Validation Error: ' + reason);

      const payload = user?.role === 'employee' ? regForm : { ...regForm, emp_id: selectedEmpId };
      await attendanceAPI.applyRegularization(payload);
      showMsg('Regularization request submitted'); setShowRegForm(false);
      setRegForm({ date: '', reason: '', half_day_type: '', regularization_type: 'full_day' });
      load();
    } catch(e) { showMsg('Error: '+e.response?.data?.message); }
  };
  const submitWFH = async () => {
    try {
      const empId = user?.role === 'employee' ? user.emp_id : selectedEmpId;
      const slot = wfhForm.wfh_type === 'half_day' ? wfhForm.half_day_type : 'FULL_DAY';
      if (wfhForm.wfh_type === 'half_day' && !wfhForm.half_day_type) {
        return showMsg('Please select a half day type (First or Second half)');
      }
      const activeReqs = getActiveRequestsForDate(wfhForm.date, empId, leaves, wfhRequests, regularizations);
      const { allowed, reason } = canApply(wfhForm.date, 'wfh', slot, activeReqs, holidays, isMin('hr_staff'));
      if (!allowed) return showMsg('Validation Error: ' + reason);

      await attendanceAPI.applyWFH(wfhForm);
      showMsg('Work from home request submitted'); setShowWfhForm(false);
      setWfhForm({ date: '', reason: '', half_day_type: '', wfh_type: 'full_day' }); load();
    } catch(e) { showMsg('Error: '+e.response?.data?.message); }
  };
  const saveSettings = async () => {
    try {
      const payload = {
        ...settings,
        grace_period_mins: settings.grace_period_mins || 0,
        auto_absent_minutes: settings.auto_absent_minutes || 0,
        ot_rate_weekday: settings.ot_rate_weekday || 0,
        ot_rate_weekend: settings.ot_rate_weekend || 0,
        ot_rate_holiday: settings.ot_rate_holiday || 0,
      };
      await attendanceAPI.updateSettings(payload); showMsg('Settings saved'); load(); 
    }
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

  const downloadCSV = async () => {
    try {
      const eId = user?.role === 'employee' ? user.emp_id : selectedEmpId;
      const params = { month: currentMonth + 1, year: currentYear };
      if (eId) params.emp_id = eId;
      
      const response = await attendanceAPI.exportCSV(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attendance_Report_${currentYear}_${String(currentMonth+1).padStart(2,'0')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showMsg('Export successful');
    } catch (e) {
      showMsg('Error exporting CSV: ' + (e.response?.data?.message || e.message));
    }
  };

  const downloadAllCSV = async () => {
    try {
      const params = { month: currentMonth + 1, year: currentYear };
      const response = await attendanceAPI.exportCSV(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attendance_Report_All_${currentYear}_${String(currentMonth+1).padStart(2,'0')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showMsg('Export All successful');
    } catch (e) {
      showMsg('Error exporting CSV: ' + (e.response?.data?.message || e.message));
    }
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
    else if (action === 'wfh') setWfhForm({ ...wfhForm, date: dateStr, half_day_type: '', wfh_type: 'full_day' });
    else if (action === 'regularize') setRegForm({ ...regForm, date: dateStr, half_day_type: '' });
    
    if (action === 'leave') setShowForm(true);
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
                <option value="all">All Employees</option>
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
            {user?.role !== 'employee' && (
              <>
                <button className="text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:shadow-md ml-2 flex items-center gap-1.5"
                  style={{ background:'#162660', color:'#fff' }}
                  onClick={downloadCSV}>
                  <FileText size={14}/> Export CSV
                </button>
                <button className="text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:shadow-md ml-2 flex items-center gap-1.5"
                  style={{ background:'linear-gradient(135deg, #10b981, #059669)', color:'#fff' }}
                  onClick={downloadAllCSV}>
                  <FileText size={14}/> Export All
                </button>
              </>
            )}
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 mb-5">
            {statsArr.map((s) => (
              <div key={s.label} className="relative overflow-hidden rounded-xl bg-white px-2 md:px-4 py-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5" style={{ border: '1px solid rgba(22,38,96,0.06)' }}>
                <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-2 md:gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}10` }}>
                    <s.icon size={18} style={{ color: s.color }} />
                  </div>
                  <div>
                    <div className="text-xl font-extrabold leading-tight" style={{ color: '#162660' }}>{s.value}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: 'rgba(22,38,96,0.4)' }}>{s.label}</div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: s.color, opacity: 0.5 }} />
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid rgba(22,38,96,0.08)', boxShadow: '0 2px 12px rgba(22,38,96,0.06)' }}>
            {/* Day name headers */}
            <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgba(22,38,96,0.08)' }}>
              {DAYS.map((d, i) => (
                <div key={d} className="py-2 md:py-3.5 text-center text-[9px] md:text-[11px] font-bold uppercase tracking-wider md:tracking-widest"
                  style={{ color: (i === 0 || i === 6) ? 'rgba(22,38,96,0.25)' : 'rgba(22,38,96,0.5)', background: 'rgba(22,38,96,0.015)' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const st = day.data?.status || day.status;
                const style = STATUS_STYLES[st] || STATUS_STYLES.Upcoming;
                const isPrevNext = day.status === 'prev' || day.status === 'next';
                const hasData = day.date && !isPrevNext;
                const isWeekend = day.date && new Date(day.date + 'T00:00:00').getDay() % 6 === 0;

                return (
                  <div
                    key={idx}
                    onClick={() => handleDateClick(day)}
                    className="relative group cursor-pointer transition-all duration-200 hover:brightness-[0.97]"
                    style={{
                      minHeight: '108px',
                      borderRight: '1px solid rgba(22,38,96,0.05)',
                      borderBottom: '1px solid rgba(22,38,96,0.05)',
                      background: isPrevNext ? '#f8f9fc' : (hasData ? style.bg : (isWeekend ? '#fafbfc' : '#fff')),
                      opacity: isPrevNext ? 0.45 : 1,
                    }}
                  >
                    {/* Date number */}
                    <div className="px-1.5 md:px-3 pt-1.5 md:pt-2.5 pb-0.5 md:pb-1">
                      {day.isToday ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full text-xs md:text-sm font-bold text-white" style={{ background: '#162660', boxShadow: '0 2px 8px rgba(22,38,96,0.3)' }}>
                          {day.day}
                        </span>
                      ) : (
                        <span className="text-xs md:text-sm font-bold" style={{ color: isPrevNext ? '#d0d5dd' : (isWeekend ? 'rgba(22,38,96,0.28)' : '#162660') }}>
                          {day.day}
                        </span>
                      )}
                    </div>

                    {/* Status content */}
                    {hasData && st !== 'Aggregate' && (() => {
                      const empId = user?.role === 'employee' ? user.emp_id : selectedEmpId;
                      const activeReqs = (day.date && empId && empId !== 'all') 
                        ? getActiveRequestsForDate(day.date, empId, leaves, wfhRequests, regularizations)
                        : [];

                      // If no active reqs, just show the base status from backend
                      // Base statuses we want to show even if no requests: Present, Absent, Miss Punch, Holiday, Weekend
                      const showBaseStatus = activeReqs.length === 0 || ['Present', 'Absent', 'Miss Punch', 'Holiday'].includes(st);

                      return (
                        <div className="px-1.5 md:px-3 pb-1 md:pb-2.5 flex flex-col gap-1 mt-0.5 custom-scrollbar overflow-y-auto max-h-[64px]">
                          {/* Base status or Holiday */}
                          {showBaseStatus && (
                            <span className="text-[9px] md:text-[11px] font-bold leading-tight" style={{ color: style.accent }}>
                              {st === 'Leave' && activeReqs.length > 0 ? '' // hide backend generic leave if we have specific reqs
                               : st === 'WFH' && activeReqs.length > 0 ? '' // hide backend generic wfh
                               : st === 'Half Day' ? 'Half Day'
                               : st === 'Upcoming' ? '' // DO NOT SHOW 'Upcoming' TEXT
                               : st}
                            </span>
                          )}

                          {/* Holiday Name */}
                          {day.data?.holiday_name && (
                            <span className="text-[10px] font-medium truncate" style={{ color: style.accent, opacity: 0.8 }}>
                              {day.data.holiday_name}
                            </span>
                          )}

                          {/* Punches */}
                          {day.data?.punch_in && (
                            <div className="flex flex-col mt-0.5 mb-0.5">
                              <span className="text-[8px] md:text-[10px] font-medium leading-tight" style={{ color: day.data.is_regularized ? '#059669' : 'rgba(22,38,96,0.35)' }}>
                                {day.data.is_regularized ? 'Reg: ' : ''}{day.data.punch_in.slice(0,5)}<span className="hidden sm:inline">{day.data.punch_out ? ` - ${day.data.punch_out.slice(0,5)}` : ''}</span>
                              </span>
                              {day.data.is_regularized && (
                                <span className="text-[7px] md:text-[8px] font-medium leading-tight mt-0.5" style={{ color: 'rgba(22,38,96,0.35)' }}>
                                  Act: {day.data.actual_punch_in ? day.data.actual_punch_in.slice(0,5) : '--'}
                                  <span className="hidden sm:inline">{day.data.actual_punch_out ? ` - ${day.data.actual_punch_out.slice(0,5)}` : (day.data.actual_punch_in ? ' - --' : '')}</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Render Active Requests as Badges */}
                          {activeReqs.map((req, i) => {
                            const isAppr = req.status === 'Approved';
                            const colors = {
                              leave: isAppr ? { bg:'#e0e7ff', text:'#4338ca', border:'#c7d2fe' } : { bg:'#fef3c7', text:'#d97706', border:'#fde68a' },
                              wfh: isAppr ? { bg:'#dcfce7', text:'#15803d', border:'#bbf7d0' } : { bg:'#fef3c7', text:'#d97706', border:'#fde68a' },
                              regularize: isAppr ? { bg:'#ffedd5', text:'#c2410c', border:'#fed7aa' } : { bg:'#fef3c7', text:'#d97706', border:'#fde68a' }
                            };
                            const c = colors[req.type];
                            const label = req.type === 'leave' ? 'Lv' : req.type === 'wfh' ? 'WFH' : 'Reg';
                            const slotLabel = req.slot === 'FIRST_HALF' ? 'H1' : req.slot === 'SECOND_HALF' ? 'H2' : 'Full';
                            
                            return (
                              <div key={i} className="text-[9px] px-1.5 py-0.5 rounded shadow-sm border flex justify-between items-center whitespace-nowrap"
                                style={{ background:c.bg, color:c.text, borderColor:c.border }}>
                                <span className="font-bold">{label} {slotLabel}</span>
                                {!isAppr && <span className="text-[8px] opacity-75 ml-1">Pend</span>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Aggregate text */}
                    {st === 'Aggregate' && (
                      <div className="px-1.5 md:px-3 pb-1 md:pb-2.5 flex flex-col gap-0 md:gap-0.5 mt-0.5">
                        <span className="text-[9px] md:text-[11px] font-bold leading-tight" style={{ color: style.accent }}>Aggregate</span>
                      </div>
                    )}

                    {/* Weekend text */}
                    {!hasData && isWeekend && !isPrevNext && (
                      <div className="px-1.5 md:px-3 mt-0.5">
                        <span className="text-[8px] md:text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(22,38,96,0.15)' }}>Off</span>
                      </div>
                    )}

                    {/* Aggregate view */}
                    {hasData && st === 'Aggregate' && (
                      <div className="px-3 pb-2 flex flex-wrap gap-1 mt-1">
                        {day.data?.present?.length > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#dcfce7', color: '#16a34a' }}>P:{day.data.present.length}</span>}
                        {day.data?.absent?.length > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#fee2e2', color: '#dc2626' }}>A:{day.data.absent.length}</span>}
                        {day.data?.leave?.length > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#dbeafe', color: '#2563eb' }}>L:{day.data.leave.length}</span>}
                        {day.data?.wfh?.length > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#fef9c3', color: '#ca8a04' }}>W:{day.data.wfh.length}</span>}
                        {day.data?.half_day?.length > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#ede9fe', color: '#7c3aed' }}>HD:{day.data.half_day.length}</span>}
                        {day.data?.miss_punch?.length > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#ffedd5', color: '#ea580c' }}>MP:{day.data.miss_punch.length}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Date Action Modal */}
          {showDateAction && selectedDate && (
            <Modal title={formatDate(selectedDate)} onClose={()=>setShowDateAction(false)} theme="light">
              {selectedDayData && selectedDayData.status && (() => {
                const cfg = STATUS_STYLES[selectedDayData.status] || STATUS_STYLES.Upcoming;
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                const dd = selectedDayData.data || {};

                if (dd.status === 'Aggregate') {
                  return (
                    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      <div className="flex justify-between items-center mb-5 border-b pb-3" style={{ borderColor:'rgba(22,38,96,0.1)' }}>
                        <h4 className="font-bold text-lg" style={{ color:'#162660' }}>Team Summary</h4>
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color:'rgba(22,38,96,0.5)' }}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dd.dayOfWeek]}</span>
                      </div>
                      
                      {[
                        { title: 'Present', color: 'emerald', hex: '#10b981', list: dd.present },
                        { title: 'Absent', color: 'red', hex: '#ef4444', list: dd.absent },
                        { title: 'On Leave', color: 'blue', hex: '#3b82f6', list: dd.leave },
                        { title: 'Work From Home', color: 'amber', hex: '#f59e0b', list: dd.wfh },
                        { title: 'Half Day', color: 'purple', hex: '#a855f7', list: dd.half_day },
                        { title: 'Missed Punch', color: 'orange', hex: '#f97316', list: dd.miss_punch },
                        { title: 'Holiday', color: 'pink', hex: '#ec4899', list: dd.holiday },
                        { title: 'No Record', color: 'gray', hex: '#9ca3af', list: dd.no_record },
                      ].map(cat => cat.list?.length > 0 && (
                        <div key={cat.title} className="mb-5 bg-white rounded-xl p-4 shadow-sm border" style={{ borderColor:`${cat.hex}30` }}>
                          <h5 className="text-[11px] font-bold uppercase mb-3 flex items-center justify-between" style={{ color: cat.hex }}>
                            <span>{cat.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold" style={{ background:`${cat.hex}20` }}>{cat.list.length}</span>
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {cat.list.map(name => (
                              <span key={name} className="text-xs px-2.5 py-1.5 rounded-lg font-medium border"
                                style={{ background:`${cat.hex}08`, color:`${cat.hex}`, borderColor:`${cat.hex}25` }}>
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                <>
                  <div className="mb-4 p-4 rounded-xl" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base" style={{ color: cfg.accent }}>{cfg.label || dd.status}</span>
                      </div>
                      <span className="text-xs" style={{ color:'rgba(22,38,96,0.4)' }}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dd.dayOfWeek]}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-white/60 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:'rgba(22,38,96,0.35)' }}>In</div>
                        <div className="font-bold text-sm" style={{ color: dd.punch_in ? '#162660' : 'rgba(22,38,96,0.25)' }}>{dd.punch_in ? dd.punch_in.slice(0,5) : 'Not punched'}</div>
                        {dd.is_regularized && (
                          <div className="text-[9px] mt-0.5 font-medium text-slate-400">Actual: {dd.actual_punch_in ? dd.actual_punch_in.slice(0,5) : 'Not punched'}</div>
                        )}
                      </div>
                      <div className="bg-white/60 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:'rgba(22,38,96,0.35)' }}>Out</div>
                        <div className="font-bold text-sm" style={{ color: dd.punch_out ? '#162660' : 'rgba(22,38,96,0.25)' }}>{dd.punch_out ? dd.punch_out.slice(0,5) : 'Not punched'}</div>
                        {dd.is_regularized && (
                          <div className="text-[9px] mt-0.5 font-medium text-slate-400">Actual: {dd.actual_punch_out ? dd.actual_punch_out.slice(0,5) : 'Not punched'}</div>
                        )}
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
                          <a href={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '')}${dd.photo_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Smartphone size={14}/> View Photo
                          </a>
                        )}
                        {dd.location && (() => {
                          let loc = null;
                          try {
                            loc = typeof dd.location === 'string' ? JSON.parse(dd.location) : dd.location;
                          } catch (e) { loc = null; }
                          return loc?.lat ? (
                            <a href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                              <MapPin size={14}/> View Map
                            </a>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Miss Punch alert */}
                  {selectedDayData.status === 'Miss Punch' && (
                    <div className="mb-3 p-3 rounded-xl flex items-start gap-2"
                      style={{ background:'#fff7ed', border:'1px solid #fed7aa' }}>
                      <AlertCircle className="text-orange-500 mt-0.5" size={16}/>
                      <div>
                        <div className="text-sm font-bold" style={{ color:'#c2410c' }}>Miss Punch Detected</div>
                        <div className="text-xs mt-0.5" style={{ color:'#9a3412' }}>
                          You punched in at <strong>{dd.punch_in?.slice(0,5)}</strong> but no punch-out was recorded. Please submit a regularization request.
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs font-semibold mb-3" style={{ color:'rgba(22,38,96,0.5)' }}>QUICK ACTIONS</p>
                  {!['super_admin', 'hr_manager', 'hr_staff'].includes(user.role) ? (
                    (() => {
                      const empId = user?.role === 'employee' ? user.emp_id : selectedEmpId;
                      const activeReqs = getActiveRequestsForDate(selectedDate, empId, leaves, wfhRequests, regularizations);
                      const blocked = getBlockedSlots(activeReqs);
                      const dateErr = checkDateRules(selectedDate, 'leave', holidays);
                      const dateErrReg = checkDateRules(selectedDate, 'regularize', holidays);
                      const dateErrWfh = checkDateRules(selectedDate, 'wfh', holidays);

                      const leaveAvail = !dateErr && (blocked.leave.FULL_DAY === null || blocked.leave.FIRST_HALF === null || blocked.leave.SECOND_HALF === null);
                      const wfhAvail = !dateErrWfh && (blocked.wfh.FULL_DAY === null || blocked.wfh.FIRST_HALF === null || blocked.wfh.SECOND_HALF === null);
                      const regAvail = !dateErrReg && (blocked.regularize.FULL_DAY === null || blocked.regularize.FIRST_HALF === null || blocked.regularize.SECOND_HALF === null);

                      return (
                        <div className="space-y-2.5">
                          {/* Show existing requests with cancel buttons */}
                          {activeReqs.length > 0 && (
                            <div className="space-y-1.5 mb-3">
                              {activeReqs.map((req, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border"
                                  style={{ background: req.status === 'Approved' ? '#f0fdf4' : '#fffbeb', borderColor: req.status === 'Approved' ? '#bbf7d0' : '#fef08a' }}>
                                  <div className="flex items-center gap-2">
                                    <CheckCircle size={14} className={req.status === 'Approved' ? 'text-green-500' : 'text-amber-500'}/>
                                    <span className="text-xs font-medium" style={{ color:'#162660' }}>{req.label}</span>
                                  </div>
                                  {(req.status === 'Pending' || isMin('hr_staff')) && (
                                    <button
                                      className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:shadow-sm flex items-center gap-1"
                                      style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }}
                                      onClick={() => {
                                        if (req.type === 'leave') cancelLeave(req.id);
                                        else if (req.type === 'wfh') cancelWFH(req.id);
                                        else cancelRegularization(req.id);
                                      }}>
                                      <Trash2 size={11}/> Cancel
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Date-level warnings */}
                          {dateErr && !dateErrReg && (
                            <div className="p-2.5 rounded-xl text-xs font-medium flex items-center gap-2"
                              style={{ background:'#fffbeb', border:'1px solid #fef08a', color:'#92400e' }}>
                              <AlertTriangle size={14}/> {dateErr}
                            </div>
                          )}
                          {dateErr && dateErrReg && (
                            <div className="p-2.5 rounded-xl text-xs font-medium flex items-center gap-2"
                              style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b' }}>
                              <Ban size={14}/> {dateErr}
                            </div>
                          )}

                          {/* Miss Punch: show Regularize prominently first */}
                          {selectedDayData.status === 'Miss Punch' && regAvail && (
                            <button className="w-full text-sm font-bold p-3.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2"
                              style={{ background:'#ea580c', color:'#fff' }}
                              onClick={()=>handleDateAction('regularize')}>
                              <Activity size={16}/> Regularize This Day
                            </button>
                          )}

                          {leaveAvail && (
                            <button className="w-full text-sm font-semibold p-3.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2"
                              style={{ background:'#162660', color:'#fff' }}
                              onClick={()=>handleDateAction('leave')}><Calendar size={16}/> Apply Leave</button>
                          )}

                          {wfhAvail && (
                            <button className="w-full text-sm font-semibold p-3.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2"
                              style={{ background:'#f59e0b', color:'#fff' }}
                              onClick={()=>handleDateAction('wfh')}><Home size={16}/> Apply Work From Home</button>
                          )}

                          {regAvail && selectedDayData.status !== 'Miss Punch' && (
                            <button className="w-full text-sm font-semibold p-3.5 rounded-xl transition-all hover:shadow-md"
                              style={{ background:'rgba(22,38,96,0.04)', color:'#162660', border:'1px solid rgba(22,38,96,0.12)' }}
                              onClick={()=>handleDateAction('regularize')}>Request Regularization</button>
                          )}

                          {!leaveAvail && !wfhAvail && !regAvail && activeReqs.length === 0 && (
                            <div className="p-4 rounded-xl text-center border border-slate-100 bg-slate-50/50">
                              <Ban className="mx-auto text-slate-400 mb-2" size={24}/>
                              <p className="text-sm font-semibold text-slate-600">No actions available for this date</p>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    /* Admin view — show existing requests with cancel buttons */
                    (() => {
                      const empId = selectedEmpId;
                      const activeReqs = empId ? getActiveRequestsForDate(selectedDate, empId, leaves, wfhRequests, regularizations) : [];
                      return activeReqs.length > 0 ? (
                        <div className="space-y-1.5">
                          {activeReqs.map((req, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border"
                              style={{ background: req.status === 'Approved' ? '#f0fdf4' : '#fffbeb', borderColor: req.status === 'Approved' ? '#bbf7d0' : '#fef08a' }}>
                              <span className="text-xs font-medium" style={{ color:'#162660' }}>{req.label}</span>
                              <button
                                className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:shadow-sm flex items-center gap-1"
                                style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }}
                                onClick={() => {
                                  if (req.type === 'leave') cancelLeave(req.id);
                                  else if (req.type === 'wfh') cancelWFH(req.id);
                                  else cancelRegularization(req.id);
                                }}>
                                <Trash2 size={11}/> Cancel
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-center py-4" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>No active requests for this date</p>
                      );
                    })()
                  )}

                </>
              )})()}
            </Modal>
          )}
        </div>

      ) : tab === 'applications' ? (
        <div className="animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 w-full md:flex-1">
              {[
                { title:'Total', value:leaves.length, color:'#818cf8' },
                { title:'Pending', value:leaves.filter(l=>l.status==='Pending').length, color:'#fbbf24' },
                { title:'Approved', value:leaves.filter(l=>l.status==='Approved').length, color:'#34d399' },
                { title:'Rejected', value:leaves.filter(l=>l.status==='Rejected').length, color:'#f87171' },
              ].map((c,i) => (
                <div key={c.title} className="p-3 md:p-4 rounded-xl" style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.08)' }}>
                  <div className="text-xl md:text-2xl font-bold" style={{ color:c.color }}>{c.value}</div>
                  <div className="text-[10px] md:text-xs mt-1 font-medium" style={{ color:'rgba(22,38,96,0.5)' }}>{c.title}</div>
                </div>
              ))}
            </div>
            {!['super_admin', 'hr_manager', 'hr_staff'].includes(user.role) && (
              <button className="font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-lg w-full md:w-auto"
                style={{ background:'#162660', color:'#FEFEFA', whiteSpace:'nowrap' }}
                onClick={()=>setShowForm(true)}><Plus size={16} className="inline mr-1"/>Apply Leave</button>
            )}
          </div>
          
          <div className="flex items-center justify-end mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search applications..." 
                value={leaveSearch}
                onChange={e => setLeaveSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-64 text-slate-800 bg-white"
              />
            </div>
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
                <tbody>{paginatedLeaves.map((l,i)=>(
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
                    <td className="p-3">
                      <div className="flex gap-1.5">
                        {l.status==='Pending' && isMin('hr_staff') && (
                          <>
                            <button className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all" onClick={()=>review(l.id,'Approved')}><Check size={14}/></button>
                            <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all" onClick={()=>review(l.id,'Rejected')}><X size={14}/></button>
                          </>
                        )}
                        {l.status==='Pending' && user.emp_id === l.emp_id && (
                          <button className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all" title="Cancel" onClick={()=>cancelLeave(l.id)}><Trash2 size={14}/></button>
                        )}
                        {l.status==='Approved' && isMin('hr_staff') && (
                          <button className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all" title="Cancel (Admin)" onClick={()=>cancelLeave(l.id)}><Trash2 size={14}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          <Pagination currentPage={leavePage} totalPages={leaveTotalPages} onPageChange={setLeavePage} />
        </div>
      ) : tab === 'balance' ? (
        <div className="animate-fadeIn rounded-xl bg-white p-6 border" style={{ borderColor:'rgba(22,38,96,0.1)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color:'#162660' }}>Leave Balance — {new Date().getFullYear()}</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search balances..." 
                value={balSearch}
                onChange={e => setBalSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-64 text-slate-800 bg-white"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(22,38,96,0.08)', background:'rgba(22,38,96,0.02)' }}>
                  {['Employee','SL','ML','EL','DL','Used SL','Used ML','Used EL','Used DL', ...(isMin('hr_staff') ? ['Action'] : [])].map(h => (
                    <th key={h} className="p-3 text-left text-xs font-semibold" style={{ color:'rgba(22,38,96,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{paginatedBalances.map((b,i)=>(
                <tr key={b.id} className="hover:bg-gray-50/50" style={{ borderBottom:'1px solid rgba(22,38,96,0.04)' }}>
                  <td className="p-3"><div className="font-medium text-sm" style={{ color:'#162660' }}>{b.emp_name}</div></td>
                  <td className="p-3 font-semibold text-emerald-600">{(b.probation_status==='Pending'?2:(b.sl_entitled||0))-(b.sl_used||0)}</td>
                  <td className="p-3 font-semibold text-purple-600">{(b.probation_status==='Pending'?0:(b.ml_entitled||0))-(b.ml_used||0)}</td>
                  <td className="p-3 font-semibold text-blue-600">{(b.probation_status==='Pending'?0:(b.el_entitled||0))-(b.el_used||0)}</td>
                  <td className="p-3 font-semibold text-amber-600">{(b.probation_status==='Pending'?0:(b.dl_entitled||0))-(b.dl_used||0)}</td>
                  <td className="p-3 text-red-500 font-medium">{b.sl_used||0}</td>
                  <td className="p-3 text-red-500 font-medium">{b.ml_used||0}</td>
                  <td className="p-3 text-red-500 font-medium">{b.el_used||0}</td>
                  <td className="p-3 text-red-500 font-medium">{b.dl_used||0}</td>
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
          <Pagination currentPage={balPage} totalPages={balTotalPages} onPageChange={setBalPage} />
        </div>
      ) : tab === 'wfh' ? (
        <div className="animate-fadeIn rounded-xl bg-white p-6 border" style={{ borderColor:'rgba(22,38,96,0.1)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold" style={{ color:'#162660' }}>Work From Home</h3>
            <div className="flex gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search WFH..." 
                  value={wfhSearch}
                  onChange={e => setWfhSearch(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-64 text-slate-800 bg-white"
                />
              </div>
              {!['super_admin', 'hr_manager', 'hr_staff'].includes(user.role) && (
                <button className="font-semibold px-5 py-2.5 rounded-xl transition-all"
                  style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff' }}
                  onClick={()=>setShowWfhForm(true)}><Plus size={16} className="inline mr-1"/>Request WFH</button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(22,38,96,0.08)', background:'rgba(22,38,96,0.02)' }}>
                  {user?.role!=='employee' && <th className="p-3 text-left text-xs font-semibold" style={{ color:'rgba(22,38,96,0.5)' }}>Employee</th>}
                  {['Date','Type','Reason','Status','Action'].map(h => (
                    <th key={h} className="p-3 text-left text-xs font-semibold" style={{ color:'rgba(22,38,96,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{paginatedWfh.length===0 ? (
                <tr><td colSpan={user?.role!=='employee'?5:4} className="p-8 text-center text-sm" style={{ color:'rgba(22,38,96,0.3)' }}>No WFH requests</td></tr>
              ) : paginatedWfh.map((w,i)=>(
                <tr key={w.id} className="hover:bg-gray-50/50" style={{ borderBottom:'1px solid rgba(22,38,96,0.04)' }}>
                  {user?.role!=='employee' && <td className="p-3"><span className="font-medium text-sm" style={{ color:'#162660' }}>{w.first_name} {w.last_name}</span></td>}
                  <td className="p-3 text-sm" style={{ color:'#162660' }}>{new Date(w.date).toLocaleDateString()}</td>
                  <td className="p-3 text-xs">{w.wfh_type==='half_day' ? 'Half Day' : 'Full Day'}{w.half_day_type ? ` (${w.half_day_type==='FIRST_HALF'?'1st':'2nd'})` : ''}</td>
                  <td className="p-3 text-xs max-w-[200px] truncate" style={{ color:'rgba(22,38,96,0.5)' }}>{w.reason}</td>
                  <td className="p-3"><Badge text={w.status}/></td>
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      {w.status==='Pending' && isMin('hr_staff') && (
                        <>
                          <button className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" onClick={()=>reviewWFH(w.id,'Approved')}><Check size={14}/></button>
                          <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" onClick={()=>reviewWFH(w.id,'Rejected')}><X size={14}/></button>
                        </>
                      )}
                      {w.status==='Pending' && user.emp_id === w.emp_id && (
                        <button className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all" title="Cancel" onClick={()=>cancelWFH(w.id)}><Trash2 size={14}/></button>
                      )}
                      {w.status==='Approved' && isMin('hr_staff') && (
                        <button className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all" title="Cancel (Admin)" onClick={()=>cancelWFH(w.id)}><Trash2 size={14}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination currentPage={wfhPage} totalPages={wfhTotalPages} onPageChange={setWfhPage} />
        </div>
      ) : tab === 'regularize' ? (
        <div className="animate-fadeIn rounded-xl bg-white p-6 border" style={{ borderColor:'rgba(22,38,96,0.1)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold" style={{ color:'#162660' }}>Regularizations</h3>
            <div className="flex gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search reqs..." 
                  value={regSearch}
                  onChange={e => setRegSearch(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-64 text-slate-800 bg-white"
                />
              </div>
              {!['super_admin', 'hr_manager', 'hr_staff'].includes(user.role) && (
                <button className="font-semibold px-5 py-2.5 rounded-xl transition-all"
                  style={{ background:'#fff', color:'#162660', border:'1px solid rgba(22,38,96,0.15)' }}
                  onClick={()=>setShowRegForm(true)}><Plus size={16} className="inline mr-1"/>Request Regularization</button>
              )}
            </div>
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
              <tbody>{paginatedRegs.length===0 ? (
                <tr><td colSpan={user?.role!=='employee'?8:7} className="p-8 text-center text-sm" style={{ color:'rgba(22,38,96,0.3)' }}>No regularization requests</td></tr>
              ) : paginatedRegs.map((r,i)=>(
                <tr key={r.id} className="hover:bg-gray-50/50" style={{ borderBottom:'1px solid rgba(22,38,96,0.04)' }}>
                  {user?.role!=='employee' && <td className="p-3"><span className="font-medium text-sm" style={{ color:'#162660' }}>{r.first_name} {r.last_name}</span></td>}
                  <td className="p-3 text-sm" style={{ color:'#162660' }}>{new Date(r.date).toLocaleDateString()}</td>
                  <td className="p-3 text-xs">{r.regularization_type==='half_day' ? 'Half Day' : 'Full Day'}{r.half_day_type ? ` (${r.half_day_type==='FIRST_HALF'?'1st':'2nd'})` : ''}</td>
                  <td className="p-3 text-sm" style={{ color:'#162660' }}>{r.requested_in?.slice(0,5)||'--:--'}</td>
                  <td className="p-3 text-sm" style={{ color:'#162660' }}>{r.requested_out?.slice(0,5)||'--:--'}</td>
                  <td className="p-3 text-xs max-w-[150px] truncate" style={{ color:'rgba(22,38,96,0.5)' }}>{r.reason}</td>
                  <td className="p-3"><Badge text={r.status}/></td>
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      {r.status==='Pending' && isMin('hr_staff') && (
                        <>
                          <button className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" onClick={()=>reviewRegularization(r.id,'Approved')}><Check size={14}/></button>
                          <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" onClick={()=>reviewRegularization(r.id,'Rejected')}><X size={14}/></button>
                        </>
                      )}
                      {r.status==='Pending' && user.emp_id === r.emp_id && (
                        <button className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all" title="Cancel" onClick={()=>cancelRegularization(r.id)}><Trash2 size={14}/></button>
                      )}
                      {r.status==='Approved' && isMin('hr_staff') && (
                        <button className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all" title="Cancel (Admin)" onClick={()=>cancelRegularization(r.id)}><Trash2 size={14}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination currentPage={regPage} totalPages={regTotalPages} onPageChange={setRegPage} />
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
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  value={attSearch}
                  onChange={e => setAttSearch(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-64 text-slate-800 bg-white"
                />
              </div>
            </div>
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
              <tbody>{paginatedAtt.length===0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-sm" style={{ color:'rgba(22,38,96,0.3)' }}>No records</td></tr>
              ) : paginatedAtt.map((a,i)=>(
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
          <Pagination currentPage={attPage} totalPages={attTotalPages} onPageChange={setAttPage} />
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
                <input type="number" min="0" className="input w-full" placeholder="0" value={settings.grace_period_mins || ''}
                  onChange={e=>setSettings({...settings,grace_period_mins:Math.max(0, parseInt(e.target.value)) || ''})}
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
                <input type="number" min="0" className="input w-full" placeholder="0" value={settings.auto_absent_minutes || ''}
                  onChange={e=>setSettings({...settings,auto_absent_minutes:Math.max(0, parseInt(e.target.value)) || ''})}
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
                  <input type="number" min="0" step="0.1" className="input w-full" placeholder="0" value={settings.ot_rate_weekday || ''}
                    onChange={e=>setSettings({...settings,ot_rate_weekday:Math.max(0, parseFloat(e.target.value)) || ''})}
                    style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'8px', padding:'8px 10px' }}/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Weekend</label>
                  <input type="number" min="0" step="0.1" className="input w-full" placeholder="0" value={settings.ot_rate_weekend || ''}
                    onChange={e=>setSettings({...settings,ot_rate_weekend:Math.max(0, parseFloat(e.target.value)) || ''})}
                    style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'8px', padding:'8px 10px' }}/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Holiday</label>
                  <input type="number" min="0" step="0.1" className="input w-full" placeholder="0" value={settings.ot_rate_holiday || ''}
                    onChange={e=>setSettings({...settings,ot_rate_holiday:Math.max(0, parseFloat(e.target.value)) || ''})}
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
          <form onSubmit={(e) => { e.preventDefault(); submitLeave(); }}>
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
                {['SL','ML','EL','DL'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Duration</label>
              <select className="input w-full" value={form.half_day_type || ''} onChange={e => {
                const val = e.target.value;
                setForm({...form, half_day_type: val, to_date: val ? form.from_date : form.to_date});
              }}
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}>
                {(() => {
                  const empId = user.role==='employee' ? user.emp_id : (form.emp_id || user.emp_id);
                  const activeReqs = getActiveRequestsForDate(form.from_date, empId, leaves, wfhRequests, regularizations);
                  const blocked = getBlockedSlots(activeReqs).leave;
                  return (
                    <>
                      <option value="" disabled={!!blocked.FULL_DAY}>Full Day {blocked.FULL_DAY ? '(Blocked)' : ''}</option>
                      <option value="FIRST_HALF" disabled={!!blocked.FIRST_HALF}>First Half {blocked.FIRST_HALF ? '(Blocked)' : ''}</option>
                      <option value="SECOND_HALF" disabled={!!blocked.SECOND_HALF}>Second Half {blocked.SECOND_HALF ? '(Blocked)' : ''}</option>
                    </>
                  );
                })()}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Days: {form.half_day_type ? '0.5' : daysDiff(form.from_date,form.to_date)||'—'}</label>
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
              <input className="input w-full" value={form.contact_number} onChange={e => { let v = e.target.value.replace(/\D/g, ''); if (v.length > 10) v = v.slice(0, 10); setForm({...form,contact_number:v}) }} placeholder="Mobile" required pattern="^[6-9]\d{9}$" title="10-digit mobile number starting with 6-9"
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
          <button type="submit" className="w-full mt-5 font-semibold py-3.5 rounded-xl transition-all hover:shadow-lg"
            style={{ background:'#162660', color:'#FEFEFA' }}>Submit</button>
          </form>
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
                  {(() => {
                    const empId = user.role==='employee' ? user.emp_id : selectedEmpId;
                    const activeReqs = getActiveRequestsForDate(regForm.date, empId, leaves, wfhRequests, regularizations);
                    const blocked = getBlockedSlots(activeReqs).regularize;
                    return (
                      <>
                        <option value="full_day" disabled={!!blocked.FULL_DAY}>Full Day {blocked.FULL_DAY ? '(Blocked)' : ''}</option>
                        <option value="half_day">Half Day / Short Leave</option>
                      </>
                    );
                  })()}
                </select>
            </div>
            {regForm.regularization_type==='half_day' && (
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Half Day</label>
                <select className="input w-full" value={regForm.half_day_type} onChange={e=>setRegForm({...regForm,half_day_type:e.target.value})}
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}>
                  {(() => {
                    const empId = user.role==='employee' ? user.emp_id : selectedEmpId;
                    const activeReqs = getActiveRequestsForDate(regForm.date, empId, leaves, wfhRequests, regularizations);
                    const blocked = getBlockedSlots(activeReqs).regularize;
                    return (
                      <>
                        <option value="">Select</option>
                        <option value="FIRST_HALF" disabled={!!blocked.FIRST_HALF}>First Half {blocked.FIRST_HALF ? '(Blocked)' : ''}</option>
                        <option value="SECOND_HALF" disabled={!!blocked.SECOND_HALF}>Second Half {blocked.SECOND_HALF ? '(Blocked)' : ''}</option>
                      </>
                    );
                  })()}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Reason</label>
              <textarea className="input w-full min-h-[70px]" rows={3} value={regForm.reason} onChange={e=>setRegForm({...regForm,reason:e.target.value})} placeholder="e.g. Forgot to punch, short leave, system down..."
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}/>
            </div>
            <div className="p-3 rounded-lg" style={{ background:'rgba(22,38,96,0.04)', border:'1px solid rgba(22,38,96,0.08)' }}>
              <p className="text-xs" style={{ color:'rgba(22,38,96,0.5)' }}>
                <strong>Note:</strong> Punch times will be auto-filled based on your selected session type and the office shift timings.
                {regForm.regularization_type === 'full_day' && ' (Full shift: Shift Start → Shift End)'}
                {regForm.regularization_type === 'half_day' && regForm.half_day_type === 'FIRST_HALF' && ' (1st Half: Shift Start → Half Day Cutoff)'}
                {regForm.regularization_type === 'half_day' && regForm.half_day_type === 'SECOND_HALF' && ' (2nd Half: Half Day Cutoff → Shift End)'}
              </p>
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
              <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Type</label>
              <select className="input w-full" value={wfhForm.wfh_type} onChange={e=>setWfhForm({...wfhForm,wfh_type:e.target.value})}
                style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}>
                {(() => {
                  const empId = user.role==='employee' ? user.emp_id : selectedEmpId;
                  const activeReqs = getActiveRequestsForDate(wfhForm.date, empId, leaves, wfhRequests, regularizations);
                  const blocked = getBlockedSlots(activeReqs).wfh;
                  return (
                    <>
                      <option value="full_day" disabled={!!blocked.FULL_DAY}>Full Day {blocked.FULL_DAY ? '(Blocked)' : ''}</option>
                      <option value="half_day">Half Day</option>
                    </>
                  );
                })()}
              </select>
            </div>
            {wfhForm.wfh_type === 'half_day' && (
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>Half Day</label>
                <select className="input w-full" value={wfhForm.half_day_type} onChange={e=>setWfhForm({...wfhForm,half_day_type:e.target.value})}
                  style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }}>
                  {(() => {
                    const empId = user.role==='employee' ? user.emp_id : selectedEmpId;
                    const activeReqs = getActiveRequestsForDate(wfhForm.date, empId, leaves, wfhRequests, regularizations);
                    const blocked = getBlockedSlots(activeReqs).wfh;
                    return (
                      <>
                        <option value="">Select</option>
                        <option value="FIRST_HALF" disabled={!!blocked.FIRST_HALF}>First Half {blocked.FIRST_HALF ? '(Blocked)' : ''}</option>
                        <option value="SECOND_HALF" disabled={!!blocked.SECOND_HALF}>Second Half {blocked.SECOND_HALF ? '(Blocked)' : ''}</option>
                      </>
                    );
                  })()}
                </select>
              </div>
            )}
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
          <div className="grid grid-cols-4 gap-4">
            {['sl','ml','el','dl'].map(type => {
              const remaining = parseFloat(editBalance[`${type}_entitled`] || 0) - parseFloat(editBalance[`${type}_used`] || 0);
              const used = parseFloat(editBalance[`${type}_used`] || 0);
              
              return (
                <React.Fragment key={type}>
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>{type.toUpperCase()} (REMAINING)</label>
                    <input type="number" min="-100" step="0.5" className="input w-full" placeholder="0" 
                      value={remaining === 0 ? '' : remaining}
                      onChange={e => setEditBalance({...editBalance, [`${type}_entitled`]: (e.target.value === '' ? 0 : parseFloat(e.target.value)) + used})}
                      style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color:'rgba(22,38,96,0.5)' }}>{type.toUpperCase()} USED</label>
                    <input type="number" min="0" step="0.5" className="input w-full" placeholder="0" 
                      value={used === 0 ? '' : used}
                      onChange={e => setEditBalance({...editBalance, [`${type}_used`]: e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value))})}
                      style={{ background:'#fff', border:'1px solid rgba(22,38,96,0.12)', color:'#162660', borderRadius:'10px', padding:'10px 12px' }} />
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div className="flex gap-3 mt-5">
            <button className="flex-1 font-semibold py-3.5 rounded-xl transition-all"
              style={{ background:'#162660', color:'#FEFEFA' }}
              onClick={async ()=>{
                try {
                  const cleanBalance = { ...editBalance };
                  Object.keys(cleanBalance).forEach(k => { if (k.includes('entitled') || k.includes('used')) cleanBalance[k] = cleanBalance[k] || 0; });
                  await leaveAPI.updateBalance(cleanBalance.emp_id, cleanBalance);
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




