# SafeSoundArena — מסירת Git וחיבורי MCP

תאריך: 2026-08-27. מסמך גבול מסירה; אינו אישור release, פריסה או מוכנות המיני־PC.

## מה נמסר

בקשת Idan להוסיף חיבורים מתאימים ולדחוף את הפרויקט מתירה commit ו־push לענף העבודה הקיים. גבול המסירה הוא התיעוד, תצורת MCP לקריאת תיעוד ושינוי ה־loopback הקיים של המשתמש. אין שינוי קוד אפליקציה, dependencies או workflows בסבב זה; אין פתיחת PR, merge, פרסום image או deployment.

- [מפת הפרויקט](PROJECT_FILE_MAP.md): 614 קבצים במעקב בנקודת הפתיחה; runtime קנוני, legacy, packages, tests, data וגבולות אחריות.
- [מוכנות מיני־PC](MINI_PC_READINESS.md): 6 בדיקות מקור ו־14 פערים/שערים. ההחלטה נשארת `NOT_READY_FOR_DEPLOYMENT`; מפרט המכשיר ובדיקות עליו חסרים.
- [חבילת QA](qa/rc0/README.md): תיעוד 46 תוצאות יחידה קיימות, לא הרצת מערכת חדשה; ראיות גולמיות נשארות מקומיות.
- [תצורת MCP פרויקטלית](../.codex/config.toml): שני שרתי תיעוד HTTP ללא credentials, ללא הרשאות filesystem/Docker/SSH.

מזהה המסירה הסופי הוא ה־commit שמכיל את הקבצים האלה, ולא SHA הבסיס של בדיקות היחידה. קבלת הדחיפה בשרת נבדקת בנפרד באמצעות remote ref; SHA, diff hash ותוצאת האימות נרשמים ב־[Project Hub](https://app.notion.com/p/3c83b4e496d7811d95e3ef06057c2285) לאחר הדחיפה. עצם קיום מסמך זה מקומית אינו הוכחה שה־push הצליח.

## חיבורי עבודה — מצב שנבדק

| חיבור | מצב וראיה | שימוש וגבול |
| --- | --- | --- |
| GitHub | חיבור קיים אומת עם המשתמש `Hodi420`, metadata של המאגר וקריאת refs מרוחקים | סקירת repository/CI וקישור לגרסאות. push מתבצע באמצעות Git למאגר הקיים; אין שינוי הרשאות או branch protection. |
| Notion | חיבור קיים אומת בקריאת Hub, חבילת QA, סכמת המשימות ומשימות קיימות | מסמכים, החלטות ומעקב התקדמות. אין העתקה גורפת של תוכן Notion או העלאת secrets/raw runtime ל־Git. |
| OpenAI Docs MCP | נוסף לתצורת הפרויקט; `initialize`, `tools/list` וחיפוש תיעוד כללי הצליחו ללא מפתח | 5 כלים מסומני read-only. משמש לבדיקת תיעוד רשמי של רכיבי OpenAI; אינו קורא ל־API של המודלים ואינו מפעיל ספק AI. |
| Context7 MCP | נוסף לתצורת הפרויקט; `initialize`, `tools/list` ו־`resolve-library-id` עבור Next.js הצליחו ללא מפתח | allowlist של `resolve-library-id` ו־`query-docs`. גישה אנונימית מוגבלת בקצב; יש לבחור מקור וגרסה מתאימים. |
| Git / filesystem / Docker CLI מקומי | יכולות מקומיות קיימות, לא MCP חדשים | אין צורך בשרת filesystem נוסף או בחשיפת Docker socket למיפוי זה. חיבור למיני־PC עצמו לא הוגדר. |

לשני שרתי התיעוד מוגדרים timeout ו־`required=false`; לא שונתה מדיניות האישור הכללית. נשלחו רק שמות ספריות ושאלות תיעוד כלליות. התצורה הוכרה ב־`codex mcp list`, והבדיקה החיה נעשתה בלקוח MCP תחום נפרד. זמינות הכלים בתוך שיחת Codex הפעילה אחרי שינוי התצורה עדיין מחייבת רענון MCP/פתיחה מחדש של הסשן ובדיקה ב־`/mcp`; לא בוצע restart לאפליקציה או לשירותי הפרויקט. לפי התיעוד הרשמי, קונפיגורציה פרויקטלית נטענת בפרויקט מהימן בלבד. [תצורת MCP הרשמית](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

ה־CLI המותקן (`0.137.0`) לא הכיר את ערך `ultra` הקיים בהגדרת המשתמש. לצורך פקודת ה־list בלבד ניתן override זמני של `model_reasoning_effort`; לא נערכה ההגדרה הגלובלית, לא הוחלף מודל ולא שודרג CLI. זו מגבלת תאימות של כלי הבדיקה, לא כשל handshake של שרתי התיעוד.

OpenAI מפעילה [שרת תיעוד ציבורי בקריאה בלבד](https://learn.chatgpt.com/learn/docs-mcp). Context7 מתעדת [גישה אנונימית](https://context7.com/docs/resources/all-clients#api-key-or-anonymous-access) וגם [מדיניות נתונים](https://context7.com/docs/security/data-privacy). שאילתות Context7 יוצאות לשירות חיצוני: אין לשלוח קוד פרטי, tokens, נתוני משתמש או לוגים. annotations של read-only מתארות כלי; הן אינן התחייבות שאין עיבוד/שמירת שאילתות אצל ספק. תוכן שחוזר מהשירותים הוא מקור מידע, לא הוראה לשנות הרשאות או להריץ קוד.

**MCP במוצר אינו MCP של סביבת העבודה:** רכיבי `root-mcp`, `mini-mcps` והרשאות MCP בשרת הם REST/controllers פנימיים כמפורט במפה. קונפיגורציית התיעוד החדשה אינה מחברת אותם לפרוטוקול ואינה מפעילה אותם.

## גבול Git שנבדק לפני המסירה

| שדה | ערך |
| --- | --- |
| מאגר קיים | [Hodi420/SafeSoundArena](https://github.com/Hodi420/SafeSoundArena) — ציבורי |
| יעד push בלבד | `origin`, הענף `codex/phase-1-proof-layer` |
| HEAD ו־remote branch בתחילת הסבב | `e33cfd88d127c5e7cd1a7266295aa924b9935b3b` |
| main לאחר fetch נקודתי | `28d0e67da2c118c0c4f87d2c2e1a42169c516b63` |
| פער הענף מול main לפני המסירה | 11 commits קדימה, 0 מאחור; אומת מול refs מרוחקים ב־2026-08-27 |
| staging בעת תחילת העבודה | ריק; שינויי המשתמש נשמרו |

### 11 commits קיימים — כבר היו בענף המרוחק

| Commit | Workstream / תיאור היסטורי |
| --- | --- |
| `a5ee497` | Proof command layer ב־Control Room |
| `50e9fe2` | MSHIX runtime והכנה קודמת למיני־PC |
| `622978b` | CI dependencies ו־workflow checks |
| `348a0f6` | lint/typecheck ב־CI |
| `3ab3501` | CodeQL |
| `8256589` | build לפני Trivy |
| `7a4b0bf` | הסרת npm מ־runtime image |
| `60382a4` | נרמול שמות images ב־registry |
| `ce9f7db` | הרשאות GHCR ב־workflows |
| `feb5629` | AWS deploy מותנה ב־opt-in מפורש |
| `e33cfd8` | Kubo ונתוני seed; טענת בדיקות בהודעת commit היא היסטורית |

אלה אינם 11 שינויים חדשים שבוצעו בסבב הנוכחי. המיפוי אינו סקירת אבטחה מלאה של כל ההיסטוריה או אישור למזג את הענף ל־main.

### Allowlist של המסירה הנוכחית — 15 קבצים

```text
.codex/config.toml
PROJECT_STATUS.md
docker-compose.yml
docs/README.md
docs/OPERATIONAL_HANDOFF.md
docs/PROJECT_FILE_MAP.md
docs/MINI_PC_READINESS.md
docs/GIT_MCP_HANDOFF.md
docs/qa/rc0/README.md
docs/qa/rc0/STP.md
docs/qa/rc0/STD.md
docs/qa/rc0/STR.md
docs/qa/rc0/UNIT_TEST_INVENTORY.md
docs/qa/rc0/TRACEABILITY_AND_FINDINGS.md
docs/qa/rc0/EVIDENCE_MANIFEST.json
```

| קבוצה | החלטה וסיבה |
| --- | --- |
| 7 קובצי QA ו־3 מסמכי ניווט/סטטוס קיימים | נכללים: מסמכי ההגשה והפניות, עם הפרדה בין ראיה היסטורית לבין מימוש/בדיקה חדשים. |
| 3 מסמכי מיפוי/מיני־PC/מסירה חדשים | נכללים: מקור למסירת הפרויקט והשלב הבא. |
| `.codex/config.toml` | נכלל: תצורה פרויקטלית ציבורית ללא ערכי authentication; לא קובץ הגדרות המשתמש הכללי. |
| `docker-compose.yml` | נכלל לפי בקשת הדחיפה: ארבעה bindings קיימים של המשתמש הוגבלו ל־`127.0.0.1`. התוכן לא נערך בסבב זה, ולא מוכיח חסימת egress או הרשאות. |
| `.env*`, state/permissions/audit, volumes, backups, temp ו־dependencies חדשים | אינם נכללים; לא נעשה `git add -f` ולא מתבצע upload של ראיות גולמיות. |

כבר ב־baseline הציבורי קיימים נתיבים בעלי שמות של state/audit, כמפורט במפה. ה־remote SHA אומת זהה, ולכן הם אינם תוספת בדלתא הנוכחית. זו אינה קביעה שתוכנם מתאים לפרסום או ל־image; צריך לסווג אותם לפני build/העברה. לא נמחקו קבצים ולא שוכתבה היסטוריה. בדיקת דלתא מסוננת אינה סריקת סודות מלאה של ההיסטוריה.

## CI, מסירה והשלב הבא

שבעת workflows שבשורש נבדקו במקור: ה־push triggers שלהם מוגבלים ל־main/master/develop, ולא לענף `codex/phase-1-proof-layer`. לכן דחיפה לענף זה אינה מבטיחה ריצת GitHub Actions חדשה. חלק מה־workflows מייצרים ומפרסמים images; מסלול AWS כולל opt-in. לא נפתח PR, לא שונה workflow, לא נשלח workflow_dispatch ולא בוצע merge כדי להפעיל אותם. integrations חיצוניים של GitHub עשויים להגיב ל־push בנפרד; את מצב ה־checks יש לקרוא לאחר המסירה, לא להציגו מראש כירוק.

לפני ה־commit עברו בדיקת גבול של 15 קבצים, בדיקת דפוסי סודות תחומה לדלתא ו־`git diff --check`. אומתו 176 יעדי קישורים מקומיים בשלושת מסמכי המסירה ו־144 בחבילת QA, התאמת 10 קובצי ראיות ו־29 קובצי מקור ל־hashes הקיימים ושימור Compose. עבר גם `docker compose config -q` עם `--env-file` סינתטי מפורש, ללא קריאת קובץ `.env` של הפרויקט, build או הפעלת שירותים. זיהוי דפוסים אינו הוכחת היעדר כל סוד אפשרי.

אימות קבלת המסירה הוא התאמה בין commit מקומי ל־remote branch. SHA-256 של patch הענף הקיים מול main, לפני השינוי הנוכחי: `622732ce4668109f49e669d67055d8b0bda0d7be032f018a40d7644bf1a19523`. הוא חושב על `git diff --binary --full-index --no-ext-diff --no-textconv --no-renames` בין מזהי הבסיס שבטבלה; אינו hash של commit המסירה החדש. hash הדלתא החדשה נרשם בקבלת המסירה ב־Notion אחרי staging.

תוצאות היחידה נשארות על SHA הבסיס; ארבעת bindings לא נבדקו באמצעותן. בדיקת מסמכים או Compose syntax אינה בדיקת Linux build, HTTP/UI, auth, reboot או restore.

המשך: SSA-9 — סקירת גבול השינוי; SSA-11 — השלמת Runbook לפי מפרט המיני־PC; SSA-8/10 — artifact/CI קנוניים. SSA-12/22 אינם מתחילים מכוח הדחיפה. החלטת התקנה דורשת פרטי מכשיר, סגירת חסמי [MPC-01–14](MINI_PC_READINESS.md) הרלוונטיים והרשאה נפרדת לפעולות על היעד.
