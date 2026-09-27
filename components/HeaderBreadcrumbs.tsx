'use client';

import React from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faChevronRight, faPalette, faCamera, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { SeasonType } from '@/lib/color-analysis';

interface HeaderBreadcrumbsProps {
  season?: SeasonType | null;
  onReset?: () => void;
  onOpenPaletteGuide?: () => void;
}

export default function HeaderBreadcrumbs({
  season,
  onReset,
  onOpenPaletteGuide,
}: HeaderBreadcrumbsProps) {
  return (
    <header className="w-full bg-white/75 backdrop-blur-md border-b border-rose-100/80 sticky top-0 z-40 transition-colors shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* パンくずリスト */}
        <nav aria-label="Breadcrumb" className="flex items-center text-xs sm:text-sm text-slate-500 overflow-x-auto whitespace-nowrap py-1">
          <ol className="flex items-center gap-1.5 sm:gap-2">
            <li>
              <a
                href="https://mofu-mitsu.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-slate-600 hover:text-rose-600 transition-colors py-1 px-2 rounded-md hover:bg-rose-50"
                title="ホーム（mofu-mitsu.github.io）へ移動"
              >
                <FontAwesomeIcon icon={faHouse} className="w-3.5 h-3.5 text-rose-500" />
                <span className="font-medium">ホーム</span>
              </a>
            </li>
            <li>
              <FontAwesomeIcon icon={faChevronRight} className="w-2.5 h-2.5 text-slate-300" />
            </li>
            <li className="flex items-center gap-1.5 text-slate-900 font-semibold px-2 py-1 bg-rose-50/70 rounded-md text-rose-950">
              <FontAwesomeIcon icon={faPalette} className="w-3.5 h-3.5 text-rose-500" />
              <span>四季色（パーソナルカラー診断）</span>
            </li>
          </ol>
        </nav>

        {/* 右側アクション */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenPaletteGuide && (
            <button
              onClick={onOpenPaletteGuide}
              className="text-xs sm:text-sm font-medium text-slate-700 hover:text-rose-600 bg-white/90 hover:bg-rose-50/80 border border-slate-200/90 rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="春・夏・秋・冬の4シーズンパレット図鑑を見る"
            >
              <FontAwesomeIcon icon={faPalette} className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden md:inline">四季パレット図鑑</span>
              <span className="md:hidden">図鑑</span>
            </button>
          )}

          {season && onReset && (
            <button
              onClick={onReset}
              className="text-xs sm:text-sm font-medium text-rose-700 bg-rose-100/80 hover:bg-rose-200/80 rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="診断をやり直す"
            >
              <FontAwesomeIcon icon={faRotateRight} className="w-3.5 h-3.5" />
              <span>もう一度診断</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
