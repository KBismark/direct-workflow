import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Phone,
  FileSpreadsheet,
  Building,
  User,
  MessageSquare,
  X,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { FormSubmissionRecord, Institution } from '../types';
import { getDefaultSheetTabName } from '../utils';

interface ApproveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: FormSubmissionRecord | null;
  institution: Institution;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

export const ApproveConfirmationModal: React.FC<ApproveConfirmationModalProps> = ({
  isOpen,
  onClose,
  record,
  institution,
  onConfirm,
  isProcessing,
}) => {
  if (!isOpen || !record) return null;

  const tabName = institution.sheetTabName || getDefaultSheetTabName(institution.name);
  const surname = record.SURNAME?.toUpperCase() || 'VALUED CUSTOMER';
  const smsPreview = `Dear ${surname}, get upto 1-year low-interest salary loan from Direct Savings and Loans. Dial *396*2# or contact 0302 743 310 for assistance. Thank you.`;

  return (
    <div
      id="approve-confirmation-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (!isProcessing && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="approve-confirmation-modal"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 bg-emerald-50/70 border-b border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Confirm Application Approval</h3>
              <p className="text-xs text-slate-500">
                Please verify that the approve button was not clicked by mistake
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-white/60 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning / Notice Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950">Accidental Click Protection</p>
              <p className="text-amber-800 leading-relaxed">
                Confirming approval will immediately update the applicant's status, synchronize the change to the Google Sheet tab, and dispatch an automated SMS to their mobile number.
              </p>
            </div>
          </div>

          {/* Applicant Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Applicant Details
              </span>
              <span className="font-mono text-xs text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                {record.referenceNumber}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Full Name</span>
                <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {record.SURNAME}, {record.OTHER_NAME}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Recipient Mobile</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  {record.PERSONNEL_MOBILE}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Institution</span>
                <span className="text-slate-800 flex items-center gap-1 mt-0.5 truncate" title={institution.name}>
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{institution.name}</span>
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Spreadsheet Tab</span>
                <span className="font-medium text-blue-700 flex items-center gap-1 mt-0.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
                  {tabName}
                </span>
              </div>
            </div>
          </div>

          {/* SMS Notification Preview */}
          <div className="bg-slate-900 text-white rounded-lg p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <MessageSquare className="w-3.5 h-3.5" />
                Hubtel SMS Trigger on Approval
              </span>
              <span className="text-[10px] text-slate-400">
                To: {record.PERSONNEL_MOBILE}
              </span>
            </div>
            <p className="text-slate-200 text-xs font-mono leading-relaxed bg-slate-950/80 p-2.5 rounded border border-slate-800">
              "{smsPreview}"
            </p>
            <p className="text-[10px] text-slate-400 italic">
              Dispatched automatically after the approval is synced with Google Sheet tab '{tabName}'.
            </p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            id="cancel-approval-btn"
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            id="confirm-approval-btn"
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Approving, Syncing & Sending SMS...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Approval & Send SMS</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
