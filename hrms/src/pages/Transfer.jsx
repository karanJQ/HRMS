import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import StatsCard from '../components/common/StatsCard';
import Loader from '../components/common/Loader';
import { Plus, Check, X, FileText, AlertTriangle, CheckSquare } from 'lucide-react';
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
    <div>
      <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{l}</label>
      {opts ? (
        <select 
          className="input" 
          value={form[k]} 
          onChange={e=>setForm({...form,[k]:e.target.value})}
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.15)',
            color: '#162660'
          }}
        >
          <option value="" style={{ color: '#162660', background: '#fff' }}>Select</option>
          {opts.map(o=><option key={o} style={{ color: '#162660', background: '#fff' }}>{o}</option>)}
        </select>
      ) : (
        <input 
          type={type} 
          className="input" 
          value={form[k]} 
          onChange={e=>setForm({...form,[k]:e.target.value})}
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.15)',
            color: '#162660'
          }}
        />
      )}
    </div>
  );

  const completed = data.filter(t=>t.status==='Completed').length;
  const pending = data.filter(t=>t.status==='Pending Approval').length;

  return (
    <Layout title="Transfer & Posting Management" theme="light">
      {msg && (
        <div 
          className={`px-4 py-3 rounded-xl text-sm mb-4 border transition-all duration-300 ${
            msg.startsWith('Error') 
              ? 'bg-red-50 text-red-800 border-red-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
          style={{
            boxShadow: '0 4px 12px rgba(22, 38, 96, 0.03)'
          }}
        >
          {msg}
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatsCard title="Total Transfers" value={data.length} icon={FileText} color="#3b82f6" theme="light" delay={0}/>
        <StatsCard title="Pending Approval" value={pending} icon={AlertTriangle} color="#fbbf24" theme="light" delay={60}/>
        <StatsCard title="Completed" value={completed} icon={CheckSquare} color="#10b981" theme="light" delay={120}/>
      </div>
      <div className="flex justify-between mb-4 items-center">
        <h3 className="text-lg font-semibold mb-0" style={{ color: '#162660' }}>Transfer Orders</h3>
        {isMin('hr_staff') && (
          <button 
            className="btn font-semibold transition-all duration-200" 
            style={{ 
              background: '#162660', 
              color: '#FEFEFA',
              boxShadow: '0 4px 15px rgba(22, 38, 96, 0.2)'
            }}
            onClick={()=>setShowForm(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#68aae8';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 38, 96, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#162660';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(22, 38, 96, 0.2)';
            }}
          >
            <Plus size={16}/>New Transfer
          </button>
        )}
      </div>
      {loading ? <Loader /> : (
        <div 
          className="hover-card animate-slide-up"
          style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid rgba(22, 38, 96, 0.1)', 
            boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)',
            animationDelay: '180ms'
          }}
        >
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['Employee', 'Dept', 'From', 'To', 'Type', 'Date', 'Order No.', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{data.map((t, idx)=>(
                <tr 
                  key={t.id}
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
                  <td>
                    <div className="font-medium" style={{ color: '#162660' }}>{t.emp_name}</div>
                    <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{t.emp_id}</div>
                  </td>
                  <td style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{t.dept_name}</td>
                  <td><span className="text-sm font-semibold" style={{ color: '#b91c1c' }}>{t.from_district||'—'}</span></td>
                  <td><span className="text-sm font-semibold" style={{ color: '#047857' }}>{t.to_district}</span></td>
                  <td>
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border"
                      style={{
                        background: 'rgba(22, 38, 96, 0.04)',
                        color: '#162660',
                        borderColor: 'rgba(22, 38, 96, 0.1)'
                      }}
                    >
                      {t.transfer_type}
                    </span>
                  </td>
                  <td style={{ color: '#162660' }} className="text-xs">{t.request_date?.split('T')[0]||'—'}</td>
                  <td style={{ color: '#162660' }} className="font-mono text-xs">{t.order_number||'—'}</td>
                  <td><Badge text={t.status}/></td>
                  <td>{t.status==='Pending Approval' && isMin('hr_manager') && (
                    <div className="flex gap-1.5">
                      <button 
                        className="btn btn-success" 
                        style={{ padding: '6px 10px', borderRadius: '8px', fontSize: 11, boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)' }} 
                        onClick={()=>approve(t.id)}
                      >
                        <Check size={12}/>Approve
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '6px 10px', borderRadius: '8px', fontSize: 11, boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)' }} 
                        onClick={()=>reject(t.id)}
                      >
                        <X size={12}/>Reject
                      </button>
                    </div>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      {showForm && (
        <Modal title="Create Transfer Order" onClose={()=>setShowForm(false)} theme="light">
          <div className="grid grid-cols-2 gap-3">
            <F k="emp_id" l="Employee ID" /><F k="transfer_type" l="Transfer Type" opts={['Admin Initiated','Request','Mutual','Promotion-Based','On Deputation']}/>
            <F k="from_district" l="From District" opts={DISTRICTS}/>
            <F k="to_district" l="To District" opts={DISTRICTS}/>
            <F k="from_station" l="From Station"/><F k="to_station" l="To Station"/>
            <F k="request_date" l="Order Date" type="date"/>
            <div className="col-span-2">
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Reason</label>
              <textarea 
                className="input" 
                rows={2} 
                value={form.reason} 
                onChange={e=>setForm({...form,reason:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
          </div>
          <button 
            className="btn w-full mt-4 font-semibold transition-all duration-200" 
            style={{
              background: '#162660',
              color: '#FEFEFA',
              boxShadow: '0 4px 15px rgba(22, 38, 96, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#68aae8';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 38, 96, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#162660';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(22, 38, 96, 0.2)';
            }}
            onClick={submit}
          >
            Issue Transfer Order
          </button>
        </Modal>
      )}
    </Layout>
  );
}