import { useState, useEffect, useCallback } from 'react';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SpotToolWizard from '@/components/spot/SpotToolWizard';
import VConSettings, {
  type DurationSec,
  type CreativeType,
} from '@/components/spot/VConSettings';
import VConResult, {
  type SpotJob,
  type VconAsset,
} from '@/components/spot/VConResult';

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-vcon';
const TOOL_TYPE = 'vcon';

interface VConSeed {
  client_id?: string | null;
  product_id?: string | null;
  project_id?: string | null;
  appeal_axis?: string;
  copy_text?: string;
  composition?: string;
  narration_script?: string;
  duration_seconds?: number;
  creative_type?: 'video' | 'banner';
  bgm_suggestions?: unknown;
  from_tool?: string;
  from_job_id?: string;
}

const VConTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();

  const [composition, setComposition] = useState('');
  const [narrationScript, setNarrationScript] = useState('');
  const [appealAxis, setAppealAxis] = useState('');
  const [copyText, setCopyText] = useState('');
  const [durationSeconds, setDurationSeconds] = useState<DurationSec>(30);
  const [creativeType, setCreativeType] = useState<CreativeType>('video');

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<VconAsset[]>([]);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  // sessionStorage 'vcon_seed' 受信
  useEffect(() => {
    const seedJson = sessionStorage.getItem('vcon_seed');
    if (!seedJson) return;
    try {
      const seed = JSON.parse(seedJson) as VConSeed;
      if (seed.client_id || seed.product_id || seed.project_id) {
        updateState({
          clientId: seed.client_id ?? null,
          productId: seed.product_id ?? null,
          projectId: seed.project_id ?? null,
        });
      }
      if (seed.appeal_axis) setAppealAxis(seed.appeal_axis);
      if (seed.copy_text) setCopyText(seed.copy_text);
      if (seed.composition) setComposition(seed.composition);
      if (seed.narration_script) setNarrationScript(seed.narration_script);
      if (
        seed.duration_seconds === 15 ||
        seed.duration_seconds === 30 ||
        seed.duration_seconds === 60
      ) {
        setDurationSeconds(seed.duration_seconds);
      }
      if (seed.creative_type === 'video' || seed.creative_type === 'banner') {
        setCreativeType(seed.creative_type);
      }
      sessionStorage.removeItem('vcon_seed');
      toast.info('上流ツールから入力を引き継ぎました');
    } catch (e) {
      console.error('failed to parse vcon_seed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestoreJob = useCallback(
    (jid: string, _projectId: string, inputData: Record<string, unknown>) => {
      setJobId(jid);
      if (inputData.composition) setComposition(String(inputData.composition));
      if (inputData.narration_script) setNarrationScript(String(inputData.narration_script));
      if (inputData.appeal_axis) setAppealAxis(String(inputData.appeal_axis));
      if (inputData.copy_text) setCopyText(String(inputData.copy_text));
      if (inputData.duration_seconds)
        setDurationSeconds(Number(inputData.duration_seconds) as DurationSec);
      if (inputData.creative_type) setCreativeType(inputData.creative_type as CreativeType);
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
          .eq('asset_type', 'vcon'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as VconAsset[]);
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
      toolTitle="Vコン作成"
      toolDescription="構成案・NA原稿からカット単位のテロップ設計書(Vコン)を生成します"
      toolEmoji="🎬"
      toolType={TOOL_TYPE}
      state={state}
      updateState={updateState}
      jobId={jobId}
      onRestoreJob={handleRestoreJob}
      renderSettings={({ context }) => {
        const handleGenerate = async () => {
          if (!state.projectId || !user) return;
          if (!composition.trim() && !narrationScript.trim()) return;

          const relevantRules =
            context?.rules.filter((r) =>
              ['vcon', 'script', 'storyboard'].some((t) => r.process_type.includes(t))
            ) ?? [];

          const { data: newJob, error } = await supabase
            .from('gen_spot_jobs')
            .insert({
              project_id: state.projectId,
              tool_type: TOOL_TYPE,
              input_data: {
                composition: composition || null,
                narration_script: narrationScript || null,
                appeal_axis: appealAxis || null,
                copy_text: copyText || null,
                duration_seconds: durationSeconds,
                creative_type: creativeType,
              },
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
              composition: composition || null,
              narration_script: narrationScript || null,
              appeal_axis: appealAxis || null,
              copy_text: copyText || null,
              duration_seconds: durationSeconds,
              creative_type: creativeType,
              copyright_text: context?.project.copyright_text ?? null,
              client_name: context?.project.product.client.name ?? null,
              product_name: context?.project.product.name ?? null,
              project_name: context?.project.name ?? null,
              rules: relevantRules.map((r) => ({
                rule_id: r.rule_id,
                title: r.title,
                description: r.description,
                severity: r.severity,
                category: r.category,
              })),
            }),
          }).catch((e) => console.error('n8n webhook error:', e));

          toast.success('Vコン生成を開始しました');
        };

        return (
          <VConSettings
            context={context}
            projectId={state.projectId}
            composition={composition}
            setComposition={setComposition}
            narrationScript={narrationScript}
            setNarrationScript={setNarrationScript}
            appealAxis={appealAxis}
            setAppealAxis={setAppealAxis}
            copyText={copyText}
            setCopyText={setCopyText}
            durationSeconds={durationSeconds}
            setDurationSeconds={setDurationSeconds}
            creativeType={creativeType}
            setCreativeType={setCreativeType}
            onGenerate={handleGenerate}
            isRunning={isRunning}
          />
        );
      }}
      renderResult={({ context }) => (
        <VConResult
          job={job}
          assets={assets}
          jobId={jobId}
          durationSeconds={durationSeconds}
          creativeType={creativeType}
          context={context}
          state={state}
          onStartNew={handleStartNew}
        />
      )}
    />
  );
};

export default VConTool;
