/**
 * Master Menu
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu("Budget Tools")
    .addItem("Import Transactions", "showImporterDialog")
    .addSeparator()
    .addItem("Resolve Unknown Transactions", "openResolveUnknownsDialog")
    .addItem("Rename Category", "openRenameCategoryDialog")
    .addSeparator()
    .addItem("Refresh Budget System", "RefreshBudgetSystem")
    .addSeparator()
    .addItem("Refresh Category Validation", "runValidationRefresh")
    .addItem("Run Health Check", "runHealthCheck")
    .addSeparator()
    .addItem("Refresh Dashboard Charts", "runChartsRefresh")
    .addToUi();
}

/* ----------------------------- WRAPPERS ----------------------------- */

function runValidationRefresh() {
  ValidationEngine().applyAll();
}

function runChartsRefresh() {
  ChartsEngine().refreshAll();
}

/* ----------------------------- DIALOGS ------------------------------ */

function showImporterDialog() {
  const html = HtmlService.createHtmlOutputFromFile("Importer")
    .setWidth(1200)
    .setHeight(800);

  SpreadsheetApp.getUi().showModalDialog(html, "CSV Importer");
}

function openResolveUnknownsDialog() {
  const html = HtmlService.createHtmlOutputFromFile("ResolveUnknowns")
    .setWidth(1200)
    .setHeight(750);

  SpreadsheetApp.getUi().showModalDialog(html, "Resolve Unknown Transactions");
}

function openRenameCategoryDialog() {
  const html = HtmlService.createHtmlOutputFromFile("RenameCategory")
    .setWidth(500)
    .setHeight(380);

  SpreadsheetApp.getUi().showModalDialog(html, "Rename Category");
}

/* ----------------------------- FULL SYSTEM REFRESH ----------------------------- */

function RefreshBudgetSystem() {

  const ss = SpreadsheetApp.getActive();

  CategoryEngine().rebuild();
  ValidationEngine().applyAll();
  RuleEngine().applyRulesToTransactions();
  UnknownsEngine().scan();

  // NEW (compute totals for charts)
  ComputeEngine().computeAll();

  ss.toast('Budget System Refreshed', 'Done', 2);
}


/* CATEGORIZATION WRAPPER */
function runApplyAllCategorization() {
  CategoryEngine().applyAllRules();
}

/* VALIDATION WRAPPER */
function runValidationRefresh() {
  ValidationEngine().applyAll();
}

/* CHARTS WRAPPER */
function runChartsRefresh() {
  ChartsEngine().refreshAll();
}

/* IMPORTER UI */
function showImporterDialog() {
  const html = HtmlService.createHtmlOutputFromFile("Importer")
    .setWidth(1000)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, "CSV Importer");
}

/* UNKNOWN UI */
function openResolveUnknownsDialog() {
  const html = HtmlService.createHtmlOutputFromFile("ResolveUnknowns")
    .setWidth(1200)
    .setHeight(750);
  SpreadsheetApp.getUi().showModalDialog(html, "Resolve Unknown Transactions");
}

/* RENAME UI */
function openRenameCategoryDialog() {
  const html = HtmlService.createHtmlOutputFromFile("RenameCategory")
    .setWidth(500)
    .setHeight(380);
  SpreadsheetApp.getUi().showModalDialog(html, "Rename Category");
}

/* RULES UI */
function openRulesDialog() {
  const html = HtmlService.createHtmlOutputFromFile("Rules")
    .setWidth(760)
    .setHeight(540);
  SpreadsheetApp.getUi().showModalDialog(html, "Manage Rules");
}

/* MAIN SYSTEM REFRESH */
function RefreshBudgetSystem() {
  const ss = SpreadsheetApp.getActive();

  // Apply validations
  ValidationEngine().applyAll();

  // Apply all saved rules
  RuleEngine().applyRulesToTransactions();

  // Rebuild unknown cache if you have UnknownsEngine()
  try { UnknownsEngine().scan(); } catch(e){}

  // Reapply categorization rules
  CategoryEngine().applyAllRules();

  ss.toast("Budget System Fully Refreshed", "Done", 3);
}
