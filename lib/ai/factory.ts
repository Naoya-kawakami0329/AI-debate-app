import { AIModel } from '../types';
import { AIProvider } from './base';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';
import { ClaudeProvider } from './claude-provider';

export class AIProviderFactory {
  static create(model: AIModel): AIProvider {
    const apiKey = this.getApiKey(model.provider);
    
    switch (model.provider) {
      case 'openai':
        return new OpenAIProvider({
          apiKey,
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 800,
        });
        
      case 'gemini':
        return new GeminiProvider({
          apiKey,
          model: 'gemini-1.5-pro',
          temperature: 0.7,
          maxTokens: 800,
        });
        
      case 'claude':
        return new ClaudeProvider({
          apiKey,
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          maxTokens: 800,
        });
        
      default:
        throw new Error(`Unsupported AI provider: ${model.provider}`);
    }
  }
  
  private static getApiKey(provider: 'openai' | 'gemini' | 'claude'): string {
    let apiKey: string | undefined;
    
    switch (provider) {
      case 'openai':
        apiKey = process.env.OPENAI_API_KEY;
        break;
      case 'gemini':
        apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        break;
      case 'claude':
        apiKey = process.env.ANTHROPIC_API_KEY;
        break;
    }
    
    if (!apiKey) {
      throw new Error(`API key for ${provider} is not configured`);
    }
    
    return apiKey;
  }
}