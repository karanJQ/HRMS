import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const [jumpPage, setJumpPage] = useState(currentPage);

  useEffect(() => {
    setJumpPage(currentPage);
  }, [currentPage]);

  if (totalPages <= 1) return null;

  const handleJump = (e) => {
    if (e.key === 'Enter') {
      let p = parseInt(jumpPage);
      if (isNaN(p) || p < 1) p = 1;
      if (p > totalPages) p = totalPages;
      onPageChange(p);
      setJumpPage(p);
    }
  };

  const handleBlur = () => {
    let p = parseInt(jumpPage);
    if (isNaN(p) || p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    onPageChange(p);
    setJumpPage(p);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white border-t border-slate-100 rounded-b-xl mt-4 gap-3 sm:gap-0">
      <div className="flex items-center text-sm text-slate-500">
        Page <span className="font-semibold text-slate-700 mx-1">{currentPage}</span> of <span className="font-semibold text-slate-700 mx-1">{totalPages}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          title="First Page"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          title="Previous Page"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-2 mx-1">
          <span className="text-xs text-slate-400">Go to:</span>
          <input 
            type="number" 
            min={1} 
            max={totalPages}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            onKeyDown={handleJump}
            onBlur={handleBlur}
            className="w-12 text-center text-sm border border-slate-200 rounded-lg py-1 focus:outline-none focus:border-blue-500 text-slate-800 bg-white"
            title="Press Enter to jump"
          />
        </div>

        <button
          title="Next Page"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={16} />
        </button>
        <button
          title="Last Page"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
