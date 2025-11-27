/** ============================================================================
 * COMPUTE ENGINE (MASTER)
 * ----------------------------------------------------------------------------
 * The single source of truth for all Overview calculations.
 *
 * Responsibilities:
 * 1. Read "Period" (B2) and "Year" (B1) from Overview.
 * 2. Sum Transactions based on that date range.
 * 3. Update Dashboard Numbers (Col C).
 * 4. Update Hidden Chart Data (Cols Q-R & T-V).
 * ============================================================================
 */

function ComputeEngine() {
  return {
    updateOverview: refreshOverviewTotals,
    computeAll: refreshOverviewTotals // Alias for compatibility
  };
}

function refreshOverviewTotals() {
  const ss = SpreadsheetApp.getActive();
  const shOv = ss.getSheetByName("Overview");
  const shTx = ss.getSheetByName("Transactions");

  if (!shOv || !shTx) throw new Error("Missing Overview or Transactions sheet.");

  // 1. GET DATE WINDOW
  const periodVal = shOv.getRange("B2").getDisplayValue().trim(); // e.g. "Annual", "January"
  const yearVal = Number(shOv.getRange("B1").getValue()) || new Date().getFullYear();
  
  // Use PeriodEngine logic (inline here for safety or call PeriodEngine if available)
  const dateWindow = resolveDateRange_(periodVal, yearVal);
  if (!dateWindow) {
    SpreadsheetApp.getActive().toast("Invalid Period selected.", "Error");
    return;
  }

  // 2. FETCH DATA
  const lastRow = shTx.getLastRow();
  if (lastRow < 5) return; // No data
  const data = shTx.getRange(5, 1, lastRow - 4, 16).getValues(); // Cols A to P

  // 3. INITIALIZE ACCUMULATORS
  const totals = {
    income: 0,
    spending: 0,
    needs: 0,
    wants: 0,
    savings: 0,
    debt: 0,
    // Sections
    sections: {
      "Residence": 0, "Transportation": 0, "Daily Living": 0, "Entertainment": 0,
      "Health": 0, "Vacation": 0, "Banking": 0, "Savings": 0, "Debt": 0, "Income": 0
    },
    // Monthly Trend (Always Jan-Dec for the selected year, regardless of period)
    monthly: Array(12).fill(0).map(() => ({ inc: 0, exp: 0 }))
  };

  // 4. PROCESS ROW-BY-ROW
  data.forEach(row => {
    processTransactionSide_(row, 0, 1, 2, 5, 6, totals, dateWindow, yearVal);   // Left: Date=0, Desc=1, Amt=2, Cat=5, Type=6
    processTransactionSide_(row, 9, 10, 11, 14, 15, totals, dateWindow, yearVal); // Right: Date=9, Desc=10, Amt=11, Cat=14, Type=15
  });

  // 5. WRITE RESULTS TO OVERVIEW
  writeDashboardResults_(shOv, totals);
  
  SpreadsheetApp.getActive().toast(`Updated for ${periodVal} ${yearVal}`, "Compute Complete", 1);
}

/** * Helper: Process one side (Debit or Credit) of a transaction row 
 */
function processTransactionSide_(row, idxDate, idxDesc, idxAmt, idxCat, idxType, totals, window, year) {
  const date = row[idxDate];
  const amt = Number(row[idxAmt] || 0);
  const cat = String(row[idxCat] || "").trim();
  const type = String(row[idxType] || "").trim();

  if (!date || !(date instanceof Date) || amt === 0) return;

  // A) MONTHLY TREND (Filtered by Year only)
  if (date.getFullYear() === year) {
    const m = date.getMonth(); // 0-11
    if (type === "Income") {
      totals.monthly[m].inc += amt;
    } else {
      totals.monthly[m].exp += amt;
    }
  }

  // B) PERIOD TOTALS (Filtered by Period Window)
  if (date >= window.start && date <= window.end) {
    
    // Major Buckets
    if (type === "Income") {
      totals.income += amt;
    } else {
      totals.spending += amt;
      
      if (type === "Need") totals.needs += amt;
      if (type === "Want") totals.wants += amt;
      if (type === "Savings") totals.savings += amt;
      if (type === "Debt") totals.debt += amt;
    }

    // Section Buckets (Heuristic mapping based on category name or existing map)
    // We try to match the Category Group. If you have a CategoryEngine, use it. 
    // For now, we use the simpler "Guess" or if your sheet writes the Group to a column, read that.
    // Assuming 'guessSection' or direct map.
    const section = guessSection_(cat, type); 
    if (section && totals.sections[section] !== undefined) {
      totals.sections[section] += amt;
    }
  }
}

/** * Resolve Start/End dates based on dropdown 
 */
function resolveDateRange_(period, year) {
  if (period === "Annual") {
    return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
  }
  
  const quarters = {
    "Q1": [0, 2], "First Quarter": [0, 2],
    "Q2": [3, 5], "Second Quarter": [3, 5],
    "Q3": [6, 8], "Third Quarter": [6, 8],
    "Q4": [9, 11], "Fourth Quarter": [9, 11]
  };
  
  if (quarters[period]) {
    return { start: new Date(year, quarters[period][0], 1), end: new Date(year, quarters[period][1] + 1, 0) };
  }

  // Try Month Name
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const mIdx = months.indexOf(period);
  if (mIdx > -1) {
    return { start: new Date(year, mIdx, 1), end: new Date(year, mIdx + 1, 0) };
  }

  return null;
}

/**
 * Determine Section based on Category Name (Fallback logic)
 * You can enhance this by reading your Settings table if preferred.
 */
function guessSection_(cat, type) {
  if (type === "Income") return "Income";
  if (type === "Debt") return "Debt";
  if (type === "Savings") return "Savings";

  // Map keywords to sections
  const c = cat.toUpperCase();
  if (c.match(/RENT|MORTGAGE|UTILITIES|INTERNET|HOME|INSURANCE/)) return "Residence";
  if (c.match(/FUEL|GAS|PARKING|TOLL|UBER|TRANSIT|CAR|VEHICLE/)) return "Transportation";
  if (c.match(/GROCERIES|RESTAURANT|DINING|COFFEE|PET|SUBSCRIPTION|PHONE/)) return "Daily Living";
  if (c.match(/MOVIES|GAME|SPORT|HOBBY|NETFLIX/)) return "Entertainment";
  if (c.match(/DOCTOR|DENTIST|PHARMACY|GYM|HEALTH|LIFE/)) return "Health";
  if (c.match(/HOTEL|FLIGHT|AIRBNB|TRAVEL/)) return "Vacation";
  if (c.match(/FEE|BANK|TRANSFER/)) return "Banking";

  return "Daily Living"; // Default catch-all
}

/** * Write Calculated Data to Sheet 
 */
function writeDashboardResults_(sh, t) {
  
  // 1. DASHBOARD NUMBERS (Visible)
  // Income / Spending
  sh.getRange("C6").setValue(t.income);
  sh.getRange("C7").setValue(t.spending);

  // Financial Health (Needs/Wants/etc)
  sh.getRange("C12").setValue(t.needs);
  sh.getRange("C13").setValue(t.wants);
  sh.getRange("C14").setValue(t.savings);
  sh.getRange("C15").setValue(t.debt);

  // Section Totals (C60 onwards)
  // Order must match your sheet layout. Adjust keys as needed.
  const secOrder = ["Residence", "Transportation", "Daily Living", "Banking", "Health", "Vacation", "Debt", "Savings"];
  const secVals = secOrder.map(k => [t.sections[k] || 0]);
  sh.getRange(60, 3, secVals.length, 1).setValues(secVals);

  // 2. CHART DATA (Hidden Helper Columns Q/R)
  // This replaces what Overview.js used to do.
  sh.getRange("Q100").setValue("Income");      sh.getRange("R100").setValue(t.income);
  sh.getRange("Q101").setValue("Need");        sh.getRange("R101").setValue(t.needs);
  sh.getRange("Q102").setValue("Want");        sh.getRange("R102").setValue(t.wants);
  sh.getRange("Q103").setValue("Savings");     sh.getRange("R103").setValue(t.savings);
  sh.getRange("Q104").setValue("Debt");        sh.getRange("R104").setValue(t.debt);

  // 3. FINANCIAL HEALTH BAR (Hidden T110)
  sh.getRange("T110").setValue("Income");      sh.getRange("U110").setValue(t.income);
  sh.getRange("T111").setValue("Spending");    sh.getRange("U111").setValue(t.spending);

  // 4. MONTHLY TREND (Hidden T120+)
  // Writes Jan-Dec rows for the line chart
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const trendData = t.monthly.map((m, i) => [months[i], m.inc, m.exp]);
  // Write Header
  sh.getRange("T120:V120").setValues([["Month", "Income", "Spending"]]);
  // Write Data
  sh.getRange(121, 20, 12, 3).setValues(trendData);
}