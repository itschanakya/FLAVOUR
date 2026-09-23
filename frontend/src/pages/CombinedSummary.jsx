import React, { useState } from 'react';
import SummaryWeeklyMonthly from './SummaryWeeklyMonthly';
import SchoolAnnualSummary from './SchoolAnnualSummary';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Layers, Calendar, Printer } from 'lucide-react';

export default function CombinedSummary() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('WEEKLY_MONTHLY');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 w-full">
      {/* Universal Header for Summaries */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Consolidated Summary Reports
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Access Weekly, Monthly, and Annual summaries in one place
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Print Current Report</span>
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-3 border-b border-slate-200 pb-2 print:hidden">
        <button
          onClick={() => setActiveTab('WEEKLY_MONTHLY')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${
            activeTab === 'WEEKLY_MONTHLY'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Weekly / Monthly Breakdown
        </button>
        <button
          onClick={() => setActiveTab('ANNUAL')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${
            activeTab === 'ANNUAL'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          School Annual Summary
        </button>
      </div>

      {/* Render Active Summary View */}
      <div className="mt-4">
        {activeTab === 'WEEKLY_MONTHLY' ? (
          <div className="report-container">
            {/* The inner components might have their own padding which could double up. We could optionally pass a prop if we own them, but they work as is. */}
            <SummaryWeeklyMonthly hideHeader={true} />
          </div>
        ) : (
          <div className="report-container">
            <SchoolAnnualSummary hideHeader={true} />
          </div>
        )}
      </div>
    </div>
  );
}
