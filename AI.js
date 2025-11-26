/**
 * AI.gs
 * Wrapping the model call for transaction categorization.
 * (Frontend calls google.script.run.aiCategorizeTransactions)
 */

const AI = {

  /**
   * descList = array of descriptions
   * Returns: [{category, type, confidence}, ...]
   */
  autoCategorize(descList) {
    if (!descList || !descList.length) return [];

    const results = [];
    const cats = CategoryEngine.getCategoriesFromSettings().flatList;

    descList.forEach(text => {
      const guess = this._guessCategory(text || '', cats);
      results.push(guess);
    });

    return results;
  },

  /**
   * Basic semantic matching engine
   * (Later can add Gemini or Vertex API)
   */
  _guessCategory(desc, cats) {
    const d = desc.toLowerCase();

    // naive keyword scoring
    let best = null;
    let bestScore = 0;

    cats.forEach(c => {
      const name = c.category.toLowerCase();

      let score = 0;
      if (d.includes(name)) score += 3;

      // Partial scoring
      const words = name.split(' ');
      words.forEach(w => {
        if (w.length >= 4 && d.includes(w)) score += 1;
      });

      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    });

    if (!best) {
      return { category: 'Unknown', type: 'Unknown', confidence: 0 };
    }

    return {
      category: best.category,
      type: best.type || 'Unknown',
      confidence: bestScore
    };
  }
};
