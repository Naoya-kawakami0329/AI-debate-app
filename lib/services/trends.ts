import { TrendingTopic } from '../types';

export interface TrendsResponse {
  trends: TrendingTopic[];
  lastUpdated: string;
}

export class TrendsService {
  static async fetchTrends(): Promise<TrendsResponse> {
    try {
      const response = await fetch('/api/trends');
      
      if (!response.ok) {
        console.warn('API request failed, using mock data');
        throw new Error('Failed to fetch trends');
      }
      
      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching trends:', errorMessage);
      return {
        trends: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }
}