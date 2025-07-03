'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Clock,
  TrendingUp,
  MessageCircle,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { TrendingTopic, DebateHistory } from '@/lib/types';
import { TrendsService } from '@/lib/services/trends';
import { getRecentDebatesAction } from '@/lib/actions/debate-actions';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function Home() {
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [trendsLastUpdated, setTrendsLastUpdated] = useState<string>('');
  const [isLoadingTrends, setIsLoadingTrends] = useState(true);
  const [recentDebates, setRecentDebates] = useState<DebateHistory[]>([]);
  const [isLoadingDebates, setIsLoadingDebates] = useState(true);

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
        setRecentDebates([]);
      }
    } catch (error) {
      console.error('Failed to load recent debates:', error);
      setRecentDebates([]);
    } finally {
      setIsLoadingDebates(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* ヘッダー */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent px-2">
            AI vs AI ディベート観戦
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            最先端のAIモデル同士が繰り広げる白熱した議論を観戦し、知識を深めよう
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
            <Link href="/setup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Play className="mr-2 h-5 w-5" />
                新しいディベートを開始
              </Button>
            </Link>
            <Link href="/history" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-lg">
                <MessageCircle className="mr-2 h-5 w-5" />
                履歴を見る
              </Button>
            </Link>
          </div>
        </div>

        {/* 人気のトピック（リアルタイム更新） */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <CardTitle className="text-lg sm:text-xl">人気のトピック</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  自動更新
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">最終更新:</span>
                {trendsLastUpdated
                  ? format(new Date(trendsLastUpdated), 'M月d日 HH:mm', {
                      locale: ja,
                    })
                  : '読み込み中...'}
              </div>
            </div>
            <CardDescription>
              Google Trends と NewsAPI から取得した最新の話題トピック（毎日12:00
              JST更新）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {isLoadingTrends
                ? // Loading skeleton
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="p-4 bg-muted rounded-lg animate-pulse"
                    >
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  ))
                : trendingTopics.map((item, index) => (
                    <div
                      key={`trending-${item.keyword}-${index}`}
                      className="p-4 bg-muted rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm">
                          {item.keyword}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={`text-xs font-bold ${
                            item.trend.startsWith('+')
                              ? 'text-green-600'
                              : 'text-red-600'
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
                          {item.source === 'Google Trends'
                            ? '🔍 Trends'
                            : '📰 News'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>

            {/* データソース説明 */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 mb-1">
                    トレンド率について
                  </p>
                  <ul className="text-blue-700 space-y-1">
                    <li>
                      • <strong>🔍 Trends</strong>: Google検索の前日比増減率
                    </li>
                    <li>
                      • <strong>📰 News</strong>: ニュース言及の前日比増減率
                    </li>
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <MessageCircle className="h-5 w-5" />
                最近のディベート
              </CardTitle>
              <Link href="/history">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  すべて見る
                </Button>
              </Link>
            </div>
            <CardDescription>
              完了したディベートの結果を確認できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingDebates ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, index) => (
                  <Card
                    key={`debate-skeleton-${index}`}
                    className="animate-pulse"
                  >
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))
              ) : recentDebates.length > 0 ? (
                recentDebates.map((debate) => (
                  <Link key={debate.id} href={`/history/${debate.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-2 text-sm sm:text-base">
                              {debate.topic}
                            </h3>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
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
                          <div className="text-left sm:text-right">
                            <Badge
                              variant={
                                debate.winner === '引き分け'
                                  ? 'secondary'
                                  : 'default'
                              }
                              className="text-xs"
                            >
                              勝者: {debate.winner}
                            </Badge>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                              {debate.status}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    まだディベートの履歴がありません
                  </p>
                  <Link href="/setup">
                    <Button>新しいディベートを開始</Button>
                  </Link>
                </div>
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
