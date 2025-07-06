import { TrendingTopic } from '../types';

export interface TrendsResponse {
  trends: TrendingTopic[];
  lastUpdated: string;
}

export class TrendsService {
  static async fetchTrends(): Promise<TrendsResponse> {
    try {
      const response = await fetch('/api/trends', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trends');
      }

      return await response.json();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching trends:', errorMessage);
      return {
        trends: [],
        lastUpdated: '',
      };
    }
  }
}
