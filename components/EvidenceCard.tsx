import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { Evidence } from '@/lib/types';

interface EvidenceCardProps {
  evidence: Evidence;
}

export default function EvidenceCard({ evidence }: EvidenceCardProps) {
  const credibilityColor =
    evidence.credibility > 0.8
      ? 'bg-green-500'
      : evidence.credibility > 0.6
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <Card className="transition-all hover:shadow-md cursor-pointer">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            {evidence.source}
          </Badge>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${credibilityColor}`}></div>
            <span className="text-xs text-muted-foreground">
              {Math.round(evidence.credibility * 100)}%
            </span>
          </div>
        </div>

        <h4 className="font-semibold text-sm mb-1 line-clamp-2">
          {evidence.title}
        </h4>

        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {evidence.snippet}
        </p>

        <div className="flex items-center justify-between">
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-blue-600 hover:underline">
            詳細を見る
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
