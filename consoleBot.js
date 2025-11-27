// consoleBot.js
// קונסולת בוט עצמאית לבדיקה עם HybridAIRouter
require('dotenv').config();
const readline = require('readline');

// הגדרת כתובת שרת ברירת מחדל וה־prompt האחרון עבור פקודות עזר
const serverBaseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
let currentPrompt = '';

// Import TypeScript file with dynamic require
let HybridAIRouter;
try {
  // Try to load the compiled JS version first
  const { HybridAIRouter: Router } = require('./backend/src/services/HybridAIRouter');
  HybridAIRouter = Router;
} catch (error) {
  console.log('לא הצליח לטעון HybridAIRouter מקומפלילד, ננסה ts-node...');
  try {
    require('ts-node/register');
    const { HybridAIRouter: Router } = require('./backend/src/services/HybridAIRouter.ts');
    HybridAIRouter = Router;
  } catch (tsError) {
    console.error('שגיאה בטעינת HybridAIRouter:', tsError.message);
    console.log('אנא הרץ: npm install ts-node typescript בתיקיית הפרויקט');
    process.exit(1);
  }
}

const aiRouter = new HybridAIRouter();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('🤖 SafeSoundArena Console Bot מוכן!');
console.log('💡 הקלד "exit" כדי לצאת, "stats" לסטטיסטיקות');
console.log('⚡ הבוט יבחר אוטומטית בין מודלים מקומיים ו-API');
console.log('='.repeat(50));

function askUser() {
  rl.question('\n👤 אתה: ', async (input) => {
    if (!input.trim()) {
      askUser();
      return;
    }

    if (input.toLowerCase() === 'exit') {
      console.log('\n👋 להתראות!');
      rl.close();
      return;
    }

    if (input.toLowerCase() === 'stats') {
      try {
        const stats = aiRouter.getStats();
        console.log('\n📊 סטטיסטיקות הבוט:');
        console.log(`בקשות כולל: ${stats.totalRequests}`);
        console.log(
          `בקשות מקומיות: ${stats.localRequests} (${stats.localPercentage?.toFixed(1) || 0}%)`
        );
        console.log(`בקשות API: ${stats.apiRequests}`);
        console.log(`עלות כוללת: $${stats.totalCost?.toFixed(4) || 0}`);
        console.log(`ממוצע עלות לבקשה: $${stats.avgCostPerRequest?.toFixed(4) || 0}`);
      } catch (error) {
        console.log('שגיאה בהצגת סטטיסטיקות:', error.message);
      }
      askUser();
      return;
    }

    try {
      console.log('\n🤔 הבוט חושב...');

      // שמירת ה-prompt האחרון לשימוש בפקודת /candidates
      currentPrompt = input;

      // Create AI request
      const request = {
        prompt: input,
        userPreference: 'cost', // מעדיף מודלים זולים/מקומיים
      };

      // Route the request
      const decision = await aiRouter.route(request);
      console.log(
        `\n🎯 נבחר מודל: ${decision.selectedModel.name} (${decision.selectedModel.provider})`
      );
      console.log(`💭 סיבה: ${decision.reasoning}`);

      if (decision.estimatedCost > 0) {
        console.log(`💰 עלות משוערת: $${decision.estimatedCost.toFixed(4)}`);
      }

      // Execute the request
      const response = await aiRouter.execute(decision, request);

      console.log('\n🤖 בוט:', response);
    } catch (error) {
      console.error('\n❌ שגיאה:', error.message);

      if (error.message.includes('OPENAI_API_KEY')) {
        console.log('💡 הגדר OPENAI_API_KEY ב-.env לשימוש במודלי OpenAI');
      }
      if (error.message.includes('CLAUDE_API_KEY')) {
        console.log('💡 הגדר CLAUDE_API_KEY ב-.env לשימוש במודלי Claude');
      }
      if (error.message.includes('ECONNREFUSED') || error.message.includes('localhost:11434')) {
        console.log('💡 להתקנת Ollama מקומי: https://ollama.ai/');
      }
    }

    askUser();
  });
}

// בדיקה ראשונית של מודלים זמינים
console.log('\n🔍 בודק מודלים זמינים...');

askUser();

// Add command: /candidates to fetch multiple options in parallel
console.log(
  '\nפקודות חדשות: /candidates - קבל מספר הצעות במקביל, /feedback <id> <positive|neutral|negative> - עדכון למידה על אינטראקציה\n'
);

rl.on('line', async (line) => {
  const input = line.trim();

  if (input === '/candidates') {
    try {
      const body = {
        prompt: currentPrompt || 'תן דוגמה לפונקציית sum בג׳אווהסקריפט עם בדיקות',
        userPreference: 'quality',
        maxTokens: 200,
      };
      const res = await fetch(`${serverBaseUrl}/api/ai/chat/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.candidates) {
        console.log(`קיבלתי ${data.candidates.length} מועמדים (סה"כ ${data.totalTime}ms):`);
        data.candidates.forEach((c, i) => {
          console.log(
            `\n[${i + 1}] מודל: ${c.metadata.model} (${c.metadata.provider}) העדפה: ${c.metadata.preference}`
          );
          if (c.interactionId) {
            console.log(
              `interactionId: ${c.interactionId} (אפשר להשתמש ב-/feedback ${c.interactionId} positive)`
            );
          }
          if (c.error) {
            console.log(`שגיאה: ${c.error}`);
          } else {
            console.log(`תגובה:\n${c.response}`);
          }
        });
      } else {
        console.log('לא התקבלו מועמדים.');
      }
    } catch (e) {
      console.error('שגיאה בהבאת מועמדים:', e.message || e);
    }
    rl.prompt();
    return;
  }

  if (input.startsWith('/feedback')) {
    const parts = input.split(/\s+/);
    if (parts.length !== 3) {
      console.log('שימוש: /feedback <interactionId> <positive|neutral|negative>');
      rl.prompt();
      return;
    }
    const interactionId = parts[1];
    const feedback = parts[2];
    try {
      const res = await fetch(`${serverBaseUrl}/api/ai/chat/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactionId, feedback }),
      });
      const data = await res.json();
      if (data.success) console.log('feedback עודכן בהצלחה ✅');
      else console.log('נכשל עדכון feedback', data);
    } catch (e) {
      console.error('שגיאה בעדכון feedback:', e.message || e);
    }
    rl.prompt();
    return;
  }
});
