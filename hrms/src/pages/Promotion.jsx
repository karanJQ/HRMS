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
    <div key={k}>
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

  return (
    <Layout title="Promotion & Seniority Management" theme="light" bg="#F8F8FF">
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
      <div className="flex flex-wrap gap-3 mb-5 pb-4 items-center" style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.08)' }}>
        {['promotions','seniority'].map(t=>(
          <button 
            key={t} 
            className="font-semibold transition-all duration-300"
            style={{
              padding: '8px 20px',
              borderRadius: '30px',
              fontSize: '14px',
              background: tab === t ? '#162660' : 'transparent',
              color: tab === t ? '#FEFEFA' : 'rgba(22, 38, 96, 0.6)',
              boxShadow: tab === t ? '0 4px 12px rgba(22, 38, 96, 0.15)' : 'none',
              border: tab === t ? '1px solid #162660' : '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (tab !== t) {
                e.currentTarget.style.color = '#162660';
                e.currentTarget.style.background = 'rgba(22, 38, 96, 0.04)';
              }
            }}
            onMouseLeave={(e) => {
              if (tab !== t) {
                e.currentTarget.style.color = 'rgba(22, 38, 96, 0.6)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
            onClick={()=>setTab(t)}
          >
            {t==='promotions'?'Promotion Records':'Seniority List'}
          </button>
        ))}
        {isMin('hr_staff') && (
          <button 
            className="btn font-semibold transition-all duration-200 ml-auto" 
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
            <Plus size={16}/>Initiate Promotion
          </button>
        )}
      </div>

      {loading ? <Loader /> : tab==='promotions' ? (
        <div 
          className="hover-card animate-slide-up"
          style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid rgba(22, 38, 96, 0.1)', 
            boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)',
            animationDelay: '100ms'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Promotion Records</h3>
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['Employee', 'Dept', 'From Post', 'To Post', 'Basis', 'Eff. Date', 'Pay Change', 'Order No.', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{promos.map((p, idx)=>(
                <tr 
                  key={p.id}
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
                    <div className="font-medium" style={{ color: '#162660' }}>{p.emp_name}</div>
                    <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{p.emp_id}</div>
                  </td>
                  <td style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{p.dept_name}</td>

                  <td>
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border"
                      style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        color: '#065f46',
                        borderColor: 'rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      {p.basis}
                    </span>
                  </td>
                  <td style={{ color: '#162660' }} className="text-xs">{p.effective_date?.split('T')[0]||'—'}</td>
                  <td style={{ color: '#162660' }} className="text-xs"><span style={{ color: 'rgba(22, 38, 96, 0.5)' }}>L{p.from_pay_level||'?'}</span> → <span className="text-green-600 font-semibold">L{p.to_pay_level||'?'}</span></td>
                  <td style={{ color: '#162660' }} className="font-mono text-xs">{p.order_number||'—'}</td>
                  <td><Badge text={p.status}/></td>
                  <td>{p.status?.includes('Pending') && isMin('hr_manager') && (
                    <button 
                      className="btn btn-success" 
                      style={{ padding: '6px 10px', borderRadius: '8px', fontSize: 11, boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)' }} 
                      onClick={()=>approve(p.id)}
                    >
                      <Check size={12}/>Approve
                    </button>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : (
        <div 
          className="hover-card animate-slide-up"
          style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid rgba(22, 38, 96, 0.1)', 
            boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)',
            animationDelay: '100ms'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Seniority List (by Date of Joining)</h3>
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['#', 'Employee', 'Dept', 'DOJ', 'Service Years'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{seniority.map((e,i)=>(
                <tr 
                  key={e.emp_id}
                  className="transition-all duration-300"
                  style={{ 
                    borderBottom: '1px solid rgba(22, 38, 96, 0.05)',
                    animationDelay: `${i * 20}ms`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td className="font-bold" style={{ color: '#162660' }}>{e.seniority_rank||i+1}</td>
                  <td>
                    <div className="font-medium" style={{ color: '#162660' }}>{e.name}</div>
                    <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{e.emp_id}</div>
                  </td>
                  <td style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{e.dept_name}</td>
                  <td style={{ color: '#162660' }}>{e.doj?.split('T')[0]}</td>
                  <td style={{ color: '#162660' }}>{e.service_years||0} yrs</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title="Initiate Promotion" onClose={()=>setShowForm(false)} theme="light">
          <div className="grid grid-cols-2 gap-3">
            {renderField("emp_id", "Employee ID")}
            {renderField("basis", "Basis", "text", ['DPC','Seniority','Merit','Seniority+DPC'])}

            {renderField("from_pay_level", "Current Pay Level", "number")}
            {renderField("to_pay_level", "New Pay Level", "number")}
            {renderField("dpc_meeting_date", "DPC Meeting Date", "date")}
            {renderField("effective_date", "Effective Date", "date")}
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
            Submit for DPC
          </button>
        </Modal>
      )}
    </Layout>
  );
}