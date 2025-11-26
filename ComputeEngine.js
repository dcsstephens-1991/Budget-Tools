/** ============================================================================
 * COMPUTE ENGINE
 * ----------------------------------------------------------------------------
 * This engine calculates ALL numeric totals used by the Overview sheet.
 *
 * It computes:
 *   • Income totals
 *   • Spending totals
 *   • Needs, Wants, Savings, Debt totals
 *   • Section Totals (Residence, Transport, Daily Living, ... Savings, Debt)
 *   • Monthly Income & Spending (for line chart)
 *
 * All calculations read from:
 *     Transactions sheet (rows 5 → end)
 *     Category (F,O) and Type (G,P)
 *
 * Results are written to fixed Overview ranges.
 * ============================================================================
 */

function ComputeEngine() {
  return {
    updateOverview: refreshOverviewTotals,
    updateAll: refreshOverviewTotals,
    computeTotals: computeAllTotals
  };
}

/** ============================================================================
 * MASTER ENTRY
 * ============================================================================ */

function refreshOverviewTotals() {
  const totals = computeAllTotals();
  writeTotalsToOverview(totals);
  return totals;
}

/** ============================================================================
 * CORE CALC ENGINE
 * ============================================================================ */

function computeAllTotals() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Transactions");
  if (!sh) throw new Error("Transactions sheet not found");

  const last = sh.getLastRow();
  if (last < 5) {
    return emptyTotals();
  }

  const data = sh.getRange(5,1,last-4, sh.getLastColumn()).getValues();

  // MASTER ACCUMULATOR
  const totals = {
    income: 0,
    spending: 0,

    // Needs/Wants/Savings/Debt buckets
    needs: 0,
    wants: 0,
    savings: 0,
    debt: 0,

    // Section totals
    section: {
      Residence: 0,
      Transportation: 0,
      "Daily Living": 0,
      Banking: 0,
      Health: 0,
      Vacation: 0,
      Debt: 0,
      Savings: 0
    },

    // Monthly totals
    monthly: {},  // { "2024-01": { income:0, spending:0 } }
  };

  /** Helper: converts date to YYYY-MM key */
  function monthKey(d) {
    if (!(d instanceof Date)) return null;
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");
  }

  /** Process LEFT and RIGHT sides of each row */
  for (let r of data) {

    // LEFT SIDE ---------------------------------------------------------------
    const dtL = r[0];
    const descL = String(r[1]||"");
    const amtL = Number(r[2]||0);
    const catL = String(r[5]||"");
    const typeL = String(r[6]||"");

    if (descL && amtL !== 0) {
      const mk = monthKey(dtL);
      if (mk && !totals.monthly[mk]) {
        totals.monthly[mk] = { income:0, spending:0 };
      }

      if (typeL === "Income") {
        totals.income += amtL;
        if (mk) totals.monthly[mk].income += amtL;
      } else {
        totals.spending += amtL;
        if (mk) totals.monthly[mk].spending += amtL;
      }

      bucketize(totals, typeL, amtL);
      sectionize(totals, catL, amtL);
    }

    // RIGHT SIDE --------------------------------------------------------------
    const dtR = r[9];
    const descR = String(r[10]||"");
    const amtR = Number(r[11]||0);
    const catR = String(r[14]||"");
    const typeR = String(r[15]||"");

    if (descR && amtR !== 0) {
      const mk = monthKey(dtR);
      if (mk && !totals.monthly[mk]) {
        totals.monthly[mk] = { income:0, spending:0 };
      }

      if (typeR === "Income") {
        totals.income += amtR;
        if (mk) totals.monthly[mk].income += amtR;
      } else {
        totals.spending += amtR;
        if (mk) totals.monthly[mk].spending += amtR;
      }

      bucketize(totals, typeR, amtR);
      sectionize(totals, catR, amtR);
    }
  }

  return totals;
}

/** ============================================================================
 * HELPERS
 * ============================================================================ */

/** Fills Needs/Wants/Savings/Debt buckets */
function bucketize(totals, type, amount) {
  switch(type) {
    case "Need": totals.needs += amount; break;
    case "Want": totals.wants += amount; break;
    case "Savings": totals.savings += amount; break;
    case "Debt": totals.debt += amount; break;
  }
}

/** Fills section totals */
function sectionize(totals, category, amount) {
  if (!category) return;

  const sec = guessSection(category);

  if (sec && totals.section[sec] !== undefined) {
    totals.section[sec] += amount;
  }
}

/**
 * Determines which section a category belongs to.
 * This relies on the category tables in Settings.
 * We map based on hardcoded names (safe, stable).
 */
function guessSection(cat) {
  const map = {
    Residence: ["Rent","Mortgage","Utilities","Home Insurance","Property Tax","Internet"],
    Transportation: ["Fuel","Parking","Car Insurance","Transit","Uber","Maintenance"],
    "Daily Living": ["Groceries","Restaurants","Shopping","Subscriptions","Pets"],
    Banking: ["Fees","ATM","Transfers","Service Fee"],
    Health: ["Pharmacy","Medical","Dental","Gym"],
    Vacation: ["Hotel","Flight","Travel","Excursion"],
    Debt: ["Loan","Credit Card","Line of Credit"],
    Savings: ["RRSP","TFSA","Investments","Savings"]
  };

  const catU = cat.toUpperCase();

  for (let k in map) {
    for (let t of map[k]) {
      if (catU.indexOf(t.toUpperCase()) !== -1) return k;
    }
  }

  return null;
}

/** Empty object when sheet is empty */
function emptyTotals() {
  return {
    income:0, spending:0,
    needs:0, wants:0, savings:0, debt:0,
    section:{Residence:0,Transportation:0,"Daily Living":0,Banking:0,Health:0,Vacation:0,Debt:0,Savings:0},
    monthly:{}
  };
}

/** ============================================================================
 * Write computed results to Overview sheet
 * ============================================================================ */

function writeTotalsToOverview(t) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Overview");
  if (!sh) return;

  /** Main header totals */
  sh.getRange("C6").setValue(t.income);
  sh.getRange("C7").setValue(t.spending);

  /** Needs/Wants/Savings/Debt breakdown */
  sh.getRange("C12").setValue(t.needs);
  sh.getRange("C13").setValue(t.wants);
  sh.getRange("C14").setValue(t.savings);
  sh.getRange("C15").setValue(t.debt);

  /** Section Totals */
  const order = [
    "Residence","Transportation","Daily Living","Banking",
    "Health","Vacation","Debt","Savings"
  ];

  for (let i = 0; i < order.length; i++) {
    sh.getRange(60 + i, 3).setValue(t.section[order[i]]); // column C
  }

  /** Monthly totals (for line chart) */
  const months = Object.keys(t.monthly).sort();
  for (let i = 0; i < months.length; i++) {
    sh.getRange(25+i, 3).setValue(t.monthly[months[i]].income);
    sh.getRange(25+i, 4).setValue(t.monthly[months[i]].spending);
  }
}
