import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Medal } from 'lucide-react';
import { AIModel } from '@/lib/types';

interface SummaryCardProps {
  summary: string;
  winner: 'pro' | 'con' | 'draw';
  proModel: AIModel;
  conModel: AIModel;
}

export default function SummaryCard({ summary, 
  winner, proModel, conModel }: SummaryCardProps) {
  return (
    <div className="space-y-6">
      {/* サマリー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5" />
            ディベートサマリー
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{summary}</p>
        </CardContent>
      </Card>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-blue-600">12</div>
            <div className="text-sm text-muted-foreground">総発言数</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-green-600">8</div>
            <div className="text-sm text-muted-foreground">引用された証拠</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}