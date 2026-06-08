import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { Plus, Users, Calendar, MapPin } from 'lucide-react';
import { trainingAPI, deptAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function Training() {
  const { isMin } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ prog_id:null, emp_id:'' });
  const [showEnroll, setShowEnroll] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ title:'', dept_id:'', start_date:'', end_date:'', venue:'', capacity:30, is_mandatory:false, training_type:'', provider_name:'', description:'' });

  const load = () => {
    setLoading(true);
    Promise.all([trainingAPI.listPrograms(), deptAPI.list()])
      .then(([p,d])=>{ setPrograms(p.data.data||[]); setDepts(d.data.data||[]); })
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const createProgram = async () => {
    try { await trainingAPI.createProgram(form); setMsg('Program created'); setShowForm(false); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };
  const enroll = async () => {
    try { await trainingAPI.enroll({ program_id: enrollForm.prog_id, emp_id: enrollForm.emp_id }); setMsg('Enrolled successfully'); setShowEnroll(false); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  return (
    <Layout title="Training & Development" theme="light" bg="#F8F8FF">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
        <div 
          className="text-center p-3 md:p-5 transition-all duration-300"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(22, 38, 96, 0.02)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(22, 38, 96, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 38, 96, 0.02)';
            e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.08)';
          }}
        >
          <p className="text-2xl font-bold text-blue-600">{programs.length}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>Total Programs</p>
        </div>
        
        <div 
          className="text-center p-5 transition-all duration-300"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(22, 38, 96, 0.02)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(22, 38, 96, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 38, 96, 0.02)';
            e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.08)';
          }}
        >
          <p className="text-2xl font-bold text-green-600">{programs.filter(p=>p.status==='Upcoming').length}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>Upcoming</p>
        </div>

        <div 
          className="text-center p-5 transition-all duration-300"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(22, 38, 96, 0.02)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(22, 38, 96, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 38, 96, 0.02)';
            e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.08)';
          }}
        >
          <p className="text-2xl font-bold text-purple-600">{programs.filter(p=>p.is_mandatory).length}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>Mandatory</p>
        </div>

        <div 
          className="text-center p-5 transition-all duration-300"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(22, 38, 96, 0.02)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(22, 38, 96, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 38, 96, 0.02)';
            e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.08)';
          }}
        >
          <p className="text-2xl font-bold text-emerald-600">{programs.reduce((s,p)=>s+parseInt(p.enrolled_count||0),0)}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>Total Enrolled</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="section-title mb-0" style={{ color: '#162660' }}>Training Programs</h3>
        {isMin('hr_staff') && (
          <button 
            className="btn font-semibold flex items-center justify-center gap-2 transition-all duration-200 w-full sm:w-auto" 
            onClick={()=>setShowForm(true)}
            style={{
              background: '#162660',
              color: '#FEFEFA',
              boxShadow: '0 4px 15px rgba(22, 38, 96, 0.2)',
              borderRadius: '8px',
              padding: '8px 16px',
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
          >
            <Plus size={16}/>Add Program
          </button>
        )}
      </div>
      {loading ? <Loader/> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(p=>(
            <div 
              key={p.id} 
              className="p-4 md:p-5 cursor-pointer transition-all duration-300" 
              onClick={()=>setSelected(p)}
              style={{
                background: '#fff',
                border: '1px solid rgba(22, 38, 96, 0.08)',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(22, 38, 96, 0.02)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(22, 38, 96, 0.08)';
                e.currentTarget.style.borderColor = '#68aae8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 38, 96, 0.02)';
                e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.08)';
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-lg" style={{ color: '#162660' }}>{p.title}</h4>
                    {p.is_mandatory && (
                      <span 
                        className="badge" 
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.2)',
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}
                      >
                        Mandatory
                      </span>
                    )}
                  </div>
                  <span 
                    className="badge" 
                    style={{
                      background: 'rgba(59,130,246,0.1)',
                      color: '#2563eb',
                      border: '1px solid rgba(59,130,246,0.2)',
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}
                  >
                    {p.dept_name||'All Departments'}
                  </span>
                </div>
                <Badge text={p.status}/>
              </div>
              <div className="space-y-2 text-sm" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>
                <div className="flex items-center gap-2">
                  <Calendar size={13} style={{ color: '#162660' }}/>
                  <span>{p.start_date?.split('T')[0]} → {p.end_date?.split('T')[0]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={13} style={{ color: '#162660' }}/>
                  <span>{p.venue||'TBD'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={13} style={{ color: '#162660' }}/>
                  <div className="flex-1 rounded-full h-2" style={{ background: 'rgba(22, 38, 96, 0.08)' }}>
                    <div 
                      className="h-2 rounded-full" 
                      style={{
                        width: `${Math.min(100,((parseInt(p.enrolled_count)||0)/p.capacity)*100)}%`,
                        background: '#3b82f6'
                      }}
                    ></div>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: '#162660' }}>{p.enrolled_count||0}/{p.capacity}</span>
                </div>
              </div>
              {p.status==='Upcoming' && isMin('hr_staff') && (
                <button 
                  className="btn w-full mt-4 text-sm font-semibold transition-all duration-200" 
                  onClick={e=>{ 
                    e.stopPropagation(); 
                    setEnrollForm({prog_id:p.id,emp_id:''}); 
                    setShowEnroll(true); 
                  }}
                  style={{
                    background: '#162660',
                    color: '#FEFEFA',
                    boxShadow: '0 4px 12px rgba(22, 38, 96, 0.15)',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#68aae8';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(22, 38, 96, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#162660';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 38, 96, 0.15)';
                  }}
                >
                  Enroll Employee
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Modal title={selected.title} onClose={()=>setSelected(null)} theme="light">
          <div className="space-y-1">
            {[
              ['Department', selected.dept_name||'All'],
              ['Start Date', selected.start_date?.split('T')[0]],
              ['End Date', selected.end_date?.split('T')[0]],
              ['Venue', selected.venue||'TBD'],
              ['Capacity', selected.capacity],
              ['Enrolled', selected.enrolled_count||0],
              ['Mandatory', selected.is_mandatory?'Yes':'No'],
              ['Provider', selected.provider_name||'—'],
              ['Status', selected.status]
            ].map(([k,v])=>(
              <div 
                key={k} 
                className="flex justify-between py-2.5 border-b text-sm"
                style={{ borderColor: 'rgba(22, 38, 96, 0.05)' }}
              >
                <span style={{ color: 'rgba(22, 38, 96, 0.6)', fontWeight: '500' }}>{k}</span>
                <span className="font-semibold" style={{ color: '#162660' }}>{v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showEnroll && (
        <Modal title="Enroll Employee" onClose={()=>setShowEnroll(false)} theme="light">
          <div className="space-y-3">
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Employee ID</label>
              <input 
                className="input" 
                value={enrollForm.emp_id} 
                onChange={e=>setEnrollForm({...enrollForm,emp_id:e.target.value})} 
                placeholder="EMP00001"
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
            onClick={enroll}
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
          >
            Confirm Enrollment
          </button>
        </Modal>
      )}

      {showForm && (
        <Modal title="Add Training Program" onClose={()=>setShowForm(false)} theme="light">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Title</label>
              <input 
                className="input" 
                value={form.title} 
                onChange={e=>setForm({...form,title:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Department</label>
              <select 
                className="input" 
                value={form.dept_id} 
                onChange={e=>setForm({...form,dept_id:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              >
                <option value="" style={{ color: '#162660', background: '#fff' }}>All Departments</option>
                {depts.map(d=><option key={d.id} value={d.id} style={{ color: '#162660', background: '#fff' }}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Capacity</label>
              <input 
                type="number" 
                className="input" 
                value={form.capacity} 
                onChange={e=>setForm({...form,capacity:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Start Date</label>
              <input 
                type="date" 
                className="input" 
                value={form.start_date} 
                onChange={e=>setForm({...form,start_date:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>End Date</label>
              <input 
                type="date" 
                className="input" 
                value={form.end_date} 
                onChange={e=>setForm({...form,end_date:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Venue</label>
              <input 
                className="input" 
                value={form.venue} 
                onChange={e=>setForm({...form,venue:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Training Type</label>
              <input 
                className="input" 
                value={form.training_type} 
                onChange={e=>setForm({...form,training_type:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Provider</label>
              <input 
                className="input" 
                value={form.provider_name} 
                onChange={e=>setForm({...form,provider_name:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2 mt-1">
              <input 
                type="checkbox" 
                id="mand" 
                checked={form.is_mandatory} 
                onChange={e=>setForm({...form,is_mandatory:e.target.checked})}
                style={{
                  accentColor: '#162660'
                }}
              />
              <label htmlFor="mand" className="text-sm font-semibold" style={{ color: '#162660' }}>Mandatory Training</label>
            </div>
          </div>
          <button 
            className="btn w-full mt-4 font-semibold transition-all duration-200" 
            onClick={createProgram}
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
          >
            Create Program
          </button>
        </Modal>
      )}
    </Layout>
  );
}



