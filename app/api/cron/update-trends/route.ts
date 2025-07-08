import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('[CRON] トレンド更新ジョブ開始:', new Date().toISOString());
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[CRON] 認証失敗');
    return new Response('Unauthorized', { status: 401 });
  }
  console.log('[CRON] 認証成功');

  try {
    // Vercel環境ではVERCEL_URL、それ以外は環境変数またはデフォルト値を使用
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(
      `${baseUrl}/api/trends`,
      {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          'x-cron-request': 'true', // 小文字に修正
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update trends: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[CRON] トレンド更新成功:', {
      trendsCount: data.trends?.length || 0,
      cached: data.cached,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      trendsCount: data.trends?.length || 0,
      cached: data.cached,
    });
  } catch (error) {
    console.error('[CRON] トレンド更新エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
