import { useState, useEffect, useCallback } from 'react';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SpotToolWizard from '@/components/spot/SpotToolWizard';
import VConSettings, { type DurationSec } from '@/components/spot/VConSettings';
import VConResult, { type SpotJob, type VconAsset } from '@/components/spot/VConResult';

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-vcon';
const TOOL_TYPE = 'vcon';

interface VConSeed {
  client_id?: string | null;
  product_id?: string | null;
  project_id?: string | null;
  composition?: string;
  composition_job_id?: string;
  duration_seconds?: number;
  narration_audio_url?: string | null;
  narration_audio_job_id?: string | null;
  bgm_url?: string | null;
}

const VConTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();

  const [composition, setComposition] = useState('');
  const [compositionJobId, setCompositionJobId] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<DurationSec>(30);
  const [narrationAudioUrl, setNarrationAudioUrl] = useState<string | null>(null);
  const [narrationAudioJobId, setNarrationAudioJobId] = useState<string | null>(null);
  const [bgmUrl, setBgmUrl] = useState<string | null>(null);

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
      if (seed.composition) setComposition(seed.composition);
      if (seed.composition_job_id) setCompositionJobId(seed.composition_job_id);
      if (
        seed.duration_seconds === 15 ||
        seed.duration_seconds === 30 ||
        seed.duration_seconds === 60
      ) {
        setDurationSeconds(seed.duration_seconds);
      }
      if (seed.narration_audio_url) setNarrationAudioUrl(seed.narration_audio_url);
      if (seed.narration_audio_job_id) setNarrationAudioJobId(seed.narration_audio_job_id);
      if (seed.bgm_url) setBgmUrl(seed.bgm_url);
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
      if (inputData.composition_job_id)
        setCompositionJobId(String(inputData.composition_job_id));
      if (inputData.duration_seconds)
        setDurationSeconds(Number(inputData.duration_seconds) as DurationSec);
      if (inputData.narration_audio_url)
        setNarrationAudioUrl(String(inputData.narration_audio_url));
      if (inputData.narration_audio_job_id)
        setNarrationAudioJobId(String(inputData.narration_audio_job_id));
      if (inputData.bgm_url) setBgmUrl(String(inputData.bgm_url));
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
      toolDescription="構成案 + ナレーション/BGM を組み合わせて、動画として再生確認できるVコンを生成します"
      toolEmoji="🎬"
      toolType={TOOL_TYPE}
      state={state}
      updateState={updateState}
      jobId={jobId}
      onRestoreJob={handleRestoreJob}
      renderSettings={({ context }) => {
        const handleGenerate = async () => {
          if (!state.projectId || !user) return;
          if (!composition.trim()) {
            toast.error('構成案を入力してください');
            return;
          }

          const inputData = {
            composition,
            composition_job_id: compositionJobId,
            duration_seconds: durationSeconds,
            narration_audio_url: narrationAudioUrl,
            bgm_url: bgmUrl,
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

          const payload: Record<string, unknown> = {
            spot_job_id: newJob.id,
            project_id: state.projectId,
            composition_job_id: compositionJobId,
            composition: compositionJobId ? null : composition,
            narration_audio_url: narrationAudioUrl,
            bgm_url: bgmUrl,
            duration_seconds: durationSeconds,

            // 🆕 Ad Brain Context(階層統合: クライアント/商材/案件)
            ad_brain_rules: (context?.rules ?? []).map((r) => ({
              id: r.id,
              title: r.title,
              description: r.description,
              category: r.category,
              severity: r.severity,
              process_type: r.process_type,
            })),
            ad_brain_materials: (context?.materials ?? [])
              .filter((m) => m.content_text && m.content_text.length > 0)
              .map((m) => ({
                id: m.id,
                title: m.title,
                material_type: m.material_type,
                scope_type: m.scope_type,
                content_text: m.content_text,
              })),
          };

          fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).catch((e) => console.error('n8n webhook error:', e));

          toast.success('Vコン生成を開始しました');
        };

        return (
          <VConSettings
            context={context}
            projectId={state.projectId}
            composition={composition}
            setComposition={setComposition}
            compositionJobId={compositionJobId}
            setCompositionJobId={setCompositionJobId}
            durationSeconds={durationSeconds}
            setDurationSeconds={setDurationSeconds}
            narrationAudioUrl={narrationAudioUrl}
            setNarrationAudioUrl={setNarrationAudioUrl}
            bgmUrl={bgmUrl}
            setBgmUrl={setBgmUrl}
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
          creativeType="video"
          context={context}
          state={state}
          onStartNew={handleStartNew}
        />
      )}
    />
  );
};

export default VConTool;
