# Budget Tools AI Coding Instructions

## Architecture Overview

**Budget-Tools** is a Google Apps Script project that automates personal budgeting in Google Sheets. It processes financial transactions, applies categorization rules, validates data, and generates charts. The system uses an **Engine-based architecture** where each file exports a factory function returning an object with public methods.

### Core Sheet Structure
- **Transactions**: Transaction records (rows 5+) with debit/credit sides (columns A-P, split at column K)
- **Settings**: Category definitions organized in paired columns by type (Income, Residence, Transportation, Daily Living, Banking, Health, Vacation, Debt, Savings)
- **Overview**: Computed totals and charts for dashboard/analysis
- **Month tabs**: Monthly budget planning sheets (generated from Settings categories)

### Data Flow
1. **Import** → CSV imported via `ImportEngine`, stored in Transactions sheet
2. **Sync Cascade** → `SyncEngine` orchestrates full refresh in order:
   - `CategoryEngine`: Rebuild category list (read from Settings, create named range)
   - `ValidationEngine`: Apply data validation rules
   - `RuleEngine`: Apply categorization rules to transactions
   - `ComputeEngine`: Calculate totals (income, spending, section breakdowns, monthly aggregates)
   - `UnknownsEngine`: Identify uncategorized transactions
3. **UI Updates** → `ChartsEngine` refreshes all charts; dialogs manage rules and renames

## Project-Specific Patterns

### Engine Pattern
Every major module is a factory function returning a public interface object:
```javascript
function SomeEngine() {
  return {
    methodA: implementationA,
    methodB: implementationB
  };
}
```
This avoids global state while organizing related functions. Always call engines like `CategoryEngine().rebuild()`, never `new`.

### Data Validation & Normalization
- `Utils.norm()` normalizes text: trim, uppercase, remove non-breaking spaces (used for category matching)
- `Utils.num()` safely parses numbers (NaN becomes 0)
- `Utils.parseDate()` handles date parsing robustly
- `Utils.a1ToCol()` / `Utils.colToA1()` convert between A1 notation and column indices

### Script Properties Storage
- **Import preferences**: Stored under `"IMPORT_PREFS"` key as JSON
- **Categorization rules**: Each rule stored as `"KEYWORD|DIRECTION"` → JSON with `{category, type}`
- Accessed via `PropertiesService.getDocumentProperties()` and `PropertiesService.getScriptProperties()`

### Category Matching (Two-sided Transactions)
Transactions have left (debit, columns A-J) and right (credit, columns K-T) sides. Each side can have separate:
- Date (A, K), Description (B, L), Amount (C, M), Category (F, O), Type (G, P)
- `ComputeEngine` processes both sides; `UnknownsEngine` identifies unknowns on each side independently

### Column Mapping (Fixed Positions)
**Transactions sheet** (row 5+):
- Left: Date (A), Desc (B), Debit (C), empty (D,E), Category (F), Type (G), … H-J
- Right: Date (K), Desc (L), Credit (M), empty (N,O-reserved), Category (O), Type (P), … Q-T

**Settings sheet** (category tables starting row 8):
- Income: D-E, Residence: F-G, Transportation: H-I, Daily Living: J-K, Banking: L-M, Health: N-O, Vacation: P-Q, Debt: R-S, Savings: T-U
- Each pair: Column = Category, Column+1 = Type

**Overview sheet**:
- Year: B1 (numeric), Period: B2 (string, e.g., "February", "Q2", "Annual")
- Income section: Columns B/E (categories and amounts), starts row 6
- Savings section: Columns B/E, starts row 22
- Expenses section: Columns H/K, starts row 6

**Month tabs** (January–December):
- Same structure as Overview (used for monthly drilling)
- `MonthSync.updateSummarySheet()` aggregates Transactions by period and writes totals

## Critical Workflows

### Full System Refresh (`RefreshBudgetSystem`)
1. **When called**: Menu → "Refresh Budget System" or after import/rename/rule changes
2. **Order matters**: Category rebuild → Validation → Rules → Compute → Unknowns scan
3. **Key file**: `SyncEngine.js` orchestrates; handlers for `afterImport()`, `afterRename()`, `afterRuleSave()`
4. **UI feedback**: Toast notification on completion

### Import Flow
1. User provides CSV + mapping options (sheet name, delimiter, header flag, column mapping)
2. `ImportEngine.importCsv()` → Parse → Normalize dates/amounts → Build rows → Append to Transactions
3. Triggers `SyncEngine.afterImport()`: validation + rules + compute + unknowns scan
4. Result: `{inserted: count, firstRow, lastRow}`

### Rule Application
1. Rules stored as `"KEYWORD|DIRECTION"` (e.g., `"UBER|ANY"`) in Document Properties (key: `"KEYWORD|DIRECTION"` → value: `JSON {category, type}`)
2. `RuleEngine.applyRulesToTransactions()` scans Transactions, matches keywords in descriptions (case-insensitive after norm), sets category/type
3. Supports "any" direction or specific "in"/"out" directions
4. Called during sync cascade; UI (Rules.html) manages rule creation/deletion

### Unknown Resolution
1. `UnknownsEngine.scan()` groups transactions with missing/empty/"Unknown"/"None" categories
2. Returns `[{keyword, count, totalDebit, totalCredit, direction}, ...]`
3. UI (ResolveUnknowns.html) shows grouped unknowns; user can create rules to auto-categorize
4. Rule creation re-triggers sync

### Category Rename Flow
1. User enters old name, new name, type in RenameCategory.html
2. `RenameEngine.renameCategoryGlobal()` updates both Settings and Transactions (columns F/G and O/P)
3. Triggers `SyncEngine.afterRename()`: rebuild categories → validation → rules → compute → unknowns scan
4. Returns count of updated rows

### Period Summary (Month/Quarter/Annual)
1. **Sheets affected**: Overview tab + 12 Month tabs (January–December)
2. `MonthSync.js` - `updateSummarySheet()`: 
   - Read period from cell B2 (e.g., "February", "Q2", "Annual")
   - Read year from cell B1
   - `resolveDateWindow()` converts period string to date range
   - `aggregateTransactions()` sums category totals from Transactions within date window
   - `applySectionTotals()` writes results under section headers
   - `updateSubtotals()` recalculates bold header totals
3. Called via menu: "Refresh Dashboard" (for current sheet) or `updateAllMonths()` (for all 12 months)
4. Schema-driven: Sections defined in `OVERVIEW.sections` with category/sum column positions

### Month Master List Build
1. `buildMonthMasterList()` - called on individual month tabs (not Settings or Transactions)
2. Uses `CategoryEngine` to read category blocks from Settings
3. Writes structured lists:
   - Income (column B, row 5) - category + type + amounts
   - Savings/Investing (column B, row 21) - category + type + amounts
   - Expenses stacked (column H+, row 6+) - grouped by type (Residence, Transportation, etc.)
4. Applies color formatting: Income (#356854), Savings (#073763), Expenses (#4c1130)
5. Called on demand when month layout needs refresh

### System Health Check
1. `Diagnostics.js` - `checkSystemHealth()`:
   - Verifies all required sheets exist (Settings, Transactions, Overview)
   - Loads categories via CategoryEngine, reports count
   - Scans unknown transactions, reports count
   - Displays summary in alert dialog
2. Menu item: "Run Health Check" for debugging and verification

## Key Integration Points

### Google Apps Script APIs Used
- `SpreadsheetApp`: Sheet access, ranges, named ranges, data validation, charts
- `HtmlService`: Modal dialogs for Importer, Unknowns resolver, Category renamer, Rules editor
- `PropertiesService`: Persistent rule & preference storage (Document Properties for rules, Script Properties for imports)
- `Utilities.parseCsv()`: CSV parsing

### Engine Dependency Graph
```
SyncEngine (orchestrator)
├── CategoryEngine (read Settings → build named range)
├── ValidationEngine (apply dropdowns to columns F/G/O/P)
├── RuleEngine (apply keyword-based categorization)
├── ComputeEngine (sum totals by category/type/month)
└── UnknownsEngine (scan for missing categories)

MonthSync (period aggregation, separate entry point)
├── PeriodEngine (convert "February"/"Q2"/"Annual" → date range)
└── ComputeEngine data (reads aggregated totals)

ChartsEngine (refresh visualization, depends on ComputeEngine totals)

RenameEngine (updates Settings + Transactions, triggers SyncEngine)
```

### HTML Dialogs
- `Importer.html`: CSV import with column mapping → calls `ImportEngine.importCsv()`
- `ResolveUnknowns.html`: Show grouped unknowns from `UnknownsEngine.scan()` → create rules via `RuleEngine.save()`
- `RenameCategory.html`: Bulk rename categories → calls `RenameEngine.renameCategoryGlobal()`
- `Rules.html`: Manage saved rules (create, delete, list via `RuleEngine`)

### Secrets & Sensitive Config
- `Secrets.js`: Central repository for API keys (e.g., `GEMINI_API_KEY`)
- Accessed via `getSecret()` function; intended for future AI categorization enhancement via `AI.js`

## Common Editing Patterns

### Adding a New Category Type
1. Update **Settings sheet** structure if needed (e.g., adding new section columns)
2. Update `CategoryEngine.getFlattenedCategories()`: Add entry to `tables` array with correct column indices
3. `RefreshBudgetSystem` will rebuild category list and validation

### Updating Compute Totals
- All totals in `ComputeEngine.computeAllTotals()`: Edit the `totals` object accumulator
- Results written via `writeTotalsToOverview()` to fixed Overview ranges
- Called after every import/sync/rename

### Fixing Chart Issues
- `ChartsEngine.refreshAllCharts()`: Modify chart data ranges or options
- Uses `.addRange()` API (not `.clearRanges()` then `setRange()`)
- Charts are never deleted, only updated

### Adding Menu Items
- `Menu.js` → `onOpen()`: Add items to the "Budget Tools" menu
- Wire UI dialogs to handler functions
- Use `SyncEngine` handlers to trigger post-action syncs

### Adding/Modifying Rules
1. Rules stored as JSON in Document Properties under key `"KEYWORD|DIRECTION"`
2. Create via `RuleEngine.save(keyword, category, type, direction)`
3. Apply via `RuleEngine.applyRulesToTransactions()` - scans all Transactions, matches normalized keywords
4. Delete via `RuleEngine.deleteOne()` or `RuleEngine.deleteAll()`
5. After rule changes, call `SyncEngine.afterRuleSave()` to refresh system

### Updating Period Summary Logic
- **Month/Quarter aggregation**: Edit `MonthSync.js` - `MONTHS`, `QUARTERS`, or `OVERVIEW.sections`
- **Date window resolution**: `PeriodEngine.determinePeriodDates()` handles period string → date range conversion
- **Transaction aggregation**: `aggregateTransactions()` loops through Transactions, applies date filtering, sums by category
- To add a new period type: Update `QUARTERS` object or extend month parsing logic

### Renaming Categories Globally
1. Call `RenameEngine.renameCategoryGlobal(oldName, newName, optionalNewType)`
2. Automatically updates: Settings sheet (all category pairs) + Transactions (columns F/G and O/P)
3. Rebuilds categories and validation via SyncEngine handlers
4. Wrapped by `openRenameCategoryDialog()` UI in Menu.js

### Extending Unknowns Detection
- `UnknownsEngine.scan()`: Returns grouped data with keyword, count, totalDebit, totalCredit, direction
- Handles both sides independently (left/right splits at column K)
- Groups by normalized description (lowercase key)
- Modify filtering logic (e.g., exclude certain keywords) in helper `isUnknownCategory_()`

## Debugging & Validation

- **Check error logs**: View → Execution logs (or use `SpreadsheetApp.toast()` for user feedback)
- **Validate named ranges**: Use `ss.getRangeByName()` and check for null
- **Test sync order**: Call `SyncEngine.refreshSystem()` and observe each engine's toast message
- **Compare properties**: Inspect categorization rules via `RuleEngine.getAll()`
- **Verify sheet structure**: Confirm row/column positions match `ComputeEngine`, `ValidationEngine`, `CategoryEngine`

