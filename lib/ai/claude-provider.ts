import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIProviderConfig, DebateContext } from './base';

export class ClaudeProvider extends AIProvider {
  private client: Anthropic;
  
  constructor(config: AIProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }
  
  async generateDebateMessage(context: DebateContext): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 800,
        temperature: this.config.temperature || 0.7,
        system: this.buildSystemPrompt(context),
        messages: [
          {
            role: 'user',
            content: this.buildUserPrompt(context),
          },
        ],
      });
      
      const content = message.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      
      return '申し訳ございません。応答を生成できませんでした。';
    } catch (error) {
      console.error('Claude API Error:', error);
      throw new Error('Claude APIの呼び出しに失敗しました');
    }
  }
}