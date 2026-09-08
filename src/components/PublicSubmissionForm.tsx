import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  User,
  MapPin,
  Briefcase,
  CreditCard,
  Phone,
  FileCheck,
  Printer,
  RotateCcw,
  AlertCircle,
  Calendar,
  Lock,
} from 'lucide-react';
import { FormSubmissionData, PublicInstitutionInfo } from '../types';
import { apiClient } from '../api/client';

interface PublicSubmissionFormProps {
  token: string;
  onNavigateHome?: () => void;
}

export const PublicSubmissionForm: React.FC<PublicSubmissionFormProps> = ({
  token,
  onNavigateHome,
}) => {
  const [institution, setInstitution] = useState<PublicInstitutionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state initialized with all 21 fields
  const [formData, setFormData] = useState<FormSubmissionData>({
    SURNAME: '',
    OTHER_NAME: '',
    DATE_OF_EMPLOYMENT: '',
    GENDER: '',
    DATE_OF_BIRTH: '',
    MARITAL_STATUS: '',
    RESIDENTIAL_DIGITAL_ADDRESS: '',
    PERSONNEL_MOBILE: '',
    INSTITUTION_NAME: '',
    MONTHLY_NET_SALARY: '',
    GHANA_CARD_NUMBER: '',
    PLACE_OF_WORK_DIGITAL_ADDRESS: '',
    GUARANTOR_FULL_NAME: '',
    GUARANTOR_MOBILE_NUMBER: '',
    GUARANTOR_PLACE_OF_WORK: '',
    GUARANTOR_DIGITAL_ADDRESS: '',
    GUARANTOR_JOB_DETAIL: '',
    GUARANTOR_NET_SALARY: '',
    NAME_OF_BANK: '',
    BRANCH: '',
    BANK_ACCOUNT_NUMBER: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    referenceNumber: string;
    submittedAt: string;
    institutionName: string;
  } | null>(null);

  useEffect(() => {
    const loadInstitution = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiClient.getPublicInstitution(token);
        setInstitution(data);
        setFormData(prev => ({
          ...prev,
          INSTITUTION_NAME: data.name,
        }));
      } catch (err: any) {
        setError(err.message || 'Invalid or expired institutional form link.');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      loadInstitution();
    }
  }, [token]);

  const handleChange = (field: keyof FormSubmissionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Validate key fields
      if (!formData.SURNAME.trim() || !formData.OTHER_NAME.trim()) {
        throw new Error('Please provide your Surname and Other Name(s).');
      }
      if (!formData.PERSONNEL_MOBILE.trim()) {
        throw new Error('Please provide your Personnel Mobile number.');
      }
      if (!formData.GHANA_CARD_NUMBER.trim()) {
        throw new Error('Please provide your Ghana Card Number (e.g. GHA-123456789-0).');
      }

      const result = await apiClient.submitPublicForm(token, {
        ...formData,
        INSTITUTION_NAME: institution.name,
      });

      setSubmissionSuccess({
        referenceNumber: result.referenceNumber,
        submittedAt: result.submittedAt,
        institutionName: institution.name,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit form. Please check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetForm = () => {
    setSubmissionSuccess(null);
    setFormData({
      SURNAME: '',
      OTHER_NAME: '',
      DATE_OF_EMPLOYMENT: '',
      GENDER: '',
      DATE_OF_BIRTH: '',
      MARITAL_STATUS: '',
      RESIDENTIAL_DIGITAL_ADDRESS: '',
      PERSONNEL_MOBILE: '',
      INSTITUTION_NAME: institution?.name || '',
      MONTHLY_NET_SALARY: '',
      GHANA_CARD_NUMBER: '',
      PLACE_OF_WORK_DIGITAL_ADDRESS: '',
      GUARANTOR_FULL_NAME: '',
      GUARANTOR_MOBILE_NUMBER: '',
      GUARANTOR_PLACE_OF_WORK: '',
      GUARANTOR_DIGITAL_ADDRESS: '',
      GUARANTOR_JOB_DETAIL: '',
      GUARANTOR_NET_SALARY: '',
      NAME_OF_BANK: '',
      BRANCH: '',
      BANK_ACCOUNT_NUMBER: '',
    });
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full text-center shadow-xs">
          <div className="w-10 h-10 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-sm font-semibold text-slate-800">Verifying Institutional Link...</h2>
          <p className="text-xs text-slate-500 mt-1">Routing to institution's dedicated spreadsheet portal</p>
        </div>
      </div>
    );
  }

  // Error State: Invalid link
  if (error && !institution) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full text-center shadow-md">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Invalid Institutional Link</h2>
          <p className="text-xs text-slate-600 mt-2">{error}</p>
          <p className="text-xs text-slate-400 mt-2">
            Please contact your institution administrator to request a valid submission link.
          </p>
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Go to Portal Home
            </button>
          )}
        </div>
      </div>
    );
  }

  // Success Confirmation Receipt View
  if (submissionSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-md max-w-xl w-full p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Submission Successful
            </h1>
            <p className="text-xs text-slate-500">
              Your response has been securely recorded and routed to{' '}
              <strong className="text-slate-800">{submissionSuccess.institutionName}</strong>'s
              institutional spreadsheet.
            </p>
          </div>

          {/* Reference Receipt Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Reference Code</span>
              <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                {submissionSuccess.referenceNumber}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Applicant Name</span>
                <span className="font-semibold text-slate-800">
                  {formData.SURNAME}, {formData.OTHER_NAME}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Ghana Card</span>
                <span className="font-mono text-slate-800">{formData.GHANA_CARD_NUMBER}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Personnel Mobile</span>
                <span className="font-mono text-slate-800">{formData.PERSONNEL_MOBILE}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Date &amp; Time</span>
                <span className="text-slate-800">{new Date(submissionSuccess.submittedAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Status: Queued for Institutional Review &amp; Approval</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Reference Receipt</span>
            </button>

            <button
              onClick={handleResetForm}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-white" />
              <span>Submit Another Application</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Form View
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Institutional Header Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {institution?.name}
                  </h1>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {institution?.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Official Institutional Personnel &amp; Onboarding Registration Form
                </p>
              </div>
            </div>

            {/* Zero-login security badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-200 rounded-full text-xs text-emerald-700 font-bold uppercase self-start sm:self-auto text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Direct Spreadsheet Route</span>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-600 space-y-1">
            <p>
              Please fill out all required details accurately. Your submission is directly routed to the institutional registry and associated Google Spreadsheet.
            </p>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Public link verified • No login or Google account sign-in required</span>
            </div>
          </div>
        </div>

        {/* The Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Personal Profile */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Personal Identification
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SURNAME <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MENSAH"
                  value={formData.SURNAME}
                  onChange={(e) => handleChange('SURNAME', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  OTHER NAME <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwame Evans"
                  value={formData.OTHER_NAME}
                  onChange={(e) => handleChange('OTHER_NAME', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GHANA CARD NUMBER <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="GHA-712398412-4"
                  value={formData.GHANA_CARD_NUMBER}
                  onChange={(e) => handleChange('GHANA_CARD_NUMBER', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Format: GHA-XXXXXXXXX-X</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GENDER <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.GENDER}
                  onChange={(e) => handleChange('GENDER', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  DATE OF BIRTH <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.DATE_OF_BIRTH}
                  onChange={(e) => handleChange('DATE_OF_BIRTH', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  MARITAL STATUS <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.MARITAL_STATUS}
                  onChange={(e) => handleChange('MARITAL_STATUS', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="">Select Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Addresses */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Contact &amp; Digital Addresses
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PERSONNEL MOBILE <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0244123456"
                  value={formData.PERSONNEL_MOBILE}
                  onChange={(e) => handleChange('PERSONNEL_MOBILE', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RESIDENTIAL DIGITAL ADDRESS <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GA-183-9022 (GhanaPostGPS)"
                  value={formData.RESIDENTIAL_DIGITAL_ADDRESS}
                  onChange={(e) => handleChange('RESIDENTIAL_DIGITAL_ADDRESS', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PLACE OF WORK DIGITAL ADDRESS <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GA-489-1029 (Workplace GhanaPostGPS)"
                  value={formData.PLACE_OF_WORK_DIGITAL_ADDRESS}
                  onChange={(e) => handleChange('PLACE_OF_WORK_DIGITAL_ADDRESS', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Employment & Salary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Briefcase className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                3. Employment &amp; Compensation
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  INSTITUTION NAME
                </label>
                <input
                  type="text"
                  readOnly
                  value={institution?.name || formData.INSTITUTION_NAME}
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-semibold cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Bound to this unique link</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  DATE OF EMPLOYMENT <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.DATE_OF_EMPLOYMENT}
                  onChange={(e) => handleChange('DATE_OF_EMPLOYMENT', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  MONTHLY NET SALARY (GHS) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5400.00"
                  value={formData.MONTHLY_NET_SALARY}
                  onChange={(e) => handleChange('MONTHLY_NET_SALARY', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Guarantor Information */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                4. Guarantor Verification Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GUARANTOR FULL NAME <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Joseph Kofi Boateng"
                  value={formData.GUARANTOR_FULL_NAME}
                  onChange={(e) => handleChange('GUARANTOR_FULL_NAME', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GUARANTOR MOBILE NUMBER <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0208119045"
                  value={formData.GUARANTOR_MOBILE_NUMBER}
                  onChange={(e) => handleChange('GUARANTOR_MOBILE_NUMBER', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GUARANTOR NET SALARY (GHS) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 9800.00"
                  value={formData.GUARANTOR_NET_SALARY}
                  onChange={(e) => handleChange('GUARANTOR_NET_SALARY', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GUARANTOR PLACE OF WORK <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Korle Bu Teaching Hospital"
                  value={formData.GUARANTOR_PLACE_OF_WORK}
                  onChange={(e) => handleChange('GUARANTOR_PLACE_OF_WORK', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GUARANTOR DIGITAL ADDRESS <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GA-092-3140"
                  value={formData.GUARANTOR_DIGITAL_ADDRESS}
                  onChange={(e) => handleChange('GUARANTOR_DIGITAL_ADDRESS', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GUARANTOR JOB DETAIL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Medical Officer"
                  value={formData.GUARANTOR_JOB_DETAIL}
                  onChange={(e) => handleChange('GUARANTOR_JOB_DETAIL', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Banking Information */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <CreditCard className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                5. Banking Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NAME OF BANK <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GCB Bank PLC or Ecobank"
                  value={formData.NAME_OF_BANK}
                  onChange={(e) => handleChange('NAME_OF_BANK', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  BRANCH <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legon Main Branch"
                  value={formData.BRANCH}
                  onChange={(e) => handleChange('BRANCH', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  BANK ACCOUNT NUMBER <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1011130049281"
                  value={formData.BANK_ACCOUNT_NUMBER}
                  onChange={(e) => handleChange('BANK_ACCOUNT_NUMBER', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Submission CTA */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700 block">Declaration &amp; Privacy:</span>
              I certify that all details submitted are accurate and may be verified with relevant authorities.
            </div>

            <button
              id="submit-public-form-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors shrink-0 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4 text-white" />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
