import React, { useState } from 'react';
import {
  Building2,
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Search,
  Plus,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  Settings,
  Database,
  RefreshCw,
} from 'lucide-react';
import { Institution } from '../types';
import { getDefaultSheetTabName } from '../utils';

interface InstitutionsListProps {
  institutions: Institution[];
  onSelectInstitution: (institution: Institution) => void;
  onOpenCreateModal?: () => void;
  onOpenSheetConfig: (institution: Institution) => void;
  onTestFormLink: (token: string) => void;
  dbError?: string | null;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const InstitutionsList: React.FC<InstitutionsListProps> = ({
  institutions,
  onSelectInstitution,
  onOpenCreateModal,
  onOpenSheetConfig,
  onTestFormLink,
  dbError,
  onRefresh,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const filtered = institutions.filter(
    (inst) =>
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.description && inst.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalResponses = institutions.reduce((acc, i) => acc + (i.totalSubmissions || 0), 0);
  const totalPending = institutions.reduce((acc, i) => acc + (i.pendingCount || 0), 0);
  const totalApproved = institutions.reduce((acc, i) => acc + (i.approvedCount || 0), 0);
  const totalRejected = institutions.reduce((acc, i) => acc + (i.rejectedCount || 0), 0);

  const handleCopyLink = (e: React.MouseEvent, token: string) => {
    e.stopPropagation();
    const publicUrl = `${window.location.origin}/?token=${token}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div id="institutions-dashboard-view" className="space-y-6">
      {/* Metric Summaries in Professional Polish cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Institutions
            </span>
            <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{institutions.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Isolated spreadsheet routes</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Responses
            </span>
            <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{totalResponses}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Across all portals</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-yellow-700 uppercase tracking-wider">
              Pending Review
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
          </div>
          <p className="text-2xl font-bold text-yellow-700 mt-2">{totalPending}</p>
          <span className="text-[11px] text-yellow-600/80 mt-0.5 block">Awaiting administrator action</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Approved Records
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{totalApproved}</p>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block">Synchronized in Google Sheets</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="search-institutions-input"
            type="text"
            placeholder="Search institutions by name, code or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-md text-sm w-full focus:ring-2 focus:ring-blue-500 transition-all focus:bg-white"
          />
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2 shrink-0">
          <span>Showing <strong>{filtered.length}</strong> of {institutions.length} institutions</span>
        </div>
      </div>

      {/* Institutions Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((inst) => {
          const publicUrl = `${window.location.origin}/?token=${inst.secureToken}`;
          const isCopied = copiedToken === inst.secureToken;
          const sheetUrl = inst.spreadsheetId
            ? `https://docs.google.com/spreadsheets/d/${inst.spreadsheetId}/edit`
            : null;

          return (
            <div
              key={inst.id}
              id={`inst-card-${inst.id}`}
              onClick={() => onSelectInstitution(inst)}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-xs transition-all duration-150 cursor-pointer flex flex-col justify-between group hover:shadow-sm"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {inst.code.slice(0, 2)}
                    </div>
                    <div>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {inst.code}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSheetConfig(inst);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    title="Configure Google Sheet Sync & Webhook"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1">
                  {inst.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px]">
                  {inst.description || 'Dedicated institutional Google Sheet routing & onboarding portal'}
                </p>

                {/* Secure Access Point Box */}
                <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      Unique Form Link
                    </span>
                    <span className="text-[10px] text-blue-600/70 font-medium">Zero-login</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={publicUrl}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-[11px] font-mono text-blue-700 bg-white border border-blue-200 px-2 py-1 rounded truncate focus:outline-hidden"
                    />

                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(e, inst.secureToken)}
                      className={`p-1.5 rounded-md border text-xs font-medium transition-colors shrink-0 ${
                        isCopied
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white border-blue-200 hover:bg-blue-100 text-blue-700'
                      }`}
                      title="Copy unique link to clipboard"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTestFormLink(inst.secureToken);
                      }}
                      className="p-1.5 rounded-md bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 transition-colors shrink-0"
                      title="Test public submission form"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Google Sheet Link / Status */}
                <div className="mt-3 flex items-center justify-between text-xs py-1.5 px-2.5 bg-slate-50 rounded-md border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-medium truncate max-w-[140px]">
                      {inst.spreadsheetId
                        ? `Tab: ${inst.sheetTabName || getDefaultSheetTabName(inst.name)}`
                        : `Tab: ${inst.sheetTabName || getDefaultSheetTabName(inst.name)} (Local)`}
                    </span>
                  </div>

                  {sheetUrl ? (
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>Open Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSheetConfig(inst);
                      }}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Connect Sheet
                    </button>
                  )}
                </div>
              </div>

              {/* Card Footer: Counts & Action */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900">
                    {inst.totalSubmissions || 0}
                  </span>
                  <span className="text-xs text-slate-500">rows</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
                    {inst.pendingCount || 0} pending
                  </span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    {inst.approvedCount || 0} approved
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Sheet View</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <Database className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">
              {searchTerm ? 'No matching institutions' : 'PostgreSQL Institutions Database'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              {searchTerm
                ? `No institution matches "${searchTerm}". Try another search term.`
                : dbError || 'Existing institutions are loaded directly from your PostgreSQL institutions table. New institution creation is currently on hold.'}
            </p>
            {onRefresh && !searchTerm && (
              <button
                type="button"
                onClick={onRefresh}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh PostgreSQL Data</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
