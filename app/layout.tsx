import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const siteUrl = 'https://colorseasons.vercel.app';
const siteTitle = '四季色 - 手のひらから探すパーソナルカラー診断 | イエベ・ブルベ色彩解析';
const siteDescription =
  '顔写真不要！手の甲や手のひらの肌色からOKLCH色空間で瞬間解析。春・夏・秋・冬の四季の世界観に染まる、オオマシコ（りえこ）が案内するパーソナルカラー診断。似合うカラーパレット＆楽天市場おすすめアイテム提案。';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  keywords: [
    'パーソナルカラー診断',
    '手 写真 診断',
    'パーソナルカラー 手の色',
    'イエベ春',
    'ブルベ夏',
    'イエベ秋',
    'ブルベ冬',
    '四季色',
    'COLOR SEASONS',
    'オオマシコ',
    'OKLCH',
    '似合う色',
    'カラーパレット',
    '無料診断',
  ],
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/favicon.svg' }],
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    siteName: '四季色 (COLOR SEASONS)',
    locale: 'ja_JP',
    images: [
      {
        url: `${siteUrl}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '四季色 - 手のひらから探すパーソナルカラー診断',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [`${siteUrl}/ogp.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Schema.org 構造化データ (WebApplication)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '四季色 - 手のひらから探すパーソナルカラー診断',
    alternateName: 'COLOR SEASONS',
    url: siteUrl,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'All',
    description: siteDescription,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
    },
    featureList: [
      '手の甲・手のひらの肌色OKLCH瞬間解析',
      'イエベ春・ブルベ夏・イエベ秋・ブルベ冬の四季世界観ビジュアル',
      '似合う代表12色カラーパレット',
      '診断結果カードの高解像度画像保存',
      '楽天市場おすすめカラーアイテム連携',
    ],
  };

  return (
    <html lang="ja">
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-GNTX973GET"
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-GNTX973GET');
            `,
          }}
        />
        {/* Schema.org 構造化データ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-rose-200 selection:text-rose-900">
        {children}
      </body>
    </html>
  );
}
