import { useState } from 'react';
import { Camera, Layers, Sparkles, Clock, Loader2, Image as ImageIcon, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useProjectContext } from '@/hooks/useProjectContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import CompositionPickerDialog, {
  type CompositionScene,
} from '@/components/spot/CompositionPickerDialog';

const DURATION_OPTIONS = [15, 30, 60] as const;
const STYLE_OPTIONS = [
  { value: 'photographic', label: '実写・リアル', icon: Camera, description: '写真のような表現' },
  {
    value: 'motion_graphics',
    label: 'フラットデザイン',
    icon: Layers,
    description: 'モーショングラフィックス',
  },
  { value: 'hybrid', label: 'ハイブリッド', icon: Sparkles, description: '実写×グラフィックス' },
] as const;
const ASPECT_OPTIONS = [
  { value: 'landscape_16_9', label: '横長 16:9', preview: 'aspect-video' },
  { value: 'portrait_9_16', label: '縦長 9:16', preview: 'aspect-[9/16]' },
  { value: 'square_1_1', label: '正方形 1:1', preview: 'aspect-square' },
] as const;

export interface ImageGenSeedInfo {
  from_tool?: string;
  from_job_id?: string;
  scenes_count?: number;
}

interface Props {
  context: ReturnType<typeof useProjectContext>['context'];
  projectId: string | null;
  composition: string;
  setComposition: (v: string) => void;
  duration: number;
  setDuration: (v: number) => void;
  creativeStyle: string;
  setCreativeStyle: (v: string) => void;
  aspectRatio: string;
  setAspectRatio: (v: string) => void;
  seedInfo: ImageGenSeedInfo | null;
  onGenerate: () => void;
  isRunning: boolean;
}

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

const ImageGenerationSettings = ({
  context,
  projectId,
  composition,
  setComposition,
  duration,
  setDuration,
  creativeStyle,
  setCreativeStyle,
  aspectRatio,
  setAspectRatio,
  seedInfo,
  onGenerate,
  isRunning,
}: Props) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const imageRules =
    context?.rules.filter((r) =>
      ['styleframe', 'storyboard', 'video_horizontal', 'video_vertical'].includes(r.process_type)
    ) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">画像生成を設定</h2>

      {context && (
        <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 space-y-2">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Ad Brain 参照
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-foreground">🎨 画像関連ルール {imageRules.length}件</span>
            {context.corrections && context.corrections.length > 0 && (
              <span className="text-foreground">
                🔁 修正パターン {context.corrections.length}件
              </span>
            )}
            {context.project.copyright_text && (
              <span className="text-muted-foreground">© {context.project.copyright_text}</span>
            )}
          </div>
        </div>
      )}

      {seedInfo && (
        <div className="rounded-xl border border-secondary/30 bg-secondary-wash/40 p-4 space-y-1">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
            🔗 {seedInfo.from_tool === 'composition' ? '構成案生成ツール' : 'ツール'}から引き継ぎ
          </div>
          {seedInfo.scenes_count != null && (
            <div className="text-xs text-muted-foreground">
              {seedInfo.scenes_count} シーンを読み込みました
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="composition">字コンテ</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            <ListChecks className="h-3.5 w-3.5 mr-1.5" />
            構成案生成の結果から選択
          </Button>
        </div>
        <Textarea
          id="composition"
          value={composition}
          onChange={(e) => setComposition(e.target.value)}
          placeholder={`冒頭 (0:00-0:05):\n  テロップ: 今すぐ読める話題作\n  映像: 主人公が驚く表情\n前半 (0:05-0:15):\n  ...`}
          className="min-h-[180px] font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          映像業界の1シーン最大3秒・12文字ルールに従って自動でシーン分割されます
        </p>
      </div>

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

      <div className="space-y-3">
        <Label>ビジュアルスタイル</Label>
        <RadioGroup
          value={creativeStyle}
          onValueChange={setCreativeStyle}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          {STYLE_OPTIONS.map((s) => (
            <Label
              key={s.value}
              htmlFor={`style-${s.value}`}
              className={cn(
                'flex flex-col items-start gap-1.5 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
                creativeStyle === s.value && 'border-secondary ring-2 ring-secondary/30'
              )}
            >
              <RadioGroupItem value={s.value} id={`style-${s.value}`} className="sr-only" />
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-secondary" />
                <span className="font-semibold text-sm">{s.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{s.description}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label>画像サイズ</Label>
        <RadioGroup
          value={aspectRatio}
          onValueChange={setAspectRatio}
          className="grid grid-cols-3 gap-3"
        >
          {ASPECT_OPTIONS.map((a) => (
            <Label
              key={a.value}
              htmlFor={`ar-${a.value}`}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
                aspectRatio === a.value && 'border-secondary ring-2 ring-secondary/30'
              )}
            >
              <RadioGroupItem value={a.value} id={`ar-${a.value}`} className="sr-only" />
              <div
                className={cn('w-12 bg-secondary/30 border border-secondary/50 rounded', a.preview)}
              />
              <span className="text-xs font-semibold">{a.label}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

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
            <ImageIcon className="h-4 w-4 mr-2" /> 画像を生成
          </>
        )}
      </Button>

      <CompositionPickerDialog
        projectId={projectId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(scenes) => {
          setComposition(formatScenesAsText(scenes));
          setPickerOpen(false);
          toast.success('字コンテを読み込みました');
        }}
      />
    </div>
  );
};

export default ImageGenerationSettings;
