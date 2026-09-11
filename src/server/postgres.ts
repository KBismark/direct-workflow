import pg from 'pg';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
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
