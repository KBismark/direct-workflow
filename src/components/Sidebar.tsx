import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  FileSpreadsheet,
  Code2,
  RefreshCw,
  Plus,
  Layers,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Search,
  X,
  Loader2,
  Database,
} from 'lucide-react';
import { Institution } from '../types';
import { apiClient } from '../api/client';

interface SidebarProps {
  institutions: Institution[];
  totalInstitutionsCount?: number;
  selectedInstitution: Institution | null;
  onSelectInstitution: (institution: Institution) => void;
  onNavigateHome: () => void;
  onOpenCreateModal?: () => void;
  onOpenApiDocs: () => void;
  onResetDemo: () => void;
  isResetting?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  institutions,
  totalInstitutionsCount,
  selectedInstitution,
  onSelectInstitution,
  onNavigateHome,
  onOpenCreateModal,
  onOpenApiDocs,
  onResetDemo,
  isResetting,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dbResults, setDbResults] = useState<Institution[]>([]);
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search DB when user enters query
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setDbResults([]);
      setIsSearchingDb(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setIsSearchingDb(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.getInstitutions({
          search: trimmed,
          limit: 8,
        });
        setDbResults(res.data || []);
      } catch (err) {
        console.warn('Sidebar DB search error:', err);
      } finally {
        setIsSearchingDb(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  // Existing institutions matching search
  const lowerQuery = searchQuery.trim().toLowerCase();
  const existingMatches = lowerQuery
    ? institutions.filter(
        (inst) =>
          inst.name.toLowerCase().includes(lowerQuery) ||
          inst.code.toLowerCase().includes(lowerQuery)
      )
    : [];

  // Database results not already in existingMatches
  const existingIds = new Set(existingMatches.map((i) => String(i.id)));
  const additionalDbResults = dbResults.filter((inst) => !existingIds.has(String(inst.id)));

  // When not searching, display top 7-8 institutions (default limit: 8)
  const defaultList = institutions.slice(0, 8);
  // Ensure currently selected institution is visible if not in the top 8
  const selectedNotInTop8 =
    selectedInstitution && !defaultList.some((i) => String(i.id) === String(selectedInstitution.id))
      ? selectedInstitution
      : null;

  const totalCount = totalInstitutionsCount ?? institutions.length;

  return (
    <aside
      id="app-sidebar"
      className="w-64 bg-slate-900 flex flex-col border-r border-slate-800 text-slate-300 shrink-0 select-none"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-xs group-hover:bg-blue-500 transition-colors">
            D
          </div>
          <div>
            <span className="text-lg font-semibold tracking-tight text-white block leading-tight">
              DataRouter
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Institutional Sheet Gateway
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 py-4 overflow-y-auto space-y-5">
        {/* Section: Institutions */}
        <div>
          <div className="px-4 mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Institutions
            </span>
            <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Database className="w-2.5 h-2.5" />
              PostgreSQL
            </span>
          </div>

          <div className="space-y-1">
            {/* Overview link */}
            <button
              id="sidebar-all-institutions-btn"
              onClick={onNavigateHome}
              className={`w-full flex items-center justify-between px-4 py-2 transition-colors text-left ${
                selectedInstitution === null
                  ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-600 font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-slate-400" />
                <span className="text-sm">All Portals</span>
              </div>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {totalCount}
              </span>
            </button>

            {/* Search Input for Portals */}
            <div className="px-3 pt-1 pb-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="sidebar-search-input"
                  type="text"
                  placeholder="Search portals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/90 text-xs text-slate-200 placeholder-slate-500 pl-8 pr-7 py-1.5 rounded-md border border-slate-700/60 focus:outline-hidden focus:border-blue-500 transition-colors"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : isSearchingDb ? (
                  <Loader2 className="w-3 h-3 text-slate-500 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                ) : null}
              </div>
            </div>

            {/* SEARCH RESULTS VIEW */}
            {lowerQuery ? (
              <div className="space-y-2">
                {/* 1. Existing Related Search Terms at the Top */}
                {existingMatches.length > 0 && (
                  <div>
                    <div className="px-4 py-1 flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <span>Related Search Terms ({existingMatches.length})</span>
                      <span className="text-blue-400 font-mono">Loaded</span>
                    </div>
                    <div className="space-y-0.5">
                      {existingMatches.map((inst) => {
                        const isSelected = selectedInstitution?.id === inst.id;
                        return (
                          <button
                            key={`exist-${inst.id}`}
                            id={`sidebar-inst-${inst.id}`}
                            onClick={() => onSelectInstitution(inst)}
                            className={`w-full flex items-center justify-between px-4 py-1.5 transition-colors text-left group ${
                              isSelected
                                ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-600 font-medium'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                            title={inst.name}
                          >
                            <span className="text-xs truncate pr-2">{inst.name}</span>
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                              {inst.code}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Additional Matches from Database Search */}
                {additionalDbResults.length > 0 && (
                  <div>
                    <div className="px-4 py-1 flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <span>From Database ({additionalDbResults.length})</span>
                      <span className="text-emerald-400 font-mono">DB</span>
                    </div>
                    <div className="space-y-0.5">
                      {additionalDbResults.map((inst) => {
                        const isSelected = selectedInstitution?.id === inst.id;
                        return (
                          <button
                            key={`db-${inst.id}`}
                            id={`sidebar-inst-${inst.id}`}
                            onClick={() => onSelectInstitution(inst)}
                            className={`w-full flex items-center justify-between px-4 py-1.5 transition-colors text-left group ${
                              isSelected
                                ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-600 font-medium'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                            title={inst.name}
                          >
                            <span className="text-xs truncate pr-2">{inst.name}</span>
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-emerald-400">
                              {inst.code}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No matches notice */}
                {existingMatches.length === 0 && additionalDbResults.length === 0 && (
                  <div className="px-4 py-3 text-center text-xs text-slate-500">
                    {isSearchingDb ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                        <span>Searching database...</span>
                      </div>
                    ) : (
                      <span>No portals found for "{searchQuery}"</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* DEFAULT VIEW: First 7 to 8 institutions */
              <div className="space-y-0.5">
                {defaultList.map((inst) => {
                  const isSelected = selectedInstitution?.id === inst.id;
                  return (
                    <button
                      key={inst.id}
                      id={`sidebar-inst-${inst.id}`}
                      onClick={() => onSelectInstitution(inst)}
                      className={`w-full flex items-center justify-between px-4 py-2 transition-colors text-left group ${
                        isSelected
                          ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-600 font-medium'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                      title={inst.name}
                    >
                      <span className="text-sm truncate pr-2">{inst.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-blue-600/20 text-blue-300'
                            : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                        }`}
                      >
                        {inst.totalSubmissions || 0}
                      </span>
                    </button>
                  );
                })}

                {/* Selected institution if outside top 8 */}
                {selectedNotInTop8 && (
                  <div className="pt-1 mt-1 border-t border-slate-800/80">
                    <div className="px-4 py-0.5 text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                      Current Active Portal
                    </div>
                    <button
                      id={`sidebar-inst-${selectedNotInTop8.id}`}
                      onClick={() => onSelectInstitution(selectedNotInTop8)}
                      className="w-full flex items-center justify-between px-4 py-2 bg-blue-600/10 text-blue-400 border-r-4 border-blue-600 font-medium text-left"
                      title={selectedNotInTop8.name}
                    >
                      <span className="text-sm truncate pr-2">{selectedNotInTop8.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-300">
                        {selectedNotInTop8.totalSubmissions || 0}
                      </span>
                    </button>
                  </div>
                )}

                {/* Pagination indicator in sidebar */}
                {totalCount > 8 && (
                  <div className="px-4 pt-2 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Showing first 8 portals</span>
                    <span className="text-slate-400 font-medium font-mono">{totalCount} total</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section: Admin */}
        <div>
          <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Admin
          </div>
          <div className="space-y-0.5">
            <button
              id="sidebar-api-docs-btn"
              onClick={onOpenApiDocs}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-left"
            >
              <Code2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium">REST API Explorer</span>
            </button>

            <button
              id="sidebar-create-inst-btn"
              onClick={onOpenCreateModal}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-left"
            >
              <Plus className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium">New Institution</span>
            </button>

            <button
              id="sidebar-reset-demo-btn"
              onClick={onResetDemo}
              disabled={isResetting}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-left disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-slate-400 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Reset Demo Data</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Admin User Profile Box */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white">
            AD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium text-white truncate">Administrator</p>
            <p className="text-[10px] text-slate-400 truncate">admin@datarouter.io</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
