import { useState, useEffect, useCallback } from 'react';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SpotToolWizard from '@/components/spot/SpotToolWizard';
import CompositionSettings, { type SeedInfo } from '@/components/spot/CompositionSettings';
import CompositionResult, {
  type SpotJob,
  type SpotAsset,
} from '@/components/spot/CompositionResult';

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-composition';
const TOOL_TYPE = 'composition';

const CompositionTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();

  // 設定state
  const [appealAxis, setAppealAxis] = useState('');
  const [copyText, setCopyText] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [creativeType, setCreativeType] = useState<string>('video');
  const [seedInfo, setSeedInfo] = useState<SeedInfo | null>(null);

  // ジョブstate
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<SpotAsset[]>([]);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  // sessionStorage seed 復元 (訴求軸ツールから引き継ぎ)
  useEffect(() => {
    const seedJson = sessionStorage.getItem('composition_seed');
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
      if (seed.appeal_axis_text) setAppealAxis(seed.appeal_axis_text);
      if (seed.copy_text) setCopyText(seed.copy_text);
      setSeedInfo({
        pattern_id: seed.pattern_id,
        hook: seed.copy_hook,
        from_job_id: seed.from_job_id,
      });
      sessionStorage.removeItem('composition_seed');
      toast.info(
        `訴求軸「${seed.appeal_axis_text}」とコピー「${seed.copy_text}」を引き継ぎました`
      );
    } catch (e) {
      console.error('failed to parse composition_seed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ジョブ復元 (URLクエリ ?job_id=xxx)
  const handleRestoreJob = useCallback(
    (jid: string, _projectId: string, inputData: Record<string, unknown>) => {
      setJobId(jid);
      if (inputData.appeal_axis) setAppealAxis(String(inputData.appeal_axis));
      if (inputData.copy_text) setCopyText(String(inputData.copy_text));
      if (inputData.duration_seconds) setDuration(Number(inputData.duration_seconds));
      if (inputData.creative_type) setCreativeType(String(inputData.creative_type));
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
        supabase
          .from('gen_spot_assets')
          .select('*')
          .eq('job_id', jobId)
          .order('sort_order'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as SpotAsset[]);
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
      toolTitle="構成案・字コンテ生成"
      toolDescription="訴求軸とコピーから動画の構成案・字コンテを生成します"
      toolEmoji="🎬"
      toolType={TOOL_TYPE}
      state={state}
      updateState={updateState}
      jobId={jobId}
      onRestoreJob={handleRestoreJob}
      renderSettings={({ context }) => {
        const handleGenerate = async () => {
          if (!state.projectId || !user || !appealAxis.trim() || !copyText.trim()) return;

          const compositionRules =
            context?.rules.filter((r) =>
              ['storyboard', 'script', 'video_horizontal', 'video_vertical'].includes(
                r.process_type
              )
            ) ?? [];

          const { data: newJob, error: jobError } = await supabase
            .from('gen_spot_jobs')
            .insert({
              project_id: state.projectId,
              tool_type: TOOL_TYPE,
              input_data: {
                appeal_axis: appealAxis,
                copy_text: copyText,
                duration_seconds: duration,
                creative_type: creativeType,
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
              appeal_axis: appealAxis,
              copy_text: copyText,
              duration_seconds: duration,
              creative_type: creativeType,
              copyright_text: context?.project.copyright_text ?? null,
              client_name: context?.project.product.client.name ?? null,
              product_name: context?.project.product.name ?? null,
              project_name: context?.project.name ?? null,
              rules: compositionRules.map((r) => ({
                id: r.id,
                description: r.description,
                severity: r.severity,
                process_type: r.process_type,
              })),
              correction_patterns: context?.corrections ?? [],
            }),
          }).catch((e) => console.error('n8n webhook error:', e));

          toast.success('構成案の生成を開始しました');
        };

        return (
          <CompositionSettings
            context={context}
            appealAxis={appealAxis}
            setAppealAxis={setAppealAxis}
            copyText={copyText}
            setCopyText={setCopyText}
            duration={duration}
            setDuration={setDuration}
            creativeType={creativeType}
            setCreativeType={setCreativeType}
            seedInfo={seedInfo}
            onGenerate={handleGenerate}
            isRunning={isRunning}
          />
        );
      }}
      renderResult={({ context }) => (
        <CompositionResult
          job={job}
          assets={assets}
          jobId={jobId}
          context={context}
          state={state}
          appealAxis={appealAxis}
          copyText={copyText}
          duration={duration}
          creativeType={creativeType}
          onStartNew={handleStartNew}
        />
      )}
    />
  );
};

export default CompositionTool;
