# SafeSoundArena — בדיקת מוכנות למיני־PC

תאריך סקירה: 2026-08-27 · עדכון הכנה: 2026-08-30 · סוג ראיה: קריאת מקור ותצורה בלבד · החלטה: **NOT_READY_FOR_DEPLOYMENT**.

יש בפרויקט מסלול Linux containers שניתן להכין למיני־PC, אבל אין כרגע בסיס להבטיח "ללא בעיות" על המכשיר. חומרה, מערכת הפעלה ויעד גישה לא נמסרו; לא בוצעו build, התקנה, SSH, הפעלת שירותים או בדיקות על מיני־PC. קיימים גם חסמי אריזה, בידוד, תפקוד ועמידות מפורטים להלן.

### עדכון הכנה מ־2026-08-30

הסקר המקורי להלן נשמר כראיית מצב היסטורית. מאז נוספה שכבת minipc, קובץ
minipc.env.example, סקריפט scripts/minipc-preflight.sh ו־Runbook ל־Ubuntu.
הם מחריגים IPFS מה־baseline, מונעים build/pull על היעד, כוללים רשת internal,
loopback, restart/log/resource limits, health סמנטי, identity של image ו־Linux
runbook. הם **לא** משנים את החלטת NOT_READY_FOR_DEPLOYMENT: חומרת היעד,
גרסאות Ubuntu/Docker, גישת SSH, image בפועל, בדיקות target, auth, state
coverage, backup/restore וקבלת מערכת עדיין חסרים.

## בסיס הסקירה והיקף

- מקור הקוד בעת הבדיקה: `e33cfd88d127c5e7cd1a7266295aa924b9935b3b`, ענף `codex/phase-1-proof-layer`, יחד עם שינויי loopback הקיימים של המשתמש ב־Compose. זהו מזהה בסיס הסקירה, לא מזהה commit עתידי של המסמך.
- המסלול הקנוני: [Dockerfile בשורש](../Dockerfile#L57) → `backend/app.js`; [Frontend Dockerfile](../frontend/Dockerfile#L40) → Next מתוך `frontend`; [docker-compose.yml](../docker-compose.yml) הוא תצורת הבסיס. `next-app`, `backend/backend_tmp`, קובצי Compose החלופיים ו־Kubernetes אינם יעד ההעברה הנוכחי.
- ההצעה היא single-node פרטי, ללא מודל AI, ללא Pi/blockchain/providers חיצוניים וללא משתמשי אמת. IPFS אינו נדרש להצעת הבסיס; יש למנוע את הפעלתו באופן מפורש בתצורת היעד שתאושר, משום שהוא קיים ב־Compose ללא profile.
- נקראו Dockerfiles, Compose, manifests/lockfiles, נתיבי אחסון ורשת, סקריפטי PowerShell, CI ומסמכי [Operational Handoff](OPERATIONAL_HANDOFF.md) ו־[RC-0 QA](qa/rc0/README.md). לא נקראו ערכי `.env`, permissions, audit או נתוני runtime קיימים.
- שום ממצא במסמך אינו טענה לכשל ששוחזר בהרצה חדשה. ה־46/46 ב־[STR](qa/rc0/STR.md) הן בדיקות יחידה/אחסון נבחרות מההרצה המזוהה; הן אינן HTTP/UI, build, CI, מבחן משאבים או אישור פריסה.

## מה אומת סטטית

| נושא | מצב | ראיית מקור ומשמעות מוגבלת |
| --- | --- | --- |
| Node ו־Linux containers | `VERIFIED_STATIC` | root/backend/frontend מגדירים Node `24.x`; ה־Dockerfiles הקנוניים משתמשים ב־`node:24-alpine`. [Root manifest](../package.json#L16), [API image](../Dockerfile#L4), [Web image](../frontend/Dockerfile#L4). לא אומתו זמינות registry או build של tag זה על המכשיר. |
| נתיבי container ניידים | `VERIFIED_STATIC` | Compose משתמש ב־`/app/data` וב־named volume, ללא bind mount ל־`C:`/`D:`. [Compose](../docker-compose.yml#L14), [volume](../docker-compose.yml#L49). אין צורך לשחזר במיני־PC את נתיב OneDrive של עמדת העבודה. |
| הרצה לא־שורש | `VERIFIED_STATIC` | ה־API יוצר `/app/data` בבעלות `nodejs` ומשתמש ב־`tini`; ה־Frontend רץ כ־`appuser`. [API](../Dockerfile#L35), [Frontend](../frontend/Dockerfile#L24). הרשאות volume חדש/משוחזר עדיין טעונות בדיקה על היעד; אין לפתור בעיה באמצעות `chmod 777` או root. |
| הפרדת רשת בסיסית | `VERIFIED_STATIC` | פורטי `3000`, `4000`, `5001`, `8080` מפורסמים ל־`127.0.0.1` בלבד; Next מפנה אל `http://api-server:4000`. [Compose](../docker-compose.yml#L7), [Web configuration](../docker-compose.yml#L65). זו הגדרת bind, לא הוכחת חסימת יציאה או בדיקת נגישות בפועל. |
| מועמדי native ל־Linux | `VERIFIED_STATIC` | root ו־frontend lockfiles כוללים SWC ו־Sharp עבור Linux-musl ב־x64 וב־arm64. [SWC arm64](../frontend/package-lock.json#L3975), [SWC x64](../frontend/package-lock.json#L4013), [Sharp arm64](../frontend/package-lock.json#L3033), [Sharp x64](../frontend/package-lock.json#L3058). אלו metadata של optional dependencies, לא אישור תמיכה מלא. |
| סיומות שורה של קובצי ההפעלה שנבדקו | `VERIFIED_STATIC` | בבדיקת bytes היו LF בלבד ב־root Dockerfile, `frontend/Dockerfile`, root Compose ושני קובצי `scripts/*.ps1`. לא נמצאו `.sh` או `.gitattributes` במעקב בעת הסקירה. לא הורץ סקריפט על Linux. |

## מטריצת פערים ושערים

`NOT_TESTED` = חסרה ראיית ביצוע/יעד; `BLOCKER` = אין לעבור את השער המוגדר לפני טיפול ואימות. חסם מותנה מציין במפורש את ההיקף שבו הוא חל. `VERIFIED_STATIC` אינו PASS של מערכת.

| מזהה | נושא ומצב | עובדה / סיכון מוסק | תנאי סגירה |
| --- | --- | --- | --- |
| MPC-01 | חומרה וארכיטקטורה — `NOT_TESTED` | CPU/architecture, RAM, דיסק פנוי, OS וגרסאות Docker של המיני־PC אינם ידועים. `bcrypt` כולל install script, ויש תלויות native ב־Next. [bcrypt lock](../package-lock.json#L6762). image מקומי ל־amd64 אינו הוכחה ל־arm64. | מפרט יעד מזוהה; build והפעלה של אותו artifact על architecture היעד, לרבות טעינת native modules. לא להעתיק `node_modules` או `.next` מ־Windows. |
| MPC-02 | נקיון build context — `BLOCKER` לפני image למסירה | שני Dockerfiles משתמשים ב־`COPY . .`. root ignore אינו מחריג את כל `.env*`/state; frontend ignore מכיל ארבע שורות בלבד. [Root COPY](../Dockerfile#L19), [root ignore](../.dockerignore#L13), [frontend COPY](../frontend/Dockerfile#L13), [frontend ignore](../frontend/.dockerignore). זהו סיכון הכללת נתונים, לא טענה שנמצא secret מסוים ב־image. | מקור/תלויות ב־allowlist, כיסוי secrets ו־runtime ב־context, סקירת layers ללא חשיפת ערכים, והוכחה שה־image אינו מכיל נתוני עמדת העבודה. קשור ל־QA OBS-07 ול־SSA-1/8/9/21. |
| MPC-03 | יציאה חיצונית — `BLOCKER` להיקף פרטי ללא integrations | ה־bridge אינו `internal`; IPFS נכלל ללא profile. `/api/pi-auth` יכול לפנות ל־Pi, ו־Brain `search` יכול להזמין `provider.embed` גם כאשר `autoEnrich=false`. [Compose](../docker-compose.yml#L76), [Pi](../frontend/pages/api/pi-auth.ts#L8), [search](../src/server/mshix/brainKernel.js#L213). לעומת זאת `getHealth` כן מכבד auto-enrich כבוי. | הפרדה טכנית של egress, exclusion מפורש של IPFS, בדיקת מסלולי ספקים/telemetry/fallback מול sink מבודד בלבד. אין להסתפק בדגלי AI או loopback. קשור ל־OBS-06/07, SYS-08. |
| MPC-04 | גישה למיני־PC — `NOT_TESTED` | loopback מונע מסלול LAN רגיל בתצורה המיועדת. `localhost` בדפדפן של מחשב אחר מציין את אותו מחשב, לא את המיני־PC. [Bindings](../docker-compose.yml#L65). | בחירה בין שימוש מקומי/SSH tunnel לבין reverse proxy מאומת; origins ו־IPv4/IPv6 ידועים. לא להרחיב ל־`0.0.0.0` כפתרון אוטומטי, ולא לפרסם את API של IPFS. |
| MPC-05 | כתובת Socket ו־Next build — `BLOCKER` אם Realtime מרוחק נכלל | `NEXT_PUBLIC_SOCKET_URL` מוגדר ב־Compose כ־runtime env בלבד; ב־Frontend Dockerfile אין build argument עבורו. צרכן socket נופל ל־`http://localhost:4000`. [Compose](../docker-compose.yml#L69), [Docker build](../frontend/Dockerfile#L10), [hook](../frontend/src/hooks/useJailTime.ts#L11). CSP מגדיר `default-src 'self'`. [CSP](../frontend/next.config.js#L22). | לבחור origin ונתיב WebSocket, לסגור build-time configuration או מנגנון runtime מפורש, ולבדוק handshake/reconnect/CSP מדפדפן במחשב אחר. שינוי `.env` בעת `next start` אינו לבדו תיקון. אין כאן טענה שה־hook נכלל בכל route פעיל. |
| MPC-06 | Auth ותפקוד proxy/UI — `BLOCKER` לפני קבלת RC/חשיפה ללקוח לא מהימן | קיימים פערי זהות והרשאה ב־Feature API וב־MCP permissions; proxy מעביר Authorization ו־Content-Type בלבד; מסך MSHIX ו־Socket.IO דורשים סגירת חוזה זהות. [Feature identity](../backend/api/featureRoutes.js#L10), [MCP routes](../backend/app.js#L256), [proxy](../frontend/pages/api/%5B...path%5D.ts#L46). העברה לחומרה אחרת אינה סוגרת אותם. | הכרעת Auth ומבחני allow/deny/ownership, כולל UI דרך proxy. אין להשתמש ב־admin token גלובלי בדפדפן או להסיר בדיקות כדי לעבור. מקור הממצאים: [OBS-01–05](qa/rc0/TRACEABILITY_AND_FINDINGS.md). |
| MPC-07 | עמידות state — `BLOCKER` אם נדרש שימור הרשאות/מצב לאחר החלפה | permissions נשמרים ב־`/app/backend/mcp-permissions.json`, מחוץ ל־`feature_data:/app/data`; Jail ומשתתפיו מוחזקים בזיכרון. [Permissions](../backend/mcp-permissions.js#L26), [Jail state](../backend/app.js#L37), [volume](../docker-compose.yml#L49). Feature Store ו־Outbox אינם transaction משותף. | חוזה state ונתוני שימור מפורש, אחסון persistent לכל store שנכלל, ובדיקות recreate/replay/restore על נתוני דמה. mounted volume לבדו אינו גיבוי. קשור ל־OBS-08 ול־SSA-6/7/17/18/19. |
| MPC-08 | עבודה רציפה/reboot — `BLOCKER` אם שירות ללא מפעיל נכלל | רק `api-server` מגדיר `restart: unless-stopped`; `frontend` ו־`ipfs` לא מגדירים restart policy. [Compose](../docker-compose.yml#L53). לא נבדקו boot, sleep, power recovery או דיסק מלא. | מדיניות התנעה מוסכמת ל־API ול־Web, Docker פעיל לאחר boot, תרגיל reboot מורשה, ו־smoke לאחריו. IPFS נשאר מחוץ לבסיס. |
| MPC-09 | RAM/CPU/דיסק — `NOT_TESTED` | ב־API יש old-space heap setting של `512` MB, לא מגבלת RAM כוללת. Compose לא מגדיר מגבלות CPU/RAM/PIDs או rotation ללוגי container. Frontend runner מעתיק את כל `/app` מה־builder, כולל תלויות build. [Heap](../Dockerfile#L26), [Web runner](../frontend/Dockerfile#L27), [Compose](../docker-compose.yml). | למדוד בנפרד שיא build, RSS בזמן idle/עומס, CPU, גודל images וקצב state/logs; לבחור מגבלות ו־retention על סמך יעדי עבודה מוסכמים. אין benchmark של המכשיר. |
| MPC-10 | Health אינו acceptance — `NOT_TESTED` | `/api/health` מחזיר JSON עם `status: degraded` בלי לשנות HTTP status; `curl -f` ב־healthcheck בוחן בעיקר סטטוס HTTP. [API health](../backend/app.js#L329), [healthcheck](../docker-compose.yml#L54). | לבדוק גם תוכן JSON, outbox/jail log וזרימת API/UI שלמה. `healthy` של Docker או `200` בדף הבית אינם סוגרים G2/G3. |
| MPC-11 | מסלול artifact/CI — `BLOCKER` אם מסתמכים על Backend CD כ־artifact קנוני | `backend-cd.yml` בונה מתוך `./backend`, אבל `backend/app.js` טוען `../src/server`; ה־Dockerfile הקנוני בונה מהשורש. [CD context](../.github/workflows/backend-cd.yml#L20), [imports](../backend/app.js#L19), [canonical context](../docker-compose.yml#L3). זו אי־התאמת מקור/אריזה שנצפתה בקוד, לא תוצאת CI חדשה. | pipeline אחד שמייצר את ה־artifact הקנוני המלא; candidate SHA ו־image digests משויכים ל־CI ולבדיקות היעד. אין להניח ש־`backend:latest` תואם. קשור ל־SSA-8/10/11/21. |
| MPC-12 | build שחזורי — `NOT_TESTED` | `node:24-alpine` ו־`ipfs/kubo:latest` אינם digest pins; Frontend מפעיל `apk upgrade`. root `npm ci` מופעל אחרי העתקת root manifests ולפני העתקת ספריות ה־workspaces. [Root build](../Dockerfile#L13), [Web build](../frontend/Dockerfile#L8), [IPFS tag](../docker-compose.yml#L77). אין להסיק מכך ש־npm בהכרח נכשל; תוכן התלויות בתוצר לא אומת בסבב זה. | build נקי מזוהה על architecture היעד, אימות תלויות runtime/workspaces, מלאי תוצר ו־digests. יש להריץ typecheck במפורש משום ש־Next [מוגדר להתעלם משגיאות build של TypeScript](../frontend/next.config.js#L14). |
| MPC-13 | Runbook ל־Linux — `NOT_TESTED` | הסקריפטים הקיימים הם PowerShell; smoke משתמש ב־`$env:TEMP` וב־`Start-Process -WindowStyle`. [Validator](../scripts/validate-runtime-config.ps1), [smoke](../scripts/qa-jailtime-smoke.ps1#L8). `devops/README.md` מתאר `.sh` שלא נמצאו במעקב. | Runbook שנכתב ונבדק ל־OS שנבחר, או התקנת PowerShell מאושרת ואימות תאימות. אין להציג סקריפט Windows כפקודת Bash. |
| MPC-14 | מסירה/קבלה על המכשיר — `NOT_TESTED` | G2–G5 לא עברו לפי חבילת QA. לא בוצעו מבחני HTTP/UI/restart/load או CI מרוחק כחלק מסקירת Mini-PC זו. [QA gates](qa/rc0/README.md). | כל מבחני החובה על אותו candidate, ראיות נגישות ללא secrets, סקירה והחלטת Go של בעל הפרויקט לפני פריסה. |

## הצעת baseline — מותנית בבחירת המכשיר

המלצת תכנון, לא התקנה שבוצעה: Linux 64-bit נתמך, Docker Engine עם Compose plugin, API + Frontend בלבד, named volume חדש ומזוהה, וגישה פרטית בתחילה. בעת הבדיקה תיעוד Docker מונה Ubuntu LTS ‏22.04/24.04/26.04 ומונה amd64 ו־arm64 בין הארכיטקטורות הנתמכות; זו תמיכת Docker ב־host, לא אימות SafeSoundArena. יש לבחור גרסה לפי המכשיר ולעיין שוב בתיעוד ביום ההקמה. [Docker: התקנה ב־Ubuntu](https://docs.docker.com/engine/install/ubuntu/).

לא נקבע מינימום חומרה מוכח. המספרים `4GB RAM / 20GB` ב־[handoff הקודם](OPERATIONAL_HANDOFF.md) והמספרים הגבוהים יותר במדריך production עם Ollama הם הערכות/היקפים קודמים, לא תוצאות עומס של הבסיס הנוכחי. אין צורך ב־GPU או בהורדת מודל לצורך היקף בדיקה זה; אין בכך התחייבות שהחומרה הקיימת מספיקה. צריך למדוד build וריצה בנפרד ולהשאיר מקום ל־images, נתונים, לוגים וגיבוי.

הערות טכניות ממקורות רשמיים, שנבדקו ב־2026-08-27:

- `NEXT_PUBLIC_*` נכללים בבאנדל בזמן build; לצורך מעבר בין origins יש לתכנן build מתאים או מנגנון runtime מפורש. זו הסיבה ל־MPC-05. [Next.js: Environment Variables](https://nextjs.org/docs/pages/guides/environment-variables).
- `host.docker.internal` אינו יעד שיש להניח שקיים ב־Linux Engine ללא תצורה. אם Ollama יאושר בעתיד על ה־host, נדרש מיפוי כגון `extra_hosts` ל־`host-gateway` או כתובת service מתאימה, יחד עם listener/firewall מוגבלים. המיפוי אינו מפעיל את Ollama ואינו מבטיח נגישות לשירות שמאזין רק ל־loopback. אין להוסיף או להפעיל אותו בהיקף הנוכחי. [Docker: networking ב־Compose](https://docs.docker.com/compose/how-tos/networking/).
- bridge ופורטים מקומיים אינם מדיניות egress. Docker מאפשר יציאה ברשת רגילה; מדיניות הרשת צריכה להגן בנפרד על ingress ועל egress. [Docker: networking](https://docs.docker.com/engine/network/). Docker גם מזהיר שפרסום פורטים עלול לעקוף כללי UFW/firewalld; אין להרחיב binds על סמך UFW בלבד. [Docker: מגבלות firewall](https://docs.docker.com/engine/install/ubuntu/#firewall-limitations).
- restart policy היא שקובעת חזרה אוטומטית של container; ברירת המחדל היא ללא restart. [Docker: הפעלה אוטומטית](https://docs.docker.com/engine/containers/start-containers-automatically/). מידע בשכבה הניתנת לכתיבה של container אינו שורד את הסרתו; volume הוא אחסון נפרד, ועדיין נדרש backup/restore. [Docker: lifecycle של volumes](https://docs.docker.com/engine/storage/volumes/#a-volumes-lifecycle).
- אין להעביר סודות ב־Docker build arguments או לשלב אותם ב־image; אם build עתידי זקוק לסוד יש להשתמש במנגנון secrets מתאים ולבדוק את התוצר. [Docker: Build secrets](https://docs.docker.com/build/building/secrets/).

## המידע הנדרש לפני תחילת השלב הבא

אין לשלוח סיסמאות, private keys או tokens. נדרשים רק:

| שדה | מידע נדרש |
| --- | --- |
| מכשיר | דגם, CPU ו־`x86_64`/`aarch64`, כמות RAM, דיסק וסך מקום פנוי |
| מערכת | הפצה/גרסה, 64-bit, האם Docker Engine/Compose כבר מותקנים |
| גישה | האם יש SSH, משתמש ניהולי מורשה, כתובת פרטית/שם מכשיר ו־host-key verification בערוץ המתאים |
| שימוש | בדיקה פרטית או שירות רציף; דפדפן על המכשיר, tunnel, LAN או URL מאושר |
| היקף נתונים | state חדש או migration מוגדר; אין העברה אוטומטית של permissions/audit/נתוני אמת |
| עומס וקבלה | מספר משתמשים/תהליכים צפוי, פיצ'רים שנכללים, ספי משאבים, חלון ניטור ודרישות recovery שיאושרו |

## Checklist להכנה ולקבלה — טרם בוצע

### לפני build או הקמה

- [ ] זוהה המכשיר ונרשמו OS/CPU/RAM/disk, גרסאות Docker/Compose והיקף גישה מאושר.
- [ ] נבחרו commit, allowlist, שני Dockerfiles קנוניים ותצורת יעד נגזרת אחת לסקירה; אין שימוש אוטומטי בתצורות `prod/final/devops` ישנות.
- [ ] נסגר MPC-02: אין secrets, הרשאות, audit, נתוני runtime או ראיות QA גולמיות ב־context/layers למסירה; `.env*` נבדקו והוחרגו לפי מדיניות מפורשת. אין העתקה של `node_modules`, `.next` או caches מעמדת Windows. תלויות Linux ותוצר Next שנוצרו ב־build הנקי כן נדרשים ב־runtime image. clone נקי לבדו אינו תחליף לסקירת קבצים במעקב.
- [ ] הוגדרו tokens חדשים על היעד בערוץ מקומי מוגן; `ADMIN_TOKEN`/`ALLOWED_ORIGINS` אינם ריקים. סודות אינם ב־Git, ב־`NEXT_PUBLIC_*`, ב־build args או בפלט `docker compose config` מלא.
- [ ] הוגדרו origins, internal API URL ו־Socket contract; נשמרו bindings פרטיים. נקבע פתרון auth לפני גישה ללקוח לא מהימן.
- [ ] הוכחו בידוד egress ו־state. IPFS ומודלים אינם מופעלים; היעדר API key אינו הוכחת השבתה של Pi/provider.
- [ ] הוגדרו volume/UID/GID, כל ה־stores שנכללים, retention, גיבוי ודרך restore. אין העתקה עיוורת של volume או הרשאות מ־Windows.
- [ ] התקבל אישור לפעולות הסביבתיות הנדרשות, לרבות downloads/build או שינוי במכשיר, ונקבעו deadline, stop conditions ו־resource IDs של ההרצה בלבד.

### מבחני קבלה לאחר הכנה מאושרת

- [ ] build נקי של API ו־Web על architecture היעד, תיעוד SHA/digests וסקירת dependencies/layers. לא משתמשים ב־image ה־scratch ההיסטורי של QA.
- [ ] בדיקות יחידה, typecheck ו־build לפי ה־scope על אותו candidate; required CI checks ירוקים ומתועדים, לא רק קיימים כ־YAML.
- [ ] root ו־`/api/health` נגישים דרך ה־origin שנבחר, ללא `degraded`; נבדקות כתיבות וקריאות Feature באמצעות fixtures בלבד.
- [ ] מבחני authentication/authorization חיוביים ושליליים דרך API ו־Next proxy; deny לא משנה state ולא חושף נתונים.
- [ ] אם Realtime נכלל: handshake, CORS/CSP, reconnect, expiry וזהות משתתף נבדקו בדפדפן הלקוח האמיתי; אחרת נדרשת החרגה מפורשת והוכחת הסרת המשטח.
- [ ] אין יציאה לא מורשית, כולל Pi, Brain search, telemetry, IPFS ו־fallback; בדיקת החסימה משתמשת ב־sink מדומה בלבד.
- [ ] recreate/reboot מורשים אינם מאבדים stores שנכללים בחוזה; replay אינו יוצר תוצאה כפולה; restore נבדק לעותק נפרד מנתוני הדמה.
- [ ] נמדדו משאבים תחת עומס מוסכם, שיא build, לוגים, מקום דיסק והתנהגות באובדן dependency. מוגדרים ניטור ותנאי עצירה; אין RPO/RTO או SLA מומצאים.
- [ ] נשמר run record עם תאריך, מפעיל, target, candidate, configuration identity ללא secrets, expected/actual, ראיות ו־NOT_RUN שנותרו.
- [ ] G3 קיבל Go מפורש, ה־runbook נסקר ואומת, וקיימת הרשאה לפריסה המסוימת; post-deploy נסגר בנפרד לפי G4/G5.

## הכרעה

מיפוי וסקירה סטטית הושלמו; התקנה וקבלת מערכת לא בוצעו. השלב הבא הוא מסירת מפרט המיני־PC ובחירת היקף גישה, במקביל לסגירת חסמי האריזה/בידוד וה־QA הרלוונטיים. רק לאחר אימות candidate על היעד ניתן לקבוע שהוא מתאים למכשיר. commit או push של הקוד והמסמכים אינם אישור release, פריסה או readiness.
