import { useState } from 'react';
import { Loader2, Clapperboard, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useProjectContext } from '@/hooks/useProjectContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import CompositionPickerDialog from '@/components/spot/CompositionPickerDialog';
import NarrationScriptPickerDialog from '@/components/spot/NarrationScriptPickerDialog';
import AppealAxisPickerDialog from '@/components/spot/AppealAxisPickerDialog';

export type DurationSec = 15 | 30 | 60;
export type CreativeType = 'video' | 'banner';

interface Props {
  context: ReturnType<typeof useProjectContext>['context'];
  projectId: string | null;
  composition: string;
  setComposition: (v: string) => void;
  narrationScript: string;
  setNarrationScript: (v: string) => void;
  appealAxis: string;
  setAppealAxis: (v: string) => void;
  copyText: string;
  setCopyText: (v: string) => void;
  durationSeconds: DurationSec;
  setDurationSeconds: (v: DurationSec) => void;
  creativeType: CreativeType;
  setCreativeType: (v: CreativeType) => void;
  onGenerate: () => void;
  isRunning: boolean;
}

const VConSettings = ({
  context,
  projectId,
  composition,
  setComposition,
  narrationScript,
  setNarrationScript,
  appealAxis,
  setAppealAxis,
  copyText,
  setCopyText,
  durationSeconds,
  setDurationSeconds,
  creativeType,
  setCreativeType,
  onGenerate,
  isRunning,
}: Props) => {
  const [compPickerOpen, setCompPickerOpen] = useState(false);
  const [naPickerOpen, setNaPickerOpen] = useState(false);
  const [axisPickerOpen, setAxisPickerOpen] = useState(false);

  const canGenerate = composition.trim().length > 0 || narrationScript.trim().length > 0;

  const scriptRules = context?.rules.filter((r) =>
    ['vcon', 'script', 'storyboard'].some((t) => r.process_type.includes(t))
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">Vコンを設計</h2>

      {/* === 入力ソース === */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-sm font-bold">構成案</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCompPickerOpen(true)}
            >
              <ListChecks className="h-3.5 w-3.5 mr-1" /> 構成案生成から読み込み
            </Button>
          </div>
          <Textarea
            value={composition}
            onChange={(e) => setComposition(e.target.value)}
            placeholder="構成案・字コンテをここに貼り付け（または上のボタンから読み込み）"
            className="min-h-[120px] text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-sm font-bold">NA原稿</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNaPickerOpen(true)}
            >
              <ListChecks className="h-3.5 w-3.5 mr-1" /> NA原稿生成から読み込み
            </Button>
          </div>
          <Textarea
            value={narrationScript}
            onChange={(e) => setNarrationScript(e.target.value)}
            placeholder="ナレーション原稿をここに貼り付け"
            className="min-h-[100px] text-sm"
          />
        </div>

        <div className="text-[11px] text-muted-foreground">
          ※ 構成案 / NA原稿のいずれか1つは必須。両方あると精度UP
        </div>
      </div>

      {/* === 訴求軸/コピー === */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold">訴求軸・コピー (任意)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAxisPickerOpen(true)}
          >
            <ListChecks className="h-3.5 w-3.5 mr-1" /> 訴求軸生成から1パターン選ぶ
          </Button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">訴求軸</Label>
            <Input
              value={appealAxis}
              onChange={(e) => setAppealAxis(e.target.value)}
              placeholder="例: 時短×安心"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">コピー</Label>
            <Input
              value={copyText}
              onChange={(e) => setCopyText(e.target.value)}
              placeholder="例: 家族の予定を犠牲にしない働き方へ"
            />
          </div>
        </div>
      </div>

      {/* === 動画設定 === */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <Label className="text-sm font-bold">動画設定</Label>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">動画尺</Label>
            <RadioGroup
              value={String(durationSeconds)}
              onValueChange={(v) => setDurationSeconds(Number(v) as DurationSec)}
              className="flex gap-3"
            >
              {[15, 30, 60].map((d) => (
                <Label
                  key={d}
                  className={cn(
                    'flex items-center gap-1.5 text-xs cursor-pointer rounded-md border px-3 py-1.5',
                    durationSeconds === d && 'border-secondary bg-secondary-wash/40'
                  )}
                >
                  <RadioGroupItem value={String(d)} /> {d}秒
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">クリエイティブタイプ</Label>
            <RadioGroup
              value={creativeType}
              onValueChange={(v) => setCreativeType(v as CreativeType)}
              className="flex gap-3"
            >
              {(['video', 'banner'] as const).map((t) => (
                <Label
                  key={t}
                  className={cn(
                    'flex items-center gap-1.5 text-xs cursor-pointer rounded-md border px-3 py-1.5',
                    creativeType === t && 'border-secondary bg-secondary-wash/40'
                  )}
                >
                  <RadioGroupItem value={t} /> {t === 'video' ? '動画' : 'バナー'}
                </Label>
              ))}
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* === Ad Brain 参照 === */}
      {context && (
        <div className="rounded-xl border border-secondary/30 bg-secondary-wash/30 p-3">
          <div className="text-[11px] font-semibold text-secondary mb-1">
            📚 Ad Brain 参照情報
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>
              関連ルール: <strong className="text-foreground">{scriptRules?.length ?? 0}件</strong>{' '}
              (vcon/script/storyboard)
            </span>
            <span>
              参考資料: <strong className="text-foreground">{context.materials.length}件</strong>
            </span>
          </div>
        </div>
      )}

      {/* === 実行 === */}
      <Button
        onClick={onGenerate}
        disabled={!canGenerate || isRunning}
        className="w-full h-12"
        size="lg"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Vコン生成中...
          </>
        ) : (
          <>
            <Clapperboard className="h-4 w-4 mr-2" /> Vコンを生成
          </>
        )}
      </Button>

      {/* === Pickers === */}
      <CompositionPickerDialog
        projectId={projectId}
        open={compPickerOpen}
        onOpenChange={setCompPickerOpen}
        onPick={(scenes) => {
          const text = scenes
            .map((s) => {
              const head = `${s.part ?? ''}${s.time_range ? ` (${s.time_range})` : ''}:`;
              const lines = [head];
              if (s.telop) lines.push(`  テロップ: ${s.telop}`);
              if (s.visual) lines.push(`  映像: ${s.visual}`);
              if (s.narration) lines.push(`  ナレーション: ${s.narration}`);
              return lines.join('\n');
            })
            .join('\n\n');
          setComposition(text);
          setCompPickerOpen(false);
        }}
      />

      <NarrationScriptPickerDialog
        projectId={projectId}
        open={naPickerOpen}
        onOpenChange={setNaPickerOpen}
        onPick={(script) => {
          setNarrationScript(script);
          setNaPickerOpen(false);
        }}
      />

      <AppealAxisPickerDialog
        projectId={projectId}
        open={axisPickerOpen}
        onOpenChange={setAxisPickerOpen}
        onPick={(axis, copy) => {
          setAppealAxis(axis);
          setCopyText(copy);
          setAxisPickerOpen(false);
        }}
      />
    </div>
  );
};

export default VConSettings;
