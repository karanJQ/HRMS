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

function CustomDropdown({ value, onChange, options, placeholder, width = 160 }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => String(opt.value) === String(value)) || { label: placeholder, value: "" };

  return (
    <div 
      ref={containerRef} 
      className="relative transition-all duration-300"
      style={{ width, zIndex: isOpen ? 50 : 10 }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          background: '#fff',
          border: isOpen ? '1px solid #68aae8' : '1px solid rgba(22, 38, 96, 0.15)',
          color: '#162660',
          padding: '8px 12px',
          height: '38px',
          borderRadius: '8px',
          boxShadow: isOpen 
            ? '0 0 0 4px rgba(104, 170, 232, 0.35), 0 4px 12px rgba(22, 38, 96, 0.1)' 
            : '0 2px 4px rgba(22, 38, 96, 0.03)',
          cursor: 'pointer',
          transform: isOpen ? 'translateY(-1px)' : 'none',
          transition: 'all 0.3s ease',
          fontSize: '14px',
          userSelect: 'none'
        }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = '#68aae8';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(104, 170, 232, 0.25), 0 4px 10px rgba(22, 38, 96, 0.06)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.15)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(22, 38, 96, 0.03)';
            e.currentTarget.style.transform = 'none';
          }
        }}
      >
        <span className="truncate font-medium">{selectedOption.label}</span>
        <svg 
          viewBox="0 0 24 24" 
          width="16" 
          height="16" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            marginLeft: '4px',
            color: 'rgba(22, 38, 96, 0.6)',
            flexShrink: 0
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isOpen && (
        <div
          className="absolute left-0 mt-1.5 w-full rounded-xl"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            boxShadow: '0 10px 25px rgba(22, 38, 96, 0.15), 0 4px 12px rgba(22, 38, 96, 0.05)',
            maxHeight: '220px',
            overflowY: 'auto',
            animation: 'slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: '4px'
          }}
        >
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className="transition-all duration-150"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: isSelected ? '#162660' : 'rgba(22, 38, 96, 0.8)',
                  background: isSelected ? 'rgba(104, 170, 232, 0.15)' : 'transparent',
                  fontWeight: isSelected ? '600' : '400',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isSelected ? 'rgba(104, 170, 232, 0.25)' : 'rgba(22, 38, 96, 0.04)';
                  e.currentTarget.style.color = '#162660';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected ? 'rgba(104, 170, 232, 0.15)' : 'transparent';
                  e.currentTarget.style.color = isSelected ? '#162660' : 'rgba(22, 38, 96, 0.8)';
                }}
              >
                <span className="truncate flex-1 text-left">{opt.label}</span>
                {isSelected && (
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="#162660" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: '6px' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function APAR() {
  const { isMin, can, user } = useAuth();
  const FY_OPTIONS = ['2025-26','2024-25','2023-24','2022-23'];
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2024-25');
  const [selected, setSelected] = useState(null);
  const [fillMode, setFillMode] = useState(null); // 'self'|'reporting'|'reviewing'
  const [form, setForm] = useState({ grade:'', remarks:'' });
  const [msg, setMsg] = useState('');
  const [initForm, setInitForm] = useState({ emp_id:'', financial_year:'' });
  const [showInit, setShowInit] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const load = (yr) => {
    setLoading(true);
    aparAPI.list({ year: yr || selectedYear }).then(r=>setData(r.data.data||[])).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(selectedYear); },[selectedYear]);

  const fetchInsights = async (id) => {
    setLoadingInsights(true);
    try {
      const res = await aparAPI.aiInsights(id);
      setAiInsights(res.data.data);
    } catch(e) {
      setMsg('Error fetching insights: ' + e.message);
    } finally {
      setLoadingInsights(false);
    }
  };

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

  const GradeTag = ({val}) => val ? <span style={{color:COLOR[val],fontWeight:600}}>{val}</span> : <span style={{ color: 'rgba(22, 38, 96, 0.25)' }}>—</span>;

  return (
    <Layout title="APAR / Performance Appraisal" theme="light" bg="#F8F8FF">
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
      <div className="grid grid-cols-4 gap-4 mb-5">
        {['Completed','Pending Self-Assessment','Pending Reporting Officer','Pending Reviewing Officer'].map(s=>(
          <div 
            key={s} 
            className="hover-card text-center transition-all duration-300"
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(22, 38, 96, 0.1)',
              boxShadow: '0 4px 12px rgba(22, 38, 96, 0.03)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 15px rgba(22, 38, 96, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 38, 96, 0.03)';
            }}
          >
            <p className="text-3xl font-bold" style={{color:s==='Completed'?'#10B981':'#D97706'}}>{data.filter(a=>a.status===s).length}</p>
            <p className="text-xs font-semibold mt-1.5" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{s}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold" style={{ color: '#162660' }}>APAR Records</h3>
          <CustomDropdown
            value={selectedYear}
            onChange={val => setSelectedYear(val)}
            options={FY_OPTIONS.map(y => ({ value: y, label: y }))}
            placeholder="Select Year"
            width={130}
          />
        </div>
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
            onClick={()=>setShowInit(true)}
          >
            <Plus size={16}/>Initiate APAR
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
            boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)'
          }}
        >
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['Employee', 'Dept', 'Year', 'Self', 'Reporting', 'Reviewing', 'Final', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{data.map(a=>(
                <tr 
                  key={a.id}
                  className="transition-all duration-300"
                  style={{ 
                    borderBottom: '1px solid rgba(22, 38, 96, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td>
                    <div className="font-medium" style={{ color: '#162660' }}>{a.emp_name}</div>
                    <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{a.emp_id}</div>
                  </td>
                  <td style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{a.dept_name}</td>
                  <td style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{a.financial_year}</td>
                  <td><GradeTag val={a.self_grade}/></td>
                  <td><GradeTag val={a.reporting_grade}/></td>
                  <td><GradeTag val={a.reviewing_grade}/></td>
                  <td><GradeTag val={a.final_grade}/></td>
                  <td><Badge text={a.status}/></td>
                  <td>
                    <div className="flex gap-2">
                      {a.status==='Pending Self-Assessment' && (user.emp_id===a.emp_id||isMin('hr_manager')) && (
                        <button 
                          className="btn text-xs py-1 px-2.5 font-semibold transition-all duration-200" 
                          style={{
                            background: '#162660',
                            color: '#FEFEFA',
                            boxShadow: '0 2px 6px rgba(22, 38, 96, 0.15)',
                            borderRadius: '8px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#68aae8';
                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(22, 38, 96, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#162660';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(22, 38, 96, 0.15)';
                          }}
                          onClick={()=>{setSelected(a);setFillMode('self');setForm({grade:'',remarks:''});}}
                        >
                          Self
                        </button>
                      )}
                      {a.status==='Pending Reporting Officer' && isMin('dept_head') && (
                        <button 
                          className="btn text-xs py-1 px-2.5 font-semibold transition-all duration-200" 
                          style={{
                            background: '#162660',
                            color: '#FEFEFA',
                            boxShadow: '0 2px 6px rgba(22, 38, 96, 0.15)',
                            borderRadius: '8px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#68aae8';
                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(22, 38, 96, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#162660';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(22, 38, 96, 0.15)';
                          }}
                          onClick={()=>{setSelected(a);setFillMode('reporting');setForm({grade:'',remarks:''});}}
                        >
                          Report
                        </button>
                      )}
                      {a.status==='Pending Reviewing Officer' && isMin('hr_manager') && (
                        <button 
                          className="btn text-xs py-1 px-2.5 font-semibold transition-all duration-200" 
                          style={{
                            background: '#162660',
                            color: '#FEFEFA',
                            boxShadow: '0 2px 6px rgba(22, 38, 96, 0.15)',
                            borderRadius: '8px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#68aae8';
                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(22, 38, 96, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#162660';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(22, 38, 96, 0.15)';
                          }}
                          onClick={()=>{setSelected(a);setFillMode('reviewing');setForm({grade:'',remarks:''});}}
                        >
                          Review
                        </button>
                      )}
                      
                      {isMin('hr_manager') && a.self_grade && (
                        <button 
                          className="btn text-xs py-1 px-2.5 font-semibold transition-all duration-200" 
                          style={{
                            background: 'rgba(104, 170, 232, 0.15)',
                            color: '#162660',
                            border: '1px solid rgba(104, 170, 232, 0.25)',
                            boxShadow: 'none',
                            borderRadius: '8px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#68aae8';
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.borderColor = '#68aae8';
                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(104, 170, 232, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(104, 170, 232, 0.15)';
                            e.currentTarget.style.color = '#162660';
                            e.currentTarget.style.borderColor = 'rgba(104, 170, 232, 0.25)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          onClick={()=>fetchInsights(a.id)}
                        >
                          <Star size={12} className="mr-1"/> AI Insights
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {fillMode && selected && (
        <Modal title={`Fill APAR — ${fillMode.charAt(0).toUpperCase()+fillMode.slice(1)} Assessment`} onClose={()=>{ setFillMode(null); setSelected(null); }} theme="light">
          <p className="text-sm mb-4" style={{ color: 'rgba(22, 38, 96, 0.7)' }}>
            Employee: <strong style={{ color: '#162660' }}>{selected.emp_name}</strong> | Year: <strong style={{ color: '#162660' }}>{selected.financial_year}</strong>
          </p>
          <div className="mb-4">
            <label className="text-sm font-semibold block mb-2" style={{ color: '#162660' }}>Grade</label>
            <div className="flex gap-2 flex-wrap">
              {GRADES.map(g=>(
                <button 
                  key={g} 
                  onClick={()=>setForm({...form,grade:g})}
                  className="px-4 py-2 rounded-lg text-sm border font-semibold transition-all duration-200"
                  style={form.grade===g?{background:COLOR[g],color:'#fff',borderColor:COLOR[g],boxShadow:`0 4px 12px ${COLOR[g]}40`}:{background:'#fff',borderColor:'rgba(22, 38, 96, 0.15)',color:'#162660'}}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Remarks</label>
            <textarea 
              className="input" 
              rows={3} 
              value={form.remarks} 
              onChange={e=>setForm({...form,remarks:e.target.value})}
              style={{
                background: '#fff',
                border: '1px solid rgba(22, 38, 96, 0.15)',
                color: '#162660'
              }}
            />
          </div>
          <button 
            className="btn w-full font-semibold transition-all duration-200" 
            disabled={!form.grade} 
            onClick={submitFill}
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
            Submit
          </button>
        </Modal>
      )}

      {showInit && (
        <Modal title="Initiate APAR" onClose={()=>setShowInit(false)} theme="light">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Employee ID</label>
              <input 
                className="input" 
                value={initForm.emp_id} 
                onChange={e=>setInitForm({...initForm,emp_id:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Financial Year</label>
              <select 
                className="input" 
                value={initForm.financial_year} 
                onChange={e=>setInitForm({...initForm,financial_year:e.target.value})}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22, 38, 96, 0.15)',
                  color: '#162660'
                }}
              >
                <option value="" style={{ color: '#162660', background: '#fff' }}>Select</option>
                {FY_OPTIONS.map(y=><option key={y} style={{ color: '#162660', background: '#fff' }}>{y}</option>)}
              </select>
            </div>
          </div>
          <button 
            className="btn w-full mt-4 font-semibold transition-all duration-200" 
            onClick={initiate}
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
            Initiate APAR
          </button>
        </Modal>
      )}

      {aiInsights && (
        <Modal title="✨ AI KPI Insights" onClose={()=>setAiInsights(null)} theme="light">
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(104, 170, 232, 0.08)', border: '1px solid rgba(104, 170, 232, 0.2)' }}>
              <h4 className="font-semibold mb-2" style={{ color: '#162660' }}>Summary & Sentiment</h4>
              <p className="text-sm" style={{ color: 'rgba(22, 38, 96, 0.8)' }}>{aiInsights.summary}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <h4 className="font-semibold mb-2" style={{ color: '#065f46' }}>Key Strengths</h4>
                <ul className="list-disc pl-4 text-sm space-y-1" style={{ color: '#065f46' }}>
                  {aiInsights.key_strengths.map((s,i)=><li key={i}>{s}</li>)}
                </ul>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                <h4 className="font-semibold mb-2" style={{ color: '#92400e' }}>Areas for Improvement</h4>
                <ul className="list-disc pl-4 text-sm space-y-1" style={{ color: '#92400e' }}>
                  {aiInsights.areas_for_improvement.map((s,i)=><li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-xl mt-4" style={{ background: 'rgba(22, 38, 96, 0.02)', border: '1px solid rgba(22, 38, 96, 0.08)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#162660' }}>KPI Alignment</p>
              <p className="text-sm mb-3" style={{ color: 'rgba(22, 38, 96, 0.7)' }}>{aiInsights.kpi_alignment}</p>
              
              <p className="text-sm font-semibold mb-1" style={{ color: '#162660' }}>AI Recommendation</p>
              <p className="text-sm" style={{ color: 'rgba(22, 38, 96, 0.7)' }}>{aiInsights.recommendation}</p>
            </div>
          </div>
          <button 
            className="btn w-full mt-6 font-semibold transition-all duration-200" 
            onClick={()=>setAiInsights(null)}
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
            Close
          </button>
        </Modal>
      )}
      
      {loadingInsights && (
        <div className="modal-overlay">
          <div className="p-8 rounded-2xl flex flex-col items-center border" style={{ background: '#fff', borderColor: 'rgba(22, 38, 96, 0.12)', boxShadow: '0 20px 40px rgba(22, 38, 96, 0.15)' }}>
            <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: '#162660', borderTopColor: 'transparent' }}></div>
            <p className="font-medium animate-pulse" style={{ color: '#162660' }}>Analyzing Performance Data...</p>
          </div>
        </div>
      )}
    </Layout>
  );
}