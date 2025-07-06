'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Clock, MessageCircle } from 'lucide-react';
import { DebateHistory } from '@/lib/types';
import { getRecentDebatesAction } from '@/lib/actions/debate-actions';

export default function HistoryPage() {
  const router = useRouter();
  const [recentDebates, setRecentDebates] = useState<DebateHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentDebates();
  }, []);

  const loadRecentDebates = async () => {
    setIsLoading(true);
    try {
      const result = await getRecentDebatesAction(20); 
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
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ディベート履歴
            </h1>
            <p className="text-xl text-muted-foreground mt-2">
              過去のディベートを振り返ろう
            </p>
          </div>
          <Button onClick={() => router.push('/')} variant="outline">
            ← ホームに戻る
          </Button>
        </div>

        {/* ディベート履歴一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              完了したディベート
            </CardTitle>
            <CardDescription>
              これまでのディベート結果を詳細に確認できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
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
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-2">
                              {debate.topic}
                            </h3>
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
                            <Badge
                              variant={
                                debate.winner === '引き分け'
                                  ? 'secondary'
                                  : 'default'
                              }
                            >
                              勝者: {debate.winner}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
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
                  <Button onClick={() => router.push('/setup')}>
                    新しいディベートを開始
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
