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

function runHealthCheck() {
  Diagnostics().checkSystemHealth();
}

/* ----------------------------- DIALOGS ------------------------------ */

function showImporterDialog() {
  const html = HtmlService.createHtmlOutputFromFile("Importer")
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, "CSV Importer");
}

function openResolveUnknownsDialog() {
  // Uses Capital U to match your file name
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

function openRulesDialog() {
  const html = HtmlService.createHtmlOutputFromFile("Rules")
    .setWidth(760)
    .setHeight(540);
  SpreadsheetApp.getUi().showModalDialog(html, "Manage Rules");
}

/* ----------------------------- SYSTEM REFRESH ----------------------------- */

function RefreshBudgetSystem() {
  // The SyncEngine handles the order: Cat -> Val -> Rules -> Compute -> Unknowns
  SyncEngine().refreshSystem();
}


/* ----------------------------- BRIDGE: IMPORTER ----------------------------- */

function runCsvImport(csvText, opts) {
  opts = opts || {};
  opts.targetSheet = "Transactions"; 
  
  // 1. Run the Import
  const result = ImportEngine().importCsv(csvText, opts);

  // 2. Switch to Transactions sheet so user sees the new data
  SpreadsheetApp.getActive().getSheetByName("Transactions").activate();

  return result;
}

function getImportPresets() {
  return ImportEngine().getPresets();
}

function saveImportPreset(name, mapData) {
  return ImportEngine().savePreset(name, mapData);
}

function deleteImportPreset(name) {
  return ImportEngine().deletePreset(name);
}


/* ----------------------------- BRIDGE: RESOLVE UNKNOWNS ----------------------------- */

function getUnknownTransactions() {
  return UnknownsEngine().scan();
}

function getCategoriesFromSettings() {
  return CategoryEngine().getList();
}

function aiCategorizeTransactions(descriptions) {
  return AI.autoCategorize(descriptions);
}

function resolveUnknownTransactions(rulesList) {
  const engine = RuleEngine();
  let count = 0;
  
  rulesList.forEach(r => {
    engine.save(r.keyword, r.category, r.type, r.direction);
    count++;
  });
  
  // 1. Apply new rules
  SyncEngine().afterRuleSave();

  // 2. Switch to Transactions sheet to show updates
  SpreadsheetApp.getActive().getSheetByName("Transactions").activate();
  
  return { saved: count };
}