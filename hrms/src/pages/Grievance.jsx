import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { Plus, AlertTriangle, Shield, CheckCircle, Clock, AlertCircle, Search } from 'lucide-react';
import StatsCard from '../components/common/StatsCard';
import { grievanceAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { usePaginationAndSearch } from '../hooks/usePaginationAndSearch';
import Pagination from '../components/common/Pagination';

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
  const [resolveData, setResolveData] = useState(null);
  const [resolveRemarks, setResolveRemarks] = useState('');
  const [viewRemarksData, setViewRemarksData] = useState(null);

  const {
    searchQuery: gSearch, setSearchQuery: setGSearch,
    currentPage: gPage, setCurrentPage: setGPage,
    paginatedData: paginatedGrievances, totalPages: gTotalPages
  } = usePaginationAndSearch(grievances, ['emp_name', 'emp_id', 'subject', 'grievance_type', 'dept_name'], 10);

  const {
    searchQuery: dSearch, setSearchQuery: setDSearch,
    currentPage: dPage, setCurrentPage: setDPage,
    paginatedData: paginatedDisc, totalPages: dTotalPages
  } = usePaginationAndSearch(disc, ['emp_name', 'emp_id', 'charge_description', 'dept_name', 'inquiry_officer_name'], 10);

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
  const submitResolve = async () => {
    if (!resolveRemarks.trim()) return setMsg('Error: Remarks are required to resolve a grievance');
    try { 
      await grievanceAPI.resolve(resolveData.id, { resolution_remarks: resolveRemarks }); 
      setMsg('Grievance resolved successfully'); 
      setResolveData(null);
      setResolveRemarks('');
      load(); 
    }
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
    <Layout title="Grievance & Disciplinary" theme="light" bg="#F8F8FF">
      {msg && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-50 text-red-800 border border-red-200':'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>{msg}</div>}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <button className={`tab ${tab==='grievance'?'active':''}`} onClick={()=>setTab('grievance')}><AlertTriangle size={13} className="inline mr-1"/>Grievances</button>
          {isMin('hr_staff') && <button className={`tab ${tab==='disciplinary'?'active':''}`} onClick={()=>setTab('disciplinary')}><Shield size={13} className="inline mr-1"/>Disciplinary</button>}
        </div>
        <button className="btn btn-primary w-full sm:w-auto sm:ml-auto mt-2 sm:mt-0" onClick={()=>tab==='grievance'?setShowForm(true):setShowDiscForm(true)}>
          <Plus size={16}/>{tab==='grievance'?'New Grievance':'New Case'}
        </button>
      </div>

      {loading ? <Loader/> : tab==='grievance' ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
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
            <div className="flex items-center justify-between mb-4 mt-6">
              <h3 className="text-lg font-semibold" style={{ color: '#162660' }}>All Grievances</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search grievances..." 
                  value={gSearch}
                  onChange={e => setGSearch(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-64 text-slate-800 bg-white"
                />
              </div>
            </div>
            <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                    {['Employee', 'Dept', 'Type', 'Subject', 'Date', 'Priority', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{paginatedGrievances.map(g=>{
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
                        {g.status==='Under Review' && isMin('hr_staff') && <button className="btn btn-success" style={{padding:'4px 10px',fontSize:11}} onClick={()=>setResolveData(g)}>Resolve</button>}
                        {g.status==='Resolved' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-600 font-medium">✓ Closed</span>
                            {g.resolution_remarks && (
                              <button className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border hover:bg-slate-200 transition-colors" onClick={()=>setViewRemarksData(g)}>
                                View Solution
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <Pagination currentPage={gPage} totalPages={gTotalPages} onPageChange={setGPage} />
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: '#162660' }}>Disciplinary Cases</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search cases..." 
                value={dSearch}
                onChange={e => setDSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-64 text-slate-800 bg-white"
              />
            </div>
          </div>
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflowX: 'auto' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['Case ID', 'Employee', 'Dept', 'Charge', 'Start Date', 'Inquiry Officer', 'Status', 'Penalty'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{paginatedDisc.map(d=>(
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
          <Pagination currentPage={dPage} totalPages={dTotalPages} onPageChange={setDPage} />
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
      {resolveData && (
        <Modal title="Resolve Grievance" onClose={()=>{setResolveData(null); setResolveRemarks('');}} theme="light">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-700 mb-1">Subject: <span className="font-normal text-slate-600">{resolveData.subject}</span></p>
            <p className="text-sm font-semibold text-slate-700 mb-2">Description: <span className="font-normal text-slate-600">{resolveData.description || 'N/A'}</span></p>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Resolution Remarks / Solution Provided <span className="text-red-500">*</span></label>
            <textarea 
              className="input w-full" 
              rows={4} 
              placeholder="Enter details of how this grievance was resolved..."
              value={resolveRemarks} 
              onChange={e=>setResolveRemarks(e.target.value)}
            />
          </div>
          <button className="btn btn-success w-full mt-4" onClick={submitResolve}>Resolve Grievance</button>
        </Modal>
      )}
      {viewRemarksData && (
        <Modal title="Grievance Resolution" onClose={()=>setViewRemarksData(null)} theme="light">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-700 mb-1">Subject: <span className="font-normal text-slate-600">{viewRemarksData.subject}</span></p>
            <p className="text-sm font-semibold text-slate-700 mb-2">Description: <span className="font-normal text-slate-600">{viewRemarksData.description || 'N/A'}</span></p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-emerald-800 uppercase mb-2 flex items-center gap-1.5"><CheckCircle size={14}/> Solution Provided</h4>
            <p className="text-sm text-emerald-900 whitespace-pre-wrap">{viewRemarksData.resolution_remarks}</p>
          </div>
        </Modal>
      )}
    </Layout>
  );
}



