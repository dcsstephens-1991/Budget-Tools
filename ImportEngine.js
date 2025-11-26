/** ============================================================================
 * IMPORT ENGINE
 * ----------------------------------------------------------------------------
 * Handles:
 *   - CSV import from Importer.html
 *   - User preferences for mapping
 *   - Writing rows into Transactions in clean format
 *   - Normalizing dates, amounts, descriptions
 *   - Triggering Categorization and Compute updates after import
 * ============================================================================ */

function ImportEngine() {
  return {
    importCsv: importCsv_,
    savePreferences: saveImportPreferences_,
    getPreferences: getImportPreferences_
  };
}

/** ============================================================================
 * PREFERENCES (stored in Script Properties)
 * ============================================================================ */

function saveImportPreferences_(prefs) {
  PropertiesService.getScriptProperties().setProperty(
    "IMPORT_PREFS",
    JSON.stringify(prefs || {})
  );
}

function getImportPreferences_() {
  const raw = PropertiesService.getScriptProperties().getProperty("IMPORT_PREFS");
  return raw ? JSON.parse(raw) : {};
}

/** ============================================================================
 * MAIN CSV IMPORT ROUTINE
 * ============================================================================ */

function importCsv_(csvText, opts) {
  if (!csvText) throw new Error("CSV text empty.");
  opts = opts || {};

  const targetSheet = opts.targetSheet;
  if (!targetSheet) throw new Error("Target sheet not provided.");

  const sh = SpreadsheetApp.getActive().getSheetByName(targetSheet);
  if (!sh) throw new Error("Target sheet " + targetSheet + " not found.");

  const delimiter = opts.delimiter || ",";

  const parsed = Utilities.parseCsv(csvText, delimiter);
  if (!parsed || parsed.length === 0) {
    throw new Error("CSV parsing produced no rows.");
  }

  let rows = parsed;
  if (opts.hasHeader) {
    rows = rows.slice(1); // remove header row
  }

  const mapping = opts.mapping || {};
  const resultRows = [];

  rows.forEach(raw => {
    const r = buildTransactionRow_(raw, mapping);
    if (r) resultRows.push(r);
  });

  if (resultRows.length === 0) {
    throw new Error("No valid rows produced.");
  }

  // Append to sheet
  const startRow = sh.getLastRow() + 1;
  sh.getRange(startRow, 1, resultRows.length, resultRows[0].length)
    .setValues(resultRows);

  // After import flows
  const sync = SyncEngine();
  sync.afterImport();

  return {
    inserted: resultRows.length,
    firstRow: startRow,
    lastRow: startRow + resultRows.length - 1
  };
}

/** ============================================================================
 * BUILD CLEAN TRANSACTION ROW
 * ============================================================================ */

function buildTransactionRow_(raw, mapping) {
  // Transaction sheet columns we fill:
  // A date    → parsed
  // B desc    → text
  // C debit   → numeric
  // D credit  → numeric
  // E balance → optional
  //
  // F, G, O, P (category/type) will be filled later by CategorizationEngine

  const dateVal = parseImportDate_(raw[mapping.date]);
  const desc    = cleanText_(raw[mapping.description]);
  const debit   = parseAmount_(raw[mapping.debit]);
  const credit  = parseAmount_(raw[mapping.credit]);
  const balance = parseAmount_(raw[mapping.balance]);

  if (!desc && (!debit && !credit)) {
    return null;
  }

  return [
    dateVal,
    desc,
    debit,
    credit,
    balance,
    "",   // F Category (left)
    "",   // G Type
    "",   // H unused
    "",   // I unused
    "",   // J unused
    desc, // K mirror description for inbound side (used by your model)
    credit,
    "", "", "", // L M N
    "",         // O Category (right)
    ""          // P Type
  ];
}

/** ============================================================================
 * HELPERS
 * ============================================================================ */

function parseImportDate_(val) {
  if (!val) return "";

  // Try native date
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // Try DD/MM/YYYY or YYYY-MM-DD
  const s = String(val).trim();
  const partsSlash = s.split("/");
  if (partsSlash.length === 3) {
    const dd = parseInt(partsSlash[0], 10);
    const mm = parseInt(partsSlash[1], 10) - 1;
    const yy = parseInt(partsSlash[2], 10);
    if (dd && mm >= 0) return new Date(yy, mm, dd);
  }

  const partsDash = s.split("-");
  if (partsDash.length === 3) {
    const yy = parseInt(partsDash[0], 10);
    const mm = parseInt(partsDash[1], 10) - 1;
    const dd = parseInt(partsDash[2], 10);
    if (dd && mm >= 0) return new Date(yy, mm, dd);
  }

  return "";
}

function parseAmount_(v) {
  if (!v) return 0;
  const s = String(v).replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function cleanText_(s) {
  if (!s) return "";
  return String(s).trim();
}
