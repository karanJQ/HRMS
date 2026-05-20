import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { CheckCircle, XCircle } from 'lucide-react';
import { retirementAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

const CHECKS = [
  { key:'noc_cleared', label:'No Objection Certificate (NOC)' },
  { key:'handover_completed', label:'Charge Handover Completed' },
  { key:'pension_submitted', label:'Pension Papers Submitted' },
  { key:'gpf_settled', label:'GPF Final Settlement Initiated' },
  { key:'medical_certificate', label:'Medical Fitness Certificate' },
  { key:'id_returned', label:'Govt. Property / ID Returned' },
];

export default function Retirement() {
  const { isMin } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    retirementAPI.list().then(r=>setData(r.data.data||[])).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const toggle = async (key) => {
    const upd = { [key]: !selected[key] };
    try {
      const r = await retirementAPI.update(selected.emp_id, upd);
      const updated = r.data.data;
      setSelected(s=>({...s,...updated}));
      setData(d=>d.map(e=>e.emp_id===selected.emp_id?{...e,...updated}:e));
    } catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  const yrsLeft = (retDate) => {
    const diff = new Date(retDate) - new Date();
    return (diff / (1000*60*60*24*365.25)).toFixed(1);
  };

  return (
    <Layout title="Retirement & Superannuation">
      {msg && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{msg}</div>}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card text-center"><p className="text-2xl font-bold text-blue-600">{data.length}</p><p className="text-sm text-gray-500">Total Tracked</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-yellow-500">{data.filter(r=>parseFloat(yrsLeft(r.retirement_date))<=2).length}</p><p className="text-sm text-gray-500">Retiring ≤ 2 Years</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-green-600">₹{(data.reduce((s,r)=>s+parseFloat(r.gratuity_amount||0),0)/100000).toFixed(1)}L</p><p className="text-sm text-gray-500">Total Gratuity Liability</p></div>
      </div>
      {loading ? <Loader/> : (
        <div className="card">
          <h3 className="section-title">Retirement Schedule</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Dept</th><th>DOB</th><th>Retirement Date</th><th>Years Left</th><th>Gratuity Est.</th><th>GPF Balance</th><th>Checklist</th><th>Action</th></tr></thead>
              <tbody>{data.map(r=>{
                const yl = yrsLeft(r.retirement_date);
                const done = CHECKS.filter(c=>r[c.key]).length;
                return (
                  <tr key={r.emp_id}>
                    <td><div className="font-medium">{r.emp_name}</div><div className="text-xs text-gray-400">{r.emp_id}</div></td>
                    <td>{r.dept_name}</td>
                    <td>{r.dob?.split('T')[0]}</td>
                    <td className="font-medium text-blue-600">{r.retirement_date?.split('T')[0]}</td>
                    <td><span className={`font-bold ${yl<=2?'text-red-500':yl<=5?'text-yellow-500':'text-green-600'}`}>{yl} yrs</span></td>
                    <td className="font-semibold text-green-700">{r.gratuity_amount?`₹${parseFloat(r.gratuity_amount).toLocaleString()}`:'—'}</td>
                    <td>{r.gpf_final_amount?`₹${parseFloat(r.gpf_final_amount).toLocaleString()}`:'—'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full bg-green-500" style={{width:`${(done/CHECKS.length)*100}%`}}></div></div>
                        <span className="text-xs text-gray-500">{done}/{CHECKS.length}</span>
                      </div>
                    </td>
                    <td><button className="btn btn-outline" style={{padding:'4px 10px',fontSize:12}} onClick={()=>setSelected(r)}>Manage</button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <Modal title={`Retirement: ${selected.emp_name}`} onClose={()=>setSelected(null)} wide>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Employee Details</h4>
              {[['Department',selected.dept_name],['DOB',selected.dob?.split('T')[0]],['Retirement Date',selected.retirement_date?.split('T')[0]],['Years Remaining',`${yrsLeft(selected.retirement_date)} years`],['Designation',selected.designation_name]].map(([k,v])=>(
                <div key={k} className="flex justify-between py-2 border-b border-gray-50 text-sm"><span className="text-gray-500">{k}</span><span className="font-medium">{v||'—'}</span></div>
              ))}
              <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">Pension Scheme: {selected.pension_type||'NPS'}</div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Pre-Retirement Checklist</h4>
              <div className="space-y-2">
                {CHECKS.map(c=>(
                  <div key={c.key} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selected[c.key]?'bg-green-50 border-green-200':'bg-gray-50 border-gray-100'}`}
                    onClick={()=>isMin('hr_staff') && toggle(c.key)}>
                    <span className="text-sm text-gray-700">{c.label}</span>
                    {selected[c.key] ? <CheckCircle size={18} color="#22c55e"/> : <XCircle size={18} color="#cbd5e1"/>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button className="btn btn-primary flex-1">Generate Retirement Order</button>
            <button className="btn btn-secondary flex-1">Send Alert to Employee</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}