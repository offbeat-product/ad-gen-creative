import { useState } from 'react';
import { Loader2, Film, Clock, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { useProjectContext } from '@/hooks/useProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import AppealAxisPickerDialog from '@/components/spot/AppealAxisPickerDialog';

const DURATION_OPTIONS = [15, 30, 60] as const;
const CREATIVE_TYPES = [
  { value: 'video', label: '動画' },
  { value: 'banner', label: 'バナー' },
] as const;

export interface SeedInfo {
  pattern_id?: string;
  hook?: string;
  from_job_id?: string;
}

interface Props {
  context: ReturnType<typeof useProjectContext>['context'];
  projectId: string | null;
  appealAxis: string;
  setAppealAxis: (v: string) => void;
  copyText: string;
  setCopyText: (v: string) => void;
  duration: number;
  setDuration: (v: number) => void;
  creativeType: string;
  setCreativeType: (v: string) => void;
  seedInfo: SeedInfo | null;
  onGenerate: () => void;
  isRunning: boolean;
}

const CompositionSettings = ({
  context,
  projectId,
  appealAxis,
  setAppealAxis,
  copyText,
  setCopyText,
  duration,
  setDuration,
  creativeType,
  setCreativeType,
  seedInfo,
  onGenerate,
  isRunning,
}: Props) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const compositionRules =
    context?.rules.filter((r) =>
      ['storyboard', 'script', 'video_horizontal', 'video_vertical'].includes(r.process_type)
    ) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">
        訴求軸・コピー・尺を設定
      </h2>

      {/* Ad Brain 参照情報 */}
      {context && (
        <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 space-y-2">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Ad Brain 参照
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-foreground">
              📋 構成案関連ルール {compositionRules.length}件
            </span>
            {context.corrections && context.corrections.length > 0 && (
              <span className="text-foreground">
                🔁 修正パターン {context.corrections.length}件
              </span>
            )}
            {context.project.copyright_text && (
              <span className="text-muted-foreground">
                © {context.project.copyright_text}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 引き継ぎ情報 */}
      {seedInfo && (
        <div className="rounded-xl border border-secondary/30 bg-secondary-wash/40 p-4 space-y-1">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
            🔗 訴求軸・コピー生成ツールから引き継ぎ
          </div>
          {seedInfo.pattern_id && (
            <div className="text-xs text-muted-foreground">
              パターン: {seedInfo.pattern_id}
            </div>
          )}
          {seedInfo.hook && (
            <div className="text-xs text-muted-foreground">
              💡 狙い: {seedInfo.hook}
            </div>
          )}
        </div>
      )}

      {/* 訴求軸 */}
      <div className="space-y-2">
        <Label htmlFor="appeal-axis">訴求軸</Label>
        <Input
          id="appeal-axis"
          value={appealAxis}
          onChange={(e) => setAppealAxis(e.target.value)}
          placeholder="例: 読み放題の圧倒的お得感"
        />
      </div>

      {/* コピー */}
      <div className="space-y-2">
        <Label htmlFor="copy-text">コピー</Label>
        <Input
          id="copy-text"
          value={copyText}
          onChange={(e) => setCopyText(e.target.value)}
          placeholder="例: 毎月お得に新しい物語と出会える"
        />
      </div>

      {/* 動画尺 */}
      <div className="space-y-3">
        <Label>動画尺</Label>
        <RadioGroup
          value={String(duration)}
          onValueChange={(v) => setDuration(Number(v))}
          className="grid grid-cols-3 gap-3"
        >
          {DURATION_OPTIONS.map((sec) => (
            <Label
              key={sec}
              htmlFor={`dur-${sec}`}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
                duration === sec && 'border-secondary ring-2 ring-secondary/30'
              )}
            >
              <RadioGroupItem value={String(sec)} id={`dur-${sec}`} className="sr-only" />
              <Clock className="h-4 w-4 text-secondary" />
              <span className="font-semibold">{sec}秒</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* クリエイティブタイプ */}
      <div className="space-y-3">
        <Label>クリエイティブタイプ</Label>
        <RadioGroup
          value={creativeType}
          onValueChange={setCreativeType}
          className="grid grid-cols-2 gap-3"
        >
          {CREATIVE_TYPES.map((t) => (
            <Label
              key={t.value}
              htmlFor={`type-${t.value}`}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
                creativeType === t.value && 'border-secondary ring-2 ring-secondary/30'
              )}
            >
              <RadioGroupItem value={t.value} id={`type-${t.value}`} className="sr-only" />
              <Film className="h-4 w-4 text-secondary" />
              <span className="font-semibold">{t.label}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* 実行ボタン */}
      <Button
        onClick={onGenerate}
        disabled={!appealAxis.trim() || !copyText.trim() || isRunning}
        className="w-full h-12"
        size="lg"
        variant="brand"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成中...
          </>
        ) : (
          <>
            <Film className="h-4 w-4 mr-2" /> 構成案を生成
          </>
        )}
      </Button>
    </div>
  );
};

export default CompositionSettings;
