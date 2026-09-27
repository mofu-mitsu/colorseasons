'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { QuestionnaireAnswers } from '@/lib/color-analysis';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faForward, faArrowRight } from '@fortawesome/free-solid-svg-icons';

interface OptionalQuestionnaireProps {
  onComplete: (answers: QuestionnaireAnswers) => void;
  onSkip: () => void;
}

export default function OptionalQuestionnaire({
  onComplete,
  onSkip,
}: OptionalQuestionnaireProps) {
  const [step, setStep] = useState<number>(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});

  const questions = [
    {
      id: 'q1',
      title: 'Q1. 手肌や顔に当てたとき、明るく綺麗に見えるのは？',
      subtitle: '※好きな色ではなく「肌が生き生きと見える色」をお選びください',
      options: [
        {
          key: 'coral',
          label: 'コーラルピンク（黄み・あたたかみ）',
          hex: '#F88379',
          border: 'border-rose-300',
          bg: 'bg-rose-50',
          desc: '肌に血色がふんわり灯り、ツヤ感が出る',
        },
        {
          key: 'rose',
          label: 'ローズピンク（青み・すずやか）',
          hex: '#E06292',
          border: 'border-pink-300',
          bg: 'bg-pink-50',
          desc: '肌の赤みやくすみが引いて、透明感が際立つ',
        },
      ],
    },
    {
      id: 'q2',
      title: 'Q2. 「白」を身につけるなら、どちらが馴染みますか？',
      subtitle: 'Tシャツやブラウスで肌が自然に引き立つ白',
      options: [
        {
          key: 'ivory',
          label: 'アイボリー・生成りホワイト',
          hex: '#FFFFF0',
          textColor: 'text-amber-950',
          border: 'border-amber-200',
          bg: 'bg-amber-50/70',
          desc: '温かみがあり、肌から浮かないやさしい白',
        },
        {
          key: 'white',
          label: 'クリアな純白（スノーホワイト）',
          hex: '#FFFFFF',
          textColor: 'text-slate-900',
          border: 'border-slate-300',
          bg: 'bg-slate-50',
          desc: 'コントラストがはっきりし、涼やかに冴える白',
        },
      ],
    },
    {
      id: 'q3',
      title: 'Q3. 手元に合わせるアクセサリーはどちらが映えますか？',
      subtitle: 'リングやバングル、時計をつけたときの印象',
      options: [
        {
          key: 'gold',
          label: 'キラキラ輝くイエローゴールド',
          hex: '#E5C158',
          border: 'border-amber-300',
          bg: 'bg-amber-50',
          desc: '手肌にしっくり溶け込み、華やかに輝く',
        },
        {
          key: 'silver',
          label: '凛としたシルバー / プラチナ',
          hex: '#C5D0DC',
          border: 'border-slate-300',
          bg: 'bg-slate-100',
          desc: '手肌をクールに引き締め、肌の白さが際立つ',
        },
      ],
    },
    {
      id: 'q4',
      title: 'Q4. 定番のコートやジャケットで褒められやすいのは？',
      subtitle: '羽織ったときに落ち着くベーシックカラー',
      options: [
        {
          key: 'warm_neutral',
          label: 'キャメル・ミルクティーベージュ',
          hex: '#C19A6B',
          border: 'border-amber-300',
          bg: 'bg-amber-50',
          desc: '温もりを感じさせ、やさしい親しみやすさが出る',
        },
        {
          key: 'cool_neutral',
          label: 'ネイビー・チャコールグレー',
          hex: '#2B3954',
          border: 'border-indigo-300',
          bg: 'bg-indigo-50',
          desc: 'すっきりと引き締まり、洗練された印象になる',
        },
      ],
    },
  ];

  const currentQ = questions[step];

  const handleSelect = (key: string) => {
    const updated = {
      ...answers,
      [currentQ.id]: key,
    };
    setAnswers(updated);

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(updated);
    }
  };

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-8 shadow-xl border border-rose-100 max-w-xl mx-auto">
      {/* 上部ヘッダー＆プログレス */}
      <div className="flex items-center justify-between mb-4 text-xs font-semibold text-slate-500">
        <span className="text-rose-600">
          追加チェック（任意） {step + 1} / {questions.length}
        </span>
        <button
          onClick={onSkip}
          className="text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
          title="質問をスキップして写真解析だけで結果を見る"
        >
          <span>スキップして結果へ</span>
          <FontAwesomeIcon icon={faForward} className="w-3 h-3" />
        </button>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-300 rounded-full"
          style={{ width: `${((step + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="mb-6">
        <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
          {currentQ.title}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {currentQ.subtitle}
        </p>
      </div>

      {/* 2択のカラー比較カード */}
      <div className="space-y-3.5 mb-6">
        {currentQ.options.map((opt) => (
          <motion.button
            key={opt.key}
            onClick={() => handleSelect(opt.key)}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 text-left shadow-2xs hover:shadow-md cursor-pointer ${opt.border} ${opt.bg}`}
          >
            <div
              style={{ backgroundColor: opt.hex }}
              className="w-14 h-14 rounded-2xl shadow-inner border border-black/10 shrink-0 flex items-center justify-center"
            >
              <div className="w-4 h-4 rounded-full bg-white/40 shadow-xs" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-800 text-sm sm:text-base">
                {opt.label}
              </div>
              <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {opt.desc}
              </div>
            </div>

            <div className="w-7 h-7 rounded-full bg-white/80 border border-slate-300 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-rose-500">
              <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* 下部スキップ導線 */}
      <div className="text-center pt-2">
        <button
          onClick={onSkip}
          className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
        >
          質問に答えず、写真解析の結果をそのまま見る
        </button>
      </div>
    </div>
  );
}
