// aiClients/dataStrategyBot.js
// Bot for heavy data analysis & strategy testing
const BotOperator = require('./botOperator');
const fs = require('fs');

class DataStrategyBot extends BotOperator {
  constructor(config = {}) {
    super(config);
    this.testResults = [];
  }

  async operate(context) {
    if (!this.active) return;
    // 1. טעינת נתונים (לדוג' קובץ CSV, נתוני משחק, API)
    let data = context?.data;
    if (!data && context?.dataFile) {
      try {
        const raw = fs.readFileSync(context.dataFile, 'utf8');
        data = raw.split('\n').map(line => line.split(','));
      } catch (e) {
        console.error('Data load error:', e);
        return;
      }
    }
    if (!data) {
      console.warn('No data provided for heavy test.');
      return;
    }

    // 2. הרצת בדיקות אסטרטגיה כבדה (דוג' סימולציה)
    const results = this.runHeavyStrategyTests(data, context.strategy || {});
    this.testResults.push(results);
    console.log('Heavy strategy test results:', results.summary);

    // 3. אם יש LLM, אפשר לנתח תוצאות ולהציע שיפורים
    if (this.llmConnector) {
      const analysis = await this.llmConnector.ask(
        `Analyze these results and suggest improvements: ${JSON.stringify(results.summary)}`
      );
      console.log('AI Analysis:', analysis);
    }
  }

  // סימולציה/בדיקה כבדה (דוגמה בסיסית)
  runHeavyStrategyTests(data, strategy) {
    // כאן אפשר לממש לולאות, סימולציות, סטטיסטיקות, חישובים
    let total = 0;
    let count = 0;
    for (const row of data) {
      // דוגמה: חישוב סכום עמודה ראשונה
      const num = parseFloat(row[0]);
      if (!isNaN(num)) {
        total += num;
        count++;
      }
    }
    // דוגמה לתוצאה
    return {
      summary: {
        total,
        count,
        avg: count ? total / count : 0,
        strategyUsed: strategy.name || 'default',
      },
      details: { dataSample: data.slice(0, 5) }
    };
  }
}

module.exports = DataStrategyBot;
