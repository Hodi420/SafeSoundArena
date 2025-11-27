<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessVideo;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VideoController extends Controller
{
    /**
     * Process a video
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function process(Request $request)
    {
        $request->validate([
            'video_id' => 'required|string',
            'user_id' => 'nullable|string',
        ]);

        $jobId = (string) Str::uuid();
        
        // Dispatch the job to the queue
        ProcessVideo::dispatch($request->video_id)
            ->onQueue('videos')
            ->delay(now()->addSeconds(5))
            ->onConnection('redis');

        return response()->json([
            'message' => 'Video processing started',
            'job_id' => $jobId,
            'video_id' => $request->video_id,
            'status' => 'queued'
        ], 202);
    }

    /**
     * Get job status
     *
     * @param  string  $jobId
     * @return \Illuminate\Http\Response
     */
    public function status($jobId)
    {
        // In a real application, you would check the job status from Redis
        // This is a simplified example
        return response()->json([
            'job_id' => $jobId,
            'status' => 'completed', // This would be dynamic in a real app
            'progress' => 100,
            'result' => [
                'message' => 'Video processing completed',
                'url' => 'https://example.com/processed/video.mp4'
            ]
        ]);
    }
}
