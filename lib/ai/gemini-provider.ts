import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { AIProvider, AIProviderConfig, DebateContext } from './base';

export class GeminiProvider extends AIProvider {
  private genAI: GoogleGenerativeAI;

  constructor(config: AIProviderConfig) {
    super(config);
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }

  async generateDebateMessage(context: DebateContext): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.config.model || 'gemini-1.5-pro',
      });

      const prompt = `${this.buildSystemPrompt(context)}\n\n${this.buildUserPrompt(context)}`;

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: this.config.temperature || 0.7,
          maxOutputTokens: this.config.maxTokens || 800,
          topP: 0.8,
          topK: 40,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      const response = await result.response;
      const text = response.text();

      return text || '申し訳ございません。応答を生成できませんでした。';
    } catch (error) {
      if (error instanceof Error) {
        console.error('Gemini API Error:', error.message);
        if (error.message.includes('timeout')) {
          throw new Error('Gemini API タイムアウト - ネットワークが不安定です');
        }
        if (error.message.includes('401') || error.message.includes('API key')) {
          throw new Error('Gemini APIキーが無効です');
        }
        if (error.message.includes('429')) {
          throw new Error('Gemini API レート制限に達しました');
        }
        throw new Error(`Gemini API エラー: ${error.message}`);
      }
      throw new Error('Gemini APIの呼び出しに失敗しました');
    }
  }
}
