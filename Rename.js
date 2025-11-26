4/**
 * Rename.js
 * Centralized category rename across:
 *   - Settings tables
 *   - Transactions (debit + credit)
 *   - Saved rules
 *   - Data validation
 * Uses CategoryEngine for consistency.
 */

function renameCategoryGlobal(oldName, newName, newType) {
  oldName = String(oldName || '').trim();
  newName = String(newName || '').trim();

  if (!oldName || !newName) {
    throw new Error('Both old and new category names are required.');
  }

  const ss = SpreadsheetApp.getActive();
  const shSet = ss.getSheetByName('Settings');
  const shTx  = ss.getSheetByName('Transactions');

  if (!shSet || !shTx) throw new Error('Settings or Transactions sheet not found.');

  // Normalize
  const oldNorm = oldName.toUpperCase();
  const newNorm = newName.trim();
  let settingsUpdated = 0;
  let txUpdated = 0;

  // --------------------------------------------
  // 1) UPDATE SETTINGS TABLES (only category columns D, H, J, L, N, P, R, T, V)
  // --------------------------------------------
  const catCols = [4,8,10,12,14,16,18,20,22];
  const typeCols = catCols.map(c => c+1);

  const maxRow = shSet.getLastRow();

  for (let i=0;i<catCols.length;i++) {
    const col = catCols[i];
    const tcol = typeCols[i];

    const names = shSet.getRange(8,col,maxRow-7,1).getValues();
    const types = shSet.getRange(8,tcol,maxRow-7,1).getValues();

    let changed = false;

    for (let r=0;r<names.length;r++) {
      const cellVal = String(names[r][0]||'').trim();
      if (!cellVal) continue;

      if (cellVal.toUpperCase() === oldNorm) {
        names[r][0] = newNorm;
        settingsUpdated++;
        changed = true;

        if (newType) types[r][0] = newType;
      }
    }

    if (changed) {
      shSet.getRange(8,col,names.length,1).setValues(names);
      shSet.getRange(8,tcol,types.length,1).setValues(types);
    }
  }

  // --------------------------------------------
  // 2) UPDATE SAVED RULES
  // --------------------------------------------
  const props = PropertiesService.getScriptProperties();
  const raw   = props.getProperty('USER_RULES');
  let rules   = raw ? JSON.parse(raw) : [];

  rules = rules.map(r => {
    if (String(r.keyword || '').trim().toUpperCase() === oldNorm) {
      return {
        keyword: newNorm,
        category: newNorm,
        type: newType || r.type || 'Unknown',
        direction: r.direction || 'any'
      };
    }
    return r;
  });

  props.setProperty('USER_RULES', JSON.stringify(rules));

  // --------------------------------------------
  // 3) UPDATE TRANSACTIONS
  // --------------------------------------------
  const lr = shTx.getLastRow();
  if (lr >= 5) {
    const data = shTx.getRange(5,1,lr-4,shTx.getLastColumn()).getValues();

    data.forEach(row => {
      // debit
      if (String(row[5]||'').trim().toUpperCase() === oldNorm) {
        row[5] = newNorm;
        if (newType) row[6] = newType;
        txUpdated++;
      }
      // credit
      if (String(row[14]||'').trim().toUpperCase() === oldNorm) {
        row[14] = newNorm;
        if (newType) row[15] = newType;
        txUpdated++;
      }
    });

    shTx.getRange(5,1,data.length,shTx.getLastColumn()).setValues(data);
  }

  // --------------------------------------------
  // 4) REBUILD VALIDATION + MASTER LIST
  // --------------------------------------------
  rebuildCategoryValidation();

  // --------------------------------------------
  // 5) RETURN SUMMARY
  // --------------------------------------------
  return {
    settingsUpdated: settingsUpdated,
    txUpdated: txUpdated,
    rulesUpdated: rules.length
  };
}
