export type ResponseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface FormSubmissionData {
  SURNAME: string;
  OTHER_NAME: string;
  DATE_OF_EMPLOYMENT: string;
  GENDER: 'Male' | 'Female' | 'Other' | '';
  DATE_OF_BIRTH: string;
  MARITAL_STATUS: 'Single' | 'Married' | 'Divorced' | 'Widowed' | '';
  RESIDENTIAL_DIGITAL_ADDRESS: string;
  PERSONNEL_MOBILE: string;
  INSTITUTION_NAME: string;
  MONTHLY_NET_SALARY: number | string;
  GHANA_CARD_NUMBER: string;
  PLACE_OF_WORK_DIGITAL_ADDRESS: string;
  GUARANTOR_FULL_NAME: string;
  GUARANTOR_MOBILE_NUMBER: string;
  GUARANTOR_PLACE_OF_WORK: string;
  GUARANTOR_DIGITAL_ADDRESS: string;
  GUARANTOR_JOB_DETAIL: string;
  GUARANTOR_NET_SALARY: number | string;
  NAME_OF_BANK: string;
  BRANCH: string;
  BANK_ACCOUNT_NUMBER: string;
}

export interface FormSubmissionRecord extends FormSubmissionData {
  id: string;
  referenceNumber: string;
  institutionId: string;
  institutionName: string;
  status: ResponseStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  syncedToGoogleSheet?: boolean;
  lastSyncedAt?: string;
  smsSent?: boolean;
  smsSentAt?: string;
  smsStatus?: string;
  smsError?: string;
}

export interface Institution {
  id: string;
  name: string;
  institution_name?: string;
  code: string;
  secureToken: string;
  spreadsheetId?: string;
  sheetWebhookUrl?: string;
  sheetTabName?: string;
  createdAt: string;
  description?: string;
  contactEmail?: string;
  totalSubmissions?: number;
  pendingCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
}

export interface PublicInstitutionInfo {
  id: string;
  name: string;
  code: string;
  secureToken: string;
  description?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
