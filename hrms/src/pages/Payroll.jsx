import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import StatsCard from '../components/common/StatsCard';
import Loader from '../components/common/Loader';
import { IndianRupee, Download, FileText, Check, RefreshCw, Plus, Edit2, CreditCard } from 'lucide-react';
import { payrollAPI, empAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

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

export default function Payroll() {
  const { isMin, user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
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
    } catch (e) {
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
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.message || e.message));
    }
  };

  const fetchAnnualSummary = async () => {
    setAnnualLoading(true);
    try {
      const res = await payrollAPI.list({ year, month: 'all' });
      setAnnualSummary(res.data.data);
      setShowAnnualModal(true);
    } catch (err) {
      setMsg(`Error fetching summary: ${err.response?.data?.message || err.message}`);
    } finally {
      setAnnualLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!records || records.length === 0) {
      setMsg("Error: No records to export for this month");
      return;
    }
    const headers = [
      "Emp ID", "Employee Name", "Department", "Payment Mode",
      "Status", "Gross Salary", "Basic Pay", "HRA", "Conveyance",
      "LWP Days", "LWP Deduction", "Total Deductions", "Net Payable"
    ];

    const rows = records.map(p => [
      p.emp_id,
      `"${p.emp_name}"`,
      `"${p.dept_name || ''}"`,
      p.payment_mode || 'Bank Transfer',
      p.status,
      p.gross_pay || 0,
      p.basic_pay || 0,
      p.hra_amount || 0,
      p.ta_amount || 0,
      p.lwp_days || 0,
      p.lwp_amount || 0,
      p.total_deductions || 0,
      p.net_pay || 0
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Payroll_Export_${months[month - 1]}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const load = () => {
    setLoading(true);
    payrollAPI.list({ month, year })
      .then(r => { setRecords(r.data.data.records || []); setSummary(r.data.data.summary || {}); })
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
    } catch (e) { setMsg('Error: ' + e.response?.data?.message); }
    finally { setProcessing(false); }
  };

  const markPaid = async () => {
    try { await payrollAPI.markPaid({ month, year }); setMsg('All marked as Paid'); load(); }
    catch (e) { setMsg('Error: ' + e.response?.data?.message); }
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
              <h2>JadeQuest</h2>
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
              <!-- Earnings & Employer Contrib -->
              <div class="table-column">
                <div class="table-column-header earnings" style="background:#fef08a; color:#854d0e;">Earning Gross</div>
                <div class="row">
                  <span>Basic</span>
                  <span>₹${parseFloat(slip.basic_pay || 0).toLocaleString()}</span>
                </div>
                <div class="row">
                  <span>HRA</span>
                  <span>₹${parseFloat(slip.hra_amount || 0).toLocaleString()}</span>
                </div>
                <div class="row">
                  <span>Conveyance</span>
                  <span>₹${parseFloat(slip.ta_amount || 0).toLocaleString()}</span>
                </div>
                <div class="total-row earnings" style="background:#fef08a; color:#854d0e; border-top: 1px solid #fde047;">
                  <span>Total Gross (A)</span>
                  <span>₹${parseFloat(slip.gross_pay || 0).toLocaleString()}</span>
                </div>

                <div class="table-column-header earnings" style="margin-top:20px; background:#fef08a; color:#854d0e;">Employer Contribution</div>
                <div class="row">
                  <span>Employer PF</span>
                  <span>₹${parseFloat(slip.pf_employer || 0).toLocaleString()}</span>
                </div>
                <div class="row">
                  <span>Employer ESIC</span>
                  <span>₹${parseFloat(slip.esic_employer || 0).toLocaleString()}</span>
                </div>
                <div class="total-row earnings" style="background:#fef08a; color:#854d0e; border-top: 1px solid #fde047;">
                  <span>Total</span>
                  <span>₹${(parseFloat(slip.pf_employer || 0) + parseFloat(slip.esic_employer || 0)).toLocaleString()}</span>
                </div>
              </div>
              
              <!-- Deductions -->
              <div class="table-column">
                <div class="table-column-header deductions" style="background:#fef08a; color:#854d0e;">Employee Contribution</div>
                <div class="row">
                  <span>Employee PF</span>
                  <span>₹${parseFloat(slip.pf_employee || 0).toLocaleString()}</span>
                </div>
                <div class="row">
                  <span>Employee ESIC</span>
                  <span>₹${parseFloat(slip.esic_employee || 0).toLocaleString()}</span>
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
                <div class="total-row deductions" style="background:#fef08a; color:#854d0e; border-top: 1px solid #fde047;">
                  <span>Total</span>
                  <span>₹${parseFloat(slip.total_deductions || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            ${parseFloat(slip.compensation || 0) > 0 ? `
            <div style="margin-top: 20px; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px 16px; background: #e0f2fe; color: #0369a1; display:flex; justify-content:space-between; font-weight: bold;">
              <span>Additional Compensation / Bonus:</span>
              <span>+ ₹${parseFloat(slip.compensation || 0).toLocaleString()}</span>
            </div>
            ` : ''}
            
            <div class="net-pay-box" style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #fef08a; border: 2px solid #fde047;">
              <div style="display:flex; justify-content:space-between; margin-bottom: 8px; font-weight: bold; color: #854d0e;">
                <span>Total CTC:</span>
                <span>₹${(parseFloat(slip.gross_pay || 0) + parseFloat(slip.pf_employer || 0) + parseFloat(slip.esic_employer || 0)).toLocaleString()}</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-weight: bold; color: #0f172a; font-size: 16px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #854d0e40;">
                <span>Net Payable:</span>
                <span>₹${parseFloat(slip.net_pay || 0).toLocaleString()}</span>
              </div>
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

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <Layout title="Payroll Management" theme="light" bg="#F8F8FF">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <CustomDropdown
          value={month}
          onChange={val => setMonth(val)}
          options={months.map((m, i) => ({ value: i + 1, label: m }))}
          placeholder="Select Month"
          width={160}
        />
        <CustomDropdown
          value={year}
          onChange={val => setYear(val)}
          options={[2023, 2024, 2025, 2026].map(y => ({ value: y, label: String(y) }))}
          placeholder="Select Year"
          width={100}
        />
        {isMin('hr_manager') && <>
          <button
            className="btn font-semibold transition-all duration-200"
            style={{
              background: '#162660',
              color: '#FEFEFA',
              boxShadow: '0 4px 15px rgba(22, 38, 96, 0.2)'
            }}
            onClick={processAll}
            disabled={processing}
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
            <RefreshCw size={15} />{processing ? 'Processing...' : 'Process All'}
          </button>
          <button
            className="btn font-semibold transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#fff',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
            }}
            onClick={markPaid}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.2)';
            }}
          >
            <Check size={15} />Mark All Paid
          </button>
        </>}
        {isMin('hr_staff') && (
          <button
            className="btn font-semibold transition-all duration-200"
            style={{
              background: '#162660',
              color: '#FEFEFA',
              boxShadow: '0 4px 15px rgba(22, 38, 96, 0.2)'
            }}
            onClick={() => {
              setFormObj({
                emp_id: '',
                month: month,
                year: year,
                ctc: '',
                professional_tax: 200,
                tds: 0,
                other_deductions: 0,
                compensation: 0,
                payment_mode: 'Bank Transfer',
                status: 'Processed'
              });
              setShowFormModal(true);
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
            <Plus size={15} />New Entry
          </button>
        )}
        <button
          className="btn font-semibold transition-all duration-200"
          style={{
            background: '#fff',
            color: '#162660',
            border: '1px solid rgba(22, 38, 96, 0.2)',
            boxShadow: '0 4px 12px rgba(22, 38, 96, 0.05)'
          }}
          onClick={fetchAnnualSummary}
          disabled={annualLoading}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.2)';
          }}
        >
          <IndianRupee size={15} />{annualLoading ? 'Loading...' : 'Annual Summary'}
        </button>
        {isMin('hr_staff') && (
          <button
            className="btn font-semibold transition-all duration-200"
            style={{
              background: '#fff',
              color: '#162660',
              border: '1px solid rgba(22, 38, 96, 0.2)',
              boxShadow: '0 4px 12px rgba(22, 38, 96, 0.05)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(22, 38, 96, 0.2)';
            }}
            onClick={exportToCSV}
          >
            <Download size={15} />Export
          </button>
        )}
      </div>

      {msg && (
        <div
          className={`px-4 py-3 rounded-xl text-sm mb-4 border transition-all duration-300 ${msg.startsWith('Error')
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatsCard title="Gross Payroll" value={`₹${((summary.gross || 0) / 100000).toFixed(2)}L`} icon={IndianRupee} color="#3b82f6" theme="light" delay={0} />
        <StatsCard title="Net Payroll" value={`₹${((summary.net || 0) / 100000).toFixed(2)}L`} icon={IndianRupee} color="#22c55e" theme="light" delay={60} />
        <StatsCard title="Total PF" value={`₹${Math.round(summary.pf || 0).toLocaleString()}`} icon={IndianRupee} color="#8b5cf6" theme="light" delay={120} />
        <StatsCard title="Total TDS" value={`₹${Math.round(summary.tds || 0).toLocaleString()}`} icon={IndianRupee} color="#f59e0b" theme="light" delay={180} />
      </div>

      {loading ? <Loader /> : (
        <div
          className="hover-card animate-slide-up"
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(22, 38, 96, 0.1)',
            boxShadow: '0 10px 30px rgba(22, 38, 96, 0.05)',
            animationDelay: '240ms'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#162660' }}>Salary Register — {months[month - 1]} {year}</h3>
          {records.length === 0 ? (
            <div className="text-center py-12">
              <p className="mb-3 font-medium" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>No payroll records for this month.</p>
              {isMin('hr_manager') && (
                <button
                  className="btn font-semibold transition-all duration-200"
                  style={{
                    background: '#162660',
                    color: '#FEFEFA',
                    boxShadow: '0 4px 15px rgba(22, 38, 96, 0.2)'
                  }}
                  onClick={processAll}
                  disabled={processing}
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
                  <RefreshCw size={15} />{processing ? 'Processing...' : 'Generate Payroll'}
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '1150px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                    {['Emp ID', 'Employee', 'Basic', 'DA', 'HRA', 'TA', 'Gross', 'PF', 'TDS', 'Net Pay', 'Status', 'Actions'].map(h => (
                      <th key={h} className="whitespace-nowrap px-4 py-3" style={{ color: '#162660', fontWeight: 600, fontSize: '12px', borderBottom: '1px solid rgba(22, 38, 96, 0.1)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{records.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="transition-all duration-300"
                    style={{
                      borderBottom: '1px solid rgba(22, 38, 96, 0.05)',
                      animationDelay: `${idx * 20}ms`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td className="font-mono text-xs font-semibold px-4 py-3 whitespace-nowrap" style={{ color: '#162660' }}>{p.emp_id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-sm" style={{ color: '#162660' }}>{p.emp_name}</div>
                      <div className="text-xs font-medium mt-0.5" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>{p.dept_name || '—'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#162660' }}>₹{parseFloat(p.basic_pay).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#162660' }}>₹{parseFloat(p.da_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#162660' }}>₹{parseFloat(p.hra_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#162660' }}>₹{parseFloat(p.ta_amount).toLocaleString()}</td>
                    <td className="font-bold px-4 py-3 whitespace-nowrap" style={{ color: '#162660' }}>₹{parseFloat(p.gross_pay).toLocaleString()}</td>
                    <td className="text-red-600 font-semibold px-4 py-3 whitespace-nowrap">-₹{parseFloat(p.pf_employee).toLocaleString()}</td>
                    <td className="text-red-600 font-semibold px-4 py-3 whitespace-nowrap">-₹{parseFloat(p.tds).toLocaleString()}</td>
                    <td className="font-bold text-emerald-600 px-4 py-3 whitespace-nowrap">₹{parseFloat(p.net_pay).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge text={p.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1.5 justify-center">
                        <button
                          className="btn font-semibold transition-all duration-300"
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: 11,
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
                          onClick={() => {
                            payrollAPI.getSlip(p.emp_id, p.month, p.year)
                              .then(r => setSlip(r.data.data))
                              .catch(e => { console.error(e); setSlip(p); });
                          }}
                          title="View & Print Slip"
                        >
                          <FileText size={12} />Slip
                        </button>
                        {isMin('hr_staff') && p.status !== 'Paid' && (
                          <button
                            className="btn font-semibold transition-all duration-300"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontSize: 11,
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              background: 'rgba(59, 130, 246, 0.05)',
                              color: '#2563eb',
                              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.03)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                            }}
                            title="Adjust Salary Components"
                            onClick={() => {
                              setFormObj({
                                ...p,
                                ctc: parseFloat(p.ctc || p.basic_pay || 0),
                                professional_tax: parseFloat(p.professional_tax || 200),
                                tds: parseFloat(p.tds || 0),
                                other_deductions: parseFloat(p.other_deductions || 0),
                                compensation: parseFloat(p.compensation || 0),
                              });
                              setShowFormModal(true);
                            }}
                          >
                            <Edit2 size={12} />Edit
                          </button>
                        )}
                        {isMin('hr_manager') && p.status === 'Processed' && (
                          <button
                            className="btn font-semibold transition-all duration-300"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontSize: 11,
                              border: '1px solid rgba(16, 185, 129, 0.2)',
                              background: 'rgba(16, 185, 129, 0.08)',
                              color: '#059669',
                              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.03)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                            }}
                            title="Process Individual Payment"
                            onClick={() => payIndividualEmployee(p)}
                          >
                            <CreditCard size={12} />Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
                <tfoot>
                  <tr style={{ background: 'rgba(22, 38, 96, 0.04)', borderTop: '2px solid rgba(22, 38, 96, 0.15)' }}>
                    <td colSpan={6} className="font-bold px-4 py-3 text-sm pr-6 text-right" style={{ color: '#162660' }}>TOTALS</td>
                    <td className="font-bold px-4 py-3 whitespace-nowrap" style={{ color: '#162660' }}>₹{Math.round(summary.gross || 0).toLocaleString()}</td>
                    <td className="font-bold text-red-600 px-4 py-3 whitespace-nowrap">-₹{Math.round(summary.pf || 0).toLocaleString()}</td>
                    <td className="font-bold text-red-600 px-4 py-3 whitespace-nowrap">-₹{Math.round(summary.tds || 0).toLocaleString()}</td>
                    <td className="font-bold text-emerald-600 px-4 py-3 whitespace-nowrap">₹{Math.round(summary.net || 0).toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {slip && (
        <Modal title="Salary Slip" onClose={() => setSlip(null)} theme="light">
          <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'rgba(22, 38, 96, 0.1)' }}>
            <div className="text-white p-4 text-center" style={{ background: '#162660' }}>
              <p className="font-bold text-lg">JadeQuest</p>
              <p className="text-sm opacity-80">HRMS — Salary Slip</p>
              <p className="text-sm mt-1">Month: {months[slip.month - 1]} {slip.year}</p>
            </div>
            <div className="p-4 grid grid-cols-2 text-sm gap-2 border-b" style={{ background: 'rgba(22, 38, 96, 0.03)', borderColor: 'rgba(22, 38, 96, 0.08)' }}>
              {[['Employee', slip.emp_name], ['Emp ID', slip.emp_id], ['Department', slip.dept_name], ['Status', slip.status]].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs font-semibold" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>{k}</p>
                  <p className="font-bold" style={{ color: '#162660' }}>{v}</p>
                </div>
              ))}
            </div>
            <div className="p-4" style={{ background: '#fff' }}>
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-2 text-emerald-700">Earnings & Employer Contrib</p>
                  {[['Basic', slip.basic_pay], ['HRA', slip.hra_amount], ['Conveyance', slip.ta_amount]].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm py-1 border-b" style={{ borderColor: 'rgba(22, 38, 96, 0.08)', color: '#162660' }}>
                      <span>{k}</span><span className="font-medium">₹{parseFloat(v || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm py-2 font-bold text-emerald-700"><span>Total Gross</span><span>₹{parseFloat(slip.gross_pay || 0).toLocaleString()}</span></div>
                  <div className="mt-2"></div>
                  {[['Employer PF', slip.pf_employer], ['Employer ESIC', slip.esic_employer]].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm py-1 border-b" style={{ borderColor: 'rgba(22, 38, 96, 0.08)', color: '#162660' }}>
                      <span>{k}</span><span className="font-medium">₹{parseFloat(v || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm py-2 font-bold text-emerald-700"><span>Total</span><span>₹{(parseFloat(slip.pf_employer || 0) + parseFloat(slip.esic_employer || 0)).toLocaleString()}</span></div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-2 text-rose-600">Employee Contribution</p>
                  {[['Employee PF', slip.pf_employee], ['Employee ESIC', slip.esic_employee], ['Professional Tax', slip.professional_tax], ['Income Tax (TDS)', slip.tds], ['LWP Deduction', slip.lwp_amount]].map(([k, v]) => {
                    if (k === 'LWP Deduction' && !v) return null;
                    return (
                      <div key={k} className="flex justify-between text-sm py-1 border-b" style={{ borderColor: 'rgba(22, 38, 96, 0.08)', color: '#162660' }}>
                        <span>{k} {k === 'LWP Deduction' && slip.lwp_days > 0 ? `(${slip.lwp_days} days)` : ''}</span>
                        <span className="font-medium text-rose-600">₹{parseFloat(v || 0).toLocaleString()}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-sm py-2 font-bold text-rose-600"><span>Total Deductions</span><span>₹{parseFloat(slip.total_deductions || 0).toLocaleString()}</span></div>
                </div>
              </div>
              {parseFloat(slip.compensation || 0) > 0 && (
                <div className="border rounded-lg p-3 mt-3 flex justify-between items-center bg-sky-50 border-sky-200">
                  <span className="font-bold text-sky-800">Additional Compensation / Bonus</span>
                  <span className="font-bold text-sky-800 text-lg">+ ₹{parseFloat(slip.compensation || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="border rounded-lg p-3 mt-3 flex justify-between items-center bg-amber-50 border-amber-200">
                <span className="font-bold text-amber-800">Total CTC </span>
                <span className="font-bold text-amber-800 text-lg">₹{(parseFloat(slip.gross_pay || 0) + parseFloat(slip.pf_employer || 0) + parseFloat(slip.esic_employer || 0)).toLocaleString()}</span>
              </div>
              <div className="border rounded-lg p-3 mt-3 flex justify-between items-center" style={{ background: 'rgba(16, 185, 129, 0.06)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                <span className="font-bold text-emerald-800">Net Payable </span>
                <span className="font-bold text-emerald-800 text-lg">₹{parseFloat(slip.net_pay || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <button
            className="btn w-full mt-4 font-semibold transition-all duration-200"
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
            onClick={handleDownloadSlip}
          >
            <Download size={15} />Download Slip
          </button>
        </Modal>
      )}

      {showAnnualModal && annualSummary && (
        <Modal title={`Annual Salary Summary — ${year}`} onClose={() => setShowAnnualModal(false)} wide>
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
                      <td className="font-bold">{months[r.month - 1]}</td>
                      <td>₹{parseFloat(r.basic_pay).toLocaleString()}</td>
                      <td>₹{parseFloat(r.da_amount).toLocaleString()}</td>
                      <td>₹{parseFloat(r.hra_amount).toLocaleString()}</td>
                      <td>₹{parseFloat(r.ta_amount).toLocaleString()}</td>
                      <td className="font-semibold text-slate-200">₹{parseFloat(r.gross_pay).toLocaleString()}</td>
                      <td className="text-red-400">-₹{parseFloat(r.pf_employee).toLocaleString()}</td>
                      <td className="text-red-400">-₹{parseFloat(r.tds).toLocaleString()}</td>
                      <td className="font-bold text-green-400">₹{parseFloat(r.net_pay).toLocaleString()}</td>
                      <td><Badge text={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                    <td className="font-bold text-white">TOTALS</td>
                    <td colSpan={4}></td>
                    <td className="font-bold text-white">₹{Math.round(annualSummary.summary.gross || 0).toLocaleString()}</td>
                    <td className="font-bold text-red-400">-₹{Math.round(annualSummary.summary.pf || 0).toLocaleString()}</td>
                    <td className="font-bold text-red-400">-₹{Math.round(annualSummary.summary.tds || 0).toLocaleString()}</td>
                    <td className="font-bold text-green-400">₹{Math.round(annualSummary.summary.net || 0).toLocaleString()}</td>
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
                    <tr style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                      <td colSpan={3} className="font-bold text-white text-sm">TOTALS</td>
                      <td className="font-bold text-white">₹{Math.round(annualSummary.summary.gross || 0).toLocaleString()}</td>
                      <td className="font-bold text-red-400">-₹{Math.round(annualSummary.summary.pf || 0).toLocaleString()}</td>
                      <td className="font-bold text-red-400">-₹{Math.round(annualSummary.summary.tds || 0).toLocaleString()}</td>
                      <td className="font-bold text-green-400">₹{Math.round(annualSummary.summary.net || 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </Modal>
      )}

      {showFormModal && (
        <Modal title={formObj.id ? `Adjust Salary Components — ${formObj.emp_name}` : 'New Payroll Entry'} onClose={() => setShowFormModal(false)} theme="light">
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
                <select className="input" value={formObj.payment_mode} onChange={e => setFormObj({ ...formObj, payment_mode: e.target.value })}>
                  {['Bank Transfer', 'Cash', 'Cheque'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="col-span-3 pb-1 border-b border-white/5"><span className="text-xs font-bold text-white uppercase">Salary Period & Status</span></div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Month</label>
                <select className="input text-xs" value={formObj.month} onChange={e => setFormObj({ ...formObj, month: parseInt(e.target.value) })}>
                  {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Year</label>
                <input type="number" className="input text-xs" value={formObj.year} onChange={e => setFormObj({ ...formObj, year: parseInt(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Status</label>
                <select className="input text-xs" value={formObj.status} onChange={e => setFormObj({ ...formObj, status: e.target.value })}>
                  {['Draft', 'Processed', 'Paid'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Earnings Column */}
              <div className="space-y-3 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 col-span-2">
                <p className="text-xs font-bold text-emerald-400 uppercase border-b border-emerald-500/10 pb-1.5 mb-2">Gross Salary Detail</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Monthly Gross Salary (₹)<span className="text-red-400">*</span></label>
                    <input type="number" min="0" className="input text-xs" placeholder="0" value={formObj.ctc || formObj.basic_pay || ''} onChange={e => setFormObj({ ...formObj, ctc: Math.max(0, parseFloat(e.target.value)) || '' })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Compensation / Bonus (₹)</label>
                    <input type="number" min="0" className="input text-xs" placeholder="0" value={formObj.compensation || ''} onChange={e => setFormObj({ ...formObj, compensation: Math.max(0, parseFloat(e.target.value)) || '' })} />
                  </div>
                </div>
                <div className="pt-2 text-xs text-slate-500">
                  <p>* Basic, HRA, Conveyance, PF and ESIC will be auto-calculated upon save based on this Gross Salary.</p>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="space-y-3 bg-red-500/5 p-4 rounded-xl border border-red-500/10 col-span-2">
                <p className="text-xs font-bold text-red-400 uppercase border-b border-red-500/10 pb-1.5 mb-2">Additional Deductions</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Professional Tax (₹)</label>
                    <input type="number" min="0" className="input text-xs" placeholder="0" value={formObj.professional_tax || ''} onChange={e => setFormObj({ ...formObj, professional_tax: Math.max(0, parseFloat(e.target.value)) || '' })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Income Tax / TDS (₹)</label>
                    <input type="number" min="0" className="input text-xs" placeholder="0" value={formObj.tds || ''} onChange={e => setFormObj({ ...formObj, tds: Math.max(0, parseFloat(e.target.value)) || '' })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Other Deductions (₹)</label>
                    <input type="number" min="0" className="input text-xs" placeholder="0" value={formObj.other_deductions || ''} onChange={e => setFormObj({ ...formObj, other_deductions: Math.max(0, parseFloat(e.target.value)) || '' })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Leave Without Pay (Days)</label>
                    <input type="number" min="0" step="0.5" className="input text-xs" placeholder="0" value={formObj.lwp_days || ''} onChange={e => setFormObj({ ...formObj, lwp_days: Math.max(0, parseFloat(e.target.value)) || '' })} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button className="btn btn-primary w-full mt-4" disabled={savingForm || !formObj.emp_id || !(formObj.ctc || formObj.basic_pay)} onClick={savePayrollEntry}>
            {savingForm ? 'Saving...' : formObj.id ? 'Update & Recalculate' : 'Create Entry'}
          </button>
        </Modal>
      )}
    </Layout>
  );
}