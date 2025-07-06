import OpenAI from 'openai';
import { AIProvider, AIProviderConfig, DebateContext } from './base';

export class OpenAIProvider extends AIProvider {
  private client: OpenAI;

  constructor(config: AIProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async generateDebateMessage(context: DebateContext): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(context),
          },
          {
            role: 'user',
            content: this.buildUserPrompt(context),
          },
        ],
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 800,
      });

      return (
        completion.choices[0]?.message?.content ||
        '申し訳ございません。応答を生成できませんでした。'
      );
    } catch (error) {
      if (error instanceof Error) {
        console.error('OpenAI API Error:', error.message);
        if (error.message.includes('timeout')) {
          throw new Error('OpenAI API タイムアウト - ネットワークが不安定です');
        }
        if (error.message.includes('401')) {
          throw new Error('OpenAI APIキーが無効です');
        }
        if (error.message.includes('429')) {
          throw new Error('OpenAI API レート制限に達しました');
        }
        throw new Error(`OpenAI API エラー: ${error.message}`);
      }
      throw new Error('OpenAI APIの呼び出しに失敗しました');
    }
  }
}
