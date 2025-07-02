export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'gemini' | 'claude';
  description: string;
  avatar: string;
}

export interface DebateTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  trending?: boolean;
}

// 新しい型：トレンドトピック
export interface TrendingTopic {
  keyword: string;
  trend: string; // 前日比増減率（例: "+12%"）
  source: 'Google Trends' | 'NewsAPI';
  category: string;
  description: string; // トレンド率の説明
  lastUpdated: string;
  searchVolume?: number; // Google Trendsの場合
  newsCount?: number; // NewsAPIの場合
}

export interface Evidence {
  id: string;
  url: string;
  title: string;
  source: string;
  snippet: string;
  credibility: number;
}

export interface DebateMessage {
  id: string;
  speaker: 'pro' | 'con';
  model: AIModel;
  content: string;
  timestamp: Date;
  stage: DebateStage;
  evidence: Evidence[];
  reactions: number;
}

export interface AudienceQuestion {
  id: string;
  question: string;
  author: string;
  timestamp: Date;
  votes: number;
  answered: boolean;
}

export type DebateStage = 'setup' | 'opening' | 'rebuttal' | 'closing' | 'summary';

export interface DebateConfig {
  topic: DebateTopic;
  proModel: AIModel;
  conModel: AIModel;
  duration: number; // minutes per stage
}

export interface DebateState {
  id: string;
  config: DebateConfig;
  stage: DebateStage;
  messages: DebateMessage[];
  audienceQuestions: AudienceQuestion[];
  startTime: Date;
  currentSpeaker: 'pro' | 'con';
  winner?: 'pro' | 'con' | 'draw';
  summary?: string;
}

export interface DebateHistory {
  id: string;
  topic: string;
  models: [string, string];
  duration: string;
  winner: string;
  status: string;
  createdAt: string;
  messages: Array<{
    id: string;
    speaker: 'pro' | 'con';
    content: string;
    stage: DebateStage;
    timestamp: Date;
    evidence?: Array<{
      title: string;
      summary: string;
    }>;
  }>;
}