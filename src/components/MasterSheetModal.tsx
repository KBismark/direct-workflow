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
  Link2,
  Database,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { MasterSheetConfig, MasterSheetRowMapping } from '../types';
import { apiClient } from '../api/client';

interface MasterSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const MasterSheetModal: React.FC<MasterSheetModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'mappings' | 'script'>('settings');
  const [config, setConfig] = useState<MasterSheetConfig>({
    status: 'unconnected',
  });
  const [mappings, setMappings] = useState<MasterSheetRowMapping[]>([]);
  const [totalInstitutions, setTotalInstitutions] = useState(0);

  const [masterWebhookUrl, setMasterWebhookUrl] = useState('');
  const [masterSpreadsheetId, setMasterSpreadsheetId] = useState('');
  const [scriptCode, setScriptCode] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMasterSheetData();
      apiClient.getMasterScriptTemplate().then(setScriptCode).catch(() => {});
    }
  }, [isOpen]);

  const loadMasterSheetData = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getMasterSheet();
      if (res.success) {
        setConfig(res.config);
        setMappings(res.mappings || []);
        setTotalInstitutions(res.totalInstitutions || 0);
        setMasterWebhookUrl(res.config.masterWebhookUrl || '');
        setMasterSpreadsheetId(res.config.masterSpreadsheetId || '');
      }
    } catch (err: any) {
      console.error('Failed to load Master Sheet config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      setFeedback(null);
      setTestResult(null);

      // Clean spreadsheet ID if user pasted full URL
      let cleanSheetId = masterSpreadsheetId.trim();
      const match = cleanSheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanSheetId = match[1];
        setMasterSpreadsheetId(cleanSheetId);
      }

      const res = await apiClient.updateMasterSheet({
        masterWebhookUrl: masterWebhookUrl.trim(),
        masterSpreadsheetId: cleanSheetId,
      });

      if (res.success) {
        setConfig(res.config);
        setMappings(res.mappings || []);
        const syncMsg = res.syncResult?.success
          ? ` (${res.syncResult.message})`
          : '';
        setFeedback({
          success: true,
          message: `Master Google Sheet configuration saved successfully!${syncMsg}`,
        });
        if (onSyncComplete) onSyncComplete();
      } else {
        setFeedback({ success: false, message: 'Failed to update Master Sheet configuration.' });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || 'Error saving Master Sheet settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await apiClient.testMasterSheetWebhook(masterWebhookUrl.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setFeedback(null);
      const res = await apiClient.syncMasterSheet();
      if (res.success) {
        setConfig(res.config);
        setMappings(res.mappings || []);
        setFeedback({
          success: true,
          message: res.message || `Synchronized ${res.syncedCount} institution mappings.`,
        });
        if (onSyncComplete) onSyncComplete();
      } else {
        setFeedback({
          success: false,
          message: res.message || 'Sync failed. Please verify your Master Webhook URL.',
        });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || 'Error during master sheet sync.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const isConnected = config.status === 'connected' || (config.masterWebhookUrl && config.masterWebhookUrl.length > 10);

  return (
    <div
      id="master-sheet-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="master-sheet-modal"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Master Google Sheet Registry
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isConnected
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {isConnected ? 'Approach B Active' : 'Setup Required'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Central registry tracking each institution's Spreadsheet ID & Webhook URL across devices and sessions
              </p>
            </div>
          </div>
          <button
            id="close-master-sheet-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-6 text-sm font-medium text-slate-600">
          <button
            id="master-tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            Registry Settings & Sync
          </button>
          <button
            id="master-tab-mappings"
            onClick={() => setActiveTab('mappings')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'mappings'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Active Rows ({mappings.length})
          </button>
          <button
            id="master-tab-script"
            onClick={() => setActiveTab('script')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'script'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Master Apps Script
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700">
          {/* Tab 1: Settings & Sync */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* How Approach B Works Card */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 text-emerald-950">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-emerald-900 mb-1.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  How Approach B (Master Sheet Registry) Works
                </h3>
                <ul className="text-xs text-emerald-800/90 space-y-1.5 list-disc list-inside">
                  <li>
                    A single Google Spreadsheet acts as the <strong>central registry</strong> containing a row for each institution.
                  </li>
                  <li>
                    Whenever you add or update an institution's <strong>Spreadsheet ID</strong> or <strong>Sheet Webhook URL</strong> via its modal, the system immediately updates the corresponding row in your Master Sheet (or creates a new row if one doesn't exist yet).
                  </li>
                  <li>
                    On page refresh or opening from other devices, all institutions immediately fetch their linked Google Spreadsheet IDs from this master registry.
                  </li>
                </ul>
              </div>

              {/* Status summary banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="text-xs text-slate-500 font-medium block">Registry Status</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isConnected ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-sm font-semibold text-slate-800">
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="text-xs text-slate-500 font-medium block">Registered Mappings</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-bold text-slate-900">{mappings.length}</span>
                    <span className="text-xs text-slate-500">/ {totalInstitutions} institutions</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="text-xs text-slate-500 font-medium block">Last Synchronized</span>
                  <span className="text-xs font-semibold text-slate-800 mt-1 block">
                    {config.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="master-webhook-url-input"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Master Sheet Google Apps Script Webhook URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="master-webhook-url-input"
                    type="url"
                    value={masterWebhookUrl}
                    onChange={(e) => setMasterWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    The deployed Web App URL of your Master Registry Google Sheet with access set to <em>"Anyone"</em>.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="master-spreadsheet-id-input"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Master Google Spreadsheet ID or URL (Optional Fallback)
                  </label>
                  <input
                    id="master-spreadsheet-id-input"
                    type="text"
                    value={masterSpreadsheetId}
                    onChange={(e) => setMasterSpreadsheetId(e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    The Spreadsheet ID from the URL (between <code>/d/</code> and <code>/edit</code>). Enables read-only fallback queries.
                  </p>
                </div>
              </div>

              {/* Feedback messages */}
              {feedback && (
                <div
                  className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                    feedback.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {feedback.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {testResult && (
                <div
                  className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold block">
                      {testResult.success ? 'Connection Successful' : 'Connection Check Notice'}
                    </span>
                    <span>{testResult.message}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    id="test-master-connection-btn"
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !masterWebhookUrl.trim()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    {isTesting ? 'Testing...' : 'Test Webhook Connection'}
                  </button>

                  <button
                    id="sync-master-now-btn"
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncing || (!masterWebhookUrl.trim() && !masterSpreadsheetId.trim())}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Registry Now'}
                  </button>
                </div>

                <button
                  id="save-master-config-btn"
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? 'Saving & Syncing...' : 'Save & Sync Registry'}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Active Row Mappings */}
          {activeTab === 'mappings' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Synchronized Institution Rows</h3>
                  <p className="text-xs text-slate-500">
                    Showing {mappings.length} mapping(s) retrieved from the Master Google Sheet.
                  </p>
                </div>
                <button
                  id="refresh-mappings-btn"
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {mappings.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">No institution mappings loaded yet</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Connect your Master Google Sheet Webhook URL in the Settings tab or update any institution's Google Sheet modal to populate rows automatically.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5">Institution ID</th>
                          <th className="px-3 py-2.5">Institution Name</th>
                          <th className="px-3 py-2.5">Spreadsheet ID</th>
                          <th className="px-3 py-2.5">Tab Name</th>
                          <th className="px-3 py-2.5">Webhook URL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {mappings.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3 py-2 font-bold text-slate-800">
                              #{m.institutionId}
                              {m.institutionCode && (
                                <span className="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-normal">
                                  {m.institutionCode}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-sans font-medium text-slate-800">
                              {m.institutionName || '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {m.spreadsheetId ? (
                                <a
                                  href={`https://docs.google.com/spreadsheets/d/${m.spreadsheetId}/edit`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 hover:underline inline-flex items-center gap-1"
                                >
                                  {m.spreadsheetId.substring(0, 16)}...
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-slate-400 font-sans italic">Not set</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-600 font-sans">{m.sheetTabName || 'Responses'}</td>
                            <td className="px-3 py-2 text-slate-500 truncate max-w-[150px]">
                              {m.sheetWebhookUrl ? (
                                <span title={m.sheetWebhookUrl}>{m.sheetWebhookUrl.substring(0, 24)}...</span>
                              ) : (
                                <span className="text-slate-400 font-sans italic">Not set</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Google Apps Script Template */}
          {activeTab === 'script' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Master Registry Google Apps Script</h3>
                  <p className="text-xs text-slate-500">
                    Paste this into your Master Spreadsheet's Apps Script editor (Extensions &gt; Apps Script).
                  </p>
                </div>
                <button
                  id="copy-master-script-btn"
                  type="button"
                  onClick={handleCopyScript}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedScript ? 'Copied to Clipboard!' : 'Copy Script Code'}
                </button>
              </div>

              {/* Instructions steps */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1">
                <p className="font-semibold text-slate-800">Quick 5-Step Deployment Guide:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Create a new Google Sheet named <strong>"Master Institution Registry"</strong>.</li>
                  <li>Click <strong>Extensions &gt; Apps Script</strong> and paste the code below.</li>
                  <li>Click <strong>Deploy &gt; New deployment</strong> &gt; Select type: <strong>Web app</strong>.</li>
                  <li>Set <strong>Execute as: "Me"</strong> and <strong>Who has access: "Anyone"</strong> (Required).</li>
                  <li>Copy the resulting Web app URL and paste it into the <strong>Registry Settings</strong> tab above!</li>
                </ol>
              </div>

              {/* Code display */}
              <div className="relative">
                <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed rounded-xl overflow-x-auto max-h-72 border border-slate-800">
                  {scriptCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Approach B: Master Sheet Registry Pattern</span>
          <button
            id="close-master-sheet-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
