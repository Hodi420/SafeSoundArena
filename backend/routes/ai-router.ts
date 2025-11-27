import express, { Router, Request, Response } from 'express';
import { HybridAIRouter } from '../src/services/HybridAIRouter';
import { SelfDevelopmentEngine } from '../src/services/SelfDevelopmentEngine';

const router: Router = express.Router();
const aiRouter = new HybridAIRouter();
const selfDevEngine = new SelfDevelopmentEngine();

interface AIRequestBody {
  prompt: string;
  context?: string;
  complexity?: 'low' | 'medium' | 'high';
  requiresAccuracy?: boolean;
  requiresLatency?: boolean;
  userPreference?: 'cost' | 'quality' | 'speed';
  maxTokens?: number;
}

/**
 * POST /api/ai/chat - Intelligent AI routing for chat requests
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const requestBody: AIRequestBody = req.body;

    if (!requestBody.prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get routing decision
    const decision = await aiRouter.route(requestBody);

    // Execute the request
    const startTime = Date.now();
    const response = await aiRouter.execute(decision, requestBody);
    const responseTime = Date.now() - startTime;

    // Record interaction for self-development
    const interactionId = await selfDevEngine.recordInteraction(
      req.headers['x-user-id']?.toString() || 'anonymous',
      requestBody.prompt,
      response,
      {
        responseTime,
        modelUsed: decision.selectedModel.name,
        complexity: requestBody.complexity || 'medium',
        context: requestBody.context ? [requestBody.context] : [],
      }
    );

    res.json({
      response,
      metadata: {
        model: decision.selectedModel.name,
        provider: decision.selectedModel.provider,
        reasoning: decision.reasoning,
        estimatedCost: decision.estimatedCost,
        estimatedLatency: decision.estimatedLatency,
        actualResponseTime: responseTime,
        timestamp: new Date().toISOString(),
        interactionId,
      },
    });
  } catch (error: any) {
    console.error('AI Router error:', error);
    res.status(500).json({
      error: 'Failed to process AI request',
      message: error.message,
    });
  }
});

/**
 * POST /api/ai/analyze - Analyze request complexity without execution
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const requestBody: AIRequestBody = req.body;

    if (!requestBody.prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const decision = await aiRouter.route(requestBody);

    res.json({
      analysis: {
        selectedModel: decision.selectedModel.name,
        provider: decision.selectedModel.provider,
        reasoning: decision.reasoning,
        estimatedCost: decision.estimatedCost,
        estimatedLatency: decision.estimatedLatency,
        complexity: requestBody.complexity || 'auto-detected',
      },
    });
  } catch (error) {
    console.error('AI Analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze request',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai/stats - Get router usage statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = aiRouter.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai/models - Get available models status
 */
router.get('/models', async (req: Request, res: Response) => {
  try {
    // This would check model availability
    res.json({
      local: [
        { name: 'llama3-8b-local', status: 'checking...', endpoint: 'http://localhost:11434' },
        { name: 'mistral-7b-local', status: 'checking...', endpoint: 'http://localhost:8081' },
      ],
      api: [
        { name: 'gpt-4o', status: 'available', provider: 'openai' },
        { name: 'claude-3-sonnet', status: 'available', provider: 'anthropic' },
      ],
    });
  } catch (error) {
    console.error('Models status error:', error);
    res.status(500).json({
      error: 'Failed to get models status',
      message: error.message,
    });
  }
});

// New endpoint: provide multiple parallel candidates and let client choose
router.post('/chat/candidates', async (req: Request, res: Response) => {
  try {
    const requestBody: AIRequestBody = req.body;

    if (!requestBody.prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Generate 3 routing decisions with different preferences to diversify
    const preferences: Array<'cost' | 'quality' | 'speed'> = ['cost', 'quality', 'speed'];

    const decisions = await Promise.all(
      preferences.map((pref) => aiRouter.route({ ...requestBody, userPreference: pref }))
    );

    const start = Date.now();
    const executions = await Promise.allSettled(
      decisions.map((decision) => aiRouter.execute(decision, requestBody))
    );
    const totalTime = Date.now() - start;

    const candidates = decisions.map((decision, idx) => {
      const exec = executions[idx];
      const success = exec.status === 'fulfilled';
      const content = success ? (exec as PromiseFulfilledResult<string>).value : null;
      const error = success
        ? null
        : (exec as PromiseRejectedResult).reason?.message || 'Execution failed';
      return {
        response: content,
        error,
        metadata: {
          model: decision.selectedModel.name,
          provider: decision.selectedModel.provider,
          reasoning: decision.reasoning,
          estimatedCost: decision.estimatedCost,
          estimatedLatency: decision.estimatedLatency,
          preference: preferences[idx],
        },
      };
    });

    res.json({
      totalTime,
      candidates,
    });
  } catch (error: any) {
    console.error('AI candidates error:', error);
    res.status(500).json({
      error: 'Failed to get candidates',
      message: error.message,
    });
  }
});

// Feedback endpoint to update learning based on user choice
router.post('/chat/feedback', async (req: Request, res: Response) => {
  try {
    const { interactionId, feedback } = req.body as {
      interactionId: string;
      feedback: 'positive' | 'negative' | 'neutral';
    };
    if (!interactionId || !feedback) {
      return res.status(400).json({ error: 'interactionId and feedback are required' });
    }

    await selfDevEngine.updateFeedback(interactionId, feedback);
    res.json({ success: true });
  } catch (error: any) {
    console.error('AI feedback error:', error);
    res.status(500).json({
      error: 'Failed to update feedback',
      message: error.message,
    });
  }
});

// Learning stats & recommendations
router.get('/learning/stats', (req: Request, res: Response) => {
  try {
    const stats = selfDevEngine.getLearningStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get learning stats', message: error.message });
  }
});

router.post('/learning/recommendations', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId?: string };
    const recommendations = await selfDevEngine.getImprovementRecommendations(userId);
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get recommendations', message: error.message });
  }
});

export default router;
