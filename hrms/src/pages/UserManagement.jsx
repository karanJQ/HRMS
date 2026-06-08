import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { useApi, useApiCall } from '../hooks/useApi';
import { authAPI, deptAPI, empAPI } from '../api/endpoints';
import { Plus, ToggleLeft, ToggleRight, Shield, Eye, EyeOff, Search } from 'lucide-react';
import { usePaginationAndSearch } from '../hooks/usePaginationAndSearch';
import Pagination from '../components/common/Pagination';

const roleColors = { super_admin: '#7c3aed', hr_staff: '#2563eb', employee: '#64748b' };

export default function UserManagement() {
  const { data: users, loading, refetch } = useApi(authAPI.listUsers, null, []);
  const { data: depts } = useApi(deptAPI.list, null, []);
  const { data: empData } = useApi(empAPI.list, { limit: 1000 }, []);
  const employees = empData?.employees || [];
  const { call } = useApiCall();
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'hr_staff', emp_id: '' });
  const [msg, setMsg] = useState('');

  const {
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    paginatedData, totalPages, totalItems
  } = usePaginationAndSearch(users || [], ['username', 'email', 'role', 'dept_name'], 10);

  const handleCreate = async () => {
    try {
      await call(() => authAPI.createUser(form), () => {
        setMsg('User created successfully'); setShowForm(false);
        setForm({ username: '', email: '', password: '', role: 'hr_staff', emp_id: '' });
        refetch();
      });
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error creating user');
    }
  };

  const handleToggle = async (id) => {
    await call(() => authAPI.toggleUser(id), () => refetch());
  };

  const roleBadge = (role) => (
    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${roleColors[role]}15`, color: roleColors[role] }}>{role.replace('_', ' ')}</span>
  );



  return (
    <Layout title="User Management" theme="light" bg="#F8F8FF">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <p style={{ fontSize: '14px', color: 'rgba(22, 38, 96, 0.6)' }}>{totalItems} system users</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-64 text-slate-800 bg-white"
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} />Create User</button>
      </div>
      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{msg}</div>}

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
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflowX: 'auto' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['Username', 'Email', 'Role', 'Department', 'Last Login', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{paginatedData.map(u => (
                <tr 
                  key={u.id}
                  className="transition-all duration-300"
                  style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.05)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ color: '#162660' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                        {u.username?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{u.username}</span>
                    </div>
                  </td>
                  <td style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{u.email}</td>
                  <td>{roleBadge(u.role)}</td>
                  <td style={{ color: '#162660' }}>{u.dept_name || '—'}</td>
                  <td style={{ color: 'rgba(22, 38, 96, 0.5)', fontSize: '12px' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td><Badge text={u.is_active ? 'Active' : 'Inactive'} /></td>
                  <td>
                    <button 
                      className="btn font-semibold transition-all duration-300" 
                      style={{ 
                        padding: '6px 10px', 
                        fontSize: 12,
                        border: '1px solid rgba(22, 38, 96, 0.2)',
                        background: '#fff',
                        color: '#162660',
                        boxShadow: '0 2px 6px rgba(22, 38, 96, 0.03)'
                      }} 
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.2)';
                      }}
                      onClick={() => handleToggle(u.id)}
                    >
                      {u.is_active ? <ToggleRight size={14} className="inline mr-1" /> : <ToggleLeft size={14} className="inline mr-1" />}
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {showForm && (
        <Modal title="Create System User" onClose={() => setShowForm(false)} theme="light">
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Username</label>
              <input type="text" className="input" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Email</label>
              <input type="email" className="input" required pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$" title="Valid email address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} className="input w-full pr-10" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Role</label>
              <select className="input" required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="">Select</option>
                {[
                  { v: 'super_admin', l: 'Super Admin' },
                  { v: 'hr_staff', l: 'HR' },
                  { v: 'employee', l: 'Employee' }
                ].map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 block mb-1">
                Link to Employee Profile {form.role === 'super_admin' ? '(Optional)' : <span className="text-red-500">*</span>}
              </label>
              <select className="input" required={form.role !== 'super_admin'} value={form.emp_id} onChange={e => setForm({ ...form, emp_id: e.target.value })}>
                <option value="">{form.role === 'super_admin' ? 'No Link (Admin / System User)' : 'Select Employee Profile'}</option>
                {employees.map(e => <option key={e.emp_id} value={e.emp_id}>{e.first_name} {e.last_name} ({e.emp_id})</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-700">
            <Shield size={12} className="inline mr-1" />User will be asked to change password on first login.
          </div>
          <button type="submit" className="btn btn-primary w-full mt-4">Create User</button>
          </form>
        </Modal>
      )}
    </Layout>
  );
}




