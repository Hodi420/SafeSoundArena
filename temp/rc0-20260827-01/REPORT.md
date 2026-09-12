# SafeSoundArena — RC-0: שער בדיקות מבודדות

תאריך: 27 באוגוסט 2026. היקף מקומי אושר על ידי Idan עם בקשת זהירות מפורשת.

**תוצאה: 46/46 בדיקות יחידה ואחסון עברו; RC-0 המלא עדיין לא אומת.**

## מה נבדק בפועל

| תחום | בדיקות שעברו |
| --- | ---: |
| Feature Store — נתוני דמה וכתיבה/טעינה מקובץ זמני | 4 |
| Agent lifecycle, execution admission, orchestration ו־Safety Gate | 18 |
| MSHIX core, outbox ו־Brain עם ספקים מדומים | 17 |
| JailTime JSONL event log | 2 |
| PQS simulation, proofs, anti-abuse ו־adapters כבויים | 5 |
| סה״כ | 46 |

Node `v24.19.0`; תהליך הבדיקה הסתיים בקוד `0`, ללא כשל, דילוג, OOM או ניסיון רשת/הפעלת subprocess שזוהה על ידי שומרי הבדיקה. משך הבדיקות שדווח על ידי Mocha היה 60ms; זה אינו מדד ביצועים של המוצר.

נבדקו בדיוק 29 קובצי JavaScript: 19 קובצי מימוש ו־10 קובצי בדיקה. תלויות Mocha/Express הועתקו מההתקנה המקומית בלבד: 153 חבילות, 1,559 קבצים, 11,215,433 bytes. לא הותקנו חבילות, לא בוצעו הורדות ולא הופעלו install scripts. לא הועתקו workspace junctions, native add-ons, `.env`, קובצי audit או נתוני משתמשים.

## בידוד שאומת לפני ההרצה ובתוכה

- קונטיינר הבדיקות היה `network=none`, עם ממשק `lo` בלבד, ללא routes חיצוניים וללא פורטים מפורסמים.
- לא היו bind mounts או volumes מה־host. קוד ותלויות היו בקריאה בלבד; כל כתיבות ה־fixtures בבדיקות בוצעו ב־`/tmp` זמני בזיכרון.
- root filesystem לקריאה בלבד; `/app` של image הבסיס הוסתר ב־tmpfs ריק לקריאה בלבד. לא נטען application entrypoint.
- UID/GID `65534:65534`, ללא capabilities, עם `no-new-privileges`, healthcheck כבוי ו־restart כבוי.
- מגבלות: CPU אחד, 512MiB ללא swap נוסף, 64 תהליכים. מגבלת זמן חיצונית של 45 שניות הייתה עוצרת רק את קונטיינר הבדיקה לפי מזהה מדויק. ההרצה הסתיימה הרבה לפניה.
- שומרי הבדיקה היו מכשילים שימוש ב־fetch/HTTP/TCP/DNS, פתיחת listener או subprocess; נרשמו אפס ניסיונות.
- hashes של כל 29 קובצי המקור אומתו מול העותק לפני הבדיקות, ושוב מול המקור במחשב לאחריהן.

## מסלול ההכנה והניקוי

ניסיון יצירה עם שיתוף תיקיות Windows לא הושלם. הופסק רק לקוח `docker create` ששייך לבדיקה, ולא Docker Desktop או שירות קיים. ניסיון העתקה לקונטיינר בעל rootfs לקריאה בלבד נדחה כצפוי; הגנת הקריאה בלבד לא הוסרה מקונטיינר רץ.

החלופה הייתה קונטיינר אריזה נפרד שמעולם לא הופעל, ללא רשת או mounts ועם entrypoint של `/bin/false`. הועתקו אליו רק `/input`, `/deps` ו־`/check.cjs`, ונוצר image מקומי ללא tag, build, pull או push. שכבות הבסיס והשינויים נבדקו. קונטיינר הבדיקות האמיתי נוצר ממנו עם כל ההגנות לעיל.

חשוב: ה־image הנגזר עדיין הכיל את שכבות `/app` של image הבסיס; ההסתרה הייתה בזמן הרצת הבדיקות. הוא לא הוצא מהמחשב, לא שותף, והוסר בסיום.

הוסרו שלושת קונטיינרי ה־scratch וה־image הנגזר בלבד, ללא force, מחיקת volumes או prune. בדיקת הסיום לא מצאה קונטיינר RC-0 נוסף, כולל הניסיון שבוטל. מקור הקוד, העותק המסונן, הסקריפטים והראיות נשמרו בתיקייה זו; ניתן לבנות מהם הרצה חדשה עם מזהים חדשים. אלה סקריפטי הרצה חד־פעמית, לא פקודת Production ולא מתכון להרצה חוזרת ללא preflight.

## מה נשאר ללא שינוי

- HEAD: `e33cfd88d127c5e7cd1a7266295aa924b9935b3b`, branch `codex/phase-1-proof-layer`.
- ה־working tree עדיין מכיל רק את השינוי המקומי שהיה קיים ב־`docker-compose.yml`; ה־SHA-256 שלו לא השתנה. לא נערך קוד אפליקציה.
- אותם שלושה שירותי משתמש נשארו healthy עם אותם IDs ופורטי loopback: frontend `5a8af19159f4`, API `173e4d0fe30f`, IPFS `c104a2533ac4`. הם לא הופעלו מחדש או שימשו לבדיקות.
- לא נעשה שימוש בנתונים אמיתיים בבדיקות, לא שונו Firewall או הגדרות Docker, ולא בוצעו push, PR או פריסה.

## גבולות התוצאה והשלב הבא

לא נבדקו HTTP/UI, מסלול Next `/api`, Socket.IO בדפדפן, authentication ציבורי, שרתי API/Frontend מבודדים, build חדש, CI מרוחק, מודל Ollama אמיתי או snapshot/restart/restore של מערכת מלאה. בדיקות reload של קובצי fixtures אינן שחזור Production.

לפני מעבר ל־smoke של שני השירותים נדרשים preflight נפרד, מקור קוד/תצורה ללא נתונים וסודות, נתיבי state חדשים ומבודדים, חסימה מאומתת של אינטגרציות חיצוניות וחוזה רשת מפורש. אין לתקן failures באמצעות החלשת הרשאות. בפרט, פערי MCP/Feature identity, ה־proxy ו־MshixPanel נשארו פתוחים.

SSA-1 ו־SSA-2 נשארות בתהליך. הבדיקות אינן אישור שחרור, ואינן עילה לסגירת משימות Auth, Persistence, CI או Deployment.

## ראיות מקומיות

- `unit-result.json` — תוצאת הבדיקות וקוד יציאה.
- `unit-output.log` — פלט מלא של הבדיקות וה־precheck.
- `snapshot-02/source/rc0-manifest.json` — revision, hashes, רשימת בדיקות ותלויות.
- `container-created-03.json` — הגנות שנבדקו לפני start.
- `prepared-image.json` — מקור האריזה המקומית; ה־image כבר הוסר.
- `stage.cjs`, `check.cjs`, `control.cjs` — קוד הריצה שנבדק.

הכול תחת `C:/Users/idanv/OneDrive/Desktop/SafeSoundArena/temp/rc0-20260827-01/`, תיקיית scratch המוחרגת כבר מ־Git.
