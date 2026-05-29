import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout/Layout';
import { documentAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { Upload, FileText, CheckCircle, AlertCircle, X, Trash2 } from 'lucide-react';
import Badge from '../components/common/Badge';

export default function DocumentUpload() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const docTypes = [
    'Aadhar', 'PAN', 'Passport', 'Passbook', 'CancelCheque', 
    'BirthCertificate', 'EducationCertificate', 'Marksheet', 'ExperienceCertificate'
  ];

  useEffect(() => {
    if (user?.emp_id) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = () => {
    setLoading(true);
    documentAPI.list(user.emp_id)
      .then(res => {
        setDocuments(res.data.data);
      })
      .catch(err => {
        console.error('Failed to load documents:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !docType) {
      alert('Please select a document type and file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('owner_id', user.emp_id);
    formData.append('doc_type', docType);

    setUploading(true);
    try {
      await documentAPI.upload(formData);
      setFile(null);
      setDocType('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await documentAPI.delete(id);
      loadDocuments();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete document.');
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'Processed') return <CheckCircle className="text-green-500" size={18} />;
    if (status === 'Failed') return <AlertCircle className="text-red-500" size={18} />;
    return <AlertCircle className="text-yellow-500" size={18} />;
  };

  return (
    <Layout title="My Documents" theme="light">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-slide-up">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Upload size={20} className="text-indigo-500" />
              Upload New Document
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Document Type</label>
                <select 
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                >
                  <option value="">Select Document Type</option>
                  {docTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div 
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${file ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange} 
                  accept="image/jpeg,image/png,application/pdf"
                />
                
                {file ? (
                  <div className="text-center">
                    <FileText size={32} className="mx-auto text-indigo-500 mb-2" />
                    <p className="text-sm font-medium text-slate-700 break-all">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium flex items-center justify-center gap-1 mx-auto"
                    >
                      <X size={14} /> Remove File
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Upload size={20} className="text-slate-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Click or drag file to upload</p>
                    <p className="text-xs text-slate-500 mt-1">Supports PDF, JPG, PNG up to 10MB</p>
                  </div>
                )}
              </div>

              <button 
                onClick={handleUpload}
                disabled={!file || !docType || uploading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg font-medium transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">My Uploaded Documents</h2>
            
            {loading ? (
              <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : documents.length === 0 ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                <FileText size={48} className="text-slate-200 mb-3" />
                <p>No documents uploaded yet.</p>
                <p className="text-sm">Upload your onboarding documents using the form.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-100 hover:border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                        <FileText size={20} className="text-slate-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{doc.doc_type}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Uploaded on {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(doc.ocr_status)}
                        <span className={`text-sm font-medium ${
                          doc.ocr_status === 'Processed' ? 'text-green-600' : 
                          doc.ocr_status === 'Failed' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {doc.ocr_status}
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Document"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
