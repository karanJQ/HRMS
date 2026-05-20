import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { Plus, Check, X } from 'lucide-react';
import { transferAPI, deptAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

const DISTRICTS = ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar','Gandhinagar','Anand','Mehsana','Kutch','Amreli','Bharuch','Dahod','Navsari','Patan','Porbandar','Sabarkantha','Tapi'];

export default function Transfer() {
  const { isMin } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ emp_id:'', from_district:'', to_district:'', from_station:'', to_station:'', transfer_type:'Admin Initiated', reason:'', request_date:'' });

  const load = () => {
    setLoading(true);
    transferAPI.list().then(r=>setData(r.data.data||[])).finally(()=>setLoading(false));
  };

  useEffect(()=>{ load(); },[]);

  const approve = async (id) => {
    try { await transferAPI.approve(id,{}); setMsg('Transfer approved'); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };
  const reject = async (id) => {
    try { await transferAPI.reject(id,{ remarks:'Rejected by HR' }); setMsg('Transfer rejected'); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };
  const submit = async () => {
    try { await transferAPI.create(form); setMsg('Transfer order created'); setShowForm(false); setForm({ emp_id:'', from_district:'', to_district:'', from_station:'', to_station:'', transfer_type:'Admin Initiated', reason:'', request_date:'' }); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  const F = ({k,l,opts,type='text'}) => (
    <div><label className="text-xs text-gray-500 block mb-1">{l}</label>
      {opts ? <select className="input" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}><option value="">Select</option>{opts.map(o=><option key={o}>{o}</option>)}</select>
      : <input type={type} className="input" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>}
    </div>
  );

  const completed = data.filter(t=>t.status==='Completed').length;
  const pending = data.filter(t=>t.status==='Pending Approval').length;

  return (
    <Layout title="Transfer & Posting Management">
      {msg && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>{msg}</div>}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card text-center"><p className="text-2xl font-bold text-blue-600">{data.length}</p><p className="text-sm text-gray-500">Total Transfers</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-yellow-500">{pending}</p><p className="text-sm text-gray-500">Pending Approval</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-green-600">{completed}</p><p className="text-sm text-gray-500">Completed</p></div>
      </div>
      <div className="flex justify-between mb-4">
        <h3 className="section-title mb-0">Transfer Orders</h3>
        {isMin('hr_staff') && <button className="btn btn-primary" onClick={()=>setShowForm(true)}><Plus size={16}/>New Transfer</button>}
      </div>
      {loading ? <Loader /> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Dept</th><th>From</th><th>To</th><th>Type</th><th>Date</th><th>Order No.</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{data.map(t=>(
                <tr key={t.id}>
                  <td><div className="font-medium">{t.emp_name}</div><div className="text-xs text-gray-400">{t.emp_id}</div></td>
                  <td>{t.dept_name}</td>
                  <td><span className="text-sm text-red-500">{t.from_district||'—'}</span></td>
                  <td><span className="text-sm text-green-600 font-medium">{t.to_district}</span></td>
                  <td><span className="badge" style={{background:'#f1f5f9',color:'#475569',fontSize:11}}>{t.transfer_type}</span></td>
                  <td className="text-xs">{t.request_date?.split('T')[0]||'—'}</td>
                  <td className="font-mono text-xs">{t.order_number||'—'}</td>
                  <td><Badge text={t.status}/></td>
                  <td>{t.status==='Pending Approval' && isMin('hr_manager') && (
                    <div className="flex gap-1">
                      <button className="btn btn-success" style={{padding:'3px 8px',fontSize:11}} onClick={()=>approve(t.id)}><Check size={12}/>Approve</button>
                      <button className="btn btn-danger" style={{padding:'3px 8px',fontSize:11}} onClick={()=>reject(t.id)}><X size={12}/>Reject</button>
                    </div>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      {showForm && (
        <Modal title="Create Transfer Order" onClose={()=>setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <F k="emp_id" l="Employee ID" /><F k="transfer_type" l="Transfer Type" opts={['Admin Initiated','Request','Mutual','Promotion-Based','On Deputation']}/>
            <F k="from_district" l="From District" opts={DISTRICTS}/>
            <F k="to_district" l="To District" opts={DISTRICTS}/>
            <F k="from_station" l="From Station"/><F k="to_station" l="To Station"/>
            <F k="request_date" l="Order Date" type="date"/>
            <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Reason</label><textarea className="input" rows={2} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></div>
          </div>
          <button className="btn btn-primary w-full mt-4" onClick={submit}>Issue Transfer Order</button>
        </Modal>
      )}
    </Layout>
  );
}