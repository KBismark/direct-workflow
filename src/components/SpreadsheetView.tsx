import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Check,
  X,
  Eye,
  RefreshCw,
  Copy,
  Code2,
  Settings,
  PlusCircle,
  ShieldCheck,
  CheckCheck,
  RotateCcw,
  UploadCloud,
  MessageSquare,
} from 'lucide-react';
import { Institution, FormSubmissionRecord, ResponseStatus } from '../types';
import { apiClient } from '../api/client';
import { getDefaultSheetTabName } from '../utils';
import { ApproveConfirmationModal } from './ApproveConfirmationModal';

interface SpreadsheetViewProps {
  institution: Institution;
  onBack: () => void;
  onOpenSheetConfig: () => void;
  onOpenApiDocs: () => void;
  onViewRecord: (record: FormSubmissionRecord) => void;
  onTestFormLink: (token: string) => void;
}

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({
  institution,
  onBack,
  onOpenSheetConfig,
  onOpenApiDocs,
  onViewRecord,
  onTestFormLink,
}) => {
  const [submissions, setSubmissions] = useState<FormSubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ResponseStatus>('ALL');
  const [copiedLink, setCopiedLink] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [recordToApprove, setRecordToApprove] = useState<FormSubmissionRecord | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const fetchResponses = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getInstitutionResponses(institution.id, searchTerm, statusFilter);
      setSubmissions(res.data);
    } catch (err) {
      console.error('Failed to load responses', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, [institution.id, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResponses();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4500);
  };

  // Open confirmation modal to prevent accidental clicks
  const handleApproveClick = (e: React.MouseEvent, record: FormSubmissionRecord) => {
    e.stopPropagation();
    setRecordToApprove(record);
    setIsApproveModalOpen(true);
  };

  // Executed only after explicit user confirmation in modal
  const handleConfirmApproval = async () => {
    if (!recordToApprove) return;
    try {
      setIsApproving(true);
      setProcessingId(recordToApprove.id);
      const updated = await apiClient.updateResponseStatus(
        recordToApprove.id,
        'APPROVED',
        'Approved by administrator from Spreadsheet View'
      );
      setSubmissions(prev => prev.map(s => (s.id === recordToApprove.id ? updated : s)));
      
      const tabName = institution.sheetTabName || getDefaultSheetTabName(institution.name);
      let toastMsg = `Approved ${recordToApprove.SURNAME}. Reflected in tab '${tabName}'.`;
      if (updated.smsSent) {
        toastMsg += ` SMS delivered to ${recordToApprove.PERSONNEL_MOBILE}.`;
      } else if (updated.smsStatus === 'SKIPPED') {
        toastMsg += ` (SMS skipped: ${updated.smsError || 'missing Hubtel credentials'})`;
      } else if (updated.smsStatus === 'FAILED') {
        toastMsg += ` (SMS failed to send)`;
      }

      showToast(toastMsg);
      setIsApproveModalOpen(false);
      setRecordToApprove(null);
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setIsApproving(false);
      setProcessingId(null);
    }
  };

  // Icon Action Button: Reject
  const handleReject = async (e: React.MouseEvent, record: FormSubmissionRecord) => {
    e.stopPropagation();
    const reason = window.prompt(
      `Reject application for ${record.SURNAME}, ${record.OTHER_NAME}?\nEnter rejection reason:`,
      'Declined during administrative verification'
    );
    if (reason === null) return;

    try {
      setProcessingId(record.id);
      const updated = await apiClient.updateResponseStatus(record.id, 'REJECTED', reason);
      setSubmissions(prev => prev.map(s => (s.id === record.id ? updated : s)));
      showToast(`Rejected response for ${record.SURNAME}. Reflected in Google Sheet.`, 'info');
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const publicUrl = `${window.location.origin}/?token=${institution.secureToken}`;

  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleExportCsv = () => {
    window.open(`/api/institutions/${institution.id}/export.csv`, '_blank');
  };

  const sheetUrl = institution.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${institution.spreadsheetId}/edit`
    : null;

  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  const handleSyncToSheets = async () => {
    if (!institution.sheetWebhookUrl) {
      onOpenSheetConfig();
      return;
    }
    try {
      setIsSyncingSheets(true);
      const res = await apiClient.syncAllSubmissionsToGoogleSheets(institution.id);
      if (res.success) {
        showToast(res.message || 'Responses successfully synced to Google Sheet!');
        fetchResponses();
      } else {
        showToast(res.error || res.message || 'Failed to sync with Google Sheet', 'info');
      }
    } catch (err: any) {
      showToast(`Sync error: ${err.message}`, 'info');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const formatCurrency = (val: any) => {
    const n = Number(val);
    if (isNaN(n)) return val || '—';
    return `GHS ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div id="spreadsheet-view-container" className="flex flex-col h-full overflow-hidden">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white text-xs rounded-xl shadow-lg border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <CheckCheck className="w-4 h-4 text-emerald-400" />
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Main Scrollable Content Area */}
      <div className="p-6 sm:p-8 flex-1 flex flex-col gap-5 overflow-hidden">
        {/* Secure Access Point Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Secure Access Point
            </p>
            <p className="text-sm text-blue-600 font-mono select-all truncate max-w-xl">
              {publicUrl}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onTestFormLink(institution.secureToken)}
              className="text-blue-700 text-xs font-bold hover:underline cursor-pointer"
            >
              Test Form
            </button>
            <span className="text-blue-300">|</span>
            <button
              onClick={handleCopyPublicLink}
              className="text-blue-700 text-xs font-bold hover:underline cursor-pointer"
            >
              {copiedLink ? 'Link Copied!' : 'Copy Link'}
            </button>
            <span className="text-blue-300">|</span>
            <button
              onClick={onOpenSheetConfig}
              className="text-blue-700 text-xs font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              <span>Sheet Sync</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Filters & Export */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg self-start">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                id={`filter-tab-${st.toLowerCase()}`}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Records' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Right Tools: Search input & Actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                id="spreadsheet-search-input"
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-md text-sm w-56 sm:w-64 focus:ring-2 focus:ring-blue-500 transition-all focus:bg-white"
              />
            </div>

            <button
              id="spreadsheet-export-btn"
              onClick={handleExportCsv}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              title="Export records to CSV"
            >
              <Download className="w-4 h-4" />
            </button>

            {institution.sheetWebhookUrl && (
              <button
                id="spreadsheet-quick-sync-btn"
                onClick={handleSyncToSheets}
                disabled={isSyncingSheets}
                className="px-2.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Push all records to connected Google Sheet"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncingSheets ? 'Syncing...' : 'Sync to Sheet'}</span>
              </button>
            )}

            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                title="Open connected Google Sheet"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={fetchResponses}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              title="Refresh spreadsheet records"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table Container: Professional Polish Theme */}
        <div className="flex-1 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[1300px]">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 select-none">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center w-12 border-r border-slate-200/60">
                    #
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase min-w-[120px]">
                    Surname
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase min-w-[140px]">
                    Other Name
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase min-w-[110px]">
                    Emp. Date
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase min-w-[140px]">
                    Ghana Card
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase min-w-[120px]">
                    Mobile
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase min-w-[130px]">
                    Net Salary
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase min-w-[140px]">
                    Bank Account
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase min-w-[110px]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center min-w-[120px]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {submissions.map((row, idx) => {
                  const isProcessing = processingId === row.id;

                  return (
                    <tr
                      key={row.id}
                      id={`spreadsheet-row-${row.id}`}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                      onClick={() => onViewRecord(row)}
                    >
                      {/* Index */}
                      <td className="px-4 py-3 text-center text-xs font-mono text-slate-400 border-r border-slate-100">
                        {idx + 1}
                      </td>

                      {/* Surname */}
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {row.SURNAME}
                      </td>

                      {/* Other Name */}
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {row.OTHER_NAME}
                      </td>

                      {/* Employment Date */}
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {row.DATE_OF_EMPLOYMENT}
                      </td>

                      {/* Ghana Card */}
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono whitespace-nowrap">
                        {row.GHANA_CARD_NUMBER}
                      </td>

                      {/* Mobile */}
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                        {row.PERSONNEL_MOBILE}
                      </td>

                      {/* Net Salary */}
                      <td className="px-4 py-3 text-sm font-medium text-emerald-800 whitespace-nowrap">
                        {formatCurrency(row.MONTHLY_NET_SALARY)}
                      </td>

                      {/* Bank Account */}
                      <td className="px-4 py-3 text-sm font-mono text-slate-700 whitespace-nowrap">
                        {row.BANK_ACCOUNT_NUMBER}
                        <span className="text-xs text-slate-400 block font-sans">
                          {row.NAME_OF_BANK}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.status === 'PENDING' ? (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-bold uppercase">
                            Pending
                          </span>
                        ) : row.status === 'APPROVED' ? (
                          <div>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase inline-block">
                              Approved
                            </span>
                            {row.smsSent && (
                              <div
                                className="text-[9px] text-emerald-700 font-medium flex items-center gap-1 mt-1"
                                title={`SMS delivered at ${row.smsSentAt ? new Date(row.smsSentAt).toLocaleTimeString() : ''}`}
                              >
                                <MessageSquare className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                <span>SMS Sent</span>
                              </div>
                            )}
                            {row.smsStatus === 'SKIPPED' && (
                              <div
                                className="text-[9px] text-amber-700 font-medium flex items-center gap-1 mt-1"
                                title={row.smsError || 'Pending Hubtel credentials'}
                              >
                                <MessageSquare className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                <span>SMS Skipped</span>
                              </div>
                            )}
                            {row.smsStatus === 'FAILED' && (
                              <div
                                className="text-[9px] text-rose-700 font-medium flex items-center gap-1 mt-1"
                                title={row.smsError || 'SMS gateway failed'}
                              >
                                <MessageSquare className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                <span>SMS Failed</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold uppercase">
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Action buttons matching Professional Polish design */}
                      <td
                        className="px-4 py-3 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {row.status === 'PENDING' ? (
                            <>
                              {/* Approve with Confirmation Modal */}
                              <button
                                id={`approve-btn-${row.id}`}
                                onClick={(e) => handleApproveClick(e, row)}
                                disabled={isProcessing}
                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                                title="Approve with confirmation & trigger SMS"
                              >
                                <Check className="w-4 h-4" />
                              </button>

                              {/* Reject */}
                              <button
                                id={`reject-btn-${row.id}`}
                                onClick={(e) => handleReject(e, row)}
                                disabled={isProcessing}
                                className="p-1.5 bg-rose-50 text-rose-600 rounded border border-rose-200 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                                title="Reject & reflect in Google Sheet"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Locked
                            </span>
                          )}

                          {/* View Record Details */}
                          <button
                            id={`view-details-btn-${row.id}`}
                            onClick={() => onViewRecord(row)}
                            className="p-1.5 bg-slate-50 text-slate-600 rounded border border-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer ml-1"
                            title="View all 21 fields & details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {submissions.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-400">
                      <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-800">
                        No responses recorded yet
                      </p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Share this institution's unique link with respondents or submit a test application.
                      </p>
                      <button
                        onClick={() => onTestFormLink(institution.secureToken)}
                        className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Submit Test Record</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer bar matching Professional Polish design */}
      <footer className="h-10 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-6 sm:px-8 text-[10px] text-slate-500 shrink-0">
        <div>
          Showing {submissions.length} response(s) for {institution.name}
        </div>
        <div className="flex items-center gap-2">
          <span>
            Google Sheet ID:{' '}
            <span className="font-mono text-slate-700">
              {institution.spreadsheetId
                ? `${institution.spreadsheetId.slice(0, 8)}...${institution.spreadsheetId.slice(-4)}`
                : 'Local Database'}
            </span>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Tab:{' '}
            <span className="font-medium text-slate-700">
              {institution.sheetTabName || getDefaultSheetTabName(institution.name)}
            </span>
          </span>
        </div>
      </footer>

      {/* Accidental Click Protection & SMS Trigger Confirmation Modal */}
      <ApproveConfirmationModal
        isOpen={isApproveModalOpen}
        onClose={() => {
          if (!isApproving) {
            setIsApproveModalOpen(false);
            setRecordToApprove(null);
          }
        }}
        record={recordToApprove}
        institution={institution}
        onConfirm={handleConfirmApproval}
        isProcessing={isApproving}
      />
    </div>
  );
};
