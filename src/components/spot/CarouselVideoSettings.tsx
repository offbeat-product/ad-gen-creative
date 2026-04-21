import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Loader2,
  AlertCircle,
  ListChecks,
  X,
  Upload,
  Image as ImageIcon,
  GripVertical,
  Music,
  Mic,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useProjectContext } from '@/hooks/useProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import ImageGenerationPickerDialog from '@/components/spot/ImageGenerationPickerDialog';
import NarrationAudioPickerDialog from '@/components/spot/NarrationAudioPickerDialog';

export const MAX_FRAMES = 30;
export const MIN_FRAMES = 2;
export const MAX_IMAGE_MB = 20;
export const MAX_AUDIO_MB = 50;

export type AspectRatio = '9:16' | '16:9' | '1:1';
export type Resolution = 'sd' | 'hd' | '1080';

export type TextPosition =
  | 'top_left'
  | 'top_center'
  | 'top_right'
  | 'middle_left'
  | 'middle_center'
  | 'middle_right'
  | 'bottom_left'
  | 'bottom_center'
  | 'bottom_right';

export const TEXT_POSITIONS: { value: TextPosition; label: string }[] = [
  { value: 'top_left', label: '左上' },
  { value: 'top_center', label: '上中央' },
  { value: 'top_right', label: '右上' },
  { value: 'middle_left', label: '中央左' },
  { value: 'middle_center', label: '中央' },
  { value: 'middle_right', label: '中央右' },
  { value: 'bottom_left', label: '左下' },
  { value: 'bottom_center', label: '下中央' },
  { value: 'bottom_right', label: '右下' },
];

export type Transition =
  | 'fade'
  | 'cut'
  | 'slide_left'
  | 'slide_right'
  | 'slide_up'
  | 'slide_down'
  | 'zoom';

export const TRANSITIONS: { value: Transition; label: string }[] = [
  { value: 'fade', label: 'フェード' },
  { value: 'cut', label: 'カット' },
  { value: 'slide_left', label: 'スライド左' },
  { value: 'slide_right', label: 'スライド右' },
  { value: 'slide_up', label: 'スライド上' },
  { value: 'slide_down', label: 'スライド下' },
  { value: 'zoom', label: 'ズーム' },
];

export interface Frame {
  id: string;
  image_url: string;
  display_seconds: number;
  text_overlay: string;
  text_position: TextPosition;
  transition_in: Transition;
  transition_duration: number;
}

const newFrameId = () => `frame_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const createFrame = (image_url: string): Frame => ({
  id: newFrameId(),
  image_url,
  display_seconds: 3,
  text_overlay: '',
  text_position: 'bottom_center',
  transition_in: 'fade',
  transition_duration: 0.3,
});

// ---- Sortable Frame Thumbnail ----
const SortableFrameItem = ({
  frame,
  index,
  isActive,
  onSelect,
  onRemove,
}: {
  frame: Frame;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: frame.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative shrink-0 w-24 rounded-lg border-2 bg-card overflow-hidden cursor-pointer transition-all group',
        isActive
          ? 'border-secondary ring-2 ring-secondary/30'
          : 'border-border hover:border-secondary/50'
      )}
      onClick={onSelect}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0.5 left-0.5 z-10 bg-background/80 rounded p-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-0.5 right-0.5 z-10 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="aspect-square w-full bg-muted">
        <img
          src={frame.image_url}
          alt={`コマ${index + 1}`}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[10px] px-1.5 py-1 flex items-center justify-between">
        <span className="font-bold tabular-nums">#{index + 1}</span>
        <span className="tabular-nums">{frame.display_seconds.toFixed(1)}s</span>
      </div>
    </div>
  );
};

interface Props {
  context: ReturnType<typeof useProjectContext>['context'];
  projectId: string | null;
  userId: string | null;

  frames: Frame[];
  setFrames: React.Dispatch<React.SetStateAction<Frame[]>>;
  activeFrameId: string | null;
  setActiveFrameId: (v: string | null) => void;

  narrationUrl: string;
  setNarrationUrl: (v: string) => void;
  narrationName: string;
  setNarrationName: (v: string) => void;

  bgmMode: 'none' | 'upload';
  setBgmMode: (v: 'none' | 'upload') => void;
  bgmUrl: string;
  setBgmUrl: (v: string) => void;
  bgmName: string;
  setBgmName: (v: string) => void;

  narrationVolume: number;
  setNarrationVolume: (v: number) => void;
  bgmVolume: number;
  setBgmVolume: (v: number) => void;

  aspectRatio: AspectRatio;
  setAspectRatio: (v: AspectRatio) => void;
  resolution: Resolution;
  setResolution: (v: Resolution) => void;

  copyrightText: string;
  setCopyrightText: (v: string) => void;
  copyrightPosition: TextPosition;
  setCopyrightPosition: (v: TextPosition) => void;

  fontFamily: string;
  setFontFamily: (v: string) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
  fontColor: string;
  setFontColor: (v: string) => void;
  strokeEnabled: boolean;
  setStrokeEnabled: (v: boolean) => void;
  strokeColor: string;
  setStrokeColor: (v: string) => void;
  strokeWidth: number;
  setStrokeWidth: (v: number) => void;
  vertical: boolean;
  setVertical: (v: boolean) => void;

  onGenerate: () => void;
  isRunning: boolean;
}

const CarouselVideoSettings = ({
  context,
  projectId,
  userId,
  frames,
  setFrames,
  activeFrameId,
  setActiveFrameId,
  narrationUrl,
  setNarrationUrl,
  narrationName,
  setNarrationName,
  bgmMode,
  setBgmMode,
  bgmUrl,
  setBgmUrl,
  bgmName,
  setBgmName,
  narrationVolume,
  setNarrationVolume,
  bgmVolume,
  setBgmVolume,
  aspectRatio,
  setAspectRatio,
  resolution,
  setResolution,
  copyrightText,
  setCopyrightText,
  copyrightPosition,
  setCopyrightPosition,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  fontColor,
  setFontColor,
  strokeEnabled,
  setStrokeEnabled,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  vertical,
  setVertical,
  onGenerate,
  isRunning,
}: Props) => {
  const [imgPickerOpen, setImgPickerOpen] = useState(false);
  const [naPickerOpen, setNaPickerOpen] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFrame, setUploadingFrame] = useState(false);
  const naInputRef = useRef<HTMLInputElement>(null);
  const [uploadingNarration, setUploadingNarration] = useState(false);
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBgm, setUploadingBgm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeFrame = frames.find((f) => f.id === activeFrameId) ?? null;

  // 著作権自動入力
  useEffect(() => {
    if (!copyrightText && context?.project.copyright_text) {
      setCopyrightText(context.project.copyright_text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  // ---- Frame management ----
  const addFrames = (urls: string[]) => {
    let toAdd = urls;
    if (frames.length + toAdd.length > MAX_FRAMES) {
      toast.error(`最大${MAX_FRAMES}コマまでです`);
      toAdd = toAdd.slice(0, MAX_FRAMES - frames.length);
    }
    if (toAdd.length === 0) return;
    const newOnes = toAdd.map(createFrame);
    setFrames((prev) => [...prev, ...newOnes]);
    if (!activeFrameId && newOnes.length > 0) setActiveFrameId(newOnes[0].id);
  };

  const removeFrame = (id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id));
    if (activeFrameId === id) {
      const remaining = frames.filter((f) => f.id !== id);
      setActiveFrameId(remaining[0]?.id ?? null);
    }
  };

  const updateFrame = (id: string, patch: Partial<Frame>) => {
    setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFrames((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // ---- Storage upload helper ----
  const uploadToSpotInputs = async (
    file: File,
    folder: string
  ): Promise<string | null> => {
    if (!userId) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const path = `${folder}/${userId}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage
      .from('spot-inputs')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      toast.error(`アップロード失敗: ${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from('spot-inputs').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`画像は${MAX_IMAGE_MB}MB以下にしてください`);
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('PNG/JPEG画像をアップロードしてください');
      return;
    }
    setUploadingFrame(true);
    try {
      const url = await uploadToSpotInputs(file, 'carousel-frames');
      if (url) {
        addFrames([url]);
        toast.success('コマを追加しました');
      }
    } finally {
      setUploadingFrame(false);
      if (imgInputRef.current) imgInputRef.current.value = '';
    }
  };

  const handleNarrationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      toast.error(`音声は${MAX_AUDIO_MB}MB以下にしてください`);
      return;
    }
    setUploadingNarration(true);
    try {
      const url = await uploadToSpotInputs(file, 'carousel-narration');
      if (url) {
        setNarrationUrl(url);
        setNarrationName(file.name);
        toast.success('ナレーションをアップロードしました');
      }
    } finally {
      setUploadingNarration(false);
      if (naInputRef.current) naInputRef.current.value = '';
    }
  };

  const handleBgmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      toast.error(`音声は${MAX_AUDIO_MB}MB以下にしてください`);
      return;
    }
    setUploadingBgm(true);
    try {
      const url = await uploadToSpotInputs(file, 'carousel-bgm');
      if (url) {
        setBgmUrl(url);
        setBgmName(file.name);
        toast.success('BGMをアップロードしました');
      }
    } finally {
      setUploadingBgm(false);
      if (bgmInputRef.current) bgmInputRef.current.value = '';
    }
  };

  // 業界ルール: 1秒4文字
  const recommendedChars = activeFrame
    ? Math.round(activeFrame.display_seconds * 4)
    : 12;
  const isOverChars =
    activeFrame && activeFrame.text_overlay.length > recommendedChars;

  const canGenerate = frames.length >= MIN_FRAMES;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">
        カルーセル動画を設定
      </h2>

      {/* === コマ画像 === */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-bold flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> コマ画像
            </Label>
            <div className="text-[11px] text-muted-foreground">
              {frames.length} / {MAX_FRAMES} コマ (最低{MIN_FRAMES}コマ)
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImgPickerOpen(true)}
            >
              <ListChecks className="h-3.5 w-3.5 mr-1" /> 絵コンテ画像から読み込み
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imgInputRef.current?.click()}
              disabled={uploadingFrame || frames.length >= MAX_FRAMES}
            >
              {uploadingFrame ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1" />
              )}
              画像アップロード
            </Button>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleFrameUpload}
            />
          </div>
        </div>

        {frames.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            コマ画像を追加してください ({MIN_FRAMES}コマ以上)
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={frames.map((f) => f.id)}
              strategy={horizontalListSortingStrategy}
            >
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-3">
                  {frames.map((frame, i) => (
                    <SortableFrameItem
                      key={frame.id}
                      frame={frame}
                      index={i}
                      isActive={activeFrameId === frame.id}
                      onSelect={() => setActiveFrameId(frame.id)}
                      onRemove={() => removeFrame(frame.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* === 各コマ設定 === */}
      {activeFrame && (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold">
              コマ #{frames.findIndex((f) => f.id === activeFrame.id) + 1} の設定
            </Label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">表示秒数</Label>
                <span className="text-xs tabular-nums text-secondary font-bold">
                  {activeFrame.display_seconds.toFixed(1)} 秒
                </span>
              </div>
              <Slider
                min={0.5}
                max={10}
                step={0.1}
                value={[activeFrame.display_seconds]}
                onValueChange={(v) =>
                  updateFrame(activeFrame.id, { display_seconds: v[0] })
                }
              />
              <div className="text-[10px] text-muted-foreground">
                業界ルール: 1シーン最大3秒推奨
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">テロップ位置</Label>
              <Select
                value={activeFrame.text_position}
                onValueChange={(v) =>
                  updateFrame(activeFrame.id, { text_position: v as TextPosition })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEXT_POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">テロップ</Label>
              <span
                className={cn(
                  'text-[10px] tabular-nums',
                  isOverChars ? 'text-destructive font-bold' : 'text-muted-foreground'
                )}
              >
                {activeFrame.text_overlay.length} / 推奨{recommendedChars}文字
              </span>
            </div>
            <Input
              value={activeFrame.text_overlay}
              onChange={(e) =>
                updateFrame(activeFrame.id, { text_overlay: e.target.value })
              }
              placeholder="例: 今すぐ読める話題作"
            />
            {isOverChars && (
              <div className="text-[10px] text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                1秒4文字ルール: 表示時間に対し文字数が多すぎます
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">遷移 (in)</Label>
              <Select
                value={activeFrame.transition_in}
                onValueChange={(v) =>
                  updateFrame(activeFrame.id, { transition_in: v as Transition })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSITIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">遷移時間</Label>
                <span className="text-xs tabular-nums text-secondary font-bold">
                  {activeFrame.transition_duration.toFixed(1)} 秒
                </span>
              </div>
              <Slider
                min={0.1}
                max={1.0}
                step={0.1}
                value={[activeFrame.transition_duration]}
                onValueChange={(v) =>
                  updateFrame(activeFrame.id, { transition_duration: v[0] })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* === 音声 === */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <Label className="text-sm font-bold flex items-center gap-1.5">
          <Mic className="h-3.5 w-3.5" /> 音声
        </Label>

        <div className="space-y-2">
          <Label className="text-xs">ナレーション音声</Label>
          {!narrationUrl ? (
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNaPickerOpen(true)}
              >
                <ListChecks className="h-3.5 w-3.5 mr-1" /> ナレーション結果から読込
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => naInputRef.current?.click()}
                disabled={uploadingNarration}
              >
                {uploadingNarration ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5 mr-1" />
                )}
                音声アップロード
              </Button>
              <input
                ref={naInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,audio/mp3,.mp3,.wav"
                className="hidden"
                onChange={handleNarrationUpload}
              />
              <span className="text-[11px] text-muted-foreground self-center">
                ※なしでもOK
              </span>
            </div>
          ) : (
            <div className="rounded-lg border bg-background p-2 flex items-center gap-2">
              <Mic className="h-4 w-4 text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{narrationName}</div>
                <audio src={narrationUrl} controls className="h-6 w-full mt-1" />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNarrationUrl('');
                  setNarrationName('');
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">BGM</Label>
          <RadioGroup
            value={bgmMode}
            onValueChange={(v) => setBgmMode(v as 'none' | 'upload')}
            className="flex gap-4"
          >
            <Label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <RadioGroupItem value="none" /> BGMなし
            </Label>
            <Label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <RadioGroupItem value="upload" /> ファイルをアップロード
            </Label>
          </RadioGroup>
          {bgmMode === 'upload' && (
            <div>
              {!bgmUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => bgmInputRef.current?.click()}
                  disabled={uploadingBgm}
                >
                  {uploadingBgm ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1" />
                  )}
                  BGMアップロード
                </Button>
              ) : (
                <div className="rounded-lg border bg-background p-2 flex items-center gap-2">
                  <Music className="h-4 w-4 text-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{bgmName}</div>
                    <audio src={bgmUrl} controls className="h-6 w-full mt-1" />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBgmUrl('');
                      setBgmName('');
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <input
                ref={bgmInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,audio/mp3,.mp3,.wav"
                className="hidden"
                onChange={handleBgmUpload}
              />
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">ナレーション音量</Label>
              <span className="text-xs tabular-nums text-secondary font-bold">
                {narrationVolume}%
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[narrationVolume]}
              onValueChange={(v) => setNarrationVolume(v[0])}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">BGM音量</Label>
              <span className="text-xs tabular-nums text-secondary font-bold">
                {bgmVolume}%
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[bgmVolume]}
              onValueChange={(v) => setBgmVolume(v[0])}
              disabled={bgmMode === 'none'}
            />
          </div>
        </div>
      </div>

      {/* === 動画設定 === */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <Label className="text-sm font-bold">動画設定</Label>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">アスペクト比</Label>
            <RadioGroup
              value={aspectRatio}
              onValueChange={(v) => setAspectRatio(v as AspectRatio)}
              className="flex gap-3"
            >
              {(['9:16', '16:9', '1:1'] as const).map((r) => (
                <Label
                  key={r}
                  className={cn(
                    'flex items-center gap-1.5 text-xs cursor-pointer rounded-md border px-3 py-1.5',
                    aspectRatio === r && 'border-secondary bg-secondary-wash/40'
                  )}
                >
                  <RadioGroupItem value={r} /> {r}
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">解像度</Label>
            <RadioGroup
              value={resolution}
              onValueChange={(v) => setResolution(v as Resolution)}
              className="flex gap-3"
            >
              {(['sd', 'hd', '1080'] as const).map((r) => (
                <Label
                  key={r}
                  className={cn(
                    'flex items-center gap-1.5 text-xs cursor-pointer rounded-md border px-3 py-1.5',
                    resolution === r && 'border-secondary bg-secondary-wash/40'
                  )}
                >
                  <RadioGroupItem value={r} /> {r.toUpperCase()}
                </Label>
              ))}
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* === コピーライト === */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <Label className="text-sm font-bold">コピーライト</Label>
        <div className="grid md:grid-cols-[1fr_180px] gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">表記テキスト</Label>
            <Input
              value={copyrightText}
              onChange={(e) => setCopyrightText(e.target.value)}
              placeholder="例: ©Cyber Z"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">表示位置</Label>
            <Select
              value={copyrightPosition}
              onValueChange={(v) => setCopyrightPosition(v as TextPosition)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_POSITIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* === テキストデザイン === */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <Label className="text-sm font-bold flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5" /> テキストデザイン (全コマ共通)
        </Label>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">フォント</Label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Noto Sans JP">Noto Sans JP</SelectItem>
                <SelectItem value="Noto Serif JP">Noto Serif JP</SelectItem>
                <SelectItem value="M PLUS 1p">M PLUS 1p</SelectItem>
                <SelectItem value="Kosugi Maru">Kosugi Maru</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">フォントサイズ</Label>
              <span className="text-xs tabular-nums text-secondary font-bold">
                {fontSize}px
              </span>
            </div>
            <Slider
              min={12}
              max={200}
              step={1}
              value={[fontSize]}
              onValueChange={(v) => setFontSize(v[0])}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">文字色</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={fontColor}
                onChange={(e) => setFontColor(e.target.value)}
                className="w-14 h-9 p-1 cursor-pointer"
              />
              <Input
                value={fontColor}
                onChange={(e) => setFontColor(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <div className="space-y-2 flex flex-col justify-end">
            <Label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={vertical}
                onCheckedChange={(v) => setVertical(!!v)}
              />
              縦書き (マンガ広告用)
            </Label>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox
              checked={strokeEnabled}
              onCheckedChange={(v) => setStrokeEnabled(!!v)}
            />
            袋文字を有効にする
          </Label>
          {strokeEnabled && (
            <div className="grid md:grid-cols-2 gap-3 pl-5">
              <div className="space-y-1.5">
                <Label className="text-xs">袋文字の色</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-14 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">袋文字の太さ</Label>
                  <span className="text-xs tabular-nums text-secondary font-bold">
                    {strokeWidth}px
                  </span>
                </div>
                <Slider
                  min={1}
                  max={20}
                  step={1}
                  value={[strokeWidth]}
                  onValueChange={(v) => setStrokeWidth(v[0])}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === 実行ボタン === */}
      <Button
        onClick={onGenerate}
        disabled={!canGenerate || isRunning}
        className="w-full h-12"
        size="lg"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 動画をレンダリング中...
          </>
        ) : (
          <>🎞️ カルーセル動画を生成 ({frames.length}コマ)</>
        )}
      </Button>

      {/* === Pickers === */}
      <ImageGenerationPickerDialog
        projectId={projectId}
        open={imgPickerOpen}
        onOpenChange={setImgPickerOpen}
        onPick={(job) => {
          if (job.image_urls.length === 0) {
            toast.error('このジョブには画像がありません');
            return;
          }
          addFrames(job.image_urls);
          setImgPickerOpen(false);
          toast.success(`${job.image_urls.length}コマを追加しました`);
        }}
      />

      <NarrationAudioPickerDialog
        projectId={projectId}
        open={naPickerOpen}
        onOpenChange={setNaPickerOpen}
        onPick={(job) => {
          if (!job.output_file_url) return;
          setNarrationUrl(job.output_file_url);
          const created = job.created_at
            ? new Date(job.created_at).toLocaleDateString('ja-JP')
            : '';
          setNarrationName(`ナレーション (${created})`);
          setNaPickerOpen(false);
          toast.success('ナレーション音声を読み込みました');
        }}
      />
    </div>
  );
};

export default CarouselVideoSettings;
