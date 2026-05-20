import React from 'react';
import { Bell, Search } from 'lucide-react';
export default function Header({ title }) {
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <h1 className="page-title">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
          <Search size={16} className="text-gray-400" />
          <input placeholder="Search..." className="bg-transparent text-sm outline-none w-40 text-gray-600" />
        </div>
        <button className="relative p-2 hover:bg-gray-100 rounded-lg">
          <Bell size={18} className="text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </div>
  );
}
