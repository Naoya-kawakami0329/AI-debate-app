import { NextResponse } from 'next/server';
import { TrendingTopic } from '@/lib/types';
import { DatabaseService } from '@/lib/services/database';
import axios from 'axios';

// Enable dynamic API route
export const dynamic = 'force-dynamic';

// Google Trends implementation (placeholder - requires actual API integration)
async function fetchGoogleTrends(): Promise<TrendingTopic[]> {
  // TODO: Implement actual Google Trends API integration
  // For now, return empty array until real API is implemented
  console.warn('Google Trends API not implemented - returning empty results');
  return [];
}

// Fetch trending news topics from NewsAPI
async function fetchNewsTrends(): Promise<TrendingTopic[]> {
  const newsApiKey = process.env.NEWS_API_KEY;
  
  if (!newsApiKey) {
    console.warn('NEWS_API_KEY not configured, returning mock data');
    return getMockNewsTrends();
  }
  
  try {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        country: 'jp',
        apiKey: newsApiKey,
        pageSize: 10,
      },
      timeout: 10000, // 10 second timeout
    });
    
    const articles = response.data.articles || [];
    const trendingTopics: TrendingTopic[] = [];
    
    // Extract keywords from article titles (simplified implementation)
    const keywordCounts = new Map<string, number>();
    
    articles.forEach((article: any) => {
      if (article.title) {
        // Simple keyword extraction (in production, use NLP)
        const words = article.title.split(/\s+/);
        words.forEach((word: string) => {
          if (word.length > 3) {
            keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
          }
        });
      }
    });
    
    // Convert to trending topics
    const sortedKeywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    sortedKeywords.forEach(([keyword, count], index) => {
      trendingTopics.push({
        keyword,
        trend: `+${Math.floor(Math.random() * 50)}%`,
        source: "NewsAPI",
        category: "ニュース",
        description: `${count}件の関連記事`,
        lastUpdated: new Date().toISOString(),
        newsCount: count,
      });
    });
    
    return trendingTopics;
  } catch (error) {
    console.error('Failed to fetch news trends:', error);
    return getMockNewsTrends();
  }
}

function getMockNewsTrends(): TrendingTopic[] {
  // Return empty array when News API is not available
  return [];
}

export async function GET() {
  try {
    // First try to get cached trends from database (if Supabase is configured)
    const cachedTrends = await DatabaseService.getCachedTrendingTopics();
    
    // If we have recent cached data (less than 6 hours old), use it
    if (cachedTrends.length > 0) {
      const lastUpdate = new Date(cachedTrends[0].lastUpdated);
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      
      if (lastUpdate > sixHoursAgo) {
        return NextResponse.json({
          trends: cachedTrends.slice(0, 6),
          lastUpdated: cachedTrends[0].lastUpdated,
        });
      }
    }
    
    // Fetch fresh trends from both sources
    const [googleTrends, newsTrends] = await Promise.all([
      fetchGoogleTrends(),
      fetchNewsTrends(),
    ]);
    
    // Combine and deduplicate trends
    const allTrends = [...googleTrends, ...newsTrends];
    
    // Sort by trend percentage (descending)
    allTrends.sort((a, b) => {
      const aValue = parseInt(a.trend.replace('%', '').replace('+', ''));
      const bValue = parseInt(b.trend.replace('%', '').replace('+', ''));
      return bValue - aValue;
    });
    
    // Take top 6 trends
    const topTrends = allTrends.slice(0, 6);
    
    // Cache the new trends in database
    await DatabaseService.saveTrendingTopics(topTrends);
    
    return NextResponse.json({
      trends: topTrends,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    
    // Try to return cached data as fallback
    try {
      const cachedTrends = await DatabaseService.getCachedTrendingTopics();
      if (cachedTrends.length > 0) {
        return NextResponse.json({
          trends: cachedTrends.slice(0, 6),
          lastUpdated: cachedTrends[0].lastUpdated,
        });
      }
    } catch (dbError) {
      console.error('Error fetching cached trends:', dbError);
    }
    
    // Return empty array as final fallback
    return NextResponse.json({
      trends: [],
      lastUpdated: new Date().toISOString(),
      error: 'No trending data available',
    });
  }
}