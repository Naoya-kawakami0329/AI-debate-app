'use client';

import { useRouter } from 'next/navigation';
import DebateSetup from '@/components/DebateSetup';
import { DebateConfig } from '@/lib/types';

export default function SetupPage() {
  const router = useRouter();

  const handleStartDebate = (config: DebateConfig) => {

    const debateId = `debate-${Date.now()}`;

    localStorage.setItem(`debate-config-${debateId}`, JSON.stringify(config));

    
    router.push(`/debate/${debateId}`);
  };

  return <DebateSetup onStartDebate={handleStartDebate} />;
}
