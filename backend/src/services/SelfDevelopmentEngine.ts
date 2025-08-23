/**
 * Self-Development Engine - מנוע פיתוח עצמי לבוט
 * לומד מאינטראקציות קודמות ומשפר ביצועים
 */

interface InteractionData {
  id: string;
  timestamp: Date;
  userInput: string;
  botResponse: string;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  responseTime: number;
  modelUsed: string;
  complexity: 'low' | 'medium' | 'high';
  context: string[];
  success: boolean;
}

interface LearningPattern {
  pattern: string;
  occurrences: number;
  successRate: number;
  averageResponseTime: number;
  preferredModel: string;
  contextualTriggers: string[];
  improvementSuggestions: string[];
}

interface PersonalizationProfile {
  userId: string;
  preferredComplexity: 'low' | 'medium' | 'high';
  communicationStyle: 'formal' | 'casual' | 'technical';
  responseLength: 'short' | 'medium' | 'detailed';
  topicsOfInterest: string[];
  learningGoals: string[];
  interactionHistory: InteractionData[];
}

export class SelfDevelopmentEngine {
  private interactions: Map<string, InteractionData> = new Map();
  private patterns: Map<string, LearningPattern> = new Map();
  private userProfiles: Map<string, PersonalizationProfile> = new Map();
  private improvementMetrics: {
    totalInteractions: number;
    successfulInteractions: number;
    averageResponseTime: number;
    userSatisfactionScore: number;
    learningProgressScore: number;
  } = {
    totalInteractions: 0,
    successfulInteractions: 0,
    averageResponseTime: 0,
    userSatisfactionScore: 0,
    learningProgressScore: 0
  };

  /**
   * רישום אינטראקציה חדשה ללמידה
   */
  public async recordInteraction(
    userId: string,
    userInput: string,
    botResponse: string,
    metadata: {
      responseTime: number;
      modelUsed: string;
      complexity: 'low' | 'medium' | 'high';
      context: string[];
    }
  ): Promise<string> {
    const interactionId = this.generateInteractionId();
    const interaction: InteractionData = {
      id: interactionId,
      timestamp: new Date(),
      userInput,
      botResponse,
      responseTime: metadata.responseTime,
      modelUsed: metadata.modelUsed,
      complexity: metadata.complexity,
      context: metadata.context,
      success: true // נעדכן לאחר קבלת feedback
    };

    this.interactions.set(interactionId, interaction);
    await this.updateUserProfile(userId, interaction);
    await this.analyzeAndLearn(interaction);
    // עדכון מדדים מייד לאחר רישום אינטראקציה, כדי לשקף ב-/learning/stats
    await this.updateMetrics();
    
    return interactionId;
  }

  /**
   * עדכון feedback של המשתמש על האינטראקציה
   */
  public async updateFeedback(
    interactionId: string,
    feedback: 'positive' | 'negative' | 'neutral'
  ): Promise<void> {
    const interaction = this.interactions.get(interactionId);
    if (!interaction) return;

    interaction.userFeedback = feedback;
    interaction.success = feedback === 'positive';
    
    await this.updateMetrics();
    await this.refinePatterns();
  }

  /**
   * קבלת המלצות לשיפור על בסיס למידה
   */
  public async getImprovementRecommendations(userId?: string): Promise<{
    personalizedSuggestions: string[];
    generalImprovements: string[];
    modelOptimizations: { model: string; suggestion: string }[];
  }> {
    const personalizedSuggestions: string[] = [];
    const generalImprovements: string[] = [];
    const modelOptimizations: { model: string; suggestion: string }[] = [];

    // הצעות אישיות
    if (userId) {
      const profile = this.userProfiles.get(userId);
      if (profile) {
        personalizedSuggestions.push(
          ...this.generatePersonalizedSuggestions(profile)
        );
      }
    }

    // שיפורים כלליים
    generalImprovements.push(...this.analyzeGeneralPatterns());

    // אופטימיזציה של מודלים
    modelOptimizations.push(...this.analyzeModelPerformance());

    return {
      personalizedSuggestions,
      generalImprovements,
      modelOptimizations
    };
  }

  /**
   * קבלת תחזית איכות לבקשה חדשה
   */
  public async predictResponseQuality(
    userInput: string,
    userId?: string,
    modelToUse?: string
  ): Promise<{
    expectedSuccessRate: number;
    estimatedResponseTime: number;
    recommendedModel: string;
    confidenceScore: number;
    reasoningPath: string[];
  }> {
    const inputPatterns = this.extractPatterns(userInput);
    const userProfile = userId ? this.userProfiles.get(userId) : null;
    
    let expectedSuccessRate = 0.7; // ברירת מחדל
    let estimatedResponseTime = 2000;
    let recommendedModel = 'gpt-4o';
    const reasoningPath: string[] = [];

    // ניתוח דפוסים דומים
    for (const pattern of inputPatterns) {
      const learningPattern = this.patterns.get(pattern);
      if (learningPattern) {
        expectedSuccessRate = Math.max(expectedSuccessRate, learningPattern.successRate);
        estimatedResponseTime = Math.min(estimatedResponseTime, learningPattern.averageResponseTime);
        if (learningPattern.preferredModel) {
          recommendedModel = learningPattern.preferredModel;
        }
        reasoningPath.push(`מצאתי דפוס דומה: ${pattern} (הצלחה: ${(learningPattern.successRate * 100).toFixed(1)}%)`);
      }
    }

    // התאמה אישית
    if (userProfile) {
      reasoningPath.push(`התאמה לפרופיל משתמש: ${userProfile.communicationStyle} style`);
      if (userProfile.topicsOfInterest.some(topic => 
        userInput.toLowerCase().includes(topic.toLowerCase())
      )) {
        expectedSuccessRate += 0.1;
        reasoningPath.push('נושא מעניין את המשתמש - הגברת רמת הצלחה');
      }
    }

    const confidenceScore = this.calculateConfidenceScore(inputPatterns.length, userProfile !== null);

    return {
      expectedSuccessRate: Math.min(expectedSuccessRate, 1.0),
      estimatedResponseTime,
      recommendedModel,
      confidenceScore,
      reasoningPath
    };
  }

  /**
   * יצירת פרופיל משתמש אישי
   */
  private async updateUserProfile(userId: string, interaction: InteractionData): Promise<void> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        preferredComplexity: 'medium',
        communicationStyle: 'casual',
        responseLength: 'medium',
        topicsOfInterest: [],
        learningGoals: [],
        interactionHistory: []
      };
    }

    profile.interactionHistory.push(interaction);
    
    // ניתוח העדפות על בסיס היסטוריה
    if (profile.interactionHistory.length >= 5) {
      profile.preferredComplexity = this.analyzePreferredComplexity(profile.interactionHistory);
      profile.communicationStyle = this.analyzeCommunicationStyle(profile.interactionHistory);
      profile.topicsOfInterest = this.extractTopicsOfInterest(profile.interactionHistory);
    }

    this.userProfiles.set(userId, profile);
  }

  private async analyzeAndLearn(interaction: InteractionData): Promise<void> {
    const patterns = this.extractPatterns(interaction.userInput);
    
    for (const pattern of patterns) {
      let learningPattern = this.patterns.get(pattern);
      
      if (!learningPattern) {
        learningPattern = {
          pattern,
          occurrences: 0,
          successRate: 0,
          averageResponseTime: 0,
          preferredModel: interaction.modelUsed,
          contextualTriggers: [],
          improvementSuggestions: []
        };
      }

      learningPattern.occurrences++;
      learningPattern.averageResponseTime = 
        (learningPattern.averageResponseTime * (learningPattern.occurrences - 1) + interaction.responseTime) / 
        learningPattern.occurrences;

      // עדכון rate הצלחה (נעדכן כאשר נקבל feedback)
      this.patterns.set(pattern, learningPattern);
    }
  }

  private extractPatterns(text: string): string[] {
    const patterns: string[] = [];
    const words = text.toLowerCase().split(/\s+/);
    
    // דפוסי מילות מפתח
    const keywords = ['explain', 'how', 'what', 'why', 'create', 'build', 'fix', 'optimize'];
    keywords.forEach(keyword => {
      if (words.includes(keyword)) {
        patterns.push(`keyword:${keyword}`);
      }
    });

    // דפוסי אורך
    if (words.length < 5) patterns.push('length:short');
    else if (words.length < 20) patterns.push('length:medium');
    else patterns.push('length:long');

    // דפוסי שפה טכנית
    const technicalTerms = ['code', 'function', 'api', 'database', 'server', 'frontend', 'backend'];
    if (technicalTerms.some(term => text.toLowerCase().includes(term))) {
      patterns.push('domain:technical');
    }

    return patterns;
  }

  private generatePersonalizedSuggestions(profile: PersonalizationProfile): string[] {
    const suggestions: string[] = [];
    
    if (profile.interactionHistory.length > 0) {
      const avgResponseTime = profile.interactionHistory.reduce((sum, i) => sum + i.responseTime, 0) / profile.interactionHistory.length;
      
      if (avgResponseTime > 3000) {
        suggestions.push('להעדיף מודלים מקומיים מהירים יותר למשתמש זה');
      }
      
      const successfulInteractions = profile.interactionHistory.filter(i => i.success).length;
      const successRate = successfulInteractions / profile.interactionHistory.length;
      
      if (successRate < 0.8) {
        suggestions.push('לשפר התאמת מורכבות התשובות לסגנון המשתמש');
      }
    }

    return suggestions;
  }

  private analyzeGeneralPatterns(): string[] {
    const improvements: string[] = [];
    
    if (this.improvementMetrics.averageResponseTime > 2500) {
      improvements.push('לבחון שימוש במודלים מקומיים יותר לשיפור זמני תגובה');
    }
    
    if (this.improvementMetrics.userSatisfactionScore < 0.8) {
      improvements.push('לשפר איכות התשובות על ידי הוספת הקשר רלוונטי');
    }

    return improvements;
  }

  private analyzeModelPerformance(): { model: string; suggestion: string }[] {
    const optimizations: { model: string; suggestion: string }[] = [];
    
    // ניתוח ביצועי מודלים
    const modelStats = new Map<string, { total: number; successful: number; avgTime: number }>();
    
    this.interactions.forEach(interaction => {
      if (!modelStats.has(interaction.modelUsed)) {
        modelStats.set(interaction.modelUsed, { total: 0, successful: 0, avgTime: 0 });
      }
      
      const stats = modelStats.get(interaction.modelUsed)!;
      stats.total++;
      if (interaction.success) stats.successful++;
      stats.avgTime = (stats.avgTime * (stats.total - 1) + interaction.responseTime) / stats.total;
    });

    modelStats.forEach((stats, model) => {
      const successRate = stats.successful / stats.total;
      if (successRate < 0.7) {
        optimizations.push({
          model,
          suggestion: `שיפור הנחיות עבור ${model} - רמת הצלחה נמוכה (${(successRate * 100).toFixed(1)}%)`
        });
      }
    });

    return optimizations;
  }

  private analyzePreferredComplexity(history: InteractionData[]): 'low' | 'medium' | 'high' {
    const complexityMap = { low: 0, medium: 0, high: 0 };
    history.forEach(i => complexityMap[i.complexity]++);
    
    return Object.entries(complexityMap).reduce((a, b) => 
      complexityMap[a[0] as keyof typeof complexityMap] > complexityMap[b[0] as keyof typeof complexityMap] ? a : b
    )[0] as 'low' | 'medium' | 'high';
  }

  private analyzeCommunicationStyle(history: InteractionData[]): 'formal' | 'casual' | 'technical' {
    // ניתוח פשוט על בסיס מילות מפתח בבקשות המשתמש
    let formalCount = 0, casualCount = 0, technicalCount = 0;
    
    history.forEach(interaction => {
      const input = interaction.userInput.toLowerCase();
      if (input.includes('please') || input.includes('kindly') || input.includes('would you')) formalCount++;
      if (input.includes('hey') || input.includes('what\'s up') || input.includes('cool')) casualCount++;
      if (input.includes('implement') || input.includes('optimize') || input.includes('algorithm')) technicalCount++;
    });

    if (technicalCount > Math.max(formalCount, casualCount)) return 'technical';
    if (formalCount > casualCount) return 'formal';
    return 'casual';
  }

  private extractTopicsOfInterest(history: InteractionData[]): string[] {
    const topicCounts = new Map<string, number>();
    const topics = ['programming', 'web development', 'machine learning', 'databases', 'api', 'frontend', 'backend'];
    
    history.forEach(interaction => {
      const input = interaction.userInput.toLowerCase();
      topics.forEach(topic => {
        if (input.includes(topic.replace(' ', ''))) {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        }
      });
    });

    return Array.from(topicCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private calculateConfidenceScore(patternMatches: number, hasUserProfile: boolean): number {
    let confidence = 0.5; // בסיס
    confidence += Math.min(patternMatches * 0.1, 0.3); // עד 30% עבור דפוסים
    if (hasUserProfile) confidence += 0.2; // 20% עבור פרופיל משתמש
    return Math.min(confidence, 1.0);
  }

  private async updateMetrics(): Promise<void> {
    this.improvementMetrics.totalInteractions = this.interactions.size;
    this.improvementMetrics.successfulInteractions = 
      Array.from(this.interactions.values()).filter(i => i.success).length;
    
    const totalResponseTime = Array.from(this.interactions.values())
      .reduce((sum, i) => sum + i.responseTime, 0);
    this.improvementMetrics.averageResponseTime = totalResponseTime / this.interactions.size;
    
    this.improvementMetrics.userSatisfactionScore = 
      this.improvementMetrics.successfulInteractions / this.improvementMetrics.totalInteractions;
  }

  private async refinePatterns(): Promise<void> {
    // עדכון דפוסים על בסיס feedback חדש
    this.patterns.forEach((pattern, key) => {
      const relevantInteractions = Array.from(this.interactions.values())
        .filter(i => this.extractPatterns(i.userInput).includes(key));
      
      if (relevantInteractions.length > 0) {
        const successfulCount = relevantInteractions.filter(i => i.success).length;
        pattern.successRate = successfulCount / relevantInteractions.length;
      }
    });
  }

  private generateInteractionId(): string {
    return `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * קבלת סטטיסטיקות למידה
   */
  public getLearningStats() {
    return {
      ...this.improvementMetrics,
      totalPatterns: this.patterns.size,
      totalUsers: this.userProfiles.size,
      averageInteractionsPerUser: this.userProfiles.size > 0 ? 
        Array.from(this.userProfiles.values()).reduce((sum, profile) => sum + profile.interactionHistory.length, 0) / this.userProfiles.size : 0
    };
  }

  /**
   * רשימת אינטראקציות אחרונות (אפשרי לפי משתמש)
   */
  public listInteractions(params?: { userId?: string; limit?: number; offset?: number }): {
    total: number;
    limit: number;
    offset: number;
    items: InteractionData[];
  } {
    const limit = Math.max(0, Math.min(200, params?.limit ?? 20));
    const offset = Math.max(0, params?.offset ?? 0);

    let source: InteractionData[] = [];
    if (params?.userId) {
      const profile = this.userProfiles.get(params.userId);
      source = profile ? [...profile.interactionHistory] : [];
    } else {
      source = Array.from(this.interactions.values());
    }

    // מיון מהחדש לישן
    source.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const total = source.length;
    const items = source.slice(offset, offset + limit);

    return { total, limit, offset, items };
  }

  /**
   * קבלת פרופיל משתמש (עם אפשרות לכלול היסטוריה מוגבלת)
   */
  public getUserProfile(userId: string, options?: { includeHistory?: boolean; historyLimit?: number }):
    | (PersonalizationProfile & { interactionCount: number })
    | null {
    const includeHistory = options?.includeHistory === true;
    const historyLimit = Math.max(0, Math.min(200, options?.historyLimit ?? 20));

    const profile = this.userProfiles.get(userId);
    if (!profile) return null;

    const interactionCount = profile.interactionHistory.length;
    const interactionHistory = includeHistory
      ? profile.interactionHistory
          .slice(Math.max(0, interactionCount - historyLimit))
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      : [];

    return {
      ...profile,
      interactionHistory,
      interactionCount
    } as PersonalizationProfile & { interactionCount: number };
  }

  /**
   * רשימת דפוסי למידה
   */
  public listPatterns(params?: { limit?: number; minOccurrences?: number }) {
    const limit = Math.max(0, Math.min(500, params?.limit ?? 50));
    const minOccurrences = Math.max(0, params?.minOccurrences ?? 0);

    const all = Array.from(this.patterns.values())
      .filter(p => p.occurrences >= minOccurrences)
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, limit);

    return {
      total: this.patterns.size,
      returned: all.length,
      items: all
    };
  }
}