'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DebateMessage } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface MessageCardProps {
  message: DebateMessage;
}

export default function MessageCard({ message }: MessageCardProps) {
  const isProSide = message.speaker === 'pro';

  return (
    <Card
      className={`${isProSide ? 'ml-0 sm:mr-4 md:mr-6 lg:mr-8' : 'sm:ml-4 md:ml-6 lg:ml-8 mr-0'} transition-all duration-300 hover:shadow-md`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <div
            className={`text-xl sm:text-2xl ${isProSide ? 'order-1' : 'order-3'}`}
          >
            {message.model.avatar}
          </div>

          <div className={`flex-1 ${isProSide ? 'order-2' : 'order-2'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={isProSide ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {message.model.name}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {isProSide ? '賛成側' : '反対側'}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground sm:ml-auto">
                {formatDistanceToNow(message.timestamp, {
                  addSuffix: true,
                  locale: ja,
                })}
              </span>
            </div>

            <p className="text-sm leading-relaxed mb-3">{message.content}</p>

            {message.evidence.length > 0 && (
              <div className="space-y-2">
                {message.evidence.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="p-2 bg-muted rounded text-xs border-l-2 border-blue-500"
                  >
                    <div className="font-medium text-blue-600">
                      {evidence.title}
                    </div>
                    <div className="text-muted-foreground">
                      {evidence.source}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
