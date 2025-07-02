'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, BookOpen } from 'lucide-react';
import { AudienceQuestion } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface AudienceQAProps {
  questions: AudienceQuestion[];
  onAddQuestion: (question: string) => void;
}

export default function AudienceQA({ questions, onAddQuestion }: AudienceQAProps) {
  const [newQuestion, setNewQuestion] = useState('');

  const handleSubmit = () => {
    if (newQuestion.trim()) {
      onAddQuestion(newQuestion.trim());
      setNewQuestion('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          メモ・質問
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 質問・メモ投稿 */}
        <div className="space-y-2">
          <Textarea
            placeholder="気になった点や疑問をメモしておきましょう..."
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <Button 
            onClick={handleSubmit}
            size="sm" 
            className="w-full"
            disabled={!newQuestion.trim()}
          >
            <Send className="h-3 w-3 mr-2" />
            メモを追加
          </Button>
        </div>

        {/* メモ一覧 */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {questions.slice(-5).reverse().map((question) => (
            <div key={question.id} className="p-3 bg-muted rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-sm">{question.author}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(question.timestamp, { addSuffix: true, locale: ja })}
                </span>
              </div>
              
              <p className="text-sm mb-2">{question.question}</p>
              
              <div className="flex items-center gap-2">
                {question.answered && (
                  <Badge variant="secondary" className="text-xs">
                    確認済み
                  </Badge>
                )}
              </div>
            </div>
          ))}
          
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              ディベートを見ながら気になった点をメモしてみましょう
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}