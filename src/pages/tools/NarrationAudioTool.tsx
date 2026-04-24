import { useState, useEffect, useCallback } from 'react';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SpotToolWizard from '@/components/spot/SpotToolWizard';
import NarrationAudioSettings, {
  type NarrationAudioSeedInfo,
} from '@/components/spot/NarrationAudioSettings';
import NarrationAudioResult, {
  type SpotJob,
  type SpotAsset,
} from '@/components/spot/NarrationAudioResult';

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-narration-audio';
const TOOL_TYPE = 'narration_audio';
const DEFAULT_VOICE_ID = '3JDquces8E8bkmvbh6Bc';

const NarrationAudioTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();

  // 設定state
  const [script, setScript] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_ID);
  const [speed, setSpeed] = useState(1.0);
  const [targetDuration, setTargetDuration] = useState(30);
  const [seedInfo, setSeedInfo] = useState<NarrationAudioSeedInfo | null>(null);

  // ジョブstate
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<SpotAsset[]>([]);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  // sessionStorage seed 復元 (NA原稿生成ツールから引き継ぎ)
  useEffect(() => {
    const seedJson = sessionStorage.getItem('narration_audio_seed');
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
      if (seed.script) setScript(String(seed.script));
      setSeedInfo({
        from_tool: seed.from_tool,
        from_job_id: seed.from_job_id,
      });
      sessionStorage.removeItem('narration_audio_seed');
      toast.info('NA原稿を引き継ぎました');
    } catch (e) {
      console.error('failed to parse narration_audio_seed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ジョブ復元 (URLクエリ ?job_id=xxx)
  const handleRestoreJob = useCallback(
    (jid: string, _projectId: string, inputData: Record<string, unknown>) => {
      setJobId(jid);
      if (inputData.script) setScript(String(inputData.script));
      if (inputData.voice_id) setSelectedVoice(String(inputData.voice_id));
      if (inputData.speed !== undefined) setSpeed(Number(inputData.speed));
    },
    []
  );

  const handleStartNew = useCallback(() => {
    setJobId(null);
    setJob(null);
    setAssets([]);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.txt')) {
      const text = await file.text();
      setScript(text);
      toast.success('テキストを読み込みました');
      return;
    }
    if (file.name.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setScript(result.value);
        toast.success('docxからテキストを読み込みました');
      } catch (err) {
        toast.error('docxの読み込みに失敗しました');
        console.error(err);
      }
      return;
    }
    toast.error('対応形式: .txt, .docx');
  };

  // Realtime購読
  useEffect(() => {
    if (!jobId) return;

    const refetch = async () => {
      const [jobRes, assetsRes] = await Promise.all([
        supabase.from('gen_spot_jobs').select('*').eq('id', jobId).single(),
        supabase.from('gen_spot_assets').select('*').eq('job_id', jobId).order('sort_order'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as SpotAsset[]);
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
      toolTitle="ナレーション音声生成"
      toolDescription="NA原稿からElevenLabsで音声を生成します"
      toolEmoji="🎙️"
      toolType={TOOL_TYPE}
      state={state}
      updateState={updateState}
      jobId={jobId}
      onRestoreJob={handleRestoreJob}
      renderSettings={({ context }) => {
        const handleGenerate = async () => {
          if (!state.projectId || !user || !script.trim()) return;

          const narrationRules =
            context?.rules.filter((r) =>
              ['narration', 'na_script', 'script'].includes(r.process_type)
            ) ?? [];

          const { data: newJob, error: jobError } = await supabase
            .from('gen_spot_jobs')
            .insert({
              project_id: state.projectId,
              tool_type: TOOL_TYPE,
              input_data: { script, voice_id: selectedVoice, speed },
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
              script,
              voice_id: selectedVoice,
              speed,
              copyright_text: context?.project.copyright_text ?? null,
              client_name: context?.project.product.client.name ?? null,
              product_name: context?.project.product.name ?? null,
              rules: narrationRules.map((r) => ({
                id: r.id,
                description: r.description,
                severity: r.severity,
              })),
            }),
          }).catch((e) => console.error('n8n webhook error:', e));

          toast.success('音声生成を開始しました');
        };

        return (
          <NarrationAudioSettings
            context={context}
            projectId={state.projectId}
            script={script}
            setScript={setScript}
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
            speed={speed}
            setSpeed={setSpeed}
            targetDuration={targetDuration}
            setTargetDuration={setTargetDuration}
            seedInfo={seedInfo}
            onGenerate={handleGenerate}
            isRunning={isRunning}
            onFileUpload={handleFileUpload}
          />
        );
      }}
      renderResult={({ context }) => (
        <NarrationAudioResult
          job={job}
          assets={assets}
          jobId={jobId}
          context={context}
          state={state}
          script={script}
          onStartNew={handleStartNew}
        />
      )}
    />
  );
};

export default NarrationAudioTool;
