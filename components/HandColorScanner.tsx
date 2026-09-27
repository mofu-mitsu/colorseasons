'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RGB,
  calibrateRGB,
  compensateShadowRGB,
  rgbToHex,
  rgbToOklch,
} from '@/lib/color-analysis';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCamera,
  faUpload,
  faEyeDropper,
  faCheck,
  faSun,
  faArrowRotateLeft,
  faCrosshairs,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { Sparkles, AlertCircle, RefreshCw, ZoomIn, Camera } from 'lucide-react';

interface HandColorScannerProps {
  onColorDetected: (rgb: RGB, calibratedRGB: RGB | null, previewDataUrl?: string) => void;
  isProcessing?: boolean;
}

export default function HandColorScanner({
  onColorDetected,
  isProcessing = false,
}: HandColorScannerProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // 生の抽出色
  const [rawSkinColor, setRawSkinColor] = useState<RGB | null>(null);
  // 陰補正トグル（デフォルトON）
  const [enableShadowCompensation, setEnableShadowCompensation] = useState<boolean>(true);
  // 最終的な測定手肌色
  const [detectedSkinColor, setDetectedSkinColor] = useState<RGB | null>(null);

  const [whiteRefColor, setWhiteRefColor] = useState<RGB | null>(null);
  const [calibratedColor, setCalibratedColor] = useState<RGB | null>(null);
  // スポイトモード: 'skin' (肌色抽出), 'white' (白補正抽出), null
  const [dropperMode, setDropperMode] = useState<'skin' | 'white' | null>('skin');
  const [magnifierPos, setMagnifierPos] = useState<{ x: number; y: number; colorHex: string } | null>(null);
  const [samplePoints, setSamplePoints] = useState<{ x: number; y: number }[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const directCameraInputRef = useRef<HTMLInputElement | null>(null);
  const imageDisplayRef = useRef<HTMLImageElement | null>(null);

  // カメラの起動（マウント保証 ＆ 複数フォールバック）
  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);

    setTimeout(async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('お使いのブラウザではカメラAPIがサポートされていません');
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (envErr) {
          console.warn('Environment camera failed, trying basic video:', envErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraActive(false);
        setCameraError(
          err?.name === 'NotAllowedError'
            ? 'カメラのアクセスが許可されていません。ブラウザ設定で許可するか、「カメラで直撮り」または写真アップロードをご利用ください。'
            : 'カメラの起動に失敗しました。「カメラで直撮り」または写真アップロードをご利用ください。'
        );
        directCameraInputRef.current?.click();
      }
    }, 100);
  };

  // カメラの停止
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // カメラからのシャッター撮影
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();
    processImage(dataUrl);
  };

  // ファイルアップロードハンドラ
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      processImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 陰補正のトグル変更時に即時再計算
  useEffect(() => {
    if (!rawSkinColor) return;
    if (enableShadowCompensation) {
      const compensated = compensateShadowRGB(rawSkinColor);
      setDetectedSkinColor(compensated);
      if (whiteRefColor) {
        setCalibratedColor(calibrateRGB(compensated, whiteRefColor));
      }
    } else {
      setDetectedSkinColor(rawSkinColor);
      if (whiteRefColor) {
        setCalibratedColor(calibrateRGB(rawSkinColor, whiteRefColor));
      }
    }
  }, [enableShadowCompensation, rawSkinColor, whiteRefColor]);

  // 画像の自動サンプリング処理（CORSエラー防止＆フォールバック完備）
  const processImage = (src: string) => {
    setImageSrc(src);
    setWhiteRefColor(null);
    setCalibratedColor(null);
    setDropperMode('skin'); // 写真読み込み時はすぐにスポイトで調整できるようにON

    const img = new Image();
    // ※ data:image の場合に crossOrigin を指定すると Safari / Chrome でブロックされるため指定しない
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = img.naturalWidth || 600;
        canvas.height = img.naturalHeight || 600;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const cw = canvas.width;
        const ch = canvas.height;

        // 手の甲・手首・手のひら全体をカバーする高密度グリッド（25点）
        const candidatePoints: { x: number; y: number }[] = [];
        const xRatios = [0.35, 0.45, 0.52, 0.60, 0.70];
        const yRatios = [0.25, 0.35, 0.45, 0.55, 0.65];
        yRatios.forEach((yr) => {
          xRatios.forEach((xr) => {
            candidatePoints.push({
              x: Math.round(cw * xr),
              y: Math.round(ch * yr),
            });
          });
        });

        // 各ポイントの局所平均カラーと明度（L）を測定
        const pointColors: { pt: { x: number; y: number }; rgb: RGB; l: number; c: number }[] = [];
        const pSize = 7;

        candidatePoints.forEach((pt) => {
          const startX = Math.max(0, pt.x - 3);
          const startY = Math.max(0, pt.y - 3);
          const imgData = ctx.getImageData(startX, startY, pSize, pSize);
          const data = imgData.data;

          let rSum = 0, gSum = 0, bSum = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            rSum += data[i];
            gSum += data[i + 1];
            bSum += data[i + 2];
            count++;
          }
          if (count > 0) {
            const sample: RGB = {
              r: Math.round(rSum / count),
              g: Math.round(gSum / count),
              b: Math.round(bSum / count),
            };

            // 明らかな背景（黒、白飛び、服の青・緑など）を除外した肌色判定
            const isSkinLike =
              sample.r > 80 &&
              sample.r >= sample.g &&
              sample.r > sample.b &&
              sample.r - sample.b < 120 &&
              sample.r - sample.g < 80;

            if (isSkinLike) {
              const oklch = rgbToOklch(sample);
              pointColors.push({ pt, rgb: sample, l: oklch.l, c: oklch.c });
            }
          }
        });

        // 🌟【ハイライト優先 ＆ 影除外フィルタ】
        // 肌色候補のうち、影になって暗いピクセル（下位50%）を大胆にカットし、
        // 最も光が綺麗に当たって透明感のある「ハイライト〜上位健全ゾーン（上位50%）」を抽出！
        pointColors.sort((a, b) => a.l - b.l);
        const startIndex = Math.floor(pointColors.length * 0.50);
        const endIndex = Math.max(startIndex + 1, Math.floor(pointColors.length * 0.95));
        const healthySamples = pointColors.slice(startIndex, endIndex);

        const validSamples = healthySamples.length > 0 ? healthySamples : pointColors;
        setSamplePoints(validSamples.map((s) => s.pt));

        let avgR = 0, avgG = 0, avgB = 0;
        validSamples.forEach((s) => {
          avgR += s.rgb.r;
          avgG += s.rgb.g;
          avgB += s.rgb.b;
        });
        const rawAvgRGB: RGB = {
          r: Math.round(avgR / Math.max(1, validSamples.length)),
          g: Math.round(avgG / Math.max(1, validSamples.length)),
          b: Math.round(avgB / Math.max(1, validSamples.length)),
        };

        setRawSkinColor(rawAvgRGB);

        // 陰補正の適用
        if (enableShadowCompensation) {
          const compensated = compensateShadowRGB(rawAvgRGB);
          setDetectedSkinColor(compensated);
        } else {
          setDetectedSkinColor(rawAvgRGB);
        }
      } catch (err) {
        console.error('Error in canvas processImage:', err);
        // フォールバック肌色
        const fallbackRGB: RGB = { r: 228, g: 182, b: 160 };
        setRawSkinColor(fallbackRGB);
        setDetectedSkinColor(fallbackRGB);
      }
    };

    img.onerror = (err) => {
      console.error('Image load error:', err);
      const fallbackRGB: RGB = { r: 228, g: 182, b: 160 };
      setRawSkinColor(fallbackRGB);
      setDetectedSkinColor(fallbackRGB);
    };

    img.src = src;
  };

  // スポイト処理（画像タップ）
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageDisplayRef.current || !canvasRef.current) return;

    const imgElem = imageDisplayRef.current;
    const rect = imgElem.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const targetX = Math.round(clickX * scaleX);
    const targetY = Math.round(clickY * scaleY);

    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      const pixelData = ctx.getImageData(
        Math.max(0, targetX - 2),
        Math.max(0, targetY - 2),
        5,
        5
      ).data;

      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let i = 0; i < pixelData.length; i += 4) {
        rSum += pixelData[i];
        gSum += pixelData[i + 1];
        bSum += pixelData[i + 2];
        count++;
      }

      const pickedRGB: RGB = {
        r: Math.round(rSum / count),
        g: Math.round(gSum / count),
        b: Math.round(bSum / count),
      };

      if (dropperMode === 'white') {
        // 白補正基準の指定
        setWhiteRefColor(pickedRGB);
        const baseSkin = detectedSkinColor || rawSkinColor || pickedRGB;
        setCalibratedColor(calibrateRGB(baseSkin, pickedRGB));
        setDropperMode('skin'); // 白指定後は肌色スポイトに戻す
      } else {
        // 肌色の直接スポイト抽出
        setRawSkinColor(pickedRGB);
        const finalSkin = enableShadowCompensation ? compensateShadowRGB(pickedRGB) : pickedRGB;
        setDetectedSkinColor(finalSkin);
        if (whiteRefColor) {
          setCalibratedColor(calibrateRGB(finalSkin, whiteRefColor));
        }
      }
    } catch (err) {
      console.warn('Dropper pick error:', err);
    }

    setMagnifierPos(null);
  };

  // スポイトマウス移動時のルーペ
  const handleImageMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageDisplayRef.current || !canvasRef.current) {
      if (magnifierPos) setMagnifierPos(null);
      return;
    }

    const imgElem = imageDisplayRef.current;
    const rect = imgElem.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const targetX = Math.round(x * scaleX);
    const targetY = Math.round(y * scaleY);

    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      const pixel = ctx.getImageData(
        Math.max(0, targetX),
        Math.max(0, targetY),
        1,
        1
      ).data;
      const colorHex = rgbToHex({ r: pixel[0], g: pixel[1], b: pixel[2] });
      setMagnifierPos({ x, y, colorHex });
    } catch (err) {
      // 無視
    }
  };

  // 確定ボタン（確実に診断を実行）
  const handleConfirm = () => {
    const finalSkin = detectedSkinColor || rawSkinColor || { r: 228, g: 182, b: 160 };
    console.log('診断実行:', finalSkin, '白補正:', calibratedColor);
    onColorDetected(finalSkin, calibratedColor, imageSrc || undefined);
  };

  // 終了時にカメラ停止
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const activeColor = calibratedColor || detectedSkinColor || rawSkinColor;
  const activeOklch = activeColor ? rgbToOklch(activeColor) : null;

  return (
    <div className="w-full bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-8 shadow-xl border border-rose-100 max-w-2xl mx-auto transition-all">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100/70 text-rose-800 text-xs font-semibold rounded-full mb-2">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>手の肌色 × OKLCH 瞬間色彩解析</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
          手の写真を撮影・アップロード
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          顔写真を使わず、手の甲や手のひらの色からパーソナルカラーを判定。画像はサーバーに保存されず、ブラウザ内で即時に解析されます。
        </p>
      </div>

      {/* カメラエラー案内 */}
      {cameraError && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">{cameraError}</div>
        </div>
      )}

      {/* カメラプレビュー画面 */}
      {cameraActive && (
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-rose-400 aspect-4/3 flex items-center justify-center mb-6 shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* ガイド枠 */}
          <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-white/80 rounded-2xl pointer-events-none flex flex-col items-center justify-center text-white/90 text-sm font-medium drop-shadow-md">
            <span className="text-4xl mb-2">🖐️</span>
            <span>枠の中に手の甲または手のひらを合わせてね</span>
          </div>

          {/* カメラ操作バー */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4 z-20">
            <button
              onClick={capturePhoto}
              className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <FontAwesomeIcon icon={faCamera} className="w-4 h-4" />
              <span>シャッターを押す</span>
            </button>
            <button
              onClick={stopCamera}
              className="px-4 py-3 bg-white/80 hover:bg-white text-slate-700 rounded-full font-medium text-sm transition-all cursor-pointer shadow-md"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 画像プレビュー＆解析画面 */}
      {imageSrc && !cameraActive && (
        <div className="space-y-4 mb-6">
          {/* 🎯 スポイト操作バー（目立つように写真の上に常時配置！） */}
          <div className="bg-slate-900 text-white p-2.5 sm:p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-xs shrink-0">
                <FontAwesomeIcon icon={faEyeDropper} className="w-3 h-3" />
              </span>
              <span className="text-xs font-bold">
                {dropperMode === 'white'
                  ? '白い紙やハンカチをタップしてください'
                  : '手の上をタップして好きな肌色をスポイトできます'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDropperMode('skin')}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  dropperMode === 'skin'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <FontAwesomeIcon icon={faCrosshairs} className="w-3 h-3" />
                <span>肌色スポイト</span>
              </button>

              <button
                type="button"
                onClick={() => setDropperMode(dropperMode === 'white' ? 'skin' : 'white')}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  dropperMode === 'white'
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <span>🤍 白補正</span>
              </button>
            </div>
          </div>

          {/* 写真表示コンテナ（どこをタップしても色を抽出できる） */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-300 aspect-4/3 max-h-[380px] flex items-center justify-center select-none shadow-inner cursor-crosshair">
            <img
              ref={imageDisplayRef}
              src={imageSrc}
              alt="Uploaded Hand Preview"
              onClick={handleImageClick}
              onMouseMove={handleImageMouseMove}
              onMouseLeave={() => setMagnifierPos(null)}
              className="w-full h-full object-contain"
            />

            {/* スポイトルーペ表示 */}
            {magnifierPos && (
              <div
                style={{
                  left: magnifierPos.x + 15,
                  top: magnifierPos.y - 45,
                }}
                className="absolute pointer-events-none z-30 flex items-center gap-2 bg-slate-900/95 text-white px-2.5 py-1.5 rounded-full text-xs shadow-xl backdrop-blur-xs border border-white/40"
              >
                <div
                  style={{ backgroundColor: magnifierPos.colorHex }}
                  className="w-4 h-4 rounded-full border border-white shadow-2xs"
                />
                <span className="font-mono text-[11px] font-bold">{magnifierPos.colorHex}</span>
              </div>
            )}
          </div>

          {/* タップスポイトの案内バナー */}
          <div className="px-3.5 py-2 bg-indigo-50/80 rounded-xl border border-indigo-200/70 text-xs text-indigo-900 flex items-center gap-2">
            <span className="text-base shrink-0">💡</span>
            <span className="text-[11px] leading-relaxed">
              <strong>影を避けるコツ:</strong> 写真の中で<strong>手の甲・手首の一番白く明るい部分</strong>をタップすると、影の影響を完全にキャンセルした本来の透明感肌色（ブルベ／イエベ）が直接スポイトできます！
            </span>
          </div>

          {/* 🌟 陰・照度補正（イエベ化防止）トグル ＆ 状態カード */}
          <div className="p-3.5 bg-gradient-to-r from-amber-50/70 via-rose-50/70 to-sky-50/70 rounded-2xl border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    スマート陰・照度補正（イエベ化防止）
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      enableShadowCompensation
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {enableShadowCompensation ? '補正ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                  スマホの影や室内光による「暗部での黄色かぶり」を自動計算し、本来のアンダートーン（ブルベ／イエベ）へ適正復元します。
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEnableShadowCompensation(!enableShadowCompensation)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs border ${
                enableShadowCompensation
                  ? 'bg-white text-rose-600 border-rose-300 hover:bg-rose-50'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              {enableShadowCompensation ? '補正をオフにする' : '補正をオンにする'}
            </button>
          </div>

          {/* 抽出された肌色とコントロール */}
          {activeColor && activeOklch && (
            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>測定された手肌色</span>
                  {enableShadowCompensation && (
                    <span className="text-[10px] text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded font-medium">
                      陰補正済
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-500">
                  👆 写真をタップしていつでも色を変更できます
                </span>
              </div>

              {/* カラースウォッチ ＆ OKLCHデータ */}
              <div className="flex items-center gap-4">
                <div
                  style={{ backgroundColor: rgbToHex(activeColor) }}
                  className="w-14 h-14 rounded-2xl shadow-md border-2 border-white ring-1 ring-slate-200 shrink-0 transition-colors"
                />
                <div className="text-xs text-slate-600 space-y-0.5 font-mono flex-1">
                  <div>
                    HEX: <span className="font-bold text-slate-800">{rgbToHex(activeColor)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    L: {(activeOklch.l * 100).toFixed(1)}% | C: {activeOklch.c.toFixed(3)} | H: {activeOklch.h.toFixed(1)}°
                  </div>
                  <div className="text-[11px] text-slate-600 font-sans font-semibold">
                    {activeOklch.h >= 220 || activeOklch.h < 48 || (activeColor && activeColor.b >= activeColor.g - 8)
                      ? '💙 ブルーベース傾向 (青み・ピンク・クール)'
                      : '💛 イエローベース傾向 (黄み・ゴールデン)'}
                  </div>
                </div>
              </div>

              {/* 白補正（オプション） */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]">白補正（用紙等）:</span>
                  {whiteRefColor ? (
                    <span className="font-mono text-emerald-600 font-bold flex items-center gap-1">
                      <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                      適用中 ({rgbToHex(whiteRefColor)})
                    </span>
                  ) : (
                    <span className="text-slate-400">未設定</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDropperMode(dropperMode === 'white' ? 'skin' : 'white')}
                  className="text-xs text-slate-600 hover:text-rose-600 underline cursor-pointer"
                >
                  {whiteRefColor ? '白基準を再指定' : '白い紙を基準に補正'}
                </button>
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 py-3.5 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-full font-bold text-sm shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>色彩解析中...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                  <span>この肌色でパーソナルカラーを診断する</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setImageSrc(null);
                setDetectedSkinColor(null);
                setRawSkinColor(null);
                setWhiteRefColor(null);
                setCalibratedColor(null);
              }}
              className="p-3.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
              title="写真を撮り直す"
            >
              <FontAwesomeIcon icon={faArrowRotateLeft} className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* アップロード・撮影選択ボタン（未撮影時） */}
      {!imageSrc && !cameraActive && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. リアルタイムカメラ起動ボタン */}
            <button
              onClick={startCamera}
              className="p-5 rounded-2xl border-2 border-dashed border-rose-300 hover:border-rose-500 bg-rose-50/50 hover:bg-rose-50 transition-all flex flex-col items-center justify-center gap-2 text-rose-700 group cursor-pointer shadow-2xs"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <FontAwesomeIcon icon={faCamera} className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm">カメラで手を撮影</span>
              <span className="text-[11px] text-slate-500">枠に合わせてシャッター</span>
            </button>

            {/* 2. 写真アップロード（ライブラリ選択） */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-rose-400 bg-slate-50/70 hover:bg-rose-50/30 transition-all flex flex-col items-center justify-center gap-2 text-slate-700 group cursor-pointer shadow-2xs"
            >
              <div className="w-12 h-12 rounded-full bg-slate-200 group-hover:bg-rose-100 text-slate-600 group-hover:text-rose-600 flex items-center justify-center group-hover:scale-110 transition-all">
                <FontAwesomeIcon icon={faUpload} className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm">写真フォルダから選択</span>
              <span className="text-[11px] text-slate-500">保存済みの手の写真を解析</span>
            </button>
          </div>

          {/* 隠しインプット */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {/* モバイル向け直撮り用フォールバック */}
          <input
            ref={directCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* サンプルで今すぐ体験（4シーズン完全対応） */}
          <div className="pt-2 text-center">
            <div className="text-xs text-slate-500 mb-2 font-medium">
              写真がない方はこちらから各シーズンのサンプル手肌色で試せます
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* 春 (Spring) */}
              <button
                type="button"
                onClick={() => {
                  const sampleRGB: RGB = { r: 240, g: 198, b: 160 }; // イエベ春
                  setRawSkinColor(sampleRGB);
                  setDetectedSkinColor(sampleRGB);
                  const canvas = canvasRef.current || document.createElement('canvas');
                  canvas.width = 400;
                  canvas.height = 300;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#F3F4F6';
                    ctx.fillRect(0, 0, 400, 300);
                    ctx.fillStyle = 'rgb(240, 198, 160)';
                    ctx.beginPath();
                    ctx.ellipse(200, 150, 110, 80, 0, 0, Math.PI * 2);
                    ctx.fill();
                    setImageSrc(canvas.toDataURL());
                  }
                }}
                className="px-2.5 py-2 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="イエベ春の代表的な手肌色サンプル"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#F0C6A0] border border-black/10 shrink-0" />
                <span>🌸 春 (ピーチ肌)</span>
              </button>

              {/* 夏 (Summer) */}
              <button
                type="button"
                onClick={() => {
                  const sampleRGB: RGB = { r: 218, g: 174, b: 168 }; // ブルベ夏
                  setRawSkinColor(sampleRGB);
                  setDetectedSkinColor(sampleRGB);
                  const canvas = canvasRef.current || document.createElement('canvas');
                  canvas.width = 400;
                  canvas.height = 300;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#F3F4F6';
                    ctx.fillRect(0, 0, 400, 300);
                    ctx.fillStyle = 'rgb(218, 174, 168)';
                    ctx.beginPath();
                    ctx.ellipse(200, 150, 110, 80, 0, 0, Math.PI * 2);
                    ctx.fill();
                    setImageSrc(canvas.toDataURL());
                  }
                }}
                className="px-2.5 py-2 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="ブルベ夏の代表的な手肌色サンプル"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#DAAEA8] border border-black/10 shrink-0" />
                <span>🫧 夏 (ピンク肌)</span>
              </button>

              {/* 秋 (Autumn) */}
              <button
                type="button"
                onClick={() => {
                  const sampleRGB: RGB = { r: 188, g: 142, b: 104 }; // イエベ秋
                  setRawSkinColor(sampleRGB);
                  setDetectedSkinColor(sampleRGB);
                  const canvas = canvasRef.current || document.createElement('canvas');
                  canvas.width = 400;
                  canvas.height = 300;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#F3F4F6';
                    ctx.fillRect(0, 0, 400, 300);
                    ctx.fillStyle = 'rgb(188, 142, 104)';
                    ctx.beginPath();
                    ctx.ellipse(200, 150, 110, 80, 0, 0, Math.PI * 2);
                    ctx.fill();
                    setImageSrc(canvas.toDataURL());
                  }
                }}
                className="px-2.5 py-2 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="イエベ秋の代表的な手肌色サンプル"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#BC8E68] border border-black/10 shrink-0" />
                <span>🍁 秋 (オークル肌)</span>
              </button>

              {/* 冬 (Winter) */}
              <button
                type="button"
                onClick={() => {
                  const sampleRGB: RGB = { r: 220, g: 156, b: 172 }; // ブルベ冬
                  setRawSkinColor(sampleRGB);
                  setDetectedSkinColor(sampleRGB);
                  const canvas = canvasRef.current || document.createElement('canvas');
                  canvas.width = 400;
                  canvas.height = 300;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#F3F4F6';
                    ctx.fillRect(0, 0, 400, 300);
                    ctx.fillStyle = 'rgb(220, 156, 172)';
                    ctx.beginPath();
                    ctx.ellipse(200, 150, 110, 80, 0, 0, Math.PI * 2);
                    ctx.fill();
                    setImageSrc(canvas.toDataURL());
                  }
                }}
                className="px-2.5 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="ブルベ冬の代表的な手肌色サンプル"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#DC9CAC] border border-black/10 shrink-0" />
                <span>❄️ 冬 (クール肌)</span>
              </button>
            </div>
          </div>

          {/* 撮影のコツ案内カード */}
          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/70 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <FontAwesomeIcon icon={faSun} className="w-3.5 h-3.5 text-amber-600" />
              <span>より正確に診断するための撮影のコツ</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed pl-1">
              <li>☀️ <strong>自然光・明るい室内</strong>（スマホ自体の影が手の上に落ちないよう少し斜めから撮影）</li>
              <li>🚫 <strong>フィルター・加工なし</strong>のそのままの写真が最適です</li>
              <li>🤍 白いコピー用紙やハンカチを手の横に添えると、白補正で精度がさらにアップ！</li>
            </ul>
          </div>
        </div>
      )}

      {/* 非表示Canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
