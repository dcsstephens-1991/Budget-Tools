/** ============================================================================
 * RULE ENGINE
 * ----------------------------------------------------------------------------
 * Stores and applies saved categorization rules.
 * Rules exist in script properties:
 *    key = keyword|direction
 *    value = JSON { category, type }
 *
 * Used by:
 *   • CategorizationEngine
 *   • ResolveUnknowns.html
 *   • RefreshBudgetSystem
 *   • Import workflows
 * ============================================================================
 */

function RuleEngine() {
  return {
    getAll: getSavedRules,
    save: saveNewRule,
    deleteOne: deleteSpecificRules,
    deleteAll: deleteAllRules,
    applyToTransaction: applyRuleToTransaction,
    applyAllRules: applyRulesToEntireSheet
  };
}

/** --------------------------- STORAGE HELPERS ------------------------------ */

function _getRuleStore() {
  return PropertiesService.getDocumentProperties();
}

function _ruleKey(keyword, direction) {
  return keyword.toUpperCase().trim() + "|" + direction.toUpperCase().trim();
}

/** Returns all saved rules as array */
function getSavedRules() {
  const store = _getRuleStore();
  const all = store.getProperties();
  const out = [];

  for (let key in all) {
    const parts = key.split("|");
    if (parts.length !== 2) continue;

    let value;
    try { value = JSON.parse(all[key]); }
    catch(e) { continue; }

    out.push({
      keyword: parts[0],
      direction: parts[1],
      category: value.category,
      type: value.type
    });
  }

  return out;
}

/** Saves one rule (create or overwrite) */
function saveNewRule(keyword, category, type, direction) {
  if (!keyword) throw new Error("Keyword required");

  const key = _ruleKey(keyword, direction || "any");
  const store = _getRuleStore();

  store.setProperty(key, JSON.stringify({
    category: category,
    type: type
  }));

  return true;
}

/** Deletes list of keys */
function deleteSpecificRules(keys) {
  const store = _getRuleStore();
  keys.forEach(k => store.deleteProperty(k));
  return true;
}

/** Deletes ALL rules */
function deleteAllRules() {
  const store = _getRuleStore();
  const all = store.getProperties();
  for (let k in all) store.deleteProperty(k);
  return true;
}

/** --------------------------- APPLYING RULES ------------------------------- */

/**
 * Applies rules to ONE transaction record.
 * desc = text
 * amt = number
 * direction = "in" / "out"
 */
function applyRuleToTransaction(desc, amt, direction) {
  if (!desc) return { matched:false };

  const kw = desc.toUpperCase().trim();
  const store = _getRuleStore();
  const all = store.getProperties();

  const candidates = [
    _ruleKey(kw, direction),
    _ruleKey(kw, "any")
  ];

  for (let key of candidates) {
    if (all[key]) {
      try {
        const rule = JSON.parse(all[key]);
        return {
          matched: true,
          category: rule.category,
          type: rule.type
        };
      } catch(e) {}
    }
  }

  return { matched:false };
}

/** Apply rules to entire Transactions sheet */
function applyRulesToEntireSheet() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Transactions");
  if (!sh) return;

  const last = sh.getLastRow();
  if (last < 5) return;

  const data = sh.getRange(5,1,last-4, sh.getLastColumn()).getValues();

  for (let i = 0; i < data.length; i++) {

    // Left (Debit)
    const descL = String(data[i][1] || "");
    const amtL  = Number(data[i][2] || 0);
    const dirL  = amtL > 0 ? "out" : "in";

    if (descL) {
      const r = applyRuleToTransaction(descL, amtL, dirL);
      if (r.matched) {
        data[i][5] = r.category;
        data[i][6] = r.type;
      }
    }

    // Right (Credit)
    const descR = String(data[i][10] || "");
    const amtR  = Number(data[i][11] || 0);
    const dirR  = amtR > 0 ? "in" : "out";

    if (descR) {
      const r = applyRuleToTransaction(descR, amtR, dirR);
      if (r.matched) {
        data[i][14] = r.category;
        data[i][15] = r.type;
      }
    }
  }

  sh.getRange(5,1,data.length,data[0].length).setValues(data);
}
