import React from 'react';
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
} from 'lucide-react';
import { Institution } from '../types';

interface SidebarProps {
  institutions: Institution[];
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
  selectedInstitution,
  onSelectInstitution,
  onNavigateHome,
  onOpenCreateModal,
  onOpenApiDocs,
  onResetDemo,
  isResetting,
}) => {
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
      <nav className="flex-1 py-4 overflow-y-auto space-y-6">
        {/* Section: Institutions */}
        <div>
          <div className="px-4 mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Institutions
            </span>
            <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
              PostgreSQL
            </span>
          </div>

          <div className="space-y-0.5">
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
                {institutions.length}
              </span>
            </button>

            {/* Individual Institutions */}
            {institutions.map((inst) => {
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
