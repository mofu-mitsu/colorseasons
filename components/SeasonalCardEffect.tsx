'use client';

import React from 'react';
import { motion } from 'motion/react';
import { SeasonType } from '@/lib/color-analysis';

interface SeasonalCardEffectProps {
  season: SeasonType;
}

export default function SeasonalCardEffect({ season }: SeasonalCardEffectProps) {
  if (season === 'summer') {
    // 🫧 夏：サイダーの泡としゅわしゅわ炭酸、水面の揺らぎ
    const bubbles = Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      left: (i * 4.6 + (i % 3) * 2) % 96 + 2, // 2% - 98%
      size: 6 + (i % 5) * 5, // 6px - 26px
      duration: 3 + (i % 4) * 1.2,
      delay: (i * 0.3) % 4,
      drift: (i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 6),
    }));

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0">
        {/* 水面の波光グラデーション */}
        <div className="absolute inset-0 bg-gradient-to-t from-sky-200/30 via-indigo-100/20 to-transparent" />
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-200/35 rounded-full blur-2xl animate-pulse" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-purple-200/30 rounded-full blur-2xl" />

        {/* しゅわしゅわ立ち上るサイダーの泡 */}
        {bubbles.map((b) => (
          <motion.div
            key={b.id}
            initial={{ y: '105%', x: 0, opacity: 0, scale: 0.6 }}
            animate={{
              y: '-10%',
              x: [0, b.drift, -b.drift / 2, 0],
              opacity: [0, 0.85, 0.85, 0],
              scale: [0.6, 1.1, 1, 1.2],
            }}
            transition={{
              duration: b.duration,
              repeat: Infinity,
              delay: b.delay,
              ease: 'easeOut',
            }}
            style={{
              left: `${b.left}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
            }}
            className="absolute bottom-0 rounded-full border border-sky-300/80 bg-radial from-white via-sky-100/60 to-transparent shadow-xs backdrop-blur-2xs"
          >
            {/* 泡の光反射ハイライト */}
            <div className="absolute top-[18%] left-[22%] w-[25%] h-[25%] rounded-full bg-white opacity-90" />
          </motion.div>
        ))}

        {/* 夕暮れ水面のグラデーションリップル */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-sky-300/20 to-transparent" />
      </div>
    );
  }

  if (season === 'spring') {
    // 🌸 春：月明かりの夜桜、舞う桜花弁
    const petals = Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      left: (i * 7.2) % 94 + 3,
      size: 14 + (i % 3) * 6,
      duration: 4.5 + (i % 3) * 1.5,
      delay: (i * 0.4) % 4,
    }));

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0">
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-amber-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-rose-200/25 rounded-full blur-3xl" />

        {/* 舞い散る花びら */}
        {petals.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: '-10%', x: 0, rotate: 0, opacity: 0 }}
            animate={{
              y: '105%',
              x: [(p.id % 2 === 0 ? 20 : -20), (p.id % 2 === 0 ? -15 : 15), 0],
              rotate: [0, 180, 360],
              opacity: [0, 0.75, 0.75, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
            }}
            className="absolute top-0 text-rose-300"
          >
            <svg viewBox="0 0 24 24" fill="#FDA4AF" className="w-full h-full drop-shadow-2xs">
              <path d="M12 2C15 6 18 10 18 14C18 17.5 15.5 20 12 20C8.5 20 6 17.5 6 14C6 10 9 6 12 2Z" />
            </svg>
          </motion.div>
        ))}
      </div>
    );
  }

  if (season === 'autumn') {
    // 🍁 秋：滲む紅葉、水彩の温もり
    const leaves = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      left: (i * 8.5) % 92 + 4,
      size: 16 + (i % 3) * 6,
      duration: 5 + (i % 3) * 1.5,
      delay: (i * 0.5) % 4,
      color: i % 2 === 0 ? '#EA580C' : '#D97706',
    }));

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0">
        <div className="absolute -top-10 -left-10 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl" />

        {leaves.map((l) => (
          <motion.div
            key={l.id}
            initial={{ y: '-10%', x: 0, rotate: 0, opacity: 0 }}
            animate={{
              y: '105%',
              x: [(l.id % 2 === 0 ? 25 : -25), (l.id % 2 === 0 ? -20 : 20), 0],
              rotate: [0, 90, 180, 270],
              opacity: [0, 0.7, 0.7, 0],
            }}
            transition={{
              duration: l.duration,
              repeat: Infinity,
              delay: l.delay,
              ease: 'easeInOut',
            }}
            style={{
              left: `${l.left}%`,
              width: `${l.size}px`,
              height: `${l.size}px`,
            }}
            className="absolute top-0 opacity-75"
          >
            <svg viewBox="0 0 24 24" fill={l.color} className="w-full h-full drop-shadow-2xs">
              <path d="M12 2L13.5 8L19 6L16 11L21 14L15 16L16 22L12 18L8 22L9 16L3 14L8 11L5 6L10.5 8L12 2Z" />
            </svg>
          </motion.div>
        ))}
      </div>
    );
  }

  // ❄️ 冬：氷の花、白銀と雪結晶
  const crystals = Array.from({ length: 16 }).map((_, i) => ({
    id: i,
    left: (i * 6.5) % 94 + 3,
    size: 12 + (i % 4) * 6,
    duration: 4 + (i % 3) * 1.5,
    delay: (i * 0.3) % 4,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0">
      <div className="absolute -top-10 right-10 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl" />

      {crystals.map((c) => (
        <motion.div
          key={c.id}
          initial={{ y: '-10%', x: 0, rotate: 0, opacity: 0 }}
          animate={{
            y: '105%',
            x: [(c.id % 2 === 0 ? 15 : -15), 0],
            rotate: [0, 180, 360],
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            duration: c.duration,
            repeat: Infinity,
            delay: c.delay,
            ease: 'linear',
          }}
          style={{
            left: `${c.left}%`,
            width: `${c.size}px`,
            height: `${c.size}px`,
          }}
          className="absolute top-0 text-blue-200"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="1.8" className="w-full h-full drop-shadow-2xs">
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="5" y1="19" x2="19" y2="5" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
