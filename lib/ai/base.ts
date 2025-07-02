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
        return '相手の主張に対して反論してください。相手の論点の弱点を指摘し、あなたの立場を強化してください。';
      case 'closing':
        return '最終主張を述べてください。これまでの議論を総括し、あなたの立場が正しい理由を簡潔にまとめてください。';
      default:
        return '議論を続けてください。';
    }
  }
  
  protected buildUserPrompt(context: DebateContext): string {
    if (context.previousMessages.length === 0) {
      return `「${context.topic}」について、あなたの${context.position === 'pro' ? '賛成' : '反対'}の立場から議論を始めてください。`;
    }
    
    const lastOpponentMessage = [...context.previousMessages]
      .reverse()
      .find(msg => msg.role !== context.position);
    
    if (lastOpponentMessage) {
      const stageContext = context.stage === 'opening' ? 
        '初期段階として、' : 
        context.stage === 'rebuttal' ? 
        '相手の論点に反駁しつつ、' : 
        '最終段階として、';
      
      return `${stageContext}相手の以下の主張に対して、具体的に反駁し、あなたの${context.position === 'pro' ? '賛成' : '反対'}の立場を強化してください：

「${lastOpponentMessage.content}」

あなたの応答では：
1. 相手の主張の弱点や問題点を具体的に指摘してください
2. 反証となるデータや事例があれば提示してください  
3. あなたの立場を支持する新たな論点を追加してください`;
    }
    
    return `議論を続けてください。`;
  }
}