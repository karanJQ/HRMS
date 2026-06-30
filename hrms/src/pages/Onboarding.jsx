import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { Plus, Eye, CheckCircle, XCircle, Trash2, Search } from 'lucide-react';
import { onboardingAPI, deptAPI, documentAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { usePaginationAndSearch } from '../hooks/usePaginationAndSearch';
import Pagination from '../components/common/Pagination';

export default function Onboarding() {
  const { isMin } = useAuth();
  const [data, setData] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ candidate_ref_id:'', name:'', post:'', dept_id:'', selection_date:'', joining_date:'' });
  const [showCompleted, setShowCompleted] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docType, setDocType] = useState('Aadhar');
  const [fileToUpload, setFileToUpload] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(null);

  const activeCandidates = React.useMemo(() => data.filter(o => showCompleted || (o.status !== 'Completed' && o.status !== 'Cancelled')), [data, showCompleted]);

  const {
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    paginatedData, totalPages, totalItems
  } = usePaginationAndSearch(activeCandidates, ['name', 'candidate_ref_id', 'post', 'dept_name', 'dept_name_full'], 10);

  const load = () => {
    setLoading(true);
    Promise.all([onboardingAPI.list(), deptAPI.list()])
      .then(([o,d])=>{ setData(o.data.data||[]); setDepts(d.data.data||[]); })
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const addCandidate = async () => {
    try {
      const dept = depts.find(d=>d.id==form.dept_id);
      await onboardingAPI.create({ ...form, dept_name: dept?.name||'' });
      setMsg('Candidate added'); setShowAdd(false);
      setForm({ candidate_ref_id:'', name:'', post:'', dept_id:'', selection_date:'', joining_date:'' });
      load();
    } catch(e) { setMsg('Error: '+e.response?.data?.message); }
  };

  const updateField = async (id, field, value) => {
    try {
      const r = await onboardingAPI.update(id, { [field]: value });
      setData(d=>d.map(x=>x.id===id?r.data.data:x));
      if (selected?.id===id) setSelected(r.data.data);
    } catch(e) { setMsg('Error: '+e.response?.data?.message); throw e; }
  };

  const loadDocuments = async (ownerId) => {
    setLoadingDocs(true);
    try {
      const r = await documentAPI.list(ownerId);
      setDocuments(r.data.data || []);
    } catch (e) {
      setMsg('Error loading documents: ' + e.message);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSelectCandidate = (candidate) => {
    setSelected(candidate);
    loadDocuments(candidate.candidate_ref_id || candidate.id.toString());
  };

  const handleUploadDocument = async () => {
    if (!fileToUpload) return setMsg('Error: Please select a file to upload');
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('doc_type', docType);
    formData.append('owner_id', selected.candidate_ref_id || selected.id.toString());

    try {
      setMsg('Uploading document...');
      await documentAPI.upload(formData);
      setMsg('Document uploaded successfully');
      setFileToUpload(null);
      loadDocuments(selected.candidate_ref_id || selected.id.toString());
    } catch (e) {
      setMsg('Error uploading document: ' + (e.response?.data?.message || e.message));
    }
  };

  const handlePerformOCR = async (docId) => {
    try {
      setOcrLoading(docId);
      setMsg('Processing document with OCR service...');
      await documentAPI.performOCR(docId);
      setMsg('OCR processing completed successfully');
      loadDocuments(selected.candidate_ref_id || selected.id.toString());
    } catch (e) {
      setMsg('Error during OCR: ' + (e.response?.data?.message || e.message));
    } finally {
      setOcrLoading(null);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Delete this document? This action cannot be undone.')) return;
    try {
      await documentAPI.delete(docId);
      setMsg('Document deleted');
      loadDocuments(selected.candidate_ref_id || selected.id.toString());
    } catch (e) {
      setMsg('Error deleting document: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleAction = async (field, successMessage) => {
    try {
      await updateField(selected.id, field, true);
      setMsg(successMessage);
    } catch(e) {
      setMsg('Error: ' + e.message);
    }
  };

  const handleDownloadPDF = () => {
    if (!selected) return;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      setMsg('Error: Popup blocker blocked PDF generation. Please allow popups.');
      return;
    }
    
    const refNum = `JQ/${(selected.dept_name || 'GEN').substring(0,3).toUpperCase()}/2026/${Math.floor(1000 + Math.random() * 9000)}`;
    const currentDate = new Date().toLocaleDateString();
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Appointment_Letter_${selected.candidate_ref_id || 'Candidate'}</title>
          <style>
            body {
              font-family: Georgia, serif;
              color: #1e293b;
              padding: 40px;
              line-height: 1.6;
              background-color: #ffffff;
            }
            .container {
              max-width: 700px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #cbd5e1;
              padding-bottom: 16px;
              margin-bottom: 30px;
            }
            .header h2 {
              font-size: 24px;
              font-weight: bold;
              margin: 0 0 5px 0;
              text-transform: uppercase;
              color: #0f172a;
            }
            .header h3 {
              font-size: 16px;
              font-weight: 600;
              color: #475569;
              margin: 0 0 10px 0;
            }
            .header p {
              font-size: 14px;
              margin: 2px 0;
              color: #64748b;
            }
            .recipient {
              margin-bottom: 30px;
            }
            .recipient p {
              margin: 2px 0;
            }
            .subject {
              font-weight: bold;
              text-decoration: underline;
              margin-bottom: 20px;
            }
            .content p {
              margin-bottom: 16px;
              text-align: justify;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 60px;
              padding-top: 40px;
            }
            .footer-left p, .footer-right p {
              margin: 2px 0;
            }
            .footer-right {
              text-align: center;
            }
            .signature-space {
              margin-bottom: 20px;
              font-style: italic;
              color: #64748b;
            }
            @media print {
              body {
                padding: 20px;
              }
              @page {
                size: A4;
                margin: 20mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>JadeQuest</h2>
              <h3>${selected.dept_name_full || selected.dept_name}</h3>
              <p>Ref No: ${refNum}</p>
              <p>Date: ${currentDate}</p>
            </div>
            
            <div class="recipient">
              <p>To,</p>
              <p><strong>${selected.name}</strong></p>
              <p>Candidate ID: ${selected.candidate_ref_id || '—'}</p>
            </div>
            
            <div class="content">
              <p class="subject">Subject: Offer of Appointment for the post of ${selected.post}</p>
              <p>Dear ${selected.name},</p>
              <p>
                With reference to your application and the subsequent selection process, we are pleased to inform you that you have been selected for the post of <strong>${selected.post}</strong> in the <strong>${selected.dept_name_full || selected.dept_name}</strong>.
              </p>
              <p>
                Your appointment will be subject to successful police verification, medical clearance, and verification of original documents. You are requested to report for joining formalities on or before <strong>${selected.joining_date?.split('T')[0] || 'the specified joining date'}</strong>.
              </p>
              <p>
                Please bring all relevant original documents, including educational certificates, identity proof, and 4 passport-size photographs at the time of joining.
              </p>
            </div>
            
            <div class="footer">
              <div class="footer-left">
                <p>Date: ____________</p>
                <p>Place: Gandhinagar</p>
              </div>
              <div class="footer-right">
                <p class="signature-space">(${selected.police_verification === 'Cleared' ? 'Digitally Verified' : 'Pending Verification'})</p>
                <p><strong>Authorized Signatory</strong></p>
                <p>Department of Human Resources</p>
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
    setShowLetter(false);
    setMsg('Appointment Letter PDF download triggered successfully!');
  };

  const CheckRow = ({label, val, id, field}) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 rounded-xl px-4 transition-colors"
      onClick={()=>isMin('hr_staff') && updateField(id, field, !val)}>
      <span className="text-sm text-slate-700 font-medium">{label}</span>
      {val ? <CheckCircle size={20} className="text-emerald-500"/> : <XCircle size={20} className="text-red-500"/>}
    </div>
  );

  return (
    <Layout title="Employee Onboarding" theme="light">
      {(!selected && !showAdd && !showLetter && msg) && <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')?'bg-red-900/50 text-red-200 border border-red-500/30':'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30'}`}>{msg}</div>}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <p className="text-sm font-medium" style={{ color: 'rgba(22, 38, 96, 0.7)' }}>
            {totalItems} candidates in active pipeline
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search candidates..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-64 text-slate-800 bg-white"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors"
            style={{
              color: '#162660',
              borderColor: 'rgba(22, 38, 96, 0.15)',
              background: 'rgba(22, 38, 96, 0.03)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(22, 38, 96, 0.07)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(22, 38, 96, 0.03)'}
          >
            <input 
              type="checkbox" 
              checked={showCompleted} 
              onChange={e => setShowCompleted(e.target.checked)} 
              className="accent-[#162660] rounded border-slate-300"
            />
            <span>Include Completed & Cancelled</span>
          </label>
        </div>
        {isMin('hr_staff') && <button className="btn btn-primary w-full md:w-auto" onClick={()=>setShowAdd(true)}><Plus size={16}/>Add Candidate</button>}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {['Pending Documents','Documents Verified','Joining Formalities','Completed'].map((s, idx)=>(
          <div 
            key={s} 
            className="hover-card animate-slide-up text-center p-3 md:p-6"
            style={{
              background: '#fff',
              border: '1px solid rgba(22, 38, 96, 0.08)',
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
              animationDelay: `${idx * 60}ms`
            }}
          >
            <p className="text-3xl font-bold" style={{color:s==='Completed'?'#10b981':s==='Joining Formalities'?'#3b82f6':'#d97706'}}>{data.filter(d=>d.status===s).length}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(22, 38, 96, 0.6)', fontWeight: '600' }}>{s}</p>
          </div>
        ))}
      </div>
      {loading ? <Loader/> : (
        <div 
          className="hover-card animate-slide-up"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)',
            animationDelay: '240ms'
          }}
        >
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflowX: 'auto' }}>
            <table>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['Candidate', 'Post', 'Dept', 'Selected', 'Joining', 'Background', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{paginatedData.map(o=>(
                <tr key={o.id} style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.05)' }}>
                  <td>
                    <div className="font-medium" style={{ color: '#162660' }}>{o.name}</div>
                    <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{o.candidate_ref_id}</div>
                  </td>
                  <td style={{ color: '#162660' }}>{o.post}</td>
                  <td style={{ color: '#162660' }}>{o.dept_name_full||o.dept_name}</td>
                  <td style={{ color: '#162660' }}>{o.selection_date?.split('T')[0]||'—'}</td>
                  <td style={{ color: '#162660' }}>{o.joining_date?.split('T')[0]||'—'}</td>
                  <td><Badge text={o.police_verification}/></td>
                  <td><Badge text={o.status}/></td>
                  <td>
                    <button 
                      className="btn transition-all duration-300" 
                      style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        borderRadius: '8px',
                        background: 'rgba(104, 170, 232, 0.12)',
                        color: '#162660',
                        border: '1px solid rgba(104, 170, 232, 0.2)',
                        cursor: 'pointer'
                      }} 
                      onClick={()=>handleSelectCandidate(o)}
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
                        className="inline-block mr-1 align-middle"
                      >
                        <path d="M2.5 12C4.5 7.5 8 4.5 12 4.5s7.5 3 9.5 7.5c-2 4.5-5.5 7.5-9.5 7.5s-7.5-3-9.5-7.5z" />
                        <path 
                          d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" 
                          fill="currentColor" 
                          fillRule="evenodd" 
                          stroke="none" 
                        />
                      </svg>
                      View
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {selected && (
        <Modal title={`Onboarding: ${selected.name}`} onClose={()=>setSelected(null)} theme="light" wide>
          {msg && <div className={`px-4 py-3 rounded-xl text-sm mb-6 border ${msg.startsWith('Error') ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>{msg}</div>}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {[['Post',selected.post],['Department',selected.dept_name_full||selected.dept_name],['Candidate ID',selected.candidate_ref_id],['Joining Date',selected.joining_date?.split('T')[0]]].map(([k,v])=>(
              <div key={k}><p className="text-xs text-slate-400 mb-1">{k}</p><p className="text-sm font-medium text-slate-800">{v||'—'}</p></div>
            ))}
          </div>
          <h4 className="font-semibold text-slate-800 mb-3 mt-6">Onboarding Checklist <span className="text-xs text-slate-400 font-normal ml-1">(click to toggle)</span></h4>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
            <CheckRow label="Documents Submitted" val={selected.documents_submitted} id={selected.id} field="documents_submitted"/>
            <CheckRow label="Medical Fitness Cleared" val={selected.medical_cleared} id={selected.id} field="medical_cleared"/>
            <CheckRow label="Appointment Letter Sent" val={selected.appointment_letter_sent} id={selected.id} field="appointment_letter_sent"/>
            <CheckRow label="Service Book Created" val={selected.service_book_created} id={selected.id} field="service_book_created"/>
            <div className="flex items-center justify-between py-3 border-b border-slate-200 px-4">
              <span className="text-sm text-slate-700 font-medium">Police Verification</span>
              <select className="text-xs border border-slate-300 bg-white text-slate-800 rounded px-3 py-1.5 outline-none" value={selected.police_verification}
                onChange={e=>updateField(selected.id,'police_verification',e.target.value)}>
                {['Pending','In Progress','Cleared','Failed'].map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between py-3 px-4">
              <span className="text-sm text-slate-700 font-medium">Overall Status</span>
              <select className="text-xs border border-slate-300 bg-white text-slate-800 rounded px-3 py-1.5 outline-none" value={selected.status}
                onChange={e=>updateField(selected.id,'status',e.target.value)} disabled={selected.status === 'Completed'}>
                {['Pending Documents','Documents Verified','Medical Pending','Police Verification Pending','Joining Formalities','Cancelled', ...(selected.status === 'Completed' ? ['Completed'] : [])].map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex gap-4">
              {!selected.appointment_letter_sent ? (
                <button className="btn btn-success flex-1" onClick={()=>handleAction('appointment_letter_sent', 'Appointment Letter Generated Successfully!')}>Generate Appointment Letter</button>
              ) : (
                <button className="btn btn-success flex-1" onClick={() => setShowLetter(true)}>
                  <svg 
                    viewBox="0 0 24 24" 
                    width="16" 
                    height="16" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="inline mr-2 align-middle"
                  >
                    <path d="M2.5 12C4.5 7.5 8 4.5 12 4.5s7.5 3 9.5 7.5c-2 4.5-5.5 7.5-9.5 7.5s-7.5-3-9.5-7.5z" />
                    <path 
                      d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" 
                      fill="currentColor" 
                      fillRule="evenodd" 
                      stroke="none" 
                    />
                  </svg>
                  View Appointment Letter
                </button>
              )}
              <button className="btn btn-primary flex-1" onClick={()=>handleAction('service_book_created', 'Service Book Created Successfully!')}>Create Service Book</button>
            </div>
            {selected.status !== 'Completed' && (
              <button className="btn w-full font-bold shadow-md hover:-translate-y-0.5 transition-all" style={{ background:'#162660', color:'#fff' }} onClick={async () => {
                try {
                  await updateField(selected.id, 'status', 'Completed');
                  setMsg('Candidate moved to Employee Master successfully!');
                } catch(e) {
                  setMsg('Error: ' + e.message);
                }
              }}>Move to Employee Master</button>
            )}
          </div>


        </Modal>
      )}

      {showLetter && selected && (
        <Modal title="Appointment Letter Preview" onClose={()=>setShowLetter(false)} theme="light" wide>
          <div className="bg-white text-slate-800 p-8 rounded-lg shadow-inner font-serif h-[60vh] overflow-y-auto">
            <div className="text-center border-b-2 border-slate-300 pb-4 mb-6">
              <h2 className="text-xl font-bold uppercase">JadeQuest </h2>
              <h3 className="text-md font-semibold text-slate-600">{selected.dept_name_full || selected.dept_name}</h3>
              <p className="text-sm mt-2">Ref No: JQ/{selected.dept_name?.substring(0,3).toUpperCase()}/2026/{(Math.random()*10000).toFixed(0)}</p>
              <p className="text-sm">Date: {new Date().toLocaleDateString()}</p>
            </div>
            
            <div className="mb-6">
              <p>To,</p>
              <p className="font-bold">{selected.name}</p>
              <p>Candidate ID: {selected.candidate_ref_id}</p>
            </div>
            
            <div className="mb-6">
              <p className="font-bold underline mb-4">Subject: Offer of Appointment for the post of {selected.post}</p>
              <p className="mb-4">Dear {selected.name},</p>
              <p className="mb-4 text-justify">
                With reference to your application and the subsequent selection process, we are pleased to inform you that you have been selected for the post of <strong>{selected.post}</strong> in the <strong>{selected.dept_name_full || selected.dept_name}</strong>.
              </p>
              <p className="mb-4 text-justify">
                Your appointment will be subject to successful police verification, medical clearance, and verification of original documents. You are requested to report for joining formalities on or before <strong>{selected.joining_date?.split('T')[0] || 'the specified joining date'}</strong>.
              </p>
              <p className="mb-8">
                Please bring all relevant original documents, including educational certificates, identity proof, and 4 passport-size photographs at the time of joining.
              </p>
            </div>
            
            <div className="flex justify-between items-end mt-12 pt-8">
              <div>
                <p>Date: ____________</p>
                <p>Place: Ahmedabad</p>
              </div>
              <div className="text-center">
                <p className="mb-4">(Digital Signature)</p>
                <p className="font-bold">Authorized Signatory</p>
                <p>Department of Human Resources</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <button className="btn btn-secondary flex-1" onClick={()=>setShowLetter(false)}>Close Preview</button>
            <button className="btn btn-primary flex-1" onClick={handleDownloadPDF}>Download PDF</button>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal title="Add Candidate to Onboarding" onClose={()=>setShowAdd(false)} theme="light">
          {msg && <div className={`px-4 py-3 rounded-xl text-sm mb-6 border ${msg.startsWith('Error') ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>{msg}</div>}
          <div className="grid grid-cols-2 gap-4">
            {[['name','Full Name'],['candidate_ref_id','Candidate Ref ID'],['post','Post Applied']].map(([k,l])=>(
              <div key={k}><label className="text-xs text-slate-400 block mb-1">{l}</label><input className="input" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>
            ))}
            <div><label className="text-xs text-slate-400 block mb-1">Department</label>
              <select className="input" value={form.dept_id} onChange={e=>setForm({...form,dept_id:e.target.value})}>
                <option value="">Select</option>{depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-400 block mb-1">Selection Date</label><input type="date" className="input" value={form.selection_date} onChange={e=>setForm({...form,selection_date:e.target.value})}/></div>
            <div><label className="text-xs text-slate-400 block mb-1">Joining Date</label><input type="date" className="input" value={form.joining_date} onChange={e=>setForm({...form,joining_date:e.target.value})}/></div>
          </div>
          <button className="btn btn-primary w-full mt-6" onClick={addCandidate}>Add to Pipeline</button>
        </Modal>
      )}
    </Layout>
  );
}