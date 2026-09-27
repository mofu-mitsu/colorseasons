'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { SeasonType } from '@/lib/color-analysis';

interface SeasonalAtmosphereProps {
  season?: SeasonType | null;
}

// 決定論的なシード生成関数（SSRとクライアントで完全に同じ値を生成し、Hydration mismatchを防ぐ）
function deterministicSeed(i: number, offset: number = 0): number {
  const x = Math.sin((i + 1) * 12.9898 + offset * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export default function SeasonalAtmosphere({ season }: SeasonalAtmosphereProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 浮遊パーティクル（SSRと完全に一致する決定論的計算）
  const particles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => {
      const rand1 = deterministicSeed(i, 1);
      const rand2 = deterministicSeed(i, 2);
      return {
        id: i,
        x: Number(((i * 5.5 + rand1 * 3) % 96 + 2).toFixed(2)), // 2% - 98%
        delay: Number(((i * 0.35) % 5).toFixed(2)),
        duration: Number((8 + (i % 5) * 1.8).toFixed(2)),
        size: Math.round(14 + (i % 4) * 7),
        rotation: Math.round(rand2 * 360),
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden transition-colors duration-1000">
      {/* 季節ごとの大気グラデーション背景 */}
      {!season && (
        // 初期状態：四季が調和した柔らかいパステル調グラデーション
        <div className="absolute inset-0 bg-gradient-to-tr from-rose-50/60 via-sky-50/50 to-amber-50/50" />
      )}

      {season === 'spring' && (
        // 🌸 春：月明かりの夜桜、クリーム×桜ピンク×若葉
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/70 via-rose-100/60 to-emerald-50/50">
          <div className="absolute top-0 right-10 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-rose-200/30 rounded-full blur-3xl" />
        </div>
      )}

      {season === 'summer' && (
        // 🫧 夏：サイダーの泡と水面、夕暮れの青紫
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/80 via-purple-50/50 to-teal-50/70">
          <div className="absolute top-10 left-1/4 w-[480px] h-[340px] bg-cyan-200/35 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-10 w-[500px] h-[450px] bg-purple-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 left-10 w-96 h-96 bg-teal-200/25 rounded-full blur-3xl" />
        </div>
      )}

      {season === 'autumn' && (
        // 🍁 秋：滲む紅葉、水彩オレンジ×マスタード×テラコッタ
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100/60 via-orange-100/50 to-stone-100/80">
          <div className="absolute top-12 left-10 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-12 w-[400px] h-[350px] bg-amber-300/25 rounded-full blur-3xl" />
        </div>
      )}

      {season === 'winter' && (
        // ❄️ 冬：白銀と氷の花、冴えたロイヤルブルー×アイシーバイオレット
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100/80 via-blue-100/50 to-indigo-100/60">
          <div className="absolute top-5 right-20 w-[420px] h-[400px] bg-blue-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-200/25 rounded-full blur-3xl" />
        </div>
      )}

      {/* 舞い散る/湧き上がる季節のモチーフ粒子（マウント後のみアニメーション開始） */}
      {mounted &&
        particles.map((p) => {
          let content: React.ReactNode = null;
          const isSummer = season === 'summer';

          if (!season || season === 'spring') {
            // 桜の花びら
            content = (
              <svg viewBox="0 0 30 30" width={p.size} height={p.size} className="drop-shadow-sm opacity-60">
                <path d="M 15 2 C 22 10 26 22 15 28 C 4 22 8 10 15 2 Z" fill="#FDA4AF" />
              </svg>
            );
          } else if (season === 'summer') {
            // 涼やかなサイダーの気泡
            content = (
              <div
                style={{ width: p.size, height: p.size }}
                className="relative rounded-full border border-sky-300/80 bg-gradient-to-tr from-sky-200/50 via-white/70 to-indigo-200/40 backdrop-blur-xs opacity-75 shadow-xs"
              >
                <div className="absolute top-[20%] left-[22%] w-[25%] h-[25%] rounded-full bg-white opacity-90" />
              </div>
            );
          } else if (season === 'autumn') {
            // 滲む紅葉・もみじ
            content = (
              <svg viewBox="0 0 40 40" width={p.size * 1.2} height={p.size * 1.2} className="opacity-60 drop-shadow-sm">
                <path
                  d="M20 2 L22 14 L32 10 L26 19 L38 24 L26 27 L28 38 L20 30 L12 38 L14 27 L2 24 L14 19 L8 10 L18 14 Z"
                  fill={p.id % 2 === 0 ? '#E25822' : '#E6A11D'}
                />
              </svg>
            );
          } else if (season === 'winter') {
            // 氷の結晶・雪片
            content = (
              <svg viewBox="0 0 40 40" width={p.size} height={p.size} className="opacity-70 drop-shadow-sm">
                <g stroke="#93C5FD" strokeWidth="2" strokeLinecap="round">
                  <line x1="20" y1="4" x2="20" y2="36" />
                  <line x1="4" y1="20" x2="36" y2="20" />
                  <line x1="9" y1="9" x2="31" y2="31" />
                  <line x1="9" y1="31" x2="31" y2="9" />
                </g>
                <circle cx="20" cy="20" r="3" fill="#BFDBFE" />
              </svg>
            );
          }

          return (
            <motion.div
              key={p.id}
              initial={{
                y: isSummer ? '105vh' : '-10vh',
                x: `${p.x}vw`,
                rotate: p.rotation,
                opacity: 0,
              }}
              animate={{
                y: isSummer ? '-10vh' : '105vh',
                x: [`${p.x}vw`, `${(p.x + (p.id % 2 === 0 ? 4 : -4) + 100) % 100}vw`, `${p.x}vw`],
                rotate: isSummer ? p.rotation : p.rotation + 360,
                opacity: [0, 0.85, 0.85, 0],
              }}
              transition={{
                duration: isSummer ? p.duration * 0.75 : p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: isSummer ? 'easeOut' : 'linear',
              }}
              className="absolute top-0"
            >
              {content}
            </motion.div>
          );
        })}
    </div>
  );
}
