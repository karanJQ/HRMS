import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { Plus, Users, Calendar, MapPin } from 'lucide-react';
import { trainingAPI, deptAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function Training() {
  const { isMin } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ prog_id:null, emp_id:'' });
  const [showEnroll, setShowEnroll] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ title:'', dept_id:'', start_date:'', end_date:'', venue:'', capacity:30, is_mandatory:false, training_type:'', provider_name:'', description:'' });

  const load = () => {
    setLoading(true);
    Promise.all([trainingAPI.listPrograms(), deptAPI.list()])
      .then(([p,d])=>{ setPrograms(p.data.data||[]); setDepts(d.data.data||[]); })
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const createProgram = async () => {
    try { await trainingAPI.createProgram(form); setMsg('Program created'); setShowForm(false); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };
  const enroll = async () => {
    try { await trainingAPI.enroll({ program_id: enrollForm.prog_id, emp_id: enrollForm.emp_id }); setMsg('Enrolled successfully'); setShowEnroll(false); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  return (
    <Layout title="Training & Development">
      {msg && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-900/50 text-red-200 border border-red-500/30':'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30'}`}>{msg}</div>}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="glass-card text-center"><p className="text-2xl font-bold text-blue-600">{programs.length}</p><p className="text-sm text-slate-400">Total Programs</p></div>
        <div className="glass-card text-center"><p className="text-2xl font-bold text-green-600">{programs.filter(p=>p.status==='Upcoming').length}</p><p className="text-sm text-slate-400">Upcoming</p></div>
        <div className="glass-card text-center"><p className="text-2xl font-bold text-purple-600">{programs.filter(p=>p.is_mandatory).length}</p><p className="text-sm text-slate-400">Mandatory</p></div>
        <div className="glass-card text-center"><p className="text-2xl font-bold text-emerald-400">{programs.reduce((s,p)=>s+parseInt(p.enrolled_count||0),0)}</p><p className="text-sm text-slate-400">Total Enrolled</p></div>
      </div>
      <div className="flex justify-between mb-4">
        <h3 className="section-title mb-0">Training Programs</h3>
        {isMin('hr_staff') && <button className="btn btn-primary" onClick={()=>setShowForm(true)}><Plus size={16}/>Add Program</button>}
      </div>
      {loading ? <Loader/> : (
        <div className="grid grid-cols-2 gap-4">
          {programs.map(p=>(
            <div key={p.id} className="glass-card hover:shadow-lg transition-shadow cursor-pointer" onClick={()=>setSelected(p)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-white text-lg">{p.title}</h4>
                    {p.is_mandatory && <span className="badge" style={{background:'rgba(239,68,68,0.15)',color:'#f87171',border:'1px solid rgba(239,68,68,0.3)',fontSize:11}}>Mandatory</span>}
                  </div>
                  <span className="badge" style={{background:'rgba(59,130,246,0.15)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.3)',fontSize:11}}>{p.dept_name||'All Departments'}</span>
                </div>
                <Badge text={p.status}/>
              </div>
              <div className="space-y-1.5 text-sm text-slate-400">
                <div className="flex items-center gap-2"><Calendar size={13}/>{p.start_date?.split('T')[0]} → {p.end_date?.split('T')[0]}</div>
                <div className="flex items-center gap-2"><MapPin size={13}/>{p.venue||'TBD'}</div>
                <div className="flex items-center gap-2"><Users size={13}/>
                  <div className="flex-1 bg-white/10 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500" style={{width:`${Math.min(100,((parseInt(p.enrolled_count)||0)/p.capacity)*100)}%`}}></div>
                  </div>
                  <span className="text-xs font-medium">{p.enrolled_count||0}/{p.capacity}</span>
                </div>
              </div>
              {p.status==='Upcoming' && isMin('hr_staff') && (
                <button className="btn btn-primary w-full mt-3 text-sm" onClick={e=>{ e.stopPropagation(); setEnrollForm({prog_id:p.id,emp_id:''}); setShowEnroll(true); }}>Enroll Employee</button>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Modal title={selected.title} onClose={()=>setSelected(null)}>
          {[['Department',selected.dept_name||'All'],['Start Date',selected.start_date?.split('T')[0]],['End Date',selected.end_date?.split('T')[0]],['Venue',selected.venue||'TBD'],['Capacity',selected.capacity],['Enrolled',selected.enrolled_count||0],['Mandatory',selected.is_mandatory?'Yes':'No'],['Provider',selected.provider_name||'—'],['Status',selected.status]].map(([k,v])=>(
            <div key={k} className="flex justify-between py-2 border-b border-white/5 text-sm"><span className="text-slate-400">{k}</span><span className="font-medium">{v}</span></div>
          ))}
        </Modal>
      )}

      {showEnroll && (
        <Modal title="Enroll Employee" onClose={()=>setShowEnroll(false)}>
          <div><label className="text-xs text-slate-400 block mb-1">Employee ID</label><input className="input" value={enrollForm.emp_id} onChange={e=>setEnrollForm({...enrollForm,emp_id:e.target.value})} placeholder="EMP00001"/></div>
          <button className="btn btn-primary w-full mt-4" onClick={enroll}>Confirm Enrollment</button>
        </Modal>
      )}

      {showForm && (
        <Modal title="Add Training Program" onClose={()=>setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Title</label><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
            <div><label className="text-xs text-slate-400 block mb-1">Department</label>
              <select className="input" value={form.dept_id} onChange={e=>setForm({...form,dept_id:e.target.value})}>
                <option value="">All Departments</option>{depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-400 block mb-1">Capacity</label><input type="number" className="input" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></div>
            <div><label className="text-xs text-slate-400 block mb-1">Start Date</label><input type="date" className="input" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></div>
            <div><label className="text-xs text-slate-400 block mb-1">End Date</label><input type="date" className="input" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})}/></div>
            <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Venue</label><input className="input" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/></div>
            <div><label className="text-xs text-slate-400 block mb-1">Training Type</label><input className="input" value={form.training_type} onChange={e=>setForm({...form,training_type:e.target.value})}/></div>
            <div><label className="text-xs text-slate-400 block mb-1">Provider</label><input className="input" value={form.provider_name} onChange={e=>setForm({...form,provider_name:e.target.value})}/></div>
            <div className="col-span-2 flex items-center gap-2"><input type="checkbox" id="mand" checked={form.is_mandatory} onChange={e=>setForm({...form,is_mandatory:e.target.checked})}/><label htmlFor="mand" className="text-sm text-slate-300">Mandatory Training</label></div>
          </div>
          <button className="btn btn-primary w-full mt-4" onClick={createProgram}>Create Program</button>
        </Modal>
      )}
    </Layout>
  );
}