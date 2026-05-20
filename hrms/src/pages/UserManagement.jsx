import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { useApi, useApiCall } from '../hooks/useApi';
import { authAPI, deptAPI } from '../api/endpoints';
import { Plus, ToggleLeft, ToggleRight, Shield } from 'lucide-react';

const roleColors = { super_admin:'#7c3aed', hr_manager:'#2563eb', dept_head:'#0891b2', hr_staff:'#16a34a', employee:'#64748b' };

export default function UserManagement() {
  const { data: users, loading, refetch } = useApi(authAPI.listUsers, null, []);
  const { data: depts } = useApi(deptAPI.list, null, []);
  const { call } = useApiCall();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username:'', email:'', password:'', role:'hr_staff', dept_id:'' });
  const [msg, setMsg] = useState('');

  const handleCreate = async () => {
    await call(() => authAPI.createUser(form), () => {
      setMsg('User created successfully'); setShowForm(false);
      setForm({ username:'', email:'', password:'', role:'hr_staff', dept_id:'' });
      refetch();
    });
  };

  const handleToggle = async (id) => {
    await call(() => authAPI.toggleUser(id), () => refetch());
  };

  const roleBadge = (role) => (
    <span style={{ padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:`${roleColors[role]}15`, color:roleColors[role] }}>{role.replace('_',' ')}</span>
  );

  const F = ({k,l,type='text',opts}) => (
    <div><label className="text-xs text-gray-500 block mb-1">{l}</label>
      {opts ? <select className="input" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}>
        <option value="">Select</option>{opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
      </select> : <input type={type} className="input" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} />}
    </div>
  );

  return (
    <Layout title="User Management">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{(users||[]).length} system users</p>
        <button className="btn btn-primary" onClick={()=>setShowForm(true)}><Plus size={16}/>Create User</button>
      </div>
      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{msg}</div>}

      {loading ? <Loader /> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Department</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{(users||[]).map(u=>(
                <tr key={u.id}>
                  <td><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">{u.username?.[0]?.toUpperCase()}</div><span className="font-medium">{u.username}</span></div></td>
                  <td className="text-gray-500">{u.email}</td>
                  <td>{roleBadge(u.role)}</td>
                  <td>{u.dept_name||'—'}</td>
                  <td className="text-gray-400 text-xs">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                  <td><Badge text={u.is_active?'Active':'Inactive'} /></td>
                  <td><button className="btn btn-outline" style={{padding:'4px 10px',fontSize:12}} onClick={()=>handleToggle(u.id)}>{u.is_active?<ToggleRight size={14}/>:<ToggleLeft size={14}/>}{u.is_active?'Deactivate':'Activate'}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title="Create System User" onClose={()=>setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <F k="username" l="Username" />
            <F k="email" l="Email" type="email" />
            <F k="password" l="Password" type="password" />
            <F k="role" l="Role" opts={[
              {v:'hr_manager',l:'HR Manager'},{v:'dept_head',l:'Department Head'},
              {v:'hr_staff',l:'HR Staff'},{v:'employee',l:'Employee'}
            ]} />
            <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Department</label>
              <select className="input" value={form.dept_id} onChange={e=>setForm({...form,dept_id:e.target.value})}>
                <option value="">Select Department</option>
                {(depts||[]).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-700">
            <Shield size={12} className="inline mr-1"/>User will be asked to change password on first login.
          </div>
          <button className="btn btn-primary w-full mt-4" onClick={handleCreate}>Create User</button>
        </Modal>
      )}
    </Layout>
  );
}
