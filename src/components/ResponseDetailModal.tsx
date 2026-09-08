import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  User,
  CreditCard,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { FormSubmissionRecord } from '../types';

interface ResponseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: FormSubmissionRecord | null;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
}

export const ResponseDetailModal: React.FC<ResponseDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  onApprove,
  onReject,
}) => {
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmReject, setShowConfirmReject] = useState(false);
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);

  if (!isOpen || !record) return null;

  const handleConfirmApprove = async () => {
    try {
      setIsProcessing(true);
      await onApprove(record.id, actionNotes.trim() || 'Verified and approved by administrator');
      setActionNotes('');
      setShowConfirmApprove(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsProcessing(true);
      await onReject(record.id, actionNotes.trim() || 'Declined during review');
      setActionNotes('');
      setShowConfirmReject(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return String(val || '0.00');
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(num);
  };

  return (
    <div
      id="response-detail-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="response-detail-modal"
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                record.status === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : record.status === 'REJECTED'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {record.status === 'APPROVED' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : record.status === 'REJECTED' ? (
                <XCircle className="w-5 h-5 text-rose-600" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  {record.SURNAME}, {record.OTHER_NAME}
                </h2>
                <span
                  className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                    record.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : record.status === 'REJECTED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {record.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>Ref: <strong className="font-mono text-slate-700">{record.referenceNumber}</strong></span>
                <span>•</span>
                <span>Institution: <strong>{record.INSTITUTION_NAME}</strong></span>
                <span>•</span>
                <span>Submitted: {new Date(record.submittedAt).toLocaleDateString()}</span>
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

        {/* Content: All 21 fields cleanly organized */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Section 1: Personal Profile */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/40">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <User className="w-3.5 h-3.5 text-slate-700" />
              1. Personal Identification
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Surname</span>
                <span className="font-semibold text-slate-900">{record.SURNAME}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Other Name(s)</span>
                <span className="font-semibold text-slate-900">{record.OTHER_NAME}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Ghana Card Number</span>
                <span className="font-mono font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                  {record.GHANA_CARD_NUMBER}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Gender</span>
                <span className="font-medium text-slate-900">{record.GENDER || 'Not Specified'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Date of Birth</span>
                <span className="font-medium text-slate-900">{record.DATE_OF_BIRTH}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Marital Status</span>
                <span className="font-medium text-slate-900">{record.MARITAL_STATUS}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Addresses */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/40">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <MapPin className="w-3.5 h-3.5 text-slate-700" />
              2. Contact &amp; Residential Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Personnel Mobile</span>
                <span className="font-semibold text-slate-900 font-mono flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {record.PERSONNEL_MOBILE}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Residential Digital Address</span>
                <span className="font-mono font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                  {record.RESIDENTIAL_DIGITAL_ADDRESS}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Employment & Compensation */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/40">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Briefcase className="w-3.5 h-3.5 text-slate-700" />
              3. Employment &amp; Salary Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Institution Name</span>
                <span className="font-semibold text-slate-900">{record.INSTITUTION_NAME}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Date of Employment</span>
                <span className="font-medium text-slate-900 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {record.DATE_OF_EMPLOYMENT}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Monthly Net Salary</span>
                <span className="font-bold text-emerald-700 text-sm">
                  {formatCurrency(record.MONTHLY_NET_SALARY)}
                </span>
              </div>
              <div className="sm:col-span-3">
                <span className="text-slate-500 block text-[11px]">Place of Work Digital Address</span>
                <span className="font-mono font-medium text-slate-900">
                  {record.PLACE_OF_WORK_DIGITAL_ADDRESS}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Guarantor Profile */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/40">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
              4. Guarantor Verification Information
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Guarantor Full Name</span>
                <span className="font-semibold text-slate-900">{record.GUARANTOR_FULL_NAME}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Guarantor Mobile Number</span>
                <span className="font-mono font-medium text-slate-900">{record.GUARANTOR_MOBILE_NUMBER}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Guarantor Net Salary</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(record.GUARANTOR_NET_SALARY)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Guarantor Job Detail</span>
                <span className="font-medium text-slate-900">{record.GUARANTOR_JOB_DETAIL}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Guarantor Place of Work</span>
                <span className="font-medium text-slate-900">{record.GUARANTOR_PLACE_OF_WORK}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Guarantor Digital Address</span>
                <span className="font-mono font-medium text-slate-900">{record.GUARANTOR_DIGITAL_ADDRESS}</span>
              </div>
            </div>
          </div>

          {/* Section 5: Banking Details */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/40">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <CreditCard className="w-3.5 h-3.5 text-slate-700" />
              5. Banking Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Name of Bank</span>
                <span className="font-semibold text-slate-900">{record.NAME_OF_BANK}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Branch</span>
                <span className="font-medium text-slate-900">{record.BRANCH}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Bank Account Number</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                  {record.BANK_ACCOUNT_NUMBER}
                </span>
              </div>
            </div>
          </div>

          {/* Reviewer Audit / Notes if any */}
          {(record.approvalNotes || record.rejectionReason) && (
            <div className="p-3 rounded-lg bg-slate-100 text-xs border border-slate-200">
              <span className="font-semibold text-slate-700">Audit &amp; Decision Record:</span>
              <p className="mt-1 text-slate-800">
                {record.approvalNotes || record.rejectionReason}
              </p>
              {record.reviewedAt && (
                <span className="text-[10px] text-slate-400 block mt-1">
                  Logged on {new Date(record.reviewedAt).toLocaleString()} by {record.reviewedBy || 'Admin'}
                </span>
              )}
              {record.status === 'APPROVED' && (
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2 text-xs">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-700">Automated SMS:</span>
                  {record.smsSent ? (
                    <span className="text-emerald-700 font-medium">
                      Sent to {record.PERSONNEL_MOBILE} {record.smsSentAt ? `(${new Date(record.smsSentAt).toLocaleTimeString()})` : ''}
                    </span>
                  ) : record.smsStatus === 'SKIPPED' ? (
                    <span className="text-amber-700 font-medium">
                      Skipped ({record.smsError || 'Pending Hubtel credentials'})
                    </span>
                  ) : record.smsStatus === 'FAILED' ? (
                    <span className="text-rose-700 font-medium">
                      Failed ({record.smsError || 'Gateway error'})
                    </span>
                  ) : (
                    <span className="text-slate-500">Sent upon approval</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Approval Confirmation Prompt Banner */}
          {showConfirmApprove && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">
                    Confirm Approval for {record.SURNAME}, {record.OTHER_NAME}?
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    Please confirm this approval was not clicked by mistake. The record will reflect as approved in the Google Sheet tab, and an automated SMS will be sent to{' '}
                    <strong className="font-mono">{record.PERSONNEL_MOBILE}</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-md p-2.5 text-[11px] font-mono">
                <span className="text-emerald-400 block mb-1 text-[10px] font-sans font-semibold uppercase tracking-wider">
                  Automated SMS Preview
                </span>
                "Dear {record.SURNAME?.toUpperCase() || 'VALUED CUSTOMER'}, get upto 1-year low-interest salary loan from Direct Savings and Loans. Dial *396*2# or contact 0302 743 310 for assistance. Thank you."
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmApprove(false)}
                  disabled={isProcessing}
                  className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={isProcessing}
                  className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Approving & Sending SMS...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Yes, Confirm & Send SMS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Action Input */}
          {!showConfirmApprove && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Review Notes or Decision Comments (Reflected in Google Sheet)
              </label>
              <input
                type="text"
                placeholder="e.g. Identity verified via Ghana Card Portal, credentials approved"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Decisions auto-sync to institution's Google Sheet</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
            >
              Close
            </button>

            {/* Reject Button */}
            {record.status !== 'REJECTED' && !showConfirmApprove && (
              <button
                id="modal-reject-btn"
                onClick={handleReject}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Reject</span>
              </button>
            )}

            {/* Approve Button */}
            {record.status !== 'APPROVED' && !showConfirmApprove && (
              <button
                id="modal-approve-btn"
                onClick={() => setShowConfirmApprove(true)}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve...</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
