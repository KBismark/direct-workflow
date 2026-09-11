import pg from 'pg';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
import { FormSubmissionData } from '../types.js';
import { db, getDefaultSheetTabName, generateInstitutionCode, reverseEngineerInstitutionCode } from './db.js';
import { syncInstitutionsWithMasterSheet } from './masterSheet.js';

dotenv.config();

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

export function getPostgresPool(): pg.Pool | null {
  dotenv.config();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    poolInstance.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err.message);
    });
  }
  return poolInstance;
}

export const pool = {
  query: (text: string, params?: any[]) => {
    const p = getPostgresPool();
    if (!p) {
      throw new Error('DATABASE_URL is not configured.');
    }
    return p.query(text, params);
  }
};

export { getDefaultSheetTabName, generateInstitutionCode, reverseEngineerInstitutionCode };

export async function getInstitutions(req: Request, res: Response) {
  try {
    dotenv.config();
    const p = getPostgresPool();
    if (!p) {
      return res.status(503).json({
        success: false,
        message: 'DATABASE_URL environment variable is not configured. Please set your PostgreSQL connection string in Settings.',
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    }

    const page = Math.max(1, parseInt(String(req.query.page || 1), 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || 10), 10) || 10));
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    let rows: any[] = [];
    let total = 0;

    if (search) {
      const searchPattern = `%${search}%`;
      const countResult = await p.query(
        'SELECT COUNT(*)::int as total FROM institutions WHERE institution_name ILIKE $1',
        [searchPattern]
      );
      total = parseInt(String(countResult.rows[0]?.total || 0), 10);

      const dataResult = await p.query(
        'SELECT id, institution_name FROM institutions WHERE institution_name ILIKE $1 ORDER BY institution_name ASC LIMIT $2 OFFSET $3',
        [searchPattern, limit, offset]
      );
      rows = dataResult.rows;
    } else {
      const countResult = await p.query('SELECT COUNT(*)::int as total FROM institutions');
      total = parseInt(String(countResult.rows[0]?.total || 0), 10);

      const dataResult = await p.query(
        'SELECT id, institution_name FROM institutions ORDER BY institution_name ASC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      rows = dataResult.rows;
    }

    const synced = db.syncInstitutionsFromPostgres(rows);
    const totalPages = Math.ceil(total / limit) || (total > 0 ? 1 : 0);

    return res.json({
      success: true,
      data: synced,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('PostgreSQL query error:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to query institutions from PostgreSQL: ${error.message}`,
      data: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
  }
}

export async function ensureInstitutionsLoaded() {
  try {
    // First load any persisted mappings from the Master Google Sheet
    try {
      const masterSync = await syncInstitutionsWithMasterSheet();
      if (masterSync.success) {
        console.log(`Master Sheet: Loaded ${masterSync.syncedCount} institution mapping(s).`);
      }
    } catch (mErr: any) {
      console.warn('Master Sheet initial sync notice:', mErr.message);
    }

    dotenv.config();
    const p = getPostgresPool();
    if (!p) {
      console.log('PostgreSQL: DATABASE_URL not configured. Waiting for environment variable.');
      return;
    }
    // Limit initial preload to first 20 records to optimize cold start
    const result = await p.query('SELECT id, institution_name FROM institutions ORDER BY institution_name ASC LIMIT 20');
    if (result.rows && result.rows.length > 0) {
      db.syncInstitutionsFromPostgres(result.rows);
      console.log(`PostgreSQL: Preloaded ${result.rows.length} institutions.`);
    }
  } catch (err: any) {
    console.warn('PostgreSQL initial load notice:', err.message);
  }
}

export async function getInstitutionFromPostgresById(id: number | string) {
  try {
    dotenv.config();
    const p = getPostgresPool();
    if (!p) return undefined;

    const numId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (!isNaN(numId)) {
      const result = await p.query('SELECT id, institution_name FROM institutions WHERE id = $1 LIMIT 1', [numId]);
      if (result.rows && result.rows.length > 0) {
        const synced = db.syncInstitutionsFromPostgres(result.rows);
        return synced.find(i => String(i.id) === String(numId));
      }
    }
  } catch (err: any) {
    console.warn(`PostgreSQL lookup error for id ${id}:`, err.message);
  }
  return undefined;
}

type ApplicantDetailsData = Pick<
  FormSubmissionData,
  | 'SURNAME'
  | 'OTHER_NAME'
  | 'DATE_OF_EMPLOYMENT'
  | 'GENDER'
  | 'DATE_OF_BIRTH'
  | 'MARITAL_STATUS'
  | 'RESIDENTIAL_DIGITAL_ADDRESS'
  | 'PERSONNEL_MOBILE'
  | 'INSTITUTION_NAME'
  | 'MONTHLY_NET_SALARY'
  | 'GHANA_CARD_NUMBER'
  | 'GUARANTOR_FULL_NAME'
  | 'GUARANTOR_MOBILE_NUMBER'
  | 'NAME_OF_BANK'
  | 'BANK_ACCOUNT_NUMBER'
>;

const applicantDetailsColumns = [
  'sname',
  'oname',
  'joining_date',
  'date_of_employment',
  'gender',
  'dob',
  'mstatus',
  'address',
  'mobile',
  'cno',
  'mobile_number',
  'department',
  'monthly_net_salary',
  'staff_id',
  'ghana_card_number',
  'guarantor_name',
  'guarantor_contact',
  'bank',
  'accnum',
];

const toNullableString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value);
  return text === '' ? null : text;
};

const toNullableNumber = (value: unknown, fieldName: string): number | null => {
  const raw = value === undefined || value === null ? '' : String(value).trim();
  if (raw === '') return null;
  const numberValue = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return numberValue;
};

const toDateValue = (value: unknown, fieldName: string): string | null => {
  const raw = value === undefined || value === null ? '' : String(value).trim();
  if (raw === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`${fieldName} must be a valid date`);
    }
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value) && value > 0 && value < 100000) {
      return new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  throw new Error(`${fieldName} must be a valid date`);
};

export async function createApplicantDetails(applicantData: ApplicantDetailsData) {
  const values = [
    toNullableString(applicantData.SURNAME),
    toNullableString(applicantData.OTHER_NAME),
    toNullableString(applicantData.DATE_OF_EMPLOYMENT),
    toDateValue(applicantData.DATE_OF_EMPLOYMENT, 'Date of Employment'),
    toNullableString(applicantData.GENDER),
    toNullableString(applicantData.DATE_OF_BIRTH),
    toNullableString(applicantData.MARITAL_STATUS),
    toNullableString(applicantData.RESIDENTIAL_DIGITAL_ADDRESS),
    toNullableString(applicantData.PERSONNEL_MOBILE),
    toNullableString(applicantData.PERSONNEL_MOBILE),
    toNullableString(applicantData.PERSONNEL_MOBILE),
    toNullableString(applicantData.INSTITUTION_NAME),
    toNullableNumber(applicantData.MONTHLY_NET_SALARY, 'Monthly Net Salary'),
    toNullableString(applicantData.GHANA_CARD_NUMBER),
    toNullableString(applicantData.GHANA_CARD_NUMBER),
    toNullableString(applicantData.GUARANTOR_FULL_NAME),
    toNullableString(applicantData.GUARANTOR_MOBILE_NUMBER),
    toNullableString(applicantData.NAME_OF_BANK),
    toNullableString(applicantData.BANK_ACCOUNT_NUMBER),
  ];

  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  const sql = `INSERT INTO public.applicant_details (${applicantDetailsColumns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
  const result = await pool.query(sql, values);
  return result.rows?.[0] ? { id: result.rows[0].id } : null;
}
