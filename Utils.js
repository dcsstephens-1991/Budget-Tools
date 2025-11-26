/**
 * Utils.js
 * Shared helpers used by all backend modules.
 */

const Utils = {

  /** Normalize category names for comparisons */
  norm(str) {
    return String(str || '')
      .replace(/\u00A0/g, ' ')
      .trim()
      .toUpperCase();
  },

  /** Clean number parsing */
  num(v) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  },

  /** Safe date parsing */
  parseDate(v) {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v)) return v;

    try {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  },

  /** Convert A1 column to index */
  a1ToCol(a) {
    let n = 0;
    const s = a.toUpperCase();
    for (let i = 0; i < s.length; i++) {
      n = n * 26 + (s.charCodeAt(i) - 64);
    }
    return n;
  },

  /** Convert column index to A1 letter */
  colToA1(n) {
    let s = '';
    while (n > 0) {
      let r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }
};
