const Queue = require('bull');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

// Create a new queue
const videoQueue = new Queue('video processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Set up Bull Board for monitoring
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullAdapter(videoQueue)],
  serverAdapter: serverAdapter,
});

// Example job processor
videoQueue.process('process-video', async (job) => {
  const { videoId } = job.data;
  
  // Process video here
  console.log(`Processing video ${videoId}...`);
  
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  return { status: 'completed', videoId };
});

// Handle completed jobs
videoQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

// Handle failed jobs
videoQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed:`, error);
});

module.exports = {
  videoQueue,
  serverAdapter,
};
