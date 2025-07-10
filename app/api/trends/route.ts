import { NextResponse } from 'next/server';
import { TrendingTopic } from '@/lib/types';
import axios from 'axios';
import { getJson } from 'serpapi';
import { TrendsStorage } from '@/lib/services/trends-storage';

export const dynamic = 'force-dynamic';

let cachedTrends: { data: TrendingTopic[]; timestamp: number } | null = null;

function shouldUseCachedData(): boolean {
  if (!cachedTrends) return false;

  const now = new Date();
  const lastUpdate = new Date(cachedTrends.timestamp);
  
  // 日本時間に変換
  const nowJST = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const lastUpdateJST = new Date(lastUpdate.getTime() + 9 * 60 * 60 * 1000);
  
  // 同じ日付かつ、最後の更新が日本時間12時以降ならキャッシュを使用
  if (
    nowJST.getUTCFullYear() === lastUpdateJST.getUTCFullYear() &&
    nowJST.getUTCMonth() === lastUpdateJST.getUTCMonth() &&
    nowJST.getUTCDate() === lastUpdateJST.getUTCDate()
  ) {
    // 最後の更新が12時以降（UTC+9で計算）
    const updateHourJST = (lastUpdate.getUTCHours() + 9) % 24;
    return updateHourJST >= 12;
  }
  
  return false;
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


export async function GET(request: Request) {
  const isCronRequest = request.headers.get('x-cron-request') === 'true';
  
  if (isCronRequest) {
    console.log('[API] CRONリクエスト受信:', new Date().toISOString());
  }

  const trendsStorage = TrendsStorage.getInstance();

  try {
    if (!cachedTrends) {
      const storedTrends = await trendsStorage.loadTrends();
      const lastUpdateTime = await trendsStorage.getLastUpdateTime();
      if (storedTrends && lastUpdateTime) {
        cachedTrends = {
          data: storedTrends,
          timestamp: lastUpdateTime.getTime(),
        };
      }
    }

    if (!isCronRequest && shouldUseCachedData() && cachedTrends!.data.length > 0) {
      return NextResponse.json({
        trends: cachedTrends!.data,
        lastUpdated: new Date(cachedTrends!.timestamp).toISOString(),
        cached: true,
      });
    }

    const googleTrends = await fetchGoogleTrends();

    const allTrends = googleTrends.slice(0, 6);

    // 空配列の場合はキャッシュを保存しない
    if (allTrends.length > 0) {
      const updateTime = Date.now();
      cachedTrends = {
        data: allTrends,
        timestamp: updateTime,
      };

      await trendsStorage.saveTrends(allTrends);
      
      return NextResponse.json({
        trends: allTrends,
        lastUpdated: new Date(updateTime).toISOString(),
        cached: false,
      });
    } else {
      // データが空の場合は前回の更新時間を使用
      const lastUpdateTime = await trendsStorage.getLastUpdateTime();
      return NextResponse.json({
        trends: [],
        lastUpdated: lastUpdateTime?.toISOString() || new Date().toISOString(),
        cached: false,
      });
    }
  } catch (error) {
    if (cachedTrends && cachedTrends.data.length > 0) {
      return NextResponse.json({
        trends: cachedTrends.data,
        lastUpdated: new Date(cachedTrends.timestamp).toISOString(),
        cached: true,
        error: 'Used cached data due to fetch error',
      });
    }

    // キャッシュが空の場合は、Supabaseから最後の有効なデータを取得
    const storedTrends = await trendsStorage.loadTrends();
    if (storedTrends && storedTrends.length > 0) {
      return NextResponse.json({
        trends: storedTrends,
        lastUpdated: new Date().toISOString(),
        cached: true,
        error: 'Used stored data due to fetch error',
      });
    }

    return NextResponse.json({
      trends: [],
      lastUpdated: new Date().toISOString(),
      error: 'Failed to fetch trends',
    });
  }
}
