import { Institution, FormSubmissionRecord, FormSubmissionData } from '../types.js';

export function getDefaultSheetTabName(name: string): string {
  if (!name || typeof name !== 'string') return 'Responses';
  const clean = name.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= 3) {
    return words.join(' ');
  }
  return `${words[0]} ${words[1]} ${words[2]}`;
}

export function generateInstitutionCode(id: any): string {
  if (typeof id === 'string') {
    const num = parseInt(id.replace(/^[^\d]*/, ''), 10);
    if (!isNaN(num)) {
      id = num;
    }
  }

  if (typeof id !== 'number' || id < 0) return '0000000000';
  const reps = 'RDSBV4AP0Y';

  const initId = id;
  id += 2;
  id = id * id * 3.4;
  id += 83904;
  id = id * 3001;
  id = Math.floor(id / (initId + 2));
  const separationLen = initId.toString().length;
  const alphaLetter = String.fromCharCode(separationLen + 65);
  return `${alphaLetter}${initId.toString()}${id.toString()}`;
}

export function reverseEngineerInstitutionCode(code: any): number {
  if (!code || typeof code !== 'string') return NaN;
  const alphaLetter = code.charAt(0);
  const separationLen = alphaLetter.charCodeAt(0) - 65;
  if (separationLen <= 0 || isNaN(separationLen) || 1 + separationLen > code.length) return NaN;
  const initId = parseInt(code.slice(1, 1 + separationLen), 10);
  return initId;
}

class Database {
  private institutions: Institution[] = [];
  private submissions: FormSubmissionRecord[] = [];

  constructor() {
    this.init();
  }

  private init() {
    this.institutions = [];
    this.submissions = [];
  }

  public getInstitutions(): Institution[] {
    // Enrich with dynamic submission counts
    return this.institutions.map(inst => {
      const subs = this.submissions.filter(s => s.institutionId === inst.id);
      return {
        ...inst,
        totalSubmissions: subs.length,
        pendingCount: subs.filter(s => s.status === 'PENDING').length,
        approvedCount: subs.filter(s => s.status === 'APPROVED').length,
        rejectedCount: subs.filter(s => s.status === 'REJECTED').length,
      };
    });
  }

  public getInstitutionById(id: string): Institution | undefined {
    const list = this.getInstitutions();
    const found = list.find(inst => String(inst.id) === String(id));
    if (found) return found;

    try {
      const initId = reverseEngineerInstitutionCode(id);
      if (!isNaN(initId)) {
        return list.find(inst => String(inst.id) === String(initId));
      }
    } catch (err) {}

    return undefined;
  }

  public getInstitutionByToken(token: string): Institution | undefined {
    if (!token) return undefined;
    const cleanToken = token.trim();

    // 1. Try reverse engineering code to get original ID
    try {
      const initId = reverseEngineerInstitutionCode(cleanToken);
      if (!isNaN(initId)) {
        const found = this.institutions.find(i => String(i.id) === String(initId));
        if (found) return found;
      }
    } catch (err) {}

    // 2. Direct match on secureToken, code, or id
    return this.institutions.find(
      inst => inst.secureToken === cleanToken || inst.code === cleanToken || String(inst.id) === cleanToken
    );
  }

  public syncInstitutionsFromPostgres(rows: Array<{ id: any; institution_name: string }>): Institution[] {
    const syncedList: Institution[] = [];

    for (const row of rows) {
      const id = String(row.id);
      const instName = (row.institution_name || `Institution ${id}`).trim();
      const defaultTab = getDefaultSheetTabName(instName);
      const code = generateInstitutionCode(row.id);
      const secureToken = code;

      let existing = this.institutions.find(i => String(i.id) === id);

      if (!existing) {
        existing = {
          id,
          name: instName,
          code,
          secureToken,
          spreadsheetId: '',
          sheetWebhookUrl: '',
          sheetTabName: defaultTab,
          createdAt: new Date().toISOString(),
          description: '',
          contactEmail: '',
        };
        this.institutions.push(existing);
      } else {
        existing.name = instName;
        existing.code = code;
        existing.secureToken = secureToken;
        if (!existing.sheetTabName) {
          existing.sheetTabName = defaultTab;
        }
      }

      const subs = this.submissions.filter(s => String(s.institutionId) === id);

      syncedList.push({
        ...existing,
        id,
        name: instName,
        code,
        secureToken,
        sheetTabName: existing.sheetTabName || defaultTab,
        totalSubmissions: subs.length,
        pendingCount: subs.filter(s => s.status === 'PENDING').length,
        approvedCount: subs.filter(s => s.status === 'APPROVED').length,
        rejectedCount: subs.filter(s => s.status === 'REJECTED').length,
      });
    }

    return syncedList;
  }

  public createInstitution(data: {
    name: string;
    code?: string;
    spreadsheetId?: string;
    sheetWebhookUrl?: string;
    sheetTabName?: string;
    description?: string;
    contactEmail?: string;
  }): Institution {
    const nextId = this.institutions.length + 1;
    const id = String(nextId);
    const code = generateInstitutionCode(nextId);
    const secureToken = code;

    const newInst: Institution = {
      id,
      name: data.name.trim(),
      code,
      secureToken,
      spreadsheetId: data.spreadsheetId?.trim() || '',
      sheetWebhookUrl: data.sheetWebhookUrl?.trim() || '',
      sheetTabName: data.sheetTabName?.trim() || 'Responses',
      createdAt: new Date().toISOString(),
      description: data.description?.trim() || '',
      contactEmail: data.contactEmail?.trim() || '',
      totalSubmissions: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
    };

    this.institutions.push(newInst);
    return newInst;
  }

  public updateInstitution(id: string, updates: Partial<Institution>): Institution | null {
    const idx = this.institutions.findIndex(i => i.id === id);
    if (idx === -1) return null;

    this.institutions[idx] = {
      ...this.institutions[idx],
      ...updates,
      id, // protect ID
      secureToken: updates.secureToken || this.institutions[idx].secureToken, // protect token unless explicitly changed
    };

    return this.getInstitutionById(id) || null;
  }

  public getSubmissions(institutionId?: string): FormSubmissionRecord[] {
    let result = [...this.submissions];
    if (institutionId) {
      result = result.filter(s => s.institutionId === institutionId);
    }
    // Sort latest first
    return result.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  public getSubmissionById(id: string): FormSubmissionRecord | undefined {
    return this.submissions.find(s => s.id === id);
  }

  public createSubmission(institution: Institution, formData: FormSubmissionData): FormSubmissionRecord {
    const id = `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const randomRef = Math.floor(10000 + Math.random() * 90000);
    const referenceNumber = `REF-${new Date().getFullYear()}-${randomRef}`;

    const record: FormSubmissionRecord = {
      ...formData,
      id,
      referenceNumber,
      institutionId: institution.id,
      institutionName: institution.name,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      syncedToGoogleSheet: Boolean(institution.sheetWebhookUrl || institution.spreadsheetId),
      lastSyncedAt: institution.sheetWebhookUrl ? new Date().toISOString() : undefined,
    };

    this.submissions.unshift(record);
    return record;
  }

  public updateSubmissionStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    notes?: string,
    reviewedBy?: string
  ): FormSubmissionRecord | null {
    const idx = this.submissions.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const current = this.submissions[idx];
    const now = new Date().toISOString();

    this.submissions[idx] = {
      ...current,
      status,
      reviewedAt: now,
      reviewedBy: reviewedBy || 'Administrator',
      rejectionReason: status === 'REJECTED' ? notes : undefined,
      approvalNotes: status === 'APPROVED' ? notes : undefined,
      syncedToGoogleSheet: true,
      lastSyncedAt: now,
    };

    return this.submissions[idx];
  }

  public updateSubmissionSms(
    id: string,
    smsData: { smsSent: boolean; smsStatus?: string; smsSentAt?: string; smsError?: string }
  ): FormSubmissionRecord | null {
    const idx = this.submissions.findIndex(s => s.id === id);
    if (idx === -1) return null;

    this.submissions[idx] = {
      ...this.submissions[idx],
      ...smsData,
    };

    return this.submissions[idx];
  }

  public resetToDefaults() {
    this.institutions = [];
    this.submissions = [];
  }
}

export const db = new Database();
