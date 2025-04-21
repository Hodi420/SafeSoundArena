# Arena Credit (ARC) – Decentralized Token System (Off-chain Simulation)

## Whitepaper (תקציר)
Arena Credit (ARC) הוא מטבע דיגיטלי מבוזר, שנועד לשמש כאמצעי תשלום ותגמול באפליקציית SafeSoundArena. ARC יתממשק בעתיד עם רשת Pi Network ויאפשר מעבר חלק בין מטבע PI לבין הקרדיט הפנימי של המערכת.

### שימושים עיקריים
- רכישת שירותים/מוצרים באפליקציה
- תגמול משתמשים פעילים
- השתתפות בהצבעות קהילתיות

### Tokenomics
- **סה"כ היצע**: 1,000,000 ARC
- **חלוקה**: 50% קהילה, 20% צוות, 20% פיתוח, 10% רזרבה
- **מנגנון mint/burn**: כן (באמצעות אדמין)
- **governance**: הצבעות קהילתיות (בהמשך)

| קטגוריה     | כמות ARC | אחוז מההיצע |
|-------------|----------|-------------|
| קהילה       | 500,000  | 50%         |
| צוות        | 200,000  | 20%         |
| פיתוח       | 200,000  | 20%         |
| רזרבה       | 100,000  | 10%         |
| **סה"כ**    | 1,000,000| 100%        |

### Roadmap
1. פיתוח MVP (Off-chain)
2. בניית קהילה
3. אינטגרציה עם Pi Network
4. הנפקה מלאה על רשת Pi

---

## API עיקרי (Node.js)

- Mint: הנפקת מטבעות חדשים (admin בלבד)
- Burn: שריפת מטבעות (admin בלבד)
- Transfer: העברת מטבעות בין משתמשים
- GetBalance: בדיקת יתרה
- GetTransactions: הצגת היסטוריית טרנזקציות
- GetTokenomics: הצגת פרטי המטבע

---

## דוגמת חוזה חכם (בהשראת Pi, להמרה עתידית)

```
contract ArenaCredit {
    string public name = "Arena Credit";
    string public symbol = "ARC";
    uint256 public totalSupply;
    address public owner;
    mapping(address => uint256) public balanceOf;
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);
    // ...
}
```

---

## אבטחה ושקיפות
- כל פעולה נרשמת בלוג טרנזקציות.
- הרשאות mint/burn מוגבלות לאדמין בלבד.
- מוכן להמרה לחוזה חכם אמיתי ברגע ש-Pi Network תאפשר.

---

## קהילה
- אתר, פורום, Discord/Telegram, תיעוד מלא.
- שקיפות מלאה לגבי חלוקה, mint, burn, governance.

---

## הוראות להמרה עתידית
- החלף את המימוש של arenaCreditService.js בממשק ל-SDK/חוזה חכם של Pi Network.
- שמור על API זהה כדי לא לשבור את שאר המערכת.
