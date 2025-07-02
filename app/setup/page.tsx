'use client';

import { useRouter } from 'next/navigation';
import DebateSetup from '@/components/DebateSetup';
import { DebateConfig } from '@/lib/types';

export default function SetupPage() {
  const router = useRouter();

  const handleStartDebate = (config: DebateConfig) => {
    // Create debate ID and navigate to debate page
    const debateId = `debate-${Date.now()}`;

    // Store config in localStorage temporarily
    localStorage.setItem(`debate-config-${debateId}`, JSON.stringify(config));

    // Navigate to debate page
    router.push(`/debate/${debateId}`);
  };

  return <DebateSetup onStartDebate={handleStartDebate} />;
}
