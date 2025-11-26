/** ============================================================================
 * PERIOD ENGINE
 * Converts sheet dropdown selection into actual date ranges.
 * ============================================================================
 */

function PeriodEngine() {
  return {
    determine: determinePeriodDates
  };
}

function determinePeriodDates(periodText, year) {
  const q = {
    "First Quarter": [0, 2],
    "Second Quarter": [3, 5],
    "Third Quarter": [6, 8],
    "Fourth Quarter": [9, 11],
    "Q1": [0, 2],
    "Q2": [3, 5],
    "Q3": [6, 8],
    "Q4": [9, 11]
  };

  if (periodText === "Annual") {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31)
    };
  }

  if (q[periodText]) {
    const s = q[periodText][0];
    const e = q[periodText][1];
    return {
      start: new Date(year, s, 1),
      end: new Date(year, e + 1, 0)
    };
  }

  // monthly
  const tryDate = new Date(periodText + " 1, " + year);
  if (!isNaN(tryDate.getTime())) {
    return {
      start: tryDate,
      end: new Date(tryDate.getFullYear(), tryDate.getMonth() + 1, 0)
    };
  }

  return null;
}

function parseDateSimple(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d;
  return null;
}
