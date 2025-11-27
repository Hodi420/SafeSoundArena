const express = require('express');
const router = express.Router();
const { videoQueue } = require('../queue/queue');

// Route to process a video
router.post('/process', async (req, res) => {
  try {
    const { videoId, userId } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    // Add job to the queue
    const job = await videoQueue.add(
      'process-video',
      {
        videoId,
        userId: userId || 'anonymous',
        timestamp: new Date(),
      },
      {
        // Job options
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: 5000,
      }
    );

    res.status(202).json({
      message: 'Video processing started',
      jobId: job.id,
      status: 'queued',
    });
  } catch (error) {
    console.error('Error adding job to queue:', error);
    res.status(500).json({ error: 'Failed to process video' });
  }
});

// Get job status
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await videoQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job._progress;
    const result = job.returnvalue;

    res.json({
      jobId: job.id,
      state,
      progress,
      result,
      data: job.data,
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

module.exports = router;
