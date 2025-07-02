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
      console.error('Gemini API Error Details:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        cause: error instanceof Error ? error.cause : undefined,
      });

      // More specific error message
      let errorMessage = 'Gemini APIの呼び出しに失敗しました';
      if (error instanceof Error) {
        if (error.message.includes('API_KEY')) {
          errorMessage = 'Gemini API キーが無効または設定されていません';
        } else if (error.message.includes('quota')) {
          errorMessage = 'Gemini API の使用制限に達しました';
        } else if (error.message.includes('safety')) {
          errorMessage =
            'Gemini API の安全性フィルターによりブロックされました';
        } else {
          errorMessage = `Gemini API エラー: ${error.message}`;
        }
      }

      throw new Error(errorMessage);
    }
  }
}
