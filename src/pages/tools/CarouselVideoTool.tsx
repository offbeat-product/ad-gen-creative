import { useState, useEffect, useCallback } from 'react';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SpotToolWizard from '@/components/spot/SpotToolWizard';
import CarouselVideoSettings, {
  type Frame,
  type AspectRatio,
  type Resolution,
  type TextPosition,
  createFrame,
} from '@/components/spot/CarouselVideoSettings';
import CarouselVideoResult, {
  type SpotJob,
  type CarouselAsset,
} from '@/components/spot/CarouselVideoResult';

const N8N_WEBHOOK_URL =
  'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-carousel-video';
const TOOL_TYPE = 'carousel_video';

interface CarouselSeedImage {
  url?: string;
  section?: string;
  duration_seconds?: number;
  telop?: string;
  scene_index?: number;
}

interface CarouselSeed {
  client_id?: string | null;
  product_id?: string | null;
  project_id?: string | null;
  images?: CarouselSeedImage[];
  from_tool?: string;
  from_job_id?: string;
}

const CarouselVideoTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();

  // フレーム
  const [frames, setFrames] = useState<Frame[]>([]);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);

  // 音声
  const [narrationUrl, setNarrationUrl] = useState<string>('');
  const [narrationName, setNarrationName] = useState<string>('');
  const [bgmMode, setBgmMode] = useState<'none' | 'upload'>('none');
  const [bgmUrl, setBgmUrl] = useState<string>('');
  const [bgmName, setBgmName] = useState<string>('');
  const [narrationVolume, setNarrationVolume] = useState(100);
  const [bgmVolume, setBgmVolume] = useState(30);

  // 動画
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [resolution, setResolution] = useState<Resolution>('1080');

  // 著作権
  const [copyrightText, setCopyrightText] = useState('');
  const [copyrightPosition, setCopyrightPosition] = useState<TextPosition>('bottom_right');

  // テキストデザイン
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

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  // sessionStorage 'carousel_video_seed' 受信
  useEffect(() => {
    const seedJson = sessionStorage.getItem('carousel_video_seed');
    if (!seedJson) return;
    try {
      const seed = JSON.parse(seedJson) as CarouselSeed;
      if (seed.client_id || seed.product_id || seed.project_id) {
        updateState({
          clientId: seed.client_id ?? null,
          productId: seed.product_id ?? null,
          projectId: seed.project_id ?? null,
        });
      }
      if (Array.isArray(seed.images) && seed.images.length > 0) {
        const validImages = seed.images.filter((i): i is CarouselSeedImage & { url: string } => !!i.url);
        const newFrames = validImages.map((img) => {
          const frame = createFrame(img.url);
          if (img.duration_seconds) frame.display_seconds = Number(img.duration_seconds);
          if (img.telop) frame.text_overlay = img.telop;
          return frame;
        });
        setFrames(newFrames);
        if (newFrames[0]) setActiveFrameId(newFrames[0].id);
      }
      sessionStorage.removeItem('carousel_video_seed');
      toast.info(`絵コンテから${seed.images?.length ?? 0}コマを引き継ぎました`);
    } catch (e) {
      console.error('failed to parse carousel_video_seed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestoreJob = useCallback(
    (jid: string, _projectId: string, inputData: Record<string, unknown>) => {
      setJobId(jid);
      if (Array.isArray(inputData.frames)) {
        const restoredFrames = (inputData.frames as any[]).map((f, idx) => ({
          id: `frame_restore_${idx}_${Date.now()}`,
          image_url: String(f.image_url ?? ''),
          display_seconds: Number(f.display_seconds ?? 3),
          text_overlay: String(f.text_overlay ?? ''),
          text_position: (f.text_position ?? 'bottom_center') as TextPosition,
          transition_in: f.transition_in ?? 'fade',
          transition_duration: Number(f.transition_duration ?? 0.3),
        })) as Frame[];
        setFrames(restoredFrames);
        if (restoredFrames[0]) setActiveFrameId(restoredFrames[0].id);
      }
      if (inputData.narration_url) setNarrationUrl(String(inputData.narration_url));
      if (inputData.bgm_url) {
        setBgmUrl(String(inputData.bgm_url));
        setBgmMode('upload');
      }
      if (inputData.narration_volume != null)
        setNarrationVolume(Number(inputData.narration_volume) * 100);
      if (inputData.bgm_volume != null) setBgmVolume(Number(inputData.bgm_volume) * 100);
      if (inputData.aspect_ratio) setAspectRatio(inputData.aspect_ratio as AspectRatio);
      if (inputData.resolution) setResolution(inputData.resolution as Resolution);
      if (inputData.copyright_text) setCopyrightText(String(inputData.copyright_text));
      if (inputData.copyright_position)
        setCopyrightPosition(inputData.copyright_position as TextPosition);
      const td = (inputData.text_design as any) ?? {};
      if (td.font_family) setFontFamily(String(td.font_family));
      if (td.font_size) setFontSize(Number(td.font_size));
      if (td.font_color) setFontColor(String(td.font_color));
      if (typeof td.stroke_enabled === 'boolean') setStrokeEnabled(td.stroke_enabled);
      if (td.stroke_color) setStrokeColor(String(td.stroke_color));
      if (td.stroke_width) setStrokeWidth(Number(td.stroke_width));
      if (typeof td.vertical === 'boolean') setVertical(td.vertical);
    },
    []
  );

  const handleStartNew = useCallback(() => {
    setJobId(null);
    setJob(null);
    setAssets([]);
  }, []);

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
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gen_spot_jobs',
          filter: `id=eq.${jobId}`,
        },
        refetch
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gen_spot_assets',
          filter: `job_id=eq.${jobId}`,
        },
        refetch
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  return (
    <SpotToolWizard
      toolTitle="カルーセル動画"
      toolDescription="複数のコマ画像・テロップ・音声から、マンガ広告のような動画を生成します"
      toolEmoji="🎞️"
      toolType={TOOL_TYPE}
      state={state}
      updateState={updateState}
      jobId={jobId}
      onRestoreJob={handleRestoreJob}
      renderSettings={({ context }) => {
        const handleGenerate = async () => {
          if (!state.projectId || !user || frames.length < 2) return;

          const inputData = {
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
          };

          const { data: newJob, error } = await supabase
            .from('gen_spot_jobs')
            .insert({
              project_id: state.projectId,
              tool_type: TOOL_TYPE,
              input_data: inputData,
              status: 'pending',
              created_by: user.id,
            })
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
              ...inputData,
              client_name: context?.project.product.client.name ?? null,
              product_name: context?.project.product.name ?? null,
              project_name: context?.project.name ?? null,
            }),
          }).catch((e) => console.error('n8n webhook error:', e));

          toast.success('カルーセル動画の生成を開始しました');
        };

        return (
          <CarouselVideoSettings
            context={context}
            projectId={state.projectId}
            userId={user?.id ?? null}
            frames={frames}
            setFrames={setFrames}
            activeFrameId={activeFrameId}
            setActiveFrameId={setActiveFrameId}
            narrationUrl={narrationUrl}
            setNarrationUrl={setNarrationUrl}
            narrationName={narrationName}
            setNarrationName={setNarrationName}
            bgmMode={bgmMode}
            setBgmMode={setBgmMode}
            bgmUrl={bgmUrl}
            setBgmUrl={setBgmUrl}
            bgmName={bgmName}
            setBgmName={setBgmName}
            narrationVolume={narrationVolume}
            setNarrationVolume={setNarrationVolume}
            bgmVolume={bgmVolume}
            setBgmVolume={setBgmVolume}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            resolution={resolution}
            setResolution={setResolution}
            copyrightText={copyrightText}
            setCopyrightText={setCopyrightText}
            copyrightPosition={copyrightPosition}
            setCopyrightPosition={setCopyrightPosition}
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
            fontSize={fontSize}
            setFontSize={setFontSize}
            fontColor={fontColor}
            setFontColor={setFontColor}
            strokeEnabled={strokeEnabled}
            setStrokeEnabled={setStrokeEnabled}
            strokeColor={strokeColor}
            setStrokeColor={setStrokeColor}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
            vertical={vertical}
            setVertical={setVertical}
            onGenerate={handleGenerate}
            isRunning={isRunning}
          />
        );
      }}
      renderResult={({ context }) => (
        <CarouselVideoResult
          job={job}
          assets={assets}
          jobId={jobId}
          aspectRatio={aspectRatio}
          resolution={resolution}
          frames={frames}
          context={context}
          state={state}
          onStartNew={handleStartNew}
        />
      )}
    />
  );
};

export default CarouselVideoTool;
