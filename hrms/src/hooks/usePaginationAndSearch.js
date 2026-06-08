import { useState, useMemo } from 'react';

export function usePaginationAndSearch(data = [], searchKeys = [], itemsPerPage = 10) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const lowerQ = searchQuery.toLowerCase();
    return data.filter(item => 
      searchKeys.some(key => {
        const val = item[key];
        return val && String(val).toLowerCase().includes(lowerQ);
      })
    );
  }, [data, searchQuery, searchKeys]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset to page 1 when search changes or data length changes significantly
  useMemo(() => { 
    setCurrentPage(1); 
  }, [searchQuery]);

  return {
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    paginatedData, totalPages,
    totalItems: filteredData.length
  };
}
