import { DebateStage } from '../types';

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface DebateContext {
  topic: string;
  stage: DebateStage;
  position: 'pro' | 'con';
  previousMessages: Array<{
    role: 'pro' | 'con';
    content: string;
  }>;
}

export abstract class AIProvider {
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract generateDebateMessage(context: DebateContext): Promise<string>;

  protected buildSystemPrompt(context: DebateContext): string {
    const positionText = context.position === 'pro' ? '賛成' : '反対';
    const stageInstructions = this.getStageInstructions(context.stage);

    return `あなたは「${context.topic}」について${positionText}の立場でディベートを行う専門家です。

現在のステージ: ${context.stage}
${stageInstructions}

簡潔な議論のガイドライン:
- 最も重要な論点を2-3個に絞って論じてください
- 具体的な事例やデータを1つ含めてください
- 論理的で説得力のある論証を心がけてください
- 日本語で300-500文字程度（約10行）で簡潔に述べてください
- 相手の立場に対する配慮も示してください

重要な注意事項:
- 冗長な説明は避け、要点を明確に伝えてください
- 1つの段落は3-4文で構成してください
- 読みやすく、理解しやすい構造で論理を組み立ててください`;
  }

  protected getStageInstructions(stage: DebateStage): string {
    switch (stage) {
      case 'opening':
        return '初期主張を展開してください。あなたの立場の根拠と主要な論点を明確に示してください。';
      case 'rebuttal':
        return '反駁段階です。相手は既にopeningで明確な主張を述べています。相手の主張に対して直接反論してください。「まだ主張を述べていない」「主張を聞く必要がある」などの発言は完全に禁止です。「相手は○○と述べていますが」で始めて、相手の主張の問題点を具体的に指摘し、論理的に反駁してください。';
      case 'closing':
        return 'ディベートの最終段階です。これまでの議論全体を振り返り、なぜあなたの立場が最も説得力があるのかを総括してください。感情的な訴えかけや決定的な結論を含めて、聴衆の心に残る最終主張を行ってください。';
      default:
        return '議論を続けてください。';
    }
  }

  protected buildUserPrompt(context: DebateContext): string {
    if (context.stage === 'closing') {
      return `ディベートの最終段階です。「${context.topic}」について、あなたの${context.position === 'pro' ? '賛成' : '反対'}の立場から説得力のある最終主張を行ってください。

これまでの議論を振り返り、以下を含む総括的な発言を行ってください：
1. これまでの議論の要点をまとめてください
2. なぜあなたの立場が最も合理的で説得力があるのかを明確に示してください
3. 聴衆の心に響く、印象に残る結論を述べてください
4. 将来への展望や行動の呼びかけを含めてください

注意：相手への直接的な反駁ではなく、これまでの議論全体を踏まえた建設的で説得力のある最終主張を心がけてください。`;
    }

    if (context.previousMessages.length === 0) {
      return `「${context.topic}」について、あなたの${context.position === 'pro' ? '賛成' : '反対'}の立場から議論を始めてください。`;
    }

    const lastOpponentMessage = [...context.previousMessages]
      .reverse()
      .find((msg) => msg.role !== context.position);
    

    if (lastOpponentMessage) {
      if (context.stage === 'rebuttal') {
        return this.buildRebuttalPrompt(lastOpponentMessage.content);
      } else {
        return `初期段階として、相手の以下の主張に対して、具体的に反駁し、あなたの${context.position === 'pro' ? '賛成' : '反対'}の立場を強化してください：

「${lastOpponentMessage.content}」

あなたの応答では：
1. 相手の主張の弱点や問題点を具体的に指摘してください
2. 反証となるデータや事例があれば提示してください  
3. あなたの立場を支持する新たな論点を追加してください`;
      }
    }

    if (context.stage === 'rebuttal') {
      const opponentMessages = context.previousMessages.filter(msg => msg.role !== context.position);
      const opponentContent = opponentMessages.length > 0 
        ? opponentMessages.map(msg => msg.content).join('\n\n')
        : '相手の主張';
      return this.buildRebuttalPrompt(opponentContent);
    }

    return `議論を続けてください。`;
  }

  private buildRebuttalPrompt(opponentContent: string): string {
    return `これは反駁段階です。相手は既にopeningで主張を行っています。以下が相手の具体的な主張です：

「${opponentContent}」

この相手の主張に対して、前置きなしで即座に反論してください：

必須の指示：
- 相手は既に明確な主張を述べています
- 「相手は○○と述べていますが」で直接始めてください
- 「まだ主張を述べていない」「主張を聞く必要がある」などの発言は完全に禁止です
- 相手の主張の具体的な問題点をすぐに指摘してください
- 論理的根拠で反証を簡潔に提示してください

例：「相手は○○と主張していますが、この見解は根本的に誤っています。実際には...」

相手の主張は上記に明記されているので、それに対する具体的な反駁を行ってください。`;
  }
}
