import { Evidence } from '../types';

export interface EvidenceSearchParams {
  query: string;
  topic: string;
}

export class EvidenceService {
  private static cache = new Map<string, Evidence[]>();
  private static cacheTimeout = 5 * 60 * 1000; // 5 minutes
  
  static async searchEvidence(params: EvidenceSearchParams): Promise<Evidence[]> {
    const cacheKey = `${params.topic}-${params.query}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if available and not expired
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
        throw new Error('Failed to search evidence');
      }
      
      const data = await response.json();
      const evidence = data.evidence || [];
      
      // Cache the results
      this.cache.set(cacheKey, evidence);
      
      // Clear cache after timeout
      setTimeout(() => {
        this.cache.delete(cacheKey);
      }, this.cacheTimeout);
      
      return evidence;
    } catch (error) {
      console.error('Error searching evidence:', error);
      return [];
    }
  }
  
  static clearCache(): void {
    this.cache.clear();
  }
}