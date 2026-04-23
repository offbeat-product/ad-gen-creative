import { useState } from 'react';
import { Loader2, FileText, Upload, Clock, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { useProjectContext } from '@/hooks/useProjectContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import CompositionPickerDialog, {
  type CompositionScene,
} from '@/components/spot/CompositionPickerDialog';

const formatScenesAsText = (scenes: CompositionScene[]): string =>
  scenes
    .map((s) => {
      const head = `${s.part}${s.time_range ? ` (${s.time_range})` : ''}:`;
      const lines = [head];
      if (s.telop) lines.push(`  テロップ: ${s.telop}`);
      if (s.visual) lines.push(`  映像: ${s.visual}`);
      if (s.narration) lines.push(`  ナレーション: ${s.narration}`);
      return lines.join('\n');
    })
    .join('\n\n');

const DURATION_OPTIONS = [15, 30, 60] as const;

export interface NarrationScriptSeedInfo {
  from_tool?: string;
  from_job_id?: string;
  scenes_preview?: number;
}

interface Props {
  context: ReturnType<typeof useProjectContext>['context'];
  projectId: string | null;
  composition: string;
  setComposition: (v: string) => void;
  duration: number;
  setDuration: (v: number) => void;
  seedInfo: NarrationScriptSeedInfo | null;
  onGenerate: () => void;
  isRunning: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const NarrationScriptSettings = ({
  context,
  projectId,
  composition,
  setComposition,
  duration,
  setDuration,
  seedInfo,
  onGenerate,
  isRunning,
  onFileUpload,
}: Props) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const scriptRules =
    context?.rules.filter((r) =>
      ['script', 'na_script', 'narration'].includes(r.process_type)
    ) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">
        構成案・動画尺を設定
      </h2>

      {/* Ad Brain 参照情報 */}
      {context && (
        <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 space-y-2">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Ad Brain 参照
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-foreground">
              📋 NA関連ルール {scriptRules.length}件
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
            🔗 構成案生成ツールから引き継ぎ
          </div>
          {typeof seedInfo.scenes_preview === 'number' && (
            <div className="text-xs text-muted-foreground">
              シーン数: {seedInfo.scenes_preview}
            </div>
          )}
        </div>
      )}

      {/* 構成案 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label>構成案・字コンテ</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPickerOpen(true)}
            >
              <ListChecks className="h-3 w-3 mr-1" /> 構成案生成から選ぶ
            </Button>
            <label className="inline-flex items-center gap-1 text-xs text-secondary hover:underline cursor-pointer">
              <Upload className="h-3 w-3" />
              ファイルから読込(.txt / .docx)
              <input
                type="file"
                accept=".txt,.docx"
                className="hidden"
                onChange={onFileUpload}
              />
            </label>
          </div>
        </div>
        <Textarea
          value={composition}
          onChange={(e) => setComposition(e.target.value)}
          rows={10}
          className="font-mono text-sm"
          placeholder={`例:\n冒頭 (0:00-0:05): テロップ: 今すぐ読みたくなる / 映像: 主人公が驚く表情\n前半 (0:05-0:15): ...`}
        />
        <p className="text-xs text-muted-foreground">
          ※ パート(冒頭/前半/後半/締め)と時間レンジ、テロップ・映像の情報を含めてください
        </p>
      </div>

      <CompositionPickerDialog
        projectId={projectId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(scenes) => {
          setComposition(formatScenesAsText(scenes));
          setPickerOpen(false);
          toast.success('構成案を読み込みました');
        }}
      />

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

      {/* 実行ボタン */}
      <Button
        onClick={onGenerate}
        disabled={!composition.trim() || isRunning}
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
            <FileText className="h-4 w-4 mr-2" /> NA原稿を生成
          </>
        )}
      </Button>
    </div>
  );
};

export default NarrationScriptSettings;
