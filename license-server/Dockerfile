# Dockerfile לשרת רישיונות SafeSoundArena
# מבוסס על Node.js בגרסה LTS עם Alpine Linux לקבלת תמונה קטנה ומאובטחת
FROM node:18-alpine AS base

# הגדרת משתני סביבה
ENV NODE_ENV=production \
    PORT=3010 \
    USER=nodeuser \
    UID=1000 \
    GID=1000

# התקנת תלויות מערכת נדרשות
RUN apk add --no-cache dumb-init

# יצירת משתמש ייעודי להפעלת האפליקציה (ללא הרשאות root)
RUN addgroup -S $USER || true && \
    adduser -S $USER -G $USER || true

# יצירת תיקיות האפליקציה והגדרת הרשאות
RUN mkdir -p /app/data /app/logs && \
    chown -R $USER:$USER /app

# שלב בניית האפליקציה
FROM base AS build

WORKDIR /build

# העתקת קבצי package.json ו-package-lock.json
COPY package*.json ./

# התקנת תלויות הפיתוח והייצור
RUN npm install --no-audit --no-fund

# העתקת קוד המקור
COPY . .

# הרצת בדיקות (אופציונלי) — מדולג בבילד קונטיינר כדי לצמצם תלויות
# RUN npm test

# שלב הייצור הסופי
FROM base AS production

WORKDIR /app

# העתקת תלויות הייצור בלבד
COPY --from=build /build/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# העתקת קוד האפליקציה
COPY --from=build /build/*.js ./
COPY --from=build /build/README.md ./
COPY --from=build /build/SECURITY.md ./

# הגדרת הרשאות
RUN chown -R $USER:$USER /app

# החלפת משתמש
USER $USER

# חשיפת פורט
EXPOSE $PORT

# הגדרת נפח לנתונים ולוגים
VOLUME ["/app/data", "/app/logs"]

# הגדרת בדיקת בריאות
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:$PORT/healthz || exit 1

# הפעלת האפליקציה עם dumb-init כדי לטפל בסיגנלים כראוי
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]