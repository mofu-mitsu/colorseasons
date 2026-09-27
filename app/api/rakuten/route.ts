// app/api/rakuten/route.ts
// 楽天市場商品検索API (IchibaItem Search 20260701) プロキシエンドポイント

import { NextRequest, NextResponse } from 'next/server';

export interface RakutenProductItem {
  itemName: string;
  itemPrice: number;
  itemUrl: string;
  imageUrl?: string;
  shopName: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get('keyword');

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    // 環境変数の柔軟な検出（プレフィックス違いや命名ブレに対応）
    const appId =
      process.env.RAKUTEN_APP_ID ||
      process.env.RAKUTEN_APPLICATION_ID ||
      process.env.APPLICATION_ID ||
      process.env.NEXT_PUBLIC_RAKUTEN_APP_ID;

    const accessKey =
      process.env.RAKUTEN_ACCESS_KEY ||
      process.env.ACCESS_KEY ||
      process.env.NEXT_PUBLIC_RAKUTEN_ACCESS_KEY;

    const affiliateId =
      process.env.RAKUTEN_AFFILIATE_ID ||
      process.env.AFFILIATE_ID ||
      process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;

    // デバッグ用環境変数ステータス
    const envStatus = {
      appIdConfigured: !!appId,
      appIdLength: appId ? appId.length : 0,
      appIdHint: appId ? `${appId.slice(0, 3)}...${appId.slice(-3)}` : 'missing',
      accessKeyConfigured: !!accessKey,
      accessKeyLength: accessKey ? accessKey.length : 0,
      affiliateIdConfigured: !!affiliateId,
    };

    console.log('[Rakuten API] Request keyword:', keyword, 'EnvStatus:', envStatus);

    // 環境変数が設定されていない場合
    if (!appId || !accessKey) {
      console.warn('[Rakuten API] Credentials not found in process.env');
      return NextResponse.json({
        configured: false,
        error: 'Rakuten credentials not configured in environment variables.',
        envStatus,
        items: [],
      });
    }

    // 楽天 新API (20260701) エンドポイント
    const targetUrl = new URL('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701');
    targetUrl.searchParams.set('applicationId', appId.trim());
    targetUrl.searchParams.set('keyword', keyword.trim());
    targetUrl.searchParams.set('format', 'json');
    targetUrl.searchParams.set('hits', '12');

    if (affiliateId) {
      targetUrl.searchParams.set('affiliateId', affiliateId.trim());
    }

    const headers: Record<string, string> = {
      accessKey: accessKey.trim(),
      'User-Agent': 'ColorSeasons/1.0',
    };

    console.log('[Rakuten API] Fetching:', targetUrl.toString());

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers,
      cache: 'no-store', // リアルタイム動作検証のためキャッシュ無効化
    });

    const status = response.status;
    const rawText = await response.text();

    console.log(`[Rakuten API] Response status: ${status}, Body length: ${rawText.length}`);

    if (!response.ok) {
      console.error('[Rakuten API] HTTP Error:', status, rawText);
      return NextResponse.json({
        configured: true,
        error: `Rakuten API returned HTTP status ${status}`,
        details: rawText.slice(0, 500),
        envStatus,
        items: [],
      });
    }

    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[Rakuten API] JSON parse error:', parseErr, rawText);
      return NextResponse.json({
        configured: true,
        error: 'Failed to parse Rakuten response as JSON',
        details: rawText.slice(0, 500),
        items: [],
      });
    }

    // レスポンスのアイテム配列を柔軟に抽出（新旧API、様々な構造をサポート）
    const rawItems: any[] =
      data?.Items ||
      data?.items ||
      data?.results ||
      data?.itemList ||
      (Array.isArray(data) ? data : []);

    console.log('[Rakuten API] Raw items count:', rawItems.length);

    const normalizedItems: RakutenProductItem[] = rawItems
      .map((entry: any, index: number): RakutenProductItem | null => {
        const item = entry.Item || entry.item || entry;
        if (!item || typeof item !== 'object') return null;

        // 商品名
        const itemName = item.itemName || item.title || item.name || `楽天市場 アイテム ${index + 1}`;

        // 価格
        const rawPrice = item.itemPrice ?? item.price ?? 0;
        const itemPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;

        // 商品URL / アフィリエイトURL
        const itemUrl =
          item.affiliateUrl ||
          item.itemUrl ||
          item.url ||
          `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`;

        // 画像URL抽出
        let imageUrl = '';
        if (Array.isArray(item.mediumImageUrls) && item.mediumImageUrls.length > 0) {
          const first = item.mediumImageUrls[0];
          imageUrl = typeof first === 'string' ? first : first.imageUrl || first.url || '';
        } else if (Array.isArray(item.smallImageUrls) && item.smallImageUrls.length > 0) {
          const first = item.smallImageUrls[0];
          imageUrl = typeof first === 'string' ? first : first.imageUrl || first.url || '';
        } else if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
          const first = item.imageUrls[0];
          imageUrl = typeof first === 'string' ? first : first.imageUrl || first.url || '';
        } else if (typeof item.imageUrl === 'string') {
          imageUrl = item.imageUrl;
        } else if (typeof item.image === 'string') {
          imageUrl = item.image;
        }

        // HTTPSプロトコル補正
        if (imageUrl && imageUrl.startsWith('http://')) {
          imageUrl = imageUrl.replace('http://', 'https://');
        }

        // ショップ名
        const shopName = item.shopName || item.shop?.shopName || item.shop || '';

        return {
          itemName,
          itemPrice,
          itemUrl,
          imageUrl,
          shopName,
        };
      })
      .filter((x): x is RakutenProductItem => x !== null)
      .slice(0, 12);

    console.log('[Rakuten API] Normalized items count:', normalizedItems.length);

    return NextResponse.json({
      configured: true,
      success: true,
      keyword,
      totalHits: data.count || data.totalHits || normalizedItems.length,
      items: normalizedItems,
      rawItemCount: rawItems.length,
      envStatus,
    });
  } catch (error: any) {
    console.error('[Rakuten API] Unhandled Error in /api/rakuten:', error);
    return NextResponse.json(
      {
        configured: false,
        error: error?.message || 'Internal server error while searching Rakuten',
        items: [],
      },
      { status: 500 }
    );
  }
}
