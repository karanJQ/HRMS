import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { Plus, Eye, CheckCircle, XCircle } from 'lucide-react';
import { onboardingAPI, deptAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function Onboarding() {
  const { isMin } = useAuth();
  const [data, setData] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ candidate_ref_id:'', name:'', post:'', dept_id:'', selection_date:'', joining_date:'' });

  const load = () => {
    setLoading(true);
    Promise.all([onboardingAPI.list(), deptAPI.list()])
      .then(([o,d])=>{ setData(o.data.data||[]); setDepts(d.data.data||[]); })
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const addCandidate = async () => {
    try {
      const dept = depts.find(d=>d.id==form.dept_id);
      await onboardingAPI.create({ ...form, dept_name: dept?.name||'' });
      setMsg('Candidate added'); setShowAdd(false);
      setForm({ candidate_ref_id:'', name:'', post:'', dept_id:'', selection_date:'', joining_date:'' });
      load();
    } catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  const updateField = async (id, field, value) => {
    try {
      const r = await onboardingAPI.update(id, { [field]: value });
      setData(d=>d.map(x=>x.id===id?r.data.data:x));
      if (selected?.id===id) setSelected(r.data.data);
    } catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  const CheckRow = ({label, val, id, field}) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 cursor-pointer hover:bg-gray-50 rounded px-2"
      onClick={()=>isMin('hr_staff') && updateField(id, field, !val)}>
      <span className="text-sm text-gray-600">{label}</span>
      {val ? <CheckCircle size={18} color="#22c55e"/> : <XCircle size={18} color="#ef4444"/>}
    </div>
  );

  return (
    <Layout title="Employee Onboarding">
      {msg && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>{msg}</div>}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{data.length} candidates in pipeline</p>
        {isMin('hr_staff') && <button className="btn btn-primary" onClick={()=>setShowAdd(true)}><Plus size={16}/>Add Candidate</button>}
      </div>
      <div className="grid grid-cols-4 gap-4 mb-5">
        {['Pending Documents','Documents Verified','Joining Formalities','Completed'].map(s=>(
          <div key={s} className="card text-center">
            <p className="text-2xl font-bold" style={{color:s==='Completed'?'#22c55e':s==='Joining Formalities'?'#3b82f6':'#f59e0b'}}>{data.filter(d=>d.status===s).length}</p>
            <p className="text-xs text-gray-500">{s}</p>
          </div>
        ))}
      </div>
      {loading ? <Loader/> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Candidate</th><th>Post</th><th>Dept</th><th>Selected</th><th>Joining</th><th>Police</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{data.map(o=>(
                <tr key={o.id}>
                  <td><div className="font-medium">{o.name}</div><div className="text-xs text-gray-400">{o.candidate_ref_id}</div></td>
                  <td>{o.post}</td><td>{o.dept_name_full||o.dept_name}</td>
                  <td>{o.selection_date?.split('T')[0]||'—'}</td>
                  <td>{o.joining_date?.split('T')[0]||'—'}</td>
                  <td><Badge text={o.police_verification}/></td>
                  <td><Badge text={o.status}/></td>
                  <td><button className="btn btn-outline" style={{padding:'4px 10px',fontSize:12}} onClick={()=>setSelected(o)}><Eye size={14}/>View</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <Modal title={`Onboarding: ${selected.name}`} onClose={()=>setSelected(null)} wide>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[['Post',selected.post],['Department',selected.dept_name_full||selected.dept_name],['Candidate ID',selected.candidate_ref_id],['Joining Date',selected.joining_date?.split('T')[0]]].map(([k,v])=>(
              <div key={k}><p className="text-xs text-gray-500">{k}</p><p className="text-sm font-medium">{v||'—'}</p></div>
            ))}
          </div>
          <h4 className="font-semibold text-sm mb-2 mt-4">Onboarding Checklist <span className="text-xs text-gray-400 font-normal ml-1">(click to toggle)</span></h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <CheckRow label="Documents Submitted" val={selected.documents_submitted} id={selected.id} field="documents_submitted"/>
            <CheckRow label="Medical Fitness Cleared" val={selected.medical_cleared} id={selected.id} field="medical_cleared"/>
            <CheckRow label="Appointment Letter Sent" val={selected.appointment_letter_sent} id={selected.id} field="appointment_letter_sent"/>
            <CheckRow label="Service Book Created" val={selected.service_book_created} id={selected.id} field="service_book_created"/>
            <div className="flex items-center justify-between py-2 border-b border-gray-50 px-2">
              <span className="text-sm text-gray-600">Police Verification</span>
              <select className="text-xs border border-gray-200 rounded px-2 py-1" value={selected.police_verification}
                onChange={e=>updateField(selected.id,'police_verification',e.target.value)}>
                {['Pending','In Progress','Cleared','Failed'].map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between py-2 px-2">
              <span className="text-sm text-gray-600">Overall Status</span>
              <select className="text-xs border border-gray-200 rounded px-2 py-1" value={selected.status}
                onChange={e=>updateField(selected.id,'status',e.target.value)}>
                {['Pending Documents','Documents Verified','Medical Pending','Police Verification Pending','Joining Formalities','Completed','Cancelled'].map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn btn-success flex-1">Generate Appointment Letter</button>
            <button className="btn btn-primary flex-1">Create Service Book</button>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal title="Add Candidate to Onboarding" onClose={()=>setShowAdd(false)}>
          <div className="grid grid-cols-2 gap-3">
            {[['candidate_ref_id','Candidate Ref ID'],['name','Full Name'],['post','Post Applied']].map(([k,l])=>(
              <div key={k}><label className="text-xs text-gray-500 block mb-1">{l}</label><input className="input" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>
            ))}
            <div><label className="text-xs text-gray-500 block mb-1">Department</label>
              <select className="input" value={form.dept_id} onChange={e=>setForm({...form,dept_id:e.target.value})}>
                <option value="">Select</option>{depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-gray-500 block mb-1">Selection Date</label><input type="date" className="input" value={form.selection_date} onChange={e=>setForm({...form,selection_date:e.target.value})}/></div>
            <div><label className="text-xs text-gray-500 block mb-1">Joining Date</label><input type="date" className="input" value={form.joining_date} onChange={e=>setForm({...form,joining_date:e.target.value})}/></div>
          </div>
          <button className="btn btn-primary w-full mt-4" onClick={addCandidate}>Add to Pipeline</button>
        </Modal>
      )}
    </Layout>
  );
}
