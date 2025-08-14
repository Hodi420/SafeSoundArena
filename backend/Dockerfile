FROM node:20-alpine
WORKDIR /usr/src/app

# הגדרת יוזר לא-שורש
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm install --production && npm cache clean --force;

COPY . .

# מחיקת קבצי פיתוח
RUN rm -rf test/ tests/ *.md *.log *.bak *.tmp

# הגבלת הרשאות
RUN chown -R appuser:appgroup /usr/src/app
USER appuser

EXPOSE 4000
CMD ["node", "app.js"]
