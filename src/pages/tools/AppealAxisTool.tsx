import { useState, useEffect, useCallback } from 'react';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SpotToolWizard from '@/components/spot/SpotToolWizard';
import AppealAxisSettings from '@/components/spot/AppealAxisSettings';
import AppealAxisResult, {
  type SpotJob,
  type SpotAsset,
} from '@/components/spot/AppealAxisResult';
import { type BriefData, EMPTY_BRIEF } from '@/components/spot/BriefSection';
import { saveBriefAsNewVersion } from '@/lib/brief-persistence';

const N8N_WEBHOOK_URL =
  'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-appeal-axis-copy';

const TOOL_TYPE = 'appeal_axis_copy';

const AppealAxisTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();

  const [numAppealAxes, setNumAppealAxes] = useState(3);
  const [numCopies, setNumCopies] = useState(3);
  const [hint, setHint] = useState('');
  const [briefData, setBriefData] = useState<BriefData>(EMPTY_BRIEF);
  const [lpScrapedContent, setLpScrapedContent] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<SpotAsset[]>([]);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  const handleRestoreJob = useCallback(
    (jid: string, _projectId: string, inputData: Record<string, unknown>) => {
      setJobId(jid);
      if (inputData.num_appeal_axes) setNumAppealAxes(Number(inputData.num_appeal_axes));
      if (inputData.num_copies) setNumCopies(Number(inputData.num_copies));
      if (inputData.hint) setHint(String(inputData.hint));
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
      toolTitle="訴求軸・コピー生成"
      toolDescription="訴求軸とそれに紐づく台本コピーを複数パターン生成します"
      toolEmoji="✨"
      toolType={TOOL_TYPE}
      state={state}
      updateState={updateState}
      jobId={jobId}
      onRestoreJob={handleRestoreJob}
      renderSettings={({ context }) => {
        const relevantRules =
          context?.rules.filter((r) =>
            ['script', 'banner_draft', 'banner_design'].includes(r.process_type)
          ) ?? [];

        const handleGenerate = async () => {
          if (!state.projectId || !user) return;

          // 生成前に広告ブリーフを履歴へ保存(失敗してもブロックしない)
          await saveBriefAsNewVersion(
            state.projectId,
            briefData,
            'generation_trigger',
            '訴求軸・コピー生成時点のブリーフ'
          ).catch((e) => console.error('[AppealAxis] brief persist error:', e));

          const { data: newJob, error: jobError } = await supabase
            .from('gen_spot_jobs')
            .insert({
              project_id: state.projectId,
              tool_type: TOOL_TYPE,
              input_data: {
                num_appeal_axes: numAppealAxes,
                num_copies: numCopies,
                hint,
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
              num_appeal_axes: numAppealAxes,
              num_copies: numCopies,
              hint,
              brief: { ...briefData, lp_scraped_content: lpScrapedContent },
              copyright_text: context?.project.copyright_text ?? null,
              client_name: context?.project.product.client.name ?? null,
              product_name: context?.project.product.name ?? null,
              project_name: context?.project.name ?? null,
              rules: relevantRules.map((r) => ({
                id: r.id,
                description: r.description,
                severity: r.severity,
                process_type: r.process_type,
              })),
              correction_patterns: context?.corrections ?? [],
            }),
          }).catch((e) => console.error('n8n webhook error:', e));

          toast.success('訴求軸・コピーの生成を開始しました');
        };

        return (
          <AppealAxisSettings
            context={context}
            projectId={state.projectId}
            numAppealAxes={numAppealAxes}
            setNumAppealAxes={setNumAppealAxes}
            numCopies={numCopies}
            setNumCopies={setNumCopies}
            hint={hint}
            setHint={setHint}
            briefData={briefData}
            setBriefData={setBriefData}
            onLpScrapedContentLoaded={setLpScrapedContent}
            onGenerate={handleGenerate}
            isRunning={isRunning}
          />
        );
      }}
      renderResult={({ context }) => (
        <AppealAxisResult
          job={job}
          assets={assets}
          jobId={jobId}
          context={context}
          briefData={briefData}
          state={state}
          onStartNew={handleStartNew}
        />
      )}
    />
  );
};

export default AppealAxisTool;
