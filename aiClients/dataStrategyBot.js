class DataStrategyBot {
  constructor() {
    this.testResults = [];
  }

  async operate(context = {}) {
    const data = context.data;
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('no data provided');
      return;
    }
    // flatten numeric arrays and compute sum/count/avg for tests
    const nums = data.flat().map(Number);
    const total = nums.reduce((s, v) => s + v, 0);
    const count = nums.length;
    const avg = count ? total / count : 0;
    const summary = {
      total,
      count,
      avg,
      strategyUsed: (context.strategy && context.strategy.name) || 'unknown',
    };
    this.testResults.push({ context, summary });
    return summary;
  }
}

module.exports = DataStrategyBot;
