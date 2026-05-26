import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { BookOpen, Plus, Shield } from 'lucide-react';
import { sbAPI, empAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

const EVT_COLORS = { Joining:'#3b82f6',Increment:'#22c55e',Transfer:'#f59e0b',Promotion:'#8b5cf6',Training:'#06b6d4',Leave:'#64748b',Disciplinary:'#ef4444' };

export default function ServiceBook() {
  const { isMin, user } = useAuth();
  const [emps, setEmps] = useState([]);
  const [selected, setSelected] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [empsLoading, setEmpsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ event_date:'', event_type:'Increment', details:'', order_number:'' });

  useEffect(() => {
    if (user.role==='employee') {
      setEmps([]); setEmpsLoading(false);
      loadEntries({ emp_id: user.emp_id, first_name: 'My', last_name: 'Service Book' });
    } else {
      empAPI.list({ limit:100 }).then(r=>setEmps(r.data.data.employees||[])).finally(()=>setEmpsLoading(false));
    }
  }, []);

  const loadEntries = (emp) => {
    setSelected(emp); setLoading(true);
    sbAPI.get(emp.emp_id).then(r=>setEntries(r.data.data||[])).finally(()=>setLoading(false));
  };

  const addEntry = async () => {
    try {
      await sbAPI.addEntry(selected.emp_id, form);
      setMsg('Entry added'); setShowAdd(false);
      setForm({ event_date:'', event_type:'Increment', details:'', order_number:'' });
      loadEntries(selected);
    } catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  return (
    <Layout title="Digital Service Book">
      {msg && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-900/50 text-red-200 border border-red-500/30':'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30'}`}>{msg}</div>}
      {!selected ? (
        <div className="card">
          <div className="flex items-center gap-2 mb-4"><Shield size={20} className="text-blue-500"/><h3 className="section-title mb-0">Select Employee to View Service Book</h3></div>
          {empsLoading ? <Loader/> : (
            <div className="grid grid-cols-2 gap-3">
              {emps.map(e=>(
                <div key={e.emp_id} className="flex items-center gap-3 p-4 border border-white/10 rounded-xl hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all" onClick={()=>loadEntries(e)}>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{e.first_name?.[0]}</div>
                  <div className="flex-1"><p className="font-medium text-white">{e.first_name} {e.last_name}</p><p className="text-xs text-slate-400">{e.emp_id} • {e.designation_name||e.dept_name}</p></div>
                  <BookOpen size={16} className="text-blue-400"/>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-5">
            {user.role!=='employee' && <button className="btn btn-secondary" onClick={()=>setSelected(null)}>← Back</button>}
            <div className="flex-1 card py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{selected.first_name?.[0]}</div>
                  <div><p className="font-bold text-white">{selected.first_name} {selected.last_name}</p><p className="text-xs text-slate-400">{selected.emp_id} • {selected.dept_name} • DOJ: {selected.doj?.split('T')[0]}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  {isMin('hr_staff') && <button className="btn btn-primary" onClick={()=>setShowAdd(true)}><Plus size={16}/>Add Entry</button>}
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <h3 className="section-title">Service Book Entries ({entries.length})</h3>
            {loading ? <Loader/> : entries.length===0 ? <p className="text-slate-400 text-sm py-8 text-center">No entries found.</p> : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-white/10"></div>
                {entries.map((e,i)=>(
                  <div key={i} className="flex gap-4 mb-5 relative">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold z-10 flex-shrink-0" style={{background:EVT_COLORS[e.event_type]||'#64748b'}}>{e.event_type?.[0]}</div>
                    <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm" style={{color:EVT_COLORS[e.event_type]||'#64748b'}}>{e.event_type}</span>
                        <span className="text-xs text-slate-400 font-mono">{e.event_date?.split('T')[0]}</span>
                      </div>
                      <p className="text-sm text-slate-200">{e.details}</p>
                      {e.order_number && <p className="text-xs text-blue-500 mt-1">Order: {e.order_number}</p>}
                      <p className="text-xs text-slate-400 mt-1">Recorded by: {e.recorded_by_name||e.recorder_username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {showAdd && (
            <Modal title="Add Service Book Entry" onClose={()=>setShowAdd(false)}>
              <div className="space-y-3">
                <div><label className="text-xs text-slate-400 block mb-1">Date</label><input type="date" className="input" value={form.event_date} onChange={e=>setForm({...form,event_date:e.target.value})}/></div>
                <div><label className="text-xs text-slate-400 block mb-1">Event Type</label>
                  <select className="input" value={form.event_type} onChange={e=>setForm({...form,event_type:e.target.value})}>
                    {Object.keys(EVT_COLORS).map(ev=><option key={ev}>{ev}</option>)}
                    <option>Other</option>
                  </select>
                </div>
                <div><label className="text-xs text-slate-400 block mb-1">Order Number (optional)</label><input className="input" value={form.order_number} onChange={e=>setForm({...form,order_number:e.target.value})}/></div>
                <div><label className="text-xs text-slate-400 block mb-1">Details</label><textarea className="input" rows={3} value={form.details} onChange={e=>setForm({...form,details:e.target.value})}/></div>
              </div>
              <button className="btn btn-primary w-full mt-4" onClick={addEntry} disabled={!form.event_date || !form.event_type || !form.details}>Add Entry</button>
            </Modal>
          )}
        </>
      )}
    </Layout>
  );
}