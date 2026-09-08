import pg from 'pg';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
import { db, getDefaultSheetTabName, generateInstitutionCode } from './db.js';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export { getDefaultSheetTabName, generateInstitutionCode };

export async function getInstitutions(req: Request, res: Response) {
  try {
    dotenv.config();
    const result = await pool.query('SELECT id, institution_name FROM institutions ORDER BY institution_name ASC');
    const synced = db.syncInstitutionsFromPostgres(result.rows);
    res.json({ success: true, data: synced });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function ensureInstitutionsLoaded() {
  try {
    dotenv.config();
    if (process.env.DATABASE_URL) {
      const result = await pool.query('SELECT id, institution_name FROM institutions ORDER BY institution_name ASC');
      db.syncInstitutionsFromPostgres(result.rows);
    }
  } catch (err: any) {
    console.log('PostgreSQL connection info:', err.message);
  }
}
