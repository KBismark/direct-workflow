import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  HelpCircle,
} from 'lucide-react';
import { Institution } from '../types';
import { apiClient } from '../api/client';
import { getDefaultSheetTabName } from '../utils';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  institution: Institution;
  onSave: (updates: Partial<Institution>) => Promise<void>;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  institution,
  onSave,
}) => {
  const defaultTab = getDefaultSheetTabName(institution.name);
  const [spreadsheetId, setSpreadsheetId] = useState(institution.spreadsheetId || '');
  const [sheetWebhookUrl, setSheetWebhookUrl] = useState(institution.sheetWebhookUrl || '');
  const [sheetTabName, setSheetTabName] = useState(institution.sheetTabName || defaultTab);
  const [scriptCode, setScriptCode] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [syncAllResult, setSyncAllResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      const tab = institution.sheetTabName || getDefaultSheetTabName(institution.name);
      setSpreadsheetId(institution.spreadsheetId || '');
      setSheetWebhookUrl(institution.sheetWebhookUrl || '');
      setSheetTabName(tab);
      setTestResult(null);
      setSyncAllResult(null);
      apiClient.getScriptTemplate().then(code => setScriptCode(code)).catch(() => {});
    }
  }, [isOpen, institution]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const fallbackTab = getDefaultSheetTabName(institution.name);
      await onSave({
        spreadsheetId: spreadsheetId.trim(),
        sheetWebhookUrl: sheetWebhookUrl.trim(),
        sheetTabName: sheetTabName.trim() || fallbackTab,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSync = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      // Test the exact candidate URL currently typed in the input
      const res = await apiClient.testWebhookCandidate(institution.id, {
        sheetWebhookUrl: sheetWebhookUrl.trim(),
        spreadsheetId: spreadsheetId.trim(),
        sheetTabName: sheetTabName.trim() || 'Responses',
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setIsSyncingAll(true);
      setSyncAllResult(null);

      // Save latest settings first if modified
      if (
        sheetWebhookUrl.trim() !== institution.sheetWebhookUrl ||
        spreadsheetId.trim() !== institution.spreadsheetId ||
        sheetTabName.trim() !== institution.sheetTabName
      ) {
        await onSave({
          spreadsheetId: spreadsheetId.trim(),
          sheetWebhookUrl: sheetWebhookUrl.trim(),
          sheetTabName: sheetTabName.trim() || 'Responses',
        });
      }

      const res = await apiClient.syncAllSubmissionsToGoogleSheets(institution.id);
      setSyncAllResult(res);
    } catch (err: any) {
      setSyncAllResult({ success: false, message: err.message });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const sheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : null;

  return (
    <div
      id="google-sheets-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="google-sheets-modal"
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Google Sheets Integration: {institution.name}
              </h2>
              <p className="text-xs text-slate-500">
                Real-time automated row routing into your institution's Google Spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Important Tab Notice */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1 text-amber-900">
            <div className="flex items-center gap-1.5 font-semibold text-amber-950">
              <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Where does the data appear in your Google Sheet?</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              When Google Apps Script runs, it creates and writes data to a tab named <b>"{sheetTabName || 'Responses'}"</b> (look at the bottom tab bar of your Google Sheet). If you were looking at the default blank <b>"Sheet1"</b> tab, click the <b>"{sheetTabName || 'Responses'}"</b> tab at the bottom to see your records!
            </p>
          </div>

          {/* Connection Inputs */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Google Spreadsheet ID
                </label>
                {sheetUrl && (
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Open Connected Spreadsheet <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                id="modal-sheet-id-input"
                type="text"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Found in your spreadsheet URL between /d/ and /edit
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Sheet Tab Name</span>
                  <span className="text-[10px] text-blue-600 font-normal">
                    Default: {defaultTab}
                  </span>
                </label>
                <input
                  id="modal-sheet-tab-input"
                  type="text"
                  value={sheetTabName}
                  onChange={(e) => setSheetTabName(e.target.value)}
                  placeholder={defaultTab}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Defaults to the institution name (shortened to first three words if more)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Apps Script Webhook URL
                </label>
                <input
                  id="modal-sheet-webhook-input"
                  type="url"
                  value={sheetWebhookUrl}
                  onChange={(e) => setSheetWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Master Sheet Auto-Sync Notice */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-emerald-950">Master Google Sheet Registry (Approach B)</span>
                <span className="text-[11px] text-emerald-800">
                  When you save, this institution's Spreadsheet ID and Webhook URL will automatically update its row in the Master Google Sheet (or add a new row if one does not exist yet).
                </span>
              </div>
            </div>
          </div>

          {/* Test connection and Push All responses */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-xs font-semibold text-slate-800">Connection Verification &amp; Sync</span>
                <p className="text-[11px] text-slate-500">
                  Verify the webhook responds and push all existing responses to your Google Sheet.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="test-sheet-sync-btn"
                  type="button"
                  onClick={handleTestSync}
                  disabled={isTesting || !sheetWebhookUrl.trim()}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md transition-colors shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <button
                  id="push-all-to-sheet-btn"
                  type="button"
                  onClick={handleSyncAll}
                  disabled={isSyncingAll || !sheetWebhookUrl.trim()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                  <span>{isSyncingAll ? 'Pushing Rows...' : 'Push All Rows to Sheet'}</span>
                </button>
              </div>
            </div>

            {/* Test result message */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs space-y-1 ${
                  testResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.success ? 'Webhook Connected & Responding' : 'Connection Check Failed'}</span>
                </div>
                <p className="text-[11px]">{testResult.message}</p>
              </div>
            )}

            {/* Sync all result message */}
            {syncAllResult && (
              <div
                className={`p-3 rounded-lg text-xs space-y-1 ${
                  syncAllResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {syncAllResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{syncAllResult.success ? 'Sync Complete' : 'Sync Encountered Issues'}</span>
                </div>
                <p className="text-[11px]">{syncAllResult.message}</p>
              </div>
            )}
          </div>

          {/* 30-Second Setup Instructions */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Terminal className="w-3.5 h-3.5 text-slate-600" />
                <span>Updated Google Apps Script Sync Code</span>
              </div>
              <button
                id="copy-script-code-btn"
                type="button"
                onClick={handleCopyScript}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                {copiedScript ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-slate-900 text-slate-200 text-[11px] font-mono max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{scriptCode || '// Loading Google Apps Script template...'}</pre>
            </div>

            <div className="p-3 bg-slate-50 text-[11px] text-slate-600 border-t border-slate-200 space-y-1.5">
              <p className="font-semibold text-slate-800">Key deployment checklist:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>In Google Sheet, click <b>Extensions &rarr; Apps Script</b>, paste the code above, and click <b>Save</b>.</li>
                <li>Click <b>Deploy &rarr; New deployment</b> (or <i>Manage deployments &rarr; Edit &rarr; New version</i>).</li>
                <li>Select <b>Web app</b>, set <b>Execute as: "Me"</b>, and set <b>Who has access: "Anyone"</b>.</li>
                <li>Copy the provided Web app URL (ending with <b>/exec</b>) and paste it into the Webhook input above.</li>
                <li>Click <b>Test Connection</b> or <b>Push All Rows to Sheet</b> to immediately see rows appear in your spreadsheet!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Close
          </button>
          <button
            id="save-google-sheets-config-btn"
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};
