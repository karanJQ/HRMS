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
    <Layout title="Attendance & Leave Management">
      {msg && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-900/50 text-red-200 border border-red-500/30':'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30'}`}>{msg}</div>}
      <div className="flex flex-wrap gap-3 mb-5 border-b border-white/10 pb-4 items-center">
        {[
          { id: 'applications', label: 'Leave Applications' },
          { id: 'balance', label: 'Leave Balance' },
          { id: 'biometrics', label: 'Daily Attendance' },
          { id: 'regularize', label: 'Regularization' },
          ...(isMin('hr_staff') ? [{ id: 'settings', label: 'Shift Settings' }] : [])
        ].map(t=>(
          <button key={t.id} className={`tab ${tab===t.id?'bg-indigo-600 text-white':'text-slate-400 hover:text-white'}`} onClick={()=>setTab(t.id)}>
            {t.label}
          </button>
        ))}
        <div className="flex gap-2 ml-auto">
          <button className="btn btn-secondary" onClick={()=>setShowRegForm(true)}><Plus size={16}/>Request Regularization</button>
          <button className="btn btn-primary" onClick={()=>setShowForm(true)}><Plus size={16}/>Apply Leave</button>
        </div>
      </div>

      {loading ? <Loader /> : tab==='applications' ? (<>
        <div className="grid grid-cols-4 gap-4 mb-5">
          <StatsCard title="Total" value={leaves.length} icon={Calendar} color="#818cf8"/>
          <StatsCard title="Pending" value={leaves.filter(l=>l.status==='Pending').length} icon={Calendar} color="#fbbf24"/>
          <StatsCard title="Approved" value={leaves.filter(l=>l.status==='Approved').length} icon={Calendar} color="#34d399"/>
          <StatsCard title="Rejected" value={leaves.filter(l=>l.status==='Rejected').length} icon={Calendar} color="#f87171"/>
        </div>
        <div className="glass-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Dept</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{leaves.map(l=>(
                <tr key={l.id}>
                  <td><div className="font-medium text-white">{l.emp_name}</div><div className="text-xs text-slate-400">{l.emp_id}</div></td>
                  <td className="text-xs text-slate-400">{l.dept_name}</td>
                  <td><span className="bg-indigo-900/30 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded text-xs">{l.leave_type}</span></td>
                  <td>{l.from_date?.split('T')[0]}</td><td>{l.to_date?.split('T')[0]}</td>
                  <td className="font-semibold text-white">{l.days}</td>
                  <td className="text-slate-400 text-sm max-w-xs truncate">{l.reason}</td>
                  <td><Badge text={l.status}/></td>
                  <td>{l.status==='Pending' && isMin('hr_staff') && (
                    <div className="flex gap-1">
                      <button className="btn btn-success" style={{padding:'3px 8px',fontSize:11}} onClick={()=>review(l.id,'Approved')}><Check size={12}/></button>
                      <button className="btn btn-danger" style={{padding:'3px 8px',fontSize:11}} onClick={()=>review(l.id,'Rejected')}><X size={12}/></button>
                    </div>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </>) : tab === 'balance' ? (
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">Leave Balance Register — {new Date().getFullYear()}</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Dept</th><th>CL</th><th>EL</th><th>ML</th><th>CL Used</th><th>EL Used</th><th>ML Used</th></tr></thead>
              <tbody>{balances.map(b=>(
                <tr key={b.id}>
                  <td><div className="font-medium text-white">{b.emp_name}</div><div className="text-xs text-slate-400">{b.emp_id}</div></td>
                  <td className="text-slate-400">{b.dept_name}</td>
                  <td className="font-semibold text-emerald-400">{b.cl_entitled}</td>
                  <td className="font-semibold text-blue-400">{b.el_entitled}</td>
                  <td className="font-semibold text-purple-400">{b.ml_entitled}</td>
                  <td className="text-red-400">{b.cl_used}</td>
                  <td className="text-red-400">{b.el_used}</td>
                  <td className="text-red-400">{b.ml_used}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : tab === 'biometrics' ? (
        <div className="glass-card">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white mb-0">Daily Attendance Log</h3>
              {user?.role !== 'employee' && (
                <select
                  className="text-xs border border-white/20 bg-slate-800 text-white rounded px-3 py-1.5 outline-none ml-4"
                  value={selectedEmpId}
                  onChange={e => {
                    setSelectedEmpId(e.target.value);
                    loadAttendanceOnly(e.target.value);
                  }}
                >
                  <option value="" className="bg-slate-800">-- Select Employee --</option>
                  {employees.map(e => (
                    <option key={e.emp_id} value={e.emp_id} className="bg-slate-800">
                      {e.first_name} {e.last_name} ({e.emp_id})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button className="btn btn-success" onClick={syncBiometrics} disabled={user?.role !== 'employee' && !selectedEmpId}>
              <Fingerprint size={16} className="mr-1 inline" /> Simulate Biometric Punch
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Punch In</th><th>Punch Out</th><th>Status</th><th>Biometric Sync</th></tr></thead>
              <tbody>
                {attendanceRecords.length === 0 ? (
                  <tr><td colSpan="5" className="text-center text-slate-500 py-8">No attendance records found for this month</td></tr>
                ) : attendanceRecords.map(a => (
                  <tr key={a.id}>
                    <td className="text-white">{new Date(a.date).toLocaleDateString()}</td>
                    <td>{a.punch_in || '--:--'}</td>
                    <td>{a.punch_out || '--:--'}</td>
                    <td><span className={`px-2 py-1 rounded text-xs border ${a.status === 'Present' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-500/30' : a.status === 'Late' ? 'bg-amber-900/30 text-amber-300 border-amber-500/30' : 'bg-red-900/30 text-red-300 border-red-500/30'}`}>{a.status}</span></td>
                    <td>{a.biometric_sync ? <Check size={16} className="text-emerald-400"/> : <X size={16} className="text-red-400"/>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'regularize' ? (
        <div className="glass-card">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white mb-0">Regularization Requests</h3>
            <button className="btn btn-secondary" onClick={()=>setShowRegForm(true)}>
              <Plus size={16} className="mr-1 inline" /> Request Regularization
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {user?.role !== 'employee' && <th>Employee</th>}
                  <th>Date</th>
                  <th>Requested In</th>
                  <th>Requested Out</th>
                  <th>Reason</th>
                  <th>Status</th>
                  {isMin('hr_staff') && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {regularizations.length === 0 ? (
                  <tr><td colSpan={user?.role !== 'employee' ? 7 : 6} className="text-center text-slate-500 py-8">No regularization requests found</td></tr>
                ) : regularizations.map(r => (
                  <tr key={r.id}>
                    {user?.role !== 'employee' && (
                      <td>
                        <div className="font-medium text-white">{r.first_name} {r.last_name}</div>
                        <div className="text-xs text-slate-400">{r.emp_id}</div>
                      </td>
                    )}
                    <td className="text-white">{new Date(r.date).toLocaleDateString()}</td>
                    <td>{r.requested_in || '--:--'}</td>
                    <td>{r.requested_out || '--:--'}</td>
                    <td className="text-slate-400 text-sm max-w-xs truncate">{r.reason}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs border ${
                        r.status === 'Approved' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-500/30' :
                        r.status === 'Pending' ? 'bg-amber-900/30 text-amber-300 border-amber-500/30' :
                        'bg-red-900/30 text-red-300 border-red-500/30'
                      }`}>{r.status}</span>
                    </td>
                    {isMin('hr_staff') && (
                      <td>
                        {r.status === 'Pending' && (
                          <div className="flex gap-1">
                            <button className="btn btn-success" style={{padding:'3px 8px',fontSize:11}} onClick={()=>reviewRegularization(r.id, 'Approved')}><Check size={12}/></button>
                            <button className="btn btn-danger" style={{padding:'3px 8px',fontSize:11}} onClick={()=>reviewRegularization(r.id, 'Rejected')}><X size={12}/></button>
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
        <div className="glass-card max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Settings size={20} className="text-indigo-400"/>
            <h3 className="text-lg font-semibold text-white mb-0">Shift & Grace Period Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Shift Start Time (HH:MM:SS)</label>
              <input type="time" className="input" step="1" value={settings.shift_start} onChange={e=>setSettings({...settings, shift_start:e.target.value})}/>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Shift End Time (HH:MM:SS)</label>
              <input type="time" className="input" step="1" value={settings.shift_end} onChange={e=>setSettings({...settings, shift_end:e.target.value})}/>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Grace Period (Minutes)</label>
              <input type="number" className="input" value={settings.grace_period_mins} onChange={e=>setSettings({...settings, grace_period_mins:parseInt(e.target.value)||0})}/>
            </div>
            <button className="btn btn-primary w-full mt-6" onClick={saveSettings}>Save Shift Settings</button>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title="Apply for Leave" onClose={()=>setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            {user.role!=='employee' && (
              <div className="col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Employee ID</label>
                <input
                  className="input"
                  list="employee-ids"
                  value={form.emp_id}
                  onChange={e=>setForm({...form,emp_id:e.target.value})}
                  placeholder="EMP00001"
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
              <label className="text-xs text-slate-400 block mb-1">Leave Type</label>
              <select className="input" value={form.leave_type} onChange={e=>setForm({...form,leave_type:e.target.value})}>
                {['CL','EL','ML','Maternity','Paternity','CCL','Study Leave','LWP','Compensatory','WFH','Outdoor Duty'].map(t=><option key={t} className="bg-slate-800">{t}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-400 block mb-1">Days: {days(form.from_date,form.to_date)||'—'}</label></div>
            <div><label className="text-xs text-slate-400 block mb-1">From Date</label><input type="date" className="input" value={form.from_date} onChange={e=>setForm({...form,from_date:e.target.value})}/></div>
            <div><label className="text-xs text-slate-400 block mb-1">To Date</label><input type="date" className="input" value={form.to_date} onChange={e=>setForm({...form,to_date:e.target.value})}/></div>
            <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Reason</label><textarea className="input min-h-[100px]" rows={3} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></div>
          </div>
          <button className="btn btn-primary w-full mt-4" onClick={submit}>Submit Application</button>
        </Modal>
      )}

      {showRegForm && (
        <Modal title="Request Attendance Regularization" onClose={()=>setShowRegForm(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Missed Date</label>
              <input type="date" className="input" value={regForm.date} onChange={e=>setRegForm({...regForm, date:e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Requested Punch In Time</label>
                <input type="time" className="input" value={regForm.requested_in} onChange={e=>setRegForm({...regForm, requested_in:e.target.value})}/>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Requested Punch Out Time</label>
                <input type="time" className="input" value={regForm.requested_out} onChange={e=>setRegForm({...regForm, requested_out:e.target.value})}/>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Reason for Regularization</label>
              <textarea className="input min-h-[80px]" rows={3} value={regForm.reason} onChange={e=>setRegForm({...regForm, reason:e.target.value})} placeholder="e.g. Forgot to punch, biometric system down, etc."/>
            </div>
          </div>
          <button className="btn btn-primary w-full mt-4" onClick={submitRegularization} disabled={!regForm.date || !regForm.reason}>Submit Request</button>
        </Modal>
      )}
    </Layout>
  );
}