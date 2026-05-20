import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import StatsCard from '../components/common/StatsCard';
import Loader from '../components/common/Loader';
import { Calendar, Plus, Check, X } from 'lucide-react';
import { leaveAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function Attendance() {
  const { isMin, user } = useAuth();
  const [tab, setTab] = useState('applications');
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ emp_id:'', leave_type:'CL', from_date:'', to_date:'', reason:'' });
  const days = (f,t) => f&&t ? Math.max(0, Math.ceil((new Date(t)-new Date(f))/86400000)+1) : 0;

  const load = () => {
    setLoading(true);
    Promise.all([
      leaveAPI.listApplications(),
      leaveAPI.listBalances()
    ]).then(([l,b]) => { setLeaves(l.data.data||[]); setBalances(b.data.data||[]); })
    .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const review = async (id, status) => {
    try { await leaveAPI.review(id, { status }); setMsg(`Leave ${status.toLowerCase()}`); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
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

  return (
    <Layout title="Attendance & Leave Management">
      {msg && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>{msg}</div>}
      <div className="flex gap-3 mb-5">
        {['applications','balance'].map(t=>(
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t==='applications'?'Leave Applications':'Leave Balance'}
          </button>
        ))}
        <button className="btn btn-primary ml-auto" onClick={()=>setShowForm(true)}><Plus size={16}/>Apply Leave</button>
      </div>

      {loading ? <Loader /> : tab==='applications' ? (<>
        <div className="grid grid-cols-4 gap-4 mb-5">
          <StatsCard title="Total" value={leaves.length} icon={Calendar} color="#3b82f6"/>
          <StatsCard title="Pending" value={leaves.filter(l=>l.status==='Pending').length} icon={Calendar} color="#f59e0b"/>
          <StatsCard title="Approved" value={leaves.filter(l=>l.status==='Approved').length} icon={Calendar} color="#22c55e"/>
          <StatsCard title="Rejected" value={leaves.filter(l=>l.status==='Rejected').length} icon={Calendar} color="#ef4444"/>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Dept</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{leaves.map(l=>(
                <tr key={l.id}>
                  <td><div className="font-medium">{l.emp_name}</div><div className="text-xs text-gray-400">{l.emp_id}</div></td>
                  <td className="text-xs text-gray-500">{l.dept_name}</td>
                  <td><span className="badge" style={{background:'#dbeafe',color:'#1e40af'}}>{l.leave_type}</span></td>
                  <td>{l.from_date?.split('T')[0]}</td><td>{l.to_date?.split('T')[0]}</td>
                  <td className="font-semibold">{l.days}</td>
                  <td className="text-gray-500 text-sm max-w-xs truncate">{l.reason}</td>
                  <td><Badge text={l.status}/></td>
                  <td>{l.status==='Pending' && isMin('hr_staff') && (
                    <div className="flex gap-1">
                      <button className="btn btn-success" style={{padding:'3px 8px',fontSize:11}} onClick={()=>review(l.id,'Approved')}><Check size={12}/>OK</button>
                      <button className="btn btn-danger" style={{padding:'3px 8px',fontSize:11}} onClick={()=>review(l.id,'Rejected')}><X size={12}/>No</button>
                    </div>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </>) : (
        <div className="card">
          <h3 className="section-title">Leave Balance Register — {new Date().getFullYear()}</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Dept</th><th>CL</th><th>EL</th><th>ML</th><th>CL Used</th><th>EL Used</th><th>ML Used</th></tr></thead>
              <tbody>{balances.map(b=>(
                <tr key={b.id}>
                  <td><div className="font-medium">{b.emp_name}</div><div className="text-xs text-gray-400">{b.emp_id}</div></td>
                  <td>{b.dept_name}</td>
                  <td className="font-semibold text-green-600">{b.cl_entitled}</td>
                  <td className="font-semibold text-blue-600">{b.el_entitled}</td>
                  <td className="font-semibold text-purple-600">{b.ml_entitled}</td>
                  <td className="text-red-500">{b.cl_used}</td>
                  <td className="text-red-500">{b.el_used}</td>
                  <td className="text-red-500">{b.ml_used}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title="Apply for Leave" onClose={()=>setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            {user.role!=='employee' && (
              <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Employee ID</label>
                <input className="input" value={form.emp_id} onChange={e=>setForm({...form,emp_id:e.target.value})} placeholder="EMP00001"/></div>
            )}
            <div><label className="text-xs text-gray-500 block mb-1">Leave Type</label>
              <select className="input" value={form.leave_type} onChange={e=>setForm({...form,leave_type:e.target.value})}>
                {['CL','EL','ML','Maternity','Paternity','CCL','Study Leave','LWP','Compensatory'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-gray-500 block mb-1">Days: {days(form.from_date,form.to_date)||'—'}</label></div>
            <div><label className="text-xs text-gray-500 block mb-1">From Date</label><input type="date" className="input" value={form.from_date} onChange={e=>setForm({...form,from_date:e.target.value})}/></div>
            <div><label className="text-xs text-gray-500 block mb-1">To Date</label><input type="date" className="input" value={form.to_date} onChange={e=>setForm({...form,to_date:e.target.value})}/></div>
            <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Reason</label><textarea className="input" rows={3} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></div>
          </div>
          <button className="btn btn-primary w-full mt-4" onClick={submit}>Submit Application</button>
        </Modal>
      )}
    </Layout>
  );
}