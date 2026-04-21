import { useState, useEffect, useCallback } from 'react';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SpotToolWizard from '@/components/spot/SpotToolWizard';
import VideoResizeSettings, {
  type VideoFormat,
  PRESET_FORMATS,
} from '@/components/spot/VideoResizeSettings';
import VideoResizeResult, {
  type SpotJob,
  type ResizedAsset,
} from '@/components/spot/VideoResizeResult';

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-video-resize';
const TOOL_TYPE = 'video_resize';

interface SeedFromCarousel {
  client_id?: string | null;
  product_id?: string | null;
  project_id?: string | null;
  source_video_url?: string;
  source_video_name?: string;
  from_tool?: string;
  from_job_id?: string;
}

const VideoResizeTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();

  const [sourceVideoUrl, setSourceVideoUrl] = useState<string>('');
  const [sourceVideoName, setSourceVideoName] = useState<string>('');
  const [selectedFormats, setSelectedFormats] = useState<VideoFormat[]>([
    PRESET_FORMATS[0],
    PRESET_FORMATS[1],
    PRESET_FORMATS[2],
  ]);
  const [resizeMode, setResizeMode] = useState<'fill' | 'fit'>('fill');
  const [bgColor, setBgColor] = useState<string>('#000000');

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<ResizedAsset[]>([]);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  // CarouselVideoTool からの seed 受信 (sessionStorage 経由)
  useEffect(() => {
    const seedJson = sessionStorage.getItem('video_resize_seed');
    if (!seedJson) return;
    try {
      const seed = JSON.parse(seedJson) as SeedFromCarousel;
      if (seed.client_id || seed.product_id || seed.project_id) {
        updateState({
          clientId: seed.client_id ?? null,
          productId: seed.product_id ?? null,
          projectId: seed.project_id ?? null,
        });
      }
      if (seed.source_video_url) {
        setSourceVideoUrl(seed.source_video_url);
        setSourceVideoName(seed.source_video_name ?? 'カルーセル動画');
      }
      sessionStorage.removeItem('video_resize_seed');
      toast.info('カルーセル動画を引き継ぎました');
    } catch (e) {
      console.error('failed to parse video_resize_seed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URLクエリ ?job_id= からの復元
  const handleRestoreJob = useCallback(
    (jid: string, _projectId: string, inputData: Record<string, unknown>) => {
      setJobId(jid);
      if (inputData.source_video_url) setSourceVideoUrl(String(inputData.source_video_url));
      if (inputData.source_video_name) setSourceVideoName(String(inputData.source_video_name));
      if (Array.isArray(inputData.target_formats)) {
        setSelectedFormats(inputData.target_formats as VideoFormat[]);
      }
      if (inputData.resize_mode) setResizeMode(inputData.resize_mode as 'fill' | 'fit');
      if (inputData.bg_color) setBgColor(String(inputData.bg_color));
    },
    []
  );

  const handleStartNew = useCallback(() => {
    setJobId(null);
    setJob(null);
    setAssets([]);
  }, []);

  // Realtime 購読
  useEffect(() => {
    if (!jobId) return;
    const refetch = async () => {
      const [jobRes, assetsRes] = await Promise.all([
        supabase.from('gen_spot_jobs').select('*').eq('id', jobId).single(),
        supabase
          .from('gen_spot_assets')
          .select('*')
          .eq('job_id', jobId)
          .in('asset_type', ['resized_video', 'resized_video_pending'])
          .order('sort_order'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as ResizedAsset[]);
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
      toolTitle="動画リサイズ"
      toolDescription="1つの元動画から、SNS別の複数アスペクト比へ一括リサイズします"
      toolEmoji="📐"
      toolType={TOOL_TYPE}
      state={state}
      updateState={updateState}
      jobId={jobId}
      onRestoreJob={handleRestoreJob}
      renderSettings={({ context }) => {
        const handleGenerate = async () => {
          if (!state.projectId || !user || !sourceVideoUrl || selectedFormats.length === 0) return;

          const insertPayload = {
            project_id: state.projectId,
            tool_type: TOOL_TYPE,
            input_data: {
              source_video_url: sourceVideoUrl,
              source_video_name: sourceVideoName,
              target_formats: selectedFormats,
              resize_mode: resizeMode,
              bg_color: bgColor,
            },
            status: 'pending',
            created_by: user.id,
          } as any;

          const { data: newJob, error: jobError } = await supabase
            .from('gen_spot_jobs')
            .insert(insertPayload)
            .select()
            .single();

          if (jobError || !newJob) {
            toast.error(`生成開始に失敗: ${jobError?.message ?? 'unknown'}`);
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
              source_video_url: sourceVideoUrl,
              target_formats: selectedFormats,
              resize_mode: resizeMode,
              bg_color: bgColor,
              client_name: context?.project.product.client.name ?? null,
              product_name: context?.project.product.name ?? null,
              project_name: context?.project.name ?? null,
            }),
          }).catch((e) => console.error('n8n webhook error:', e));

          toast.success(`${selectedFormats.length}サイズのリサイズを開始しました`);
        };

        return (
          <VideoResizeSettings
            projectId={state.projectId}
            userId={user?.id ?? null}
            sourceVideoUrl={sourceVideoUrl}
            setSourceVideoUrl={setSourceVideoUrl}
            sourceVideoName={sourceVideoName}
            setSourceVideoName={setSourceVideoName}
            selectedFormats={selectedFormats}
            setSelectedFormats={setSelectedFormats}
            resizeMode={resizeMode}
            setResizeMode={setResizeMode}
            bgColor={bgColor}
            setBgColor={setBgColor}
            onGenerate={handleGenerate}
            isRunning={isRunning}
          />
        );
      }}
      renderResult={({ context }) => (
        <VideoResizeResult
          job={job}
          assets={assets}
          jobId={jobId}
          selectedFormats={selectedFormats}
          context={context}
          state={state}
          onStartNew={handleStartNew}
        />
      )}
    />
  );
};

export default VideoResizeTool;
