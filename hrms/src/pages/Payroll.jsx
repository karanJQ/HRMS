import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import StatsCard from '../components/common/StatsCard';
import Loader from '../components/common/Loader';
import { DollarSign, Download, FileText, Check, RefreshCw } from 'lucide-react';
import { payrollAPI, empAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function Payroll() {
  const { isMin, user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    payrollAPI.list({ month, year })
      .then(r => { setRecords(r.data.data.records||[]); setSummary(r.data.data.summary||{}); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, year]);

  const processAll = async () => {
    setProcessing(true);
    try {
      const r = await payrollAPI.processAll({ month, year });
      setMsg(`${r.data.data.processed} records processed`);
      load();
    } catch(e) { setMsg('Error: '+e.response?.data?.message); }
    finally { setProcessing(false); }
  };

  const markPaid = async () => {
    try { await payrollAPI.markPaid({ month, year }); setMsg('All marked as Paid'); load(); }
    catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <Layout title="Payroll Management">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select className="input" style={{width:160}} value={month} onChange={e=>setMonth(e.target.value)}>
          {months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
        </select>
        <select className="input" style={{width:100}} value={year} onChange={e=>setYear(e.target.value)}>
          {[2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}
        </select>
        {isMin('hr_manager') && <>
          <button className="btn btn-primary" onClick={processAll} disabled={processing}>
            <RefreshCw size={15}/>{processing?'Processing...':'Process All'}
          </button>
          <button className="btn btn-success" onClick={markPaid}><Check size={15}/>Mark All Paid</button>
        </>}
        <button className="btn btn-secondary"><Download size={15}/>Export</button>
      </div>

      {msg && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>{msg}</div>}

      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatsCard title="Gross Payroll" value={`₹${((summary.gross||0)/100000).toFixed(2)}L`} icon={DollarSign} color="#3b82f6"/>
        <StatsCard title="Net Payroll" value={`₹${((summary.net||0)/100000).toFixed(2)}L`} icon={DollarSign} color="#22c55e"/>
        <StatsCard title="Total PF" value={`₹${Math.round(summary.pf||0).toLocaleString()}`} icon={DollarSign} color="#8b5cf6"/>
        <StatsCard title="Total TDS" value={`₹${Math.round(summary.tds||0).toLocaleString()}`} icon={DollarSign} color="#f59e0b"/>
      </div>

      {loading ? <Loader /> : (
        <div className="card">
          <h3 className="section-title">Salary Register — {months[month-1]} {year}</h3>
          {records.length===0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-3">No payroll records for this month.</p>
              {isMin('hr_manager') && <button className="btn btn-primary" onClick={processAll} disabled={processing}><RefreshCw size={15}/>{processing?'Processing...':'Generate Payroll'}</button>}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Emp ID</th><th>Name</th><th>Dept</th><th>Basic</th><th>DA</th><th>HRA</th><th>TA</th><th>Gross</th><th>PF</th><th>TDS</th><th>Net Pay</th><th>Status</th><th>Slip</th></tr></thead>
                <tbody>{records.map(p=>(
                  <tr key={p.id}>
                    <td className="font-mono text-blue-600 text-xs">{p.emp_id}</td>
                    <td><div className="font-medium text-sm">{p.emp_name}</div><div className="text-xs text-gray-400">{p.dept_name}</div></td>
                    <td className="text-xs text-gray-500">{p.dept_name}</td>
                    <td>₹{parseFloat(p.basic_pay).toLocaleString()}</td>
                    <td>₹{parseFloat(p.da_amount).toLocaleString()}</td>
                    <td>₹{parseFloat(p.hra_amount).toLocaleString()}</td>
                    <td>₹{parseFloat(p.ta_amount).toLocaleString()}</td>
                    <td className="font-semibold">₹{parseFloat(p.gross_pay).toLocaleString()}</td>
                    <td className="text-red-500">-₹{parseFloat(p.pf_employee).toLocaleString()}</td>
                    <td className="text-red-500">-₹{parseFloat(p.tds).toLocaleString()}</td>
                    <td className="font-bold text-green-600">₹{parseFloat(p.net_pay).toLocaleString()}</td>
                    <td><Badge text={p.status}/></td>
                    <td><button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}} onClick={()=>setSlip(p)}><FileText size={12}/>Slip</button></td>
                  </tr>
                ))}</tbody>
                <tfoot><tr style={{background:'#f8fafc'}}>
                  <td colSpan={7} className="font-bold px-4 py-3 text-sm">TOTALS</td>
                  <td className="font-bold px-4 py-3">₹{Math.round(summary.gross||0).toLocaleString()}</td>
                  <td className="font-bold text-red-500 px-4 py-3">-₹{Math.round(summary.pf||0).toLocaleString()}</td>
                  <td className="font-bold text-red-500 px-4 py-3">-₹{Math.round(summary.tds||0).toLocaleString()}</td>
                  <td className="font-bold text-green-600 px-4 py-3">₹{Math.round(summary.net||0).toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr></tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {slip && (
        <Modal title="Salary Slip" onClose={()=>setSlip(null)}>
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-blue-700 text-white p-4 text-center">
              <p className="font-bold text-lg">Government of Gujarat</p>
              <p className="text-sm opacity-80">HRMS — Salary Slip</p>
              <p className="text-sm mt-1">Month: {months[slip.month-1]} {slip.year}</p>
            </div>
            <div className="p-4 bg-blue-50 grid grid-cols-2 text-sm gap-2">
              {[['Employee',slip.emp_name],['Emp ID',slip.emp_id],['Department',slip.dept_name],['Status',slip.status]].map(([k,v])=>(
                <div key={k}><p className="text-gray-500 text-xs">{k}</p><p className="font-bold">{v}</p></div>
              ))}
            </div>
            <div className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-2 text-green-700">Earnings</p>
                  {[['Basic Pay',slip.basic_pay],['Dearness Allowance',slip.da_amount],['HRA',slip.hra_amount],['Transport Allowance',slip.ta_amount]].map(([k,v])=>(
                    <div key={k} className="flex justify-between text-sm py-1 border-b border-gray-100">
                      <span>{k}</span><span className="font-medium">₹{parseFloat(v||0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm py-2 font-bold text-green-700"><span>Gross Pay</span><span>₹{parseFloat(slip.gross_pay||0).toLocaleString()}</span></div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-2 text-red-600">Deductions</p>
                  {[['Provident Fund',slip.pf_employee],['Professional Tax',slip.professional_tax],['Income Tax (TDS)',slip.tds]].map(([k,v])=>(
                    <div key={k} className="flex justify-between text-sm py-1 border-b border-gray-100">
                      <span>{k}</span><span className="font-medium text-red-500">₹{parseFloat(v||0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm py-2 font-bold text-red-600"><span>Total Deductions</span><span>₹{parseFloat(slip.total_deductions||0).toLocaleString()}</span></div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3 flex justify-between">
                <span className="font-bold text-green-800">Net Pay</span>
                <span className="font-bold text-green-800 text-lg">₹{parseFloat(slip.net_pay||0).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <button className="btn btn-primary w-full mt-3"><Download size={15}/>Download Slip</button>
        </Modal>
      )}
    </Layout>
  );
}