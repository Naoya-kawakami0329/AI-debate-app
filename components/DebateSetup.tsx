'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { AIModel, DebateTopic, DebateConfig, TrendingTopic } from '@/lib/types';
import { TrendsService } from '@/lib/services/trends';
import { DatabaseService } from '@/lib/services/database';

interface DebateSetupProps {
  onStartDebate: (config: DebateConfig) => void;
}

export default function DebateSetup({ onStartDebate }: DebateSetupProps) {
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<DebateTopic | null>(null);
  const [proModel, setProModel] = useState<AIModel | null>(null);
  const [conModel, setConModel] = useState<AIModel | null>(null);
  const [duration, setDuration] = useState(3);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(true);
  const [availableTopics, setAvailableTopics] = useState<DebateTopic[]>([]);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);

  const handleStart = () => {
    if (!selectedTopic && !customTopic) return;
    if (!proModel || !conModel) return;

    const topic = selectedTopic || {
      id: 'custom',
      title: customTopic,
      description: 'カスタムトピック',
      category: 'その他',
    };

    onStartDebate({
      topic,
      proModel,
      conModel,
      duration,
    });
  };

  const isReady = (selectedTopic || customTopic) && proModel && conModel;

  useEffect(() => {
    loadTrends();
    loadTopicsAndModels();
  }, []);

  const loadTrends = async () => {
    setIsLoadingTrends(true);
    try {
      const response = await TrendsService.fetchTrends();
      setTrendingTopics(response.trends);
    } catch (error) {
      console.error('Failed to load trends:', error);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  const loadTopicsAndModels = async () => {
    try {
      const [topics, models] = await Promise.all([
        DatabaseService.getTopics(),
        DatabaseService.getAIModels(),
      ]);

      // Use database data if available
      setAvailableTopics(topics);
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load topics and models:', error);
      // Empty arrays if database fails
      setAvailableTopics([]);
      setAvailableModels([]);
    }
  };

  const selectTrendingTopic = (trend: TrendingTopic) => {
    const topic: DebateTopic = {
      id: `trend-${trend.keyword}`,
      title: `${trend.keyword}について議論する`,
      description: trend.description,
      category: trend.category,
      trending: true,
    };

    // 同じトピックをクリックした場合は選択解除
    if (selectedTopic?.id === topic.id) {
      setSelectedTopic(null);
    } else {
      setSelectedTopic(topic);
      setCustomTopic('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent px-2">
          AI vs AI ディベート設定
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground px-4">
          AIモデル同士の白熱した議論を観戦しよう
        </p>
      </div>

      {/* トピック選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            ディベートトピック
          </CardTitle>
          <CardDescription>
            議論したいトピックを選択するか、カスタムトピックを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* トレンドトピック */}
          {trendingTopics.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <h3 className="font-semibold text-sm">今話題のトピック</h3>
                <Badge variant="secondary" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  リアルタイム
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {trendingTopics.slice(0, 3).map((trend) => (
                  <Card
                    key={trend.keyword}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTopic?.title?.includes(trend.keyword)
                        ? 'ring-2 ring-green-500'
                        : ''
                    }`}
                    onClick={() => selectTrendingTopic(trend)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            trend.trend.startsWith('+')
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {trend.trend}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {trend.source === 'Google Trends' ? '🔍' : '📰'}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm mb-1">
                        {trend.keyword}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {trend.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 推奨トピック */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">推奨トピック</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {availableTopics.map((topic) => (
                <Card
                  key={topic.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTopic?.id === topic.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => {
                    if (selectedTopic?.id === topic.id) {
                      // 同じトピックをクリックした場合は選択解除
                      setSelectedTopic(null);
                    } else {
                      // 新しいトピックを選択
                      setSelectedTopic(topic);
                      setCustomTopic('');
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={topic.trending ? 'default' : 'secondary'}>
                        {topic.category}
                      </Badge>
                      {topic.trending && (
                        <Badge variant="destructive" className="text-xs">
                          トレンド
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mb-1">
                      {topic.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {topic.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-topic">カスタムトピック</Label>
            <Textarea
              id="custom-topic"
              placeholder="独自のディベートトピックを入力してください..."
              value={customTopic}
              onChange={(e) => {
                setCustomTopic(e.target.value);
                if (e.target.value) setSelectedTopic(null);
              }}
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* AIモデル選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            AIモデル選択
          </CardTitle>
          <CardDescription>
            賛成側と反対側のAIモデルを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* 賛成側 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-green-600">賛成側 (Pro)</h3>
              <div className="grid gap-2">
                {availableModels.map((model) => (
                  <Card
                    key={`pro-${model.id}`}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      proModel?.id === model.id ? 'ring-2 ring-green-500' : ''
                    }`}
                    onClick={() => setProModel(model)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="text-xl sm:text-2xl">
                          {model.avatar}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">
                            {model.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {model.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 反対側 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-red-600">反対側 (Con)</h3>
              <div className="grid gap-2">
                {availableModels.map((model) => (
                  <Card
                    key={`con-${model.id}`}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      conModel?.id === model.id ? 'ring-2 ring-red-500' : ''
                    }`}
                    onClick={() => setConModel(model)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="text-xl sm:text-2xl">
                          {model.avatar}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">
                            {model.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {model.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 設定オプション */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            ディベート設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="duration">各段階の時間 (分)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="10"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 3)}
                className="w-32"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 開始ボタン */}
      <div className="flex justify-center">
        <Button
          onClick={handleStart}
          disabled={!isReady}
          size="lg"
          className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          ディベート開始
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      {!isReady && (
        <p className="text-center text-muted-foreground text-sm">
          トピックとAIモデルを選択してください
        </p>
      )}
    </div>
  );
}
