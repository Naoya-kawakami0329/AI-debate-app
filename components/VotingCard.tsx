'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vote, Trophy, Users, MessageSquare } from 'lucide-react';
import { AIModel } from '@/lib/types';

interface VotingCardProps {
  proModel: AIModel;
  conModel: AIModel;
  onVote: (winner: 'pro' | 'con' | 'draw') => void;
  hasVoted: boolean;
  winner?: 'pro' | 'con' | 'draw';
}

export default function VotingCard({ proModel, conModel, onVote, hasVoted, winner }: VotingCardProps) {
  const [selectedVote, setSelectedVote] = useState<'pro' | 'con' | 'draw' | null>(null);

  const handleVote = () => {
    if (selectedVote) {
      onVote(selectedVote);
    }
  };

  if (hasVoted && winner) {
    const getWinnerInfo = () => {
      if (winner === 'draw') {
        return {
          title: '引き分け',
          description: '両者互角の議論でした',
          color: 'text-yellow-600'
        };
      }
      
      const winnerModel = winner === 'pro' ? proModel : conModel;
      
      return {
        title: `${winnerModel.name} の勝利！`,
        description: `${winner === 'pro' ? '賛成側' : '反対側'}の勝利`,
        color: winner === 'pro' ? 'text-green-600' : 'text-red-600',
        winnerModel,
        loserModel: winner === 'pro' ? conModel : proModel
      };
    };

    const winnerInfo = getWinnerInfo();

    return (
      <Card className="border-2 border-gradient-to-r from-purple-500 to-blue-500">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-3">
            <div className={winnerInfo.color}>
              <Trophy className="h-8 w-8" />
            </div>
            {winnerInfo.title}
          </CardTitle>
          <Badge variant="secondary" className="w-fit mx-auto">
            あなたの判定: {winnerInfo.description}
          </Badge>
        </CardHeader>
        
        {winner !== 'draw' && (
          <CardContent className="text-center">
            <div className="flex justify-center items-center gap-8 mb-4">
              <div className="text-center">
                <div className="text-4xl mb-2">{winnerInfo.winnerModel?.avatar}</div>
                <div className="font-semibold">{winnerInfo.winnerModel?.name}</div>
                <Badge className="mt-1">勝者</Badge>
              </div>
              
              <div className="text-2xl">🥊</div>
              
              <div className="text-center opacity-60">
                <div className="text-4xl mb-2">{winnerInfo.loserModel?.avatar}</div>
                <div className="font-semibold">{winnerInfo.loserModel?.name}</div>
                <Badge variant="outline" className="mt-1">敗者</Badge>
              </div>
            </div>
            
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Vote className="h-5 w-5" />
          勝敗判定
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          どちらの議論がより説得力があったと思いますか？
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 投票選択肢 */}
        <div className="space-y-3">
          {/* 賛成側 */}
          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
              selectedVote === 'pro' ? 'border-green-500 bg-green-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedVote('pro')}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{proModel.avatar}</div>
              <div className="flex-1">
                <div className="font-semibold text-green-600">{proModel.name}</div>
                <div className="text-sm text-muted-foreground">賛成側の勝利</div>
              </div>
              {selectedVote === 'pro' && (
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              )}
            </div>
          </div>

          {/* 反対側 */}
          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
              selectedVote === 'con' ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedVote('con')}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{conModel.avatar}</div>
              <div className="flex-1">
                <div className="font-semibold text-red-600">{conModel.name}</div>
                <div className="text-sm text-muted-foreground">反対側の勝利</div>
              </div>
              {selectedVote === 'con' && (
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              )}
            </div>
          </div>

          {/* 引き分け */}
          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
              selectedVote === 'draw' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedVote('draw')}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🤝</div>
              <div className="flex-1">
                <div className="font-semibold text-yellow-600">引き分け</div>
                <div className="text-sm text-muted-foreground">両者互角の議論</div>
              </div>
              {selectedVote === 'draw' && (
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              )}
            </div>
          </div>
        </div>

        {/* 投票ボタン */}
        <Button
          onClick={handleVote}
          disabled={!selectedVote}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Vote className="h-4 w-4 mr-2" />
          投票する
        </Button>
      </CardContent>
    </Card>
  );
}