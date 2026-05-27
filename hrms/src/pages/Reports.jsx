import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Loader from '../components/common/Loader';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { reportsAPI } from '../api/endpoints';
import { Download, Users, CheckCircle, AlertCircle, AlertTriangle, DollarSign } from 'lucide-react';
import StatsCard from '../components/common/StatsCard';

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];

export default function Reports() {
  const [tab, setTab] = useState('headcount');
  const [headcount, setHeadcount] = useState(null);
  const [payroll, setPayroll] = useState(null);
  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([reportsAPI.headcount(), reportsAPI.payroll(), reportsAPI.leave()])
      .then(([h, p, l]) => { setHeadcount(h.data.data); setPayroll(p.data.data); setLeave(l.data.data); })
      .finally(() => setLoading(false));
  }, []);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const payrollTrend = (payroll?.monthly||[]).map(m => ({
    month: monthNames[parseInt(m.month)-1],
    Gross: parseFloat(m.gross||0).toFixed(0),
    Net: parseFloat(m.net||0).toFixed(0),
  }));

  return (
    <Layout title="Reports & Analytics" theme="light" bg="#F8F8FF">
      <div className="flex gap-2 mb-5 flex-wrap items-center justify-between">
        <div className="flex gap-2">
          {['headcount','payroll','leave','categories'].map(t=>(
            <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary" style={{ background: 'rgba(22, 38, 96, 0.05)', color: '#162660', border: '1px solid rgba(22, 38, 96, 0.1)' }}><Download size={15}/>Export</button>
      </div>

      {loading ? <Loader/> : <>
        {tab==='headcount' && headcount && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-4">
              {headcount.by_status?.map((s, idx)=>(
                <StatsCard 
                  key={s.status} 
                  title={s.status} 
                  value={s.count} 
                  icon={s.status==='Active'?CheckCircle:s.status==='On Leave'?Clock:AlertCircle} 
                  color={s.status==='Active'?'#10b981':s.status==='On Leave'?'#f59e0b':'#ef4444'} 
                  theme="light" 
                  delay={idx*60} 
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-5">
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
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Headcount by Department</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={headcount.by_dept?.slice(0,8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,38,96,0.06)" vertical={false}/>
                    <XAxis dataKey="dept" tick={{ fill: 'rgba(22, 38, 96, 0.6)', fontSize: 11 }} angle={-20} textAnchor="end" height={50} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill: 'rgba(22, 38, 96, 0.6)', fontSize: 12 }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(22,38,96,0.1)', borderRadius: '8px', color: '#162660' }}/>
                    <Bar dataKey="count" fill="#3b82f6" name="Employees" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
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
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>By Grade</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={headcount.by_grade} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,38,96,0.06)" vertical={false}/>
                    <XAxis type="number" tick={{ fill: 'rgba(22, 38, 96, 0.6)', fontSize: 12 }} axisLine={false} tickLine={false}/>
                    <YAxis dataKey="grade" type="category" tick={{ fill: 'rgba(22, 38, 96, 0.6)', fontSize: 12 }} width={70} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(22,38,96,0.1)', borderRadius: '8px', color: '#162660' }}/>
                    <Bar dataKey="count" fill="#8b5cf6" name="Employees" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab==='payroll' && payroll && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              {payroll.monthly?.slice(-1).map(m=>(
                <React.Fragment key={m.month}>
                  <StatsCard title={`Gross (${monthNames[m.month-1]})`} value={`₹${(parseFloat(m.gross)/100000).toFixed(2)}L`} icon={DollarSign} color="#3b82f6" theme="light" delay={0} />
                  <StatsCard title={`Net (${monthNames[m.month-1]})`} value={`₹${(parseFloat(m.net)/100000).toFixed(2)}L`} icon={DollarSign} color="#10b981" theme="light" delay={60} />
                  <StatsCard title="Employees Paid" value={m.emp_count} icon={Users} color="#8b5cf6" theme="light" delay={120} />
                </React.Fragment>
              ))}
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
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Payroll Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={payrollTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,38,96,0.06)" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fill: 'rgba(22, 38, 96, 0.6)', fontSize: 12 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill: 'rgba(22, 38, 96, 0.6)', fontSize: 12 }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v=>`₹${parseFloat(v).toLocaleString()}`} contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(22,38,96,0.1)', borderRadius: '8px', color: '#162660' }}/>
                  <Legend/>
                  <Line type="monotone" dataKey="Gross" stroke="#3b82f6" strokeWidth={2} dot={{r:4}}/>
                  <Line type="monotone" dataKey="Net" stroke="#22c55e" strokeWidth={2} dot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
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
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Payroll by Department</h3>
              <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                <table>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                      {['Department', 'Employees', 'Gross Payroll', 'Net Payroll'].map(h => (
                        <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{payroll.by_dept?.map(d=>(
                    <tr 
                      key={d.dept}
                      className="transition-all duration-300"
                      style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.05)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td className="font-medium" style={{ color: '#162660' }}>{d.dept}</td>
                      <td style={{ color: '#162660' }}>{d.emp_count}</td>
                      <td style={{ color: '#162660' }}>₹{parseFloat(d.gross||0).toLocaleString()}</td>
                      <td className="font-semibold text-green-600">₹{parseFloat(d.net||0).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab==='leave' && leave && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
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
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Leave by Type</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={leave.by_type}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,38,96,0.06)" vertical={false}/>
                    <XAxis dataKey="leave_type" tick={{ fill: 'rgba(22, 38, 96, 0.6)', fontSize: 12 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill: 'rgba(22, 38, 96, 0.6)', fontSize: 12 }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(22,38,96,0.1)', borderRadius: '8px', color: '#162660' }}/>
                    <Legend/>
                    <Bar dataKey="applications" fill="#3b82f6" name="Applications" radius={[4,4,0,0]}/>
                    <Bar dataKey="total_days" fill="#f59e0b" name="Total Days" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
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
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Leave Days by Department</h3>
                <div className="space-y-3 mt-2">
                  {leave.by_dept?.slice(0,8).map((d,i)=>(
                    <div key={d.dept} className="flex items-center gap-3">
                      <span className="text-xs w-28 truncate" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{d.dept}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-3">
                        <div className="h-3 rounded-full animate-pulse" style={{width:`${Math.min(100,(d.total_days/(leave.by_dept?.[0]?.total_days||1))*100)}%`,background:COLORS[i%COLORS.length]}}></div>
                      </div>
                      <span className="text-xs font-bold w-8" style={{ color: '#162660' }}>{d.total_days}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='categories' && headcount && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
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
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Category Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={headcount.by_category?.map(c=>({name:c.category,value:parseInt(c.count)}))} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
                      {headcount.by_category?.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(22,38,96,0.1)', borderRadius: '8px', color: '#162660' }}/>
                    <Legend/>
                  </PieChart>
                </ResponsiveContainer>
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
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Reservation Compliance</h3>
                <div className="space-y-4 mt-2">
                  {[['SC','15%'],['ST','7.5%'],['OBC','27%'],['EWS','10%']].map(([cat,mandate])=>{
                    const total = headcount.by_category?.reduce((s,c)=>s+parseInt(c.count),0)||1;
                    const found = headcount.by_category?.find(c=>c.category===cat);
                    const pct = found ? ((parseInt(found.count)/total)*100).toFixed(1) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium" style={{ color: '#162660' }}>{cat} (Mandate: {mandate})</span>
                          <span className="font-bold" style={{ color: '#162660' }}>{pct}%</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-3">
                          <div className="h-3 rounded-full bg-blue-500 transition-all" style={{width:`${Math.min(100,parseFloat(pct))}%`}}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                  Based on current active employee data
                </div>
              </div>
            </div>
          </div>
        )}
      </>}
    </Layout>
  );
}
