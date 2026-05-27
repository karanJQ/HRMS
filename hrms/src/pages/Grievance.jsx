import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { Plus, AlertTriangle, Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import StatsCard from '../components/common/StatsCard';
import { grievanceAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function Grievance() {
  const { isMin, user } = useAuth();
  const [tab, setTab] = useState('grievance');
  const [grievances, setGrievances] = useState([]);
  const [disc, setDisc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDiscForm, setShowDiscForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ emp_id:'', grievance_type:'Service Matter', subject:'', description:'', priority:'Medium' });
  const [discForm, setDiscForm] = useState({ emp_id:'', charge_description:'', incident_date:'', case_start_date:'', inquiry_officer_name:'' });

  const load = () => {
    setLoading(true);
    Promise.all([grievanceAPI.list(), isMin('hr_staff') ? grievanceAPI.listDisc() : Promise.resolve({data:{data:[]}})])
      .then(([g,d])=>{ setGrievances(g.data.data||[]); setDisc(d.data.data||[]); })
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const assign = async (id) => {
    try { await grievanceAPI.assign(id,{ assigned_to: user.id }); setMsg('Grievance assigned'); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };
  const resolve = async (id) => {
    try { await grievanceAPI.resolve(id,{ resolution_remarks:'Resolved by HR' }); setMsg('Grievance resolved'); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };
  const submitGrievance = async () => {
    try {
      const payload = user.role==='employee' ? { ...form, emp_id: user.emp_id } : form;
      await grievanceAPI.create(payload); setMsg('Grievance submitted'); setShowForm(false);
      setForm({ emp_id:'', grievance_type:'Service Matter', subject:'', description:'', priority:'Medium' }); load();
    } catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };
  const submitDisc = async () => {
    try { await grievanceAPI.createDisc(discForm); setMsg('Case registered'); setShowDiscForm(false); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  const pColor = { High:'#fee2e2:#991b1b', Medium:'#fef9c3:#854d0e', Low:'#f1f5f9:#475569' };

  return (
    <Layout title="Grievance & Disciplinary" theme="light">
      {msg && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-50 text-red-800 border border-red-200':'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>{msg}</div>}
      <div className="flex gap-3 mb-5">
        <button className={`tab ${tab==='grievance'?'active':''}`} onClick={()=>setTab('grievance')}><AlertTriangle size={13} className="inline mr-1"/>Grievances</button>
        {isMin('hr_staff') && <button className={`tab ${tab==='disciplinary'?'active':''}`} onClick={()=>setTab('disciplinary')}><Shield size={13} className="inline mr-1"/>Disciplinary</button>}
        <button className="btn btn-primary ml-auto" onClick={()=>tab==='grievance'?setShowForm(true):setShowDiscForm(true)}>
          <Plus size={16}/>{tab==='grievance'?'New Grievance':'New Case'}
        </button>
      </div>

      {loading ? <Loader/> : tab==='grievance' ? (
        <>
          <div className="grid grid-cols-4 gap-4 mb-5">
            <StatsCard title="Pending" value={grievances.filter(g=>g.status==='Pending').length} icon={AlertCircle} color="#f59e0b" theme="light" delay={0} />
            <StatsCard title="Under Review" value={grievances.filter(g=>g.status==='Under Review').length} icon={Clock} color="#3b82f6" theme="light" delay={60} />
            <StatsCard title="Resolved" value={grievances.filter(g=>g.status==='Resolved').length} icon={CheckCircle} color="#10b981" theme="light" delay={120} />
            <StatsCard title="Escalated" value={grievances.filter(g=>g.status==='Escalated').length} icon={AlertTriangle} color="#ef4444" theme="light" delay={180} />
          </div>
          <div 
            className="hover-card animate-slide-up"
            style={{ 
              background: '#fff', 
              borderRadius: '16px', 
              padding: '24px', 
              border: '1px solid rgba(22, 38, 96, 0.1)', 
              boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)'
            }}
          >
            <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                    {['Employee', 'Dept', 'Type', 'Subject', 'Date', 'Priority', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{grievances.map(g=>{
                  const [bg,col]=(pColor[g.priority]||'#f1f5f9:#475569').split(':');
                  return (
                    <tr 
                      key={g.id}
                      className="transition-all duration-300"
                      style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.05)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{ color: '#162660' }}>
                        <div className="font-medium">{g.emp_name}</div>
                        <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.4)' }}>{g.emp_id}</div>
                      </td>
                      <td style={{ color: '#162660' }}>{g.dept_name}</td>
                      <td className="text-sm" style={{ color: '#162660' }}>{g.grievance_type}</td>
                      <td className="text-sm max-w-xs truncate" style={{ color: '#162660' }}>{g.subject}</td>
                      <td className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>{g.submission_date?.split('T')[0]}</td>
                      <td><span className="badge" style={{background:bg,color:col}}>{g.priority}</span></td>
                      <td><Badge text={g.status}/></td>
                      <td>
                        {g.status==='Pending' && isMin('hr_staff') && <button className="btn btn-primary" style={{padding:'4px 10px',fontSize:11}} onClick={()=>assign(g.id)}>Assign</button>}
                        {g.status==='Under Review' && isMin('hr_staff') && <button className="btn btn-success" style={{padding:'4px 10px',fontSize:11}} onClick={()=>resolve(g.id)}>Resolve</button>}
                        {g.status==='Resolved' && <span className="text-xs text-green-600 font-medium">✓ Closed</span>}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div 
          className="hover-card animate-slide-up"
          style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid rgba(22, 38, 96, 0.1)', 
            boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Disciplinary Cases</h3>
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['Case ID', 'Employee', 'Dept', 'Charge', 'Start Date', 'Inquiry Officer', 'Status', 'Penalty'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{disc.map(d=>(
                <tr 
                  key={d.id}
                  className="transition-all duration-300"
                  style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.05)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td className="font-mono text-xs text-red-600">{d.charge_sheet_number||d.id}</td>
                  <td style={{ color: '#162660' }}>
                    <div className="font-medium">{d.emp_name}</div>
                    <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.4)' }}>{d.emp_id}</div>
                  </td>
                  <td style={{ color: '#162660' }}>{d.dept_name}</td>
                  <td className="text-sm text-red-600 max-w-xs truncate">{d.charge_description}</td>
                  <td className="text-xs" style={{ color: '#162660' }}>{d.case_start_date?.split('T')[0]||'—'}</td>
                  <td className="text-sm" style={{ color: '#162660' }}>{d.inquiry_officer_name||'—'}</td>
                  <td><Badge text={d.status}/></td>
                  <td className="text-sm" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{d.penalty_type||'Pending'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title="Register Grievance" onClose={()=>setShowForm(false)} theme="light">
          <div className="grid grid-cols-2 gap-3">
            {user.role!=='employee' && <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Employee ID</label><input className="input" value={form.emp_id} onChange={e=>setForm({...form,emp_id:e.target.value})}/></div>}
            <div><label className="text-xs text-slate-400 block mb-1">Type</label>
              <select className="input" value={form.grievance_type} onChange={e=>setForm({...form,grievance_type:e.target.value})}>
                {['Service Matter','Workplace Issue','Transfer','Salary','Promotion','Other'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-400 block mb-1">Priority</label>
              <select className="input" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                {['High','Medium','Low'].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Subject</label><input className="input" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></div>
            <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Description</label><textarea className="input" rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
          </div>
          <button className="btn btn-primary w-full mt-4" onClick={submitGrievance}>Submit Grievance</button>
        </Modal>
      )}
      {showDiscForm && (
        <Modal title="Register Disciplinary Case" onClose={()=>setShowDiscForm(false)} theme="light">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 block mb-1">Employee ID</label><input className="input" value={discForm.emp_id} onChange={e=>setDiscForm({...discForm,emp_id:e.target.value})}/></div>
            <div><label className="text-xs text-slate-400 block mb-1">Case Start Date</label><input type="date" className="input" value={discForm.case_start_date} onChange={e=>setDiscForm({...discForm,case_start_date:e.target.value})}/></div>
            <div><label className="text-xs text-slate-400 block mb-1">Incident Date</label><input type="date" className="input" value={discForm.incident_date} onChange={e=>setDiscForm({...discForm,incident_date:e.target.value})}/></div>
            <div><label className="text-xs text-slate-400 block mb-1">Inquiry Officer</label><input className="input" value={discForm.inquiry_officer_name} onChange={e=>setDiscForm({...discForm,inquiry_officer_name:e.target.value})}/></div>
            <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Charge Description</label><textarea className="input" rows={3} value={discForm.charge_description} onChange={e=>setDiscForm({...discForm,charge_description:e.target.value})}/></div>
          </div>
          <button className="btn btn-danger w-full mt-4" onClick={submitDisc}>Register Case</button>
        </Modal>
      )}
    </Layout>
  );
}