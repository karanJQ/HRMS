import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { CheckCircle, XCircle, ClipboardList, Clock, DollarSign } from 'lucide-react';
import StatsCard from '../components/common/StatsCard';
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
    <Layout title="Retirement & Superannuation" theme="light" bg="#F8F8FF">
      {msg && <div className="bg-red-900/50 text-red-200 border border-red-500/30 px-4 py-2 rounded-lg text-sm mb-4">{msg}</div>}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatsCard title="Total Tracked" value={data.length} icon={ClipboardList} color="#3b82f6" theme="light" delay={0} />
        <StatsCard title="Retiring ≤ 2 Years" value={data.filter(r=>parseFloat(yrsLeft(r.retirement_date))<=2).length} icon={Clock} color="#f59e0b" theme="light" delay={60} />
        <StatsCard title="Total Gratuity Liability" value={`₹${(data.reduce((s,r)=>s+parseFloat(r.gratuity_amount||0),0)/100000).toFixed(1)}L`} icon={DollarSign} color="#10b981" theme="light" delay={120} />
      </div>
      {loading ? <Loader/> : (
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
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Retirement Schedule</h3>
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['Employee', 'Dept', 'DOB', 'Retirement Date', 'Years Left', 'Gratuity Est.', 'GPF Balance', 'Checklist', 'Action'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{data.map((r, idx)=>{
                const yl = yrsLeft(r.retirement_date);
                const done = CHECKS.filter(c=>r[c.key]).length;
                return (
                  <tr 
                    key={r.emp_id}
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
                    <td style={{ color: '#162660' }}>
                      <div className="font-medium">{r.emp_name}</div>
                      <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.4)' }}>{r.emp_id}</div>
                    </td>
                    <td style={{ color: '#162660' }}>{r.dept_name}</td>
                    <td style={{ color: '#162660' }}>{r.dob?.split('T')[0]}</td>
                    <td className="font-medium text-blue-600">{r.retirement_date?.split('T')[0]}</td>
                    <td><span className={`font-bold ${yl<=2?'text-red-500':yl<=5?'text-yellow-500':'text-green-600'}`}>{yl} yrs</span></td>
                    <td className="font-semibold text-green-700">{r.gratuity_amount?`₹${parseFloat(r.gratuity_amount).toLocaleString()}`:'—'}</td>
                    <td style={{ color: '#162660' }}>{r.gpf_final_amount?`₹${parseFloat(r.gpf_final_amount).toLocaleString()}`:'—'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-green-500" style={{width:`${(done/CHECKS.length)*100}%`}}></div>
                        </div>
                        <span className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{done}/{CHECKS.length}</span>
                      </div>
                    </td>
                    <td>
                      <button 
                        className="btn font-semibold transition-all duration-300" 
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: 11,
                          border: '1px solid rgba(22, 38, 96, 0.2)',
                          background: '#fff',
                          color: '#162660',
                          boxShadow: '0 2px 6px rgba(22, 38, 96, 0.03)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                          e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#fff';
                          e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.2)';
                        }}
                        onClick={()=>setSelected(r)}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <Modal title={`Retirement: ${selected.emp_name}`} onClose={()=>setSelected(null)} theme="light" wide>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3" style={{ color: '#162660' }}>Employee Details</h4>
              {[['Department',selected.dept_name],['DOB',selected.dob?.split('T')[0]],['Retirement Date',selected.retirement_date?.split('T')[0]],['Years Remaining',`${yrsLeft(selected.retirement_date)} years`],['Designation',selected.designation_name]].map(([k,v])=>(
                <div key={k} className="flex justify-between py-2 border-b text-sm" style={{ borderColor: 'rgba(22, 38, 96, 0.08)' }}><span style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{k}</span><span className="font-medium" style={{ color: '#162660' }}>{v||'—'}</span></div>
              ))}
              <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">Pension Scheme: {selected.pension_type||'NPS'}</div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3" style={{ color: '#162660' }}>Pre-Retirement Checklist</h4>
              <div className="space-y-2">
                {CHECKS.map(c=>(
                  <div key={c.key} className="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all"
                    style={{
                      background: selected[c.key] ? '#f0fdf4' : '#fff',
                      borderColor: selected[c.key] ? '#bbf7d0' : 'rgba(22, 38, 96, 0.12)'
                    }}
                    onClick={()=>isMin('hr_staff') && toggle(c.key)}>
                    <span className="text-sm font-medium" style={{ color: selected[c.key] ? '#166534' : '#162660' }}>{c.label}</span>
                    {selected[c.key] ? <CheckCircle size={18} color="#22c55e"/> : <XCircle size={18} color="#cbd5e1"/>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button className="btn btn-primary flex-1">Generate Retirement Order</button>
            <button className="btn btn-secondary flex-1" style={{ background: 'rgba(22, 38, 96, 0.05)', color: '#162660', border: '1px solid rgba(22, 38, 96, 0.1)' }}>Send Alert to Employee</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}