# SafeSoundArena – מדריך הפעלה ופריסה

## 1. מבנה הפרויקט

- כל הקוד המרכזי נמצא בתיקיה `frontend/`
- אין צורך בתיקיית `next-app` – כל הפיצ'רים, הדפים והקונפיגורציה נמצאים ב־frontend

## 2. התקנת תלויות

```bash
cd frontend
npm install
```

## 3. בדיקת קוד ובנייה (Build)

```bash
npm run build
```
- אם יש רק אזהרות (warnings) – אפשר להמשיך.
- אם יש שגיאות (errors) – תקן אותן לפני העלאה.

## 4. הרצה מקומית

```bash
npm run dev
```
- כתובת ברירת מחדל: http://localhost:3000

## 5. משתני סביבה (ENV)

אם יש קובץ `.env` – ודא שהוא כולל את כל המשתנים הדרושים (API, מפתחות וכו').
ב־Vercel/Netlify יש להגדיר אותם ידנית ב־Dashboard.

## 6. פריסה (Deploy) ל־Vercel/Netlify

### ל־Vercel:
1. הירשם/התחבר ל־[Vercel](https://vercel.com)
2. לחץ על "Add New Project"
3. בחר את התיקיה `frontend`
4. Framework: Next.js
5. Build Command: `npm run build`
6. Output Directory: `.next`
7. הוסף משתני סביבה (אם צריך)
8. לחץ Deploy

### ל־Netlify:
1. הירשם/התחבר ל־[Netlify](https://netlify.com)
2. לחץ על "Add new site"
3. בחר את התיקיה `frontend`
4. Framework: Next.js
5. Build Command: `npm run build`
6. Publish directory: `.next`
7. הוסף משתני סביבה (אם צריך)
8. לחץ Deploy site

## 7. חיבור דומיין

1. הוסף דומיין בפרויקט שלך ב־Vercel/Netlify (Settings → Domains)
2. קבל הוראות DNS (CNAME/A record)
3. עדכן DNS אצל ספק הדומיין שלך
4. המתן עד להפצת DNS (עד שעתיים)
5. SSL יתווסף אוטומטית

## 8. תחזוקה
- כל שינוי שתעלה ל־GitHub (אם חיברת) – יגרור build אוטומטי
- תוכל להוסיף דומיינים, Redirects, ועוד

---

בהצלחה! אם יש שאלה או תקלה – פנה אלי ואשמח לעזור בכל שלב.
