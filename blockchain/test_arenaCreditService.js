// בדיקות/סימולציה לפונקציות החדשות של ArenaCreditService
const arena = require('./arenaCreditService');

(async () => {
  // הדפסת יתרות ראשוניות
  console.log('--- יתרות ראשוניות ---');
  console.log(await arena.getHolders());

  // ביצוע העברה עם עמלה
  console.log('\n--- העברה עם עמלה ---');
  await arena.transfer('community', 'alice', 1000);
  console.log('יתרת alice:', await arena.getBalance('alice'));
  console.log('יתרת burn:', await arena.getBurnedAmount());

  // הקפאת חשבון
  await arena.freezeAccount('alice', 'admin');
  console.log('\n--- הקפאת alice ---');
  try {
    await arena.transfer('alice', 'bob', 10);
  } catch (e) {
    console.log('שגיאה צפויה (alice מוקפאת):', e.message);
  }

  // שחרור חשבון
  await arena.unfreezeAccount('alice', 'admin');
  console.log('\n--- שחרור alice ---');
  await arena.transfer('alice', 'bob', 10);
  console.log('יתרת bob:', await arena.getBalance('bob'));

  // הוספת אדמין והסרה
  await arena.addAdmin('superman', 'admin', 'regular');
  await arena.removeAdmin('superman', 'admin');

  // הדפסת כל הלוגים
  console.log('\n--- לוג טרנזקציות ---');
  console.log(await arena.getTransactions());

  // הצגת יתרת burn address
  console.log('\n--- burn address:', arena.BURN_ADDRESS, '---');
  console.log('סה"כ שרוף:', await arena.getBurnedAmount());
})();
