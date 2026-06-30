import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import ErrorMsg from '../components/common/ErrorMsg';
import { Plus, Eye, Edit2, Search } from 'lucide-react';
import { empAPI, deptAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/common/Pagination';

const blank = { first_name: '', last_name: '', father_name: '', gender: 'Male', dob: '', doj: '', mobile: '', alternate_mobile: '', official_email: '', personal_email: '', aadhaar_number: '', pan_number: '', dept_id: '', pay_level: '', basic_pay: '', ctc: '', posting_station: '', blood_group: '', qualification: '', subject_specialization: '', experience_years: 0, account_number: '', bank_name: '', ifsc_code: '', pf_number: '', uan_number: '', esic_number: '', nominee_name: '', nominee_relation: '', emergency_contact_name: '', emergency_contact_mobile: '', status: 'Active', probation_days: 90, reporting_manager_id: '' };

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
                  justifyContent: 'between'
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

const F = ({ k, l, type = 'text', opts, full, req, pattern, title, maxLength, restrict, form, setForm }) => {
  const handleChange = (e) => {
    let val = e.target.value;
    if (restrict === 'number') val = val.replace(/\D/g, '');
    if (restrict === 'text') val = val.replace(/[^a-zA-Z\s]/g, '');
    if (restrict === 'pan') val = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (restrict === 'ifsc') val = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (restrict === 'pf') val = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (maxLength && val.length > maxLength) val = val.slice(0, maxLength);
    setForm({ ...form, [k]: val });
  };
  return (
  <div className={full ? 'col-span-3' : ''}>
    <label className="text-xs text-slate-400 block mb-1">{l}{req && <span className="text-red-400">*</span>}</label>
    {opts ? <select className="input" required={req} value={form[k] || ''} onChange={handleChange}>
      <option value="">Select</option>{opts.map(o => <option key={o.v || o} value={o.v || o}>{o.l || o}</option>)}
    </select> : <input type={type} className="input" required={req} pattern={pattern} title={title} maxLength={maxLength} value={form[k] || ''} onChange={handleChange} />}
  </div>
  );
};

export default function EmployeeMaster() {
  const { can, isMin, user } = useAuth();
  const [emps, setEmps] = useState([]);
  const [allEmps, setAllEmps] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ dept: '', status: '' });
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(emps.length / itemsPerPage) || 1;
  const paginatedEmps = emps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [emps]);

  const load = () => {
    setLoading(true);
    empAPI.list({ search, dept: filter.dept, status: filter.status })
      .then(r => { setEmps(r.data.data.employees || []); setTotal(r.data.data.total || 0); })
      .catch(e => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    deptAPI.list().then(r => setDepts(r.data.data || []));
    empAPI.list({ limit: 1000 }).then(r => setAllEmps(r.data.data.employees || []));
  }, []);

  useEffect(() => { load(); }, [search, filter]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editMode) await empAPI.update(form.emp_id, form);
      else await empAPI.create(form);
      setMsg(editMode ? 'Employee updated!' : 'Employee created!');
      setShowForm(false); setEditMode(false); setForm(blank);
      load();
    } catch (e) { setMsg('Error: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  const handleExportAll = async () => {
    try {
      const res = await empAPI.list({ limit: 10000 });
      const data = res.data.data.employees;
      if (!data || data.length === 0) return setMsg('No data to export');
      
      const exclude = ['id'];
      const keys = Object.keys(data[0]).filter(k => !exclude.includes(k));
      const csv = [
        keys.join(','),
        ...data.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Employees_Master_Report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (e) {
      setMsg('Error exporting: ' + (e.message || e));
    }
  };

  const handleExportIndividual = (emp) => {
    const exclude = ['id'];
    const keys = Object.keys(emp).filter(k => !exclude.includes(k));
    const csv = [
      keys.join(','),
      keys.map(k => `"${String(emp[k] || '').replace(/"/g, '""')}"`).join(',')
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Employee_${emp.emp_id}_Report.csv`;
    a.click();
  };





  return (
    <Layout title="Employee Master" theme="light" bg="#F8F8FF">
        {msg && !showForm && !view && <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${msg.startsWith('Error') ? 'bg-red-900/50 text-red-200 border border-red-500/30' : 'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30'}`}>{msg}</div>}

        <div className="flex flex-col lg:flex-row gap-4 mb-6 items-start lg:items-center justify-between w-full">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto">
          <div 
            className="flex items-center justify-between rounded-full pl-4 pr-1 py-1 w-full sm:w-72" 
            style={{ 
              background: '#fff', 
              boxShadow: '0 4px 12px rgba(22, 38, 96, 0.08)',
              border: '1px solid rgba(22, 38, 96, 0.12)',
              height: 40
            }}
          >
            <input 
              placeholder="Search name/ID/mobile..." 
              className="outline-none text-sm bg-transparent flex-1" 
              style={{ color: '#162660' }} 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200" 
              style={{ background: '#162660', color: '#fff' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.background = '#203580';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.background = '#162660';
              }}
            >
              <Search size={14} />
            </div>
          </div>
            <CustomDropdown 
              value={filter.dept} 
              onChange={val => setFilter({ ...filter, dept: val })} 
              options={[
                { value: "", label: "All Departments" },
                ...depts.map(d => ({ value: d.id, label: d.name }))
              ]} 
              placeholder="All Departments" 
              width={160} 
            />
            <CustomDropdown 
              value={filter.status} 
              onChange={val => setFilter({ ...filter, status: val })} 
              options={[
                { value: "", label: "All Status" },
                ...['Active', 'On Probation', 'On Leave', 'Retired', 'Suspended', 'Resigned'].map(s => ({ value: s, label: s }))
              ]} 
              placeholder="All Status" 
              width={130} 
            />
          </div>
          {isMin('hr_staff') && (
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              {isMin('hr_staff') && (
                <button 
                  className="btn font-semibold transition-all duration-200 flex items-center justify-center gap-1 w-full sm:w-auto" 
                  style={{ 
                    background: '#fff', 
                    color: '#162660',
                    border: '1px solid rgba(22, 38, 96, 0.15)',
                    boxShadow: '0 2px 8px rgba(22, 38, 96, 0.05)',
                    padding: '8px 16px'
                  }} 
                  onClick={handleExportAll}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#68aae8';
                    e.currentTarget.style.color = '#68aae8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.15)';
                    e.currentTarget.style.color = '#162660';
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Export All
                </button>
              )}
              <button 
                className="btn font-semibold transition-all duration-200 flex items-center justify-center gap-1 w-full sm:w-auto" 
                style={{ 
                  background: '#162660', 
                  color: '#FEFEFA',
                  boxShadow: '0 4px 15px rgba(22, 38, 96, 0.25)',
                  padding: '8px 16px'
                }} 
                onClick={() => { setForm(blank); setEditMode(false); setShowForm(true); }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#68aae8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 38, 96, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#162660';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(22, 38, 96, 0.25)';
                }}
              >
                <Plus size={16} />Add Employee
              </button>
            </div>
          )}
        </div>

        {loading ? <Loader /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
          <div className="card" style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid rgba(22, 38, 96, 0.1)', boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title mb-0" style={{ color: '#162660' }}>Employees ({total})</h3>
            </div>
            <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '1000px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                    <th style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>Emp ID</th>
                    <th style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>Name</th>
                    <th style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>Department</th>
                    <th style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>Status</th>
                    <th style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>{paginatedEmps.map((e, idx) => (
                  <tr 
                    key={e.emp_id} 
                    className="transition-all duration-300"
                    style={{ 
                      borderBottom: '1px solid rgba(22, 38, 96, 0.05)',
                      animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
                      animationDelay: `${idx * 40}ms`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                      e.currentTarget.style.transform = 'scale(1.002) translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 38, 96, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <td className="font-mono font-medium" style={{ color: '#162660' }}>{e.emp_id}</td>
                    <td>
                      <div className="font-medium" style={{ color: '#162660' }}>{e.first_name} {e.last_name}</div>
                      <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{e.official_email}</div>
                    </td>
                    <td style={{ color: '#162660' }}>{e.dept_name}</td>
                    <td><Badge text={e.status} /></td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          className="btn transition-all duration-300" 
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(104, 170, 232, 0.12)',
                            color: '#162660',
                            border: '1px solid rgba(104, 170, 232, 0.2)',
                            cursor: 'pointer',
                            padding: 0
                          }} 
                          onClick={() => setView(e)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#68aae8';
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.borderColor = '#68aae8';
                            e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 6px 15px rgba(104, 170, 232, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(104, 170, 232, 0.12)';
                            e.currentTarget.style.color = '#162660';
                            e.currentTarget.style.borderColor = 'rgba(104, 170, 232, 0.2)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <svg 
                            viewBox="0 0 24 24" 
                            width="14" 
                            height="14" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className="inline-block"
                          >
                            <path d="M2.5 12C4.5 7.5 8 4.5 12 4.5s7.5 3 9.5 7.5c-2 4.5-5.5 7.5-9.5 7.5s-7.5-3-9.5-7.5z" />
                            <path 
                              d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" 
                              fill="currentColor" 
                              fillRule="evenodd" 
                              stroke="none" 
                            />
                          </svg>
                        </button>
                        {isMin('hr_staff') && (
                          <button 
                            className="btn transition-all duration-300" 
                            style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'rgba(22, 38, 96, 0.05)',
                              color: '#162660',
                              border: '1px solid rgba(22, 38, 96, 0.1)',
                              cursor: 'pointer',
                              padding: 0
                            }} 
                            onClick={() => { setForm({...e, dob: e.dob?.split('T')[0] || '', doj: e.doj?.split('T')[0] || '', nominee_dob: e.nominee_dob?.split('T')[0] || ''}); setEditMode(true); setShowForm(true); }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#162660';
                              e.currentTarget.style.color = '#fff';
                              e.currentTarget.style.borderColor = '#162660';
                              e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                              e.currentTarget.style.boxShadow = '0 6px 15px rgba(22, 38, 96, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(22, 38, 96, 0.05)';
                              e.currentTarget.style.color = '#162660';
                              e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.1)';
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}

        {view && (
          <Modal title={`${view.first_name} ${view.last_name} — Profile`} onClose={() => setView(null)} theme="light" wide>
            <div className="flex gap-4 mb-4 p-4 rounded-xl" style={{ background: '#162660', border: '1px solid rgba(208, 230, 253, 0.2)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: '#D0E6FD', color: '#162660' }}>{view.first_name?.[0]}</div>
              <div><p className="font-bold text-lg text-white">{view.first_name} {view.last_name}</p><p className="text-sm text-slate-300">{view.dept_name}</p><p className="text-xs text-slate-400">{view.emp_id} • Level-{view.pay_level}</p></div>
              <div className="ml-auto flex items-center gap-3">
                {isMin('hr_staff') && (
                  <button 
                    className="btn transition-all duration-200 text-sm flex items-center gap-1"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px' }}
                    onClick={() => handleExportIndividual(view)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export
                  </button>
                )}
                <Badge text={view.status} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-x-6 gap-y-3">
              {[['DOB', view.dob?.split('T')[0]], ['DOJ', view.doj?.split('T')[0]], ['Probation', view.probation_days > 0 ? `${view.probation_days} days (${view.probation_status || 'Pending'})` : 'None'], ['Reporting Manager', view.reporting_manager_name || '—'], ['Mobile', view.mobile], ['Email', view.official_email], ['Blood Group', view.blood_group], ['Qualification', view.qualification], ['PF No.', view.pf_number], ['UAN No.', view.uan_number], ['ESIC No.', view.esic_number], ['PAN', view.pan_number], ['Bank', `${view.bank_name || ''} / ${view.ifsc_code || ''}`], ['Account No.', view.account_number], ['Nominee', view.nominee_name], ['Experience', `${view.experience_years} years`], ['Father Name', view.father_name], ['Monthly CTC', view.ctc || view.basic_pay ? `₹${parseFloat(view.ctc || view.basic_pay).toLocaleString()}` : '—']].map(([k, v]) => (
                <div key={k}><p className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{k}</p><p className="text-sm font-medium" style={{ color: '#162660' }}>{v || '—'}</p></div>
              ))}
            </div>
          </Modal>
        )}

        {showForm && (
          <Modal title={editMode ? 'Edit Employee' : 'Add New Employee'} onClose={() => { setShowForm(false); setEditMode(false); setForm(blank); setMsg(''); }} theme="light" wide>
            {msg && <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${msg.startsWith('Error') ? 'bg-red-900/50 text-red-200 border border-red-500/30' : 'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30'}`}>{msg}</div>}
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 mt-4">
              <div className="col-span-1 md:col-span-3 font-bold text-sm text-[#162660] mt-2 border-b pb-1">Personal Information</div>
              <F form={form} setForm={setForm} k="first_name" l="First Name" req />
              <F form={form} setForm={setForm} k="last_name" l="Last Name" req />
              <F form={form} setForm={setForm} k="father_name" l="Father's Name" />
              <F form={form} setForm={setForm} k="gender" l="Gender" opts={['Male', 'Female', 'Other']} req />
              <F form={form} setForm={setForm} k="dob" l="Date of Birth" type="date" req />
              <F form={form} setForm={setForm} k="blood_group" l="Blood Group" opts={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} />
              <F form={form} setForm={setForm} k="qualification" l="Qualification" />
              <F form={form} setForm={setForm} k="experience_years" l="Experience (Years)" type="number" />
              
              <div className="col-span-1 md:col-span-3 font-bold text-sm text-[#162660] mt-4 border-b pb-1">Employment Details</div>
              <F form={form} setForm={setForm} k="doj" l="Date of Joining" type="date" req />
              <div><label className="text-xs text-slate-400 block mb-1">Department<span className="text-red-400">*</span></label>
                <select className="input" value={form.dept_id || ''} onChange={e => setForm({ ...form, dept_id: e.target.value })} required>
                  <option value="">Select</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-400 block mb-1">Reporting Manager</label>
                <select className="input" value={form.reporting_manager_id || ''} onChange={e => setForm({ ...form, reporting_manager_id: e.target.value })}>
                  <option value="">None</option>
                  {allEmps.map(e => <option key={e.emp_id} value={e.emp_id}>{e.first_name} {e.last_name} ({e.emp_id})</option>)}
                </select>
              </div>
              <F form={form} setForm={setForm} k="pay_level" l="Pay Level" type="number" />
              <F form={form} setForm={setForm} k="ctc" l="Monthly Gross Salary (₹)" type="number" />
              <F form={form} setForm={setForm} k="probation_days" l="Probation (Days)" type="number" />
              
              <div className="col-span-1 md:col-span-3 font-bold text-sm text-[#162660] mt-4 border-b pb-1">Contact Information</div>
              <F form={form} setForm={setForm} k="mobile" l="Mobile" req pattern="^[6-9]\d{9}$" title="10-digit mobile number starting with 6-9" restrict="number" maxLength={10} />
              <F form={form} setForm={setForm} k="alternate_mobile" l="Alternate Mobile" pattern="^[6-9]\d{9}$" title="10-digit mobile number starting with 6-9" restrict="number" maxLength={10} />
              <F form={form} setForm={setForm} k="official_email" l="Official Email" type="email" pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$" title="Valid email address" />
              <F form={form} setForm={setForm} k="emergency_contact_name" l="Emergency Contact Name" pattern="^[a-zA-Z\s]+$" title="Only letters and spaces allowed" restrict="text" />
              <F form={form} setForm={setForm} k="emergency_contact_mobile" l="Emergency Mobile" pattern="^[6-9]\d{9}$" title="10-digit mobile number starting with 6-9" restrict="number" maxLength={10} />
              
              <div className="col-span-1 md:col-span-3 font-bold text-sm text-[#162660] mt-4 border-b pb-1">KYC Info</div>
              <F form={form} setForm={setForm} k="pan_number" l="PAN No." pattern="^[A-Z]{5}\d{4}[A-Z]{1}$" title="Valid PAN format (e.g., ABCDE1234F)" restrict="pan" maxLength={10} />
              <F form={form} setForm={setForm} k="aadhaar_number" l="Aadhaar No." pattern="^\d{12}$" title="12-digit Aadhaar number" restrict="number" maxLength={12} />
              <F form={form} setForm={setForm} k="pf_number" l="PF No." pattern="^[A-Z0-9]{10,22}$" title="10 to 22 alphanumeric characters" restrict="pf" maxLength={22} />
              <F form={form} setForm={setForm} k="uan_number" l="UAN No." pattern="^\d{12}$" title="12-digit UAN number" restrict="number" maxLength={12} />
              <F form={form} setForm={setForm} k="esic_number" l="ESIC No." pattern="^\d{10,17}$" title="10 to 17 digit ESIC number" restrict="number" maxLength={17} />
              
              <div className="col-span-1 md:col-span-3 font-bold text-sm text-[#162660] mt-4 border-b pb-1">Bank Details</div>
              <F form={form} setForm={setForm} k="bank_name" l="Bank Name" pattern="^[a-zA-Z\s]+$" title="Only letters and spaces allowed" restrict="text" />
              <F form={form} setForm={setForm} k="account_number" l="Account No." pattern="^\d{9,18}$" title="9 to 18 digits" restrict="number" maxLength={18} />
              <F form={form} setForm={setForm} k="ifsc_code" l="IFSC Code" pattern="^[A-Z]{4}0[A-Z0-9]{6}$" title="Valid IFSC code" restrict="ifsc" maxLength={11} />
              <F form={form} setForm={setForm} k="nominee_name" l="Nominee Name" pattern="^[a-zA-Z\s]+$" title="Only letters and spaces allowed" restrict="text" />
              <F form={form} setForm={setForm} k="nominee_relation" l="Relation" pattern="^[a-zA-Z\s]+$" title="Only letters and spaces allowed" restrict="text" />
            </div>
            <button 
              type="submit"
              className="btn w-full mt-4 font-semibold" 
              style={{ 
                background: 'linear-gradient(135deg, #D0E6FD 0%, #FEFEFA 100%)', 
                color: '#162660',
                boxShadow: '0 4px 15px rgba(208, 230, 253, 0.3)'
              }} 
              disabled={saving} 
            >
              {saving ? 'Saving...' : editMode ? 'Save Changes' : 'Add Employee'}
            </button>
            </form>
          </Modal>
        )}
    </Layout>
  );
}