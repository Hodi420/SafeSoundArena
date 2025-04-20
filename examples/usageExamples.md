# SafeSoundArena – דוגמאות שימוש מתקדמות

## 1. הרצת DataStrategyBot עם קובץ נתונים
```js
const DataStrategyBot = require('../aiClients/dataStrategyBot');
const bot = new DataStrategyBot();

// הפעלת הבוט עם קובץ CSV (למשל data.csv)
bot.operate({ dataFile: './data.csv', strategy: { name: 'sum' } });
```

## 2. שילוב CommunityBot עם טלגרם ו-LLM
```js
const CommunityBot = require('../aiClients/communityBot');
const bot = new CommunityBot({
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  llmOptions: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4.1' },
  language: 'he'
});
setInterval(() => bot.pollAndRespond(), 2000);
```

## 3. הרצת בדיקות אוטומטיות
```sh
npm test
```

## 4. בדיקות CI/CD
כל Pull Request או Push לענף main יריץ אוטומטית את כל הבדיקות בענן (GitHub Actions). תוכל לראות את התוצאות בטאב Actions ב-GitHub.

## 5. דוגמה להוספת בוט חדש
```js
const BotOperator = require('../aiClients/botOperator');
class MyCustomBot extends BotOperator {
  operate(context) {
    // לוגיקת בוט מותאמת אישית
  }
}
```

---

למידע נוסף – עיין ב־README.md וב־CONTRIBUTING.md!
