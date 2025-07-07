'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Pause,
  ExternalLink,
  Clock,
  Volume2,
  VolumeX,
  Share2,
} from 'lucide-react';
import { DebateState, DebateStage } from '@/lib/types';
import { DebateEngine } from '@/lib/debate-engine-new';
import { AudioService } from '@/lib/services/audio';
import { saveDebateAction } from '@/lib/actions/debate-actions';
import MessageCard from './MessageCard';
import EvidenceCard from './EvidenceCard';
import AudienceQA from './AudienceQA';
import SummaryCard from './SummaryCard';
import VotingCard from './VotingCard';

interface DebateViewerProps {
  initialState: DebateState;
  onBack: () => void;
  onDebateSaved?: () => void;
}

export default function DebateViewer({
  initialState,
  onBack,
  onDebateSaved,
}: DebateViewerProps) {
  const [debateState, setDebateState] = useState<DebateState>(initialState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [engine] = useState(() => {
    const eng = new DebateEngine(initialState, true);
    eng.updateStage(initialState.stage);
    return eng;
  });
  const [hasVoted, setHasVoted] = useState(false);
  const [autoSpeech, setAutoSpeech] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastMessageCountRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    if (debateState.stage === 'setup') {
      setDebateState((prev) => ({ ...prev, stage: 'opening' }));
      setIsPlaying(true);
    } else {
      setIsPlaying(true);
    }
  }, []);

  const stageNames = {
    setup: '準備中',
    opening: 'オープニング',
    rebuttal: '反駁',
    closing: 'クロージング',
    summary: 'サマリー',
  };

  const stageProgress = {
    setup: 0,
    opening: 25,
    rebuttal: 50,
    closing: 75,
    summary: 100,
  };

  const speakMessage = useCallback(
    async (content: string, speaker: 'pro' | 'con') => {
      if (!autoSpeech) return;

      const voice = speaker === 'pro' ? 'alloy' : 'echo';
      try {
        await AudioService.synthesizeSpeech(content, { voice, speed: 0.9 });
      } catch (error) {
        console.error('Speech synthesis error:', error);
      }
    },
    [autoSpeech]
  );

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (debateState.messages.length > lastMessageCountRef.current) {
      const newMessage = debateState.messages[debateState.messages.length - 1];
      if (newMessage) {
        if (autoSpeech) {
          speakMessage(newMessage.content, newMessage.speaker);
        }
        setTimeout(scrollToBottom, 100);
      }
    }
    lastMessageCountRef.current = debateState.messages.length;
  }, [debateState.messages, speakMessage, autoSpeech]);

  const getMessageLimit = (stage: DebateStage) => 
    stage === 'opening' || stage === 'closing' ? 2 : 4;

  useEffect(() => {
    if (!isPlaying || debateState.stage === 'summary' || debateState.stage === 'setup') return;

    const generateNextMessage = async () => {
      if (isGeneratingRef.current) return;
      
      isGeneratingRef.current = true;
      
      try {
        const currentStageMessages = debateState.messages.filter(
          (m) => m.stage === debateState.stage
        );

        const messageLimit = getMessageLimit(debateState.stage);
        
        if (currentStageMessages.length >= messageLimit) {
          const nextStage = 
            debateState.stage === 'opening' ? 'rebuttal' :
            debateState.stage === 'rebuttal' ? 'closing' :
            debateState.stage === 'closing' ? 'summary' : null;
          
          if (nextStage) {
            setDebateState(prev => ({
              ...prev,
              stage: nextStage as DebateStage,
              currentSpeaker: 'pro'
            }));
          }
          return;
        }

        const newMessage = await engine.generateMessage(
          debateState.stage,
          debateState.currentSpeaker
        );

        setDebateState((prev) => ({
          ...prev,
          messages: [...prev.messages, newMessage],
          currentSpeaker: prev.currentSpeaker === 'pro' ? 'con' : 'pro',
        }));
      } catch (error) {
        setIsPlaying(false);
        
        let errorMsg = 'AI処理中にエラーが発生しました';
        if (error instanceof Error) {
          if (error.message.includes('API key') || error.message.includes('API キー')) {
            errorMsg = 'APIキーが設定されていません。環境変数を確認してください。';
          } else if (error.message.includes('quota') || error.message.includes('制限')) {
            errorMsg = 'API使用制限に達しました。しばらくしてからお試しください。';
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMsg = 'ネットワークエラーが発生しました。接続を確認してください。';
          } else {
            errorMsg = `AI処理エラー: ${error.message}`;
          }
        }
        
        setErrorMessage(errorMsg);
        
        setTimeout(() => setErrorMessage(null), 5000);
      } finally {
        isGeneratingRef.current = false;
      }
    };

    const timeout = setTimeout(generateNextMessage, 1000);
    return () => clearTimeout(timeout);
  }, [isPlaying, debateState.stage, debateState.currentSpeaker, engine]);

  const togglePlayPause = () => {
    if (debateState.stage === 'setup') {
      setDebateState((prev) => ({ ...prev, stage: 'opening' }));
    }

    if (!isPlaying && autoSpeech) {
      const lastMessage = debateState.messages[debateState.messages.length - 1];
      if (lastMessage) {
        speakMessage(lastMessage.content, lastMessage.speaker);
      } else {
        speakMessage('ディベートを開始します。', 'pro');
      }
    }

    setIsPlaying(!isPlaying);
  };

  const toggleAutoSpeech = () => {
    if (autoSpeech) {
      AudioService.stopCurrentAudio();
    }
    setAutoSpeech(!autoSpeech);
  };

  const handleShare = async () => {
    const shareData = {
      title: `AIディベート: ${debateState.config.topic.title}`,
      text: `${debateState.config.proModel.name} vs ${debateState.config.conModel.name}の白熱した議論をご覧ください！`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('URLをクリップボードにコピーしました！');
      } catch (error) {
        prompt('URLをコピーしてください:', window.location.href);
      }
    }
  };

  const handleVote = async (winner: 'pro' | 'con' | 'draw') => {
    const updatedState = {
      ...debateState,
      winner,
      summary: engine.generateSummary(),
    };

    setDebateState(updatedState);
    setHasVoted(true);

    try {
      const result = await saveDebateAction(updatedState);
      if (result.success) {
        onDebateSaved?.();
        
        setTimeout(() => {
          onBack();
        }, 3000);
      }
    } catch (error) {
      console.error('Save debate error:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2 sm:gap-4">
        <Button
          onClick={togglePlayPause}
          disabled={debateState.stage === 'summary'}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full sm:w-auto order-1 sm:hidden"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {isPlaying ? '一時停止' : '再生'}
        </Button>
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto order-2 sm:order-1">
          ← 戻る
        </Button>
        <Button
          variant="outline"
          onClick={toggleAutoSpeech}
          className={`${autoSpeech ? 'bg-blue-100' : ''} w-full sm:w-auto order-3 sm:hidden`}
        >
          {autoSpeech ? (
            <Volume2 className="h-4 w-4 mr-2" />
          ) : (
            <VolumeX className="h-4 w-4 mr-2" />
          )}
          <span className="hidden sm:inline">自動読み上げ</span>
        </Button>
        <Button
          variant="outline"
          onClick={handleShare}
          className="w-full sm:w-auto order-4 sm:hidden"
        >
          <Share2 className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">共有</span>
        </Button>
        <div className="hidden sm:flex flex-row items-center gap-4 w-auto order-2">
          <Button
            variant="outline"
            onClick={handleShare}
            className="w-auto"
          >
            <Share2 className="h-4 w-4 mr-2" />
            共有
          </Button>
          <Button
            variant="outline"
            onClick={toggleAutoSpeech}
            className={`${autoSpeech ? 'bg-blue-100' : ''} w-auto`}
          >
            {autoSpeech ? (
              <Volume2 className="h-4 w-4 mr-2" />
            ) : (
              <VolumeX className="h-4 w-4 mr-2" />
            )}
            自動読み上げ
          </Button>
          <Button
            onClick={togglePlayPause}
            disabled={debateState.stage === 'summary'}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-auto"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isPlaying ? '一時停止' : '再生'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-center px-2">
            {debateState.config.topic.title}
          </CardTitle>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2">
              <div className="text-xl sm:text-2xl">
                {debateState.config.proModel.avatar}
              </div>
              <div className="text-center">
                <p className="font-semibold text-green-600 text-sm sm:text-base">
                  {debateState.config.proModel.name}
                </p>
                <p className="text-xs text-muted-foreground">賛成側</p>
              </div>
            </div>
            <div className="text-xl sm:text-2xl">🥊</div>
            <div className="flex items-center gap-2">
              <div className="text-center">
                <p className="font-semibold text-red-600 text-sm sm:text-base">
                  {debateState.config.conModel.name}
                </p>
                <p className="text-xs text-muted-foreground">反対側</p>
              </div>
              <div className="text-xl sm:text-2xl">
                {debateState.config.conModel.avatar}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary">{stageNames[debateState.stage]}</Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              段階 {Object.keys(stageNames).indexOf(debateState.stage) + 1}/5
            </div>
          </div>
          <Progress value={stageProgress[debateState.stage]} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4">
          {debateState.stage === 'summary' ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>ディベート内容</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    ディベートの内容を確認して投票してください
                  </p>
                </CardHeader>
                <CardContent>
                  <div 
                    ref={messagesContainerRef}
                    className="space-y-4 max-h-[400px] sm:max-h-[600px] overflow-y-auto"
                  >
                    {debateState.messages.map((message) => (
                      <MessageCard key={message.id} message={message} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <VotingCard
                proModel={debateState.config.proModel}
                conModel={debateState.config.conModel}
                onVote={handleVote}
                hasVoted={hasVoted}
                winner={debateState.winner}
              />

              {hasVoted && debateState.winner && (
                <SummaryCard summary={debateState.summary!} />
              )}
            </div>
          ) : (
            <>
              <h2 className="text-lg sm:text-xl font-semibold">
                ディベート進行
              </h2>
              <div 
                ref={messagesContainerRef}
                className="space-y-4 max-h-[400px] sm:max-h-[600px] overflow-y-auto"
              >
                {debateState.messages.map((message) => (
                  <MessageCard key={message.id} message={message} />
                ))}
                {isPlaying &&
                  (debateState.stage as DebateStage) !== 'summary' && (
                    <div className="flex justify-center py-4">
                      <div className="animate-pulse flex items-center gap-2 text-muted-foreground">
                        <div className="h-2 w-2 bg-purple-600 rounded-full animate-bounce"></div>
                        <div
                          className="h-2 w-2 bg-purple-600 rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        ></div>
                        <div
                          className="h-2 w-2 bg-purple-600 rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                        <span className="ml-2">AIが考えています...</span>
                      </div>
                    </div>
                  )}
                {errorMessage && (
                  <div className="flex justify-center py-4">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md max-w-md">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm">{errorMessage}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                証拠・引用
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {debateState.messages
                .flatMap((m, msgIndex) =>
                  m.evidence.map((e, evidIndex) => ({
                    ...e,
                    messageIndex: msgIndex,
                    evidenceIndex: evidIndex,
                  }))
                )
                .slice(-3)
                .map((evidence, sliceIndex) => (
                  <EvidenceCard
                    key={`evidence-sidebar-${evidence.messageIndex}-${evidence.evidenceIndex}-${sliceIndex}-${evidence.url || evidence.title || ''}`}
                    evidence={evidence}
                  />
                ))}
            </CardContent>
          </Card>

          <AudienceQA
            questions={debateState.audienceQuestions}
            onAddQuestion={(question) => {
              setDebateState((prev) => ({
                ...prev,
                audienceQuestions: [
                  ...prev.audienceQuestions,
                  {
                    id: `q-${Date.now()}`,
                    question,
                    author: 'あなた',
                    timestamp: new Date(),
                    votes: 0,
                    answered: false,
                  },
                ],
              }));
            }}
          />
        </div>
      </div>
    </div>
  );
}
