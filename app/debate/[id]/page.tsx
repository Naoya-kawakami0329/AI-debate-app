'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DebateViewer from '@/components/DebateViewer';
import { DebateState, DebateConfig } from '@/lib/types';

export default function DebatePage() {
  const router = useRouter();
  const params = useParams();
  const debateId = params.id as string;

  const [debateState, setDebateState] = useState<DebateState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!debateId) return;

    const savedConfig = localStorage.getItem(`debate-config-${debateId}`);

    if (savedConfig) {
      try {
        const config: DebateConfig = JSON.parse(savedConfig);

        const newDebate: DebateState = {
          id: debateId,
          config,
          stage: 'setup',
          messages: [],
          audienceQuestions: [],
          startTime: new Date(),
          currentSpeaker: 'pro',
        };

        setDebateState(newDebate);
      } catch (error) {
        console.error('Failed to parse debate config:', error);
        router.push('/');
      }
    } else {
      router.push('/');
    }

    setLoading(false);
  }, [debateId, router]);

  const handleBack = () => {
    router.push('/');
  };

  const handleDebateSaved = () => {
    localStorage.removeItem(`debate-config-${debateId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">ディベートを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!debateState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">ディベートが見つかりません</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <DebateViewer
      initialState={debateState}
      onBack={handleBack}
      onDebateSaved={handleDebateSaved}
    />
  );
}
