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

    const appId = process.env.RAKUTEN_APP_ID || process.env.RAKUTEN_APPLICATION_ID;
    const accessKey = process.env.RAKUTEN_ACCESS_KEY;
    const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;

    // 環境変数が設定されていない場合のハンドリング
    if (!appId || !accessKey) {
      return NextResponse.json({
        configured: false,
        items: [],
        message: 'Rakuten API credentials not configured in environment variables.',
      });
    }

    // 楽天 新バージョン API (20260701) へのリクエスト
    const targetUrl = new URL('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701');
    targetUrl.searchParams.set('applicationId', appId);
    targetUrl.searchParams.set('keyword', keyword);
    targetUrl.searchParams.set('format', 'json');
    targetUrl.searchParams.set('hits', '10');

    if (affiliateId) {
      targetUrl.searchParams.set('affiliateId', affiliateId);
    }

    const headers: Record<string, string> = {
      accessKey: accessKey,
      'User-Agent': 'ColorSeasons/1.0',
    };

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers,
      next: { revalidate: 300 }, // 5分キャッシュ
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Rakuten API response not OK:', response.status, errText);
      return NextResponse.json({
        configured: true,
        error: `Rakuten API returned status ${response.status}`,
        items: [],
      });
    }

    const data = await response.json();

    // 楽天APIレスポンスの正規化
    // 構造例: { Items: [ { Item: { itemName, itemPrice, itemUrl, affiliateUrl, mediumImageUrls, shopName } } ] }
    // 新旧API互換
    const rawItems = data?.Items || data?.items || [];
    const normalizedItems: RakutenProductItem[] = rawItems
      .map((entry: any) => {
        const item = entry.Item || entry.item || entry;
        if (!item) return null;

        // 画像URL抽出
        let img = '';
        if (Array.isArray(item.mediumImageUrls) && item.mediumImageUrls.length > 0) {
          const first = item.mediumImageUrls[0];
          img = typeof first === 'string' ? first : first.imageUrl || '';
        } else if (Array.isArray(item.smallImageUrls) && item.smallImageUrls.length > 0) {
          const first = item.smallImageUrls[0];
          img = typeof first === 'string' ? first : first.imageUrl || '';
        } else if (typeof item.imageUrl === 'string') {
          img = item.imageUrl;
        }

        // HTTPSプロトコル強制
        if (img && img.startsWith('http://')) {
          img = img.replace('http://', 'https://');
        }

        return {
          itemName: item.itemName || '楽天市場 商品',
          itemPrice: item.itemPrice ? Number(item.itemPrice) : 0,
          itemUrl: item.affiliateUrl || item.itemUrl || `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`,
          imageUrl: img,
          shopName: item.shopName || '',
        };
      })
      .filter(Boolean)
      .slice(0, 8);

    return NextResponse.json({
      configured: true,
      items: normalizedItems,
      totalHits: data.count || normalizedItems.length,
    });
  } catch (error: any) {
    console.error('Error in /api/rakuten:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch Rakuten products', items: [] },
      { status: 500 }
    );
  }
}
