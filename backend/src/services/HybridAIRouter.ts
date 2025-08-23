/**
 * Hybrid AI Router - Intelligent model selection for cost optimization
 * Routes requests to local models for simple tasks and external APIs for complex ones
 */

import { performance } from 'perf_hooks';

interface AIRequest {
  prompt: string;
  context?: string;
  complexity?: 'low' | 'medium' | 'high';
  requiresAccuracy?: boolean;
  requiresLatency?: boolean;
  userPreference?: 'cost' | 'quality' | 'speed';
  maxTokens?: number;
}

interface ModelConfig {
  name: string;
  provider: 'local' | 'api';
  endpoint: string;
  costPerToken?: number;
  avgLatency?: number;
  qualityScore?: number;
  capabilities: string[];
}

interface RoutingDecision {
  selectedModel: ModelConfig;
  reasoning: string;
  estimatedCost: number;
  estimatedLatency: number;
}

export class HybridAIRouter {
  private models: ModelConfig[] = [
    {
      name: 'llama3-8b-local',
      provider: 'local',
      endpoint: 'http://localhost:11434',
      costPerToken: 0,
      avgLatency: 800,
      qualityScore: 7,
      capabilities: ['general', 'coding', 'translation']
    },
    {
      name: 'mistral-7b-local',
      provider: 'local', 
      endpoint: 'http://localhost:8081',
      costPerToken: 0,
      avgLatency: 600,
      qualityScore: 6,
      capabilities: ['general', 'simple-coding']
    },
    {
      name: 'gpt-4o',
      provider: 'api',
      endpoint: 'https://api.openai.com/v1',
      costPerToken: 0.00003,
      avgLatency: 2000,
      qualityScore: 9.5,
      capabilities: ['general', 'coding', 'complex-reasoning', 'agentic']
    },
    {
      name: 'claude-3-sonnet',
      provider: 'api',
      endpoint: 'https://api.anthropic.com/v1',
      costPerToken: 0.000015,
      avgLatency: 1800,
      qualityScore: 9,
      capabilities: ['general', 'coding', 'analysis', 'safety']
    }
  ];

  private usageStats = {
    totalRequests: 0,
    localRequests: 0,
    apiRequests: 0,
    totalCost: 0,
    costSavings: 0
  };

  /**
   * Analyze request complexity and determine optimal model
   */
  public async route(request: AIRequest): Promise<RoutingDecision> {
    const complexity = this.analyzeComplexity(request);
    const availableModels = await this.getAvailableModels();

    // Dev fallback when no models are available
    const isDev = process.env.NODE_ENV !== 'production' || process.env.FORCE_DEV_GATE === 'true';
    if (availableModels.length === 0) {
      if (isDev) {
        const fallbackModel: ModelConfig = {
          name: 'dev-fallback',
          provider: 'local',
          endpoint: '',
          costPerToken: 0,
          avgLatency: 50,
          qualityScore: 1,
          capabilities: ['general']
        };
        return {
          selectedModel: fallbackModel,
          reasoning: 'Dev fallback - no models available',
          estimatedCost: 0,
          estimatedLatency: 50
        };
      }
      throw new Error('No AI models are currently available');
    }
    
    // Score each model based on request requirements
    const scores = availableModels.map(model => ({
      model,
      score: this.calculateModelScore(model, request, complexity)
    }));

    // Sort by score and select best option
    scores.sort((a, b) => b.score - a.score);
    const selectedModel = scores[0].model;

    const estimatedCost = this.estimateCost(selectedModel, request);
    const estimatedLatency = this.estimateLatency(selectedModel, request);

    return {
      selectedModel,
      reasoning: this.generateReasoning(selectedModel, request, complexity),
      estimatedCost,
      estimatedLatency
    };
  }

  /**
   * Analyze prompt complexity using heuristics
   */
  private analyzeComplexity(request: AIRequest): 'low' | 'medium' | 'high' {
    if (request.complexity) return request.complexity;

    const prompt = request.prompt.toLowerCase();
    let complexityScore = 0;

    // Length factor
    if (prompt.length > 1000) complexityScore += 2;
    else if (prompt.length > 300) complexityScore += 1;

    // Keyword analysis
    const complexKeywords = [
      'analyze', 'compare', 'explain', 'reasoning', 'complex', 'detailed',
      'architectural', 'design pattern', 'algorithm', 'optimization',
      'security', 'performance', 'scalability'
    ];
    
    const simpleKeywords = [
      'translate', 'format', 'convert', 'list', 'simple', 'basic',
      'hello', 'what is', 'define'
    ];

    complexKeywords.forEach(keyword => {
      if (prompt.includes(keyword)) complexityScore += 1;
    });

    simpleKeywords.forEach(keyword => {
      if (prompt.includes(keyword)) complexityScore -= 1;
    });

    // Code-related complexity
    if (prompt.includes('```') || prompt.includes('function') || prompt.includes('class')) {
      complexityScore += 1;
    }

    if (complexityScore >= 3) return 'high';
    if (complexityScore >= 1) return 'medium';
    return 'low';
  }

  /**
   * Calculate model fitness score for given request
   */
  private calculateModelScore(model: ModelConfig, request: AIRequest, complexity: string): number {
    let score = 0;

    // Base quality score
    score += model.qualityScore ?? 5;

    // User preference weighting
    switch (request.userPreference) {
      case 'cost':
        score += model.provider === 'local' ? 5 : -3;
        break;
      case 'quality':
        score += (model.qualityScore || 5) * 0.5;
        break;
      case 'speed':
        score += model.avgLatency ? (3000 - model.avgLatency) / 300 : 0;
        break;
    }

    // Complexity matching
    if (complexity === 'high' && (model.qualityScore ?? 0) < 8) score -= 4;
    if (complexity === 'low' && model.provider === 'local') score += 3;

    // Accuracy requirements
    if (request.requiresAccuracy && (model.qualityScore ?? 0) < 8) score -= 3;
    
    // Latency requirements
    if (request.requiresLatency && (model.avgLatency ?? Number.MAX_SAFE_INTEGER) > 1500) score -= 2;

    return score;
  }

  /**
   * Check which models are currently available
   */
  private async getAvailableModels(): Promise<ModelConfig[]> {
    const available: ModelConfig[] = [];
    
    for (const model of this.models) {
      try {
        if (model.provider === 'local') {
          // Check if local service is running with manual timeout (Node 18 compatible)
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          try {
            const response = await fetch(`${model.endpoint}/api/tags`, { 
              method: 'GET',
              signal: controller.signal
            });
            if (response.ok) available.push(model);
          } finally {
            clearTimeout(timeout);
          }
        } else {
          // Include API models only when corresponding API keys are configured
          if (model.name.startsWith('gpt')) {
            if (process.env.OPENAI_API_KEY) {
              available.push(model);
            } else {
              console.log('Skipping API model (gpt-*) - OPENAI_API_KEY not set');
            }
          } else if (model.name.startsWith('claude')) {
            if (process.env.ANTHROPIC_API_KEY) {
              available.push(model);
            } else {
              console.log('Skipping API model (claude-*) - ANTHROPIC_API_KEY not set');
            }
          } else {
            available.push(model);
          }
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`Model ${model.name} not available:`, msg);
      }
    }

    return available;
  }

  private estimateCost(model: ModelConfig, request: AIRequest): number {
    const estimatedTokens = Math.ceil(request.prompt.length / 3) + (request.maxTokens || 150);
    return (model.costPerToken || 0) * estimatedTokens;
  }

  private estimateLatency(model: ModelConfig, request: AIRequest): number {
    const baseLatency = model.avgLatency || 1000;
    const tokenMultiplier = (request.maxTokens || 150) / 100;
    return baseLatency * tokenMultiplier;
  }

  private generateReasoning(model: ModelConfig, request: AIRequest, complexity: string): string {
    const reasons = [];
    
    if (model.provider === 'local') {
      reasons.push('Selected local model for cost efficiency');
    } else {
      reasons.push('Selected API model for higher quality');
    }

    if (complexity === 'high') {
      reasons.push('High complexity detected - premium model recommended');
    } else if (complexity === 'low') {
      reasons.push('Simple task - local model sufficient');
    }

    if (request.requiresAccuracy) {
      reasons.push('Accuracy requirement prioritized');
    }

    return reasons.join(', ');
  }

  /**
   * Execute request with selected model
   */
  public async execute(decision: RoutingDecision, request: AIRequest): Promise<string> {
    const startTime = performance.now();
    
    try {
      let response: string;
      
      if (decision.selectedModel.name === 'dev-fallback') {
        response = await this.executeFallback(request);
        this.usageStats.localRequests++;
      } else if (decision.selectedModel.provider === 'local') {
        response = await this.executeLocal(decision.selectedModel, request);
        this.usageStats.localRequests++;
      } else {
        response = await this.executeAPI(decision.selectedModel, request);
        this.usageStats.apiRequests++;
        this.usageStats.totalCost += decision.estimatedCost;
      }

      const actualLatency = performance.now() - startTime;
      this.usageStats.totalRequests++;
      
      console.log(`Request completed in ${actualLatency.toFixed(0)}ms using ${decision.selectedModel.name}`);
      
      return response;
    } catch (error) {
      console.error('Execution error:', error);
      throw error;
    }
  }

  private async executeLocal(model: ModelConfig, request: AIRequest): Promise<string> {
    // Use existing Ollama client
    const ollama = require('../../../aiClients/ollama');
    return await ollama.ask(request.prompt, {
      baseUrl: model.endpoint,
      model: model.name.split('-')[0] // Extract model name
    });
  }

  private async executeAPI(model: ModelConfig, request: AIRequest): Promise<string> {
    if (model.name.startsWith('gpt')) {
      if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key not configured');
      const openai = require('../../../aiClients/openai');
      return await openai.ask(request.prompt, { model: model.name });
    } else if (model.name.startsWith('claude')) {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('Anthropic API key not configured');
      const claude = require('../../../aiClients/claude');
      return await claude.ask(request.prompt);
    }
    
    throw new Error(`Unsupported API model: ${model.name}`);
  }

  private async executeFallback(request: AIRequest): Promise<string> {
    const prefix = '[DEV FAKE RESPONSE]';
    return `${prefix} Echo: ${request.prompt}`;
  }

  /**
   * Get usage statistics
   */
  public getStats() {
    const total = this.usageStats.totalRequests || 0;
    const localPercentage = total ? (this.usageStats.localRequests / total) * 100 : 0;
    const avgCostPerRequest = total ? (this.usageStats.totalCost / total) : 0;
    return {
      ...this.usageStats,
      localPercentage,
      avgCostPerRequest
    };
  }
}