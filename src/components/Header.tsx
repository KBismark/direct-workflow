import React, { useState } from 'react';
import {
  Search,
  Plus,
  Link as LinkIcon,
  Copy,
  Check,
  Code2,
  ExternalLink,
  Menu,
  FileSpreadsheet,
  ArrowLeft,
} from 'lucide-react';
import { Institution } from '../types';

interface HeaderProps {
  currentView: 'institutions' | 'spreadsheet' | 'public-form';
  selectedInstitution: Institution | null;
  onNavigateHome: () => void;
  onOpenCreateModal?: () => void;
  onOpenApiDocs: () => void;
  onOpenSheetConfig?: () => void;
  onOpenMasterSheetModal?: () => void;
  onToggleMobileSidebar?: () => void;
  onTestFormLink?: (token: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  selectedInstitution,
  onNavigateHome,
  onOpenCreateModal,
  onOpenApiDocs,
  onOpenSheetConfig,
  onOpenMasterSheetModal,
  onToggleMobileSidebar,
  onTestFormLink,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    if (!selectedInstitution) return;
    const formCode = selectedInstitution.code || selectedInstitution.secureToken;
    const url = `${window.location.origin}/?code=${formCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <header
      id="app-header"
      className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shadow-xs sticky top-0 z-20"
    >
      {/* Left: Title & Connected Tag */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors mr-1"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {currentView === 'spreadsheet' && selectedInstitution ? (
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              title="Return to all institutions"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-800 truncate max-w-[240px] sm:max-w-md">
                {selectedInstitution.name}
              </h1>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wide shrink-0">
                Connected
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">
              Institutional Portals &amp; Spreadsheets
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wide">
              DataRouter
            </span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {onOpenMasterSheetModal && (
          <button
            id="header-master-sheet-btn"
            onClick={onOpenMasterSheetModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
            title="Configure Master Google Sheet registry (Approach B)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Master Registry</span>
            <span className="sm:hidden">Registry</span>
          </button>
        )}

        {currentView === 'spreadsheet' && selectedInstitution ? (
          <>
            <button
              id="header-copy-link-btn"
              onClick={handleCopyLink}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-xs transition-colors shrink-0"
              title="Copy institution's unique public form link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  <span>Unique Form Link</span>
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <button
              id="header-api-btn"
              onClick={onOpenApiDocs}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-slate-500" />
              <span>API Explorer</span>
            </button>

            <div
              id="header-db-sync-badge"
              className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow-xs"
              title="Institutions sourced from PostgreSQL database (Creation currently on hold)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="hidden sm:inline">PostgreSQL Synced</span>
              <span className="sm:hidden">Postgres</span>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
