import { createSupabaseAdmin } from '@/lib/supabase/client';
import { TrendingTopic } from '@/lib/types';

export class TrendsStorage {
  private static instance: TrendsStorage;
  private supabase = createSupabaseAdmin();

  private constructor() {}

  static getInstance(): TrendsStorage {
    if (!this.instance) {
      this.instance = new TrendsStorage();
    }
    return this.instance;
  }

  async saveTrends(trends: TrendingTopic[]): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase.from('trends_cache').upsert({
        id: 'latest',
        trends: trends,
        updated_at: new Date().toISOString(),
      });

      return !error;
    } catch (error) {
      return false;
    }
  }

  async loadTrends(): Promise<TrendingTopic[] | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('trends_cache')
        .select('trends, updated_at')
        .eq('id', 'latest')
        .single();

      if (error || !data || !data.trends) {
        return null;
      }

      const updatedAt = new Date(data.updated_at);
      const now = new Date();
      const ageInHours =
        (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

      if (ageInHours > 24) {
        return null;
      }

      return data.trends as TrendingTopic[];
    } catch (error) {
      return null;
    }
  }

  async getLastUpdateTime(): Promise<Date | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('trends_cache')
        .select('updated_at')
        .eq('id', 'latest')
        .single();

      if (error || !data) {
        return null;
      }

      return new Date(data.updated_at);
    } catch (error) {
      return null;
    }
  }
}
