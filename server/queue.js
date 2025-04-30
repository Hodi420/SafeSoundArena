const { Queue, Worker } = require('bullmq');
const { REDIS_HOST = 'localhost', REDIS_PORT = 6379 } = process.env;

// Queue instance
const myQueue = new Queue('agent-tasks', {
  connection: { host: REDIS_HOST, port: Number(REDIS_PORT) }
});

// Worker instance (מופרד לייצוא/בדיקות)
const worker = new Worker('agent-tasks', async job => {
  // בצע פעולה כבדה (למשל, עיבוד תמונה)
  // יש להוסיף try-catch במידת הצורך
  return `Processed: ${job.name}`;
});

module.exports = {
  myQueue,
  worker
};
