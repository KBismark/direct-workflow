import dotenv from 'dotenv';
import { Institution, MasterSheetConfig, MasterSheetRowMapping, MasterSheetSyncResult } from '../types.js';
import { db } from './db.js';

dotenv.config();

// In-memory runtime override (allows setting via UI modal or .env)
let runtimeMasterConfig: {
  masterWebhookUrl?: string;
  masterSpreadsheetId?: string;
  lastSyncedAt?: string;
  lastSyncResult?: { success: boolean; message: string; count: number };
} = {
  masterWebhookUrl: process.env.MASTER_SHEET_WEBHOOK_URL || '',
  masterSpreadsheetId: process.env.MASTER_SPREADSHEET_ID || '',
};

export function getMasterSheetConfig(): MasterSheetConfig {
  dotenv.config();
  const webhook = (runtimeMasterConfig.masterWebhookUrl || process.env.MASTER_SHEET_WEBHOOK_URL || '').trim();
  const sheetId = (runtimeMasterConfig.masterSpreadsheetId || process.env.MASTER_SPREADSHEET_ID || '').trim();

  let status: 'connected' | 'unconnected' | 'error' = 'unconnected';
  if (webhook || sheetId) {
    status = runtimeMasterConfig.lastSyncResult?.success ? 'connected' : (runtimeMasterConfig.lastSyncResult ? 'error' : 'connected');
  }

  return {
    masterWebhookUrl: webhook,
    masterSpreadsheetId: sheetId,
    lastSyncedAt: runtimeMasterConfig.lastSyncedAt,
    syncedCount: runtimeMasterConfig.lastSyncResult?.count,
    status,
    message: runtimeMasterConfig.lastSyncResult?.message,
  };
}

export function updateMasterSheetConfig(updates: { masterWebhookUrl?: string; masterSpreadsheetId?: string }): MasterSheetConfig {
  if (updates.masterWebhookUrl !== undefined) {
    runtimeMasterConfig.masterWebhookUrl = updates.masterWebhookUrl.trim();
  }
  if (updates.masterSpreadsheetId !== undefined) {
    runtimeMasterConfig.masterSpreadsheetId = updates.masterSpreadsheetId.trim();
  }
  return getMasterSheetConfig();
}

/**
 * Robust POST to Google Apps Script handling 302 redirects cleanly
 */
async function postToMasterAppsScript(
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
          const isOk = parsed.status === 'success' || parsed.status === 'updated' || parsed.status === 'created' || (!parsed.error && parsed.status !== 'error');
          return {
            success: isOk,
            data: parsed,
            message: parsed.message || (isOk ? 'Successfully updated Master Registry Sheet.' : parsed.error || 'Webhook returned error'),
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
        message: 'Master Google Apps Script received request.',
        latencyMs: Date.now() - start,
      };
    }

    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      const isOk = parsed.status === 'success' || parsed.status === 'updated' || parsed.status === 'created';
      return {
        success: isOk,
        data: parsed,
        message: parsed.message || (isOk ? 'Successfully updated Master Registry Sheet.' : 'Webhook returned error'),
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
 * Fetches all institution mappings from the Master Google Sheet
 */
export async function fetchMasterSheetMappings(): Promise<{
  success: boolean;
  mappings: MasterSheetRowMapping[];
  message: string;
  source: 'master_webhook' | 'master_gviz' | 'unconnected';
}> {
  const config = getMasterSheetConfig();

  if (!config.masterWebhookUrl && !config.masterSpreadsheetId) {
    return {
      success: false,
      mappings: [],
      message: 'No Master Google Sheet Webhook URL or Spreadsheet ID configured.',
      source: 'unconnected',
    };
  }

  // 1. Primary: Fetch mappings via Master Apps Script Web App
  if (config.masterWebhookUrl) {
    try {
      // First attempt fast GET with action=GET_ALL_MAPPINGS
      const getUrl = config.masterWebhookUrl.includes('?')
        ? `${config.masterWebhookUrl}&action=GET_ALL_MAPPINGS`
        : `${config.masterWebhookUrl}?action=GET_ALL_MAPPINGS`;

      const getRes = await fetch(getUrl, { redirect: 'follow' });
      if (getRes.ok) {
        const text = await getRes.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed.status === 'success' && Array.isArray(parsed.data)) {
            const mappings: MasterSheetRowMapping[] = parsed.data.map((row: any) => ({
              institutionId: String(row.institutionId || row.id || '').trim(),
              institutionName: String(row.institutionName || row.name || '').trim(),
              institutionCode: String(row.institutionCode || row.code || '').trim(),
              spreadsheetId: String(row.spreadsheetId || '').trim(),
              sheetWebhookUrl: String(row.sheetWebhookUrl || '').trim(),
              sheetTabName: String(row.sheetTabName || 'Responses').trim(),
              updatedAt: row.updatedAt || row.lastUpdated,
            })).filter((m: MasterSheetRowMapping) => m.institutionId !== '');

            return {
              success: true,
              mappings,
              message: `Retrieved ${mappings.length} institution mapping(s) from Master Google Sheet.`,
              source: 'master_webhook',
            };
          }
        } catch {
          // If GET parsing fails, fallback to POST
        }
      }

      // If GET was not supported or redirected unexpectedly, use postToMasterAppsScript
      const postResult = await postToMasterAppsScript(config.masterWebhookUrl, { action: 'GET_ALL_MAPPINGS' });
      if (postResult.success && postResult.data && Array.isArray(postResult.data.data)) {
        const mappings: MasterSheetRowMapping[] = postResult.data.data.map((row: any) => ({
          institutionId: String(row.institutionId || row.id || '').trim(),
          institutionName: String(row.institutionName || row.name || '').trim(),
          institutionCode: String(row.institutionCode || row.code || '').trim(),
          spreadsheetId: String(row.spreadsheetId || '').trim(),
          sheetWebhookUrl: String(row.sheetWebhookUrl || '').trim(),
          sheetTabName: String(row.sheetTabName || 'Responses').trim(),
          updatedAt: row.updatedAt || row.lastUpdated,
        })).filter((m: MasterSheetRowMapping) => m.institutionId !== '');

        return {
          success: true,
          mappings,
          message: `Retrieved ${mappings.length} institution mapping(s) from Master Google Sheet.`,
          source: 'master_webhook',
        };
      }
    } catch (err: any) {
      console.warn('Master Apps Script fetch error:', err.message);
    }
  }

  // 2. Secondary: Read from Master Google Sheet via GViz API if Spreadsheet ID is provided
  if (config.masterSpreadsheetId) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${config.masterSpreadsheetId}/gviz/tq?tqx=out:json`;
      const res = await fetch(gvizUrl);
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
        if (match && match[1]) {
          const json = JSON.parse(match[1]);
          const rows = json.table?.rows || [];
          const mappings: MasterSheetRowMapping[] = [];

          for (let r = 0; r < rows.length; r++) {
            const c = rows[r].c || [];
            const getVal = (idx: number) => {
              if (!c[idx]) return '';
              return c[idx].v !== null && c[idx].v !== undefined ? String(c[idx].v).trim() : '';
            };

            const instId = getVal(0);
            if (!instId || instId.toUpperCase() === 'INSTITUTION_ID') continue; // skip header or empty

            mappings.push({
              institutionId: instId,
              institutionName: getVal(1),
              institutionCode: getVal(2),
              spreadsheetId: getVal(3),
              sheetWebhookUrl: getVal(4),
              sheetTabName: getVal(5) || 'Responses',
              updatedAt: getVal(6),
            });
          }

          return {
            success: true,
            mappings,
            message: `Retrieved ${mappings.length} institution mapping(s) via Google Sheets GViz.`,
            source: 'master_gviz',
          };
        }
      }
    } catch (err: any) {
      console.warn('Master GViz fetch error:', err.message);
    }
  }

  return {
    success: false,
    mappings: [],
    message: 'Could not fetch mappings from Master Google Sheet. Please verify your Webhook URL or Spreadsheet ID.',
    source: 'unconnected',
  };
}

/**
 * Synchronizes all institutions currently loaded in the database with the Master Google Sheet.
 * Reads the master registry and attaches spreadsheetId, sheetWebhookUrl, and sheetTabName.
 */
export async function syncInstitutionsWithMasterSheet(): Promise<MasterSheetSyncResult> {
  const timestamp = new Date().toISOString();
  const fetchResult = await fetchMasterSheetMappings();

  if (!fetchResult.success) {
    runtimeMasterConfig.lastSyncResult = {
      success: false,
      message: fetchResult.message,
      count: 0,
    };
    return {
      success: false,
      message: fetchResult.message,
      syncedCount: 0,
      totalInstitutions: db.getInstitutions().length,
      mappings: [],
      timestamp,
    };
  }

  // Apply retrieved mappings to in-memory database institutions
  const updatedCount = db.applyMasterSheetMappings(fetchResult.mappings);

  runtimeMasterConfig.lastSyncedAt = timestamp;
  runtimeMasterConfig.lastSyncResult = {
    success: true,
    message: `Successfully synchronized ${updatedCount} institution(s) with Master Google Sheet.`,
    count: updatedCount,
  };

  return {
    success: true,
    message: `Successfully synchronized ${updatedCount} institution(s) with Master Google Sheet.`,
    syncedCount: updatedCount,
    totalInstitutions: db.getInstitutions().length,
    mappings: fetchResult.mappings,
    timestamp,
  };
}

/**
 * Upserts an institution's Google Sheet details into the Master Google Sheet.
 * If row exists for that institution id, updates it. If no row exists, adds one!
 */
export async function upsertInstitutionInMasterSheet(
  institution: Institution
): Promise<{ success: boolean; message: string; details?: any }> {
  const config = getMasterSheetConfig();

  if (!config.masterWebhookUrl) {
    return {
      success: false,
      message: 'Master Google Sheet Webhook URL is not configured. Config saved locally in database only.',
    };
  }

  const payload = {
    action: 'UPSERT_INSTITUTION',
    institutionId: institution.id,
    institutionName: institution.name,
    institutionCode: institution.code,
    spreadsheetId: institution.spreadsheetId || '',
    sheetWebhookUrl: institution.sheetWebhookUrl || '',
    sheetTabName: institution.sheetTabName || 'Responses',
    timestamp: new Date().toISOString(),
  };

  try {
    const result = await postToMasterAppsScript(config.masterWebhookUrl, payload);
    return {
      success: result.success,
      message: result.success
        ? `Reflected in Master Google Sheet registry row for ${institution.name}.`
        : `Master Registry update notice: ${result.message}`,
      details: result.data,
    };
  } catch (err: any) {
    console.error('Error upserting into Master Google Sheet:', err.message);
    return {
      success: false,
      message: `Failed to reflect in Master Google Sheet: ${err.message}`,
    };
  }
}

/**
 * Live connection check for the Master Google Sheet Webhook
 */
export async function testMasterSheetConnection(
  webhookUrl?: string
): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const url = (webhookUrl || getMasterSheetConfig().masterWebhookUrl || '').trim();

  if (!url) {
    return {
      success: false,
      message: 'No Master Google Sheet Webhook URL provided.',
      latencyMs: 0,
    };
  }

  if (!url.startsWith('https://script.google.com/macros/s/')) {
    return {
      success: false,
      message: 'Invalid URL format. Must start with https://script.google.com/macros/s/... and end with /exec',
      latencyMs: 0,
    };
  }

  const res = await postToMasterAppsScript(url, { action: 'PING' });
  return {
    success: res.success,
    message: res.success
      ? `Master Google Sheet Webhook connected successfully (${(res.latencyMs / 1000).toFixed(1)}s latency).`
      : `Master Webhook responded with: ${res.message}. Ensure deployment has 'Who has access: Anyone'.`,
    latencyMs: res.latencyMs,
  };
}

/**
 * Generates the complete, ready-to-use Google Apps Script code for the Master Registry Sheet.
 * Handles auto-header creation, doGet (reading mappings), and doPost (upserting rows).
 */
export function getMasterAppsScriptTemplate(): string {
  return `/**
 * MASTER REGISTRY GOOGLE APPS SCRIPT
 * Manages institutional Google Sheet IDs and Webhook URLs in a central registry.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Spreadsheet and name it "Master Institution Registry".
 * 2. Click: Extensions > Apps Script.
 * 3. Delete any code in Code.gs, paste ALL of this script, and click Save (Ctrl+S / Cmd+S).
 * 4. Click: Deploy > New deployment.
 *    - Click the gear icon next to "Select type" and choose: Web app.
 *    - Description: Master Registry Webhook
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone"  <-- CRITICAL: Choose "Anyone"
 * 5. Click Deploy. Authorize access if prompted.
 * 6. Copy the Web app URL (ends with /exec) and paste it as your Master Sheet Webhook URL in the app!
 */

// Handles GET requests (allows reading all institution mappings)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateRegistrySheet(ss);
    var mappings = readRegistryRows(sheet);
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: mappings.length,
      data: mappings
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handles POST requests (UPSERT institution rows and PING test)
function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : null;
    if (!raw) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No postData received"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(raw);
    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateRegistrySheet(ss);

    // 1. Connection check ping
    if (action === "PING" || action === "TEST_CONNECTION") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Master Registry Webhook connected successfully."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Read all institution mappings
    if (action === "GET_ALL_MAPPINGS") {
      var mappings = readRegistryRows(sheet);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        count: mappings.length,
        data: mappings
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. UPSERT institution row: if row exists for institutionId, update it; else add a new row
    if (action === "UPSERT_INSTITUTION") {
      var instId = payload.institutionId ? payload.institutionId.toString().trim() : "";
      var instName = payload.institutionName ? payload.institutionName.toString().trim() : "";
      var instCode = payload.institutionCode ? payload.institutionCode.toString().trim() : "";
      var spreadsheetId = payload.spreadsheetId ? payload.spreadsheetId.toString().trim() : "";
      var sheetWebhookUrl = payload.sheetWebhookUrl ? payload.sheetWebhookUrl.toString().trim() : "";
      var sheetTabName = payload.sheetTabName ? payload.sheetTabName.toString().trim() : "Responses";
      var timestamp = payload.timestamp || new Date().toISOString();

      if (!instId) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "institutionId is required"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var values = sheet.getDataRange().getValues();
      var foundRow = -1;

      // Scan rows to find existing institution by ID or Code (skip row 0 header)
      for (var i = 1; i < values.length; i++) {
        var rowId = values[i][0] ? values[i][0].toString().trim() : "";
        var rowCode = values[i][2] ? values[i][2].toString().trim() : "";
        if (rowId === instId || (instCode && rowCode === instCode)) {
          foundRow = i + 1; // 1-indexed sheet row
          break;
        }
      }

      if (foundRow > 0) {
        // Update existing row
        sheet.getRange(foundRow, 1, 1, 7).setValues([[
          instId,
          instName || values[foundRow - 1][1] || "",
          instCode || values[foundRow - 1][2] || "",
          spreadsheetId,
          sheetWebhookUrl,
          sheetTabName,
          timestamp
        ]]);

        return ContentService.createTextOutput(JSON.stringify({
          status: "updated",
          message: "Updated institution row for ID " + instId + " in Master Registry.",
          row: foundRow,
          data: {
            institutionId: instId,
            spreadsheetId: spreadsheetId,
            sheetWebhookUrl: sheetWebhookUrl,
            sheetTabName: sheetTabName,
            updatedAt: timestamp
          }
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        // If no row exists for that institution id, add a new row!
        sheet.appendRow([
          instId,
          instName,
          instCode,
          spreadsheetId,
          sheetWebhookUrl,
          sheetTabName,
          timestamp
        ]);

        return ContentService.createTextOutput(JSON.stringify({
          status: "created",
          message: "Added new row for institution ID " + instId + " in Master Registry.",
          row: sheet.getLastRow(),
          data: {
            institutionId: instId,
            spreadsheetId: spreadsheetId,
            sheetWebhookUrl: sheetWebhookUrl,
            sheetTabName: sheetTabName,
            createdAt: timestamp
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Unknown action: " + action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Ensures the MasterRegistry tab exists and has proper styled headers
function getOrCreateRegistrySheet(ss) {
  var sheet = ss.getSheetByName("MasterRegistry");
  if (!sheet) {
    var all = ss.getSheets();
    if (all.length === 1 && all[0].getLastRow() <= 1) {
      sheet = all[0];
      sheet.setName("MasterRegistry");
    } else {
      sheet = ss.insertSheet("MasterRegistry");
    }
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "INSTITUTION_ID",
      "INSTITUTION_NAME",
      "INSTITUTION_CODE",
      "SPREADSHEET_ID",
      "SHEET_WEBHOOK_URL",
      "SHEET_TAB_NAME",
      "LAST_UPDATED"
    ]);
    sheet.getRange(1, 1, 1, 7)
      .setFontWeight("bold")
      .setBackground("#e8f0fe")
      .setFontColor("#1a73e8");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 7);
  }
  return sheet;
}

// Helper to convert sheet rows into mapping objects
function readRegistryRows(sheet) {
  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) return [];
  var list = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var id = row[0] ? row[0].toString().trim() : "";
    if (!id || id.toUpperCase() === "INSTITUTION_ID") continue;

    list.push({
      institutionId: id,
      institutionName: row[1] ? row[1].toString().trim() : "",
      institutionCode: row[2] ? row[2].toString().trim() : "",
      spreadsheetId: row[3] ? row[3].toString().trim() : "",
      sheetWebhookUrl: row[4] ? row[4].toString().trim() : "",
      sheetTabName: row[5] ? row[5].toString().trim() : "Responses",
      updatedAt: row[6] ? row[6].toString().trim() : ""
    });
  }
  return list;
}
`;
}
