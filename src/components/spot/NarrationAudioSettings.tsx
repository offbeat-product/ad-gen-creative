import { useState } from 'react';
import { Loader2, Mic, Upload, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import type { useProjectContext } from '@/hooks/useProjectContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import SpotVoiceSelector from '@/components/spot/SpotVoiceSelector';
import NarrationScriptPickerDialog from '@/components/spot/NarrationScriptPickerDialog';
import DurationPredictionBadge from '@/components/spot/DurationPredictionBadge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export interface NarrationAudioSeedInfo {
  from_tool?: string;
  from_job_id?: string;
}

interface Props {
  context: ReturnType<typeof useProjectContext>['context'];
  projectId: string | null;
  script: string;
  setScript: (v: string) => void;
  selectedVoice: string;
  setSelectedVoice: (v: string) => void;
  speed: number;
  setSpeed: (v: number) => void;
  targetDuration: number;
  setTargetDuration: (v: number) => void;
  seedInfo: NarrationAudioSeedInfo | null;
  onGenerate: () => void;
  isRunning: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const NarrationAudioSettings = ({
  context,
  projectId,
  script,
  setScript,
  selectedVoice,
  setSelectedVoice,
  speed,
  setSpeed,
  targetDuration,
  setTargetDuration,
  seedInfo,
  onGenerate,
  isRunning,
  onFileUpload,
}: Props) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const narrationRulesCount =
    context?.rules.filter((r) =>
      ['narration', 'na_script', 'script'].includes(r.process_type)
    ).length ?? 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">
        NA原稿・ボイスを設定
      </h2>

      {/* Ad Brain 参照情報 */}
      {context && (
        <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 space-y-2">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Ad Brain 参照
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-foreground">📋 関連ルール {narrationRulesCount}件</span>
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
            🔗 NA原稿生成ツールから引き継ぎ
          </div>
          <div className="text-xs text-muted-foreground">
            原稿が下のテキストエリアに自動入力されました
          </div>
        </div>
      )}

      {/* NA原稿 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label>NA原稿</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPickerOpen(true)}
            >
              <ListChecks className="h-3 w-3 mr-1" /> NA原稿生成から選ぶ
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
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={8}
          className="font-mono text-sm"
          placeholder="ここにNA原稿を入力してください..."
        />
        <p className="text-xs text-muted-foreground">
          ※ 1行 = 1ボイス分割単位(無音でポーズ)
        </p>
      </div>

      <NarrationScriptPickerDialog
        projectId={projectId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(s) => {
          setScript(s);
          setPickerOpen(false);
          toast.success('NA原稿を読み込みました');
        }}
      />

      {/* ボイス選択 */}
      <div className="space-y-2">
        <Label>ボイス選択</Label>
        <SpotVoiceSelector selectedVoiceId={selectedVoice} onSelectVoice={setSelectedVoice} />
      </div>

      {/* 読み上げ速度 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>読み上げ速度</Label>
          <span className="text-sm font-mono text-muted-foreground">{speed.toFixed(2)}x</span>
        </div>
        <Slider
          value={[speed]}
          onValueChange={([v]) => setSpeed(v)}
          min={0.7}
          max={1.3}
          step={0.05}
          className="py-4"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.7x (ゆっくり)</span>
          <span>1.0x (標準)</span>
          <span>1.3x (はやい)</span>
        </div>
      </div>

      {/* 実行ボタン */}
      <Button
        onClick={onGenerate}
        disabled={!script.trim() || isRunning}
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
            <Mic className="h-4 w-4 mr-2" /> 音声を生成
          </>
        )}
      </Button>
    </div>
  );
};

export default NarrationAudioSettings;
