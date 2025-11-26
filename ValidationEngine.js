/** ============================================================================
 * VALIDATION ENGINE
 * Handles:
 *   - Category dropdowns (CategoryList_Combined)
 *   - Type dropdowns (Need, Want, Savings, Debt, Income, Unknown, None)
 *
 * Applies validations to:
 *   Settings: Type columns only (E, G, I, K, M, O, Q, S, U)
 *   Transactions:
 *        F Category
 *        G Type
 *        O Category
 *        P Type
 * ============================================================================
 */

function ValidationEngine() {

  /** Build validation for categories (named range). */
  function buildCategoryRule() {
    const ss = SpreadsheetApp.getActive();
    const rng = ss.getRangeByName("CategoryList_Combined");

    if (!rng) {
      throw new Error('Named range "CategoryList_Combined" missing. Run RefreshBudgetSystem first.');
    }

    return SpreadsheetApp.newDataValidation()
      .requireValueInRange(rng, true)
      .setAllowInvalid(false)
      .build();
  }

  /** Build validation for Type list. */
  function buildTypeRule() {
    const TYPES = [
      'Need','Want','Savings','Debt',
      'Income','Unknown','None'
    ];

    return SpreadsheetApp.newDataValidation()
      .requireValueInList(TYPES, true)
      .setAllowInvalid(false)
      .build();
  }

  /** Apply validation to Transactions sheet. */
  function applyToTransactions() {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName("Transactions");
    if (!sh) throw new Error("Transactions sheet missing.");

    const last = sh.getMaxRows();

    const catRule = buildCategoryRule();
    const typeRule = buildTypeRule();

    // Left side: rows begin at row 5
    sh.getRange(5, 6,  last - 4, 1).setDataValidation(catRule); // F Category
    sh.getRange(5, 7,  last - 4, 1).setDataValidation(typeRule); // G Type

    // Right side
    sh.getRange(5, 15, last - 4, 1).setDataValidation(catRule); // O Category
    sh.getRange(5, 16, last - 4, 1).setDataValidation(typeRule); // P Type
  }

  /** Apply Type validation on Settings tables only. */
  function applyToSettings() {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName("Settings");
    if (!sh) throw new Error("Settings sheet missing.");

    const last = sh.getLastRow();
    if (last < 8) return;

    const typeRule = buildTypeRule();

    // Type columns as per your mapping: E,G,I,K,M,O,Q,S,U
    const cols = [5, 7, 9, 11, 13, 15, 17, 19, 21];

    cols.forEach(col => {
      if (col <= sh.getLastColumn()) {
        sh.getRange(8, col, last - 7, 1).setDataValidation(typeRule);
      }
    });
  }

  /** Full validation refresh across entire file. */
  function applyAll() {
    applyToSettings();
    applyToTransactions();
  }

  return {
    applyAll,
    applyToTransactions,
    applyToSettings,
    buildCategoryRule
  };
}
