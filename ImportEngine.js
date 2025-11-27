/** ============================================================================
 * IMPORT ENGINE
 * ----------------------------------------------------------------------------
 * Handles:
 * - CSV import into Cheque/Savings (Left) or Credit Card (Right)
 * - Auto-resolving Debit/Credit/Balance
 * - Storing/Retrieving Import Presets (Memory)
 * ============================================================================ */

function ImportEngine() {
  return {
    importCsv: importCsv_,
    getPresets: getPresets_,
    savePreset: savePreset_,
    deletePreset: deletePreset_
  };
}

/** ============================================================================
 * MEMORY / PRESETS
 * ============================================================================ */
function getPresets_() {
  const raw = PropertiesService.getScriptProperties().getProperty("IMPORT_MAP_PRESETS");
  return raw ? JSON.parse(raw) : {};
}

function savePreset_(name, mapData) {
  const presets = getPresets_();
  presets[name] = mapData;
  PropertiesService.getScriptProperties().setProperty("IMPORT_MAP_PRESETS", JSON.stringify(presets));
  return Object.keys(presets);
}

function deletePreset_(name) {
  const presets = getPresets_();
  delete presets[name];
  PropertiesService.getScriptProperties().setProperty("IMPORT_MAP_PRESETS", JSON.stringify(presets));
  return Object.keys(presets);
}

/** ============================================================================
 * MAIN CSV IMPORT ROUTINE
 * ============================================================================ */
function importCsv_(csvText, opts) {
  if (!csvText) throw new Error("CSV text empty.");
  opts = opts || {};

  const targetSheet = opts.targetSheet || "Transactions";
  const sh = SpreadsheetApp.getActive().getSheetByName(targetSheet);
  if (!sh) throw new Error("Target sheet " + targetSheet + " not found.");

  const side = opts.targetSide || "Left"; 

  const parsed = Utilities.parseCsv(csvText, ",");
  if (!parsed || parsed.length === 0) return { inserted: 0 };

  let rows = parsed;
  if (opts.hasHeader) rows = rows.slice(1);

  const mapping = opts.mapping || {};
  const resultRows = [];

  rows.forEach(raw => {
    const vals = parseRawValues_(raw, mapping, opts);
    if (!vals) return; 

    if (side === "Left") {
      // Left Table (A:G): [Date, Desc, Debit, Credit, Balance, Cat, Type]
      resultRows.push([
        vals.date,
        vals.desc,
        vals.debit,
        vals.credit,
        vals.balance, // Column E
        "", "" 
      ]);
    } else {
      // Right Table (J:P): [Date, Desc, Amount, Balance, Cat, Type]
      const netAmount = vals.debit - vals.credit;
      resultRows.push([
        vals.date,
        vals.desc,
        netAmount,
        vals.balance, // Column M (if following standard structure)
        "", "", "" 
      ]);
    }
  });

  if (resultRows.length === 0) return { inserted: 0 };

  // Append Logic
  let startRow = 5; 
  let startCol = 1; 

  if (side === "Left") {
    startCol = 1; // A
    const lastRow = sh.getRange("A:A").getLastRow();
    startRow = Math.max(5, lastRow + 1);
  } else {
    startCol = 10; // J
    const lastRow = sh.getRange("J:J").getLastRow();
    startRow = Math.max(5, lastRow + 1);
  }

  sh.getRange(startRow, startCol, resultRows.length, resultRows[0].length)
    .setValues(resultRows);

  const sync = SyncEngine();
  if (sync && sync.afterImport) sync.afterImport();

  return { inserted: resultRows.length };
}

/** ============================================================================
 * HELPERS
 * ============================================================================ */
function parseRawValues_(raw, mapping, opts) {
  const dateVal = parseImportDate_(raw[mapping.date]);
  const desc    = cleanText_(raw[mapping.description]);
  const bal     = parseAmount_(raw[mapping.balance]); // Parse Balance

  let debit = 0;
  let credit = 0;

  if (opts.useSingleColumn) {
    const amt = parseAmount_(raw[mapping.amount]);
    if (amt < 0) {
      debit = Math.abs(amt); 
    } else {
      credit = amt;          
    }
  } else {
    debit  = parseAmount_(raw[mapping.debit]);
    credit = parseAmount_(raw[mapping.credit]);
  }

  if (!desc && debit === 0 && credit === 0) return null;

  return { date: dateVal, desc: desc, debit: debit, credit: credit, balance: bal };
}

function parseImportDate_(val) {
  if (!val) return "";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "" : d;
}

function parseAmount_(v) {
  if (!v) return 0;
  const s = String(v).replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function cleanText_(s) {
  return String(s || "").trim();
}