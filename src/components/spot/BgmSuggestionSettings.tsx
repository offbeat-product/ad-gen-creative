import { useState } from 'react';
import { ListChecks, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useProjectContext } from '@/hooks/useProjectContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import AppealAxisPickerDialog from '@/components/spot/AppealAxisPickerDialog';
import CompositionPickerDialog, {
  type CompositionScene,
} from '@/components/spot/CompositionPickerDialog';
import NarrationScriptPickerDialog from '@/components/spot/NarrationScriptPickerDialog';

export interface BgmSeedInfo {
  from_tool?: string;
  from_job_id?: string;
  has_audio?: boolean;
}

interface Props {
  context: ReturnType<typeof useProjectContext>['context'];
  projectId: string | null;
  appealAxis: string;
  setAppealAxis: (v: string) => void;
  copyText: string;
  setCopyText: (v: string) => void;
  composition: string;
  setComposition: (v: string) => void;
  narrationScript: string;
  setNarrationScript: (v: string) => void;
  durationSeconds: 15 | 30 | 60;
  setDurationSeconds: (v: 15 | 30 | 60) => void;
  creativeType: 'video' | 'banner';
  setCreativeType: (v: 'video' | 'banner') => void;
  numSuggestions: number;
  setNumSuggestions: (v: number) => void;
  seedInfo: BgmSeedInfo | null;
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

const BgmSuggestionSettings = ({
  context,
  projectId,
  appealAxis,
  setAppealAxis,
  copyText,
  setCopyText,
  composition,
  setComposition,
  narrationScript,
  setNarrationScript,
  durationSeconds,
  setDurationSeconds,
  creativeType,
  setCreativeType,
  numSuggestions,
  setNumSuggestions,
  seedInfo,
  onGenerate,
  isRunning,
}: Props) => {
  const [axisPickerOpen, setAxisPickerOpen] = useState(false);
  const [compPickerOpen, setCompPickerOpen] = useState(false);
  const [naPickerOpen, setNaPickerOpen] = useState(false);

  const bgmRules = context?.rules.filter((r) => r.process_type.includes('bgm')) ?? [];

  const hasInput =
    appealAxis.trim().length > 0 ||
    copyText.trim().length > 0 ||
    composition.trim().length > 0 ||
    narrationScript.trim().length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">BGM提案を生成</h2>

      {context && (
        <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 space-y-2">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Ad Brain 参照
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-foreground">🎵 BGM関連ルール {bgmRules.length}件</span>
            {context.project.copyright_text && (
              <span className="text-muted-foreground">© {context.project.copyright_text}</span>
            )}
          </div>
        </div>
      )}

      {seedInfo && (
        <div className="rounded-xl border border-secondary/30 bg-secondary-wash/40 p-4 space-y-1">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
            🔗 {seedInfo.from_tool === 'narration_audio' ? 'ナレーション音声ツール' : 'ツール'}から引き継ぎ
          </div>
          <div className="text-xs text-muted-foreground">
            NA原稿を読み込みました{seedInfo.has_audio ? '(音声付き)' : ''}
          </div>
        </div>
      )}

      {/* === 広告内容 === */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div>
          <Label className="text-sm font-bold">広告内容 (最低1つ必須)</Label>
          <div className="text-[11px] text-muted-foreground">
            入力が多いほど精度が上がります
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">訴求軸</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setAxisPickerOpen(true)}
              >
                <ListChecks className="h-3 w-3 mr-1" /> 訴求軸生成から
              </Button>
            </div>
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs">構成案</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => setCompPickerOpen(true)}
            >
              <ListChecks className="h-3 w-3 mr-1" /> 構成案生成から
            </Button>
          </div>
          <Textarea
            value={composition}
            onChange={(e) => setComposition(e.target.value)}
            placeholder="構成案・字コンテ"
            className="min-h-[80px] text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs">NA原稿</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => setNaPickerOpen(true)}
            >
              <ListChecks className="h-3 w-3 mr-1" /> NA原稿生成から
            </Button>
          </div>
          <Textarea
            value={narrationScript}
            onChange={(e) => setNarrationScript(e.target.value)}
            placeholder="ナレーション原稿"
            className="min-h-[80px] text-sm"
          />
        </div>
      </div>

      {/* === 設定 === */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <Label className="text-sm font-bold">設定</Label>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">動画尺</Label>
            <RadioGroup
              value={String(durationSeconds)}
              onValueChange={(v) => setDurationSeconds(Number(v) as 15 | 30 | 60)}
              className="flex gap-2"
            >
              {[15, 30, 60].map((d) => (
                <Label
                  key={d}
                  className={cn(
                    'flex items-center gap-1.5 text-xs cursor-pointer rounded-md border px-2.5 py-1.5',
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
              onValueChange={(v) => setCreativeType(v as 'video' | 'banner')}
              className="flex gap-2"
            >
              {(['video', 'banner'] as const).map((t) => (
                <Label
                  key={t}
                  className={cn(
                    'flex items-center gap-1.5 text-xs cursor-pointer rounded-md border px-2.5 py-1.5',
                    creativeType === t && 'border-secondary bg-secondary-wash/40'
                  )}
                >
                  <RadioGroupItem value={t} /> {t === 'video' ? '動画' : 'バナー'}
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">候補数</Label>
            <Select
              value={String(numSuggestions)}
              onValueChange={(v) => setNumSuggestions(Number(v))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}件
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button
        onClick={onGenerate}
        disabled={!hasInput || isRunning}
        className="w-full h-12"
        size="lg"
        variant="brand"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> BGM提案を生成中...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" /> BGM提案を生成 ({numSuggestions}候補)
          </>
        )}
      </Button>

      {/* Pickers */}
      <AppealAxisPickerDialog
        projectId={projectId}
        open={axisPickerOpen}
        onOpenChange={setAxisPickerOpen}
        onPick={(axis, copy) => {
          setAppealAxis(axis);
          setCopyText(copy);
          setAxisPickerOpen(false);
          toast.success('訴求軸・コピーを読み込みました');
        }}
      />
      <CompositionPickerDialog
        projectId={projectId}
        open={compPickerOpen}
        onOpenChange={setCompPickerOpen}
        onPick={(scenes) => {
          setComposition(formatScenesAsText(scenes));
          setCompPickerOpen(false);
          toast.success('構成案を読み込みました');
        }}
      />
      <NarrationScriptPickerDialog
        projectId={projectId}
        open={naPickerOpen}
        onOpenChange={setNaPickerOpen}
        onPick={(script) => {
          setNarrationScript(script);
          setNaPickerOpen(false);
          toast.success('NA原稿を読み込みました');
        }}
      />
    </div>
  );
};

export default BgmSuggestionSettings;
