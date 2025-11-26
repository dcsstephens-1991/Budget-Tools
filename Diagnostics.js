/**
 * Diagnostics.js
 * Rule management and system health checks.
 * Refactored for CategoryEngine, ValidationEngine, RenameEngine, SyncEngine.
 */

/**
 * Returns saved rules from script properties.
 */
function getSavedRules() {
  const props = PropertiesService.getScriptProperties();
  const json = props.getProperty('USER_RULES');
  if (!json) return [];

  let rules = [];
  try {
    rules = JSON.parse(json) || [];
  } catch (e) {
    rules = [];
  }

  rules.sort((a, b) => {
    const ak = String(a.keyword || '').toUpperCase();
    const bk = String(b.keyword || '').toUpperCase();
    if (ak < bk) return -1;
    if (ak > bk) return 1;

    const ad = String(a.direction || 'ANY').toUpperCase();
    const bd = String(b.direction || 'ANY').toUpperCase();
    if (ad < bd) return -1;
    if (ad > bd) return 1;

    return 0;
  });

  return rules;
}

/**
 * Delete specific rules by keyword|direction identifier.
 */
function deleteSpecificRules(keysToDelete) {
  if (!keysToDelete || !keysToDelete.length) return;

  const keySet = new Set(
    keysToDelete.map(k => String(k || '').toUpperCase())
  );

  const props = PropertiesService.getScriptProperties();
  const json = props.getProperty('USER_RULES');
  if (!json) return;

  let rules = [];
  try {
    rules = JSON.parse(json) || [];
  } catch (e) {
    rules = [];
  }

  const filtered = rules.filter(r => {
    const k = String(r.keyword || '');
    const d = String(r.direction || 'ANY');
    const key = (k + '|' + d).toUpperCase();
    return !keySet.has(key);
  });

  props.setProperty('USER_RULES', JSON.stringify(filtered));
}

/**
 * Remove all user rules.
 */
function deleteAllRules() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('USER_RULES');
}

/**
 * System health check using new architecture.
 */
function checkSystemHealth() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const shSettings = ss.getSheetByName('Settings');
  const shTx = ss.getSheetByName('Transactions');
  const shOverview = ss.getSheetByName('Overview');
  const shDebt = ss.getSheetByName('Debt');

  let msg = 'Health Check\n\n';

  msg += shSettings ? 'Settings sheet found.\n' : 'Settings sheet missing.\n';
  msg += shTx ? 'Transactions sheet found.\n' : 'Transactions sheet missing.\n';
  msg += shOverview ? 'Overview sheet found.\n' : 'Overview sheet missing.\n';
  msg += shDebt ? 'Debt sheet found.\n' : 'Debt sheet missing.\n';

  // Validate categories via CategoryEngine
  if (shSettings) {
    try {
      const eng = getCategoryEngine();
      msg += 'Categories loaded: ' + eng.flat.length + '\n';
      msg += 'Blocks detected: ' + Object.keys(eng.blocks).length + '\n';
    } catch (e) {
      msg += 'Error reading categories: ' + e.message + '\n';
    }
  }

  // Check unknown transactions
  if (shTx) {
    try {
      const unknowns = getUnknownTransactions() || [];
      msg += 'Unknown transaction groups: ' + unknowns.length + '\n';
    } catch (e) {
      msg += 'Error scanning unknown transactions: ' + e.message + '\n';
    }
  }

  ui.alert(msg);
}

/**
 * OLD FUNCTIONS REMOVED:
 * - rebuildCategoryValidation()
 * - autoRebuildCategoryValidation_()
 *
 * They are fully replaced by:
 * SyncEngine → CategoryEngine + ValidationEngine + RenameEngine
 */
