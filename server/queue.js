const { Queue, Worker } = require('bullmq');
const myQueue = new Queue('agent-tasks', { connection: { host: 'localhost', port: 6379 } });

const worker = new Worker('agent-tasks', async job => {
  // בצע פעולה כבדה (למשל, עיבוד תמונה)
  return `Processed: ${job.name}`;
});

module.exports = myQueue;
