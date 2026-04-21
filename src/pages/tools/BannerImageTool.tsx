import { useState, useEffect, useCallback } from 'react';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SpotToolWizard from '@/components/spot/SpotToolWizard';
import BannerImageSettings, {
  type BannerSize,
  PRESET_SIZES,
} from '@/components/spot/BannerImageSettings';
import BannerImageResult, {
  type SpotJob,
  type BannerAsset,
} from '@/components/spot/BannerImageResult';

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-banner-image';
const TOOL_TYPE = 'banner_image';

const BannerImageTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();

  const [mainCopy, setMainCopy] = useState('');
  const [subCopy, setSubCopy] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [appealPoint, setAppealPoint] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [creativeStyle, setCreativeStyle] = useState<string>('photographic');
  const [selectedSizes, setSelectedSizes] = useState<BannerSize[]>([
    PRESET_SIZES[0],
    PRESET_SIZES[1],
  ]);
  const [variationsPerSize, setVariationsPerSize] = useState<number>(3);
  const [burnText, setBurnText] = useState<boolean>(true);
  const [outputPng, setOutputPng] = useState<boolean>(true);
  const [outputPsd, setOutputPsd] = useState<boolean>(true);

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<BannerAsset[]>([]);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  const handleRestoreJob = useCallback(
    (jid: string, _projectId: string, inputData: Record<string, unknown>) => {
      setJobId(jid);
      if (inputData.main_copy) setMainCopy(String(inputData.main_copy));
      if (inputData.sub_copy) setSubCopy(String(inputData.sub_copy));
      if (inputData.cta_text) setCtaText(String(inputData.cta_text));
      if (inputData.appeal_point) setAppealPoint(String(inputData.appeal_point));
      if (inputData.target_audience) setTargetAudience(String(inputData.target_audience));
      if (inputData.creative_style) setCreativeStyle(String(inputData.creative_style));
      if (Array.isArray(inputData.sizes)) setSelectedSizes(inputData.sizes as BannerSize[]);
      if (inputData.variations_per_size)
        setVariationsPerSize(Number(inputData.variations_per_size));
      if (typeof inputData.burn_text === 'boolean') setBurnText(inputData.burn_text);
      if (typeof inputData.output_png === 'boolean') setOutputPng(inputData.output_png);
      if (typeof inputData.output_psd === 'boolean') setOutputPsd(inputData.output_psd);
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
          .eq('asset_type', 'banner')
          .order('sort_order'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as BannerAsset[]);
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
      toolTitle="バナー画像生成"
      toolDescription="複数サイズ × 複数バリエーションのバナー画像を一括生成します"
      toolEmoji="🖼️"
      toolType={TOOL_TYPE}
      state={state}
      updateState={updateState}
      jobId={jobId}
      onRestoreJob={handleRestoreJob}
      renderSettings={({ context }) => {
        const handleGenerate = async () => {
          if (!state.projectId || !user || !mainCopy.trim() || selectedSizes.length === 0) return;

          const bannerRules =
            context?.rules.filter((r) =>
              ['banner_draft', 'banner_design'].includes(r.process_type)
            ) ?? [];

          const insertPayload = {
            project_id: state.projectId,
            tool_type: TOOL_TYPE,
            input_data: {
              main_copy: mainCopy,
              sub_copy: subCopy,
              cta_text: ctaText,
              appeal_point: appealPoint,
              target_audience: targetAudience,
              creative_style: creativeStyle,
              sizes: selectedSizes,
              variations_per_size: variationsPerSize,
              burn_text: burnText,
              output_png: outputPng,
              output_psd: outputPsd,
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
              main_copy: mainCopy,
              sub_copy: subCopy,
              cta_text: ctaText,
              appeal_point: appealPoint,
              target_audience: targetAudience,
              creative_style: creativeStyle,
              sizes: selectedSizes,
              variations_per_size: variationsPerSize,
              burn_text: burnText,
              output_png: outputPng,
              output_psd: outputPsd,
              copyright_text: context?.project.copyright_text ?? null,
              client_name: context?.project.product.client.name ?? null,
              product_name: context?.project.product.name ?? null,
              project_name: context?.project.name ?? null,
              rules: bannerRules.map((r) => ({
                id: r.id,
                description: r.description,
                severity: r.severity,
                process_type: r.process_type,
              })),
              correction_patterns: context?.corrections ?? [],
            }),
          }).catch((e) => console.error('n8n webhook error:', e));

          const totalCount = selectedSizes.length * variationsPerSize;
          toast.success(`${totalCount}枚のバナー生成を開始しました`);
        };

        return (
          <BannerImageSettings
            context={context}
            projectId={state.projectId}
            mainCopy={mainCopy}
            setMainCopy={setMainCopy}
            subCopy={subCopy}
            setSubCopy={setSubCopy}
            ctaText={ctaText}
            setCtaText={setCtaText}
            appealPoint={appealPoint}
            setAppealPoint={setAppealPoint}
            targetAudience={targetAudience}
            setTargetAudience={setTargetAudience}
            creativeStyle={creativeStyle}
            setCreativeStyle={setCreativeStyle}
            selectedSizes={selectedSizes}
            setSelectedSizes={setSelectedSizes}
            variationsPerSize={variationsPerSize}
            setVariationsPerSize={setVariationsPerSize}
            burnText={burnText}
            setBurnText={setBurnText}
            outputPng={outputPng}
            setOutputPng={setOutputPng}
            outputPsd={outputPsd}
            setOutputPsd={setOutputPsd}
            onGenerate={handleGenerate}
            isRunning={isRunning}
          />
        );
      }}
      renderResult={({ context }) => (
        <BannerImageResult
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

export default BannerImageTool;
