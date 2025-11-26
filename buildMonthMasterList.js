/**
 * buildMonthMasterList.js
 * Refactored to use CategoryEngine instead of hardcoded Settings columns.
 * Automatically builds Income, Savings, and all Expense categories
 * based on the block headers in Settings row 7.
 */

function buildMonthMasterList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settings = ss.getSheetByName('Settings');
  const sheet = ss.getActiveSheet();

  if (sheet.getName() === 'Settings' || sheet.getName() === 'Transactions') {
    SpreadsheetApp.getUi().alert("STOP\nYou must run this on a month tab, not Settings or Transactions.");
    return;
  }

  if (!settings) {
    SpreadsheetApp.getUi().alert("Error: Settings sheet not found.");
    return;
  }

  ss.toast("Updating month lists...", "Working", 3);

  const eng = getCategoryEngine();
  const blocks = eng.blocks; // { INCOME: [...], RESIDENCE: [...], ... }

  const COLORS = {
    INCOME: '#356854',
    SAVINGS: '#073763',
    EXPENSE: '#4c1130',
    WHITE: '#ffffff',
    BLACK: '#000000'
  };

  // -------------------------------
  // 1. INCOME (Column B, starting row 5)
  // -------------------------------

  if (blocks["INCOME"]) {
    writeSingleBlock_(sheet, "B", 5, "INCOME", blocks["INCOME"], COLORS.INCOME, COLORS.WHITE, 15);
  }

  // -------------------------------
  // 2. SAVINGS / INVESTING (Column B, starting row 21)
  // -------------------------------

  if (blocks["SAVINGS / INVESTING"]) {
    writeSingleBlock_(sheet, "B", 21, "SAVINGS / INVESTING", blocks["SAVINGS / INVESTING"], COLORS.SAVINGS, COLORS.WHITE, null);
  }

  // -------------------------------
  // 3. EXPENSES (stacked, starting column H)
  // -------------------------------

  const expenseStartCol = "H";
  const expenseStartRow = 6;

  const exclude = ["INCOME", "SAVINGS / INVESTING"];

  const expenseBlocks = Object.keys(blocks)
    .filter(b => !exclude.includes(b))
    .map(b => ({
      name: b,
      values: blocks[b]
    }));

  writeStackedBlocks_(sheet, expenseStartCol, expenseStartRow, expenseBlocks, COLORS.EXPENSE, COLORS.WHITE);

  ss.toast("Month lists updated.", "Done", 3);
}

/**
 * Writes a single block (Income or Savings)
 */
function writeSingleBlock_(sheet, colLetter, startRow, headerName, values, bgColor, txtColor, limit) {
  const col = letterToCol(colLetter);
  const maxRows = sheet.getMaxRows();
  const clearHeight = limit ? limit : maxRows - startRow + 1;

  sheet.getRange(startRow, col, clearHeight, 1).clearContent();

  const output = [[headerName], ...values.map(v => [v])];
  sheet.getRange(startRow, col, output.length, 1).setValues(output);

  const headerRange = sheet.getRange(startRow, col, 1, 4);
  headerRange.setFontWeight("bold")
    .setBackground(bgColor)
    .setFontColor(txtColor);

  if (output.length > 1) {
    sheet.getRange(startRow + 1, col, output.length - 1, 4)
      .setBackground("#ffffff")
      .setFontColor("#000000");
  }

  const emptyStart = startRow + output.length;
  const emptyCount = clearHeight - output.length;

  if (emptyCount > 0) {
    sheet.getRange(emptyStart, col, emptyCount, 4)
      .setBackground(null)
      .setBorder(false, false, false, false, false, false);
  }
}

/**
 * Writes stacked expenses vertically (residence, transportation, etc.)
 */
function writeStackedBlocks_(sheet, colLetter, startRow, blockList, bgColor, txtColor) {
  const col = letterToCol(colLetter);
  const maxRows = sheet.getMaxRows();
  const clearHeight = maxRows - startRow + 1;

  sheet.getRange(startRow, col, clearHeight, 1).clearContent();

  let output = [];
  let headerIndexes = [];

  blockList.forEach(b => {
    if (!b.values.length) return;
    headerIndexes.push(output.length);
    output.push([b.name]);
    b.values.forEach(v => output.push([v]));
    output.push([""]);
  });

  if (output.length === 0) return;

  sheet.getRange(startRow, col, output.length, 1).setValues(output);

  sheet.getRange(startRow, col, output.length, 4)
    .setBackground("#ffffff")
    .setFontColor("#000000");

  headerIndexes.forEach(idx => {
    sheet.getRange(startRow + idx, col, 1, 4)
      .setFontWeight("bold")
      .setBackground(bgColor)
      .setFontColor(txtColor);
  });

  const emptyStart = startRow + output.length;
  const emptyCount = clearHeight - output.length;

  if (emptyCount > 0) {
    sheet.getRange(emptyStart, col, emptyCount, 4)
      .setBackground(null)
      .setBorder(false, false, false, false, false, false);
  }
}

/**
 * Letter → column number
 */
function letterToCol(letter) {
  let sum = 0;
  for (let i = 0; i < letter.length; i++) {
    sum = sum * 26 + (letter.charCodeAt(i) - 64);
  }
  return sum;
}
