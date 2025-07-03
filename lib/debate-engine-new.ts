import {
  DebateState,
  DebateMessage,
  DebateStage,
  AIModel,
  Evidence,
} from './types';
import { EvidenceService } from './services/evidence';

export class DebateEngine {
  private debateState: DebateState;
  private useRealAI: boolean;

  constructor(debateState: DebateState, useRealAI: boolean = false) {
    this.debateState = debateState;
    this.useRealAI = useRealAI;
    this.checkAIConfiguration();
  }

  private async checkAIConfiguration(): Promise<void> {
    try {
      const response = await fetch('/api/ai/config');
      const config = await response.json();
    } catch (error) {
      console.error('Failed to check AI configuration:', error);
    }
  }

  async generateMessage(
    stage: DebateStage,
    speaker: 'pro' | 'con',
    currentMessages?: DebateMessage[]
  ): Promise<DebateMessage> {
    const model =
      speaker === 'pro'
        ? this.debateState.config.proModel
        : this.debateState.config.conModel;

    let content: string;
    let attempts = 0;
    const maxAttempts = 3;

    do {
      attempts++;

      if (this.useRealAI) {
        try {
          content = await this.generateRealAIMessage(stage, speaker, model, currentMessages);
        } catch (error) {
          console.error(
            'Failed to generate AI message, falling back to mock:',
            {
              error: error instanceof Error ? error.message : error,
              provider: model.provider,
              stage,
              speaker,
            }
          );
          content = this.generateMockMessage(stage, speaker, model);
        }
      } else {
        content = this.generateMockMessage(stage, speaker, model);
      }

      // Check for duplicate content using current messages
      const messages = currentMessages || this.debateState.messages;
      const isDuplicate = messages.some(
        (msg) =>
          msg.content.trim().toLowerCase() === content.trim().toLowerCase() ||
          this.calculateSimilarity(msg.content, content) > 0.8
      );

      if (!isDuplicate) {
        break;
      }

      if (attempts >= maxAttempts) {
        const speakerLabel = speaker === 'pro' ? '賛成側' : '反対側';
        content = `${content} [${speakerLabel}の追加意見]`;
        break;
      }
    } while (attempts < maxAttempts);

    // Attach evidence
    const evidence = await this.searchEvidence(content, speaker);

    return {
      id: `msg-${Date.now()}-${Math.random()}`,
      speaker,
      model,
      content,
      timestamp: new Date(),
      stage,
      evidence,
      reactions: 0,
    };
  }

  private async generateRealAIMessage(
    stage: DebateStage,
    speaker: 'pro' | 'con',
    model: AIModel,
    currentMessages?: DebateMessage[]
  ): Promise<string> {
    // Build context from previous messages
    const messages = currentMessages || this.debateState.messages;
    const previousMessages = messages.map((msg) => ({
      role: msg.speaker,
      content: msg.content,
    }));

    // Call server-side API to generate AI message
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stage,
        position: speaker,
        topic: this.debateState.config.topic.title,
        previousMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          `HTTP ${response.status}: Failed to generate AI message`
      );
    }

    const result = await response.json();
    return result.content;
  }

  private generateMockMessage(
    stage: DebateStage,
    speaker: 'pro' | 'con',
    model: AIModel
  ): string {
    // Simple fallback message when AI is not available
    const topic = this.debateState.config.topic.title;
    const position = speaker === 'pro' ? '賛成' : '反対';
    const stageJp = {
      opening: 'オープニング',
      rebuttal: '反駁',
      closing: 'クロージング',
      summary: 'サマリー',
      setup: '準備中',
    }[stage];

    return `【${model.name}より】${topic}について、${position}の立場から${stageJp}の発言をします。[AI接続エラー: このメッセージは一時的なフォールバックです。API設定を確認してください。]`;
  }

  private async searchEvidence(
    content: string,
    speaker: 'pro' | 'con'
  ): Promise<Evidence[]> {
    // Try to search for real evidence
    try {
      // Extract key points from the message for evidence search
      const keyPoints = this.extractKeyPoints(content);
      const topic = this.debateState.config.topic.title;

      if (keyPoints.length > 0) {
        const evidence = await EvidenceService.searchEvidence({
          query: keyPoints.join(' '),
          topic: topic,
        });

        // Return up to 2 evidence items
        return evidence.slice(0, 2);
      }
    } catch (error) {
      console.error('Failed to search evidence:', error);
    }

    // Fallback to mock evidence
    return this.selectMockEvidence();
  }

  private extractKeyPoints(content: string): string[] {
    // Simple keyword extraction (in production, use NLP)
    const keywords: string[] = [];

    // Extract nouns and important phrases
    const importantPatterns = [
      /「([^」]+)」/g, // Quoted text
      /(\S+(?:について|に関して|における))/g, // Topics
      /(\S+(?:効果|影響|問題|課題|利益|リスク))/g, // Important concepts
    ];

    for (const pattern of importantPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        if (match[1] && match[1].length > 2) {
          keywords.push(match[1]);
        }
      }
    }

    return Array.from(new Set(keywords)).slice(0, 3); // Return unique keywords
  }

  private selectMockEvidence(): Evidence[] {
    // Return empty array for mock evidence
    // Real evidence is fetched from EvidenceService
    return [];
  }

  async nextStage(currentStage?: DebateStage): Promise<DebateStage> {
    const stageOrder: DebateStage[] = [
      'setup',
      'opening',
      'rebuttal',
      'closing',
      'summary',
    ];
    
    // 現在のステージを外部から受け取る場合はそれを使用
    const stage = currentStage || this.debateState.stage;
    const currentIndex = stageOrder.indexOf(stage);

    if (currentIndex < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIndex + 1];
      // 内部状態も更新（後方互換性のため）
      this.debateState.stage = nextStage;
      return nextStage;
    }

    return stage;
  }

  generateSummary(): string {
    const topic = this.debateState.config.topic.title;
    const proModel = this.debateState.config.proModel.name;
    const conModel = this.debateState.config.conModel.name;

    const summaries = [
      `「${topic}」について、${proModel}と${conModel}による白熱した議論が繰り広げられました。両者とも説得力のある論証を展開し、この複雑な問題の多面性が浮き彫りになりました。`,
      `今回のディベートでは、「${topic}」という重要な議題について深い洞察が得られました。${proModel}の積極的なアプローチと${conModel}の慎重な分析により、バランスの取れた議論となりました。`,
      `「${topic}」に関する本日の議論は、現代社会が直面する重要な課題について考える良い機会となりました。${proModel}と${conModel}それぞれの視点から、問題の核心に迫ることができました。`,
    ];

    return summaries[Math.floor(Math.random() * summaries.length)];
  }

  // 文字列類似度計算メソッド（Levenshtein距離ベース）
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const matrix = [];

    // 初期化
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    // 動的プログラミング
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 置換
            matrix[i][j - 1] + 1, // 挿入
            matrix[i - 1][j] + 1 // 削除
          );
        }
      }
    }

    const maxLength = Math.max(s1.length, s2.length);
    const distance = matrix[s2.length][s1.length];
    return 1 - distance / maxLength;
  }
}
