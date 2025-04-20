# דוגמאות קוד לשימוש ב-SafeSoundArena

כאן תוכל למצוא דוגמאות לשימוש ב-API, הרחבת מנועים, יצירת בוטים ועוד.

## דוגמה: יצירת בוט בסיסי
```js
// aiClients/myBot.js
module.exports = {
  name: 'myBot',
  onMessage: (msg) => {
    if (msg.text.includes('שלום')) return 'היי!';
  }
}
```

## דוגמה: קריאה ל-API
```js
fetch('/api/v1/game-state')
  .then(res => res.json())
  .then(data => console.log(data));
```

## דוגמה: הוספת חוק חדש
```js
// blockchain/rules.js
module.exports = [
  ...existingRules,
  function newRule(state) {
    // חוק חדש
    return state;
  }
];
```
