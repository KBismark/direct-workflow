import { ApiResponse, FormSubmissionData, FormSubmissionRecord, Institution, PaginationMeta, PublicInstitutionInfo } from '../types';

export const apiClient = {
  // Get list of institutions with pagination and search
  async getInstitutions(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: Institution[]; pagination: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search && params.search.trim()) searchParams.set('search', params.search.trim());

    const qs = searchParams.toString();
    const url = qs ? `/api/institutions?${qs}` : '/api/institutions';
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.message || json.error || 'Failed to fetch institutions');
    }
    const institutions: Institution[] = (json.data as any[]).map((item: any) => ({
      ...item,
      name: item.name || item.institution_name,
      institution_name: item.institution_name || item.name,
    }));
    return {
      data: institutions,
      pagination: json.pagination || {
        total: institutions.length,
        page: params?.page || 1,
        limit: params?.limit || institutions.length,
        totalPages: 1,
      },
    };
  },

  // Create new institution
  async createInstitution(data: {
    name: string;
    code: string;
    spreadsheetId?: string;
    sheetWebhookUrl?: string;
    sheetTabName?: string;
    description?: string;
    contactEmail?: string;
  }): Promise<Institution> {
    const res = await fetch('/api/institutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json: ApiResponse<Institution> = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to create institution');
    }
    return json.data;
  },

  // Update institution
  async updateInstitution(id: string, updates: Partial<Institution>): Promise<Institution> {
    const res = await fetch(`/api/institutions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json: ApiResponse<Institution> = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to update institution');
    }
    return json.data;
  },

  // Get public institution metadata by unique token
  async getPublicInstitution(token: string): Promise<PublicInstitutionInfo> {
    const res = await fetch(`/api/public/institution/${token}`);
    const json: ApiResponse<PublicInstitutionInfo> = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Invalid institutional link');
    }
    return json.data;
  },

  // Submit public form
  async submitPublicForm(
    token: string,
    formData: FormSubmissionData
  ): Promise<{ id: string; referenceNumber: string; institutionName: string; submittedAt: string }> {
    const res = await fetch(`/api/public/submit/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to submit response');
    }
    return json.data;
  },

  // Get spreadsheet responses for an institution (acting directly on Google Spreadsheet database)
  async getInstitutionResponses(
    institutionId: string,
    query?: string,
    status?: string
  ): Promise<{
    institution: any;
    total: number;
    data: FormSubmissionRecord[];
    source?: string;
    message?: string;
    sheetTabName?: string;
  }> {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status && status !== 'ALL') params.set('status', status);

    const res = await fetch(`/api/institutions/${institutionId}/responses?${params.toString()}`);
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Failed to fetch responses');
    }
    return json;
  },

  // Approve or Reject response directly in Google Spreadsheet
  async updateResponseStatus(
    responseId: string,
    status: 'APPROVED' | 'REJECTED',
    notes?: string,
    meta?: {
      institutionId?: string;
      referenceNumber?: string;
      mobile?: string;
      surname?: string;
    }
  ): Promise<FormSubmissionRecord> {
    const res = await fetch(`/api/responses/${responseId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        notes,
        institutionId: meta?.institutionId,
        referenceNumber: meta?.referenceNumber,
        mobile: meta?.mobile,
        surname: meta?.surname,
      }),
    });
    const json: ApiResponse<FormSubmissionRecord> = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to update response status');
    }
    return json.data;
  },

  // Sync / test Google Sheets
  async syncGoogleSheets(institutionId: string) {
    const res = await fetch(`/api/institutions/${institutionId}/sync-sheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test' }),
    });
    return res.json();
  },

  // Push all existing submissions for institution to Google Sheet
  async syncAllSubmissionsToGoogleSheets(institutionId: string) {
    const res = await fetch(`/api/institutions/${institutionId}/sync-sheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync_all' }),
    });
    return res.json();
  },

  // Test live webhook URL candidate
  async testWebhookCandidate(
    institutionId: string,
    params: { sheetWebhookUrl: string; spreadsheetId?: string; sheetTabName?: string }
  ) {
    const res = await fetch(`/api/institutions/${institutionId}/test-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  // Get script template
  async getScriptTemplate(): Promise<string> {
    const res = await fetch('/api/docs/script-template');
    const json = await res.json();
    return json.script || '';
  },

  // Reset demo
  async resetDemoData(): Promise<void> {
    await fetch('/api/admin/reset-demo', { method: 'POST' });
  },
};
