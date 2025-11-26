/**
 * MonthSync.js
 * Rebuilt for performance, clarity, and your new 2025 architecture.
 *
 * Responsibilities:
 *  1. Read summary sheet period (Month, Quarter, Annual)
 *  2. Compute date window
 *  3. Aggregate category totals from Transactions
 *  4. Write subtotals under each section header
 *  5. Update bold section totals
 *
 * No duplicated logic. No magic numbers. Fully schema-driven.
 */

const TX_SHEET = 'Transactions';

/** Unified transaction schema for both sides */
const TRANSACTION_SCHEMA = {
  left: {
    date: 0,
    debit: 2,
    credit: 3,
    category: 5
  },
  right: {
    date: 9,
    amt: 11,
    category: 14
  }
};

/** Month and quarter definitions */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const QUARTERS = {
  'Q1': [0,2],
  'Q2': [3,5],
  'Q3': [6,8],
  'Q4': [9,11],
  'First Quarter': [0,2],
  'Second Quarter': [3,5],
  'Third Quarter': [6,8],
  'Fourth Quarter': [9,11]
};

/** Sheet layout model */
const OVERVIEW = {
  periodCell: 'B2',
  yearCell: 'B1',
  sections: [
    { label: 'INCOME',   catCol: 'B', sumCol: 'E', startRow: 6, mode: 'Income' },
    { label: 'SAVINGS',  catCol: 'B', sumCol: 'E', startRow: 22, mode: 'Savings' },
    { label: 'EXPENSES', catCol: 'H', sumCol: 'K', startRow: 6, mode: 'Expenses' }
  ]
};

/**
 * Public entry point used by the menu
 */
function refreshOverview() {
  const sh = SpreadsheetApp.getActiveSheet();
  updateSummarySheet(sh);
}

/**
 * Refresh all 12 month tabs
 */
function updateAllMonths() {
  const ss = SpreadsheetApp.getActive();
  MONTHS.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (sh) updateSummarySheet(sh, true);
  });
}

/**
 * Core function
 */
function updateSummarySheet(sh, silent) {
  const name = sh.getName();
  if (name !== 'Overview' && !MONTHS.includes(name) && name !== 'October') return;

  const ss = SpreadsheetApp.getActive();
  const period = sh.getRange(OVERVIEW.periodCell).getDisplayValue().trim();
  const year   = Number(sh.getRange(OVERVIEW.yearCell).getValue()) || new Date().getFullYear();
  if (!period) return;

  const window = resolveDateWindow(period, year);
  if (!window) return;

  const tx = ss.getSheetByName(TX_SHEET);
  if (!tx) return;

  const data = tx.getDataRange().getValues();
  const summary = aggregateTransactions(data, window);

  OVERVIEW.sections.forEach(sec => {
    applySectionTotals(sh, sec, summary);
  });

  updateSubtotals(sh);

  if (!silent) ss.toast(`Updated for ${period}`, 'Summary Refreshed', 2);
}

/**
 * Convert "February", "Q2", or "Annual" into start & end dates
 */
function resolveDateWindow(period, year) {
  if (period === 'Annual') {
    return {
      start: new Date(year,0,1),
      end:   new Date(year,11,31)
    };
  }

  if (QUARTERS[period]) {
    const [m1,m2] = QUARTERS[period];
    return {
      start: new Date(year,m1,1),
      end:   new Date(year,m2+1,0)
    };
  }

  const m = MONTHS.indexOf(period);
  if (m >= 0) {
    return {
      start: new Date(year,m,1),
      end:   new Date(year,m+1,0)
    };
  }

  return null;
}

/**
 * Aggregation engine
 * Returns:
 * {
 *   Income: { "PAYROLL": 1234, ... },
 *   Savings: { "TFSA": 500, ... },
 *   Expenses: { "GAS": 120, ... }
 * }
 */
function aggregateTransactions(data, window) {
  const out = { Income:{}, Savings:{}, Expenses:{} };
  const { start, end } = window;

  for (let i = 3; i < data.length; i++) {
    const row = data[i];

    // LEFT side
    const d1 = parseDate(row[TRANSACTION_SCHEMA.left.date]);
    if (validDateRange(d1,start,end)) {
      const cat = norm(row[TRANSACTION_SCHEMA.left.category]);
      if (!cat) continue;

      const debit = num(row[TRANSACTION_SCHEMA.left.debit]);
      const credit = num(row[TRANSACTION_SCHEMA.left.credit]);

      if (credit > 0) addTo(out.Income, cat, credit);
      if (debit > 0) addTo(out.Expenses, cat, debit);
    }

    // RIGHT side
    const d2 = parseDate(row[TRANSACTION_SCHEMA.right.date]);
    if (validDateRange(d2,start,end)) {
      const cat = norm(row[TRANSACTION_SCHEMA.right.category]);
      if (!cat) continue;

      const amt = num(row[TRANSACTION_SCHEMA.right.amt]);
      if (amt > 0) addTo(out.Expenses, cat, amt);
    }
  }

  return out;
}

/**
 * Write summary values back to the sheet
 */
function applySectionTotals(sh, sec, summary) {
  const catCol = a1ToCol(sec.catCol);
  const valCol = a1ToCol(sec.sumCol);

  const last = sh.getLastRow();
  const maxRows = last - sec.startRow + 1;
  if (maxRows <= 0) return;

  const catRange = sh.getRange(sec.startRow, catCol, maxRows, 1).getValues();
  const out = [];

  for (let i = 0; i < catRange.length; i++) {
    const c = norm(catRange[i][0]);
    if (!c) { out.push(['']); continue; }
    out.push([ summary[sec.mode][c] || 0 ]);
  }

  sh.getRange(sec.startRow, valCol, out.length, 1).setValues(out);
}

/**
 * Recompute bold header subtotals
 */
function updateSubtotals(sh) {
  const groups = [
    { catCol:'B', valCol:'E', startRow:5 },
    { catCol:'H', valCol:'K', startRow:5 }
  ];

  groups.forEach(g => {
    const catVals = sh.getRange(`${g.catCol}${g.startRow}:${g.catCol}${sh.getLastRow()}`).getValues();
    const valRange = sh.getRange(`${g.valCol}${g.startRow}:${g.valCol}${sh.getLastRow()}`);
    const valVals = valRange.getValues();

    const headers = [];
    for (let i=0;i<catVals.length;i++) {
      const txt = String(catVals[i][0]||'');
      if (txt === txt.toUpperCase() && /[A-Z]/.test(txt)) headers.push(i);
    }

    headers.forEach((idx,h) => {
      const start = idx+1;
      const end = (h === headers.length-1) ? catVals.length : headers[h+1];
      let total = 0;
      for (let r=start;r<end;r++) {
        if (typeof valVals[r][0] === 'number') total += valVals[r][0];
      }
      valVals[idx][0] = total;
    });

    valRange.setValues(valVals);
  });
}

/* Utility */
function addTo(obj,cat,val){ obj[cat] = (obj[cat]||0) + val; }
function num(v){ const n=Number(v); return isNaN(n)?0:n; }
function norm(v){ return String(v||'').trim().toUpperCase(); }
function parseDate(v){ const d = new Date(v); return isNaN(d)?null:d; }
function validDateRange(d,s,e){ return d && d>=s && d<=e; }

function a1ToCol(a){
  let n = 0;
  for (let i=0;i<a.length;i++) n = n*26 + (a.charCodeAt(i)-64);
  return n;
}

function openRulesDialog() {
  const html = HtmlService.createHtmlOutputFromFile('Rules')
    .setWidth(760)
    .setHeight(540);
  SpreadsheetApp.getUi().showModalDialog(html, 'Manage Saved Rules');
}
