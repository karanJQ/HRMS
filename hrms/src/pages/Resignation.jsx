import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { resignationAPI } from '../api/endpoints';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import { LogOut, Calendar, CheckCircle, XCircle, Info, User, Check, X } from 'lucide-react';

export default function Resignation() {
  const { user } = useAuth();
  const isHR = ['super_admin', 'hr_manager', 'hr_staff'].includes(user?.role);
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  
  // Employee submission state
  const [showApply, setShowApply] = useState(false);
  const [applyForm, setApplyForm] = useState({ reason: '', desired_last_date: '' });
  
  // HR processing state
  const [selectedResignation, setSelectedResignation] = useState(null);
  const [leavesTaken, setLeavesTaken] = useState(0);
  const [processingState, setProcessingState] = useState({ status: '', actual_last_date: '', notice_period_days: 60, noc_cleared: false, hr_remarks: '' });
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await resignationAPI.list();
      setData(res.data?.data || []);
    } catch (e) {
      setMsg('Failed to load resignations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!applyForm.reason || !applyForm.desired_last_date) return setMsg('Please fill all fields');
    try {
      await resignationAPI.create(applyForm);
      setMsg('Resignation submitted successfully.');
      setShowApply(false);
      setApplyForm({ reason: '', desired_last_date: '' });
      loadData();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Error submitting resignation');
    }
  };

  const openProcessModal = async (r) => {
    setSelectedResignation(r);
    setProcessingState({
      status: r.status,
      actual_last_date: r.actual_last_date ? r.actual_last_date.split('T')[0] : r.desired_last_date.split('T')[0],
      notice_period_days: r.notice_period_days || 60,
      noc_cleared: r.noc_cleared || false,
      hr_remarks: r.hr_remarks || ''
    });
    try {
      const lr = await resignationAPI.getLeaves(r.id);
      setLeavesTaken(lr.data?.data?.leaves_taken || 0);
    } catch (e) {
      setLeavesTaken(0);
    }
  };

  const handleProcess = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await resignationAPI.update(selectedResignation.id, processingState);
      setMsg('Resignation updated successfully.');
      setSelectedResignation(null);
      loadData();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Error updating resignation');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout title="Resignations" theme="light">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#162660' }}>Resignations</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Manage employee exits and notice periods.</p>
        </div>
        {!isHR && (
          <button onClick={() => setShowApply(true)} className="btn btn-primary" style={{ background: '#162660', color: '#fff' }}>
            Submit Resignation
          </button>
        )}
      </div>

      {msg && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">{msg}</div>}

      {loading ? <Loader /> : (
        <div 
          className="hover-card animate-slide-up"
          style={{
            background: '#fff',
            border: '1px solid rgba(22, 38, 96, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 24px rgba(22, 38, 96, 0.04)'
          }}
        >
          <div className="table-wrap" style={{ border: '1px solid rgba(22, 38, 96, 0.1)', borderRadius: '12px', overflowX: 'auto' }}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.1)', background: 'rgba(22, 38, 96, 0.03)' }}>
                  {['Employee', 'Submission Date', 'Desired Last Date', 'Status', 'Action'].map(h => (
                    <th key={h} className="p-4" style={{ color: '#162660', fontWeight: 600, fontSize: '13px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(22, 38, 96, 0.05)' }}>
                    <td className="p-4">
                      <div className="font-semibold" style={{ color: '#162660' }}>{r.first_name} {r.last_name}</div>
                      <div className="text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>{r.dept_name || 'N/A'}</div>
                    </td>
                    <td className="p-4" style={{ color: '#162660' }}>{new Date(r.submission_date).toLocaleDateString('en-GB')}</td>
                    <td className="p-4" style={{ color: '#162660' }}>{new Date(r.desired_last_date).toLocaleDateString('en-GB')}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        r.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        r.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {isHR ? (
                        <button onClick={() => openProcessModal(r)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold px-3 py-1.5 bg-blue-50 rounded-lg transition-colors">Process</button>
                      ) : (
                        <button onClick={() => openProcessModal(r)} className="text-slate-600 hover:text-slate-800 text-xs font-semibold px-3 py-1.5 bg-slate-100 rounded-lg transition-colors">View Details</button>
                      )}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center" style={{ color: 'rgba(22, 38, 96, 0.5)' }}>No resignation records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Resignation Modal */}
      {showApply && (
        <Modal title="Submit Resignation" onClose={() => setShowApply(false)} theme="light">
          <form onSubmit={handleApply} className="p-6 space-y-5">
            <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm border border-amber-100 flex gap-3">
              <Info size={20} className="shrink-0" />
              <p>Please note that standard notice period policies apply. Your actual last working date will be determined by HR upon acceptance.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#162660' }}>Desired Last Working Date *</label>
              <input type="date" className="input bg-white border border-slate-200" style={{ color: '#162660' }} required value={applyForm.desired_last_date} onChange={e => setApplyForm({...applyForm, desired_last_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#162660' }}>Reason for Resignation *</label>
              <textarea className="input h-24 resize-none bg-white border border-slate-200" style={{ color: '#162660' }} required value={applyForm.reason} onChange={e => setApplyForm({...applyForm, reason: e.target.value})} placeholder="Please briefly explain your reason for resigning..."></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowApply(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button type="submit" className="btn btn-primary px-5 py-2.5" style={{ background: '#162660', color: '#fff' }}>Submit Resignation</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Process/View Modal */}
      {selectedResignation && (
        <Modal title={isHR ? "Process Resignation" : "Resignation Details"} onClose={() => setSelectedResignation(null)} theme="light">
          <form onSubmit={handleProcess} className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="block text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Employee</span>
                <span className="font-semibold" style={{ color: '#162660' }}>{selectedResignation.first_name} {selectedResignation.last_name}</span>
              </div>
              <div>
                <span className="block text-xs" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Submission Date</span>
                <span className="font-semibold" style={{ color: '#162660' }}>{new Date(selectedResignation.submission_date).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-xs mb-1" style={{ color: 'rgba(22, 38, 96, 0.6)' }}>Reason</span>
                <p className="bg-white p-2 border border-slate-100 rounded-lg" style={{ color: '#162660' }}>{selectedResignation.reason}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#162660' }}>Notice Period (Days)</label>
                <input type="number" className="input bg-white border border-slate-200" style={{ color: '#162660' }} disabled={!isHR} value={processingState.notice_period_days} onChange={e => setProcessingState({...processingState, notice_period_days: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#162660' }}>Status</label>
                <select className="input bg-white border border-slate-200" style={{ color: '#162660' }} disabled={!isHR} value={processingState.status} onChange={e => setProcessingState({...processingState, status: e.target.value})}>
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#162660' }}>Actual Last Working Date</label>
                <input type="date" className="input bg-white border border-slate-200" style={{ color: '#162660' }} disabled={!isHR} value={processingState.actual_last_date} onChange={e => setProcessingState({...processingState, actual_last_date: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#162660' }}>Leaves Taken in Notice</label>
                <div className="input bg-slate-50 flex items-center font-bold text-red-600 border border-slate-200">{leavesTaken} days</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="noc" disabled={!isHR} checked={processingState.noc_cleared} onChange={e => setProcessingState({...processingState, noc_cleared: e.target.checked})} className="w-4 h-4 rounded text-blue-600" />
              <label htmlFor="noc" className="text-sm font-semibold cursor-pointer" style={{ color: '#162660' }}>NOC Cleared (No Dues)</label>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#162660' }}>HR Remarks</label>
              <textarea className="input h-20 resize-none bg-white border border-slate-200" style={{ color: '#162660' }} disabled={!isHR} value={processingState.hr_remarks} onChange={e => setProcessingState({...processingState, hr_remarks: e.target.value})} placeholder="Any remarks..."></textarea>
            </div>

            {isHR && (
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setSelectedResignation(null)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={processing} className="btn btn-primary px-5 py-2.5" style={{ background: '#162660', color: '#fff' }}>{processing ? 'Saving...' : 'Save Changes'}</button>
              </div>
            )}
          </form>
        </Modal>
      )}
    </Layout>
  );
}
