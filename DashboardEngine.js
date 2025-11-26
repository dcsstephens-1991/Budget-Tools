/** ============================================================================
 * DASHBOARD ENGINE
 * Draws Spending Breakdown, Savings Breakdown, Financial Health Bar,
 * and Income vs Spending line.
 * ============================================================================
 */

function DashboardEngine() {
  return {
    refreshOverviewCharts: refreshOverviewCharts
  };
}

/**
 * Rebuild charts on Overview.
 */
function refreshOverviewCharts(sh) {
  clearOldCharts(sh);

  spendingChart(sh);
  savingsChart(sh);
  financialHealthBar(sh);
  incomeVsSpendingLine(sh);
}

function clearOldCharts(sh) {
  sh.getCharts().forEach(c => sh.removeChart(c));
}

/**
 * Spending Breakdown Pie
 */
function spendingChart(sh) {
  const rangeLabels = sh.getRange("Q101:Q104"); // Need to Debt
  const rangeValues = sh.getRange("R101:R104");

  const chart = sh.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(rangeLabels)
    .addRange(rangeValues)
    .setOption("title", "Spending Breakdown")
    .setOption("pieHole", 0.40)
    .setOption("colors", ["#4b0082", "#800080", "#305090", "#902020"])
    .setPosition(5, 12)
    .setNumHeaders(1)
    .build();

  sh.insertChart(chart);
}

/**
 * Savings Breakdown Pie
 * Shows only Savings and Debt
 */
function savingsChart(sh) {
  const labels = sh.getRange("Q103:Q104");  // Savings, Debt
  const values = sh.getRange("R103:R104");

  const chart = sh.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(labels)
    .addRange(values)
    .setOption("title", "Savings Breakdown")
    .setOption("pieHole", 0.40)
    .setOption("colors", ["#003366", "#660000"])
    .setPosition(5, 18)
    .setNumHeaders(1)
    .build();

  sh.insertChart(chart);
}

/**
 * Financial Health
 * Bar comparing income vs spending (Needs+Wants+Debt+Savings)
 */
function financialHealthBar(sh) {
  const income = sh.getRange("R100").getValue();
  const categories = sh.getRange("R101:R104").getValues().flat();
  const spending = categories.reduce((a, b) => a + Number(b || 0), 0);

  // Write temp table
  sh.getRange("T110").setValue("Income");
  sh.getRange("T111").setValue("Spending");
  sh.getRange("U110").setValue(income);
  sh.getRange("U111").setValue(spending);

  const labels = sh.getRange("T110:T111");
  const values = sh.getRange("U110:U111");

  const chart = sh.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(labels)
    .addRange(values)
    .setOption("title", "Financial Health")
    .setOption("legend", "none")
    .setOption("colors", ["#4b0082"])
    .setPosition(26, 12)
    .build();

  sh.insertChart(chart);
}

/**
 * Income vs Spending line chart
 */
function incomeVsSpendingLine(sh) {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const ss = SpreadsheetApp.getActive();

  const lines = [
    ["Month","Income","Spending"]
  ];

  months.forEach(m => {
    const sheet = ss.getSheetByName(m);
    if (!sheet) return;

    const income = sheet.getRange("E5").getValue(); // assumes consistent layout
    const spending = sheet.getRange("K5").getValue();

    lines.push([m, income, spending]);
  });

  // Write data to hidden area
  sh.getRange("T120").offset(0, 0, lines.length, 3).setValues(lines);

  const range = sh.getRange("T120:V" + (119 + lines.length));

  const chart = sh.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(range)
    .setOption("title", "Income vs Spending")
    .setOption("curveType", "function")
    .setOption("legend", { position: "bottom" })
    .setOption("colors", ["#4b0082", "#a02020"])
    .setPosition(26, 18)
    .build();

  sh.insertChart(chart);
}
