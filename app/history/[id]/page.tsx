'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DebateHistory } from '@/lib/types';
import { getRecentDebatesAction } from '@/lib/actions/debate-actions';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function HistoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const debateId = params.id as string;
  
  const [debateHistory, setDebateHistory] = useState<DebateHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!debateId) return;
    loadDebateHistory();
  }, [debateId]);

  const loadDebateHistory = async () => {
    setLoading(true);
    try {
      const result = await getRecentDebatesAction(100); // Load many to find the specific one
      if (result.success) {
        const debate = result.debates.find(d => d.id === debateId);
        if (debate) {
          setDebateHistory(debate);
        } else {
          console.error('Debate not found');
        }
      } else {
        console.error('Failed to load debate history:', result.error);
      }
    } catch (error) {
      console.error('Failed to load debate history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHistory = () => {
    router.push('/history');
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">ディベート履歴を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!debateHistory) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">ディベート履歴が見つかりません</p>
          <div className="space-x-2">
            <Button onClick={handleBackToHistory} variant="outline">
              履歴一覧に戻る
            </Button>
            <Button onClick={handleBackToHome}>
              ホームに戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBackToHistory}>
          ← 履歴一覧に戻る
        </Button>
        <Button variant="ghost" onClick={handleBackToHome}>
          ホームに戻る
        </Button>
      </div>

      {/* ディベート履歴詳細 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{debateHistory.topic}</CardTitle>
          <div className="flex justify-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🧠</div>
              <div className="text-center">
                <p className="font-semibold text-green-600">{debateHistory.models[0]}</p>
                <p className="text-xs text-muted-foreground">賛成側</p>
              </div>
            </div>
            <div className="text-2xl">🥊</div>
            <div className="flex items-center gap-2">
              <div className="text-center">
                <p className="font-semibold text-red-600">{debateHistory.models[1]}</p>
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
              <p className="font-semibold text-lg">{debateHistory.winner}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">時間</p>
              <p className="font-semibold text-lg">{debateHistory.duration}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">ステータス</p>
              <p className="font-semibold text-lg">{debateHistory.status}</p>
            </div>
          </div>
          
          {/* 基本情報 */}
          <div className="p-4 bg-muted rounded-lg mb-4">
            <p className="text-sm text-muted-foreground mb-2">作成日時</p>
            <p className="font-medium">
              {debateHistory.createdAt ? 
                format(new Date(debateHistory.createdAt), 'yyyy年M月d日 HH:mm', { locale: ja }) 
                : '不明'
              }
            </p>
          </div>

          {/* メッセージ履歴の詳細表示 */}
          {debateHistory.messages && debateHistory.messages.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">💬 ディベートの流れ</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {debateHistory.messages.map((message, index) => (
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
                        {message.speaker === 'pro' ? debateHistory.models[0] : debateHistory.models[1]}
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