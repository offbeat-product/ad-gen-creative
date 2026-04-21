import { useState, useRef } from 'react';
import {
  Loader2,
  ListChecks,
  X,
  Plus,
  Upload,
  Video as VideoIcon,
  Maximize2,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import CarouselVideoPickerDialog, {
  type CarouselVideoJobRow,
} from './CarouselVideoPickerDialog';

export interface VideoFormat {
  width: number;
  height: number;
  label: string;
  description?: string;
}

export const PRESET_FORMATS: VideoFormat[] = [
  { width: 1080, height: 1920, label: '9:16', description: '1080×1920 / TikTok・Reels・Stories' },
  { width: 1920, height: 1080, label: '16:9', description: '1920×1080 / YouTube' },
  { width: 1080, height: 1080, label: '1:1', description: '1080×1080 / Instagram Feed' },
  { width: 1080, height: 1350, label: '4:5', description: '1080×1350 / Instagram縦Feed' },
  { width: 1080, height: 1440, label: '3:4', description: '1080×1440' },
];

export const MAX_UPLOAD_MB = 500;

const formatKey = (f: VideoFormat) => `${f.width}x${f.height}`;

interface Props {
  projectId: string | null;
  userId: string | null;
  sourceVideoUrl: string;
  setSourceVideoUrl: (v: string) => void;
  sourceVideoName: string;
  setSourceVideoName: (v: string) => void;
  selectedFormats: VideoFormat[];
  setSelectedFormats: React.Dispatch<React.SetStateAction<VideoFormat[]>>;
  resizeMode: 'fill' | 'fit';
  setResizeMode: (v: 'fill' | 'fit') => void;
  bgColor: string;
  setBgColor: (v: string) => void;
  onGenerate: () => void;
  isRunning: boolean;
}

const VideoResizeSettings = ({
  projectId,
  userId,
  sourceVideoUrl,
  setSourceVideoUrl,
  sourceVideoName,
  setSourceVideoName,
  selectedFormats,
  setSelectedFormats,
  resizeMode,
  setResizeMode,
  bgColor,
  setBgColor,
  onGenerate,
  isRunning,
}: Props) => {
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isFormatSelected = (f: VideoFormat) =>
    selectedFormats.some((x) => x.width === f.width && x.height === f.height);

  const toggleFormat = (f: VideoFormat) => {
    setSelectedFormats((prev) => {
      const exists = prev.some((x) => x.width === f.width && x.height === f.height);
      if (exists) return prev.filter((x) => !(x.width === f.width && x.height === f.height));
      return [...prev, f];
    });
  };

  const addCustomFormat = () => {
    const w = parseInt(customWidth, 10);
    const h = parseInt(customHeight, 10);
    if (!w || !h || w < 100 || h < 100 || w > 4096 || h > 4096) {
      toast.error('幅と高さは100〜4096pxの範囲で入力してください');
      return;
    }
    const newFormat: VideoFormat = { width: w, height: h, label: `${w}×${h}` };
    if (isFormatSelected(newFormat)) {
      toast.error('同じサイズが既に選択されています');
      return;
    }
    setSelectedFormats((prev) => [...prev, newFormat]);
    setCustomWidth('');
    setCustomHeight('');
  };

  const removeFormat = (f: VideoFormat) => {
    setSelectedFormats((prev) =>
      prev.filter((x) => !(x.width === f.width && x.height === f.height))
    );
  };

  const handlePickCarouselVideo = (j: CarouselVideoJobRow) => {
    if (!j.output_file_url) return;
    setSourceVideoUrl(j.output_file_url);
    const created = j.created_at ? new Date(j.created_at).toLocaleDateString('ja-JP') : '';
    setSourceVideoName(`カルーセル動画 (${created})`);
    setPickerOpen(false);
    toast.success('動画を読み込みました');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast.error(`ファイルサイズが${MAX_UPLOAD_MB}MBを超えています`);
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['mp4', 'mov', 'm4v'].includes(ext)) {
      toast.error('mp4 または mov 形式の動画をアップロードしてください');
      return;
    }
    if (!userId) {
      toast.error('ログインが必要です');
      return;
    }

    setUploadingVideo(true);
    try {
      const path = `video-resize/${userId}/source_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('videos')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) {
        toast.error(`アップロード失敗: ${upErr.message}`);
        return;
      }
      const { data } = supabase.storage.from('videos').getPublicUrl(path);
      setSourceVideoUrl(data.publicUrl);
      setSourceVideoName(file.name);
      toast.success('動画をアップロードしました');
    } finally {
      setUploadingVideo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearSourceVideo = () => {
    setSourceVideoUrl('');
    setSourceVideoName('');
  };

  const canGenerate = sourceVideoUrl.trim().length > 0 && selectedFormats.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">動画リサイズを設定</h2>

      {/* 元動画 */}
      <div className="space-y-3">
        <Label>元動画</Label>
        {!sourceVideoUrl ? (
          <div className="rounded-xl border-2 border-dashed bg-card p-6 space-y-3">
            <div className="flex flex-col items-center gap-3 text-center">
              <VideoIcon className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <div className="text-sm font-medium">リサイズ元の動画を選択</div>
                <div className="text-xs text-muted-foreground">
                  mp4/mov、最大 {MAX_UPLOAD_MB}MB
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                >
                  <ListChecks className="h-3.5 w-3.5 mr-1.5" />
                  カルーセル動画から読み込み
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingVideo}
                >
                  {uploadingVideo ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      アップロード中
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      動画をアップロード
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,.mp4,.mov,.m4v"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {sourceVideoName || '元動画'}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {sourceVideoUrl}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSourceVideo}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <video
              src={sourceVideoUrl}
              controls
              className="w-full max-h-[280px] rounded bg-muted"
            />
          </div>
        )}
      </div>

      {/* 出力フォーマット */}
      <div className="space-y-3">
        <Label>出力フォーマット (複数選択可)</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESET_FORMATS.map((f) => {
            const checked = isFormatSelected(f);
            return (
              <label
                key={formatKey(f)}
                className={cn(
                  'flex items-start gap-2.5 rounded-lg border bg-card p-3 cursor-pointer transition-all hover:border-secondary/50',
                  checked && 'border-secondary ring-2 ring-secondary/30 bg-secondary-wash/30'
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleFormat(f)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold tabular-nums">{f.label}</div>
                  {f.description && (
                    <div className="text-[11px] text-muted-foreground">{f.description}</div>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {/* カスタム追加 */}
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">
            カスタムサイズを追加
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="number"
              placeholder="幅"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
              className="w-24"
            />
            <span className="text-muted-foreground">×</span>
            <Input
              type="number"
              placeholder="高さ"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">px</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomFormat}
              disabled={!customWidth || !customHeight}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              追加
            </Button>
          </div>
          {selectedFormats.filter(
            (f) => !PRESET_FORMATS.some((p) => p.width === f.width && p.height === f.height)
          ).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedFormats
                .filter(
                  (f) => !PRESET_FORMATS.some((p) => p.width === f.width && p.height === f.height)
                )
                .map((f) => (
                  <span
                    key={formatKey(f)}
                    className="inline-flex items-center gap-1 text-xs bg-secondary-wash text-secondary px-2 py-0.5 rounded-full"
                  >
                    {f.label}
                    <button
                      type="button"
                      onClick={() => removeFormat(f)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* 選択中サマリー */}
        <div className="text-xs text-muted-foreground">
          選択中:{' '}
          {selectedFormats.length > 0 ? (
            <>
              <span className="text-foreground font-medium">
                {selectedFormats.map((f) => f.label).join(', ')}
              </span>{' '}
              (合計{selectedFormats.length}サイズ)
            </>
          ) : (
            <span className="text-destructive">サイズを1つ以上選択してください</span>
          )}
        </div>
      </div>

      {/* リサイズ方式 */}
      <div className="space-y-3">
        <Label>リサイズ方式</Label>
        <RadioGroup
          value={resizeMode}
          onValueChange={(v) => setResizeMode(v as 'fill' | 'fit')}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <Label
            htmlFor="mode-fill"
            className={cn(
              'flex items-start gap-2.5 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
              resizeMode === 'fill' && 'border-secondary ring-2 ring-secondary/30'
            )}
          >
            <RadioGroupItem value="fill" id="mode-fill" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Maximize2 className="h-4 w-4 text-secondary" />
                <span className="font-semibold text-sm">中央トリミング (fill)</span>
              </div>
              <div className="text-xs text-muted-foreground">
                画面全面・被写体が中央に配置されている動画向け
              </div>
            </div>
          </Label>
          <Label
            htmlFor="mode-fit"
            className={cn(
              'flex items-start gap-2.5 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
              resizeMode === 'fit' && 'border-secondary ring-2 ring-secondary/30'
            )}
          >
            <RadioGroupItem value="fit" id="mode-fit" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Square className="h-4 w-4 text-secondary" />
                <span className="font-semibold text-sm">レターボックス (fit)</span>
              </div>
              <div className="text-xs text-muted-foreground">
                余白で埋めて全体が見えるように配置
              </div>
            </div>
          </Label>
        </RadioGroup>

        {resizeMode === 'fit' && (
          <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
            <Label htmlFor="bg-color" className="text-sm">
              余白の色
            </Label>
            <Input
              id="bg-color"
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-16 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-28 font-mono text-xs"
            />
          </div>
        )}
      </div>

      {/* 実行ボタン */}
      <Button
        onClick={onGenerate}
        disabled={!canGenerate || isRunning}
        className="w-full h-12"
        size="lg"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> リサイズ中...
          </>
        ) : (
          <>
            <VideoIcon className="h-4 w-4 mr-2" /> 動画をリサイズ ({selectedFormats.length}
            サイズ)
          </>
        )}
      </Button>

      <CarouselVideoPickerDialog
        projectId={projectId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePickCarouselVideo}
      />
    </div>
  );
};

export default VideoResizeSettings;
