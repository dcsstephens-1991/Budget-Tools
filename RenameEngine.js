/** ============================================================================
 * RENAME ENGINE
 * Global rename across Settings + Transactions
 * ============================================================================
 */

function RenameEngine() {
  return {
    rename: renameCategoryGlobal
  };
}

function renameCategoryGlobal(oldName, newName, newType) {
  oldName = String(oldName || "").trim();
  newName = String(newName || "").trim();

  if (!oldName || !newName)
    throw new Error("Old and new names required");

  const ss = SpreadsheetApp.getActive();
  const shSet = ss.getSheetByName("Settings");
  const shTx = ss.getSheetByName("Transactions");
  let settingsCount = 0;
  let txCount = 0;

  // Update Settings
  if (shSet) {
    const rng = shSet.getRange(8,1, shSet.getLastRow()-7, shSet.getLastColumn());
    const values = rng.getValues();

    for (let r=0; r < values.length; r++) {
      for (let c=0; c < values[r].length; c+=2) {
        if (String(values[r][c]).trim() === oldName) {
          values[r][c] = newName;
          if (newType) values[r][c+1] = newType;
          settingsCount++;
        }
      }
    }
    rng.setValues(values);
  }

  // Update Transactions F/G and O/P
  if (shTx) {
    const rng = shTx.getRange(5,1, shTx.getLastRow()-4, shTx.getLastColumn());
    const values = rng.getValues();

    for (let r=0; r < values.length; r++) {
      if (String(values[r][5]).trim() === oldName) {
        values[r][5] = newName;
        if (newType) values[r][6] = newType;
        txCount++;
      }
      if (String(values[r][14]).trim() === oldName) {
        values[r][14] = newName;
        if (newType) values[r][15] = newType;
        txCount++;
      }
    }
    rng.setValues(values);
  }

  // Rebuild categories + validation
  CategoryEngine().refresh();
  ValidationEngine().applyAll();

  return { settingsUpdated: settingsCount, txUpdated: txCount };
}
