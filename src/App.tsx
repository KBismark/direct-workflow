import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { InstitutionsList } from './components/InstitutionsList';
import { SpreadsheetView } from './components/SpreadsheetView';
import { PublicSubmissionForm } from './components/PublicSubmissionForm';
import { CreateInstitutionModal } from './components/CreateInstitutionModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { ApiDocsModal } from './components/ApiDocsModal';
import { ResponseDetailModal } from './components/ResponseDetailModal';
import { MasterSheetModal } from './components/MasterSheetModal';
import { Institution, FormSubmissionRecord, PaginationMeta } from './types';
import { apiClient } from './api/client';

export default function App() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [sidebarInstitutions, setSidebarInstitutions] = useState<Institution[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [dashboardPage, setDashboardPage] = useState(1);
  const [dashboardSearch, setDashboardSearch] = useState('');

  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [currentView, setCurrentView] = useState<'institutions' | 'spreadsheet' | 'public-form'>('institutions');
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [sheetModalInstitution, setSheetModalInstitution] = useState<Institution | null>(null);
  const [isMasterSheetModalOpen, setIsMasterSheetModalOpen] = useState(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FormSubmissionRecord | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Detect URL parameters on load for public form links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('code') || params.get('token') || params.get('form');

    if (token) {
      setPublicToken(token);
      setCurrentView('public-form');
    }

    loadInstitutions(1, '');
    loadSidebarInstitutions();

    // Listen to browser popstate
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('code') || p.get('token') || p.get('form');
      if (t) {
        setPublicToken(t);
        setCurrentView('public-form');
      } else {
        setPublicToken(null);
        setCurrentView('institutions');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const loadSidebarInstitutions = async () => {
    try {
      const res = await apiClient.getInstitutions({ page: 1, limit: 8 });
      setSidebarInstitutions(res.data);
    } catch (err) {
      console.warn('Could not load sidebar institutions from DB:', err);
    }
  };

  const loadInstitutions = async (targetPage = dashboardPage, targetSearch = dashboardSearch) => {
    try {
      setIsLoading(true);
      setDbError(null);
      const res = await apiClient.getInstitutions({
        page: targetPage,
        limit: 10,
        search: targetSearch,
      });
      setInstitutions(res.data);
      setPagination(res.pagination);
      setDashboardPage(res.pagination.page);

      // Keep selected institution in sync if open
      if (selectedInstitution) {
        const found = res.data.find((i) => i.id === selectedInstitution.id);
        if (found) setSelectedInstitution(found);
      }
    } catch (err: any) {
      console.error('Failed to load institutions from PostgreSQL', err);
      setDbError(err.message || 'Failed to connect to PostgreSQL database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setDashboardSearch(val);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      loadInstitutions(1, val);
    }, 300);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === dashboardPage) return;
    setDashboardPage(newPage);
    loadInstitutions(newPage, dashboardSearch);
  };

  const handleNavigateHome = () => {
    setSelectedInstitution(null);
    setCurrentView('institutions');
    setPublicToken(null);
    setMobileSidebarOpen(false);
    setDashboardSearch('');
    window.history.pushState({}, '', window.location.pathname);
    loadInstitutions(1, '');
    loadSidebarInstitutions();
  };

  const handleSelectInstitution = (inst: Institution) => {
    setSelectedInstitution(inst);
    setCurrentView('spreadsheet');
    setMobileSidebarOpen(false);
  };

  const handleTestFormLink = (token: string) => {
    setPublicToken(token);
    setCurrentView('public-form');
    window.history.pushState({}, '', `?token=${token}`);
  };

  const handleCreateInstitution = async (data: any) => {
    const created = await apiClient.createInstitution(data);
    await loadInstitutions();
    setSelectedInstitution(created);
    setCurrentView('spreadsheet');
  };

  const handleOpenSheetConfig = (inst: Institution) => {
    setSheetModalInstitution(inst);
    setIsSheetModalOpen(true);
  };

  const handleSaveSheetConfig = async (updates: Partial<Institution>) => {
    if (!sheetModalInstitution) return;
    const updated = await apiClient.updateInstitution(sheetModalInstitution.id, updates);
    await loadInstitutions();
    if (selectedInstitution?.id === updated.id) {
      setSelectedInstitution(updated);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset all institutions and responses back to the default sample records?')) {
      return;
    }
    try {
      setIsResetting(true);
      await apiClient.resetDemoData();
      await loadInstitutions();
      if (selectedInstitution) {
        setSelectedInstitution(null);
        setCurrentView('institutions');
      }
    } catch (err: any) {
      alert(`Error resetting demo: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleApproveRecord = async (id: string, notes?: string) => {
    const updated = await apiClient.updateResponseStatus(id, 'APPROVED', notes, {
      institutionId: selectedRecord?.institutionId || selectedInstitution?.id,
      referenceNumber: selectedRecord?.referenceNumber || id,
      mobile: selectedRecord?.PERSONNEL_MOBILE,
      surname: selectedRecord?.SURNAME,
      applicantData: selectedRecord,
    });
    await loadInstitutions();
    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord(updated);
    }
  };

  const handleRejectRecord = async (id: string, reason?: string) => {
    const updated = await apiClient.updateResponseStatus(id, 'REJECTED', reason, {
      institutionId: selectedRecord?.institutionId || selectedInstitution?.id,
      referenceNumber: selectedRecord?.referenceNumber || id,
      mobile: selectedRecord?.PERSONNEL_MOBILE,
      surname: selectedRecord?.SURNAME,
    });
    await loadInstitutions();
    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord(updated);
    }
  };

  // If in public form mode (e.g. ?token=...)
  if (currentView === 'public-form' && publicToken) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        <PublicSubmissionForm
          token={publicToken}
          onNavigateHome={handleNavigateHome}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden select-none">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar with Professional Polish styling */}
      <div
        className={`fixed inset-y-0 left-0 z-40 md:static md:z-auto transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          institutions={sidebarInstitutions.length > 0 ? sidebarInstitutions : institutions.slice(0, 8)}
          totalInstitutionsCount={pagination.total}
          selectedInstitution={selectedInstitution}
          onSelectInstitution={handleSelectInstitution}
          onNavigateHome={handleNavigateHome}
          onOpenCreateModal={() => {
            setIsCreateModalOpen(true);
            setMobileSidebarOpen(false);
          }}
          onOpenApiDocs={() => {
            setIsApiDocsOpen(true);
            setMobileSidebarOpen(false);
          }}
          onResetDemo={handleResetDemo}
          isResetting={isResetting}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden h-full min-w-0">
        {/* Header matching Professional Polish */}
        <Header
          currentView={currentView}
          selectedInstitution={selectedInstitution}
          onNavigateHome={handleNavigateHome}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenApiDocs={() => setIsApiDocsOpen(true)}
          onOpenSheetConfig={() => selectedInstitution && handleOpenSheetConfig(selectedInstitution)}
          onOpenMasterSheetModal={() => setIsMasterSheetModalOpen(true)}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onTestFormLink={handleTestFormLink}
        />

        {/* Dynamic Viewport */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {currentView === 'institutions' ? (
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
              <InstitutionsList
                institutions={institutions}
                pagination={pagination}
                onPageChange={handlePageChange}
                onSearchChange={handleSearchChange}
                searchTerm={dashboardSearch}
                onSelectInstitution={handleSelectInstitution}
                onOpenSheetConfig={handleOpenSheetConfig}
                onTestFormLink={handleTestFormLink}
                dbError={dbError}
                onRefresh={() => loadInstitutions(dashboardPage, dashboardSearch)}
                isLoading={isLoading}
              />
            </div>
          ) : selectedInstitution ? (
            <SpreadsheetView
              institution={selectedInstitution}
              onBack={handleNavigateHome}
              onOpenSheetConfig={() => handleOpenSheetConfig(selectedInstitution)}
              onOpenApiDocs={() => setIsApiDocsOpen(true)}
              onViewRecord={(rec) => setSelectedRecord(rec)}
              onTestFormLink={handleTestFormLink}
            />
          ) : (
            <div className="text-center py-12 p-8">
              <p className="text-sm text-slate-500">Institution not found.</p>
              <button
                onClick={handleNavigateHome}
                className="mt-3 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Return to Institutions
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateInstitutionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateInstitution}
      />

      {sheetModalInstitution && (
        <GoogleSheetsModal
          isOpen={isSheetModalOpen}
          onClose={() => {
            setIsSheetModalOpen(false);
            setSheetModalInstitution(null);
          }}
          institution={sheetModalInstitution}
          onSave={handleSaveSheetConfig}
        />
      )}

      <ApiDocsModal
        isOpen={isApiDocsOpen}
        onClose={() => setIsApiDocsOpen(false)}
        institution={selectedInstitution}
      />

      <ResponseDetailModal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        onApprove={handleApproveRecord}
        onReject={handleRejectRecord}
      />

      <MasterSheetModal
        isOpen={isMasterSheetModalOpen}
        onClose={() => setIsMasterSheetModalOpen(false)}
        onSyncComplete={() => {
          loadInstitutions();
          loadSidebarInstitutions();
        }}
      />
    </div>
  );
}
