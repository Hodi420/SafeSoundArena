// aiClients/deciderBot.js
// DeciderBot: the authoritative bot that decides and enforces consensus actions
const BotOperator = require('./botOperator');
const { getConsensus } = require('../consensus');

class DeciderBot extends BotOperator {
  constructor(config = {}) {
    super(config);
    this.name = config.name || 'DeciderBot';
    this.log = [];
    this.permissions = config.permissions || {
      software: true,
      edit: true,
      db: true,
      webhook: true
    };
  }

  /**
   * קבלת החלטה קונצנזוסית והפעלה אוטומטית (מורחב)
   * @param {string} prompt - שאלה/הנחיה שעליה יתקבל קונצנזוס
   * @param {object} context - קונטקסט נוסף
   */
  /**
   * מחולל שאלות אימות למנהל לפי סוג פעולה
   * @param {string} type
   * @param {object} entry
   * @returns {Array<string>}
   */
  generateValidationQuestions(type, entry) {
    const base = [
      `האם לאשר לבוט לבצע את הפעולה: ${entry.consensus}?`,
      `האם אתה בטוח שהפעולה הזו תואמת את מדיניות המערכת?`,
      `האם תרצה לקבל דוח מפורט לפני ביצוע?`
    ];
    if (type === 'edit') {
      base.push(`האם לאשר עריכה בקובץ ${entry.consensus.split(' ')[1]}?`);
    }
    if (type === 'db') {
      base.push(`האם לאשר ביצוע שאילתא בבסיס הנתונים?`);
    }
    if (type === 'webhook') {
      base.push(`האם לאשר שליחת Webhook לכתובת חיצונית?`);
    }
    return base;
  }

  async decideAndEnforce(prompt, context = {}) {
    const result = await getConsensus(prompt);
    const timestamp = Date.now();
    // ניתוח רמת קונצנזוס ומורכבות
    const tally = result.tally || {};
    const totalWeight = Object.values(tally).reduce((a, b) => a + b, 0);
    const maxWeight = Math.max(...Object.values(tally));
    const consensusRatio = totalWeight ? (maxWeight / totalWeight) : 0;
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const secondWeight = sorted.length > 1 ? sorted[1][1] : 0;
    const gap = maxWeight - secondWeight;
    const uniqueAnswers = Object.keys(tally).length;
    let consensusComplexity = 'clear';
    let needsRePrompt = false;
    if (consensusRatio < 0.6 || (gap < 2 && uniqueAnswers > 1)) {
      consensusComplexity = 'ambiguous';
      needsRePrompt = true;
    }
    let entry = {
      prompt,
      consensus: result.consensus,
      timestamp,
      type: 'unknown',
      status: 'pending',
      details: null,
      consensusRatio,
      consensusComplexity,
      needsRePrompt,
      tally,
      totalWeight,
      gap,
      uniqueAnswers
    };
    // טיפול בדעה חוזרת (re-prompt)
    if (needsRePrompt && !context._rePrompted) {
      entry.status = 're_prompt';
      entry.details = 'Consensus ambiguous – re-prompting.';
      this.log.push(entry);
      // מבצע דעה חוזרת פעם אחת בלבד (למניעת לולאה אינסופית)
      await this.decideAndEnforce(prompt, { ...context, _rePrompted: true });
      return;
    }
    try {
      if (result && result.consensus) {
        if (result.consensus.startsWith('game_')) {
          entry.type = 'software';
          // שלב אימות מנהל
          if (!context.approve) {
            entry.status = 'pending_approval';
            entry.details = 'Awaiting manager approval.';
            entry.validationQuestions = this.generateValidationQuestions(entry.type, entry);
            this.log.push(entry);
            console.warn('DeciderBot: awaiting manager approval:', entry.validationQuestions);
            return entry;
          }
          if (this.permissions.software) {
            this.actionExecutor.executeSoftwareAction(result.consensus, (err, out) => {
              entry.status = err ? 'error' : 'success';
              entry.details = err ? err.message : out;
              if (err) console.error('DeciderBot: consensus action failed:', err);
              else console.log('DeciderBot: consensus action output:', out);
            });
          } else {
            entry.status = 'forbidden';
            entry.details = 'Software actions not permitted';
          }
        } else if (result.consensus.startsWith('edit:')) {
          entry.type = 'edit';
          // שלב אימות מנהל
          if (!context.approve) {
            entry.status = 'pending_approval';
            entry.details = 'Awaiting manager approval.';
            entry.validationQuestions = this.generateValidationQuestions(entry.type, entry);
            this.log.push(entry);
            console.warn('DeciderBot: awaiting manager approval:', entry.validationQuestions);
            return entry;
          }
          if (this.permissions.edit) {
            const editInstruction = result.consensus.slice(5).trim();
            // פורמט: "<file> <action> <data>"
            const [file, action, ...rest] = editInstruction.split(' ');
            const data = rest.join(' ');
            const fs = require('fs');
            try {
              if (action === 'append') {
                fs.appendFileSync(file, data + '\n');
                entry.status = 'success';
                entry.details = `Appended to ${file}: ${data}`;
              } else if (action === 'replace') {
                fs.writeFileSync(file, data);
                entry.status = 'success';
                entry.details = `Replaced ${file} content.`;
              } else if (action === 'delete') {
                fs.unlinkSync(file);
                entry.status = 'success';
                entry.details = `Deleted file ${file}`;
              } else {
                entry.status = 'unknown_action';
                entry.details = `Unknown edit action: ${action}`;
              }
              console.log('DeciderBot: edit action:', entry.details);
            } catch (e) {
              entry.status = 'error';
              entry.details = e.message;
              console.error('DeciderBot: edit action error:', e);
            }
          } else {
            entry.status = 'forbidden';
            entry.details = 'Edit actions not permitted';
          }
        } else if (result.consensus.startsWith('db:')) {
          entry.type = 'db';
          // שלב אימות מנהל
          if (!context.approve) {
            entry.status = 'pending_approval';
            entry.details = 'Awaiting manager approval.';
            entry.validationQuestions = this.generateValidationQuestions(entry.type, entry);
            this.log.push(entry);
            console.warn('DeciderBot: awaiting manager approval:', entry.validationQuestions);
            return entry;
          }
          if (this.permissions.db) {
            const dbQuery = result.consensus.slice(3).trim();
            // כאן אפשר להפעיל שאילתא אמיתית; כרגע רק הדפסה
            entry.status = 'success';
            entry.details = `DB Query: ${dbQuery}`;
            console.log('DeciderBot: DB Query:', dbQuery);
          } else {
            entry.status = 'forbidden';
            entry.details = 'DB actions not permitted';
          }
        } else if (result.consensus.startsWith('webhook:')) {
          entry.type = 'webhook';
          // שלב אימות מנהל
          if (!context.approve) {
            entry.status = 'pending_approval';
            entry.details = 'Awaiting manager approval.';
            entry.validationQuestions = this.generateValidationQuestions(entry.type, entry);
            this.log.push(entry);
            console.warn('DeciderBot: awaiting manager approval:', entry.validationQuestions);
            return entry;
          }
          if (this.permissions.webhook) {
            const [url, ...payloadArr] = result.consensus.slice(8).trim().split(' ');
            const payload = payloadArr.join(' ');
            try {
              const https = require('https');
              const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
              req.write(payload);
              req.end();
              entry.status = 'success';
              entry.details = `Webhook sent to ${url} with payload: ${payload}`;
              console.log('DeciderBot: Webhook sent:', url, payload);
            } catch (e) {
              entry.status = 'error';
              entry.details = e.message;
              console.error('DeciderBot: Webhook error:', e);
            }
          } else {
            entry.status = 'forbidden';
            entry.details = 'Webhook actions not permitted';
          }
        } else {
          entry.type = 'other';
          entry.status = 'not_implemented';
          entry.details = result.consensus;
          console.log('DeciderBot: consensus decision:', result.consensus);
        }
      } else {
        entry.status = 'no_consensus';
        entry.details = 'No consensus decision could be applied.';
        console.warn('DeciderBot: no consensus decision could be applied.');
      }
    } catch (e) {
      entry.status = 'error';
      entry.details = e.message;
      console.error('DeciderBot: decideAndEnforce error:', e);
    }
    this.log.push(entry);
  }

  /**
   * הפעלה אוטומטית: קבלת prompt מהקשר או context, קבלת החלטה ויישום
   */
  async operate(context) {
    if (!this.active) return;
    if (context && context.consensusPrompt) {
      await this.decideAndEnforce(context.consensusPrompt, context);
      return;
    }
    // אופציונלי: fallback ליכולת של BotOperator
    await super.operate(context);
  }

  /**
   * החזרת לוג ההחלטות עם אפשרות לסינון
   * @param {object} [filter] - { type, status, from, to }
   * @returns {Array}
   */
  getDecisionLog(filter = {}) {
    return this.log.filter(entry => {
      if (filter.type && entry.type !== filter.type) return false;
      if (filter.status && entry.status !== filter.status) return false;
      if (filter.from && entry.timestamp < filter.from) return false;
      if (filter.to && entry.timestamp > filter.to) return false;
      return true;
    });
  }
}


module.exports = DeciderBot;
