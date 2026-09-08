import React, { useState } from 'react';
import { X, ShieldCheck, FileSpreadsheet, Building2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Institution } from '../types';

interface CreateInstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    code: string;
    spreadsheetId?: string;
    sheetWebhookUrl?: string;
    sheetTabName?: string;
    description?: string;
    contactEmail?: string;
  }) => Promise<void>;
}

export const CreateInstitutionModal: React.FC<CreateInstitutionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetWebhookUrl, setSheetWebhookUrl] = useState('');
  const [sheetTabName, setSheetTabName] = useState('Responses');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Please provide both an Institution Name and an Institution Code.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        spreadsheetId: spreadsheetId.trim(),
        sheetWebhookUrl: sheetWebhookUrl.trim(),
        sheetTabName: sheetTabName.trim() || 'Responses',
        description: description.trim(),
        contactEmail: contactEmail.trim(),
      });
      // Reset form
      setName('');
      setCode('');
      setSpreadsheetId('');
      setSheetWebhookUrl('');
      setDescription('');
      setContactEmail('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create institution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePreviewSlug = () => {
    const slug = code ? code.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'inst';
    return `${slug}_${Math.random().toString(36).substring(2, 8)}...`;
  };

  return (
    <div
      id="create-institution-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="create-institution-modal"
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-emerald-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Generate Unique Institution Link
              </h2>
              <p className="text-xs text-slate-500">
                Creates a dedicated link routing data to its separate Google Sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Institution Info */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institution Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="inst-name-input"
              type="text"
              required
              placeholder="e.g. Ghana Education Service (GES) or University of Mines"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!code && e.target.value) {
                  // auto generate code initials
                  const words = e.target.value.split(/\s+/).filter(Boolean);
                  if (words.length > 1) {
                    setCode(words.map(w => w[0]).join('').toUpperCase());
                  }
                }
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institution Code / Acronym <span className="text-rose-500">*</span>
              </label>
              <input
                id="inst-code-input"
                type="text"
                required
                placeholder="e.g. GES-HQ"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Contact Email
              </label>
              <input
                id="inst-email-input"
                type="email"
                placeholder="admin@institution.edu.gh"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>
          </div>

          {/* Security note */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900">
              <span className="font-semibold">Security &amp; Zero-Login Access:</span>
              <p className="mt-0.5 text-emerald-800">
                A 128-bit cryptographic link token (<code className="font-mono bg-white px-1 py-0.5 rounded border border-emerald-300">{generatePreviewSlug()}</code>) will be generated. The link is publicly accessible to respondents without requiring login, while isolating all response data strictly to this institution.
              </p>
            </div>
          </div>

          {/* Google Sheets Binding */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mb-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Google Sheets Synchronization (Optional / Configurable)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Google Spreadsheet ID or URL
                </label>
                <input
                  id="inst-sheet-id-input"
                  type="text"
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Found in your spreadsheet link: docs.google.com/spreadsheets/d/<b>[SPREADSHEET_ID]</b>/edit
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Google Apps Script Webhook URL (For Live Auto-Sync)
                </label>
                <input
                  id="inst-webhook-url-input"
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={sheetWebhookUrl}
                  onChange={(e) => setSheetWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Enables instantaneous row appending and approval updates in the live sheet. You can configure this now or later in the dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              id="submit-create-institution-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Generate Link & Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
