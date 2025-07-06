import {
  DebateState,
  DebateMessage,
  DebateStage,
  AIModel,
  Evidence,
} from './types';
import { EvidenceService } from './services/evidence';

const STAGE_NAMES_JP = {
  opening: 'オープニング',
  rebuttal: '反駁',
  closing: 'クロージング',
  summary: 'サマリー',
  setup: '準備中',
} as const;

const STAGE_ORDER: DebateStage[] = ['setup', 'opening', 'rebuttal', 'closing', 'summary'];

export class DebateEngine {
  private debateState: DebateState;
  private useRealAI: boolean;

  constructor(debateState: DebateState, useRealAI: boolean = false) {
    this.debateState = debateState;
    this.useRealAI = useRealAI;
  }

  updateStage(stage: DebateStage): void {
    this.debateState.stage = stage;
  }

  getCurrentStage(): DebateStage {
    return this.debateState.stage;
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
          content = this.generateMockMessage(stage, speaker, model);
        }
      } else {
        content = this.generateMockMessage(stage, speaker, model);
      }


      const isDuplicate = this.debateState.messages.some(

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

    const previousMessages = this.debateState.messages.map((msg) => ({

      role: msg.speaker,
      content: msg.content,
    }));

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
      const topic = this.debateState.config.topic.title;
    const position = speaker === 'pro' ? '賛成' : '反対';
    const stageJp = STAGE_NAMES_JP[stage];

    return `【${model.name}より】${topic}について、${position}の立場から${stageJp}の発言をします。[AI接続エラー: このメッセージは一時的なフォールバックです。API設定を確認してください。]`;
  }

  private async searchEvidence(
    content: string,
    speaker: 'pro' | 'con'
  ): Promise<Evidence[]> {
    try {
      const keyPoints = this.extractKeyPoints(content);
      const topic = this.debateState.config.topic.title;

      if (keyPoints.length > 0) {
        const evidence = await EvidenceService.searchEvidence({
          query: keyPoints.join(' '),
          topic: topic,
        });

        return evidence.slice(0, 2);
      }
    } catch (error) {
    }
    return [];
  }

  private extractKeyPoints(content: string): string[] {
    const keywords: string[] = [];

    const importantPatterns = [
      /「([^」]+)」/g,
      /(\S+(?:について|に関して|における))/g,
      /(\S+(?:効果|影響|問題|課題|利益|リスク))/g,
    ];

    for (const pattern of importantPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        if (match[1] && match[1].length > 2) {
          keywords.push(match[1]);
        }
      }
    }

    return Array.from(new Set(keywords)).slice(0, 3);
  }



  async nextStage(): Promise<DebateStage> {
    const currentIndex = STAGE_ORDER.indexOf(this.debateState.stage);

    if (currentIndex < STAGE_ORDER.length - 1) {
      return STAGE_ORDER[currentIndex + 1];

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

  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const matrix = [];

    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLength = Math.max(s1.length, s2.length);
    const distance = matrix[s2.length][s1.length];
    return 1 - distance / maxLength;
  }
}
