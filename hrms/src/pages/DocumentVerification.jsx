import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { empAPI, documentAPI } from '../api/endpoints';
import { Search, FileText, CheckCircle, AlertCircle, Play, Eye } from 'lucide-react';
import Badge from '../components/common/Badge';

export default function DocumentVerification() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    setLoading(true);
    empAPI.list()
      .then(res => setEmployees(res.data.data?.employees || []))
      .catch(err => console.error('Failed to load employees:', err))
      .finally(() => setLoading(false));
  };

  const handleSelectEmp = (emp) => {
    setSelectedEmp(emp);
    setLoadingDocs(true);
    setViewDoc(null);
    documentAPI.list(emp.emp_id)
      .then(res => setDocuments(res.data.data))
      .catch(err => console.error('Failed to load documents:', err))
      .finally(() => setLoadingDocs(false));
  };

  const handleRunOCR = async (doc) => {
    setProcessingId(doc.id);
    try {
      const res = await documentAPI.performOCR(doc.id);
      // Update document in list
      setDocuments(docs => docs.map(d => d.id === doc.id ? res.data.data : d));
      alert('OCR Processed successfully!');
    } catch (err) {
      console.error('OCR failed:', err);
      alert('OCR Processing failed. Check console for details.');
      // Refresh to get Failed status
      documentAPI.list(selectedEmp.emp_id).then(res => setDocuments(res.data.data));
    } finally {
      setProcessingId(null);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.first_name.toLowerCase().includes(search.toLowerCase()) || 
    emp.last_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.emp_id.toLowerCase().includes(search.toLowerCase())
  );

  const ExtractedDataEditor = ({ doc }) => {
    const dataStr = doc.extracted_data;
    if (!dataStr) return null;
    
    let parsed = {};
    try {
      parsed = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
    } catch (e) {
      return <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">Failed to parse OCR data</div>;
    }
    
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState(parsed.data || {});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      setFormData(parsed.data || {});
    }, [doc.extracted_data]);

    const handleChange = (key, val) => {
      setFormData(prev => ({ ...prev, [key]: val }));
    };

    const handleSave = async () => {
      setSaving(true);
      try {
        const res = await documentAPI.updateData(doc.id, { data: formData });
        setDocuments(docs => docs.map(d => d.id === doc.id ? res.data.data : d));
        setEditMode(false);
      } catch (err) {
        alert('Failed to update data: ' + err.message);
      } finally {
        setSaving(false);
      }
    };
    
    const entries = Object.entries(formData).map(([key, val]) => {
      if (typeof val === 'object' && val !== null) {
        return [key, JSON.stringify(val)];
      }
      return [key, val];
    });

    return (
      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
          <h4 className="font-semibold text-slate-700">Extracted Information</h4>
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              Edit Data
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditMode(false); setFormData(parsed.data || {}); }} className="text-xs font-medium text-slate-500 hover:text-slate-700">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="text-xs font-medium text-green-600 hover:text-green-800">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          {entries.length === 0 ? (
            <div className="col-span-2 text-slate-400">No data available</div>
          ) : (
            entries.map(([key, val]) => (
              <div key={key}>
                <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">{key.replace(/_/g, ' ')}</span>
                {editMode ? (
                  <input 
                    type="text" 
                    value={val || ''} 
                    onChange={e => handleChange(key, e.target.value)}
                    className="w-full p-1.5 text-sm text-slate-900 bg-white border border-indigo-200 rounded focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <span className="font-medium text-slate-800 block truncate" title={String(val)}>{String(val) || '—'}</span>
                )}
              </div>
            ))
          )}
        </div>
        
        {parsed.rawText && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <details>
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 font-medium">View Raw OCR Text</summary>
              <pre className="mt-2 p-2 bg-slate-100 rounded text-[10px] text-slate-600 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                {parsed.rawText}
              </pre>
            </details>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout title="Document Verification" theme="light">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)]">
        {/* Employee List Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden animate-slide-up">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 mb-3">Employees</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              <div className="space-y-1">
                {filteredEmployees.map(emp => (
                  <div 
                    key={emp.id}
                    onClick={() => handleSelectEmp(emp)}
                    className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all ${selectedEmp?.id === emp.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 text-sm truncate">{emp.first_name} {emp.last_name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{emp.emp_id}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Document Details area */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col animate-slide-up" style={{ animationDelay: '100ms' }}>
          {selectedEmp ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">{selectedEmp.first_name} {selectedEmp.last_name}</h2>
                  <p className="text-sm text-slate-500">Documents Verification</p>
                </div>
                <Badge text={selectedEmp.status} />
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {loadingDocs ? (
                  <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
                ) : documents.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 flex flex-col items-center">
                    <FileText size={48} className="text-slate-200 mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">No Documents Found</h3>
                    <p className="text-sm mt-1">This employee hasn't uploaded any documents yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {documents.map(doc => (
                      <div key={doc.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-white p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                              <FileText size={24} className="text-indigo-500" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg">{doc.doc_type}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-500">Uploaded {new Date(doc.created_at).toLocaleDateString()}</span>
                                <div className="flex items-center gap-1">
                                  {doc.ocr_status === 'Processed' ? <CheckCircle className="text-green-500" size={14} /> : 
                                   doc.ocr_status === 'Failed' ? <AlertCircle className="text-red-500" size={14} /> : 
                                   <AlertCircle className="text-yellow-500" size={14} />}
                                  <span className={`text-xs font-medium ${
                                    doc.ocr_status === 'Processed' ? 'text-green-600' : 
                                    doc.ocr_status === 'Failed' ? 'text-red-600' : 'text-yellow-600'
                                  }`}>{doc.ocr_status}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 w-full md:w-auto">
                            <button 
                              onClick={() => setViewDoc(viewDoc === doc.id ? null : doc.id)}
                              className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-1.5 flex-1 md:flex-none justify-center"
                            >
                              <Eye size={16} /> {viewDoc === doc.id ? 'Hide Data' : 'View Data'}
                            </button>
                            {['Aadhar', 'PAN', 'Passport', 'CancelCheque', 'Passbook', 'BirthCertificate'].includes(doc.doc_type) && (
                              <button 
                                onClick={() => handleRunOCR(doc)}
                                disabled={processingId === doc.id}
                                className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-1.5 flex-1 md:flex-none justify-center"
                              >
                                {processingId === doc.id ? (
                                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Processing</>
                                ) : (
                                  <><Play size={16} /> Run OCR</>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {viewDoc === doc.id && (
                          <div className="border-t border-slate-200 bg-slate-50 p-5 animate-slide-up">
                            {doc.extracted_data ? (
                              <ExtractedDataEditor doc={doc} />
                            ) : (
                              <div className="text-center py-6 text-slate-500 text-sm">
                                No data extracted yet. Click "Run OCR" to process this document.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <FileText size={64} className="text-slate-200 mb-4" />
              <h3 className="text-xl font-medium text-slate-600 mb-2">Select an Employee</h3>
              <p className="max-w-md">Choose an employee from the list on the left to view their uploaded documents and perform OCR verification.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
