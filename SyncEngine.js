/** ============================================================================
 * SYNC ENGINE
 * ----------------------------------------------------------------------------
 * Central system coordinator.
 * Ensures every module runs in the correct order:
 *
 * 1. Rebuild category list
 * 2. Apply validation
 * 3. Apply rules
 * 4. Recalculate Overview totals
 * 5. Refresh Unknowns cache
 *
 * Called by:
 *   - Refresh Budget System menu button
 *   - After imports
 *   - After renames
 *   - After rule changes
 * ============================================================================ */

function SyncEngine() {
  return {
    refreshSystem: RefreshBudgetSystem,
    afterImport: afterImportHandler,
    afterRename: afterRenameHandler,
    afterRuleSave: afterRuleSaveHandler
  };
}

/** ---------------------------------------------------------------------------
 * FULL REFRESH – “Refresh Budget System”
 * --------------------------------------------------------------------------- */
function RefreshBudgetSystem() {

  const cat   = CategoryEngine();
  const val   = ValidationEngine();
  const rules = RulesEngine();
  const comp  = ComputeEngine();
  const unk   = UnknownsEngine();

  // 1. Rebuild category list + named range
  cat.rebuild();

  // 2. Apply ALL validation rules
  val.applyAll();

  // 3. Re-run saved rules on every transaction row
  rules.applyAllRules();

  // 4. Recompute Overview totals for charts
  comp.updateOverviewTotals();

  // 5. Re-scan unknown transactions
  unk.scan();

  SpreadsheetApp.getActive().toast("Budget System Fully Refreshed", "Done", 3);
}


/** ---------------------------------------------------------------------------
 * AFTER IMPORT – importer completed
 * --------------------------------------------------------------------------- */
function afterImportHandler() {
  const val   = ValidationEngine();
  const rules = RulesEngine();
  const comp  = ComputeEngine();
  const unk   = UnknownsEngine();

  val.applyToTransactions();
  rules.applyAllRules();
  comp.updateOverviewTotals();
  unk.scan();
}


/** ---------------------------------------------------------------------------
 * AFTER RENAME – category rename completed
 * --------------------------------------------------------------------------- */
function afterRenameHandler() {
  const cat   = CategoryEngine();
  const val   = ValidationEngine();
  const rules = RulesEngine();
  const comp  = ComputeEngine();
  const unk   = UnknownsEngine();

  cat.rebuild();
  val.applyAll();
  rules.applyAllRules();
  comp.updateOverviewTotals();
  unk.scan();
}


/** ---------------------------------------------------------------------------
 * AFTER SAVING RULES – ResolveUnknowns saves new rule entries
 * --------------------------------------------------------------------------- */
function afterRuleSaveHandler() {
  const val   = ValidationEngine();
  const rules = RulesEngine();
  const comp  = ComputeEngine();
  const unk   = UnknownsEngine();

  val.applyAll();
  rules.applyAllRules();
  comp.updateOverviewTotals();
  unk.scan();
}
