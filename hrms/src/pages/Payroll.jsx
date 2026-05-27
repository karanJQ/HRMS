import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import StatsCard from '../components/common/StatsCard';
import Loader from '../components/common/Loader';
import { IndianRupee, Download, FileText, Check, RefreshCw, Plus, Edit2, CreditCard } from 'lucide-react';
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

  const [annualSummary, setAnnualSummary] = useState(null);
  const [annualLoading, setAnnualLoading] = useState(false);
  const [showAnnualModal, setShowAnnualModal] = useState(false);

  // New Payroll Modal States
  const [employees, setEmployees] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [formObj, setFormObj] = useState({
    emp_id: '',
    month: '',
    year: '',
    basic_pay: '',
    da_percentage: 42,
    hra_percentage: 20,
    ta_amount: 1500,
    medical_allowance: 0,
    special_allowance: 0,
    other_allowances: 0,
    professional_tax: 200,
    tds: 0,
    other_deductions: 0,
    payment_mode: 'Bank Transfer',
    status: 'Processed'
  });

  useEffect(() => {
    if (isMin('hr_staff')) {
      empAPI.list({ limit: 300 })
        .then(r => setEmployees(r.data.data.employees || []))
        .catch(e => console.error(e));
    }
  }, []);

  const handleSelectEmployee = (empId) => {
    const emp = employees.find(e => e.emp_id === empId);
    setFormObj(prev => ({
      ...prev,
      emp_id: empId,
      basic_pay: emp ? emp.basic_pay || '' : ''
    }));
  };

  const savePayrollEntry = async () => {
    setSavingForm(true);
    try {
      await payrollAPI.process(formObj);
      setMsg(formObj.id ? 'Payroll entry updated!' : 'Payroll entry created successfully!');
      setShowFormModal(false);
      load();
    } catch(e) {
      setMsg('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setSavingForm(false);
    }
  };

  const payIndividualEmployee = async (record) => {
    try {
      await payrollAPI.process({
        ...record,
        status: 'Paid',
        basic_pay: parseFloat(record.basic_pay)
      });
      setMsg(`Successfully processed payment to ${record.emp_name}!`);
      load();
    } catch(e) {
      setMsg('Error: ' + (e.response?.data?.message || e.message));
    }
  };

  const fetchAnnualSummary = () => {
    setAnnualLoading(true);
    payrollAPI.list({ month: 'all', year })
      .then(r => {
        setAnnualSummary(r.data.data);
        setShowAnnualModal(true);
      })
      .catch(e => setMsg('Error: ' + (e.response?.data?.message || e.message)))
      .finally(() => setAnnualLoading(false));
  };

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

  const handleDownloadSlip = () => {
    if (!slip) return;
    const printWindow = window.open('', '_blank', 'width=800,height=950');
    if (!printWindow) {
      setMsg('Error: Popup blocker blocked PDF generation. Please allow popups.');
      return;
    }

    const monthName = months[slip.month - 1];
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Salary_Slip_${slip.emp_id}_${monthName}_${slip.year}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1e293b;
              padding: 40px;
              line-height: 1.5;
              background-color: #ffffff;
            }
            .container {
              max-width: 750px;
              margin: 0 auto;
              border: 1px solid #cbd5e1;
              padding: 30px;
              border-radius: 8px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .header h2 {
              font-size: 22px;
              font-weight: bold;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              color: #1e3a8a;
            }
            .header h3 {
              font-size: 15px;
              font-weight: 600;
              color: #475569;
              margin: 0 0 8px 0;
            }
            .header p {
              font-size: 13px;
              margin: 2px 0;
              color: #64748b;
              font-weight: bold;
            }
            .info-grid {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 12px;
              margin-bottom: 24px;
              font-size: 13px;
              background-color: #f8fafc;
              padding: 16px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
            }
            .info-label {
              color: #64748b;
              font-weight: 500;
            }
            .info-value {
              font-weight: 600;
              color: #0f172a;
            }
            .details-table {
              display: flex;
              gap: 24px;
              margin-bottom: 24px;
            }
            .table-column {
              flex: 1;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              overflow: hidden;
            }
            .table-column-header {
              background-color: #f1f5f9;
              font-weight: bold;
              font-size: 13px;
              padding: 10px 12px;
              border-bottom: 1px solid #e2e8f0;
              color: #1e293b;
            }
            .table-column-header.earnings {
              border-top: 3px solid #10b981;
            }
            .table-column-header.deductions {
              border-top: 3px solid #ef4444;
            }
            .row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              padding: 8px 12px;
              border-bottom: 1px solid #f1f5f9;
            }
            .row:last-child {
              border-bottom: none;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              font-weight: bold;
              padding: 10px 12px;
              background-color: #f8fafc;
              border-top: 1px solid #e2e8f0;
            }
            .total-row.earnings {
              color: #047857;
            }
            .total-row.deductions {
              color: #b91c1c;
            }
            .net-pay-box {
              background-color: #ecfdf5;
              border: 1px solid #a7f3d0;
              border-radius: 6px;
              padding: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-weight: bold;
              margin-bottom: 30px;
            }
            .net-pay-label {
              font-size: 15px;
              color: #065f46;
            }
            .net-pay-value {
              font-size: 20px;
              color: #047857;
            }
            .footer-sig {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 40px;
              font-size: 12px;
            }
            .sig-item {
              text-align: center;
            }
            .sig-line {
              border-top: 1px solid #94a3b8;
              width: 150px;
              margin-bottom: 6px;
            }
            @media print {
              body {
                padding: 0;
              }
              .container {
                border: none;
                padding: 0;
              }
              @page {
                size: A4;
                margin: 15mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>GOVERNMENT OF GUJARAT</h2>
              <h3>Human Resources Department</h3>
              <p>Salary Slip for ${monthName} ${slip.year}</p>
            </div>
            
            <div class="info-grid">
              <div>
                <div class="info-item">
                  <span class="info-label">Employee Name:</span>
                  <span class="info-value">${slip.emp_name}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Employee ID:</span>
                  <span class="info-value">${slip.emp_id}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Department:</span>
                  <span class="info-value">${slip.dept_name || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Designation:</span>
                  <span class="info-value">${slip.designation_name || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Pay Level / Grade:</span>
                  <span class="info-value">${slip.pay_level ? `Level ${slip.pay_level} (Grade ${slip.grade || '—'})` : '—'}</span>
                </div>
              </div>
              <div>
                <div class="info-item">
                  <span class="info-label">PF Number:</span>
                  <span class="info-value">${slip.pf_number || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Bank Name:</span>
                  <span class="info-value">${slip.bank_name || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Account Number:</span>
                  <span class="info-value">${slip.account_number || '—'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Payment Mode:</span>
                  <span class="info-value">${slip.payment_mode || 'Bank Transfer'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Status:</span>
                  <span class="info-value" style="color: ${slip.status === 'Paid' ? '#047857' : '#d97706'}">${slip.status}</span>
                </div>
              </div>
            </div>
            
            <div class="details-table">
              <!-- Earnings -->
              <div class="table-column">
                <div class="table-column-header earnings">Earnings</div>
                <div class="row">
                  <span>Basic Pay</span>
                  <span>₹${parseFloat(slip.basic_pay || 0).toLocaleString()}</span>
                </div>
                <div class="row">
                  <span>Dearness Allowance (DA)</span>
                  <span>₹${parseFloat(slip.da_amount || 0).toLocaleString()}</span>
                </div>
                <div class="row">
                  <span>HRA</span>
                  <span>₹${parseFloat(slip.hra_amount || 0).toLocaleString()}</span>
                </div>
                <div class="row">
                  <span>Transport Allowance (TA)</span>
                  <span>₹${parseFloat(slip.ta_amount || 0).toLocaleString()}</span>
                </div>
                ${parseFloat(slip.medical_allowance || 0) > 0 ? `
                <div class="row">
                  <span>Medical Allowance</span>
                  <span>₹${parseFloat(slip.medical_allowance || 0).toLocaleString()}</span>
                </div>` : ''}
                ${parseFloat(slip.special_allowance || 0) > 0 ? `
                <div class="row">
                  <span>Special Allowance</span>
                  <span>₹${parseFloat(slip.special_allowance || 0).toLocaleString()}</span>
                </div>` : ''}
                ${parseFloat(slip.other_allowances || 0) > 0 ? `
                <div class="row">
                  <span>Other Allowances</span>
                  <span>₹${parseFloat(slip.other_allowances || 0).toLocaleString()}</span>
                </div>` : ''}
                <div class="total-row earnings">
                  <span>Gross Pay</span>
                  <span>₹${parseFloat(slip.gross_pay || 0).toLocaleString()}</span>
                </div>
              </div>
              
              <!-- Deductions -->
              <div class="table-column">
                <div class="table-column-header deductions">Deductions</div>
                <div class="row">
                  <span>Provident Fund (PF)</span>
                  <span>₹${parseFloat(slip.pf_employee || 0).toLocaleString()}</span>
                </div>
                <div class="row">
                  <span>Professional Tax</span>
                  <span>₹${parseFloat(slip.professional_tax || 0).toLocaleString()}</span>
                </div>
                <div class="row">
                  <span>Income Tax (TDS)</span>
                  <span>₹${parseFloat(slip.tds || 0).toLocaleString()}</span>
                </div>
                ${parseFloat(slip.other_deductions || 0) > 0 ? `
                <div class="row">
                  <span>Other Deductions</span>
                  <span>₹${parseFloat(slip.other_deductions || 0).toLocaleString()}</span>
                </div>` : ''}
                <div class="total-row deductions">
                  <span>Total Deductions</span>
                  <span>₹${parseFloat(slip.total_deductions || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div class="net-pay-box">
              <span class="net-pay-label">Net Take-Home Salary:</span>
              <span class="net-pay-value">₹${parseFloat(slip.net_pay || 0).toLocaleString()}</span>
            </div>
            
            <div class="footer-sig">
              <div class="sig-item">
                <div class="sig-line"></div>
                <p>Employee Signature</p>
              </div>
              <div class="sig-item">
                <p style="font-style: italic; color: #64748b; margin-bottom: 8px;">Digitally Approved Payslip</p>
                <div class="sig-line" style="margin: 0 auto 6px auto;"></div>
                <p>Drawing & Disbursing Officer</p>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setSlip(null);
    setMsg('Salary Slip PDF download triggered successfully!');
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
        {isMin('hr_staff') && (
          <button className="btn btn-primary bg-blue-600 hover:bg-blue-700" onClick={() => {
            setFormObj({
              emp_id: '',
              month: month,
              year: year,
              basic_pay: '',
              da_percentage: 42,
              hra_percentage: 20,
              ta_amount: 1500,
              medical_allowance: 0,
              special_allowance: 0,
              other_allowances: 0,
              professional_tax: 200,
              tds: 0,
              other_deductions: 0,
              payment_mode: 'Bank Transfer',
              status: 'Processed'
            });
            setShowFormModal(true);
          }}>
            <Plus size={15}/>New Entry
          </button>
        )}
        <button className="btn btn-secondary" onClick={fetchAnnualSummary} disabled={annualLoading}>
          <IndianRupee size={15}/>{annualLoading ? 'Loading...' : 'Annual Summary'}
        </button>
        <button className="btn btn-secondary"><Download size={15}/>Export</button>
      </div>

      {msg && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-900/50 text-red-200 border border-red-500/30':'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30'}`}>{msg}</div>}

      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatsCard title="Gross Payroll" value={`₹${((summary.gross||0)/100000).toFixed(2)}L`} icon={IndianRupee} color="#3b82f6"/>
        <StatsCard title="Net Payroll" value={`₹${((summary.net||0)/100000).toFixed(2)}L`} icon={IndianRupee} color="#22c55e"/>
        <StatsCard title="Total PF" value={`₹${Math.round(summary.pf||0).toLocaleString()}`} icon={IndianRupee} color="#8b5cf6"/>
        <StatsCard title="Total TDS" value={`₹${Math.round(summary.tds||0).toLocaleString()}`} icon={IndianRupee} color="#f59e0b"/>
      </div>

      {loading ? <Loader /> : (
        <div className="card">
          <h3 className="section-title">Salary Register — {months[month-1]} {year}</h3>
          {records.length===0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-3">No payroll records for this month.</p>
              {isMin('hr_manager') && <button className="btn btn-primary" onClick={processAll} disabled={processing}><RefreshCw size={15}/>{processing?'Processing...':'Generate Payroll'}</button>}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Emp ID</th><th>Name</th><th>Basic</th><th>DA</th><th>HRA</th><th>TA</th><th>Gross</th><th>PF</th><th>TDS</th><th>Net Pay</th><th>Status</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
                <tbody>{records.map(p=>(
                  <tr key={p.id}>
                    <td className="font-mono text-blue-600 text-xs">{p.emp_id}</td>
                    <td>
                      <div className="font-semibold text-sm text-white leading-tight">{p.emp_name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{p.dept_name}</div>
                    </td>
                    <td className="text-xs">₹{parseFloat(p.basic_pay).toLocaleString()}</td>
                    <td className="text-xs text-slate-300">₹{parseFloat(p.da_amount).toLocaleString()}</td>
                    <td className="text-xs text-slate-300">₹{parseFloat(p.hra_amount).toLocaleString()}</td>
                    <td className="text-xs text-slate-300">₹{parseFloat(p.ta_amount).toLocaleString()}</td>
                    <td className="font-semibold text-sm text-slate-100">₹{parseFloat(p.gross_pay).toLocaleString()}</td>
                    <td className="text-red-400 text-xs">-₹{parseFloat(p.pf_employee).toLocaleString()}</td>
                    <td className="text-red-400 text-xs">-₹{parseFloat(p.tds).toLocaleString()}</td>
                    <td className="font-bold text-sm text-green-400">₹{parseFloat(p.net_pay).toLocaleString()}</td>
                    <td><Badge text={p.status}/></td>
                    <td>
                      <div className="flex gap-1.5 justify-center">
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '6px', borderRadius: '8px' }} 
                          title="View & Print Slip"
                          onClick={() => {
                            payrollAPI.getSlip(p.emp_id, p.month, p.year)
                              .then(r => setSlip(r.data.data))
                              .catch(e => { console.error(e); setSlip(p); });
                          }}
                        >
                          <FileText size={14}/>
                        </button>
                        {isMin('hr_staff') && (
                          <button 
                            className="btn btn-outline border-blue-500 text-blue-400 hover:bg-blue-500/10" 
                            style={{ padding: '6px', borderRadius: '8px' }} 
                            title="Adjust Salary Components"
                            onClick={() => {
                              setFormObj({
                                ...p,
                                basic_pay: parseFloat(p.basic_pay),
                                da_percentage: parseFloat(p.da_percentage || 42),
                                hra_percentage: parseFloat(p.hra_percentage || 20),
                                ta_amount: parseFloat(p.ta_amount || 1500),
                                medical_allowance: parseFloat(p.medical_allowance || 0),
                                special_allowance: parseFloat(p.special_allowance || 0),
                                other_allowances: parseFloat(p.other_allowances || 0),
                                professional_tax: parseFloat(p.professional_tax || 200),
                                tds: parseFloat(p.tds || 0),
                                other_deductions: parseFloat(p.other_deductions || 0),
                              });
                              setShowFormModal(true);
                            }}
                          >
                            <Edit2 size={14}/>
                          </button>
                        )}
                        {isMin('hr_manager') && p.status === 'Processed' && (
                          <button 
                            className="btn btn-success" 
                            style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }} 
                            title="Process Individual Payment"
                            onClick={() => payIndividualEmployee(p)}
                          >
                            <CreditCard size={14}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
                <tfoot><tr style={{background:'rgba(255, 255, 255, 0.1)'}}>
                  <td colSpan={6} className="font-bold px-4 py-3 text-sm text-white">TOTALS</td>
                  <td className="font-bold px-4 py-3 text-white">₹{Math.round(summary.gross||0).toLocaleString()}</td>
                  <td className="font-bold text-red-400 px-4 py-3">-₹{Math.round(summary.pf||0).toLocaleString()}</td>
                  <td className="font-bold text-red-400 px-4 py-3">-₹{Math.round(summary.tds||0).toLocaleString()}</td>
                  <td className="font-bold text-green-400 px-4 py-3">₹{Math.round(summary.net||0).toLocaleString()}</td>
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
            <div className="p-4 bg-slate-800/50 grid grid-cols-2 text-sm gap-2 border-b border-white/10">
              {[['Employee',slip.emp_name],['Emp ID',slip.emp_id],['Department',slip.dept_name],['Status',slip.status]].map(([k,v])=>(
                <div key={k}><p className="text-slate-400 text-xs">{k}</p><p className="font-bold">{v}</p></div>
              ))}
            </div>
            <div className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-2 text-green-700">Earnings</p>
                  {[['Basic Pay',slip.basic_pay],['Dearness Allowance',slip.da_amount],['HRA',slip.hra_amount],['Transport Allowance',slip.ta_amount]].map(([k,v])=>(
                    <div key={k} className="flex justify-between text-sm py-1 border-b border-white/10">
                      <span>{k}</span><span className="font-medium">₹{parseFloat(v||0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm py-2 font-bold text-green-700"><span>Gross Pay</span><span>₹{parseFloat(slip.gross_pay||0).toLocaleString()}</span></div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-2 text-red-600">Deductions</p>
                  {[['Provident Fund',slip.pf_employee],['Professional Tax',slip.professional_tax],['Income Tax (TDS)',slip.tds]].map(([k,v])=>(
                    <div key={k} className="flex justify-between text-sm py-1 border-b border-white/10">
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
          <button className="btn btn-primary w-full mt-3" onClick={handleDownloadSlip}><Download size={15}/>Download Slip</button>
        </Modal>
      )}

      {showAnnualModal && annualSummary && (
        <Modal title={`Annual Salary Summary — ${year}`} onClose={()=>setShowAnnualModal(false)} wide>
          {user.role === 'employee' ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Basic Pay</th>
                    <th>DA</th>
                    <th>HRA</th>
                    <th>TA</th>
                    <th>Gross Pay</th>
                    <th>PF</th>
                    <th>TDS</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {annualSummary.records.map(r => (
                    <tr key={r.month}>
                      <td className="font-bold">{months[r.month-1]}</td>
                      <td>₹{parseFloat(r.basic_pay).toLocaleString()}</td>
                      <td>₹{parseFloat(r.da_amount).toLocaleString()}</td>
                      <td>₹{parseFloat(r.hra_amount).toLocaleString()}</td>
                      <td>₹{parseFloat(r.ta_amount).toLocaleString()}</td>
                      <td className="font-semibold text-slate-200">₹{parseFloat(r.gross_pay).toLocaleString()}</td>
                      <td className="text-red-400">-₹{parseFloat(r.pf_employee).toLocaleString()}</td>
                      <td className="text-red-400">-₹{parseFloat(r.tds).toLocaleString()}</td>
                      <td className="font-bold text-green-400">₹{parseFloat(r.net_pay).toLocaleString()}</td>
                      <td><Badge text={r.status}/></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:'rgba(255, 255, 255, 0.1)'}}>
                    <td className="font-bold text-white">TOTALS</td>
                    <td colSpan={4}></td>
                    <td className="font-bold text-white">₹{Math.round(annualSummary.summary.gross||0).toLocaleString()}</td>
                    <td className="font-bold text-red-400">-₹{Math.round(annualSummary.summary.pf||0).toLocaleString()}</td>
                    <td className="font-bold text-red-400">-₹{Math.round(annualSummary.summary.tds||0).toLocaleString()}</td>
                    <td className="font-bold text-green-400">₹{Math.round(annualSummary.summary.net||0).toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div>
              {/* For HR / Admin, show employee-wise annual summary */}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Employee Name</th>
                      <th>Department</th>
                      <th>Annual Gross</th>
                      <th>Annual PF</th>
                      <th>Annual TDS</th>
                      <th>Annual Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const employeeSalaries = {};
                      annualSummary.records.forEach(rec => {
                        if (!employeeSalaries[rec.emp_id]) {
                          employeeSalaries[rec.emp_id] = {
                            emp_id: rec.emp_id,
                            emp_name: rec.emp_name,
                            dept_name: rec.dept_name,
                            gross: 0,
                            net: 0,
                            pf: 0,
                            tds: 0,
                          };
                        }
                        employeeSalaries[rec.emp_id].gross += parseFloat(rec.gross_pay || 0);
                        employeeSalaries[rec.emp_id].net += parseFloat(rec.net_pay || 0);
                        employeeSalaries[rec.emp_id].pf += parseFloat(rec.pf_employee || 0);
                        employeeSalaries[rec.emp_id].tds += parseFloat(rec.tds || 0);
                      });
                      return Object.values(employeeSalaries).map(emp => (
                        <tr key={emp.emp_id}>
                          <td className="font-mono text-blue-600 text-xs">{emp.emp_id}</td>
                          <td><div className="font-medium">{emp.emp_name}</div></td>
                          <td><span className="text-xs text-slate-400">{emp.dept_name}</span></td>
                          <td className="font-semibold text-slate-200">₹{Math.round(emp.gross).toLocaleString()}</td>
                          <td className="text-red-400">-₹{Math.round(emp.pf).toLocaleString()}</td>
                          <td className="text-red-400">-₹{Math.round(emp.tds).toLocaleString()}</td>
                          <td className="font-bold text-green-400">₹{Math.round(emp.net).toLocaleString()}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                  <tfoot>
                    <tr style={{background:'rgba(255, 255, 255, 0.1)'}}>
                      <td colSpan={3} className="font-bold text-white text-sm">TOTALS</td>
                      <td className="font-bold text-white">₹{Math.round(annualSummary.summary.gross||0).toLocaleString()}</td>
                      <td className="font-bold text-red-400">-₹{Math.round(annualSummary.summary.pf||0).toLocaleString()}</td>
                      <td className="font-bold text-red-400">-₹{Math.round(annualSummary.summary.tds||0).toLocaleString()}</td>
                      <td className="font-bold text-green-400">₹{Math.round(annualSummary.summary.net||0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </Modal>
      )}

      {showFormModal && (
        <Modal title={formObj.id ? `Adjust Salary Components — ${formObj.emp_name}` : 'New Payroll Entry'} onClose={()=>setShowFormModal(false)}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Employee<span className="text-red-400">*</span></label>
                {formObj.id ? (
                  <input className="input" value={`${formObj.emp_name} (${formObj.emp_id})`} disabled />
                ) : (
                  <select className="input" value={formObj.emp_id} onChange={e => handleSelectEmployee(e.target.value)}>
                    <option value="">Select Employee</option>
                    {employees.map(e => (
                      <option key={e.emp_id} value={e.emp_id}>{e.first_name} {e.last_name} ({e.emp_id})</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Payment Mode</label>
                <select className="input" value={formObj.payment_mode} onChange={e=>setFormObj({...formObj, payment_mode: e.target.value})}>
                  {['Bank Transfer', 'Cash', 'Cheque'].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="col-span-3 pb-1 border-b border-white/5"><span className="text-xs font-bold text-white uppercase">Salary Period & Status</span></div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Month</label>
                <select className="input text-xs" value={formObj.month} onChange={e=>setFormObj({...formObj, month: parseInt(e.target.value)})}>
                  {months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Year</label>
                <input type="number" className="input text-xs" value={formObj.year} onChange={e=>setFormObj({...formObj, year: parseInt(e.target.value)})}/>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Status</label>
                <select className="input text-xs" value={formObj.status} onChange={e=>setFormObj({...formObj, status: e.target.value})}>
                  {['Draft', 'Processed', 'Paid'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Earnings Column */}
              <div className="space-y-3 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                <p className="text-xs font-bold text-emerald-400 uppercase border-b border-emerald-500/10 pb-1.5 mb-2">Earnings</p>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Basic Pay (₹)<span className="text-red-400">*</span></label>
                  <input type="number" className="input text-xs" value={formObj.basic_pay} onChange={e=>setFormObj({...formObj, basic_pay: parseFloat(e.target.value)||''})}/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">DA (%)</label>
                    <input type="number" className="input text-xs" value={formObj.da_percentage} onChange={e=>setFormObj({...formObj, da_percentage: parseFloat(e.target.value)||0})}/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">HRA (%)</label>
                    <input type="number" className="input text-xs" value={formObj.hra_percentage} onChange={e=>setFormObj({...formObj, hra_percentage: parseFloat(e.target.value)||0})}/>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">TA Amount (₹)</label>
                  <input type="number" className="input text-xs" value={formObj.ta_amount} onChange={e=>setFormObj({...formObj, ta_amount: parseFloat(e.target.value)||0})}/>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Medical Allowance (₹)</label>
                  <input type="number" className="input text-xs" value={formObj.medical_allowance} onChange={e=>setFormObj({...formObj, medical_allowance: parseFloat(e.target.value)||0})}/>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Special Allowance (₹)</label>
                  <input type="number" className="input text-xs" value={formObj.special_allowance} onChange={e=>setFormObj({...formObj, special_allowance: parseFloat(e.target.value)||0})}/>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Other Allowances (₹)</label>
                  <input type="number" className="input text-xs" value={formObj.other_allowances} onChange={e=>setFormObj({...formObj, other_allowances: parseFloat(e.target.value)||0})}/>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="space-y-3 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                <p className="text-xs font-bold text-red-400 uppercase border-b border-red-500/10 pb-1.5 mb-2">Deductions</p>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Professional Tax (₹)</label>
                  <input type="number" className="input text-xs" value={formObj.professional_tax} onChange={e=>setFormObj({...formObj, professional_tax: parseFloat(e.target.value)||0})}/>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Income Tax / TDS (₹)</label>
                  <input type="number" className="input text-xs" value={formObj.tds} onChange={e=>setFormObj({...formObj, tds: parseFloat(e.target.value)||0})}/>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Other Deductions (₹)</label>
                  <input type="number" className="input text-xs" value={formObj.other_deductions} onChange={e=>setFormObj({...formObj, other_deductions: parseFloat(e.target.value)||0})}/>
                </div>
                <div className="pt-2 text-xs text-slate-500">
                  <p>* PF will be auto-calculated at 12% of Basic Pay upon save.</p>
                </div>
              </div>
            </div>
          </div>
          <button className="btn btn-primary w-full mt-4" disabled={savingForm || !formObj.emp_id || !formObj.basic_pay} onClick={savePayrollEntry}>
            {savingForm ? 'Saving...' : formObj.id ? 'Update & Recalculate' : 'Create Entry'}
          </button>
        </Modal>
      )}
    </Layout>
  );
}