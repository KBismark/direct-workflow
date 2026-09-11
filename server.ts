import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, getDefaultSheetTabName, reverseEngineerInstitutionCode } from './src/server/db.js';
import { getInstitutions, ensureInstitutionsLoaded, getInstitutionFromPostgresById } from './src/server/postgres.js';
import { createApplicantDetails } from './src/server/postgres.js';
import {
  syncSubmissionToGoogleSheet,
  testGoogleSheetWebhook,
  syncAllSubmissionsToGoogleSheet,
  generateSubmissionsCsv,
  getGoogleAppsScriptTemplate,
  fetchResponsesFromGoogleSheet,
  updateStatusInGoogleSheet,
} from './src/server/googleSheets.js';
import {
  getMasterSheetConfig,
  updateMasterSheetConfig,
  syncInstitutionsWithMasterSheet,
  upsertInstitutionInMasterSheet,
  testMasterSheetConnection,
  getMasterAppsScriptTemplate,
} from './src/server/masterSheet.js';
import { sendSms } from './src/server/sms.js';
import { FormSubmissionData, FormSubmissionRecord } from './src/types.js';

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
  app.get('/api/institutions/:id', async (req: Request, res: Response) => {
    let inst = db.getInstitutionById(req.params.id);
    if (!inst) {
      inst = await getInstitutionFromPostgresById(req.params.id);
    }
    if (!inst) {
      return res.status(404).json({ success: false, error: 'Institution not found.' });
    }
    res.json({ success: true, data: inst });
  });

  // Update institution (e.g. update Google Sheet ID or webhook)
  app.put('/api/institutions/:id', async (req: Request, res: Response) => {
    const updated = db.updateInstitution(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Institution not found.' });
    }

    // Approach B: Automatically reflect in Master Google Sheet registry row
    // If a row exists for that institution id, it updates it. If no row exists, it adds one!
    let masterSheetSyncResult: any = null;
    try {
      masterSheetSyncResult = await upsertInstitutionInMasterSheet(updated);
    } catch (err: any) {
      console.warn('Master Google Sheet upsert notice:', err.message);
      masterSheetSyncResult = { success: false, message: err.message };
    }

    res.json({
      success: true,
      data: updated,
      masterSheetSync: masterSheetSyncResult,
      message: masterSheetSyncResult?.success
        ? `Institution updated and reflected in Master Google Sheet registry row.`
        : `Institution updated locally.${masterSheetSyncResult?.message ? ` (${masterSheetSyncResult.message})` : ''}`,
    });
  });

  // -------------------------------------------------------------
  // API: Public Form Routing (No login required, secure by token)
  // -------------------------------------------------------------

  // Validate public token & retrieve institution metadata for the form view
  app.get('/api/public/institution/:token', async (req: Request, res: Response) => {
    const rawToken = req.params.token;

    // Use reverseEngineerInstitutionCode to derive institution ID from the institution code
    const initId = reverseEngineerInstitutionCode(rawToken);
    let inst = !isNaN(initId) ? db.getInstitutionById(String(initId)) : undefined;

    if (!inst && !isNaN(initId)) {
      inst = await getInstitutionFromPostgresById(initId);
    }

    if (!inst) {
      inst = db.getInstitutionByToken(rawToken);
    }

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
    const rawToken = req.params.token;

    // Use reverseEngineerInstitutionCode to derive institution ID from the institution code
    const initId = reverseEngineerInstitutionCode(rawToken);
    let inst = !isNaN(initId) ? db.getInstitutionById(String(initId)) : undefined;

    if (!inst && !isNaN(initId)) {
      inst = await getInstitutionFromPostgresById(initId);
    }

    if (!inst) {
      inst = db.getInstitutionByToken(rawToken);
    }

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

    // Generate unique reference number for the spreadsheet row
    const referenceNumber = `REF-${inst.code.toUpperCase()}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const submissionRecord: FormSubmissionRecord = {
      id: referenceNumber,
      referenceNumber,
      institutionId: inst.id,
      institutionName: inst.name,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      ...payload,
      syncedToGoogleSheet: false,
    };

    // Forward directly to the institution's Google Spreadsheet (acting as the database)
    let sheetSyncResult: any = null;
    if (inst.sheetWebhookUrl) {
      sheetSyncResult = await syncSubmissionToGoogleSheet(inst, submissionRecord, 'NEW_SUBMISSION');
    } else {
      // If no webhook configured yet, save to local memory so demo works, but inform user
      db.createSubmission(inst, payload);
    }

    res.status(201).json({
      success: true,
      data: {
        id: submissionRecord.id,
        referenceNumber: submissionRecord.referenceNumber,
        institutionName: inst.name,
        submittedAt: submissionRecord.submittedAt,
        status: submissionRecord.status,
        sheetSync: sheetSyncResult,
      },
      message: inst.sheetWebhookUrl
        ? 'Form response submitted directly to institution Google Spreadsheet tab.'
        : 'Form submitted. Notice: Connect your Google Sheet Webhook URL in settings to save directly to your Google Spreadsheet database.',
    });
  });

  // -------------------------------------------------------------
  // API: Spreadsheet Responses & Administration
  // Direct Google Spreadsheet Database: Single source of truth
  // -------------------------------------------------------------

  // Get all submissions for an institution directly from Google Spreadsheet
  app.get('/api/institutions/:id/responses', async (req: Request, res: Response) => {
    const inst = db.getInstitutionById(req.params.id);
    if (!inst) {
      return res.status(404).json({ success: false, error: 'Institution not found.' });
    }

    let records: FormSubmissionRecord[] = [];
    let source: string = 'google_sheet';
    let message: string = '';

    // 1. Fetch live directly from the institution's Google Spreadsheet tab
    const sheetResult = await fetchResponsesFromGoogleSheet(inst);
    if (sheetResult.success && sheetResult.data && sheetResult.data.length > 0) {
      records = sheetResult.data;
      source = sheetResult.source;
      message = sheetResult.message;
    } else if (sheetResult.success && sheetResult.data && sheetResult.data.length === 0) {
      records = [];
      source = sheetResult.source;
      message = sheetResult.message || `No responses recorded yet in Google Sheet tab '${sheetResult.tabName}'.`;
    } else if (inst.sheetWebhookUrl || inst.spreadsheetId) {
      // Fallback if sheet network fetch failed
      records = db.getSubmissions(inst.id);
      source = 'local_cache';
      message = `${sheetResult.message} Showing local cache.`;
    } else {
      // No spreadsheet connected yet
      records = db.getSubmissions(inst.id);
      source = 'unconnected_demo';
      message = 'No Google Spreadsheet or Webhook URL configured. Connect your Google Sheet in settings to load live responses.';
    }

    // Search query filter
    const q = (req.query.q as string || '').toLowerCase().trim();
    if (q) {
      records = records.filter(r =>
        (r.SURNAME && r.SURNAME.toLowerCase().includes(q)) ||
        (r.OTHER_NAME && r.OTHER_NAME.toLowerCase().includes(q)) ||
        (r.GHANA_CARD_NUMBER && r.GHANA_CARD_NUMBER.toLowerCase().includes(q)) ||
        (r.PERSONNEL_MOBILE && r.PERSONNEL_MOBILE.includes(q)) ||
        (r.referenceNumber && r.referenceNumber.toLowerCase().includes(q)) ||
        (r.NAME_OF_BANK && r.NAME_OF_BANK.toLowerCase().includes(q))
      );
    }

    // Status filter
    const status = (req.query.status as string || '').toUpperCase();
    if (status && status !== 'ALL') {
      records = records.filter(r => r.status === status);
    }

    const tabName = inst.sheetTabName || getDefaultSheetTabName(inst.name);

    res.json({
      success: true,
      institution: {
        id: inst.id,
        name: inst.name,
        code: inst.code,
        spreadsheetId: inst.spreadsheetId,
        sheetTabName: tabName,
        sheetWebhookUrl: Boolean(inst.sheetWebhookUrl),
      },
      source,
      sheetTabName: tabName,
      message,
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
  // Reflects directly in the Google Spreadsheet tab and triggers SMS
  app.patch('/api/responses/:id/status', async (req: Request, res: Response) => {
    const { status, notes, reviewedBy, institutionId, referenceNumber, mobile, surname } = req.body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status must be either 'APPROVED' or 'REJECTED'.",
      });
    }

    // Identify target institution and reference
    let inst = institutionId ? db.getInstitutionById(institutionId) : null;
    const targetRef = referenceNumber || req.params.id;

    // Check if local cache exists
    const localRecord = db.getSubmissionById(req.params.id);
    if (!inst && localRecord) {
      inst = db.getInstitutionById(localRecord.institutionId);
    }
    if (!inst) {
      inst = db.getInstitutions()[0];
    }

    const applicantMobile = mobile || localRecord?.PERSONNEL_MOBILE || '';
    const applicantSurname = surname || localRecord?.SURNAME || '';

    // 1. Update status directly in Google Spreadsheet tab
    let sheetSyncResult: any = null;
    if (inst && inst.sheetWebhookUrl) {
      sheetSyncResult = await updateStatusInGoogleSheet(inst, {
        referenceNumber: targetRef,
        status,
        notes,
      });
    }

    // Keep local cache in sync if record exists
    if (localRecord) {
      db.updateSubmissionStatus(localRecord.id, status, notes, reviewedBy);
    }

    // Save mapped applicant details in PostgreSQL before sending SMS
    const applicantData = req.body.applicantData ?? localRecord;
    let applicantDetailsResult: any = null;

    if (status === 'APPROVED') {
      if (!applicantData) {
        return res.status(400).json({
          success: false,
          error: 'Applicant details are required before an approved response can be saved to PostgreSQL.',
        });
      }

      try {
        applicantDetailsResult = await createApplicantDetails(applicantData);
      } catch (err: any) {
        console.error('Error saving approved applicant details to PostgreSQL:', err);
        return res.status(500).json({
          success: false,
          error: `Failed to save approved applicant details: ${err.message}`,
        });
      }
    }

    // 2. If approved, trigger Hubtel SMS
    let smsResult: any = null;
    if (status === 'APPROVED' && applicantMobile) {
      try {
        smsResult = await sendSms({
          mobile: applicantMobile,
          surname: applicantSurname,
        });

        // Write SMS Status back to the spreadsheet row
        if (inst && inst.sheetWebhookUrl && smsResult?.success) {
          await updateStatusInGoogleSheet(inst, {
            referenceNumber: targetRef,
            status,
            notes,
            smsStatus: 'SENT',
          });
        }
      } catch (err: any) {
        console.error('Error sending SMS after approval:', err);
        smsResult = { success: false, error: err.message };
      }
    }

    const tabName = inst ? (inst.sheetTabName || getDefaultSheetTabName(inst.name)) : 'Spreadsheet';
    let message = `Response ${status.toLowerCase()} directly in Google Sheet tab '${tabName}'.`;
    if (status === 'APPROVED') {
      if (smsResult?.success) {
        message += ` SMS notification delivered to ${applicantMobile}.`;
      } else if (smsResult?.skipped) {
        message += ` (SMS skipped: ${smsResult.reason})`;
      } else if (smsResult?.error) {
        message += ` (SMS error: ${smsResult.error})`;
      }
    }

    res.json({
      success: true,
      data: {
        id: req.params.id,
        referenceNumber: targetRef,
        status,
        approvalNotes: status === 'APPROVED' ? notes : '',
        rejectionReason: status === 'REJECTED' ? notes : '',
        smsSent: Boolean(smsResult?.success),
        smsStatus: smsResult?.success ? 'SENT' : (smsResult?.skipped ? 'SKIPPED' : 'FAILED'),
        smsSentAt: smsResult?.success ? new Date().toISOString() : undefined,
        smsError: smsResult?.error || smsResult?.reason || undefined,
      },
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

  // Master Google Sheet Registry endpoints (Approach B)
  // Get master sheet configuration, sync status, and registered mappings
  app.get('/api/master-sheet', (req: Request, res: Response) => {
    const config = getMasterSheetConfig();
    const mappings = db.getMasterMappings();
    res.json({
      success: true,
      config,
      mappings,
      totalInstitutions: db.getInstitutions().length,
    });
  });

  // Update master sheet configuration (Webhook URL or Spreadsheet ID)
  app.put('/api/master-sheet', async (req: Request, res: Response) => {
    const { masterWebhookUrl, masterSpreadsheetId } = req.body || {};
    const updatedConfig = updateMasterSheetConfig({ masterWebhookUrl, masterSpreadsheetId });

    // Automatically trigger sync if webhook or spreadsheetId is provided
    let syncResult: any = null;
    if (updatedConfig.masterWebhookUrl || updatedConfig.masterSpreadsheetId) {
      try {
        syncResult = await syncInstitutionsWithMasterSheet();
      } catch (err: any) {
        syncResult = { success: false, message: err.message };
      }
    }

    res.json({
      success: true,
      config: updatedConfig,
      syncResult,
      mappings: db.getMasterMappings(),
    });
  });

  // Manually trigger immediate synchronization from Master Google Sheet
  app.post('/api/master-sheet/sync', async (req: Request, res: Response) => {
    const result = await syncInstitutionsWithMasterSheet();
    res.json({
      success: result.success,
      message: result.message,
      syncedCount: result.syncedCount,
      totalInstitutions: result.totalInstitutions,
      config: getMasterSheetConfig(),
      mappings: db.getMasterMappings(),
    });
  });

  // Test connection to Master Google Sheet Webhook
  app.post('/api/master-sheet/test', async (req: Request, res: Response) => {
    const result = await testMasterSheetConnection(req.body?.masterWebhookUrl);
    res.json(result);
  });

  // Master Registry Apps Script template code
  app.get('/api/docs/master-script-template', (req: Request, res: Response) => {
    res.json({
      success: true,
      script: getMasterAppsScriptTemplate(),
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
