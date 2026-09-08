import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db.js';
import { getInstitutions, ensureInstitutionsLoaded } from './src/server/postgres.js';
import {
  syncSubmissionToGoogleSheet,
  testGoogleSheetWebhook,
  syncAllSubmissionsToGoogleSheet,
  generateSubmissionsCsv,
  getGoogleAppsScriptTemplate,
} from './src/server/googleSheets.js';
import { sendSms } from './src/server/sms.js';
import { FormSubmissionData } from './src/types.js';

const PORT = 3000;

async function startServer() {
  const app = express();

  // Standard middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS middleware for external API consumers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'institutional-form-sheet-manager',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // -------------------------------------------------------------
  // API: Institutions
  // -------------------------------------------------------------

  // Get all institutions with summary stats - sourced from PostgreSQL
  app.get('/api/institutions', async (req: Request, res: Response) => {
    return getInstitutions(req, res);
  });

  // Create new institution is on hold - institutions are sourced from PostgreSQL
  app.post('/api/institutions', (req: Request, res: Response) => {
    return res.status(403).json({
      success: false,
      message: 'Creating new institutions is currently on hold. Institutions are synchronized directly from your PostgreSQL database.',
    });
  });

  // Get single institution
  app.get('/api/institutions/:id', (req: Request, res: Response) => {
    const inst = db.getInstitutionById(req.params.id);
    if (!inst) {
      return res.status(404).json({ success: false, error: 'Institution not found.' });
    }
    res.json({ success: true, data: inst });
  });

  // Update institution (e.g. update Google Sheet ID or webhook)
  app.put('/api/institutions/:id', (req: Request, res: Response) => {
    const updated = db.updateInstitution(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Institution not found.' });
    }
    res.json({ success: true, data: updated });
  });

  // -------------------------------------------------------------
  // API: Public Form Routing (No login required, secure by token)
  // -------------------------------------------------------------

  // Validate public token & retrieve institution metadata for the form view
  app.get('/api/public/institution/:token', (req: Request, res: Response) => {
    const inst = db.getInstitutionByToken(req.params.token);
    if (!inst) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired institutional form link. Please verify with your institution administrator.',
      });
    }

    // Return sanitized public info only - protect internal IDs and credentials
    res.json({
      success: true,
      data: {
        id: inst.id,
        name: inst.name,
        code: inst.code,
        secureToken: inst.secureToken,
        description: inst.description,
        contactEmail: inst.contactEmail,
      },
    });
  });

  // Public submission endpoint - routes data to this specific institution
  app.post('/api/public/submit/:token', async (req: Request, res: Response) => {
    const inst = db.getInstitutionByToken(req.params.token);
    if (!inst) {
      return res.status(404).json({
        success: false,
        error: 'Invalid institutional link. Form submission aborted.',
      });
    }

    const payload = req.body as FormSubmissionData;

    // Validate mandatory fields
    if (!payload.SURNAME || !payload.OTHER_NAME || !payload.PERSONNEL_MOBILE || !payload.GHANA_CARD_NUMBER) {
      return res.status(400).json({
        success: false,
        error: 'Surname, Other Name, Mobile Number, and Ghana Card Number are required.',
      });
    }

    // Ensure the institution name matches the bound institution
    payload.INSTITUTION_NAME = inst.name;

    // Create record in database
    const record = db.createSubmission(inst, payload);

    // Asynchronously push to the institution's Google Sheet Webhook if configured
    let sheetSyncResult: any = null;
    if (inst.sheetWebhookUrl) {
      sheetSyncResult = await syncSubmissionToGoogleSheet(inst, record, 'NEW_SUBMISSION');
    }

    res.status(201).json({
      success: true,
      data: {
        id: record.id,
        referenceNumber: record.referenceNumber,
        institutionName: inst.name,
        submittedAt: record.submittedAt,
        status: record.status,
        sheetSync: sheetSyncResult,
      },
      message: 'Form submitted successfully.',
    });
  });

  // -------------------------------------------------------------
  // API: Spreadsheet Responses & Administration
  // -------------------------------------------------------------

  // Get all submissions for an institution (acting as the spreadsheet data API)
  app.get('/api/institutions/:id/responses', (req: Request, res: Response) => {
    const inst = db.getInstitutionById(req.params.id);
    if (!inst) {
      return res.status(404).json({ success: false, error: 'Institution not found.' });
    }

    let records = db.getSubmissions(inst.id);

    // Search query filter
    const q = (req.query.q as string || '').toLowerCase().trim();
    if (q) {
      records = records.filter(r =>
        r.SURNAME.toLowerCase().includes(q) ||
        r.OTHER_NAME.toLowerCase().includes(q) ||
        r.GHANA_CARD_NUMBER.toLowerCase().includes(q) ||
        r.PERSONNEL_MOBILE.includes(q) ||
        r.referenceNumber.toLowerCase().includes(q) ||
        r.NAME_OF_BANK.toLowerCase().includes(q)
      );
    }

    // Status filter
    const status = (req.query.status as string || '').toUpperCase();
    if (status && status !== 'ALL') {
      records = records.filter(r => r.status === status);
    }

    res.json({
      success: true,
      institution: {
        id: inst.id,
        name: inst.name,
        code: inst.code,
        spreadsheetId: inst.spreadsheetId,
        sheetTabName: inst.sheetTabName,
      },
      total: records.length,
      data: records,
    });
  });

  // Get single response detail by ID
  app.get('/api/responses/:id', (req: Request, res: Response) => {
    const record = db.getSubmissionById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Submission not found.' });
    }
    res.json({ success: true, data: record });
  });

  // Action button: Approve or Reject a response
  // Reflects in actual Google Sheet
  app.patch('/api/responses/:id/status', async (req: Request, res: Response) => {
    const { status, notes, reviewedBy } = req.body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status must be either 'APPROVED' or 'REJECTED'.",
      });
    }

    const updated = db.updateSubmissionStatus(req.params.id, status, notes, reviewedBy);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Submission record not found.' });
    }

    const inst = db.getInstitutionById(updated.institutionId);
    let sheetSyncResult: any = null;

    if (inst) {
      // Sync update to Google Sheet first so the approval reflects in the spreadsheet tab
      sheetSyncResult = await syncSubmissionToGoogleSheet(inst, updated, 'UPDATE_STATUS');
    }

    // After approval has reflected in the institution's spreadsheet tab, send SMS if approved
    let smsResult: any = null;
    let finalRecord = updated;

    if (status === 'APPROVED') {
      try {
        smsResult = await sendSms({
          mobile: updated.PERSONNEL_MOBILE,
          surname: updated.SURNAME,
        });

        const smsData = {
          smsSent: Boolean(smsResult?.success),
          smsStatus: smsResult?.success ? 'SENT' : (smsResult?.skipped ? 'SKIPPED' : 'FAILED'),
          smsSentAt: smsResult?.success ? new Date().toISOString() : undefined,
          smsError: smsResult?.error || smsResult?.reason || undefined,
        };

        const withSms = db.updateSubmissionSms(updated.id, smsData);
        if (withSms) {
          finalRecord = withSms;
        }
      } catch (err: any) {
        console.error('Error in approval SMS process:', err);
        smsResult = { success: false, error: err.message };
      }
    }

    let message = `Response ${status.toLowerCase()} successfully and synchronized with Google Sheet.`;
    if (status === 'APPROVED') {
      if (smsResult?.success) {
        message += ` SMS notification delivered to ${smsResult.recipient || updated.PERSONNEL_MOBILE}.`;
      } else if (smsResult?.skipped) {
        message += ` (SMS skipped: ${smsResult.reason})`;
      } else if (smsResult?.error) {
        message += ` (SMS sending error: ${smsResult.error})`;
      }
    }

    res.json({
      success: true,
      data: finalRecord,
      sheetSync: sheetSyncResult,
      sms: smsResult,
      message,
    });
  });

  // Manual Trigger: Sync or test Google Sheet connection for institution
  app.post('/api/institutions/:id/sync-sheets', async (req: Request, res: Response) => {
    const inst = db.getInstitutionById(req.params.id);
    if (!inst) {
      return res.status(404).json({ success: false, error: 'Institution not found.' });
    }

    const { action } = req.body || {};
    const submissions = db.getSubmissions(inst.id);

    // If action is 'sync_all', push all existing submissions to the Google Sheet
    if (action === 'sync_all') {
      if (!inst.sheetWebhookUrl) {
        return res.status(400).json({
          success: false,
          error: 'No Google Sheet Webhook URL configured. Please paste your Web App URL in settings first.',
        });
      }

      const syncResult = await syncAllSubmissionsToGoogleSheet(inst, submissions);
      return res.json({
        success: syncResult.success,
        message: syncResult.message,
        syncedCount: syncResult.syncedCount,
        total: submissions.length,
        stats: {
          institution: inst.name,
          spreadsheetId: inst.spreadsheetId || '(Not yet set)',
          sheetTabName: inst.sheetTabName || 'Responses',
          webhookConfigured: true,
          totalRowsReady: submissions.length,
          syncedRows: syncResult.syncedCount,
        },
      });
    }

    // Default action: Live test the webhook connection
    const testResult = await testGoogleSheetWebhook(inst);

    res.json({
      success: testResult.success,
      message: testResult.message,
      latencyMs: testResult.latencyMs,
      stats: {
        institution: inst.name,
        spreadsheetId: inst.spreadsheetId || '(Not yet set)',
        sheetTabName: inst.sheetTabName || 'Responses',
        webhookConfigured: Boolean(inst.sheetWebhookUrl),
        totalRowsReady: submissions.length,
        syncedRows: submissions.filter(s => s.syncedToGoogleSheet).length,
      },
    });
  });

  // Test arbitrary Webhook URL during modal editing
  app.post('/api/institutions/:id/test-webhook', async (req: Request, res: Response) => {
    const inst = db.getInstitutionById(req.params.id);
    if (!inst) {
      return res.status(404).json({ success: false, error: 'Institution not found.' });
    }

    const candidateUrl = req.body?.sheetWebhookUrl || inst.sheetWebhookUrl;
    const testInst = {
      ...inst,
      sheetWebhookUrl: candidateUrl,
      spreadsheetId: req.body?.spreadsheetId || inst.spreadsheetId,
      sheetTabName: req.body?.sheetTabName || inst.sheetTabName,
    };

    const testResult = await testGoogleSheetWebhook(testInst);
    res.json(testResult);
  });

  // Export responses to CSV (compatible with Google Sheets & Excel)
  app.get('/api/institutions/:id/export.csv', (req: Request, res: Response) => {
    const inst = db.getInstitutionById(req.params.id);
    if (!inst) {
      return res.status(404).send('Institution not found');
    }

    const submissions = db.getSubmissions(inst.id);
    const csv = generateSubmissionsCsv(submissions);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${inst.code}_responses_${Date.now()}.csv"`);
    res.send(csv);
  });

  // Google Apps Script template code
  app.get('/api/docs/script-template', (req: Request, res: Response) => {
    res.json({
      success: true,
      script: getGoogleAppsScriptTemplate(),
    });
  });

  // Reset demo data
  app.post('/api/admin/reset-demo', (req: Request, res: Response) => {
    db.resetToDefaults();
    res.json({ success: true, message: 'Data reset to initial state with sample institutions and responses.' });
  });

  // -------------------------------------------------------------
  // Vite Integration (Dev) or Static Assets (Prod)
  // -------------------------------------------------------------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    ensureInstitutionsLoaded();
  });
}

startServer();
