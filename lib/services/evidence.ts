import { Evidence } from '../types';

export interface EvidenceSearchParams {
  query: string;
  topic: string;
}

export class EvidenceService {
  private static cache = new Map<string, Evidence[]>();
  private static cacheTimeout = 5 * 60 * 1000; // 5 minutes

  static async searchEvidence(
    params: EvidenceSearchParams
  ): Promise<Evidence[]> {
    const cacheKey = `${params.topic}-${params.query}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await fetch('/api/evidence/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        console.warn('Evidence search failed:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      const evidence = data.evidence || [];

      this.cache.set(cacheKey, evidence);

      setTimeout(() => {
        this.cache.delete(cacheKey);
      }, this.cacheTimeout);

      return evidence;
    } catch (error) {
      console.warn('Evidence search error (returning empty):', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  static clearCache(): void {
    this.cache.clear();
  }
}
