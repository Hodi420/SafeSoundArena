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

## 6. דוגמה לשימוש ב-Scrolls Engine
```js
const scrollsEngine = require('../backend/scrolls-engine');
// דוגמה לקריאה לפונקציה דמה
// scrollsEngine.createScroll({ title: 'מגילה חדשה', content: '...' });
```

## 7. דוגמה לשימוש ב-Jail Time Events
```js
const jailTime = require('../backend/jailtime-events');
// דוגמה לקריאה לפונקציה דמה
// jailTime.createEvent({ name: 'אירוע לדוגמה', date: Date.now() });
```

## 8. דוגמה לשימוש ב-Proof of Activity
```js
const proofOfActivity = require('../backend/proof-of-activity');
// דוגמה לקריאה לפונקציה דמה
// proofOfActivity.logActivity({ userId: 1, action: 'login' });
```

## 9. דוגמה לשימוש ב-Shame & Honor Boards
```js
const boards = require('../backend/shame-honor-boards');
// דוגמה לקריאה לפונקציה דמה
// boards.addHonor(1, 'תרומה משמעותית לקהילה');
```

## 10. דוגמה לשימוש ב-Scroll Manager
```js
const scrollManager = require('../pioneer-pathways/scroll-manager');
// דוגמה לקריאה לפונקציה דמה
// scrollManager.addScroll({ title: 'Scroll', content: '...' });
```

למידע נוסף – עיין ב־README.md וב־CONTRIBUTING.md!
