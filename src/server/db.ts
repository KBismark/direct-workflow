import fs from 'fs';
import path from 'path';
import { Institution, FormSubmissionRecord, FormSubmissionData } from '../types.js';

interface DatabaseSchema {
  institutions: Institution[];
  submissions: FormSubmissionRecord[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Initial seed institutions
const INITIAL_INSTITUTIONS: Institution[] = [
  {
    id: 'inst-1',
    name: 'University of Ghana (UG)',
    code: 'UG-LEGON',
    secureToken: 'ug_legon_8f2b1a9c4e7d0f3b',
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    sheetWebhookUrl: 'https://script.google.com/macros/s/AKfycby-demo-ug-sheet-webhook/exec',
    sheetTabName: 'Staff Onboarding',
    createdAt: '2025-01-15T08:30:00.000Z',
    description: 'Human Resources Directorate & Registry submissions',
    contactEmail: 'hr@ug.edu.gh',
  },
  {
    id: 'inst-2',
    name: 'Ghana Health Service (GHS)',
    code: 'GHS-HQ',
    secureToken: 'ghs_accra_3a7d9e1f5c8b2e4a',
    spreadsheetId: '1GhsMVs8XRHealthServiceSpreadsheetId2025Demo',
    sheetWebhookUrl: 'https://script.google.com/macros/s/AKfycbz-demo-ghs-sheet-webhook/exec',
    sheetTabName: 'Personnel Records',
    createdAt: '2025-02-01T10:15:00.000Z',
    description: 'Greater Accra Regional Health Directorate',
    contactEmail: 'records@ghs.gov.gh',
  },
  {
    id: 'inst-3',
    name: 'Accra Technical Training Centre (ATTC)',
    code: 'ATTC-KOKOMLEMLE',
    secureToken: 'attc_accra_7e4c2b9a1d8f5a3e',
    spreadsheetId: '1AttcMVs7TechTrainingCentreSpreadsheetId2025',
    sheetWebhookUrl: '',
    sheetTabName: 'Staff Responses',
    createdAt: '2025-02-20T14:45:00.000Z',
    description: 'Technical and vocational educator registry',
    contactEmail: 'admin@attc.edu.gh',
  },
];

// Initial seed submissions with realistic Ghana data for all 21 fields
const INITIAL_SUBMISSIONS: FormSubmissionRecord[] = [
  {
    id: 'sub-1',
    referenceNumber: 'REF-2025-84910',
    institutionId: 'inst-1',
    institutionName: 'University of Ghana (UG)',
    status: 'PENDING',
    submittedAt: '2025-03-01T09:14:22.000Z',
    syncedToGoogleSheet: true,
    lastSyncedAt: '2025-03-01T09:14:25.000Z',
    SURNAME: 'MENSAH',
    OTHER_NAME: 'Kwame Evans',
    DATE_OF_EMPLOYMENT: '2023-08-15',
    GENDER: 'Male',
    DATE_OF_BIRTH: '1989-05-24',
    MARITAL_STATUS: 'Married',
    RESIDENTIAL_DIGITAL_ADDRESS: 'GA-183-9022',
    PERSONNEL_MOBILE: '0244123890',
    INSTITUTION_NAME: 'University of Ghana (UG)',
    MONTHLY_NET_SALARY: 5400,
    GHANA_CARD_NUMBER: 'GHA-712398412-4',
    PLACE_OF_WORK_DIGITAL_ADDRESS: 'GA-489-1029',
    GUARANTOR_FULL_NAME: 'Dr. Joseph Kofi Boateng',
    GUARANTOR_MOBILE_NUMBER: '0208119045',
    GUARANTOR_PLACE_OF_WORK: 'Korle Bu Teaching Hospital',
    GUARANTOR_DIGITAL_ADDRESS: 'GA-092-3140',
    GUARANTOR_JOB_DETAIL: 'Senior Medical Officer',
    GUARANTOR_NET_SALARY: 9800,
    NAME_OF_BANK: 'GCB Bank PLC',
    BRANCH: 'Legon Main Branch',
    BANK_ACCOUNT_NUMBER: '1011130049281',
  },
  {
    id: 'sub-2',
    referenceNumber: 'REF-2025-84911',
    institutionId: 'inst-1',
    institutionName: 'University of Ghana (UG)',
    status: 'APPROVED',
    submittedAt: '2025-03-02T11:20:00.000Z',
    reviewedAt: '2025-03-03T14:10:00.000Z',
    reviewedBy: 'Admin (UG HR Registry)',
    approvalNotes: 'Verified with GCB Bank and National Identification Authority.',
    syncedToGoogleSheet: true,
    lastSyncedAt: '2025-03-03T14:10:05.000Z',
    SURNAME: 'AGYEMANG',
    OTHER_NAME: 'Akua Serwaa',
    DATE_OF_EMPLOYMENT: '2022-11-01',
    GENDER: 'Female',
    DATE_OF_BIRTH: '1992-10-14',
    MARITAL_STATUS: 'Single',
    RESIDENTIAL_DIGITAL_ADDRESS: 'GW-0294-8120',
    PERSONNEL_MOBILE: '0553901824',
    INSTITUTION_NAME: 'University of Ghana (UG)',
    MONTHLY_NET_SALARY: 4850,
    GHANA_CARD_NUMBER: 'GHA-908234192-1',
    PLACE_OF_WORK_DIGITAL_ADDRESS: 'GA-489-1029',
    GUARANTOR_FULL_NAME: 'Emmanuel Osei Tutu',
    GUARANTOR_MOBILE_NUMBER: '0243109283',
    GUARANTOR_PLACE_OF_WORK: 'Electricity Company of Ghana',
    GUARANTOR_DIGITAL_ADDRESS: 'GA-112-9014',
    GUARANTOR_JOB_DETAIL: 'Principal Electrical Engineer',
    GUARANTOR_NET_SALARY: 8200,
    NAME_OF_BANK: 'Ecobank Ghana',
    BRANCH: 'Silver Star Airport City Branch',
    BANK_ACCOUNT_NUMBER: '0020194829103',
  },
  {
    id: 'sub-3',
    referenceNumber: 'REF-2025-84912',
    institutionId: 'inst-1',
    institutionName: 'University of Ghana (UG)',
    status: 'REJECTED',
    submittedAt: '2025-03-04T16:05:40.000Z',
    reviewedAt: '2025-03-05T08:45:00.000Z',
    reviewedBy: 'Admin (UG HR Registry)',
    rejectionReason: 'Invalid Guarantor digital address and incomplete salary slips provided.',
    syncedToGoogleSheet: true,
    lastSyncedAt: '2025-03-05T08:45:04.000Z',
    SURNAME: 'DORGBETOR',
    OTHER_NAME: 'Selasie Mawuli',
    DATE_OF_EMPLOYMENT: '2024-01-10',
    GENDER: 'Male',
    DATE_OF_BIRTH: '1995-02-18',
    MARITAL_STATUS: 'Single',
    RESIDENTIAL_DIGITAL_ADDRESS: 'GD-190-4820',
    PERSONNEL_MOBILE: '0277812903',
    INSTITUTION_NAME: 'University of Ghana (UG)',
    MONTHLY_NET_SALARY: 3950,
    GHANA_CARD_NUMBER: 'GHA-629104823-8',
    PLACE_OF_WORK_DIGITAL_ADDRESS: 'GA-489-1029',
    GUARANTOR_FULL_NAME: 'Francisca Adjei',
    GUARANTOR_MOBILE_NUMBER: '0501239841',
    GUARANTOR_PLACE_OF_WORK: 'Private Practice Consult',
    GUARANTOR_DIGITAL_ADDRESS: 'GD-000-0000',
    GUARANTOR_JOB_DETAIL: 'Office Assistant',
    GUARANTOR_NET_SALARY: 1800,
    NAME_OF_BANK: 'Stanbic Bank Ghana',
    BRANCH: 'Achimota Mall Branch',
    BANK_ACCOUNT_NUMBER: '9040003928174',
  },
  {
    id: 'sub-4',
    referenceNumber: 'REF-2025-84913',
    institutionId: 'inst-2',
    institutionName: 'Ghana Health Service (GHS)',
    status: 'PENDING',
    submittedAt: '2025-03-05T10:30:15.000Z',
    syncedToGoogleSheet: true,
    lastSyncedAt: '2025-03-05T10:30:20.000Z',
    SURNAME: 'QUAYE',
    OTHER_NAME: 'Naa Densua Beatrice',
    DATE_OF_EMPLOYMENT: '2021-04-12',
    GENDER: 'Female',
    DATE_OF_BIRTH: '1987-12-03',
    MARITAL_STATUS: 'Married',
    RESIDENTIAL_DIGITAL_ADDRESS: 'GS-039-1102',
    PERSONNEL_MOBILE: '0244983021',
    INSTITUTION_NAME: 'Ghana Health Service (GHS)',
    MONTHLY_NET_SALARY: 6200,
    GHANA_CARD_NUMBER: 'GHA-501928471-3',
    PLACE_OF_WORK_DIGITAL_ADDRESS: 'GA-029-4821',
    GUARANTOR_FULL_NAME: 'Stephen Annan Quaye',
    GUARANTOR_MOBILE_NUMBER: '0244778899',
    GUARANTOR_PLACE_OF_WORK: 'Ghana Ports and Harbours Authority',
    GUARANTOR_DIGITAL_ADDRESS: 'GT-012-9901',
    GUARANTOR_JOB_DETAIL: 'Logistics Operations Director',
    GUARANTOR_NET_SALARY: 11500,
    NAME_OF_BANK: 'Absa Bank Ghana',
    BRANCH: 'High Street Branch, Accra',
    BANK_ACCOUNT_NUMBER: '0491029381',
  },
  {
    id: 'sub-5',
    referenceNumber: 'REF-2025-84914',
    institutionId: 'inst-3',
    institutionName: 'Accra Technical Training Centre (ATTC)',
    status: 'APPROVED',
    submittedAt: '2025-03-06T14:22:10.000Z',
    reviewedAt: '2025-03-06T15:00:00.000Z',
    reviewedBy: 'ATTC Administrator',
    approvalNotes: 'Technical instructor credentials verified.',
    syncedToGoogleSheet: false,
    SURNAME: 'BOAKYE',
    OTHER_NAME: 'Yaw Frimpong',
    DATE_OF_EMPLOYMENT: '2020-09-01',
    GENDER: 'Male',
    DATE_OF_BIRTH: '1985-07-19',
    MARITAL_STATUS: 'Married',
    RESIDENTIAL_DIGITAL_ADDRESS: 'GA-219-4890',
    PERSONNEL_MOBILE: '0265432190',
    INSTITUTION_NAME: 'Accra Technical Training Centre (ATTC)',
    MONTHLY_NET_SALARY: 4600,
    GHANA_CARD_NUMBER: 'GHA-829104712-0',
    PLACE_OF_WORK_DIGITAL_ADDRESS: 'GA-110-8201',
    GUARANTOR_FULL_NAME: 'Gladys Ampofo',
    GUARANTOR_MOBILE_NUMBER: '0209988771',
    GUARANTOR_PLACE_OF_WORK: 'Ghana Education Service HQ',
    GUARANTOR_DIGITAL_ADDRESS: 'GA-050-2219',
    GUARANTOR_JOB_DETAIL: 'Assistant Director I',
    GUARANTOR_NET_SALARY: 7100,
    NAME_OF_BANK: 'Fidelity Bank Ghana',
    BRANCH: 'Ridge Towers Branch',
    BANK_ACCOUNT_NUMBER: '2093810293819',
  },
];

export function getDefaultSheetTabName(name: string): string {
  if (!name || typeof name !== 'string') return 'Responses';
  const clean = name.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= 3) {
    return words.join(' ');
  }
  return `${words[0]} ${words[1]} ${words[2]}`;
}

export function generateInstitutionCode(name: string): string {
  if (!name) return 'INST';
  const words = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].substring(0, 6).toUpperCase();
  }
  return words.map((w) => w[0]).join('').substring(0, 6).toUpperCase();
}

class Database {
  private institutions: Institution[] = [];
  private submissions: FormSubmissionRecord[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        this.institutions = parsed.institutions || [];
        this.submissions = parsed.submissions || [];
      } else {
        this.institutions = [...INITIAL_INSTITUTIONS];
        this.submissions = [...INITIAL_SUBMISSIONS];
        this.save();
      }
    } catch (err) {
      console.warn('Could not read persistent db.json, fallback to in-memory seeds', err);
      this.institutions = [...INITIAL_INSTITUTIONS];
      this.submissions = [...INITIAL_SUBMISSIONS];
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data: DatabaseSchema = {
        institutions: this.institutions,
        submissions: this.submissions,
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db.json:', err);
    }
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
    return list.find(inst => inst.id === id);
  }

  public getInstitutionByToken(token: string): Institution | undefined {
    return this.institutions.find(inst => inst.secureToken === token);
  }

  public syncInstitutionsFromPostgres(rows: Array<{ id: any; institution_name: string }>): Institution[] {
    const syncedList: Institution[] = [];

    for (const row of rows) {
      const id = String(row.id);
      const instName = (row.institution_name || `Institution ${id}`).trim();
      const defaultTab = getDefaultSheetTabName(instName);

      let existing = this.institutions.find(i => String(i.id) === id);

      if (!existing) {
        const code = generateInstitutionCode(instName);
        const randomHex = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        const secureToken = `inst_${code.toLowerCase()}_${id}_${randomHex}`;
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
        // Default to institution name shortened to first two words if more, unless explicitly customized
        if (!existing.sheetTabName) {
          existing.sheetTabName = defaultTab;
        }
      }

      const subs = this.submissions.filter(s => String(s.institutionId) === id);

      syncedList.push({
        ...existing,
        id,
        name: instName,
        code: existing.code || generateInstitutionCode(instName),
        secureToken: existing.secureToken,
        sheetTabName: existing.sheetTabName || defaultTab,
        totalSubmissions: subs.length,
        pendingCount: subs.filter(s => s.status === 'PENDING').length,
        approvedCount: subs.filter(s => s.status === 'APPROVED').length,
        rejectedCount: subs.filter(s => s.status === 'REJECTED').length,
      });
    }

    this.save();
    return syncedList;
  }

  public createInstitution(data: {
    name: string;
    code: string;
    spreadsheetId?: string;
    sheetWebhookUrl?: string;
    sheetTabName?: string;
    description?: string;
    contactEmail?: string;
  }): Institution {
    // Generate secure random token
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const sanitizedCode = data.code.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const secureToken = `inst_${sanitizedCode}_${randomHex}`;

    const newInst: Institution = {
      id: `inst-${Date.now()}`,
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
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
    this.save();
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

    this.save();
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
    this.save();
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

    this.save();
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

    this.save();
    return this.submissions[idx];
  }

  public resetToDefaults() {
    this.institutions = [...INITIAL_INSTITUTIONS];
    this.submissions = [...INITIAL_SUBMISSIONS];
    this.save();
  }
}

export const db = new Database();
