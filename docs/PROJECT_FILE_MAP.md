# SafeSoundArena — מפת קבצים, הפעלה וגבולות מסירה

נערך ב־2026-08-27. Baseline SHA: `e33cfd88d127c5e7cd1a7266295aa924b9935b3b`, ענף `codex/phase-1-proof-layer`.

זהו מיפוי מקור בקריאה בלבד, שנערך לפני ה־commit המתוכנן. במסגרת תת־משימת המיפוי נוצר רק מסמך זה ולא הורצו בדיקות, שרתים, Docker או התקנות. לא נקראו `.env`, credentials או תוכן קובצי runtime. פעולות Git וחיבורי תיעוד שבוצעו בסבב המסירה הנפרד מתועדים ב־[Git/MCP Handoff](GIT_MCP_HANDOFF.md). אין כאן אישור CI, מוכנות למיני־PC או הוראת פריסה.

## 1. בסיס המדידה

הספירה נלקחה מ־`git ls-files`, לא מסריקת כל הדיסק. היא מייצגת קבצים במעקב בנקודת הפתיחה, לרבות קובצי legacy; אינה כוללת `node_modules`, outputs או קבצים מוחרגים. קבצים לא־במעקב אינם נכללים במספרים להלן.

| מדד | תוצאה בנקודת הפתיחה |
| --- | ---: |
| סך נתיבים במעקב | 614 |
| קבצים ישירות בשורש | 89 |
| תיקיות ברמה הראשונה המכילות קבצים במעקב | 25 |
| קובצי Markdown במעקב | 109 |
| `package.json` במעקב | 4 |
| npm workspaces שהוצהרו בשורש | 2 |
| `package-lock.json` במעקב | 5 |
| workflows תחת `.github/workflows` בשורש | 7 |
| קובצי QA חדשים שטרם היו במעקב | 7 — שישה Markdown ו־JSON אחד |

בנקודת המדידה היו שינויי תוכן מקומיים ב־`docker-compose.yml`, ב־`PROJECT_STATUS.md`, ב־`docs/OPERATIONAL_HANDOFF.md` וב־`docs/README.md`. שבעת קובצי `docs/qa/rc0` טרם היו במעקב; גם מסמך זה חדש ואינו נכלל ב־614. אלה נתוני baseline, לא טענה על מצב ה־index אחרי commit עתידי. הנתיבים במסמך יחסיים למיקום המסמך תחת `docs`, ומיועדים להישאר תקינים גם ב־checkout אחר.

## 2. נקודת ההפעלה הקנונית

נקודת האמת המוצהרת נמצאת ב־[Operational Input Spec](../OPERATIONAL_INPUT_SPEC.md#L6), והיא נתמכת ב־[package.json](../package.json), ב־[Compose הראשי](../docker-compose.yml) ובפקודת ה־[Dockerfile הראשי](../Dockerfile#L57). "קנוני" פירושו המסלול שנבחר בפרויקט; אין פירושו שהוא עבר כעת בדיקת מערכת.

```text
Browser
  └─ frontend/pages + רכיבים מ־frontend/src
       ├─ Next /api/[...path] ── BACKEND_URL ── backend/app.js
       │                                      ├─ backend/api: Feature Store
       │                                      ├─ src/server: governance/lifecycle
       │                                      ├─ src/server/mshix: core/outbox/Brain
       │                                      └─ MCP permissions + JailTime
       ├─ API handlers ספציפיים תחת frontend/pages/api
       └─ Socket.IO ── NEXT_PUBLIC_SOCKET_URL ── backend/app.js
```

| רכיב / מקור | מה הוא מפעיל או מחבר | גבול חשוב |
| --- | --- | --- |
| [package.json](../package.json) | `start` מפעיל `node backend/app.js`; `dev` עובר ל־Frontend | `start` אינו בדיקה טהורה: הוא טוען bootstrap בעל side effects. |
| [backend/app.js](../backend/app.js#L1) | Express, HTTP, Socket.IO, Feature API, governance ו־MSHIX | נטענים dotenv ו־state, מוגדרים replay/lease monitors, מופעל Jail scheduler ונפתח listener. אין לבצע `require` שלו לצורך "מיפוי בלבד". |
| [Feature routes](../backend/api/featureRoutes.js#L55) ו־[store](../backend/api/featureStore.js#L171) | events, marketplace, quests, guilds, notifications, challenges | אחסון JSON מקומי; זהות והרשאות עדיין נושאי QA פתוחים. |
| [AI governance](../src/server/aiAdminGovernance.js) | `/api/ai-admin`, lifecycle, safety, orchestration ואחסון מצב | [execution controller](../src/server/agentExecutionController.js) הוא גבול admission; אין להסיק שהפעלת workers חיצוניים כבר מחוברת. |
| [MSHIX router](../src/server/mshix/mshixRouter.js) ו־[Brain](../src/server/mshix/brainKernel.js) | `/api/mshix`, אירועים, outbox, זיכרון ו־provider boundary | `backend/app.js` יוצר Ollama provider; כיבוי auto-enrich אינו הוכחה שאין כל קריאת provider. |
| [MCP permissions](../backend/mcp-permissions.js#L26) | store להרשאות ו־REST endpoints ב־backend | זה אינו חיבור MCP של כלי העבודה. הנתונים נשמרים ליד קוד backend, לא תחת `SAFESOUND_DATA_DIR`. |
| [frontend/pages](../frontend/pages) | עמודי Next הפעילים, למשל [dashboard](../frontend/pages/dashboard.tsx#L1) ו־[mshix](../frontend/pages/mshix.tsx) | ה־dashboard מייבא רכיבים מ־`frontend/src`; לכן `src` אינו כולו legacy. |
| [Next proxy](../frontend/pages/api/%5B...path%5D.ts#L41) | העברת בקשות `/api` כלליות ל־`BACKEND_URL` | קיימים handlers ספציפיים, למשל [pi-auth](../frontend/pages/api/pi-auth.ts), שאינם רק מעבר ב־catch-all. פערי headers/body מתועדים בקוד וב־QA. |
| [client](../frontend/src/client.ts) ו־[endpoints](../frontend/src/endpoints.ts) | חוזה הבקשות של רכיבי הממשק | שינוי API דורש התאמה בשני הצדדים; כותרת משתמש אינה תחליף לאימות זהות. |

### Compose ותלויות רשת

ב־[docker-compose.yml](../docker-compose.yml) מוגדרים שלושה שירותים: `api-server`, `frontend`, `ipfs`. בנקודת המדידה ארבע חשיפות ה־host הן loopback: API ב־4000, Frontend ב־3000 ו־Kubo ב־5001/8080. `frontend` תלוי ב־health של `api-server`; ה־API משתמש ב־volume בשם `feature_data` ב־`/app/data`, ו־IPFS ב־`ipfs_data` ב־`/data/ipfs`.

IPFS הוא שירות נפרד באותו Compose, אך ששת מסלולי Feature API ו־proxy הדפדפן שנבדקו במקור אינם קוראים לו ישירות. אין מכך אישור להסיר אותו ללא החלטת scope. Loopback של פורטים אינו מצב offline/private של Kubo ואינו חסימת יציאה של האפליקציה. השירות משתמש ב־`ipfs/kubo:latest`, לא ב־digest מקובע.

Ollama אינו שירות ב־Compose הקנוני; `OLLAMA_BASE_URL` מפנה כברירת מחדל ל־host. אין להניח ש־`host.docker.internal` או כתובות `localhost` יעבדו באותה משמעות אחרי מעבר ל־Linux או לדפדפן במחשב אחר. יש לקבוע חוזה רשת חדש לפני המעבר, לא לפתוח `0.0.0.0` כדי לעקוף בעיית כתובת.

## 3. מפת התיקיות במעקב

המספרים כוללים את כל הצאצאים במעקב; אין לחבר שוב תתי־תיקיות למספר של ההורה.

| תיקייה / קבצים | כמות | תפקיד ומעמד |
| --- | ---: | --- |
| [frontend](../frontend) | 224 | ה־Frontend הקנוני. `src` מכיל 153 קבצים, ו־`pages` בשורש ה־Frontend מכיל 19. יש גם `components`, styles/config ומבחנים. |
| קבצים בשורש | 89 | manifests, Docker/Compose, מדריכים, utilities ו־entrypoints חלופיים; גם שמות קבצי נתונים הדורשים סיווג לפני מסירה. |
| [backend](../backend) | 82 | bootstrap קנוני, Feature API ומודולי Jail/proof/scrolls/boards; כולל גם `backend_tmp` של 60 קבצים. |
| [server](../server) | 38 | שרתי REST/agents ישנים, Mongo models, queue ו־utilities; חריג חשוב: `server/pqs` מכיל מודולי PQS שנבדקו ביחידה. |
| [next-app](../next-app) | 32 | יישום Next נפרד, לא workspace ולא ה־Frontend של Compose הקנוני; עדיין מופיע ב־CI המקומי המוגדר. |
| [.github](../.github) | 25 | שבעה workflows, 16 קובצי ISSUE_TEMPLATE ושני קבצים נוספים. הגדרות pipeline אינן תוצאות CI. |
| [devops](../devops) | 21 | Docker/Compose/Kubernetes ותיעוד חלופיים; לא runbook מאומת למיני־PC. |
| [test](../test) | 17 | בדיקות backend/lifecycle/MSHIX/bots/Jail/PQS וגם כלי standalone; root Mocha בוחר `test/**/*.js`. |
| [src](../src) | 16 | 15 קבצים ב־`src/server` וקובץ UI אחד; ספריות ממשל, lifecycle, persistence ו־MSHIX המשמשות backend. |
| [aiClients](../aiClients) | 14 | adapters ו־bots לספקי AI, כולל קוד עם אפשרות תקשורת חיצונית; לא כולם מחוברים ל־runtime הקנוני. |
| [examples](../examples) | 11 | דוגמאות Express/Next ונתוני דוגמה; אין להסיק שהן חלק מהמוצר הפעיל. |
| [blockchain](../blockchain) | 9 | Arena Credit, proofs ו־מסמכי תכנון; אין הוכחה לאינטגרציה רשמית או לתשלום פעיל. |
| [docs](.) — baseline במעקב | 6 | מפרטי Control Room/MSHIX, handoff, vision, dependencies ואינדקס. חבילת QA החדשה ומסמך זה אינם נכללים בספירה זו. |
| [k8s](../k8s) | 5 | manifests חלופיים; נפרדים מעץ `devops/k8s`. |
| [public](../public) | 5 | assets/עמודי HTML ברמת השורש; לא זהה ל־`frontend/public`. |
| [ai](../ai) | 4 | מודולי AI/זיכרון ישנים; `memory-context.json` דורש סיווג נתונים. |
| [lobbies](../lobbies) | 3 | קובצי JSON של registry/לוחות; יש להבחין בין fixture לבין נתוני משתמש. |
| [scripts](../scripts) | 2 | runtime validation ו־JailTime smoke ב־PowerShell; שניהם דורשים בדיקת תנאי הפעלה לפני שימוש. |
| [static](../static) | 2 | assets סטטיים נוספים. |
| [agents](../agents) | 2 | קוד/config של agent; אינו הוכחה להפעלת worker קנוני. |
| [utils](../utils) | 2 | utilities משותפים/ישנים לפי imports. |
| [root-mcp](../root-mcp) | 1 | stub של REST Root MCP; מפנה ל־config שאינו נמצא באותה תיקייה. |
| [mini-mcps](../mini-mcps) | 1 | stub של REST Mini MCP עם placeholders; לא שרת connector מוכן. |
| [tests](../tests) | 1 | notification suite עם גישה ל־DB ו־teardown מסוכן; נפרד מ־`test`. |
| [templates](../templates) | 1 | JSON template; אינו runtime שהופעל במיפוי. |
| [monitoring](../monitoring) | 1 | Prometheus configuration; לא ראיה לניטור פעיל. |

### מה לא לערבב עם המסלול הקנוני

- [server.js בשורש](../server.js), [backend/index.js](../backend/index.js) ו־[backend/server.js](../backend/server.js) הם נקודות כניסה חלופיות. שינוי בהן אינו שינוי אוטומטי ב־`backend/app.js`.
- [backend/backend_tmp](../backend/backend_tmp) הוא עץ כפול במעקב: server/web/AI/blockchain ו־lockfile, ללא `package.json` משלו במעקב. אין למחוק או לאחד אותו מכוח המפה; יש להחליט archive/keep/remove במשימת scope נפרדת.
- [frontend/src/pages](../frontend/src/pages) קיים לצד `frontend/pages`, אך אינו עץ העמודים הקנוני שנבחר בפרויקט. אין להסיק שעמוד שם, למשל מסך Jail, נגיש דרך ה־runtime שנמסר. רכיבים ושירותים אחרים תחת `frontend/src` כן מיובאים בעמודים הפעילים.
- [src/server/index.cjs](../src/server/index.cjs#L25) הוא bootstrap נפרד ל־Control Room על פורט ברירת מחדל 4317; הוא אינו נבחר ב־Compose הראשי.
- [PQS](../server/pqs/README.md) נבדק כסימולציה, proof ו־anti-abuse. ה־connector בשם `pqs` בתוך [backend/app.js](../backend/app.js#L156) הוא observer לאירועים; הוא אינו mount של gameplay HTTP או adapter רשמי פעיל.
- `docker-compose.final.yml`, `docker-compose.prod.yml`, `docker-compose.prod.ollama.yml`, יתר וריאציות Compose ו־Kubernetes הם חלופות/legacy לפי [Operational Handoff](OPERATIONAL_HANDOFF.md). לא נבדקו כעת ולא נבחרו למיני־PC.

## 4. Packages, dependencies ו־workspaces

| Manifest | מעמד ו־runtime שהוצהר | scripts חשובים / תלויות מרכזיות |
| --- | --- | --- |
| [root](../package.json) | monorepo פרטי; Node `24.x`; workspaces: `backend`, `frontend` | `start`, `dev`, Mocha `test`; `lint` כולל `--fix` ולכן משנה קבצים. Express/Socket.IO/Mongoose/JWT; Mocha 11.3.0 ו־Sinon לפיתוח. |
| [backend](../backend/package.json) | workspace, Node `24.x`, main=`app.js` | start/dev של app.js; script בשם `test` הוא placeholder שנכשל. Express, Socket.IO, HTTP/security utilities. |
| [frontend](../frontend/package.json) | workspace פרטי, Node `24.x` | Next `16.3.1`, React `^18.3.1`; Jest, `typecheck`, build/start/lint. React Query, Zustand, Socket.IO client ורכיבי UI. |
| [next-app](../next-app/package.json) | יישום נפרד, Node `24.x`, מחוץ ל־workspaces | Next `16.3.1`, NextAuth, React/ReactDOM שהוגדרו `latest`; dev/build/start. לא נבחר כתחליף ל־Frontend הראשי. |

[.nvmrc](../.nvmrc) מציין 24. אלה דרישות manifests, לא בדיקת גרסת Node המותקנת כרגע ולא חיווי שההתקנות תקינות. קיימים lockfiles בשורש, ב־backend, ב־frontend, ב־next-app וב־backend/backend_tmp. יש לבחור במפורש את עץ ההתקנה/ה־lockfile הרלוונטי; אין להעתיק `node_modules` מ־Windows למיני־PC או לחדש lockfiles אוטומטית במסגרת מסירה.

[Dockerfile הראשי](../Dockerfile#L4) ו־[Frontend Dockerfile](../frontend/Dockerfile#L4) מבוססים על Node 24 Alpine. build חדש עשוי להתקין חבילות, ליצור outputs ולפנות לרשת; הוא לא בוצע במיפוי. בשניהם יש `COPY . .`, ולכן נדרשת בדיקת context/layers לפני build למסירה. [next.config.js](../frontend/next.config.js#L14) מאפשר `ignoreBuildErrors`; build מוצלח לבדו אינו תחליף ל־typecheck מפורש.

## 5. בדיקות וראיות QA

| אזור | מה קיים | מה אפשר להסיק |
| --- | --- | --- |
| [root test command](../package.json) | `mocha --exit "test/**/*.js" "backend/**/*.test.js"` | זו בחירה רחבה יותר מה־allowlist של RC-0; יש לבדוק imports, listeners, נתיבי state ו־teardown לפני הפעלה. |
| [frontend tests](../frontend/tests) ו־[MainBanner test](../frontend/src/components/MainBanner.test.tsx) | שלושה קובצי בדיקה; [Jest config](../frontend/jest.config.js) כולל jsdom וכתיבת coverage | לא הורצו מחדש; אין טענה לכיסוי או להצלחה נוכחית. |
| [root Jest config](../jest.config.js) | configuration נוסף ל־Frontend | אינו script הבדיקה הראשי ב־root package. אין להניח שכל config נבחר באותה הרצה. |
| [notification test](../tests/notification.test.js) | suite נפרד עם DB ו־`dropDatabase()` ב־teardown | לא נכלל ב־G1; אין להריצו נגד נתוני אמת. |
| [test_aiClients.js](../test_aiClients.js) ו־[Arena Credit test](../blockchain/test_arenaCreditService.js) | קובצי בדיקה/דמו מחוץ ל־root Mocha glob; יש גם עותק ב־backend_tmp | שמותיהם אינם הוכחה לבידוד; providers חיצוניים וכתיבות דורשים סקירה. |
| [חבילת QA RC-0](qa/rc0/README.md) | STP, STD, STR, מלאי UT, RTM/OBS ו־evidence manifest | תיעוד רטרוספקטיבי ותרחישי המשך; אינו אישור release. |

בסריקה נמצאו 22 נתיבי בדיקה לפי תיקיות `test`/`tests` או סיומת `.test`/`.spec`: 17 תחת `test`, שלושה ב־frontend, אחד ב־backend ואחד תחת `tests`. זוהי ספירת קבצים לפי שמות, לא מספר מקרי בדיקה ולא רשימה ממצה של כל כלי דמו/בדיקה ידנית.

הראיה הקיימת היא [46/46 מקרי יחידה ואחסון](qa/rc0/UNIT_TEST_INVENTORY.md) מתוך עשרה קבצים, בריצה `rc0-20260827-01` על ה־SHA שבכותרת. 12 משפחות SYS/REL נשארות NOT_RUN. raw evidence נשמר תחת `temp/rc0-20260827-01`, המוחרג מ־Git; [EVIDENCE_MANIFEST](qa/rc0/EVIDENCE_MANIFEST.json) מזהה את הקבצים אבל אינו מעלה אותם למערכת מרוחקת. לא מוסיפים תוצאות היסטוריות למונה 46 ולא מכנים אותו coverage של המוצר.

## 6. Scripts, CI ותיעוד תפעולי

| מקור | תפקיד | למה נדרשת זהירות |
| --- | --- | --- |
| [validate-runtime-config.ps1](../scripts/validate-runtime-config.ps1) | קורא env ובודק שדות, Node ו־Docker לפי switches | אינו read-only מבחינת גישה לסודות. מצב Production שלו דוחה localhost; אין לשנות חשיפה כדי להשביע validator שאינו מותאם ל־RC מקומי. |
| [qa-jailtime-smoke.ps1](../scripts/qa-jailtime-smoke.ps1) | יוצר temp, מפעיל backend ועושה HTTP mutations; enrichment אופציונלי | אינו harness הבידוד של G1. הוא רץ מתוך repo ועלול לטעון env/default state; לא הורץ כאן. |
| [local-dev.js](../local-dev.js), [setup-wizard.js](../setup-wizard.js), [pioneer-cli.js](../pioneer-cli.js) | התקנה/setup, env, DB והפעלת שירותים | אלה entrypoints עם side effects, לא פקודות מיפוי. |
| [ollama-quickstart.js](../ollama-quickstart.js) | מכין env, מפעיל שירותים ומוריד מודל | משתמש במסלול Compose אחר; אין להפעילו כחלק מ־checkout. |
| [deploy-production.js](../deploy-production.js), [health-monitor.js](../health-monitor.js) | כלי פריסה/ניטור של מסלול Compose חלופי | אינם runbook מאומת; יכולים לבנות/להפעיל שירותים ולפנות למודלים. |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | Node 24: root tests, frontend tests/typecheck/build, וגם next-app typecheck/build | הגדרת checks בלבד; remote results לא נבדקו במיפוי. |
| [main.yml](../.github/workflows/main.yml) ו־[backend-cd.yml](../.github/workflows/backend-cd.yml) | build/push של images; main.yml כולל גם מסלול AWS/Kubernetes מותנה | לפני push יש לבדוק branch/trigger/permissions. קבלת שינוי Git אינה אישור חדש להפעלת deploy, ושדות `ENABLE_AWS_DEPLOY`/secrets מרוחקים לא נבדקו כאן. |
| [frontend/.github/workflows/ci.yml](../frontend/.github/workflows/ci.yml#L31) | workflow נוסף בתוך עץ Frontend עם Node 18 | נפרד משבעת workflows שבשורש וסותר את דרישת Node 24 אם בוחרים להשתמש בו; אין להחשיבו CI קנוני מאומת. |

סדר קריאה מומלץ: [PROJECT_STATUS](../PROJECT_STATUS.md) → [QA index](qa/rc0/README.md) → [Operational Input Spec](../OPERATIONAL_INPUT_SPEC.md) → [Operational Handoff](OPERATIONAL_HANDOFF.md) → [MSHIX spec](MSHIX_CORE_SPEC.md) ו־[Control Room](AI_ADMIN_CONTROL_ROOM.md). ה־[README](../README.md), [ROADMAP](../ROADMAP.md), מסמכי Production/Ollama ו־[devops](../devops/README.md) מכילים גם שכבות היסטוריות. יש להצליב אותן עם ה־baseline וה־QA; כותרת "complete" או "production" אינה תוצאת בדיקה.

## 7. נתונים וסודות — לא לדחוף "הכול" ללא סיווג

| סוג | מיקום/מקור מזוהה | מדיניות מסירה |
| --- | --- | --- |
| environment ו־credentials | `.env*`, קובצי secrets, tokens, SSH keys | מחוץ ל־Git וללוגים; לבנות configuration מורשה ביעד. לא נקראו הערכים במיפוי. |
| canonical state/audit | `SAFESOUND_DATA_DIR`, ובברירת מחדל `backend/api/data`; ב־Compose `/app/data` | Feature state, governance state, audit, outbox, Brain ו־Jail logs הם נתונים, לא קוד. גיבוי/העברה הם פעולה נפרדת ומורשית. |
| MCP permissions | `backend/mcp-permissions.json` לפי [הקוד](../backend/mcp-permissions.js#L26) | מוחרג ב־gitignore; אינו עובר אוטומטית ל־volume הקנוני. לתכנן persistence/backup במפורש. |
| standalone governance | ברירות מחדל של audit/runtime state תחת `process.cwd()` לפי [governance](../src/server/aiAdminGovernance.js#L26) | עבודה מתוך root עלולה ליצור נתונים בשורש; בדיקת ignore אינה רק בדיקת תיקיית data. |
| IPFS | volume `ipfs_data`, נתיב `/data/ipfs` | אין לצרף volume, peer identity או תוכן IPFS ל־Git. |
| RC-0 evidence | `temp/rc0-20260827-01` | נשאר מקומי/מוחרג. מסירה מרוחקת רק עם allowlist, redaction וערוץ מורשה. |
| dependencies/build/cache | `node_modules`, `.next`, build/dist, coverage, cache, `*.tsbuildinfo` | לא להעביר בין מכונות כתחליף להתקנה/build מזוהים. |
| backups/uploads/exports | למשל פלט [server/backup.ps1](../server/backup.ps1), `public/themes`, snapshots ו־DB dumps | נתוני משתמש/תפעול, מחוץ לחבילת הקוד; אין איסוף או העלאה אוטומטיים. |

חשוב במיוחד: `.gitignore` אינו מסיר קובץ שכבר נמצא במעקב או בהיסטוריית Git. ב־baseline נמצאו **שמות נתיבים במעקב** כגון `ai-admin-audit-log.jsonl`, `profiles.json`, `votes.json`, `admin_levels.json`, `themes.json`, `server/user-memories.json`, `ai/memory-context.json` ועותקו ב־backend_tmp. גם JSON תחת `lobbies` ו־`frontend/src/features/map` ומסמך בשם `devops/k8s/base/secrets.yaml` דורשים סיווג לפי התוכן והבעלות. תוכנם לא נקרא; אין כאן קביעה שכל אחד מכיל סוד או נתון אמת.

לגבי חלק מהנתיבים יש גם מקור שמראה כתיבה: [dashboard.js](../dashboard.js#L136) כותב votes/profiles/themes, ו־[server/userMemory.js](../server/userMemory.js) כותב user memories. לכן לפני הכללת קובצי נתונים חדשים יש לבצע החלטת fixture/config/runtime וסקירת פרטיות, ולא להסתמך על שם JSON או על ignore. שינוי tracking, החלפת fixtures או טיפול בהיסטוריה ייעשו בנפרד לפי הרשאה; מסמך זה לא מחק ולא שינה אותם.

אימות Git נפרד בסבב זה מצא שה־baseline SHA שבכותרת כבר קיים בענף המרוחק, ולכן 614 הקבצים הללו אינם תוספות חדשות לדלתא של מסמכי הסבב. זו הבחנה בגבול השינוי, לא אישור פרטיות לתוכן ההיסטורי. אין לכלול עותקי runtime או גיבויים חדשים רק משום שקובץ בעל שם דומה כבר נמצא במעקב.

מקורות ההחרגה הקיימים הם [.gitignore](../.gitignore) ו־[frontend/.gitignore](../frontend/.gitignore). Git ignore ו־Docker ignore הם מנגנונים שונים: [ממצא OBS-07](qa/rc0/TRACEABILITY_AND_FINDINGS.md#L86) מסביר מדוע יש לבדוק גם build context ו־image layers, ולא להעתיק image מקומי קיים כ־artifact מסונן.

## 8. MCP בפרויקט לעומת חיבורי כלי העבודה

השם MCP מופיע כאן בשני הקשרים שאסור לחבר אוטומטית:

| הקשר | מה זוהה | מה לא הוכח |
| --- | --- | --- |
| MCP פנימי בפרויקט | [permissions API](../backend/MCP_PERMISSIONS_API.md), [server/mcp.js](../server/mcp.js), [server/rootMcp.js](../server/rootMcp.js), [server/miniMcp.js](../server/miniMcp.js), config ו־stubs | אלה REST/controller/agent modules. בחיפוש בקוד השרת הרלוונטי ובארבעת manifests לא נמצאו SDK/transport או הודעות `tools/list` של Model Context Protocol. אין בכך שרת connector מוכן לחיבור. |
| Codex connectors / Model Context Protocol | חיבורי כלי העבודה לחשבונות ושירותים, למשל מקור מסמכים או repository host | מצב החיבורים וההרשאות אינו נלמד משמות `mcp-*.yaml` במאגר. הוא נבדק בנפרד בכלי החיבור, לא ב־runtime של המשחק. |

[root-mcp/rootMcp.js](../root-mcp/rootMcp.js#L1) דורש `root-mcp/mcp-config.json`, ו־[mini-mcps/miniMcp.js](../mini-mcps/miniMcp.js#L1) דורש `mini-mcps/mini-mcp-config.json`; שני היעדים לא נמצאו באותן תיקיות. קובצי config בעלי שם דומה תחת `server` אינם מתקנים relative import אוטומטית. ה־Mini stub מכיל placeholders ואינו בסיס להפעלה מאומתת. שרתי REST אחרים תחת `server` פותחים listeners ועשויים להתחבר ל־Mongo/HTTP; אין להפעילם כדי "לחבר MCP".

יכולות מועילות לשלב הבא, בכפוף לבדיקה וחיבור נפרדים:

- מקור מסמכים ומשימות: סנכרון מפת הקבצים, QA והחלטות scope עם Notion, בלי להעלות נתוני runtime.
- repository host: קריאת branches, PRs ו־CI לפי SHA ו־run URL. חיבור כזה אינו נותן אישור אוטומטי ל־merge/deploy או לשינוי branch protection.
- גישה למיני־PC: רק לאחר זיהוי host/מערכת/משתמש, אימות host key, בחירת transport והרשאות מצומצמות; להתחיל במיפוי read-only. אין כרגע במסמך פרטי יעד או connection מאומת.
- אין צורך לחשוף filesystem רחב, Docker socket או DB אמיתי כדי לקבל מפת פרויקט. כל חיבור נוסף צריך תפקיד מוגדר והרשאות מינימליות, לא אוסף connectors שלא הוגדר שימושם.

לא נוצר או חובר connector במסגרת תת־משימת המיפוי. בסבב המסירה נוספה בנפרד [.codex/config.toml](../.codex/config.toml) עם שני MCP של תיעוד; [מצב החיבורים שנבדק](GIT_MCP_HANDOFF.md) הוא המקור לעדכון זה, ואינו משנה את נתוני ה־baseline של 614 קבצים.

## 9. מה המפה מוסרת לקראת Mini PC — ומה עדיין פתוח

המפה מספקת גבול קוד ומקורות להמשך. [MINI_PC_READINESS](MINI_PC_READINESS.md) מרכז את ההיערכות ליעד. מעבר למיני־PC נותר שלב נפרד: לזהות OS וארכיטקטורה, משאבים ודיסק; לבחור commit/artifact; לסווג legacy ונתונים; לבנות env ביעד; לקבוע רשת/כתובות/חסימת יציאה; לבדוק volumes וגיבוי/restore; ולהשלים בדיקות מערכת על סביבה מבודדת.

אין להעביר את כל תיקיית העבודה, תלות שהותקנה ב־Windows, `.env` קיים או image עם שכבות לא מסוננות. CPU/RAM נדרשים למודל אמיתי, DNS/TLS וחשיפה מרחוק אינם מוכרעים על ידי ספירת הקבצים. גם Node 24, loopback ו־46 בדיקות יחידה שעברו אינם יחד אישור מוכנות. תנאי הכניסה וההסמכה נשארים ב־[STP](qa/rc0/STP.md), והפערים ב־[RTM/Findings](qa/rc0/TRACEABILITY_AND_FINDINGS.md).
