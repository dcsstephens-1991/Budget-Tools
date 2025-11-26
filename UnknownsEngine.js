/** ============================================================================
 * UNKNOWNS ENGINE
 * ----------------------------------------------------------------------------
 * Identifies and groups all transactions missing a category or set to:
 *   "" , "Unknown" , "None"
 *
 * Works for both Debit side (cols B–G) and Credit side (cols K–P)
 * Used by ResolveUnknowns.html and RefreshBudgetSystem.
 * ============================================================================ */

function UnknownsEngine() {
  return {
    scan: getUnknownTransactions
  };
}

/**
 * Returns grouped unknowns in this format:
 *
 * [
 *   {
 *     keyword: "UBER TRIP",
 *     count: 5,
 *     averageDebit: 12.45,
 *     averageCredit: 0,
 *     direction: "out"
 *   }
 * ]
 */
function getUnknownTransactions() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Transactions");
  if (!sh) return [];

  const last = sh.getLastRow();
  if (last < 5) return [];

  // Pull entire transaction block
  const data = sh.getRange(5, 1, last - 4, sh.getLastColumn()).getValues();

  const groups = {};

  for (let r of data) {
    if (isEmptyRow_(r)) continue;

    /* -----------------------------------------------------------
     * LEFT SIDE  (Debit)
     * ----------------------------------------------------------- */
    const descL = String(r[1] || "").trim();
    const amtL  = Number(r[2] || 0);
    const catL  = String(r[5] || "").trim();

    if (descL && isUnknownCategory_(catL)) {
      const key = descL.toLowerCase();
      if (!groups[key]) {
        groups[key] = {
          keyword: descL,
          count: 0,
          totalDebit: 0,
          totalCredit: 0
        };
      }
      groups[key].count++;
      if (amtL > 0) groups[key].totalDebit += amtL;
    }

    /* -----------------------------------------------------------
     * RIGHT SIDE (Credit)
     * ----------------------------------------------------------- */
    const descR = String(r[10] || "").trim();
    const amtR  = Number(r[11] || 0);
    const catR  = String(r[14] || "").trim();

    if (descR && isUnknownCategory_(catR)) {
      const key = descR.toLowerCase();
      if (!groups[key]) {
        groups[key] = {
          keyword: descR,
          count: 0,
          totalDebit: 0,
          totalCredit: 0
        };
      }
      groups[key].count++;
      if (amtR > 0) groups[key].totalCredit += amtR;
    }
  }

  /* -----------------------------------------------------------
   * Convert grouped structure to array
   * ----------------------------------------------------------- */
  const out = [];
  for (let k in groups) {
    const g = groups[k];
    const count = Math.max(1, g.count);
    out.push({
      keyword: g.keyword,
      count: g.count,
      averageDebit: g.totalDebit / count,
      averageCredit: g.totalCredit / count,
      direction: g.totalDebit > g.totalCredit ? "out" : "in"
    });
  }

  // Sort by count (descending)
  out.sort((a, b) => b.count - a.count);

  return out;
}

/** ============================================================================
 * HELPERS
 * ============================================================================ */

function isUnknownCategory_(cat) {
  if (!cat) return true;
  const c = cat.trim().toLowerCase();
  return c === "" || c === "unknown" || c === "none";
}

/**
 * Checks if entire row is empty.
 */
function isEmptyRow_(row) {
  return row.join("").trim() === "";
}
