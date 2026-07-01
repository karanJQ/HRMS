import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import Loader from '../components/common/Loader';
import { ShieldAlert, AlertTriangle, Search } from 'lucide-react';
import { reportsAPI, empAPI } from '../api/endpoints';
import { usePaginationAndSearch } from '../hooks/usePaginationAndSearch';
import Pagination from '../components/common/Pagination';

export default function Probation() {
  const [probationAlerts, setProbationAlerts] = useState([]);
  const [probationModal, setProbationModal] = useState(null); // { emp_id, action, name }
  const [probationNotes, setProbationNotes] = useState('');
  const [extendDays, setExtendDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const {
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    paginatedData, totalPages, totalItems
  } = usePaginationAndSearch(probationAlerts, ['first_name', 'last_name', 'emp_id', 'dept_name', 'designation_name'], 10);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await reportsAPI.probationAlerts(); // No recentOnly flag = all pending
      setProbationAlerts(res.data?.data || []);
    } catch (e) {
      setMsg('Error loading probations: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const submitProbationAction = async () => {
    if (!probationModal) return;
    try {
      setLoading(true);
      await empAPI.probationAction(probationModal.emp_id, {
        action: probationModal.action,
        days: extendDays,
        notes: probationNotes
      });
      setMsg(`Probation ${probationModal.action}ed successfully.`);
      setProbationModal(null);
      setProbationNotes('');
      await loadAlerts();
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 5000);
    }
  };

  if (loading && probationAlerts.length === 0) return <Layout title="Probation Management" theme="light" bg="#F8F8FF"><Loader /></Layout>;

  return (
    <Layout title="Probation Management" theme="light" bg="#F8F8FF">
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${msg.startsWith('Error')
          ? 'bg-red-50 text-red-800 border border-red-200'
          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          {msg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShieldAlert size={24} className="text-[#162660]" />
            <h2 className="text-xl font-bold text-[#162660]">Active Probation Periods ({totalItems})</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search probation alerts..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-64 text-slate-800 bg-white"
            />
          </div>
        </div>

        {probationAlerts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400">No employees currently on probation.</p>
          </div>
        ) : (
          <>
          <div className="table-wrap border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-3 text-left font-semibold text-gray-500">Employee</th>
                  <th className="p-3 text-left font-semibold text-gray-500">Department</th>
                  <th className="p-3 text-left font-semibold text-gray-500">Designation</th>
                  <th className="p-3 text-left font-semibold text-gray-500">End Date</th>
                  <th className="p-3 text-left font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map(p => {
                  const isOverdue = new Date(p.probation_end_date) < new Date();
                  const isEndingSoon = new Date(p.probation_end_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                  return (
                    <tr key={p.emp_id} className={`border-b border-gray-50 transition-colors ${isOverdue ? 'bg-red-50/50' : isEndingSoon ? 'bg-amber-50/50' : 'hover:bg-gray-50'}`}>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          {p.first_name} {p.last_name}
                          {p.employment_type === 'Internship' && (
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                              Intern
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{p.emp_id}</div>
                      </td>
                      <td className="p-3 text-slate-600">{p.dept_name}</td>
                      <td className="p-3 text-slate-600">{p.designation_name || 'N/A'}</td>
                      <td className="p-3">
                        <div className={`font-semibold ${isOverdue ? 'text-red-600' : isEndingSoon ? 'text-amber-600' : 'text-slate-700'}`}>
                          {new Date(p.probation_end_date).toLocaleDateString()}
                        </div>
                        {isOverdue && <div className="text-[10px] uppercase font-bold text-red-500 mt-0.5">Overdue</div>}
                        {!isOverdue && isEndingSoon && <div className="text-[10px] uppercase font-bold text-amber-500 mt-0.5">Ending Soon</div>}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button onClick={() => setProbationModal({ emp_id: p.emp_id, name: p.first_name, action: 'accept' })} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold hover:bg-emerald-200 transition-colors">Accept</button>
                          <button onClick={() => setProbationModal({ emp_id: p.emp_id, name: p.first_name, action: 'extend' })} className="px-3 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold hover:bg-amber-200 transition-colors">Extend</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>

      {/* Probation Action Modal */}
      {probationModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-slate-800 capitalize">{probationModal.action} Probation</h3>
              <button onClick={() => setProbationModal(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-600">You are about to <strong className="capitalize">{probationModal.action}</strong> the probation for <strong>{probationModal.name}</strong>.</p>
              
              {probationModal.action === 'extend' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Extension Days</label>
                  <input type="number" className="input w-full p-2 border border-slate-200 rounded-lg" value={extendDays} onChange={e => setExtendDays(e.target.value)} />
                </div>
              )}
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Review Notes / Reason (Required)</label>
                <textarea className="input w-full h-24 resize-none p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" value={probationNotes} onChange={e => setProbationNotes(e.target.value)} placeholder={`Enter reason for ${probationModal.action}...`} />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t">
              <button onClick={() => setProbationModal(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button 
                onClick={submitProbationAction} 
                disabled={!probationNotes.trim()}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${!probationNotes.trim() ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}




