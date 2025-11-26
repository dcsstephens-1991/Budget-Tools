/** ============================================================================
 * CATEGORY ENGINE
 * Central authority for reading category tables from Settings, flattening
 * to a master list, deduplicating, and building the named range
 * "CategoryList_Combined".
 * ============================================================================
 */

function CategoryEngine() {
  return {
    rebuild: rebuildCategoryList,
    getList: getFlattenedCategories
  };
}

/**
 * Reads Settings section tables using the confirmed layout:
 *
 * Income        D:E
 * Residence     F:G
 * Transportation H:I
 * Daily Living  J:K
 * Banking       L:M
 * Health        N:O
 * Vacation      P:Q
 * Debt          R:S
 * Savings       T:U
 */
function getFlattenedCategories() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Settings");
  if (!sh) throw new Error("Settings sheet missing");

  const lastRow = sh.getLastRow();
  if (lastRow < 8) return { flatList: [] };

  const tables = [
    { name: "Income",        colCat: 4, colType: 5 },
    { name: "Residence",     colCat: 6, colType: 7 },
    { name: "Transportation",colCat: 8, colType: 9 },
    { name: "Daily Living",  colCat: 10, colType: 11 },
    { name: "Banking",       colCat: 12, colType: 13 },
    { name: "Health",        colCat: 14, colType: 15 },
    { name: "Vacation",      colCat: 16, colType: 17 },
    { name: "Debt",          colCat: 18, colType: 19 },
    { name: "Savings",       colCat: 20, colType: 21 }
  ];

  const output = [];

  tables.forEach(t => {
    const catRange = sh.getRange(8, t.colCat, lastRow - 7, 1).getValues();
    const typeRange = sh.getRange(8, t.colType, lastRow - 7, 1).getValues();

    for (let i = 0; i < catRange.length; i++) {
      const cat = String(catRange[i][0]).trim();
      if (!cat) continue;

      const typ = String(typeRange[i][0] || "Unknown").trim();
      output.push({
        category: cat,
        type: typ,
        table: t.name
      });
    }
  });

  // Deduplicate by category name
  const seen = {};
  const finalList = [];

  output.forEach(e => {
    const key = e.category.toUpperCase();
    if (!seen[key]) {
      seen[key] = true;
      finalList.push(e);
    }
  });

  return { flatList: finalList };
}

/**
 * Writes flattened categories to Settings column AD,
 * then sets the named range CategoryList_Combined.
 */
function rebuildCategoryList() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Settings");
  if (!sh) throw new Error("Settings sheet missing");

  const catsObj = getFlattenedCategories();
  const cats = catsObj.flatList.map(x => x.category);
  if (!cats.length) throw new Error("No categories found in Settings.");

  const listCol = 30; // AD
  const startRow = 8;

  // Clear old helper column
  sh.getRange(startRow, listCol, sh.getMaxRows() - startRow + 1, 1)
    .clearContent();

  // Write new list
  sh.getRange(startRow, listCol, cats.length, 1)
    .setValues(cats.map(c => [c]));

  // Assign named range
  const rng = sh.getRange(startRow, listCol, cats.length, 1);
  const existing = ss.getRangeByName("CategoryList_Combined");

  if (!existing) {
    ss.setNamedRange("CategoryList_Combined", rng);
  } else {
    existing.setRange(rng);
  }

  return catsObj;
}
