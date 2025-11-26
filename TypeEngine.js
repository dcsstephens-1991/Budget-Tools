/** ============================================================================
 * SYNC ENGINE
 * Centralized refresh logic for the entire budgeting system.
 * ============================================================================
 */

function SyncEngine() {
  return {
    refreshSystem: RefreshBudgetSystem,
    afterImport: afterImportHandler,
    afterRename: afterRenameHandler,
    afterRuleSave: afterRuleSaveHandler
  };
}

/**
 * Full system refresh. Called from menu.
 */
function RefreshBudgetSystem() {
  const cat   = CategoryEngine();
  const val   = ValidationEngine();
  const rules = RulesEngine();
  const comp  = ComputeEngine();

  cat.rebuild();                // rebuild combined category list + named range
  val.applyAll();               // apply all validations
  rules.applyRulesToTransactions(); // recategorize entire sheet
  comp.updateOverviewTotals();  // recompute overview table

  SpreadsheetApp.getActive().toast("System refreshed.", "Budget Tools", 2);
}

/**
 * After CSV import.
 */
function afterImportHandler() {
  const val   = ValidationEngine();
  const rules = RulesEngine();
  const comp  = ComputeEngine();

  val.applyToTransactions();
  rules.applyRulesToTransactions();
  comp.updateOverviewTotals();
}

/**
 * After category rename.
 */
function afterRenameHandler() {
  const cat   = CategoryEngine();
  const val   = ValidationEngine();
  const rules = RulesEngine();
  const comp  = ComputeEngine();

  cat.rebuild();
  val.applyAll();
  rules.applyRulesToTransactions();
  comp.updateOverviewTotals();
}

/**
 * After saving rules from Resolve Unknowns.
 */
function afterRuleSaveHandler() {
  const val   = ValidationEngine();
  const rules = RulesEngine();
  const comp  = ComputeEngine();

  val.applyAll();
  rules.applyRulesToTransactions();
  comp.updateOverviewTotals();
}
