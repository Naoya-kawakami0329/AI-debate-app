'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, TrendingUp, MessageCircle, RefreshCw, Calendar } from 'lucide-react';
import DebateSetup from '@/components/DebateSetup';
import DebateViewer from '@/components/DebateViewer';
import { DebateConfig, DebateState, TrendingTopic, DebateHistory } from '@/lib/types';
import { TrendsService } from '@/lib/services/trends';
import { getRecentDebatesAction } from '@/lib/actions/debate-actions';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type AppState = 'home' | 'setup' | 'debate' | 'history';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('home');
  const [currentDebate, setCurrentDebate] = useState<DebateState | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [trendsLastUpdated, setTrendsLastUpdated] = useState<string>('');
  const [isLoadingTrends, setIsLoadingTrends] = useState(true);
  const [recentDebates, setRecentDebates] = useState<DebateHistory[]>([]);
  const [isLoadingDebates, setIsLoadingDebates] = useState(true);
  const [selectedDebateHistory, setSelectedDebateHistory] = useState<DebateHistory | null>(null);

  const handleStartDebate = (config: DebateConfig) => {
    const newDebate: DebateState = {
      id: `debate-${Date.now()}`,
      config,
      stage: 'setup',
      messages: [],
      audienceQuestions: [],
      startTime: new Date(),
      currentSpeaker: 'pro'
    };
    
    setCurrentDebate(newDebate);
    setAppState('debate');
  };

  const handleBackToHome = () => {
    setAppState('home');
    setCurrentDebate(null);
  };

  const handleDebateSaved = () => {
    // Refresh recent debates when a debate is saved
    loadRecentDebates();
  };

  const handleViewHistory = (debate: DebateHistory) => {
    setSelectedDebateHistory(debate);
    setAppState('history');
  };

  useEffect(() => {
    loadTrends();
    loadRecentDebates();
  }, []);

  const loadTrends = async () => {
    setIsLoadingTrends(true);
    try {
      const response = await TrendsService.fetchTrends();
      setTrendingTopics(response.trends);
      setTrendsLastUpdated(response.lastUpdated);
    } catch (error) {
      console.error('Failed to load trends:', error);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  const loadRecentDebates = async () => {
    setIsLoadingDebates(true);
    try {
      const result = await getRecentDebatesAction(5);
      if (result.success) {
        setRecentDebates(result.debates);
      } else {
        console.error('Failed to load recent debates:', result.error);
        // Empty array as fallback
        setRecentDebates([]);
      }
    } catch (error) {
      console.error('Failed to load recent debates:', error);
      // Empty array as fallback
      setRecentDebates([]);
    } finally {
      setIsLoadingDebates(false);
    }
  };


  if (appState === 'setup') {
    return <DebateSetup onStartDebate={handleStartDebate} />;
  }

  if (appState === 'debate' && currentDebate) {
    return <DebateViewer initialState={currentDebate} onBack={handleBackToHome} onDebateSaved={handleDebateSaved} />;
  }

  if (appState === 'history' && selectedDebateHistory) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBackToHome}>
            ← ホームに戻る
          </Button>
        </div>

        {/* ディベート履歴詳細 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{selectedDebateHistory.topic}</CardTitle>
            <div className="flex justify-center gap-8 mt-4">
              <div className="flex items-center gap-2">
                <div className="text-2xl">🧠</div>
                <div className="text-center">
                  <p className="font-semibold text-green-600">{selectedDebateHistory.models[0]}</p>
                  <p className="text-xs text-muted-foreground">賛成側</p>
                </div>
              </div>
              <div className="text-2xl">🥊</div>
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <p className="font-semibold text-red-600">{selectedDebateHistory.models[1]}</p>
                  <p className="text-xs text-muted-foreground">反対側</p>
                </div>
                <div className="text-2xl">💎</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">勝者</p>
                <p className="font-semibold text-lg">{selectedDebateHistory.winner}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">時間</p>
                <p className="font-semibold text-lg">{selectedDebateHistory.duration}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">ステータス</p>
                <p className="font-semibold text-lg">{selectedDebateHistory.status}</p>
              </div>
            </div>
            
            {/* 基本情報 */}
            <div className="p-4 bg-muted rounded-lg mb-4">
              <p className="text-sm text-muted-foreground mb-2">作成日時</p>
              <p className="font-medium">
                {selectedDebateHistory.createdAt ? 
                  format(new Date(selectedDebateHistory.createdAt), 'yyyy年M月d日 HH:mm', { locale: ja }) 
                  : '不明'
                }
              </p>
            </div>

            {/* メッセージ履歴の詳細表示 */}
            {selectedDebateHistory.messages && selectedDebateHistory.messages.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">💬 ディベートの流れ</h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {selectedDebateHistory.messages.map((message, index) => (
                    <div key={`message-${message.id}-${index}`} className={`p-4 rounded-lg border ${
                      message.speaker === 'pro' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-lg">
                          {message.speaker === 'pro' ? '🧠' : '💎'}
                        </div>
                        <span className={`font-semibold ${
                          message.speaker === 'pro' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {message.speaker === 'pro' ? selectedDebateHistory.models[0] : selectedDebateHistory.models[1]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({message.stage === 'opening' ? 'オープニング' : 
                            message.stage === 'rebuttal' ? '反駁' : 
                            message.stage === 'closing' ? 'クロージング' : message.stage})
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      {message.evidence && message.evidence.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-muted-foreground mb-1">📄 参照資料:</p>
                          {message.evidence.map((evidence, evidenceIndex) => (
                            <div key={`evidence-${message.id}-${evidenceIndex}`} className="text-xs bg-white p-2 rounded border">
                              <p className="font-medium">{evidence.title}</p>
                              <p className="text-muted-foreground">{evidence.summary}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  📝 このディベートにはメッセージ履歴が保存されていません
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* ヘッダー */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            AI vs AI ディベート観戦
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            最先端のAIモデル同士が繰り広げる白熱した議論を観戦し、知識を深めよう
          </p>
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => setAppState('setup')}
              size="lg"
              className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Play className="mr-2 h-5 w-5" />
              新しいディベートを開始
            </Button>
          </div>
        </div>

        {/* 人気のトピック（リアルタイム更新） */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <CardTitle>人気のトピック</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  自動更新
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                最終更新: {trendsLastUpdated ? format(new Date(trendsLastUpdated), 'M月d日 HH:mm', { locale: ja }) : '読み込み中...'}
              </div>
            </div>
            <CardDescription>
              Google Trends と NewsAPI から取得した最新の話題トピック（毎日12:00 JST更新）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingTrends ? (
                // Loading skeleton
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="p-4 bg-muted rounded-lg animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))
              ) : (
                trendingTopics.map((item, index) => (
                  <div key={`trending-${item.keyword}-${index}`} className="p-4 bg-muted rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">{item.keyword}</h3>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs font-bold ${
                          item.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {item.trend}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          item.source === 'Google Trends' 
                            ? 'border-blue-500 text-blue-600' 
                            : 'border-green-500 text-green-600'
                        }`}
                      >
                        {item.source === 'Google Trends' ? '🔍 Trends' : '📰 News'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* データソース説明 */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 mb-1">トレンド率について</p>
                  <ul className="text-blue-700 space-y-1">
                    <li>• <strong>🔍 Trends</strong>: Google検索の前日比増減率</li>
                    <li>• <strong>📰 News</strong>: ニュース言及の前日比増減率</li>
                    <li>• 毎日12:00 JST に自動更新（Cronジョブ）</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 最近のディベート */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              最近のディベート
            </CardTitle>
            <CardDescription>
              完了したディベートの結果を確認できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingDebates ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={`debate-skeleton-${index}`} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                recentDebates.map((debate) => (
                  <Card 
                    key={debate.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewHistory(debate)}
                  >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">{debate.topic}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>🧠 {debate.models[0]}</span>
                            <span>vs</span>
                            <span>💎 {debate.models[1]}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {debate.duration}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={debate.winner === '引き分け' ? 'secondary' : 'default'}>
                          勝者: {debate.winner}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">{debate.status}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* フッター */}
        <div className="text-center text-muted-foreground">
          <p className="text-sm">
            AI vs AI ディベート観戦アプリ - 知識と議論の新しい体験
          </p>
        </div>
      </div>
    </div>
  );
}