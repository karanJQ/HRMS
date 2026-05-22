import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import ErrorMsg from '../components/common/ErrorMsg';
import { Plus, Eye, Edit2, Search } from 'lucide-react';
import { empAPI, deptAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

const blank = { first_name:'',last_name:'',father_name:'',gender:'Male',dob:'',doj:'',mobile:'',alternate_mobile:'',official_email:'',personal_email:'',aadhaar_number:'',pan_number:'',dept_id:'',designation_id:'',grade:'',pay_level:'',basic_pay:'',category:'General',district:'',posting_station:'',blood_group:'',qualification:'',subject_specialization:'',experience_years:0,account_number:'',bank_name:'',ifsc_code:'',pf_number:'',nominee_name:'',nominee_relation:'',emergency_contact_name:'',emergency_contact_mobile:'',status:'Active' };

export default function EmployeeMaster() {
  const { can, isMin, user } = useAuth();
  const [emps, setEmps] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ dept:'', status:'' });
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    empAPI.list({ search, dept: filter.dept, status: filter.status })
      .then(r => { setEmps(r.data.data.employees||[]); setTotal(r.data.data.total||0); })
      .catch(e => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    deptAPI.list().then(r => setDepts(r.data.data||[]));
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

  const grades = ['Grade-A','Grade-B','Grade-C','Grade-D'];
  const categories = ['General','OBC','SC','ST','EWS'];
  const districts = ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar','Gandhinagar','Anand','Mehsana','Kutch'];

  const F = ({k,l,type='text',opts,full,req}) => (
    <div className={full?'col-span-3':''}>
      <label className="text-xs text-slate-400 block mb-1">{l}{req&&<span className="text-red-400">*</span>}</label>
      {opts ? <select className="input" value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})}>
        <option value="">Select</option>{opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
      </select> : <input type={type} className="input" value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} />}
    </div>
  );

  return (
    <Layout title="Employee Master">
      {msg && <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-900/50 text-red-200 border border-red-500/30':'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30'}`}>{msg}</div>}

      <div className="flex gap-3 mb-4 flex-wrap items-center justify-between">
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white border border-white/20 px-3 py-2 rounded-lg">
            <Search size={14} className="text-slate-400"/>
            <input placeholder="Search name/ID/mobile..." className="outline-none text-sm w-44" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <select className="input" style={{width:160}} value={filter.dept} onChange={e=>setFilter({...filter,dept:e.target.value})}>
            <option value="">All Departments</option>{depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input" style={{width:130}} value={filter.status} onChange={e=>setFilter({...filter,status:e.target.value})}>
            <option value="">All Status</option>{['Active','On Leave','Retired','Suspended','Resigned'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        {isMin('hr_staff') && <button className="btn btn-primary" onClick={()=>{setForm(blank);setEditMode(false);setShowForm(true);}}><Plus size={16}/>Add Employee</button>}
      </div>

      {loading ? <Loader /> : error ? <ErrorMsg message={error} onRetry={load} /> : (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title mb-0">Employees ({total})</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Emp ID</th><th>Name</th><th>Department</th><th>Designation</th><th>Grade</th><th>District</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{emps.map(e=>(
                <tr key={e.emp_id}>
                  <td className="font-mono text-blue-600 font-medium">{e.emp_id}</td>
                  <td><div className="font-medium">{e.first_name} {e.last_name}</div><div className="text-xs text-slate-400">{e.official_email}</div></td>
                  <td>{e.dept_name}</td><td>{e.designation_name||'—'}</td>
                  <td>{e.grade||'—'}</td><td>{e.district||'—'}</td>
                  <td><Badge text={e.category} /></td><td><Badge text={e.status} /></td>
                  <td><div className="flex gap-2">
                    <button className="btn btn-outline" style={{padding:'4px 8px',fontSize:12}} onClick={()=>setView(e)}><Eye size={14}/></button>
                    {isMin('hr_staff') && <button className="btn btn-outline" style={{padding:'4px 8px',fontSize:12}} onClick={()=>{setForm(e);setEditMode(true);setShowForm(true);}}><Edit2 size={14}/></button>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {view && (
        <Modal title={`${view.first_name} ${view.last_name} — Profile`} onClose={()=>setView(null)} wide>
          <div className="flex gap-4 mb-4 p-4 bg-blue-50 rounded-xl">
            <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">{view.first_name?.[0]}</div>
            <div><p className="font-bold text-lg text-white">{view.first_name} {view.last_name}</p><p className="text-sm text-slate-300">{view.designation_name} • {view.dept_name}</p><p className="text-xs text-slate-400">{view.emp_id} • Level-{view.pay_level}</p></div>
            <div className="ml-auto"><Badge text={view.status} /></div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-3">
            {[['DOB',view.dob?.split('T')[0]],['DOJ',view.doj?.split('T')[0]],['Mobile',view.mobile],['Email',view.official_email],['District',view.district],['Posting Station',view.posting_station],['Category',view.category],['Blood Group',view.blood_group],['Qualification',view.qualification],['PF No.',view.pf_number],['PAN',view.pan_number],['Bank',`${view.bank_name||''} / ${view.ifsc_code||''}`],['Account No.',view.account_number],['Nominee',view.nominee_name],['Experience',`${view.experience_years} years`],['Father Name',view.father_name],['Basic Pay',view.basic_pay?`₹${parseFloat(view.basic_pay).toLocaleString()}`:'—']].map(([k,v])=>(
              <div key={k}><p className="text-xs text-slate-400">{k}</p><p className="text-sm font-medium text-slate-200">{v||'—'}</p></div>
            ))}
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editMode?`Edit: ${form.first_name} ${form.last_name}`:'Add New Employee'} onClose={()=>setShowForm(false)} wide>
          <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            <F k="first_name" l="First Name" req /><F k="last_name" l="Last Name" req /><F k="father_name" l="Father's Name" />
            <F k="gender" l="Gender" opts={['Male','Female','Other']} req />
            <F k="dob" l="Date of Birth" type="date" req /><F k="doj" l="Date of Joining" type="date" req />
            <div><label className="text-xs text-slate-400 block mb-1">Department<span className="text-red-400">*</span></label>
              <select className="input" value={form.dept_id||''} onChange={e=>setForm({...form,dept_id:e.target.value})}>
                <option value="">Select</option>{depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <F k="grade" l="Grade" opts={grades} /><F k="pay_level" l="Pay Level" type="number" />
            <F k="basic_pay" l="Basic Pay (₹)" type="number" />
            <F k="category" l="Category" opts={categories} req />
            <F k="district" l="District" opts={districts} />
            <F k="posting_station" l="Posting Station" full />
            <F k="mobile" l="Mobile" req /><F k="alternate_mobile" l="Alternate Mobile" /><F k="official_email" l="Official Email" type="email" />
            <F k="blood_group" l="Blood Group" opts={['A+','A-','B+','B-','O+','O-','AB+','AB-']} />
            <F k="qualification" l="Qualification" /><F k="experience_years" l="Experience (Years)" type="number" />
            <F k="pan_number" l="PAN No." /><F k="aadhaar_number" l="Aadhaar No." /><F k="pf_number" l="PF No." />
            <F k="bank_name" l="Bank Name" /><F k="account_number" l="Account No." /><F k="ifsc_code" l="IFSC Code" />
            <F k="nominee_name" l="Nominee Name" /><F k="nominee_relation" l="Relation" />
            <F k="emergency_contact_name" l="Emergency Contact" /><F k="emergency_contact_mobile" l="Emergency Mobile" />
            <F k="status" l="Status" opts={['Active','On Leave','Retired','Suspended','Resigned']} />
          </div>
          <button className="btn btn-primary w-full mt-4" disabled={saving} onClick={handleSave}>{saving?'Saving...':editMode?'Save Changes':'Add Employee'}</button>
        </Modal>
      )}
    </Layout>
  );
}
