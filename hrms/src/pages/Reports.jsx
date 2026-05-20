import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Loader from '../components/common/Loader';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { reportsAPI } from '../api/endpoints';
import { Download } from 'lucide-react';

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
    <Layout title="Reports & Analytics">
      <div className="flex gap-2 mb-5 flex-wrap items-center justify-between">
        <div className="flex gap-2">
          {['headcount','payroll','leave','categories'].map(t=>(
            <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary"><Download size={15}/>Export</button>
      </div>

      {loading ? <Loader/> : <>
        {tab==='headcount' && headcount && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-4">
              {headcount.by_status?.map(s=>(
                <div key={s.status} className="card text-center">
                  <p className="text-3xl font-bold" style={{color:s.status==='Active'?'#22c55e':s.status==='On Leave'?'#f59e0b':'#ef4444'}}>{s.count}</p>
                  <p className="text-sm text-gray-500">{s.status}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="card">
                <h3 className="section-title">Headcount by Department</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={headcount.by_dept?.slice(0,8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="dept" tick={{fontSize:11}} angle={-20} textAnchor="end" height={50}/>
                    <YAxis tick={{fontSize:12}}/>
                    <Tooltip/>
                    <Bar dataKey="count" fill="#3b82f6" name="Employees" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 className="section-title">By Grade</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={headcount.by_grade} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis type="number" tick={{fontSize:12}}/>
                    <YAxis dataKey="grade" type="category" tick={{fontSize:12}} width={70}/>
                    <Tooltip/>
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
                  <div className="card text-center"><p className="text-3xl font-bold text-blue-600">₹{(parseFloat(m.gross)/100000).toFixed(2)}L</p><p className="text-sm text-gray-500">Gross ({monthNames[m.month-1]})</p></div>
                  <div className="card text-center"><p className="text-3xl font-bold text-green-600">₹{(parseFloat(m.net)/100000).toFixed(2)}L</p><p className="text-sm text-gray-500">Net ({monthNames[m.month-1]})</p></div>
                  <div className="card text-center"><p className="text-3xl font-bold text-purple-600">{m.emp_count}</p><p className="text-sm text-gray-500">Employees Paid</p></div>
                </React.Fragment>
              ))}
            </div>
            <div className="card">
              <h3 className="section-title">Payroll Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={payrollTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="month" tick={{fontSize:12}}/>
                  <YAxis tick={{fontSize:12}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={v=>`₹${parseFloat(v).toLocaleString()}`}/>
                  <Legend/>
                  <Line type="monotone" dataKey="Gross" stroke="#3b82f6" strokeWidth={2} dot={{r:4}}/>
                  <Line type="monotone" dataKey="Net" stroke="#22c55e" strokeWidth={2} dot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="section-title">Payroll by Department</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Department</th><th>Employees</th><th>Gross Payroll</th><th>Net Payroll</th></tr></thead>
                  <tbody>{payroll.by_dept?.map(d=>(
                    <tr key={d.dept}>
                      <td className="font-medium">{d.dept}</td>
                      <td>{d.emp_count}</td>
                      <td>₹{parseFloat(d.gross||0).toLocaleString()}</td>
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
              <div className="card">
                <h3 className="section-title">Leave by Type</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={leave.by_type}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="leave_type" tick={{fontSize:12}}/>
                    <YAxis tick={{fontSize:12}}/>
                    <Tooltip/><Legend/>
                    <Bar dataKey="applications" fill="#3b82f6" name="Applications" radius={[4,4,0,0]}/>
                    <Bar dataKey="total_days" fill="#f59e0b" name="Total Days" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 className="section-title">Leave Days by Department</h3>
                <div className="space-y-2 mt-2">
                  {leave.by_dept?.slice(0,8).map((d,i)=>(
                    <div key={d.dept} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-28 truncate">{d.dept}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3">
                        <div className="h-3 rounded-full" style={{width:`${Math.min(100,(d.total_days/(leave.by_dept?.[0]?.total_days||1))*100)}%`,background:COLORS[i%COLORS.length]}}></div>
                      </div>
                      <span className="text-xs font-bold w-8">{d.total_days}</span>
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
              <div className="card">
                <h3 className="section-title">Category Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={headcount.by_category?.map(c=>({name:c.category,value:parseInt(c.count)}))} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
                      {headcount.by_category?.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip/><Legend/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 className="section-title">Reservation Compliance</h3>
                <div className="space-y-4 mt-2">
                  {[['SC','15%'],['ST','7.5%'],['OBC','27%'],['EWS','10%']].map(([cat,mandate])=>{
                    const total = headcount.by_category?.reduce((s,c)=>s+parseInt(c.count),0)||1;
                    const found = headcount.by_category?.find(c=>c.category===cat);
                    const pct = found ? ((parseInt(found.count)/total)*100).toFixed(1) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{cat} (Mandate: {mandate})</span>
                          <span className="font-bold">{pct}%</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-3">
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
