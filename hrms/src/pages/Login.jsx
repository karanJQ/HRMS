import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (error) {
      setErr(error.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = (email, password) => setForm({ email, password });

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1e293b 0%,#334155 50%,#1e40af 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div style={{ width: 72, height: 72, borderRadius: 20, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Building2 size={36} color="#fff" />
          </div>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 700 }}>JadeQuest</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>HRMS — Human Resource Management System</p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 24, textAlign: 'center' }}>Sign In</h2>

          {err && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertCircle size={16} color="#ef4444" /><span style={{ color: '#991b1b', fontSize: 13 }}>{err}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#475569', display: 'block', marginBottom: 6, fontWeight: 500 }}>Email / Employee ID</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#fff' }}
                  placeholder="admin@hrms.gov.in" />
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: '#475569', display: 'block', marginBottom: 6, fontWeight: 500 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 40px 10px 38px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#fff' }}
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px', background: loading ? '#93c5fd' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all .2s' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo creds */}
          <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 10, textAlign: 'center' }}>DEMO ACCOUNTS (click to fill)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Super Admin', 'admin@hrms.gov.in', 'Admin@123456', '#3b82f6'],
                ['HR Manager', 'hr@hrms.gov.in', 'Hr@123456', '#22c55e'],
                ['Employee', 'rajesh@gov.in', 'Emp@123456', '#f59e0b'],
              ].map(([role, email, pw, color]) => (
                <button key={role} onClick={() => demoLogin(email, pw)}
                  style={{ padding: '6px 12px', background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color, fontSize: 12 }}>{role}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}