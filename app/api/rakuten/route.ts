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

    // 同じキーワードでも結果を入れ替えられるよう、検索ページを受け取る
    const requestedPage = Number(searchParams.get('page') || '1');
    const page = Number.isFinite(requestedPage)
      ? Math.min(100, Math.max(1, Math.floor(requestedPage)))
      : 1;

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    // 環境変数の柔軟な検出
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

    // クライアントからのReferer / Origin を取得、なければ本番URL
    const incomingReferer = req.headers.get('referer') || '';
    const incomingOrigin = req.headers.get('origin') || '';
    const fallbackSiteUrl = 'https://colorseasons.vercel.app';
    const siteReferer = incomingReferer || incomingOrigin || fallbackSiteUrl;

    const envStatus = {
      appIdConfigured: !!appId,
      appIdLength: appId ? appId.length : 0,
      appIdHint: appId ? `${appId.slice(0, 3)}...${appId.slice(-3)}` : 'missing',
      accessKeyConfigured: !!accessKey,
      accessKeyLength: accessKey ? accessKey.length : 0,
      affiliateIdConfigured: !!affiliateId,
      siteReferer,
    };

    console.log('[Rakuten API] Request keyword:', keyword, 'EnvStatus:', envStatus);

    if (!appId || !accessKey) {
      console.warn('[Rakuten API] Credentials not found in process.env');
      return NextResponse.json({
        configured: false,
        error: 'Rakuten credentials not configured in environment variables.',
        envStatus,
        items: [],
      });
    }

    // 複数のキーワード候補を生成（柔軟検索用フォールバック）
    // 例: "コーラルピンク ワンピース 春" -> ["コーラルピンク ワンピース 春", "コーラルピンク ワンピース", "コーラルピンク"]
    const cleanKw = keyword.trim();
    const words = cleanKw.split(/[\s　]+/);
    const keywordCandidates: string[] = [cleanKw];
    if (words.length > 2) {
      keywordCandidates.push(words.slice(0, 2).join(' '));
    }
    if (words.length > 1) {
      keywordCandidates.push(words[0]);
    }

    // 楽天 新API (20260701) へのリクエストヘッダー
    // ※ REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING を防ぐため Referer と Origin を両方設定
    const headers: Record<string, string> = {
      accessKey: accessKey.trim(),
      Referer: siteReferer.endsWith('/') ? siteReferer : `${siteReferer}/`,
      Origin: incomingOrigin || fallbackSiteUrl,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    let lastErrorDetails = '';
    let lastStatus = 200;
    let successfulData: any = null;
    let matchedKeyword = cleanKw;

    // 候補キーワードで順番に検索を試行（ヒットした時点で終了）
    for (const kw of keywordCandidates) {
      const targetUrl = new URL('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701');
      targetUrl.searchParams.set('applicationId', appId.trim());
      targetUrl.searchParams.set('keyword', kw);
      targetUrl.searchParams.set('format', 'json');
      targetUrl.searchParams.set('hits', '12');
      targetUrl.searchParams.set('page', String(page));

      if (affiliateId) {
        targetUrl.searchParams.set('affiliateId', affiliateId.trim());
      }

      console.log(`[Rakuten API] Fetching candidate: "${kw}", page=${page}, URL:`, targetUrl.toString());

      try {
        const response = await fetch(targetUrl.toString(), {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        lastStatus = response.status;
        const rawText = await response.text();

        if (!response.ok) {
          console.warn(`[Rakuten API] HTTP ${lastStatus} for "${kw}":`, rawText);
          lastErrorDetails = rawText;
          // もし403等の認証/Refererエラーなら他キーワードでも同じなのでループを抜ける
          if (lastStatus === 403 || lastStatus === 401) {
            break;
          }
          continue;
        }

        const parsed = JSON.parse(rawText);
        const candidateItems = parsed?.Items || parsed?.items || [];
        if (Array.isArray(candidateItems) && candidateItems.length > 0) {
          successfulData = parsed;
          matchedKeyword = kw;
          break; // ヒットしたら抜ける
        }
      } catch (err: any) {
        console.error(`[Rakuten API] Fetch error for "${kw}":`, err);
        lastErrorDetails = err?.message || String(err);
      }
    }

    if (!successfulData) {
      console.warn('[Rakuten API] No items found or API blocked:', lastStatus, lastErrorDetails);
      return NextResponse.json({
        configured: true,
        success: false,
        error: `Rakuten API returned status ${lastStatus}`,
        details: lastErrorDetails.slice(0, 600),
        envStatus,
        keyword: cleanKw,
        items: [],
      });
    }

    const rawItems: any[] =
      successfulData?.Items ||
      successfulData?.items ||
      successfulData?.results ||
      [];

    const normalizedItems: RakutenProductItem[] = rawItems
      .map((entry: any, index: number): RakutenProductItem | null => {
        const item = entry.Item || entry.item || entry;
        if (!item || typeof item !== 'object') return null;

        const itemName = item.itemName || item.title || item.name || `楽天市場 アイテム ${index + 1}`;
        const rawPrice = item.itemPrice ?? item.price ?? 0;
        const itemPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;

        const itemUrl =
          item.affiliateUrl ||
          item.itemUrl ||
          item.url ||
          `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(cleanKw)}/`;

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
        }

        if (imageUrl && imageUrl.startsWith('http://')) {
          imageUrl = imageUrl.replace('http://', 'https://');
        }

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

    console.log('[Rakuten API] Successfully returned items:', normalizedItems.length, 'for kw:', matchedKeyword);

    return NextResponse.json({
      configured: true,
      success: true,
      keyword: cleanKw,
      matchedKeyword,
      totalHits: successfulData.count || successfulData.totalHits || normalizedItems.length,
      items: normalizedItems,
      rawItemCount: rawItems.length,
      page,
      envStatus,
    });
  } catch (error: any) {
    console.error('[Rakuten API] Unhandled Exception:', error);
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
