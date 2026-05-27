import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { Plus, Check } from 'lucide-react';
import { promotionAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

const DESIGS = ['Clerk','Junior Assistant','Senior Assistant','Talati','Junior Teacher','Teacher','Senior Teacher','Headmaster','Staff Nurse','Sub-Inspector','Inspector','Deputy Collector','District Officer'];

export default function Promotion() {
  const { isMin } = useAuth();
  const [tab, setTab] = useState('promotions');
  const [promos, setPromos] = useState([]);
  const [seniority, setSeniority] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ emp_id:'', from_designation_name:'', to_designation_name:'', from_pay_level:'', to_pay_level:'', basis:'DPC', dpc_meeting_date:'', effective_date:'' });

  const load = () => {
    setLoading(true);
    Promise.all([promotionAPI.list(), promotionAPI.seniority()])
      .then(([p,s])=>{ setPromos(p.data.data||[]); setSeniority(s.data.data||[]); })
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const approve = async (id) => {
    try { await promotionAPI.approve(id,{}); setMsg('Promotion approved'); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };
  const submit = async () => {
    try { await promotionAPI.create(form); setMsg('Promotion initiated'); setShowForm(false); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  const renderField = (k, l, type='text', opts) => (
    <div key={k}><label className="text-xs text-slate-400 block mb-1">{l}</label>
      {opts ? <select className="input" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}><option value="">Select</option>{opts.map(o=><option key={o}>{o}</option>)}</select>
      : <input type={type} className="input" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>}
    </div>
  );

  return (
    <Layout title="Promotion & Seniority Management">
      {msg && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-900/50 text-red-200 border border-red-500/30':'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30'}`}>{msg}</div>}
      <div className="flex gap-3 mb-5">
        {['promotions','seniority'].map(t=>(
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t==='promotions'?'Promotion Records':'Seniority List'}</button>
        ))}
        {isMin('hr_staff') && <button className="btn btn-primary ml-auto" onClick={()=>setShowForm(true)}><Plus size={16}/>Initiate Promotion</button>}
      </div>

      {loading ? <Loader /> : tab==='promotions' ? (
        <div className="card">
          <h3 className="section-title">Promotion Records</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Dept</th><th>From Post</th><th>To Post</th><th>Basis</th><th>Eff. Date</th><th>Pay Change</th><th>Order No.</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{promos.map(p=>(
                <tr key={p.id}>
                  <td><div className="font-medium">{p.emp_name}</div><div className="text-xs text-slate-400">{p.emp_id}</div></td>
                  <td>{p.dept_name}</td>
                  <td className="text-slate-400 text-sm">{p.from_designation_name||'—'}</td>
                  <td className="font-medium text-blue-600">{p.to_designation_name}</td>
                  <td><span className="badge" style={{background:'#f0fdf4',color:'#166534'}}>{p.basis}</span></td>
                  <td className="text-xs">{p.effective_date?.split('T')[0]||'—'}</td>
                  <td className="text-xs"><span className="text-slate-400">L{p.from_pay_level||'?'}</span> → <span className="text-green-600 font-medium">L{p.to_pay_level||'?'}</span></td>
                  <td className="font-mono text-xs">{p.order_number||'—'}</td>
                  <td><Badge text={p.status}/></td>
                  <td>{p.status?.includes('Pending') && isMin('hr_manager') && (
                    <button className="btn btn-success" style={{padding:'3px 8px',fontSize:11}} onClick={()=>approve(p.id)}><Check size={12}/>Approve</button>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="section-title">Seniority List (by Date of Joining)</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Employee</th><th>Dept</th><th>Designation</th><th>DOJ</th><th>Service Years</th><th>Grade</th><th>Category</th></tr></thead>
              <tbody>{seniority.map((e,i)=>(
                <tr key={e.emp_id}>
                  <td className="font-bold text-blue-600">{e.seniority_rank||i+1}</td>
                  <td><div className="font-medium">{e.name}</div><div className="text-xs text-slate-400">{e.emp_id}</div></td>
                  <td>{e.dept_name}</td><td>{e.designation_name||'—'}</td>
                  <td>{e.doj?.split('T')[0]}</td>
                  <td>{e.service_years||0} yrs</td>
                  <td><Badge text={e.grade||'—'}/></td>
                  <td><Badge text={e.category}/></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title="Initiate Promotion" onClose={()=>setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            {renderField("emp_id", "Employee ID")}
            {renderField("basis", "Basis", "text", ['DPC','Seniority','Merit','Seniority+DPC'])}
            {renderField("from_designation_name", "Current Designation", "text", DESIGS)}
            {renderField("to_designation_name", "Promoted To", "text", DESIGS)}
            {renderField("from_pay_level", "Current Pay Level", "number")}
            {renderField("to_pay_level", "New Pay Level", "number")}
            {renderField("dpc_meeting_date", "DPC Meeting Date", "date")}
            {renderField("effective_date", "Effective Date", "date")}
          </div>
          <button className="btn btn-primary w-full mt-4" onClick={submit}>Submit for DPC</button>
        </Modal>
      )}
    </Layout>
  );
}