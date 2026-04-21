import { useState, useEffect, useCallback } from 'react';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SpotToolWizard from '@/components/spot/SpotToolWizard';
import ImageGenerationSettings, {
  type ImageGenSeedInfo,
} from '@/components/spot/ImageGenerationSettings';
import ImageGenerationResult, {
  type SpotJob,
  type SceneAsset,
} from '@/components/spot/ImageGenerationResult';

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-image-generation';
const TOOL_TYPE = 'image_generation';

interface SeedScene {
  part?: string;
  time_range?: string;
  telop?: string;
  visual?: string;
  narration?: string;
}

const ImageGenerationTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();

  const [composition, setComposition] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [creativeStyle, setCreativeStyle] = useState<string>('photographic');
  const [aspectRatio, setAspectRatio] = useState<string>('landscape_16_9');
  const [seedInfo, setSeedInfo] = useState<ImageGenSeedInfo | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<SceneAsset[]>([]);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  // sessionStorage seed 復元 (構成案ツールから)
  useEffect(() => {
    const seedJson = sessionStorage.getItem('image_generation_seed');
    if (!seedJson) return;
    try {
      const seed = JSON.parse(seedJson);
      if (seed.client_id || seed.product_id || seed.project_id) {
        updateState({
          clientId: seed.client_id ?? null,
          productId: seed.product_id ?? null,
          projectId: seed.project_id ?? null,
        });
      }
      if (seed.scenes && Array.isArray(seed.scenes)) {
        const text = (seed.scenes as SeedScene[])
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
        setSeedInfo({
          from_tool: seed.from_tool,
          from_job_id: seed.from_job_id,
          scenes_count: seed.scenes.length,
        });
      }
      if (seed.duration_seconds) setDuration(Number(seed.duration_seconds));
      sessionStorage.removeItem('image_generation_seed');
      toast.info(`構成案 ${seed.scenes?.length ?? 0} シーンを引き継ぎました`);
    } catch (e) {
      console.error('failed to parse image_generation_seed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestoreJob = useCallback(
    (jid: string, _projectId: string, inputData: Record<string, unknown>) => {
      setJobId(jid);
      if (inputData.composition) setComposition(String(inputData.composition));
      if (inputData.duration_seconds) setDuration(Number(inputData.duration_seconds));
      if (inputData.creative_style) setCreativeStyle(String(inputData.creative_style));
      if (inputData.aspect_ratio) setAspectRatio(String(inputData.aspect_ratio));
    },
    []
  );

  const handleStartNew = useCallback(() => {
    setJobId(null);
    setJob(null);
    setAssets([]);
  }, []);

  // Realtime購読
  useEffect(() => {
    if (!jobId) return;
    const refetch = async () => {
      const [jobRes, assetsRes] = await Promise.all([
        supabase.from('gen_spot_jobs').select('*').eq('id', jobId).single(),
        supabase.from('gen_spot_assets').select('*').eq('job_id', jobId).order('sort_order'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as SceneAsset[]);
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

  return (
    <SpotToolWizard
      toolTitle="絵コンテ画像生成"
      toolDescription="字コンテから動画用のシーン画像(絵コンテ)を生成します"
      toolEmoji="🎨"
      toolType={TOOL_TYPE}
      state={state}
      updateState={updateState}
      jobId={jobId}
      onRestoreJob={handleRestoreJob}
      renderSettings={({ context }) => {
        const handleGenerate = async () => {
          if (!state.projectId || !user || !composition.trim()) return;

          const imageRules =
            context?.rules.filter((r) =>
              ['styleframe', 'storyboard', 'video_horizontal', 'video_vertical'].includes(
                r.process_type
              )
            ) ?? [];

          const { data: newJob, error: jobError } = await supabase
            .from('gen_spot_jobs')
            .insert({
              project_id: state.projectId,
              tool_type: TOOL_TYPE,
              input_data: {
                composition,
                duration_seconds: duration,
                creative_style: creativeStyle,
                aspect_ratio: aspectRatio,
              },
              status: 'pending',
              created_by: user.id,
            })
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
              composition,
              duration_seconds: duration,
              creative_style: creativeStyle,
              aspect_ratio: aspectRatio,
              copyright_text: context?.project.copyright_text ?? null,
              client_name: context?.project.product.client.name ?? null,
              product_name: context?.project.product.name ?? null,
              project_name: context?.project.name ?? null,
              rules: imageRules.map((r) => ({
                id: r.id,
                description: r.description,
                severity: r.severity,
                process_type: r.process_type,
              })),
              correction_patterns: context?.corrections ?? [],
            }),
          }).catch((e) => console.error('n8n webhook error:', e));

          toast.success('画像生成を開始しました');
        };

        return (
          <ImageGenerationSettings
            context={context}
            projectId={state.projectId}
            composition={composition}
            setComposition={setComposition}
            duration={duration}
            setDuration={setDuration}
            creativeStyle={creativeStyle}
            setCreativeStyle={setCreativeStyle}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            seedInfo={seedInfo}
            onGenerate={handleGenerate}
            isRunning={isRunning}
          />
        );
      }}
      renderResult={({ context }) => (
        <ImageGenerationResult
          job={job}
          assets={assets}
          jobId={jobId}
          context={context}
          state={state}
          onStartNew={handleStartNew}
        />
      )}
    />
  );
};

export default ImageGenerationTool;
