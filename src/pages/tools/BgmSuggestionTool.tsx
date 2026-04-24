import { useState, useEffect, useCallback } from 'react';

import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SpotToolWizard from '@/components/spot/SpotToolWizard';
import BgmSuggestionSettings, {
  type BgmSeedInfo,
} from '@/components/spot/BgmSuggestionSettings';
import BgmSuggestionResult from '@/components/spot/BgmSuggestionResult';

const N8N_WEBHOOK_URL =
  'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-bgm-suggestion';

interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  output_data: Record<string, unknown> | null;
  created_at?: string | null;
}

interface BgmAsset {
  id: string;
  asset_type: string;
  metadata: Record<string, unknown> | null;
  file_url?: string;
  file_name?: string | null;
  file_size_bytes?: number | null;
  created_at?: string | null;
}

const BgmSuggestionTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();

  const [appealAxis, setAppealAxis] = useState('');
  const [copyText, setCopyText] = useState('');
  const [composition, setComposition] = useState('');
  const [narrationScript, setNarrationScript] = useState('');
  const [durationSeconds, setDurationSeconds] = useState<15 | 30 | 60>(30);
  const [creativeType, setCreativeType] = useState<'video' | 'banner'>('video');
  const [numSuggestions, setNumSuggestions] = useState(3);
  const [seedInfo, setSeedInfo] = useState<BgmSeedInfo | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<BgmAsset[]>([]);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  // sessionStorage seed (NarrationAudioTool から)
  useEffect(() => {
    const seedJson = sessionStorage.getItem('bgm_suggestion_seed');
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
      if (seed.script) setNarrationScript(seed.script);
      if (seed.appeal_axis) setAppealAxis(seed.appeal_axis);
      if (seed.copy_text) setCopyText(seed.copy_text);
      if (seed.composition) setComposition(seed.composition);
      if (seed.duration_seconds) {
        setDurationSeconds(Number(seed.duration_seconds) as 15 | 30 | 60);
      }
      if (seed.creative_type) {
        setCreativeType(seed.creative_type as 'video' | 'banner');
      }
      setSeedInfo({
        from_tool: seed.from_tool,
        from_job_id: seed.from_job_id,
        has_audio: !!seed.narration_audio_url,
      });
      sessionStorage.removeItem('bgm_suggestion_seed');
      toast.info('NA原稿を引き継ぎました');
    } catch (e) {
      console.error('failed to parse bgm_suggestion_seed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestoreJob = useCallback(
    (jid: string, _projectId: string, inputData: Record<string, unknown>) => {
      setJobId(jid);
      if (inputData.appeal_axis) setAppealAxis(String(inputData.appeal_axis));
      if (inputData.copy_text) setCopyText(String(inputData.copy_text));
      if (inputData.composition) setComposition(String(inputData.composition));
      if (inputData.narration_script)
        setNarrationScript(String(inputData.narration_script));
      if (inputData.duration_seconds)
        setDurationSeconds(Number(inputData.duration_seconds) as 15 | 30 | 60);
      if (inputData.creative_type)
        setCreativeType(inputData.creative_type as 'video' | 'banner');
      if (inputData.num_suggestions)
        setNumSuggestions(Number(inputData.num_suggestions));
    },
    []
  );

  // Realtime
  useEffect(() => {
    if (!jobId) return;
    const refetch = async () => {
      const [jobRes, assetsRes] = await Promise.all([
        supabase.from('gen_spot_jobs').select('*').eq('id', jobId).single(),
        supabase
          .from('gen_spot_assets')
          .select('*')
          .eq('job_id', jobId)
          .in('asset_type', ['bgm_suggestion', 'bgm_upload']),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as BgmAsset[]);
    };
    refetch();
    const channel = supabase
      .channel(`spot-job-bgm-${jobId}`)
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
      toolTitle="BGM提案"
      toolDescription="広告内容に合うBGMの方向性を提案し、Envato Elements で楽曲を検索できます"
      toolEmoji="🎵"
      toolType="bgm_suggestion"
      state={state}
      updateState={updateState}
      jobId={jobId}
      onRestoreJob={handleRestoreJob}
      renderSettings={({ context }) => (
        <BgmSuggestionSettings
          context={context}
          projectId={state.projectId}
          appealAxis={appealAxis}
          setAppealAxis={setAppealAxis}
          copyText={copyText}
          setCopyText={setCopyText}
          composition={composition}
          setComposition={setComposition}
          narrationScript={narrationScript}
          setNarrationScript={setNarrationScript}
          durationSeconds={durationSeconds}
          setDurationSeconds={setDurationSeconds}
          creativeType={creativeType}
          setCreativeType={setCreativeType}
          numSuggestions={numSuggestions}
          setNumSuggestions={setNumSuggestions}
          seedInfo={seedInfo}
          onGenerate={buildHandleGenerate(context)}
          isRunning={isRunning}
        />
      )}
      renderResult={({ context }) => (
        <BgmSuggestionResult
          job={job}
          assets={assets}
          jobId={jobId}
          context={context}
          state={state}
          appealAxis={appealAxis}
          copyText={copyText}
          composition={composition}
          narrationScript={narrationScript}
          durationSeconds={durationSeconds}
          creativeType={creativeType}
          onStartNew={() => {
            setJobId(null);
            setJob(null);
            setAssets([]);
          }}
        />
      )}
    />
  );
};

export default BgmSuggestionTool;
