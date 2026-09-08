import { FormSubmissionRecord, Institution } from '../types.js';
import { getDefaultSheetTabName } from './db.js';

/**
 * Handles fast, reliable communication with Google Apps Script Web App.
 * Correctly manages HTTP 302 redirects issued by Google Apps Script
 * so payloads and echo responses are processed cleanly in under 2 seconds.
 */
async function postToAppsScript(
  url: string,
  payload: any,
  timeoutMs = 15000
): Promise<{ success: boolean; data?: any; message: string; latencyMs: number }> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'manual',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Google Apps Script returns 302 redirect with Location pointing to echo endpoint
    if (res.status === 302) {
      const location = res.headers.get('location');
      if (location) {
        const echoRes = await fetch(location, { method: 'GET' });
        const echoText = await echoRes.text();
        try {
          const parsed = JSON.parse(echoText);
          const isOk = parsed.status === 'success' || parsed.status === 'updated' || (!parsed.error && parsed.status !== 'error');
          return {
            success: isOk,
            data: parsed,
            message: parsed.message || (isOk ? 'Successfully updated Google Spreadsheet.' : parsed.error || 'Webhook returned error'),
            latencyMs: Date.now() - start,
          };
        } catch {
          return {
            success: echoRes.ok,
            message: echoText.substring(0, 150),
            latencyMs: Date.now() - start,
          };
        }
      }
      return {
        success: true,
        message: 'Google Apps Script received request.',
        latencyMs: Date.now() - start,
      };
    }

    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      const isOk = parsed.status === 'success' || parsed.status === 'updated';
      return {
        success: isOk,
        data: parsed,
        message: parsed.message || (isOk ? 'Successfully updated Google Spreadsheet.' : 'Webhook returned error'),
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        success: res.ok,
        message: text.substring(0, 150),
        latencyMs: Date.now() - start,
      };
    }
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      success: false,
      message: err.name === 'AbortError' ? 'Connection timeout after 15s.' : (err.message || 'Network request failed'),
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Live test of Google Sheet Webhook URL
 */
export async function testGoogleSheetWebhook(
  institution: Institution
): Promise<{ success: boolean; message: string; latencyMs: number; details?: any }> {
  if (!institution.sheetWebhookUrl) {
    return {
      success: false,
      message: 'No Sheet Webhook URL configured. Please paste your Google Apps Script Web App URL.',
      latencyMs: 0,
    };
  }

  // Validate URL format
  const url = institution.sheetWebhookUrl.trim();
  if (!url.startsWith('https://script.google.com/macros/s/')) {
    return {
      success: false,
      message: 'Invalid Google Apps Script URL format. Must start with https://script.google.com/macros/s/... and end with /exec',
      latencyMs: 0,
    };
  }

  if (url.endsWith('/dev') || url.includes('/edit')) {
    return {
      success: false,
      message: 'Warning: This URL ends in /dev or /edit. You must copy the production Web app URL ending in /exec.',
      latencyMs: 0,
    };
  }

  // Test with a lightweight PING action
  const tabName = institution.sheetTabName || getDefaultSheetTabName(institution.name);
  const res = await postToAppsScript(url, {
    action: 'PING',
    spreadsheetId: institution.spreadsheetId,
    tabName,
    institutionCode: institution.code,
    institutionName: institution.name,
    timestamp: new Date().toISOString(),
    // In case user is running earlier Apps Script without PING check, provide mock submission to avoid undefined
    submission: {
      id: 'test-ping',
      referenceNumber: 'PING-CHECK',
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      SURNAME: 'PING_CHECK',
      OTHER_NAME: 'VERIFICATION',
    },
  });

  return {
    success: res.success,
    message: res.success
      ? `Connected to Google Apps Script successfully (${(res.latencyMs / 1000).toFixed(1)}s response time). Auto-sync is active.`
      : `Webhook responded with: ${res.message}. Make sure the script is deployed with 'Who has access: Anyone'.`,
    latencyMs: res.latencyMs,
    details: res.data,
  };
}

/**
 * Handles communication with Google Sheets via Webhook (Google Apps Script Web App)
 */
export async function syncSubmissionToGoogleSheet(
  institution: Institution,
  submission: FormSubmissionRecord,
  action: 'NEW_SUBMISSION' | 'UPDATE_STATUS' = 'NEW_SUBMISSION'
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const timestamp = new Date().toISOString();

  // If no webhook configured, return informative error
  if (!institution.sheetWebhookUrl) {
    return {
      success: false,
      message: `No Google Sheets Webhook URL configured for ${institution.name}. The Google Spreadsheet acts as the database, so an active webhook URL is required.`,
      timestamp,
    };
  }

  const tabName = institution.sheetTabName || getDefaultSheetTabName(institution.name);
  const payload = {
    action,
    spreadsheetId: institution.spreadsheetId,
    tabName,
    institutionCode: institution.code,
    institutionName: institution.name,
    timestamp,
    submission: {
      id: submission.id,
      referenceNumber: submission.referenceNumber,
      status: submission.status,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt || '',
      reviewedBy: submission.reviewedBy || '',
      rejectionReason: submission.rejectionReason || '',
      approvalNotes: submission.approvalNotes || '',
      smsStatus: submission.smsStatus || '',
      // All 21 required form fields
      SURNAME: submission.SURNAME,
      OTHER_NAME: submission.OTHER_NAME,
      DATE_OF_EMPLOYMENT: submission.DATE_OF_EMPLOYMENT,
      GENDER: submission.GENDER,
      DATE_OF_BIRTH: submission.DATE_OF_BIRTH,
      MARITAL_STATUS: submission.MARITAL_STATUS,
      RESIDENTIAL_DIGITAL_ADDRESS: submission.RESIDENTIAL_DIGITAL_ADDRESS,
      PERSONNEL_MOBILE: submission.PERSONNEL_MOBILE,
      INSTITUTION_NAME: submission.INSTITUTION_NAME,
      MONTHLY_NET_SALARY: submission.MONTHLY_NET_SALARY,
      GHANA_CARD_NUMBER: submission.GHANA_CARD_NUMBER,
      PLACE_OF_WORK_DIGITAL_ADDRESS: submission.PLACE_OF_WORK_DIGITAL_ADDRESS,
      GUARANTOR_FULL_NAME: submission.GUARANTOR_FULL_NAME,
      GUARANTOR_MOBILE_NUMBER: submission.GUARANTOR_MOBILE_NUMBER,
      GUARANTOR_PLACE_OF_WORK: submission.GUARANTOR_PLACE_OF_WORK,
      GUARANTOR_DIGITAL_ADDRESS: submission.GUARANTOR_DIGITAL_ADDRESS,
      GUARANTOR_JOB_DETAIL: submission.GUARANTOR_JOB_DETAIL,
      GUARANTOR_NET_SALARY: submission.GUARANTOR_NET_SALARY,
      NAME_OF_BANK: submission.NAME_OF_BANK,
      BRANCH: submission.BRANCH,
      BANK_ACCOUNT_NUMBER: submission.BANK_ACCOUNT_NUMBER,
    },
  };

  const result = await postToAppsScript(institution.sheetWebhookUrl.trim(), payload);

  return {
    success: result.success,
    message: result.message,
    timestamp,
  };
}

/**
 * Fetches responses directly from the institution's Google Spreadsheet tab.
 * No intermediary storage: the spreadsheet is the single source of truth.
 */
export async function fetchResponsesFromGoogleSheet(
  institution: Institution
): Promise<{
  success: boolean;
  data: FormSubmissionRecord[];
  message: string;
  source: 'google_apps_script' | 'google_sheet_gviz' | 'unconnected';
  tabName: string;
}> {
  const tabName = institution.sheetTabName || getDefaultSheetTabName(institution.name);

  if (!institution.sheetWebhookUrl && !institution.spreadsheetId) {
    return {
      success: false,
      data: [],
      message: 'No Google Spreadsheet or Webhook URL configured for this institution.',
      source: 'unconnected',
      tabName,
    };
  }

  // 1. Primary: Fetch directly from Google Sheet tab via Apps Script Web App
  if (institution.sheetWebhookUrl) {
    try {
      const payload = {
        action: 'FETCH_RESPONSES',
        spreadsheetId: institution.spreadsheetId,
        tabName,
        institutionCode: institution.code,
        institutionName: institution.name,
      };

      const result = await postToAppsScript(institution.sheetWebhookUrl.trim(), payload);
      if (result.success && result.data && Array.isArray(result.data.data)) {
        const records: FormSubmissionRecord[] = result.data.data.map((item: any, idx: number) => ({
          ...item,
          institutionId: institution.id,
          institutionName: institution.name,
          id: item.id || item.referenceNumber || `row_${idx + 1}`,
          syncedToGoogleSheet: true,
          lastSyncedAt: new Date().toISOString(),
        }));

        return {
          success: true,
          data: records,
          message: `Successfully loaded ${records.length} live response(s) directly from Google Sheet tab '${tabName}'.`,
          source: 'google_apps_script',
          tabName,
        };
      }
    } catch (err: any) {
      console.warn('Apps Script direct fetch error:', err.message);
    }
  }

  // 2. Secondary Fallback: If spreadsheetId is available, query Google Sheets visualization endpoint directly
  if (institution.spreadsheetId && institution.spreadsheetId.trim() !== '') {
    try {
      const sheetId = institution.spreadsheetId.trim();
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
      const res = await fetch(gvizUrl);
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
        if (match && match[1]) {
          const json = JSON.parse(match[1]);
          const rows = json.table?.rows || [];
          const records: FormSubmissionRecord[] = [];

          for (let r = 0; r < rows.length; r++) {
            const c = rows[r].c || [];
            const getVal = (idx: number) => {
              if (!c[idx]) return '';
              return c[idx].v !== null && c[idx].v !== undefined ? String(c[idx].v) : '';
            };

            const status = getVal(0) || 'PENDING';
            const ref = getVal(1);
            const surname = getVal(3);
            if (!ref && !surname) continue;

            records.push({
              id: ref || `row_${r + 1}`,
              referenceNumber: ref,
              status: (status.toUpperCase() === 'APPROVED' ? 'APPROVED' : status.toUpperCase() === 'REJECTED' ? 'REJECTED' : 'PENDING') as any,
              submittedAt: getVal(2) || new Date().toISOString(),
              institutionId: institution.id,
              institutionName: institution.name,
              SURNAME: surname,
              OTHER_NAME: getVal(4),
              DATE_OF_EMPLOYMENT: getVal(5),
              GENDER: getVal(6),
              DATE_OF_BIRTH: getVal(7),
              MARITAL_STATUS: getVal(8),
              RESIDENTIAL_DIGITAL_ADDRESS: getVal(9),
              PERSONNEL_MOBILE: getVal(10),
              INSTITUTION_NAME: getVal(11) || institution.name,
              MONTHLY_NET_SALARY: getVal(12),
              GHANA_CARD_NUMBER: getVal(13),
              PLACE_OF_WORK_DIGITAL_ADDRESS: getVal(14),
              GUARANTOR_FULL_NAME: getVal(15),
              GUARANTOR_MOBILE_NUMBER: getVal(16),
              GUARANTOR_PLACE_OF_WORK: getVal(17),
              GUARANTOR_DIGITAL_ADDRESS: getVal(18),
              GUARANTOR_JOB_DETAIL: getVal(19),
              GUARANTOR_NET_SALARY: getVal(20),
              NAME_OF_BANK: getVal(21),
              BRANCH: getVal(22),
              BANK_ACCOUNT_NUMBER: getVal(23),
              approvalNotes: getVal(24),
              rejectionReason: getVal(24),
              smsStatus: getVal(25),
              smsSent: getVal(25) === 'SENT',
              syncedToGoogleSheet: true,
              lastSyncedAt: new Date().toISOString(),
            });
          }

          return {
            success: true,
            data: records,
            message: `Loaded ${records.length} response(s) directly from Google Sheet tab '${tabName}'.`,
            source: 'google_sheet_gviz',
            tabName,
          };
        }
      }
    } catch (err: any) {
      console.warn('GViz direct fetch error:', err.message);
    }
  }

  return {
    success: false,
    data: [],
    message: `Could not fetch responses from Google Sheet tab '${tabName}'. Please ensure your Google Apps Script is updated with the latest template and deployed with 'Who has access: Anyone'.`,
    source: 'google_apps_script',
    tabName,
  };
}

/**
 * Updates a response row directly in the institution's Google Spreadsheet tab.
 */
export async function updateStatusInGoogleSheet(
  institution: Institution,
  params: {
    referenceNumber: string;
    status: 'APPROVED' | 'REJECTED';
    notes?: string;
    smsStatus?: string;
  }
): Promise<{ success: boolean; message: string; details?: any }> {
  if (!institution.sheetWebhookUrl) {
    return {
      success: false,
      message: 'No Google Sheet Webhook configured for this institution.',
    };
  }

  const tabName = institution.sheetTabName || getDefaultSheetTabName(institution.name);
  const payload = {
    action: 'UPDATE_STATUS',
    spreadsheetId: institution.spreadsheetId,
    tabName,
    institutionCode: institution.code,
    institutionName: institution.name,
    timestamp: new Date().toISOString(),
    submission: {
      referenceNumber: params.referenceNumber,
      status: params.status,
      approvalNotes: params.notes || '',
      rejectionReason: params.notes || '',
      smsStatus: params.smsStatus || '',
    },
  };

  const result = await postToAppsScript(institution.sheetWebhookUrl.trim(), payload);
  return {
    success: result.success,
    message: result.message,
    details: result.data,
  };
}

/**
 * Push all submissions of an institution to Google Sheet
 */
export async function syncAllSubmissionsToGoogleSheet(
  institution: Institution,
  submissions: FormSubmissionRecord[]
): Promise<{ success: boolean; syncedCount: number; message: string }> {
  if (!institution.sheetWebhookUrl) {
    return {
      success: false,
      syncedCount: 0,
      message: 'No Google Sheet Webhook configured for this institution.',
    };
  }

  let syncedCount = 0;
  for (const sub of submissions) {
    const res = await syncSubmissionToGoogleSheet(institution, sub, 'NEW_SUBMISSION');
    if (res.success) {
      syncedCount++;
    }
  }

  const effectiveTab = institution.sheetTabName || getDefaultSheetTabName(institution.name);
  return {
    success: syncedCount > 0,
    syncedCount,
    message: `Successfully synchronized ${syncedCount} of ${submissions.length} submission(s) to Google Sheet tab '${effectiveTab}'.`,
  };
}

/**
 * Generate CSV formatted directly for Google Sheets import
 */
export function generateSubmissionsCsv(submissions: FormSubmissionRecord[]): string {
  const headers = [
    'STATUS',
    'REFERENCE_NUMBER',
    'SUBMISSION_DATE',
    'SURNAME',
    'OTHER_NAME',
    'DATE OF EMPLOYMENT',
    'GENDER',
    'DATE OF BIRTH',
    'MARITAL STATUS',
    'RESIDENTIAL DIGITAL ADDRESS',
    'PERSONNEL MOBILE',
    'INSTITUTION NAME',
    'MONTHLY NET SALARY',
    'GHANA CARD NUMBER',
    'PLACE OF WORK DIGITAL ADDRESS',
    'GUARANTOR FULL NAME',
    'GUARANTOR MOBILE NUMBER',
    'GUARANTOR PLACE OF WORK',
    'GUARANTOR DIGITAL ADDRESS',
    'GUARANTOR JOB DETAIL',
    'GUARANTOR NET SALARY',
    'NAME OF BANK',
    'BRANCH',
    'BANK ACCOUNT NUMBER',
    'REVIEWED_AT',
    'REVIEWED_BY',
    'NOTES_OR_REASON',
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = submissions.map(s => [
    escapeCsv(s.status),
    escapeCsv(s.referenceNumber),
    escapeCsv(s.submittedAt),
    escapeCsv(s.SURNAME),
    escapeCsv(s.OTHER_NAME),
    escapeCsv(s.DATE_OF_EMPLOYMENT),
    escapeCsv(s.GENDER),
    escapeCsv(s.DATE_OF_BIRTH),
    escapeCsv(s.MARITAL_STATUS),
    escapeCsv(s.RESIDENTIAL_DIGITAL_ADDRESS),
    escapeCsv(s.PERSONNEL_MOBILE),
    escapeCsv(s.INSTITUTION_NAME),
    escapeCsv(s.MONTHLY_NET_SALARY),
    escapeCsv(s.GHANA_CARD_NUMBER),
    escapeCsv(s.PLACE_OF_WORK_DIGITAL_ADDRESS),
    escapeCsv(s.GUARANTOR_FULL_NAME),
    escapeCsv(s.GUARANTOR_MOBILE_NUMBER),
    escapeCsv(s.GUARANTOR_PLACE_OF_WORK),
    escapeCsv(s.GUARANTOR_DIGITAL_ADDRESS),
    escapeCsv(s.GUARANTOR_JOB_DETAIL),
    escapeCsv(s.GUARANTOR_NET_SALARY),
    escapeCsv(s.NAME_OF_BANK),
    escapeCsv(s.BRANCH),
    escapeCsv(s.BANK_ACCOUNT_NUMBER),
    escapeCsv(s.reviewedAt || ''),
    escapeCsv(s.reviewedBy || ''),
    escapeCsv(s.rejectionReason || s.approvalNotes || ''),
  ].join(','));

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Returns the ready-to-use Google Apps Script code for the user to paste into their Google Sheet
 */
export function getGoogleAppsScriptTemplate(): string {
  return `/**
 * Google Apps Script for Institutional Form & Sheet Sync
 * 
 * SETUP INSTRUCTIONS:
 * 1. In your Google Spreadsheet, click: Extensions > Apps Script.
 * 2. Delete any existing code, paste ALL of this code into Code.gs, and click the Save icon (Ctrl+S / Cmd+S).
 * 3. Click: Deploy > New deployment.
 *    - Click the gear icon next to "Select type" and choose: Web app.
 *    - Description: Institutional Form Webhook
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone"  <-- CRITICAL: Choose "Anyone" so the app can post rows
 * 4. Click Deploy. If prompted, click "Authorize access", choose your Google account, click "Advanced", and "Go to Untitled project (unsafe)".
 * 5. Copy the Web app URL (ends with /exec) and paste it into this app's "Sheet Webhook URL" field.
 */

// Handles GET requests for testing in browser or health checks
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Google Apps Script Webhook is active and connected."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handles POST requests from the form web app
function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : null;
    if (!raw) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No postData received" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(raw);

    // Quick connection verification ping
    if (data.action === "PING" || data.action === "TEST_CONNECTION") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Webhook connection verified successfully."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss;
    if (data.spreadsheetId && data.spreadsheetId.toString().trim() !== "") {
      try {
        ss = SpreadsheetApp.openById(data.spreadsheetId.toString().trim());
      } catch (openErr) {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      }
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Spreadsheet not found or not accessible. Ensure script is bound to your sheet or check the Spreadsheet ID."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheetName = data.tabName || "Responses";
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      // If the default first sheet is empty or untouched, rename and use it
      var allSheets = ss.getSheets();
      if (allSheets.length === 1 && allSheets[0].getLastRow() <= 1) {
        sheet = allSheets[0];
        sheet.setName(sheetName);
      } else {
        sheet = ss.insertSheet(sheetName);
      }

      // Add Header Row with all 21 fields + Administrative Status
      sheet.appendRow([
        "Status", "Reference", "Submitted At", "Surname", "Other Name",
        "Employment Date", "Gender", "Date of Birth", "Marital Status",
        "Residential Address", "Personnel Mobile", "Institution", "Monthly Net Salary",
        "Ghana Card Number", "Work Address", "Guarantor Name", "Guarantor Mobile",
        "Guarantor Work", "Guarantor Address", "Guarantor Job", "Guarantor Net Salary",
        "Bank Name", "Branch", "Account Number", "Notes/Reason"
      ]);
      sheet.getRange(1, 1, 1, 25).setFontWeight("bold").setBackground("#e2e8f0");
      sheet.setFrozenRows(1);
    }

    // Set as active sheet so user sees it right away
    try {
      ss.setActiveSheet(sheet);
    } catch(err) {}

    // Support batch sync of multiple rows
    if (data.action === "BATCH_SYNC" && Array.isArray(data.submissions)) {
      var added = 0;
      for (var i = 0; i < data.submissions.length; i++) {
        var s = data.submissions[i];
        sheet.appendRow([
          s.status || "PENDING",
          s.referenceNumber || "",
          s.submittedAt || new Date().toISOString(),
          s.SURNAME || "",
          s.OTHER_NAME || "",
          s.DATE_OF_EMPLOYMENT || "",
          s.GENDER || "",
          s.DATE_OF_BIRTH || "",
          s.MARITAL_STATUS || "",
          s.RESIDENTIAL_DIGITAL_ADDRESS || "",
          s.PERSONNEL_MOBILE || "",
          s.INSTITUTION_NAME || "",
          s.MONTHLY_NET_SALARY || "",
          s.GHANA_CARD_NUMBER || "",
          s.PLACE_OF_WORK_DIGITAL_ADDRESS || "",
          s.GUARANTOR_FULL_NAME || "",
          s.GUARANTOR_MOBILE_NUMBER || "",
          s.GUARANTOR_PLACE_OF_WORK || "",
          s.GUARANTOR_DIGITAL_ADDRESS || "",
          s.GUARANTOR_JOB_DETAIL || "",
          s.GUARANTOR_NET_SALARY || "",
          s.NAME_OF_BANK || "",
          s.BRANCH || "",
          s.BANK_ACCOUNT_NUMBER || "",
          s.approvalNotes || s.rejectionReason || ""
        ]);
        added++;
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: added }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sub = data.submission;
    if (!sub) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing submission payload" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "UPDATE_STATUS") {
      // Find row by reference number or ID and update status
      var values = sheet.getDataRange().getValues();
      for (var r = 1; r < values.length; r++) {
        if (values[r][1] == sub.referenceNumber || values[r][0] == sub.referenceNumber) {
          sheet.getRange(r + 1, 1).setValue(sub.status);
          sheet.getRange(r + 1, 25).setValue(sub.approvalNotes || sub.rejectionReason || "");
          return ContentService.createTextOutput(JSON.stringify({ status: "updated", row: r + 1 }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // Otherwise append new row
    sheet.appendRow([
      sub.status || "PENDING",
      sub.referenceNumber || "",
      sub.submittedAt || new Date().toISOString(),
      sub.SURNAME || "",
      sub.OTHER_NAME || "",
      sub.DATE_OF_EMPLOYMENT || "",
      sub.GENDER || "",
      sub.DATE_OF_BIRTH || "",
      sub.MARITAL_STATUS || "",
      sub.RESIDENTIAL_DIGITAL_ADDRESS || "",
      sub.PERSONNEL_MOBILE || "",
      sub.INSTITUTION_NAME || "",
      sub.MONTHLY_NET_SALARY || "",
      sub.GHANA_CARD_NUMBER || "",
      sub.PLACE_OF_WORK_DIGITAL_ADDRESS || "",
      sub.GUARANTOR_FULL_NAME || "",
      sub.GUARANTOR_MOBILE_NUMBER || "",
      sub.GUARANTOR_PLACE_OF_WORK || "",
      sub.GUARANTOR_DIGITAL_ADDRESS || "",
      sub.GUARANTOR_JOB_DETAIL || "",
      sub.GUARANTOR_NET_SALARY || "",
      sub.NAME_OF_BANK || "",
      sub.BRANCH || "",
      sub.BANK_ACCOUNT_NUMBER || "",
      sub.approvalNotes || sub.rejectionReason || ""
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", referenceNumber: sub.referenceNumber }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
}
