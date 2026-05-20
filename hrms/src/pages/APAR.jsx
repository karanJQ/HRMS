import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { Star, Plus } from 'lucide-react';
import { aparAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

const GRADES = ['Outstanding','Very Good','Good','Average','Poor'];
const COLOR = { Outstanding:'#22c55e','Very Good':'#3b82f6',Good:'#6366f1',Average:'#f59e0b',Poor:'#ef4444' };

export default function APAR() {
  const { isMin, can, user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [fillMode, setFillMode] = useState(null); // 'self'|'reporting'|'reviewing'
  const [form, setForm] = useState({ grade:'', remarks:'' });
  const [msg, setMsg] = useState('');
  const [initForm, setInitForm] = useState({ emp_id:'', financial_year:'' });
  const [showInit, setShowInit] = useState(false);

  const load = () => {
    setLoading(true);
    aparAPI.list().then(r=>setData(r.data.data||[])).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const submitFill = async () => {
    try {
      if (fillMode==='self') await aparAPI.fillSelf(selected.id,{ self_grade:form.grade, self_remarks:form.remarks });
      else if (fillMode==='reporting') await aparAPI.fillReporting(selected.id,{ reporting_grade:form.grade, reporting_remarks:form.remarks });
      else if (fillMode==='reviewing') await aparAPI.fillReviewing(selected.id,{ reviewing_grade:form.grade, reviewing_remarks:form.remarks, final_grade:form.grade, final_remarks:form.remarks });
      setMsg('APAR updated'); setFillMode(null); setSelected(null); setForm({ grade:'', remarks:'' }); load();
    } catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  const initiate = async () => {
    try { await aparAPI.initiate(initForm); setMsg('APAR initiated'); setShowInit(false); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  const GradeTag = ({val}) => val ? <span style={{color:COLOR[val],fontWeight:600}}>{val}</span> : <span className="text-gray-300">—</span>;

  return (
    <Layout title="APAR / Performance Appraisal">
      {msg && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>{msg}</div>}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {['Completed','Pending Self-Assessment','Pending Reporting Officer','Pending Reviewing Officer'].map(s=>(
          <div key={s} className="card text-center">
            <p className="text-2xl font-bold" style={{color:s==='Completed'?'#22c55e':'#f59e0b'}}>{data.filter(a=>a.status===s).length}</p>
            <p className="text-xs text-gray-500">{s}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between mb-4">
        <h3 className="section-title mb-0">APAR Records</h3>
        {isMin('hr_staff') && <button className="btn btn-primary" onClick={()=>setShowInit(true)}><Plus size={16}/>Initiate APAR</button>}
      </div>
      {loading ? <Loader /> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Dept</th><th>Year</th><th>Self</th><th>Reporting</th><th>Reviewing</th><th>Final</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{data.map(a=>(
                <tr key={a.id}>
                  <td><div className="font-medium">{a.emp_name}</div><div className="text-xs text-gray-400">{a.emp_id}</div></td>
                  <td>{a.dept_name}</td><td>{a.financial_year}</td>
                  <td><GradeTag val={a.self_grade}/></td>
                  <td><GradeTag val={a.reporting_grade}/></td>
                  <td><GradeTag val={a.reviewing_grade}/></td>
                  <td><GradeTag val={a.final_grade}/></td>
                  <td><Badge text={a.status}/></td>
                  <td>
                    <div className="flex gap-1">
                      {a.status==='Pending Self-Assessment' && (user.emp_id===a.emp_id||isMin('hr_manager')) &&
                        <button className="btn btn-primary" style={{padding:'3px 8px',fontSize:11}} onClick={()=>{setSelected(a);setFillMode('self');setForm({grade:'',remarks:''});}}>Self</button>}
                      {a.status==='Pending Reporting Officer' && isMin('dept_head') &&
                        <button className="btn btn-primary" style={{padding:'3px 8px',fontSize:11}} onClick={()=>{setSelected(a);setFillMode('reporting');setForm({grade:'',remarks:''});}}>Report</button>}
                      {a.status==='Pending Reviewing Officer' && isMin('hr_manager') &&
                        <button className="btn btn-primary" style={{padding:'3px 8px',fontSize:11}} onClick={()=>{setSelected(a);setFillMode('reviewing');setForm({grade:'',remarks:''});}}>Review</button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {fillMode && selected && (
        <Modal title={`Fill APAR — ${fillMode.charAt(0).toUpperCase()+fillMode.slice(1)} Assessment`} onClose={()=>{ setFillMode(null); setSelected(null); }}>
          <p className="text-sm text-gray-600 mb-4">Employee: <strong>{selected.emp_name}</strong> | Year: <strong>{selected.financial_year}</strong></p>
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-600 block mb-2">Grade</label>
            <div className="flex gap-2 flex-wrap">
              {GRADES.map(g=>(
                <button key={g} onClick={()=>setForm({...form,grade:g})}
                  className="px-4 py-2 rounded-lg text-sm border transition-all"
                  style={form.grade===g?{background:COLOR[g],color:'#fff',borderColor:COLOR[g]}:{background:'#fff',borderColor:'#e2e8f0',color:'#475569'}}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-1">Remarks</label>
            <textarea className="input" rows={3} value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})}/>
          </div>
          <button className="btn btn-primary w-full" disabled={!form.grade} onClick={submitFill}>Submit</button>
        </Modal>
      )}

      {showInit && (
        <Modal title="Initiate APAR" onClose={()=>setShowInit(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 block mb-1">Employee ID</label><input className="input" value={initForm.emp_id} onChange={e=>setInitForm({...initForm,emp_id:e.target.value})}/></div>
            <div><label className="text-xs text-gray-500 block mb-1">Financial Year</label>
              <select className="input" value={initForm.financial_year} onChange={e=>setInitForm({...initForm,financial_year:e.target.value})}>
                <option value="">Select</option>
                {['2024-25','2023-24','2022-23'].map(y=><option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary w-full mt-4" onClick={initiate}>Initiate APAR</button>
        </Modal>
      )}
    </Layout>
  );
}