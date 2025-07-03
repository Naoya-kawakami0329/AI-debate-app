import { NextResponse } from 'next/server';
import { TrendingTopic } from '@/lib/types';
import axios from 'axios';

// Enable dynamic API route
export const dynamic = 'force-dynamic';

// Google Trends (mock data for demo)
async function fetchGoogleTrends(): Promise<TrendingTopic[]> {
  // Return mock trending topics that would typically come from Google Trends
  const mockTrends: TrendingTopic[] = [
    {
      keyword: '生成AI',
      trend: '+120%',
      source: 'Google Trends',
      category: 'テクノロジー',
      description: 'ChatGPTやClaudeなどの生成AI技術への関心が急上昇',
      lastUpdated: new Date().toISOString(),
      searchVolume: 50000,
    },
    {
      keyword: '円安',
      trend: '+85%',
      source: 'Google Trends',
      category: 'ビジネス',
      description: '為替相場の変動と経済への影響に注目',
      lastUpdated: new Date().toISOString(),
      searchVolume: 35000,
    },
    {
      keyword: '半導体',
      trend: '+65%',
      source: 'Google Trends',
      category: 'テクノロジー',
      description: '半導体産業の動向と供給問題',
      lastUpdated: new Date().toISOString(),
      searchVolume: 28000,
    },
  ];

  return mockTrends;
}

// Fetch trending news topics from NewsAPI
async function fetchNewsTrends(): Promise<TrendingTopic[]> {
  const newsApiKey = process.env.NEWS_API_KEY;

  if (!newsApiKey) {
    console.warn('NEWS_API_KEY not configured, using mock news trends');
    return getMockNewsTrends();
  }



  try {
    // Try multiple endpoints to get news
    let response: any;
    let articles: any[] = [];

    // Try to get Japanese content using Japanese-only queries
    const searchQueries = [
      { q: '日本 最新', category: 'ニュース' },
      { q: '人工知能 AI 技術', category: 'テクノロジー' },
      { q: 'ビジネス 経済 企業', category: 'ビジネス' },
      { q: '政治 社会 問題', category: '社会' },
      { q: 'スポーツ 試合 選手', category: 'スポーツ' },
      { q: '環境 気候変動 エネルギー', category: '環境' },
    ];

    for (const queryData of searchQueries) {
      try {
        response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: queryData.q,
            apiKey: newsApiKey,
            pageSize: 10,
            sortBy: 'publishedAt',
            from: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            language: 'jp', // Request Japanese articles only
          },
          timeout: 10000,
        });

        const queryArticles = response.data.articles || [];

        // Add category to each article and filter for Japanese content
        const japaneseArticles = queryArticles.filter((article: any) => {
          const text = `${article.title || ''} ${article.description || ''}`;
          return /[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/.test(text);
        });

        japaneseArticles.forEach((article: any) => {
          article.customCategory = queryData.category;
        });

        articles = [...articles, ...japaneseArticles];

        if (articles.length >= 30) break;
      } catch (error) {
      }
    }



    // Filter articles to prioritize those with Japanese content
    const articlesWithJapanese = articles.filter((article: any) => {
      const text = `${article.title || ''} ${article.description || ''}`;
      return /[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/.test(text);
    });

    // Use Japanese articles if available, otherwise use all articles
    const finalArticles =
      articlesWithJapanese.length > 0 ? articlesWithJapanese : articles;

    // If no Japanese articles found, return mock data
    if (articlesWithJapanese.length === 0) {
      return getMockNewsTrends();
    }

    // Extract topics primarily from article titles (more reliable)
    const topicCandidates = new Map<
      string,
      { count: number; articles: any[]; category: string }
    >();

    finalArticles.forEach((article: any) => {
      if (!article.title) return;

      const title = article.title;

      // Define important topics to look for
      const topicPatterns = [
        // Technology
        {
          pattern: /AI|人工知能|ChatGPT|生成AI|機械学習/,
          topic: 'AI技術',
          category: 'テクノロジー',
        },
        {
          pattern: /半導体|チップ|NVIDIA|エヌビディア|AMD/,
          topic: '半導体',
          category: 'テクノロジー',
        },
        {
          pattern: /iPhone|スマホ|スマートフォン|Apple|アップル/,
          topic: 'スマートフォン',
          category: 'テクノロジー',
        },
        {
          pattern: /Tesla|テスラ|電気自動車|EV/,
          topic: '電気自動車',
          category: 'テクノロジー',
        },

        // Business & Economics
        {
          pattern: /株価|株式|投資|証券/,
          topic: '株式市場',
          category: 'ビジネス',
        },
        {
          pattern: /円安|円高|為替|ドル円/,
          topic: '為替相場',
          category: 'ビジネス',
        },
        {
          pattern: /インフレ|物価|値上げ/,
          topic: '物価上昇',
          category: 'ビジネス',
        },
        {
          pattern: /GDP|経済成長|景気/,
          topic: '経済成長',
          category: 'ビジネス',
        },

        // Politics & Social
        { pattern: /選挙|政治|国会|政府/, topic: '政治', category: '政治' },
        {
          pattern: /少子化|高齢化|人口減少/,
          topic: '少子高齢化',
          category: '社会',
        },

        // Environment
        {
          pattern: /気候変動|温暖化|脱炭素|再生可能エネルギー/,
          topic: '気候変動',
          category: '環境',
        },

        // Health
        {
          pattern: /コロナ|COVID|ワクチン|感染/,
          topic: '感染症対策',
          category: '医療',
        },

        // Sports
        {
          pattern: /オリンピック|ワールドカップ|野球|サッカー/,
          topic: 'スポーツ',
          category: 'スポーツ',
        },

        // Entertainment
        {
          pattern: /映画|アニメ|ゲーム|エンタメ/,
          topic: 'エンターテインメント',
          category: 'エンタメ',
        },
      ];

      // Check each pattern against the title
      for (const { pattern, topic, category } of topicPatterns) {
        if (pattern.test(title)) {
          if (!topicCandidates.has(topic)) {
            topicCandidates.set(topic, { count: 0, articles: [], category });
          }

          const data = topicCandidates.get(topic)!;
          data.count++;
          if (data.articles.length < 3) {
            data.articles.push(article);
          }
          break; // Only match one pattern per title
        }
      }
    });

    // Convert topic candidates to trending topics
    const sortedTopics = Array.from(topicCandidates.entries())
      .filter(([topic, data]) => data.count >= 1) // At least one article mentions this topic
      .sort((a, b) => b[1].count - a[1].count) // Sort by frequency
      .slice(0, 5); // Get top 5 topics

    const trendingTopics: TrendingTopic[] = [];

    sortedTopics.forEach(([topic, data], index) => {
      const trendValue = Math.max(
        20,
        Math.floor((data.count / finalArticles.length) * 100) +
          Math.floor(Math.random() * 40)
      );

      trendingTopics.push({
        keyword: topic,
        trend: `+${trendValue}%`,
        source: 'NewsAPI',
        category: data.category,
        description: `${data.count}件の関連記事で注目`,
        lastUpdated: new Date().toISOString(),
        newsCount: data.count,
      });
    });


    // Return only top 3 topics from NewsAPI
    const finalTopics = trendingTopics.slice(0, 3);
    return finalTopics;
  } catch (error) {
    console.error('Failed to fetch news trends:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    // Return mock data as fallback
    return getMockNewsTrends();
  }
}

function getMockNewsTrends(): TrendingTopic[] {
  // Return Japanese mock data when News API doesn't return Japanese content
  return [
    {
      keyword: 'デジタル変革',
      trend: '+75%',
      source: 'NewsAPI',
      category: 'ビジネス',
      description: '企業のDX推進と課題について',
      lastUpdated: new Date().toISOString(),
      newsCount: 23,
    },
    {
      keyword: '少子高齢化',
      trend: '+45%',
      source: 'NewsAPI',
      category: '社会',
      description: '日本の人口問題と対策',
      lastUpdated: new Date().toISOString(),
      newsCount: 18,
    },
    {
      keyword: '再生可能エネルギー',
      trend: '+38%',
      source: 'NewsAPI',
      category: '環境',
      description: '太陽光・風力発電の普及状況',
      lastUpdated: new Date().toISOString(),
      newsCount: 14,
    },
  ];
}

export async function GET() {
  try {
    // Skip cache for now to get fresh data

    // Fetch fresh trends from both sources
    const [googleTrends, newsTrends] = await Promise.all([
      fetchGoogleTrends(),
      fetchNewsTrends(),
    ]);

    // Take top 3 from each source
    const topGoogleTrends = googleTrends.slice(0, 3);
    let topNewsTrends = newsTrends.slice(0, 3);

    // If news trends is empty, use mock data as fallback
    if (topNewsTrends.length === 0) {
      topNewsTrends = getMockNewsTrends().slice(0, 3);
    }

    // Combine exactly 3 from each source
    const allTrends = [...topGoogleTrends, ...topNewsTrends];


    // No additional sorting - maintain source separation

    // Skip caching for now to ensure fresh data
    // await DatabaseService.saveTrendingTopics(allTrends);

    return NextResponse.json({
      trends: allTrends,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching trends:', error);

    return NextResponse.json({
      trends: [],
      lastUpdated: new Date().toISOString(),
      error: 'Failed to fetch trends',
    });
  }
}
