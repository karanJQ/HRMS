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
    <Layout title="Digital Service Book" theme="light">
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
      {!selected ? (
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
          <div className="flex items-center gap-2 mb-4">
            <Shield size={20} style={{ color: '#162660' }}/>
            <h3 className="text-lg font-semibold" style={{ color: '#162660' }}>Select Employee to View Service Book</h3>
          </div>
          {empsLoading ? <Loader/> : (
            <div className="grid grid-cols-2 gap-3">
              {emps.map(e=>(
                <div 
                  key={e.emp_id} 
                  className="flex items-center gap-3 p-4 cursor-pointer transition-all duration-300" 
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(22, 38, 96, 0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 2px 6px rgba(22, 38, 96, 0.02)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#68aae8';
                    e.currentTarget.style.background = 'rgba(104, 170, 232, 0.05)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 15px rgba(104, 170, 232, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.1)';
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(22, 38, 96, 0.02)';
                  }}
                  onClick={()=>loadEntries(e)}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: 'rgba(104, 170, 232, 0.15)', color: '#162660' }}>{e.first_name?.[0]}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: '#162660' }}>{e.first_name} {e.last_name}</p>
                    <p className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{e.emp_id} • {e.dept_name}</p>
                  </div>
                  <BookOpen size={16} style={{ color: '#68aae8' }}/>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-5">
            {user.role!=='employee' && (
              <button 
                className="btn font-semibold transition-all duration-200" 
                style={{
                  background: '#fff',
                  color: '#162660',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  boxShadow: '0 2px 6px rgba(22, 38, 96, 0.03)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.3)';
                  e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.15)';
                  e.currentTarget.style.background = '#fff';
                }}
                onClick={()=>setSelected(null)}
              >
                ← Back
              </button>
            )}
            <div 
              className="flex-1 py-3 px-5 transition-all duration-300"
              style={{
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid rgba(22, 38, 96, 0.1)',
                boxShadow: '0 4px 15px rgba(22, 38, 96, 0.03)'
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: 'rgba(104, 170, 232, 0.15)', color: '#162660' }}>{selected.first_name?.[0]}</div>
                  <div>
                    <p className="font-bold" style={{ color: '#162660' }}>{selected.first_name} {selected.last_name}</p>
                    <p className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{selected.emp_id} • {selected.dept_name} • DOJ: {selected.doj?.split('T')[0]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isMin('hr_staff') && (
                    <button 
                      className="btn font-semibold transition-all duration-200"
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
                      onClick={()=>setShowAdd(true)}
                    >
                      <Plus size={16}/>Add Entry
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
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
            <h3 className="text-lg font-semibold mb-6" style={{ color: '#162660' }}>Service Book Entries ({entries.length})</h3>
            {loading ? <Loader/> : entries.length===0 ? <p className="text-sm py-8 text-center" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>No entries found.</p> : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5" style={{ background: 'rgba(22, 38, 96, 0.1)' }}></div>
                {entries.map((e,i)=>(
                  <div key={i} className="flex gap-4 mb-5 relative">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold z-10 flex-shrink-0" style={{background:EVT_COLORS[e.event_type]||'#64748b', boxShadow: '0 3px 8px rgba(22, 38, 96, 0.15)'}}>{e.event_type?.[0]}</div>
                    <div 
                      className="flex-1 rounded-xl p-4 transition-all duration-300"
                      style={{
                        background: '#fff',
                        border: '1px solid rgba(22, 38, 96, 0.08)',
                        boxShadow: '0 4px 12px rgba(22, 38, 96, 0.02)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.15)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(22, 38, 96, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.08)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 38, 96, 0.02)';
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm" style={{color:EVT_COLORS[e.event_type]||'#64748b'}}>{e.event_type}</span>
                        <span className="text-xs font-semibold font-mono" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>{e.event_date?.split('T')[0]}</span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: '#334155' }}>{e.details}</p>
                      {e.order_number && <p className="text-xs font-semibold mt-1" style={{ color: '#3b82f6' }}>Order: {e.order_number}</p>}
                      <p className="text-xs mt-1" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>Recorded by: {e.recorded_by_name||e.recorder_username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {showAdd && (
            <Modal title="Add Service Book Entry" onClose={()=>setShowAdd(false)} theme="light">
              <div className="space-y-3">
                <div>
                  <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Date</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={form.event_date} 
                    onChange={e=>setForm({...form,event_date:e.target.value})}
                    style={{
                      background: '#fff',
                      border: '1px solid rgba(22, 38, 96, 0.15)',
                      color: '#162660'
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Event Type</label>
                  <select 
                    className="input" 
                    value={form.event_type} 
                    onChange={e=>setForm({...form,event_type:e.target.value})}
                    style={{
                      background: '#fff',
                      border: '1px solid rgba(22, 38, 96, 0.15)',
                      color: '#162660'
                    }}
                  >
                    {Object.keys(EVT_COLORS).map(ev=><option key={ev} style={{ color: '#162660', background: '#fff' }}>{ev}</option>)}
                    <option style={{ color: '#162660', background: '#fff' }}>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Order Number (optional)</label>
                  <input 
                    className="input" 
                    value={form.order_number} 
                    onChange={e=>setForm({...form,order_number:e.target.value})}
                    style={{
                      background: '#fff',
                      border: '1px solid rgba(22, 38, 96, 0.15)',
                      color: '#162660'
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Details</label>
                  <textarea 
                    className="input" 
                    rows={3} 
                    value={form.details} 
                    onChange={e=>setForm({...form,details:e.target.value})}
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
                onClick={addEntry} 
                disabled={!form.event_date || !form.event_type || !form.details}
                style={{
                  background: '#162660',
                  color: '#FEFEFA',
                  boxShadow: '0 4px 15px rgba(22, 38, 96, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = '#68aae8';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 38, 96, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#162660';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(22, 38, 96, 0.2)';
                }}
              >
                Add Entry
              </button>
            </Modal>
          )}
        </>
      )}
    </Layout>
  );
}