import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import StatsCard from '../components/common/StatsCard';
import Loader from '../components/common/Loader';
import { Calendar, Plus, Check, X, Fingerprint, Clock, Settings } from 'lucide-react';
import { leaveAPI, empAPI, attendanceAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function Attendance() {
  const { isMin, user } = useAuth();
  const [tab, setTab] = useState('applications');
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [settings, setSettings] = useState({ shift_start: '09:00:00', shift_end: '18:00:00', grace_period_mins: 30 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ emp_id:'', leave_type:'CL', from_date:'', to_date:'', reason:'' });
  const [regForm, setRegForm] = useState({ date: '', requested_in: '', requested_out: '', reason: '' });
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const days = (f,t) => f&&t ? Math.max(0, Math.ceil((new Date(t)-new Date(f))/86400000)+1) : 0;

  const loadAttendanceOnly = (empId) => {
    const activeEmpId = empId || (user?.role === 'employee' ? user.emp_id : selectedEmpId);
    if (!activeEmpId) {
      setAttendanceRecords([]);
      return;
    }
    attendanceAPI.get({ emp_id: activeEmpId })
      .then(r => setAttendanceRecords(r.data.data || []))
      .catch(() => setAttendanceRecords([]));
  };

  const loadRegularizations = () => {
    attendanceAPI.getRegularizations()
      .then(r => setRegularizations(r.data.data || []))
      .catch(() => setRegularizations([]));
  };

  const loadSettings = () => {
    attendanceAPI.getSettings()
      .then(r => {
        if (r.data.data) {
          setSettings(r.data.data);
        }
      })
      .catch(e => console.error(e));
  };

  const load = (empId) => {
    setLoading(true);
    const activeEmpId = empId !== undefined ? empId : (user?.role === 'employee' ? user.emp_id : selectedEmpId);
    Promise.all([
      leaveAPI.listApplications(),
      leaveAPI.listBalances(),
      activeEmpId ? attendanceAPI.get({ emp_id: activeEmpId }).catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
      attendanceAPI.getRegularizations().catch(() => ({ data: { data: [] } })),
      isMin('hr_staff') ? attendanceAPI.getSettings().catch(() => ({ data: { data: null } })) : Promise.resolve({ data: { data: null } })
    ]).then(([l,b,a, rReg, rSet]) => { 
      setLeaves(l.data.data||[]); 
      setBalances(b.data.data||[]); 
      setAttendanceRecords(a.data.data||[]);
      setRegularizations(rReg.data.data||[]);
      if (rSet.data.data) {
        setSettings(rSet.data.data);
      }
    })
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user && user.role !== 'employee') {
      empAPI.list({ limit: 100, status: 'Active' })
        .then(r => {
          const emps = r.data.data.employees || [];
          setEmployees(emps);
          if (emps.length > 0) {
            setSelectedEmpId(emps[0].emp_id);
            load(emps[0].emp_id);
          } else {
            load();
          }
        })
        .catch(e => {
          console.error(e);
          load();
        });
    } else {
      load(user?.emp_id);
    }
  }, []);

  const review = async (id, status) => {
    try { await leaveAPI.review(id, { status }); setMsg(`Leave ${status.toLowerCase()}`); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  const reviewRegularization = async (id, status) => {
    try {
      await attendanceAPI.reviewRegularization(id, { status });
      setMsg(`Regularization request ${status.toLowerCase()}`);
      load();
    } catch (e) {
      setMsg('Error: ' + e.response?.data?.message);
    }
  };

  const submit = async () => {
    try {
      const payload = user.role==='employee' ? { ...form, emp_id: user.emp_id } : form;
      await leaveAPI.apply(payload);
      setMsg('Leave application submitted'); setShowForm(false);
      setForm({ emp_id:'', leave_type:'CL', from_date:'', to_date:'', reason:'' });
      load();
    } catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  const submitRegularization = async () => {
    try {
      await attendanceAPI.applyRegularization(regForm);
      setMsg('Regularization request submitted'); setShowRegForm(false);
      setRegForm({ date: '', requested_in: '', requested_out: '', reason: '' });
      load();
    } catch (e) {
      setMsg('Error: ' + e.response?.data?.message);
    }
  };

  const saveSettings = async () => {
    try {
      await attendanceAPI.updateSettings(settings);
      setMsg('Shift settings updated successfully');
      load();
    } catch (e) {
      setMsg('Error: ' + e.response?.data?.message);
    }
  };

  const syncBiometrics = async () => {
    try {
      setLoading(true);
      const activeEmpId = user?.role === 'employee' ? user.emp_id : selectedEmpId;
      if (!activeEmpId) {
        setMsg('Error: Please select an employee first.');
        setLoading(false);
        return;
      }
      await attendanceAPI.sync({ emp_id: activeEmpId });
      setMsg('Biometric sync completed');
      loadAttendanceOnly(activeEmpId);
    } catch(e) {
      setMsg('Error: '+e.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Attendance & Leave Management" theme="light" bg="#F8F8FF">
      {msg && (
        <div 
          className={`px-4 py-3 rounded-xl text-sm mb-4 border transition-all duration-300 ${
            msg.startsWith('Error') 
              ? 'bg-red-50 text-red-800 border-red-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
          style={{
            boxShadow: '0 4px 12px rgba(22, 38, 96, 0.03)'
          }}
        >
          {msg}
        </div>
      )}
      <div className="flex flex-wrap gap-3 mb-5 pb-4 items-center" style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.08)' }}>
        {[
          { id: 'applications', label: 'Leave Applications' },
          { id: 'balance', label: 'Leave Balance' },
          { id: 'biometrics', label: 'Daily Attendance' },
          { id: 'regularize', label: 'Regularization' },
          ...(isMin('hr_staff') ? [{ id: 'settings', label: 'Shift Settings' }] : [])
        ].map(t=>(
          <button 
            key={t.id} 
            className="font-semibold transition-all duration-300"
            style={{
              padding: '8px 20px',
              borderRadius: '30px',
              fontSize: '14px',
              background: tab === t.id ? '#162660' : 'transparent',
              color: tab === t.id ? '#FEFEFA' : 'rgba(22, 38, 96, 0.6)',
              boxShadow: tab === t.id ? '0 4px 12px rgba(22, 38, 96, 0.15)' : 'none',
              border: tab === t.id ? '1px solid #162660' : '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (tab !== t.id) {
                e.currentTarget.style.color = '#162660';
                e.currentTarget.style.background = 'rgba(22, 38, 96, 0.04)';
              }
            }}
            onMouseLeave={(e) => {
              if (tab !== t.id) {
                e.currentTarget.style.color = 'rgba(22, 38, 96, 0.6)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
            onClick={()=>setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <div className="flex gap-2 ml-auto">
          <button 
            className="btn font-semibold transition-all duration-200" 
            style={{ 
              background: '#fff', 
              color: '#162660',
              border: '1px solid rgba(22, 38, 96, 0.2)',
              boxShadow: '0 4px 12px rgba(22, 38, 96, 0.05)'
            }}
            onClick={()=>setShowRegForm(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.2)';
            }}
          >
            <Plus size={16}/>Request Regularization
          </button>
          <button 
            className="btn font-semibold transition-all duration-200" 
            style={{ 
              background: '#162660', 
              color: '#FEFEFA',
              boxShadow: '0 4px 15px rgba(22, 38, 96, 0.2)'
            }}
            onClick={()=>setShowForm(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#68aae8';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 38, 96, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#162660';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(22, 38, 96, 0.2)';
            }}
          >
            <Plus size={16}/>Apply Leave
          </button>
        </div>
      </div>

      {loading ? <Loader /> : tab==='applications' ? (<>
        <div className="grid grid-cols-4 gap-4 mb-5">
          <StatsCard title="Total" value={leaves.length} icon={Calendar} color="#818cf8" theme="light" delay={0}/>
          <StatsCard title="Pending" value={leaves.filter(l=>l.status==='Pending').length} icon={Calendar} color="#fbbf24" theme="light" delay={60}/>
          <StatsCard title="Approved" value={leaves.filter(l=>l.status==='Approved').length} icon={Calendar} color="#34d399" theme="light" delay={120}/>
          <StatsCard title="Rejected" value={leaves.filter(l=>l.status==='Rejected').length} icon={Calendar} color="#f87171" theme="light" delay={180}/>
        </div>
        <div 
          className="hover-card animate-slide-up"
          style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid rgba(22, 38, 96, 0.1)', 
            boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)',
            animationDelay: '240ms'
          }}
        >
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['Employee', 'Dept', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{leaves.map((l, idx)=>(
                <tr 
                  key={l.id}
                  className="transition-all duration-300"
                  style={{ 
                    borderBottom: '1px solid rgba(22, 38, 96, 0.05)',
                    animationDelay: `${idx * 30}ms`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td>
                    <div className="font-medium" style={{ color: '#162660' }}>{l.emp_name}</div>
                    <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{l.emp_id}</div>
                  </td>
                  <td className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{l.dept_name}</td>
                  <td>
                    <span 
                      style={{ 
                        background: 'rgba(79, 70, 229, 0.08)', 
                        color: '#4f46e5', 
                        border: '1px solid rgba(79, 70, 229, 0.2)', 
                        padding: '3px 8px', 
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                      className="inline-block"
                    >
                      {l.leave_type}
                    </span>
                  </td>
                  <td style={{ color: '#162660' }}>{l.from_date?.split('T')[0]}</td>
                  <td style={{ color: '#162660' }}>{l.to_date?.split('T')[0]}</td>
                  <td className="font-semibold" style={{ color: '#162660' }}>{l.days}</td>
                  <td style={{ color: 'rgba(22, 38, 96, 0.6)' }} className="text-sm max-w-xs truncate">{l.reason}</td>
                  <td><Badge text={l.status}/></td>
                  <td>{l.status==='Pending' && isMin('hr_staff') && (
                    <div className="flex gap-1.5">
                      <button 
                        className="btn btn-success" 
                        style={{ padding: '6px 10px', borderRadius: '8px', fontSize: 11, boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)' }} 
                        onClick={()=>review(l.id,'Approved')}
                      >
                        <Check size={12}/>
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '6px 10px', borderRadius: '8px', fontSize: 11, boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)' }} 
                        onClick={()=>review(l.id,'Rejected')}
                      >
                        <X size={12}/>
                      </button>
                    </div>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </>) : tab === 'balance' ? (
        <div 
          className="hover-card animate-slide-up"
          style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid rgba(22, 38, 96, 0.1)', 
            boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)',
            animationDelay: '100ms'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Leave Balance Register — {new Date().getFullYear()}</h3>
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['Employee', 'Dept', 'CL', 'EL', 'ML', 'CL Used', 'EL Used', 'ML Used'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{balances.map((b, idx)=>(
                <tr 
                  key={b.id}
                  className="transition-all duration-300"
                  style={{ 
                    borderBottom: '1px solid rgba(22, 38, 96, 0.05)',
                    animationDelay: `${idx * 30}ms`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td>
                    <div className="font-medium" style={{ color: '#162660' }}>{b.emp_name}</div>
                    <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{b.emp_id}</div>
                  </td>
                  <td style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{b.dept_name}</td>
                  <td className="font-semibold text-emerald-600">{b.cl_entitled}</td>
                  <td className="font-semibold text-blue-600">{b.el_entitled}</td>
                  <td className="font-semibold text-purple-600">{b.ml_entitled}</td>
                  <td className="text-red-500 font-medium">{b.cl_used}</td>
                  <td className="text-red-500 font-medium">{b.el_used}</td>
                  <td className="text-red-500 font-medium">{b.ml_used}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : tab === 'biometrics' ? (
        <div 
          className="hover-card animate-slide-up"
          style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid rgba(22, 38, 96, 0.1)', 
            boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)',
            animationDelay: '100ms'
          }}
        >
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold mb-0" style={{ color: '#162660' }}>Daily Attendance Log</h3>
              {user?.role !== 'employee' && (
                <select
                  className="text-xs rounded-lg px-3 py-2 outline-none ml-4 font-semibold transition-all duration-200"
                  style={{
                    border: '1px solid rgba(22, 38, 96, 0.15)',
                    background: '#fff',
                    color: '#162660',
                    boxShadow: '0 2px 8px rgba(22, 38, 96, 0.04)'
                  }}
                  value={selectedEmpId}
                  onChange={e => {
                    setSelectedEmpId(e.target.value);
                    loadAttendanceOnly(e.target.value);
                  }}
                >
                  <option value="" style={{ color: '#162660', background: '#fff' }}>-- Select Employee --</option>
                  {employees.map(e => (
                    <option key={e.emp_id} value={e.emp_id} style={{ color: '#162660', background: '#fff' }}>
                      {e.first_name} {e.last_name} ({e.emp_id})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button 
              className="btn font-semibold transition-all duration-200" 
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#fff',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.2)';
              }}
              onClick={syncBiometrics} 
              disabled={user?.role !== 'employee' && !selectedEmpId}
            >
              <Fingerprint size={16} className="mr-1 inline" /> Simulate Biometric Punch
            </button>
          </div>
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['Date', 'Punch In', 'Punch Out', 'Status', 'Biometric Sync'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.length === 0 ? (
                  <tr><td colSpan="5" className="text-center text-slate-500 py-8">No attendance records found for this month</td></tr>
                ) : attendanceRecords.map((a, idx) => (
                  <tr 
                    key={a.id}
                    className="transition-all duration-300"
                    style={{ 
                      borderBottom: '1px solid rgba(22, 38, 96, 0.05)',
                      animationDelay: `${idx * 20}ms`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ color: '#162660' }}>{new Date(a.date).toLocaleDateString()}</td>
                    <td style={{ color: '#162660' }}>{a.punch_in || '--:--'}</td>
                    <td style={{ color: '#162660' }}>{a.punch_out || '--:--'}</td>
                    <td>
                      <span 
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border"
                        style={{
                          background: a.status === 'Present' ? 'rgba(16, 185, 129, 0.08)' : a.status === 'Late' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                          color: a.status === 'Present' ? '#065f46' : a.status === 'Late' ? '#92400e' : '#991b1b',
                          borderColor: a.status === 'Present' ? 'rgba(16, 185, 129, 0.2)' : a.status === 'Late' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td>{a.biometric_sync ? <Check size={16} className="text-emerald-600"/> : <X size={16} className="text-red-600"/>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'regularize' ? (
        <div 
          className="hover-card animate-slide-up"
          style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid rgba(22, 38, 96, 0.1)', 
            boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)',
            animationDelay: '100ms'
          }}
        >
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <h3 className="text-lg font-semibold mb-0" style={{ color: '#162660' }}>Regularization Requests</h3>
            <button 
              className="btn font-semibold transition-all duration-200" 
              style={{ 
                background: '#fff', 
                color: '#162660',
                border: '1px solid rgba(22, 38, 96, 0.2)',
                boxShadow: '0 4px 12px rgba(22, 38, 96, 0.05)'
              }}
              onClick={()=>setShowRegForm(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.2)';
              }}
            >
              <Plus size={16} className="mr-1 inline" /> Request Regularization
            </button>
          </div>
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {user?.role !== 'employee' && <th style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>Employee</th>}
                  {['Date', 'Requested In', 'Requested Out', 'Reason', 'Status'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                  ))}
                  {isMin('hr_staff') && <th style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {regularizations.length === 0 ? (
                  <tr><td colSpan={user?.role !== 'employee' ? 7 : 6} className="text-center text-slate-500 py-8">No regularization requests found</td></tr>
                ) : regularizations.map((r, idx) => (
                  <tr 
                    key={r.id}
                    className="transition-all duration-300"
                    style={{ 
                      borderBottom: '1px solid rgba(22, 38, 96, 0.05)',
                      animationDelay: `${idx * 20}ms`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {user?.role !== 'employee' && (
                      <td>
                        <div className="font-medium" style={{ color: '#162660' }}>{r.first_name} {r.last_name}</div>
                        <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{r.emp_id}</div>
                      </td>
                    )}
                    <td style={{ color: '#162660' }}>{new Date(r.date).toLocaleDateString()}</td>
                    <td style={{ color: '#162660' }}>{r.requested_in || '--:--'}</td>
                    <td style={{ color: '#162660' }}>{r.requested_out || '--:--'}</td>
                    <td style={{ color: 'rgba(22, 38, 96, 0.6)' }} className="text-sm max-w-xs truncate">{r.reason}</td>
                    <td>
                      <span 
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border"
                        style={{
                          background: r.status === 'Approved' ? 'rgba(16, 185, 129, 0.08)' : r.status === 'Pending' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                          color: r.status === 'Approved' ? '#065f46' : r.status === 'Pending' ? '#92400e' : '#991b1b',
                          borderColor: r.status === 'Approved' ? 'rgba(16, 185, 129, 0.2)' : r.status === 'Pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    {isMin('hr_staff') && (
                      <td>
                        {r.status === 'Pending' && (
                          <div className="flex gap-1.5">
                            <button 
                              className="btn btn-success" 
                              style={{ padding: '6px 10px', borderRadius: '8px', fontSize: 11, boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)' }} 
                              onClick={()=>reviewRegularization(r.id, 'Approved')}
                            >
                              <Check size={12}/>
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '6px 10px', borderRadius: '8px', fontSize: 11, boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)' }} 
                              onClick={()=>reviewRegularization(r.id, 'Rejected')}
                            >
                              <X size={12}/>
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div 
          className="hover-card animate-slide-up max-w-md mx-auto"
          style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '30px', 
            border: '1px solid rgba(22, 38, 96, 0.1)', 
            boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)',
            animationDelay: '100ms'
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Settings size={20} style={{ color: '#4F46E5' }}/>
            <h3 className="text-lg font-semibold mb-0" style={{ color: '#162660' }}>Shift & Grace Period Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Shift Start Time (HH:MM:SS)</label>
              <input 
                type="time" 
                className="input" 
                step="1" 
                value={settings.shift_start} 
                onChange={e=>setSettings({...settings, shift_start:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Shift End Time (HH:MM:SS)</label>
              <input 
                type="time" 
                className="input" 
                step="1" 
                value={settings.shift_end} 
                onChange={e=>setSettings({...settings, shift_end:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Grace Period (Minutes)</label>
              <input 
                type="number" 
                className="input" 
                value={settings.grace_period_mins} 
                onChange={e=>setSettings({...settings, grace_period_mins:parseInt(e.target.value)||0})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <button 
              className="btn w-full mt-6 font-semibold transition-all duration-200" 
              style={{
                background: '#162660',
                color: '#FEFEFA',
                boxShadow: '0 4px 15px rgba(22, 38, 96, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#68aae8';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 38, 96, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#162660';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(22, 38, 96, 0.2)';
              }}
              onClick={saveSettings}
            >
              Save Shift Settings
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title="Apply for Leave" onClose={()=>setShowForm(false)} theme="light">
          <div className="grid grid-cols-2 gap-3">
            {user.role!=='employee' && (
              <div className="col-span-2">
                <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Employee ID</label>
                <input
                  className="input"
                  list="employee-ids"
                  value={form.emp_id}
                  onChange={e=>setForm({...form,emp_id:e.target.value})}
                  placeholder="EMP00001"
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(22, 38, 96, 0.15)',
                    color: '#162660'
                  }}
                />
                <datalist id="employee-ids">
                  {employees.map(e => (
                    <option key={e.emp_id} value={e.emp_id}>
                      {e.first_name} {e.last_name} ({e.dept_name})
                    </option>
                  ))}
                </datalist>
              </div>
            )}
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Leave Type</label>
              <select 
                className="input" 
                value={form.leave_type} 
                onChange={e=>setForm({...form,leave_type:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              >
                {['CL','EL','ML','Maternity','Paternity','CCL','Study Leave','LWP','Compensatory','WFH','Outdoor Duty'].map(t => (
                  <option key={t} style={{ color: '#162660', background: '#fff' }}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>
                Days: {days(form.from_date,form.to_date)||'—'}
              </label>
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>From Date</label>
              <input 
                type="date" 
                className="input" 
                value={form.from_date} 
                onChange={e=>setForm({...form,from_date:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>To Date</label>
              <input 
                type="date" 
                className="input" 
                value={form.to_date} 
                onChange={e=>setForm({...form,to_date:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Reason</label>
              <textarea 
                className="input min-h-[100px]" 
                rows={3} 
                value={form.reason} 
                onChange={e=>setForm({...form,reason:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
          </div>
          <button 
            className="btn w-full mt-4 font-semibold transition-all duration-200" 
            style={{
              background: '#162660',
              color: '#FEFEFA',
              boxShadow: '0 4px 15px rgba(22, 38, 96, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#68aae8';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 38, 96, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#162660';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(22, 38, 96, 0.2)';
            }}
            onClick={submit}
          >
            Submit Application
          </button>
        </Modal>
      )}

      {showRegForm && (
        <Modal title="Request Attendance Regularization" onClose={()=>setShowRegForm(false)} theme="light">
          <div className="space-y-3">
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Missed Date</label>
              <input 
                type="date" 
                className="input" 
                value={regForm.date} 
                onChange={e=>setRegForm({...regForm, date:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Requested Punch In Time</label>
                <input 
                  type="time" 
                  className="input" 
                  value={regForm.requested_in} 
                  onChange={e=>setRegForm({...regForm, requested_in:e.target.value})}
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(22, 38, 96, 0.15)',
                    color: '#162660'
                  }}
                />
              </div>
              <div>
                <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Requested Punch Out Time</label>
                <input 
                  type="time" 
                  className="input" 
                  value={regForm.requested_out} 
                  onChange={e=>setRegForm({...regForm, requested_out:e.target.value})}
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(22, 38, 96, 0.15)',
                    color: '#162660'
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Reason for Regularization</label>
              <textarea 
                className="input min-h-[80px]" 
                rows={3} 
                value={regForm.reason} 
                onChange={e=>setRegForm({...regForm, reason:e.target.value})} 
                placeholder="e.g. Forgot to punch, biometric system down, etc."
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
          </div>
          <button 
            className="btn w-full mt-4 font-semibold transition-all duration-200" 
            style={{
              background: '#162660',
              color: '#FEFEFA',
              boxShadow: '0 4px 15px rgba(22, 38, 96, 0.2)'
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.background = '#68aae8';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 38, 96, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#162660';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(22, 38, 96, 0.2)';
            }}
            onClick={submitRegularization} 
            disabled={!regForm.date || !regForm.reason}
          >
            Submit Request
          </button>
        </Modal>
      )}
    </Layout>
  );
}