import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Medal } from 'lucide-react';
import { AIModel } from '@/lib/types';

interface SummaryCardProps {
  summary: string;
  winner: 'pro' | 'con' | 'draw';
  proModel: AIModel;
  conModel: AIModel;
}

export default function SummaryCard({
  summary,
}: SummaryCardProps) {
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
    </div>
  );
}
