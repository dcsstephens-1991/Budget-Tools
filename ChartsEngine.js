/** ============================================================================
 * CHARTS ENGINE (FIXED VERSION)
 * Charts never get deleted. Ranges update only. Uses addRange() (correct API)
 * ============================================================================ 
 */

function ChartsEngine() {
  return {
    refreshAll: refreshAllCharts,
    createIfMissing: createAllCharts
  };
}

/** MAIN ENTRY */
function refreshAllCharts() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Overview");
  if (!sh) return;

  updateSpendingBreakdown(sh);
  updateSavingsBreakdown(sh);
  updateFinancialHealth(sh);
  updateIncomeVsSpending(sh);
  updateSectionTotals(sh);
}

/** INITIAL CREATION */
function createAllCharts() {
  const sh = SpreadsheetApp.getActive().getSheetByName("Overview");
  if (!sh) return;

  createSpendingBreakdown(sh);
  createSavingsBreakdown(sh);
  createFinancialHealth(sh);
  createIncomeVsSpending(sh);
  createSectionTotals(sh);
}

/* ============================================================================
   1. SPENDING BREAKDOWN — B38
   ============================================================================ */
function updateSpendingBreakdown(sh) {
  const chart = findChartByTitle(sh, "Spending Breakdown");
  const range = sh.getRange("B12:C15");

  if (!chart) return createSpendingBreakdown(sh);

  const builder = chart.modify();
  builder.clearRanges();
  builder.addRange(range);
  builder.setOption("title", "Spending Breakdown");
  builder.setOption("animation", { startup: true, duration: 800 });

  sh.updateChart(builder.build());
}

function createSpendingBreakdown(sh) {
  const range = sh.getRange("B12:C15");

  const chart = sh.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(range)
    .setOption("title", "Spending Breakdown")
    .setOption("animation", { startup: true, duration: 800 })
    .setPosition(38, 2, 0, 0)
    .build();

  sh.insertChart(chart);
}

/* ============================================================================
   2. SAVINGS BREAKDOWN — N6
   ============================================================================ */
function updateSavingsBreakdown(sh) {
  const chart = findChartByTitle(sh, "Savings Breakdown");
  const range = sh.getRange("H12:I20");

  if (!chart) return createSavingsBreakdown(sh);

  const builder = chart.modify();
  builder.clearRanges();
  builder.addRange(range);
  builder.setOption("title", "Savings Breakdown");
  builder.setOption("animation", { startup: true, duration: 800 });

  sh.updateChart(builder.build());
}

function createSavingsBreakdown(sh) {
  const range = sh.getRange("H12:I20");

  const chart = sh.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(range)
    .setOption("title", "Savings Breakdown")
    .setOption("animation", { startup: true, duration: 800 })
    .setPosition(6, 14, 0, 0)
    .build();

  sh.insertChart(chart);
}

/* ============================================================================
   3. FINANCIAL HEALTH — N23
   ============================================================================ */
function updateFinancialHealth(sh) {
  const chart = findChartByTitle(sh, "Financial Health");
  const range = sh.getRange("B6:C7");

  if (!chart) return createFinancialHealth(sh);

  const builder = chart.modify();
  builder.clearRanges();
  builder.addRange(range);
  builder.setChartType(Charts.ChartType.COLUMN);
  builder.setOption("title", "Financial Health");
  builder.setOption("animation", { startup: true, duration: 900 });

  sh.updateChart(builder.build());
}

function createFinancialHealth(sh) {
  const range = sh.getRange("B6:C7");

  const chart = sh.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(range)
    .setOption("title", "Financial Health")
    .setOption("animation", { startup: true, duration: 900 })
    .setPosition(23, 14, 0, 0)
    .build();

  sh.insertChart(chart);
}

/* ============================================================================
   4. INCOME VS SPENDING — N40
   ============================================================================ */
function updateIncomeVsSpending(sh) {
  const chart = findChartByTitle(sh, "Income vs Spending");
  const range = sh.getRange("B25:D37");

  if (!chart) return createIncomeVsSpending(sh);

  const builder = chart.modify();
  builder.clearRanges();
  builder.addRange(range);
  builder.setChartType(Charts.ChartType.LINE);
  builder.setOption("title", "Income vs Spending");
  builder.setOption("animation", { startup: true, duration: 1000 });

  sh.updateChart(builder.build());
}

function createIncomeVsSpending(sh) {
  const range = sh.getRange("B25:D37");

  const chart = sh.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(range)
    .setOption("title", "Income vs Spending")
    .setOption("animation", { startup: true, duration: 1000 })
    .setPosition(40, 14, 0, 0)
    .build();

  sh.insertChart(chart);
}

/* ============================================================================
   5. SECTION TOTALS — B70
   ============================================================================ */
function updateSectionTotals(sh) {
  const chart = findChartByTitle(sh, "Section Totals");
  const range = sh.getRange("B60:C68");

  if (!chart) return createSectionTotals(sh);

  const builder = chart.modify();
  builder.clearRanges();
  builder.addRange(range);
  builder.setChartType(Charts.ChartType.BAR);
  builder.setOption("title", "Section Totals");
  builder.setOption("animation", { startup: true, duration: 900 });

  sh.updateChart(builder.build());
}

function createSectionTotals(sh) {
  const range = sh.getRange("B60:C68");

  const chart = sh.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(range)
    .setOption("title", "Section Totals")
    .setOption("animation", { startup: true, duration: 900 })
    .setPosition(70, 2, 0, 0)
    .build();

  sh.insertChart(chart);
}

/* ============================================================================
   UTIL
   ============================================================================ */
function findChartByTitle(sh, title) {
  return sh.getCharts().find(c => c.getOptions().get("title") === title) || null;
}
