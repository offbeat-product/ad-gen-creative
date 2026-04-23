import { useState, useEffect, useCallback } from 'react';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SpotToolWizard from '@/components/spot/SpotToolWizard';
import NarrationScriptSettings, {
  type NarrationScriptSeedInfo,
} from '@/components/spot/NarrationScriptSettings';
import NarrationScriptResult, {
  type SpotJob,
  type SpotAsset,
} from '@/components/spot/NarrationScriptResult';

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-narration-script';
const TOOL_TYPE = 'narration_script';

interface SeedScene {
  part?: string;
  time_range?: string;
  telop?: string;
  visual?: string;
  narration?: string;
}

const NarrationScriptTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();

  // 設定state
  const [composition, setComposition] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [seedInfo, setSeedInfo] = useState<NarrationScriptSeedInfo | null>(null);
  const [visualStyle, setVisualStyle] = useState<string | null>(null);
  const [toneManner, setToneManner] = useState<string | null>(null);
  const [visualStyleNotes, setVisualStyleNotes] = useState<string | null>(null);

  // ジョブstate
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<SpotAsset[]>([]);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  // sessionStorage seed 復元 (構成案ツールから引き継ぎ)
  useEffect(() => {
    const seedJson = sessionStorage.getItem('narration_script_seed');
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
            const head = `${s.part ?? ''}${s.time_range ? ` (${s.time_range})` : ''}`;
            const lines = [head];
            if (s.telop) lines.push(`テロップ: ${s.telop}`);
            if (s.visual) lines.push(`映像: ${s.visual}`);
            if (s.narration) lines.push(`ナレーション: ${s.narration}`);
            return lines.join('\n');
          })
          .join('\n\n');
        setComposition(text);
        setSeedInfo({
          from_tool: seed.from_tool,
          from_job_id: seed.from_job_id,
          scenes_preview: seed.scenes.length,
        });
      }
      if (seed.duration_seconds) setDuration(Number(seed.duration_seconds));
      if (seed.visual_style) setVisualStyle(String(seed.visual_style));
      if (seed.tone_manner) setToneManner(String(seed.tone_manner));
      if (seed.visual_style_notes) setVisualStyleNotes(String(seed.visual_style_notes));
      sessionStorage.removeItem('narration_script_seed');
      toast.info(`構成案 ${seed.scenes?.length ?? 0} シーンを引き継ぎました`);
    } catch (e) {
      console.error('failed to parse narration_script_seed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ジョブ復元 (URLクエリ ?job_id=xxx)
  const handleRestoreJob = useCallback(
    (jid: string, _projectId: string, inputData: Record<string, unknown>) => {
      setJobId(jid);
      if (inputData.composition) setComposition(String(inputData.composition));
      if (inputData.duration_seconds) setDuration(Number(inputData.duration_seconds));
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
      setComposition(text);
      toast.success('テキストを読み込みました');
      return;
    }
    if (file.name.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setComposition(result.value);
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
      toolTitle="NA原稿生成"
      toolDescription="構成案から尺に合わせたNA原稿(ナレーション原稿)を生成します"
      toolEmoji="📝"
      toolType={TOOL_TYPE}
      state={state}
      updateState={updateState}
      jobId={jobId}
      onRestoreJob={handleRestoreJob}
      renderSettings={({ context }) => {
        const handleGenerate = async () => {
          if (!state.projectId || !user || !composition.trim()) return;

          const scriptRules =
            context?.rules.filter((r) =>
              ['script', 'na_script', 'narration'].includes(r.process_type)
            ) ?? [];

          const { data: newJob, error: jobError } = await supabase
            .from('gen_spot_jobs')
            .insert({
              project_id: state.projectId,
              tool_type: TOOL_TYPE,
              input_data: { composition, duration_seconds: duration },
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
              copyright_text: context?.project.copyright_text ?? null,
              client_name: context?.project.product.client.name ?? null,
              product_name: context?.project.product.name ?? null,
              project_name: context?.project.name ?? null,
              rules: scriptRules.map((r) => ({
                id: r.id,
                description: r.description,
                severity: r.severity,
                process_type: r.process_type,
              })),
              correction_patterns: context?.corrections ?? [],
              visual_style: visualStyle,
              tone_manner: toneManner,
              visual_style_notes: visualStyleNotes,
            }),
          }).catch((e) => console.error('n8n webhook error:', e));

          toast.success('NA原稿の生成を開始しました');
        };

        return (
          <NarrationScriptSettings
            context={context}
            projectId={state.projectId}
            composition={composition}
            setComposition={setComposition}
            duration={duration}
            setDuration={setDuration}
            seedInfo={seedInfo}
            onGenerate={handleGenerate}
            isRunning={isRunning}
            onFileUpload={handleFileUpload}
          />
        );
      }}
      renderResult={({ context }) => (
        <NarrationScriptResult
          job={job}
          assets={assets}
          jobId={jobId}
          context={context}
          state={state}
          duration={duration}
          onStartNew={handleStartNew}
        />
      )}
    />
  );
};

export default NarrationScriptTool;
