import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  ListChecks,
  X,
  Upload,
  Image as ImageIcon,
  GripVertical,
  Music,
  Mic,
  Plus,
  Trash2,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useProjectContext } from '@/hooks/useProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SpotStepClient from '@/components/spot/SpotStepClient';
import SpotStepProduct from '@/components/spot/SpotStepProduct';
import SpotStepProject from '@/components/spot/SpotStepProject';
import SpotStepDataCollection from '@/components/spot/SpotStepDataCollection';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const STEPS = [
  { label: 'クライアント' },
  { label: '商材' },
  { label: '案件' },
  { label: 'データ収集' },
  { label: 'カルーセル設定' },
];

const N8N_WEBHOOK_URL =
  'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-carousel-video';

const MAX_FRAMES = 30;
const MIN_FRAMES = 2;
const MAX_IMAGE_MB = 20;
const MAX_AUDIO_MB = 50;

type TextPosition =
  | 'top_left'
  | 'top_center'
  | 'top_right'
  | 'middle_left'
  | 'middle_center'
  | 'middle_right'
  | 'bottom_left'
  | 'bottom_center'
  | 'bottom_right';

const TEXT_POSITIONS: { value: TextPosition; label: string }[] = [
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

type Transition = 'fade' | 'cut' | 'slide_left' | 'slide_right' | 'slide_up' | 'slide_down' | 'zoom';
const TRANSITIONS: { value: Transition; label: string }[] = [
  { value: 'fade', label: 'フェード' },
  { value: 'cut', label: 'カット' },
  { value: 'slide_left', label: 'スライド左' },
  { value: 'slide_right', label: 'スライド右' },
  { value: 'slide_up', label: 'スライド上' },
  { value: 'slide_down', label: 'スライド下' },
  { value: 'zoom', label: 'ズーム' },
];

interface Frame {
  id: string;
  image_url: string;
  display_seconds: number;
  text_overlay: string;
  text_position: TextPosition;
  transition_in: Transition;
  transition_duration: number;
}

interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  output_file_url: string | null;
  output_data: Record<string, unknown> | null;
}

interface CarouselAsset {
  id: string;
  asset_type: string;
  file_url: string;
  file_name: string | null;
  metadata: Record<string, any> | null;
}

interface ImageGenJobRow {
  id: string;
  created_at: string | null;
  input_data: Record<string, unknown> | null;
}

interface NarrationJobRow {
  id: string;
  created_at: string | null;
  output_file_url: string | null;
  input_data: Record<string, unknown> | null;
}

const newFrameId = () => `frame_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const createFrame = (image_url: string): Frame => ({
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
        isActive ? 'border-secondary ring-2 ring-secondary/30' : 'border-border hover:border-secondary/50'
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

const CarouselVideoTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();
  const { context } = useProjectContext(state.projectId);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 5
  const [frames, setFrames] = useState<Frame[]>([]);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFrame, setUploadingFrame] = useState(false);

  // Picker
  const [imgPickerOpen, setImgPickerOpen] = useState(false);
  const [imgJobs, setImgJobs] = useState<ImageGenJobRow[]>([]);
  const [imgPickerLoading, setImgPickerLoading] = useState(false);

  const [naPickerOpen, setNaPickerOpen] = useState(false);
  const [naJobs, setNaJobs] = useState<NarrationJobRow[]>([]);
  const [naPickerLoading, setNaPickerLoading] = useState(false);

  // Audio
  const [narrationUrl, setNarrationUrl] = useState<string>('');
  const [narrationName, setNarrationName] = useState<string>('');
  const [uploadingNarration, setUploadingNarration] = useState(false);
  const naInputRef = useRef<HTMLInputElement>(null);

  const [bgmMode, setBgmMode] = useState<'none' | 'upload'>('none');
  const [bgmUrl, setBgmUrl] = useState<string>('');
  const [bgmName, setBgmName] = useState<string>('');
  const [uploadingBgm, setUploadingBgm] = useState(false);
  const bgmInputRef = useRef<HTMLInputElement>(null);

  const [narrationVolume, setNarrationVolume] = useState(100);
  const [bgmVolume, setBgmVolume] = useState(30);

  // Video
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [resolution, setResolution] = useState<'sd' | 'hd' | '1080'>('1080');

  // Copyright
  const [copyrightText, setCopyrightText] = useState('');
  const [copyrightPosition, setCopyrightPosition] = useState<TextPosition>('bottom_right');

  // Text design
  const [fontFamily, setFontFamily] = useState('Noto Sans JP');
  const [fontSize, setFontSize] = useState(48);
  const [fontColor, setFontColor] = useState('#FFFFFF');
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [vertical, setVertical] = useState(false);

  // Job
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<CarouselAsset[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeFrame = frames.find((f) => f.id === activeFrameId) ?? null;

  // ----- copyright auto-fill -----
  useEffect(() => {
    if (!copyrightText && context?.project.copyright_text) {
      setCopyrightText(context.project.copyright_text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return state.clientId !== null;
      case 1:
        return state.productId !== null;
      case 2:
        return state.projectId !== null;
      case 3:
        return true;
      case 4:
        return frames.length >= MIN_FRAMES;
      default:
        return false;
    }
  };

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentStep((p) => Math.min(p + 1, STEPS.length - 1));
  }, []);
  const goToStep = useCallback(
    (step: number) => {
      if (step > currentStep) return;
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    },
    [currentStep]
  );

  // ---- Frame management ----
  const addFrames = (urls: string[]) => {
    if (frames.length + urls.length > MAX_FRAMES) {
      toast.error(`最大${MAX_FRAMES}コマまでです`);
      urls = urls.slice(0, MAX_FRAMES - frames.length);
    }
    if (urls.length === 0) return;
    const newOnes = urls.map(createFrame);
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

  // ---- Image picker ----
  const loadImageGenJobs = async () => {
    if (!state.projectId) return;
    setImgPickerLoading(true);
    try {
      const { data } = await supabase
        .from('gen_spot_jobs')
        .select('id, created_at, input_data')
        .eq('project_id', state.projectId)
        .eq('tool_type', 'image_generation')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);
      setImgJobs((data ?? []) as ImageGenJobRow[]);
    } finally {
      setImgPickerLoading(false);
    }
  };

  const handlePickImageJob = async (j: ImageGenJobRow) => {
    const { data: assetRows } = await supabase
      .from('gen_spot_assets')
      .select('file_url, sort_order')
      .eq('job_id', j.id)
      .eq('asset_type', 'image')
      .order('sort_order');
    const urls = (assetRows ?? []).map((r: any) => r.file_url as string).filter(Boolean);
    if (urls.length === 0) {
      toast.error('このジョブには画像がありません');
      return;
    }
    addFrames(urls);
    setImgPickerOpen(false);
    toast.success(`${urls.length}コマを追加しました`);
  };

  // ---- Narration picker ----
  const loadNarrationJobs = async () => {
    if (!state.projectId) return;
    setNaPickerLoading(true);
    try {
      const { data: jobs } = await supabase
        .from('gen_spot_jobs')
        .select('id, created_at, output_file_url, input_data')
        .eq('project_id', state.projectId)
        .eq('tool_type', 'narration_audio')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);
      const list = (jobs ?? []) as NarrationJobRow[];
      const missing = list.filter((j) => !j.output_file_url).map((j) => j.id);
      if (missing.length > 0) {
        const { data: assetRows } = await supabase
          .from('gen_spot_assets')
          .select('job_id, file_url')
          .in('job_id', missing)
          .eq('asset_type', 'narration_audio');
        const urlByJob = new Map<string, string>();
        (assetRows ?? []).forEach((r: any) => {
          if (r.file_url && !urlByJob.has(r.job_id)) urlByJob.set(r.job_id, r.file_url);
        });
        list.forEach((j) => {
          if (!j.output_file_url && urlByJob.has(j.id)) {
            j.output_file_url = urlByJob.get(j.id)!;
          }
        });
      }
      setNaJobs(list.filter((j) => !!j.output_file_url));
    } finally {
      setNaPickerLoading(false);
    }
  };

  const handlePickNarration = (j: NarrationJobRow) => {
    if (!j.output_file_url) return;
    setNarrationUrl(j.output_file_url);
    const created = j.created_at ? new Date(j.created_at).toLocaleDateString('ja-JP') : '';
    setNarrationName(`ナレーション (${created})`);
    setNaPickerOpen(false);
    toast.success('ナレーション音声を読み込みました');
  };

  // ---- Uploads (spot-inputs bucket) ----
  const uploadToSpotInputs = async (
    file: File,
    folder: string
  ): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const path = `${folder}/${user.id}/${Date.now()}_${Math.random()
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

  // ---- Generate ----
  const handleGenerate = async () => {
    if (!state.projectId || !user || frames.length < MIN_FRAMES) return;

    const payload = {
      project_id: state.projectId,
      tool_type: 'carousel_video',
      input_data: {
        frames: frames.map((f) => ({
          image_url: f.image_url,
          display_seconds: f.display_seconds,
          text_overlay: f.text_overlay,
          text_position: f.text_position,
          transition_in: f.transition_in,
          transition_duration: f.transition_duration,
        })),
        narration_url: narrationUrl || null,
        bgm_url: bgmMode === 'upload' ? bgmUrl || null : null,
        narration_volume: narrationVolume / 100,
        bgm_volume: bgmVolume / 100,
        aspect_ratio: aspectRatio,
        resolution,
        copyright_text: copyrightText || null,
        copyright_position: copyrightPosition,
        text_design: {
          font_family: fontFamily,
          font_size: fontSize,
          font_color: fontColor,
          stroke_enabled: strokeEnabled,
          stroke_color: strokeColor,
          stroke_width: strokeWidth,
          vertical,
        },
      },
      status: 'pending',
      created_by: user.id,
    } as any;

    const { data: newJob, error } = await supabase
      .from('gen_spot_jobs')
      .insert(payload)
      .select()
      .single();

    if (error || !newJob) {
      toast.error(`生成開始に失敗: ${error?.message ?? 'unknown'}`);
      return;
    }

    setJobId(newJob.id);
    setJob(newJob as SpotJob);
    setAssets([]);

    fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spot_job_id: newJob.id,
        project_id: state.projectId,
        ...(payload.input_data as any),
        client_name: context?.project.product.client.name ?? null,
        product_name: context?.project.product.name ?? null,
        project_name: context?.project.name ?? null,
      }),
    }).catch((e) => console.error('n8n webhook error:', e));

    toast.success('カルーセル動画の生成を開始しました');
  };

  // ---- Realtime ----
  useEffect(() => {
    if (!jobId) return;
    const refetch = async () => {
      const [jobRes, assetsRes] = await Promise.all([
        supabase.from('gen_spot_jobs').select('*').eq('id', jobId).single(),
        supabase
          .from('gen_spot_assets')
          .select('*')
          .eq('job_id', jobId)
          .eq('asset_type', 'carousel_video')
          .order('sort_order'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as CarouselAsset[]);
    };
    refetch();
    const channel = supabase
      .channel(`spot-job-${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'gen_spot_jobs', filter: `id=eq.${jobId}` },
        refetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gen_spot_assets', filter: `job_id=eq.${jobId}` },
        refetch
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  // 業界ルール: 1秒4文字
  const recommendedChars = activeFrame
    ? Math.round(activeFrame.display_seconds * 4)
    : 12;
  const isOverChars =
    activeFrame && activeFrame.text_overlay.length > recommendedChars;

  // 動画URL: output_file_url 優先、なければ assets[0]
  const finalVideoUrl =
    job?.output_file_url || (assets.length > 0 ? assets[0].file_url : null);
  const finalVideoMeta =
    (assets[0]?.metadata as any) || (job?.output_data as any) || null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">🎞️ カルーセル動画生成</h1>
        <p className="text-sm text-muted-foreground">
          複数のコマ画像・テロップ・音声から、マンガ広告のような動画を生成します
        </p>
      </div>

      {/* Stepper */}
      <div className="hidden md:flex items-center justify-between">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => goToStep(i)}
                disabled={i > currentStep}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200',
                  i < currentStep && 'bg-secondary text-secondary-foreground cursor-pointer hover:opacity-80',
                  i === currentStep && 'bg-secondary text-secondary-foreground ring-4 ring-secondary-wash scale-110',
                  i > currentStep && 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
              </button>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  i === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px mx-2 -mt-6',
                  i < currentStep ? 'bg-secondary' : 'bg-border'
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="md:hidden flex items-center justify-between p-3 bg-muted rounded-lg">
        <span className="text-xs text-muted-foreground">
          ステップ {currentStep + 1}/{STEPS.length}
        </span>
        <span className="text-sm font-medium">{STEPS[currentStep].label}</span>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 0 && <SpotStepClient state={state} updateState={updateState} />}
          {currentStep === 1 && (
            <SpotStepProduct state={state} updateState={updateState} goToStep={goToStep} />
          )}
          {currentStep === 2 && (
            <SpotStepProject state={state} updateState={updateState} goToStep={goToStep} />
          )}
          {currentStep === 3 && <SpotStepDataCollection state={state} onComplete={goNext} />}

          {currentStep === 4 && (
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
                      onClick={() => {
                        setImgPickerOpen(true);
                        loadImageGenJobs();
                      }}
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
                    {/* 表示秒数 */}
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

                    {/* テロップ位置 */}
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

                  {/* テロップ */}
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
                    {/* 遷移 */}
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

                    {/* 遷移時間 */}
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

                {/* ナレーション */}
                <div className="space-y-2">
                  <Label className="text-xs">ナレーション音声</Label>
                  {!narrationUrl ? (
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNaPickerOpen(true);
                          loadNarrationJobs();
                        }}
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

                {/* BGM */}
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

                {/* 音量 */}
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
                      onValueChange={(v) => setAspectRatio(v as any)}
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
                      onValueChange={(v) => setResolution(v as any)}
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
                onClick={handleGenerate}
                disabled={!canProceed() || isRunning}
                className="w-full h-12"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 動画をレンダリング中...
                  </>
                ) : (
                  <>
                    🎞️ カルーセル動画を生成 ({frames.length}コマ)
                  </>
                )}
              </Button>

              {/* === 結果 === */}
              {jobId && job && (
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">生成結果</h3>
                    <span className="text-xs">
                      {job.status === 'pending' && (
                        <span className="text-muted-foreground">待機中...</span>
                      )}
                      {job.status === 'running' && (
                        <span className="text-warning">レンダリング中</span>
                      )}
                      {job.status === 'completed' && (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3 w-3" /> 完了
                        </span>
                      )}
                      {job.status === 'failed' && (
                        <span className="flex items-center gap-1 text-destructive">
                          <AlertCircle className="h-3 w-3" /> 失敗
                        </span>
                      )}
                    </span>
                  </div>

                  {isRunning && (
                    <div className="space-y-2">
                      <Progress value={undefined} className="animate-pulse" />
                      <div className="text-xs text-muted-foreground text-center">
                        🎬 動画をレンダリング中... 1〜5分ほどお待ちください
                      </div>
                    </div>
                  )}

                  {job.status === 'failed' && job.error_message && (
                    <div className="text-xs text-destructive bg-destructive/10 p-3 rounded">
                      {job.error_message}
                    </div>
                  )}

                  {finalVideoUrl && (
                    <div className="space-y-3">
                      <video
                        src={finalVideoUrl}
                        controls
                        className="w-full rounded-lg bg-muted"
                        style={{
                          aspectRatio:
                            aspectRatio === '9:16'
                              ? '9 / 16'
                              : aspectRatio === '16:9'
                              ? '16 / 9'
                              : '1 / 1',
                          maxHeight: '600px',
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>アスペクト比: {aspectRatio}</span>
                        <span>解像度: {resolution.toUpperCase()}</span>
                        <span>コマ数: {frames.length}</span>
                        {finalVideoMeta?.duration_seconds && (
                          <span>長さ: {finalVideoMeta.duration_seconds}秒</span>
                        )}
                        {finalVideoMeta?.file_size_bytes && (
                          <span>
                            サイズ:{' '}
                            {(finalVideoMeta.file_size_bytes / 1024 / 1024).toFixed(1)}MB
                          </span>
                        )}
                      </div>
                      <a
                        href={finalVideoUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" /> 動画をダウンロード
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {currentStep < 4 && (
        <div className="flex justify-end">
          <Button onClick={goNext} disabled={!canProceed()} size="lg">
            次へ <Check className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Image generation picker */}
      <Dialog open={imgPickerOpen} onOpenChange={setImgPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>絵コンテ画像から読み込み</DialogTitle>
            <DialogDescription>
              この案件で過去に生成された絵コンテ用画像をコマとして読み込みます
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            {imgPickerLoading ? (
              <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
              </div>
            ) : imgJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                完了済みの絵コンテ用画像生成ジョブがありません
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {imgJobs.map((j) => {
                  const created = j.created_at
                    ? new Date(j.created_at).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';
                  const sceneCount = (j.input_data as any)?.scenes?.length;
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => handlePickImageJob(j)}
                      className="w-full text-left rounded-lg border bg-card p-3 hover:border-secondary hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{created}</span>
                        {sceneCount && (
                          <span className="text-[10px] bg-secondary-wash text-secondary px-1.5 py-0.5 rounded">
                            {sceneCount}シーン
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Narration picker */}
      <Dialog open={naPickerOpen} onOpenChange={setNaPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ナレーション音声から読み込み</DialogTitle>
            <DialogDescription>
              この案件で過去に生成されたナレーション音声を読み込みます
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            {naPickerLoading ? (
              <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
              </div>
            ) : naJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                完了済みのナレーション音声生成ジョブがありません
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {naJobs.map((j) => {
                  const created = j.created_at
                    ? new Date(j.created_at).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => handlePickNarration(j)}
                      className="w-full text-left rounded-lg border bg-card p-3 hover:border-secondary hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{created}</span>
                      </div>
                      {j.output_file_url && (
                        <audio
                          src={j.output_file_url}
                          controls
                          className="h-6 w-full"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarouselVideoTool;
