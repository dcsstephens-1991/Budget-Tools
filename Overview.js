/** ============================================================================
 * OVERVIEW ENGINE
 * Calculates totals for Income, Needs, Wants, Savings, Debt
 * Works for Month sheets, Quarter view, and Annual view.
 * ============================================================================
 */

function OverviewEngine() {
  return {
    calculatePeriodTotals: calculatePeriodTotals,
    refreshOverviewSheet: refreshOverviewSheet
  };
}

/**
 * Returns:
 * {
 *   Income: 1200,
 *   Need: 850,
 *   Want: 300,
 *   Savings: 150,
 *   Debt: 0
 * }
 */
function calculatePeriodTotals(startDate, endDate) {
  const sh = SpreadsheetApp.getActive().getSheetByName("Transactions");
  if (!sh) return null;

  const data = sh.getRange(5, 1, sh.getLastRow() - 4, sh.getLastColumn()).getValues();

  const totals = {
    Income: 0,
    Need: 0,
    Want: 0,
    Savings: 0,
    Debt: 0
  };

  data.forEach(r => {
    const dateL = parseDateSimple(r[0]);
    const dateR = parseDateSimple(r[9]);

    // Left side
    if (dateL && dateL >= startDate && dateL <= endDate) {
      const amt = Number(r[2] || 0);
      const typ = String(r[6] || "");
      if (totals.hasOwnProperty(typ)) totals[typ] += amt;
    }

    // Right side
    if (dateR && dateR >= startDate && dateR <= endDate) {
      const amt = Number(r[11] || 0);
      const typ = String(r[15] || "");
      if (totals.hasOwnProperty(typ)) totals[typ] += amt;
    }
  });

  return totals;
}

/**
 * Refreshes the Overview sheet charts and totals
 */
function refreshOverviewSheet() {
  const sh = SpreadsheetApp.getActive().getSheetByName("Overview");
  if (!sh) return;

  const periodText = sh.getRange("B2").getDisplayValue().trim();
  const year = Number(sh.getRange("B1").getValue()) || new Date().getFullYear();

  const range = determinePeriodDates(periodText, year);
  if (!range) return;

  const totals = calculatePeriodTotals(range.start, range.end);

  // Write totals to Q100 column
  sh.getRange("Q100").setValue("Income");
  sh.getRange("R100").setValue(totals.Income);
  sh.getRange("Q101").setValue("Need");
  sh.getRange("R101").setValue(totals.Need);
  sh.getRange("Q102").setValue("Want");
  sh.getRange("R102").setValue(totals.Want);
  sh.getRange("Q103").setValue("Savings");
  sh.getRange("R103").setValue(totals.Savings);
  sh.getRange("Q104").setValue("Debt");
  sh.getRange("R104").setValue(totals.Debt);

  DashboardEngine().refreshOverviewCharts(sh);
}
