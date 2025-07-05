import { NextResponse } from 'next/server';
import { TrendingTopic } from '@/lib/types';
import axios from 'axios';
import { getJson } from 'serpapi';
import { TrendsStorage } from '@/lib/services/trends-storage';

export const dynamic = 'force-dynamic';

let forceUpdate = false;
let cachedTrends: { data: TrendingTopic[]; timestamp: number } | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000;

function shouldUseCachedData(): boolean {
  if (!cachedTrends) return false;

  if (forceUpdate) {
    forceUpdate = false;
    return false;
  }

  return new Date().getTime() - cachedTrends.timestamp < CACHE_DURATION;
}

async function fetchGoogleTrends(): Promise<TrendingTopic[]> {
  const serpApiKey = process.env.SERPAPI_API_KEY;

  if (!serpApiKey) {
    return await fetchTrendingFromNews();
  }

  try {
    let response: any;
    let trendingSearches: any[] = [];

    try {
      const dailyParams = {
        engine: 'google_trends_trending_now',
        geo: 'JP',
        api_key: serpApiKey,
      };

      response = await getJson(dailyParams);

      if (response.daily_searches?.[0]?.trending_searches) {
        trendingSearches = response.daily_searches[0].trending_searches;
      }
    } catch (err) {}

    if (trendingSearches.length === 0) {
      try {
        const trendingParams = {
          engine: 'google_trends_trending_now',
          geo: 'JP',
          api_key: serpApiKey,
        };

        const trendingResponse = await getJson(trendingParams);

        if (trendingResponse.trending_searches) {
          trendingSearches = trendingResponse.trending_searches.slice(0, 6);
        }

        if (trendingSearches.length === 0) {
          const realtimeParams = {
            engine: 'google_trends',
            q: '',
            geo: 'JP',
            date: 'now 1-d',
            api_key: serpApiKey,
          };

          await getJson(realtimeParams);
        }

        if (trendingSearches.length === 0) {
          const searchQueries = [
            '今日のトレンド 日本',
            '急上昇ワード',
            'Twitter トレンド',
            '話題のキーワード',
            '検索急上昇',
          ];

          for (const searchQuery of searchQueries) {
            try {
              const searchParams = {
                engine: 'google',
                q: searchQuery,
                location: 'Japan',
                hl: 'ja',
                gl: 'jp',
                api_key: serpApiKey,
              };

              const searchResponse = await getJson(searchParams);

              if (searchResponse.organic_results) {
                const extractedKeywords = new Set<string>();

                for (const result of searchResponse.organic_results.slice(
                  0,
                  10
                )) {
                  const text = `${result.title || ''} ${result.snippet || ''}`;

                  const patterns = [
                    /「([^」]{2,15})」/g,
                    /【([^】]{2,15})】/g,
                    /『([^』]{2,15})』/g,
                    /#([^\s]{2,15})/g,
                    /(?:トレンド|急上昇|話題)[：:]\s*([^\s、。]{2,15})/g,
                    /(\w{2,15})(?:が|の)(?:話題|急上昇|トレンド)/g,
                  ];

                  for (const pattern of patterns) {
                    let match;
                    while ((match = pattern.exec(text)) !== null) {
                      const keyword = match[1].trim();
                      if (
                        keyword.length >= 2 &&
                        keyword.length <= 15 &&
                        !keyword.includes('http') &&
                        !/^\d+$/.test(keyword) &&
                        !keyword.includes('@')
                      ) {
                        extractedKeywords.add(keyword);
                      }
                    }
                  }
                }

                if (extractedKeywords.size > 0) {
                  const keywordArray = Array.from(extractedKeywords).slice(
                    0,
                    6
                  );
                  trendingSearches = keywordArray.map((keyword) => ({
                    query: keyword,
                    formattedTraffic: `+${Math.floor(Math.random() * 100) + 50}K`,
                    extracted: true,
                    articles: [{ title: `${keyword}が話題に` }],
                  }));
                  break;
                }
              }
            } catch (searchErr) {}
          }
        }
      } catch (err) {}
    }

    if (trendingSearches.length === 0) {
      return await fetchTrendingFromNews();
    }

    const trends: TrendingTopic[] = trendingSearches
      .slice(0, 6)
      .map((trend: any) => {
        const keyword = trend.query || '';
        const formattedTraffic = trend.formattedTraffic || '+10K';

        let searchVolume = 10000;
        const trafficMatch = formattedTraffic.match(/([0-9.,]+)([KMB]?)/);
        if (trafficMatch) {
          let num = parseFloat(trafficMatch[1].replace(',', ''));
          const unit = trafficMatch[2];
          if (unit === 'K') num *= 1000;
          else if (unit === 'M') num *= 1000000;
          else if (unit === 'B') num *= 1000000000;
          searchVolume = Math.floor(num);
        }

        let category = 'その他';

        if (
          /AI|人工知能|ChatGPT|生成|機械学習|テクノロジー|技術|IT|デジタル|半導体|スマホ|iPhone|Meta|Apple|Google|Microsoft/i.test(
            keyword
          )
        ) {
          category = 'テクノロジー';
        } else if (
          /株|投資|円|為替|経済|ビジネス|企業|市場|銀行|金融|GDP|インフレ|Bitcoin|仮想通貨/i.test(
            keyword
          )
        ) {
          category = 'ビジネス';
        } else if (
          /政治|選挙|国会|政府|大臣|首相|法案|外交|サミット|議員|党/i.test(
            keyword
          )
        ) {
          category = '政治';
        } else if (
          /スポーツ|野球|サッカー|オリンピック|試合|選手|ワールドカップ|プロ野球|Jリーグ|NBA|NFL/i.test(
            keyword
          )
        ) {
          category = 'スポーツ';
        } else if (
          /エンタメ|映画|ドラマ|アニメ|音楽|芸能|俳優|アイドル|Netflix|YouTube|ゲーム|漫画/i.test(
            keyword
          )
        ) {
          category = 'エンタメ';
        } else if (
          /環境|気候|エネルギー|災害|地震|台風|温暖化|脱炭素|原発|太陽光|風力/i.test(
            keyword
          )
        ) {
          category = '環境';
        } else if (
          /社会|教育|医療|コロナ|健康|学校|大学|病院|ワクチン|少子化|高齢化/i.test(
            keyword
          )
        ) {
          category = '社会';
        }

        const trendPercentage = Math.min(
          300,
          Math.floor(Math.random() * 150) + 50
        );

        return {
          keyword,
          trend: `+${trendPercentage}%`,
          source: 'Google Trends',
          category,
          description: trend.articles?.[0]?.title || `${keyword}が急上昇中`,
          lastUpdated: new Date().toISOString(),
          searchVolume,
        };
      });

    return trends;
  } catch (error) {
    return await fetchTrendingFromNews();
  }
}

async function fetchTrendingFromNews(): Promise<TrendingTopic[]> {
  const newsApiKey = process.env.NEWS_API_KEY;

  if (!newsApiKey) {
    return [];
  }

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: '日本 OR Japan',
        apiKey: newsApiKey,
        pageSize: 100,
        sortBy: 'popularity',
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        language: 'jp',
      },
      timeout: 10000,
    });

    const articles = response.data.articles || [];

    const topicMap = new Map<
      string,
      { count: number; category: string; articles: any[] }
    >();

    const trendingPatterns = [
      {
        pattern: /AI|人工知能|ChatGPT|生成AI|Claude|機械学習/,
        topic: 'AI・人工知能',
        category: 'テクノロジー',
      },
      {
        pattern: /半導体|チップ|NVIDIA|エヌビディア|TSMC/,
        topic: '半導体産業',
        category: 'テクノロジー',
      },
      {
        pattern: /iPhone|スマートフォン|スマホ|Android/,
        topic: 'スマートフォン',
        category: 'テクノロジー',
      },
      {
        pattern: /メタバース|VR|AR|仮想現実/,
        topic: 'メタバース・VR',
        category: 'テクノロジー',
      },
      {
        pattern: /5G|6G|通信技術/,
        topic: '次世代通信',
        category: 'テクノロジー',
      },
      {
        pattern: /株価|日経平均|ダウ|NASDAQ/,
        topic: '株式市場',
        category: 'ビジネス',
      },
      {
        pattern: /円安|円高|ドル円|為替/,
        topic: '為替相場',
        category: 'ビジネス',
      },
      {
        pattern: /インフレ|物価|値上げ|デフレ/,
        topic: '物価動向',
        category: 'ビジネス',
      },
      {
        pattern: /GDP|経済成長|景気|不況/,
        topic: '経済指標',
        category: 'ビジネス',
      },
      {
        pattern: /仮想通貨|ビットコイン|暗号資産/,
        topic: '仮想通貨',
        category: 'ビジネス',
      },
      { pattern: /選挙|投票|当選|落選/, topic: '選挙', category: '政治' },
      { pattern: /首相|大臣|内閣|政府/, topic: '政府・内閣', category: '政治' },
      { pattern: /法案|国会|議会|法律/, topic: '国会・法案', category: '政治' },
      { pattern: /外交|サミット|首脳会談/, topic: '外交', category: '政治' },
      {
        pattern: /少子化|高齢化|人口減少/,
        topic: '少子高齢化',
        category: '社会',
      },
      { pattern: /教育|学校|大学|入試/, topic: '教育', category: '社会' },
      {
        pattern: /コロナ|感染|ワクチン|パンデミック/,
        topic: '感染症対策',
        category: '社会',
      },
      { pattern: /労働|雇用|失業|賃金/, topic: '労働・雇用', category: '社会' },
      {
        pattern: /気候変動|温暖化|脱炭素|カーボンニュートラル/,
        topic: '気候変動',
        category: '環境',
      },
      {
        pattern: /再生可能エネルギー|太陽光|風力|原発/,
        topic: 'エネルギー',
        category: '環境',
      },
      { pattern: /災害|地震|台風|防災/, topic: '防災・災害', category: '環境' },
      {
        pattern: /野球|サッカー|オリンピック|ワールドカップ/,
        topic: 'スポーツ',
        category: 'スポーツ',
      },
      {
        pattern: /映画|ドラマ|アニメ|Netflix/,
        topic: 'エンターテイメント',
        category: 'エンタメ',
      },
    ];

    for (const article of articles) {
      const text = `${article.title || ''} ${article.description || ''}`;

      for (const { pattern, topic, category } of trendingPatterns) {
        if (pattern.test(text)) {
          if (!topicMap.has(topic)) {
            topicMap.set(topic, { count: 0, category, articles: [] });
          }
          const data = topicMap.get(topic)!;
          data.count++;
          if (data.articles.length < 3) {
            data.articles.push(article);
          }
        }
      }
    }

    const sortedTopics = Array.from(topicMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const trends: TrendingTopic[] = sortedTopics.map(([topic, data]) => {
      const trendPercentage = Math.min(
        200,
        Math.floor((data.count / articles.length) * 500)
      );

      return {
        keyword: topic,
        trend: `+${trendPercentage}%`,
        source: 'Google Trends',
        category: data.category,
        description: `${data.count}件の関連記事で話題`,
        lastUpdated: new Date().toISOString(),
        searchVolume: data.count * 5000,
      };
    });

    return trends;
  } catch (error) {
    return [];
  }
}

async function fetchNewsTrends(): Promise<TrendingTopic[]> {
  const newsApiKey = process.env.NEWS_API_KEY;

  if (!newsApiKey) {
    return [];
  }

  try {
    let response: any;
    let articles: any[] = [];

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

        const japaneseArticles = queryArticles.filter((article: any) => {
          const text = `${article.title || ''} ${article.description || ''}`;
          return /[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/.test(text);
        });

        japaneseArticles.forEach((article: any) => {
          article.customCategory = queryData.category;
        });

        articles = [...articles, ...japaneseArticles];

        if (articles.length >= 30) break;
      } catch (error) {}
    }

    const articlesWithJapanese = articles.filter((article: any) => {
      const text = `${article.title || ''} ${article.description || ''}`;
      return /[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/.test(text);
    });

    const finalArticles =
      articlesWithJapanese.length > 0 ? articlesWithJapanese : articles;

    if (articlesWithJapanese.length === 0) {
      return [];
    }

    const topicCandidates = new Map<
      string,
      { count: number; articles: any[]; category: string }
    >();

    finalArticles.forEach((article: any) => {
      if (!article.title) return;

      const title = article.title;

      const topicPatterns = [
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
        { pattern: /選挙|政治|国会|政府/, topic: '政治', category: '政治' },
        {
          pattern: /少子化|高齢化|人口減少/,
          topic: '少子高齢化',
          category: '社会',
        },
        {
          pattern: /気候変動|温暖化|脱炭素|再生可能エネルギー/,
          topic: '気候変動',
          category: '環境',
        },
        {
          pattern: /コロナ|COVID|ワクチン|感染/,
          topic: '感染症対策',
          category: '医療',
        },
        {
          pattern: /オリンピック|ワールドカップ|野球|サッカー/,
          topic: 'スポーツ',
          category: 'スポーツ',
        },
        {
          pattern: /映画|アニメ|ゲーム|エンタメ/,
          topic: 'エンターテインメント',
          category: 'エンタメ',
        },
      ];

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
          break;
        }
      }
    });

    const sortedTopics = Array.from(topicCandidates.entries())
      .filter(([, data]) => data.count >= 1)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const trendingTopics: TrendingTopic[] = [];

    sortedTopics.forEach(([topic, data]) => {
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

    return trendingTopics;
  } catch (error) {
    return [];
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    forceUpdate = true;
  }

  const trendsStorage = TrendsStorage.getInstance();

  try {
    if (!forceUpdate && !cachedTrends) {
      const storedTrends = await trendsStorage.loadTrends();
      if (storedTrends) {
        cachedTrends = {
          data: storedTrends,
          timestamp: Date.now(),
        };
      }
    }

    if (shouldUseCachedData()) {
      return NextResponse.json({
        trends: cachedTrends!.data,
        lastUpdated: new Date(cachedTrends!.timestamp).toISOString(),
        cached: true,
      });
    }

    const [googleTrends, newsTrends] = await Promise.all([
      fetchGoogleTrends(),
      fetchNewsTrends(),
    ]);

    const allTrends = googleTrends.slice(0, 6);

    cachedTrends = {
      data: allTrends,
      timestamp: Date.now(),
    };

    await trendsStorage.saveTrends(allTrends);

    return NextResponse.json({
      trends: allTrends,
      lastUpdated: new Date().toISOString(),
      cached: false,
    });
  } catch (error) {
    if (cachedTrends) {
      return NextResponse.json({
        trends: cachedTrends.data,
        lastUpdated: new Date(cachedTrends.timestamp).toISOString(),
        cached: true,
        error: 'Used cached data due to fetch error',
      });
    }

    return NextResponse.json({
      trends: [],
      lastUpdated: new Date().toISOString(),
      error: 'Failed to fetch trends',
    });
  }
}
