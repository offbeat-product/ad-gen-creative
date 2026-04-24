import { Clock, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  script: string;
  targetDuration: number; // 15, 30, 60
  className?: string;
}

type QualityLevel =
  | 'good'
  | 'warn_short'
  | 'warn_long'
  | 'too_short'
  | 'too_long'
  | 'empty';

const CHARS_PER_SECOND = 6.7; // ElevenLabs v3 日本語TTS 実測読み上げ速度

/**
 * NA原稿の実質文字数を計算
 * タイムコード・パート名・空白を除去した純粋な読み上げテキストの文字数
 */
const countEffectiveChars = (script: string): number => {
  if (!script) return 0;
  let cleaned = script;
  // タイムコード除去 (0:00-0:02 形式)
  cleaned = cleaned.replace(/\d{1,2}:\d{2}\s*[-〜~–]\s*\d{1,2}:\d{2}/g, '');
  // パート名除去
  cleaned = cleaned.replace(
    /^\s*(冒頭|前半|後半|締め|導入|本編|結び)[::]?\s*$/gm,
    ''
  );
  // 空白・改行除去
  cleaned = cleaned.replace(/\s/g, '');
  return cleaned.length;
};

const estimateDurationSec = (charCount: number): number => {
  return Math.round((charCount / CHARS_PER_SECOND) * 10) / 10;
};

const getQualityLevel = (charCount: number, targetSec: number): QualityLevel => {
  if (charCount === 0) return 'empty';
  const min = Math.floor(targetSec * 5.5);
  const max = Math.ceil(targetSec * 7.5);
  const tooShort = Math.floor(min * 0.8);
  const tooLong = Math.ceil(max * 1.2);

  if (charCount < tooShort) return 'too_short';
  if (charCount > tooLong) return 'too_long';
  if (charCount < min) return 'warn_short';
  if (charCount > max) return 'warn_long';
  return 'good';
};

const getCharRange = (targetSec: number) => ({
  ideal: Math.round(targetSec * CHARS_PER_SECOND),
  min: Math.floor(targetSec * 5.5),
  max: Math.ceil(targetSec * 7.5),
});

export default function DurationPredictionBadge({
  script,
  targetDuration,
  className,
}: Props) {
  const charCount = countEffectiveChars(script);
  const estimatedSec = estimateDurationSec(charCount);
  const deviationSec = Math.round((estimatedSec - targetDuration) * 10) / 10;
  const quality = getQualityLevel(charCount, targetDuration);
  const range = getCharRange(targetDuration);

  if (quality === 'empty') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground',
          className
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        <span>
          NA原稿を入力してください(目標 {targetDuration}秒 / 推奨{' '}
          {range.min}〜{range.max}文字)
        </span>
      </div>
    );
  }

  const styleMap = {
    good: {
      container:
        'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
      icon: CheckCircle2,
      label: '理想的',
    },
    warn_short: {
      container:
        'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
      icon: AlertTriangle,
      label: '少し短め',
    },
    warn_long: {
      container:
        'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
      icon: AlertTriangle,
      label: '少し長め',
    },
    too_short: {
      container:
        'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300',
      icon: AlertCircle,
      label: '短すぎます',
    },
    too_long: {
      container:
        'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300',
      icon: AlertCircle,
      label: '長すぎます',
    },
  } as const;

  const style = styleMap[quality as keyof typeof styleMap];
  const Icon = style.icon;
  const diffChars = range.ideal - charCount;
  const deviationText = deviationSec > 0 ? `+${deviationSec}秒` : `${deviationSec}秒`;

  let advice: string | null = null;
  if (quality === 'too_short' || quality === 'warn_short') {
    advice = `あと ${diffChars}文字 ほど追加推奨(エピソード・具体例・感情表現を足してみてください)`;
  } else if (quality === 'too_long' || quality === 'warn_long') {
    advice = `${Math.abs(diffChars)}文字 ほど削減推奨(冗長な表現を削除してみてください)`;
  }

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-xs space-y-1',
        style.container,
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="space-y-1 leading-relaxed">
          <div className="font-semibold">
            🕐 予測音声長: 約{estimatedSec}秒 / 目標 {targetDuration}秒 (
            {deviationText}) — {style.label}
          </div>
          <div className="opacity-90">
            📊 文字数: {charCount}文字 / 推奨 {range.min}〜{range.max}文字(理想{' '}
            {range.ideal}文字)
          </div>
          {advice && <div className="opacity-90">💡 {advice}</div>}
        </div>
      </div>
    </div>
  );
}
