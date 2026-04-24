/**
 * 単体ツール用 pptx 生成ラッパー
 * 一括生成pptx関数(generateBulkVideoPptx / generateBulkBannerPptx)に
 * 「1パターンだけ」を渡して再利用する。
 */
import { supabase } from '@/integrations/supabase/client';
import { generateBulkVideoPptx } from './generate-bulk-video-pptx';
import { generateBulkBannerPptx } from './generate-bulk-banner-pptx';

export interface SinglePptxProjectMeta {
  client_name: string;
  product_name: string;
  project_name: string;
}

export interface SingleCompositionInput {
  jobId: string;
  appealAxis: string;
  copyText: string;
  duration: number;
  creativeType: 'video' | 'banner' | string;
  scenes: Array<{
    part: string;
    time_range?: string;
    telop?: string;
    visual?: string;
    narration?: string;
  }>;
  withStoryboardImages?: boolean;
}

export interface SingleNaScriptInput {
  jobId: string;
  duration: number;
  /** 同時に紐づく構成案ジョブID(あれば) */
  parentCompositionJobId?: string | null;
  /** 取得済みのNA sections (あれば) */
  sections?: Array<{ part: string; time_range?: string; text: string }>;
  fullScript?: string;
}

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const sanitizeFileName = (s: string) =>
  s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 80);

/**
 * 単体の構成案ジョブから pptx Blob を生成する
 */
export async function generateSingleCompositionPptx(
  input: SingleCompositionInput,
  projectMeta: SinglePptxProjectMeta
): Promise<Blob> {
  const isBanner = input.creativeType === 'banner';

  // 単体ジョブを batch 形式に詰める
  const batch = {
    id: `single-${input.jobId}`,
    duration_seconds: input.duration,
    with_storyboard_images: input.withStoryboardImages ?? false,
  };

  const compositionJobs = [
    {
      id: input.jobId,
      tool_type: 'composition',
      input_data: {
        appeal_axis: input.appealAxis,
        copy_text: input.copyText,
        duration_seconds: input.duration,
        creative_type: input.creativeType,
        bulk_index: 0,
      },
      output_data: {
        appeal_axis: input.appealAxis,
        copy_text: input.copyText,
        scenes: input.scenes,
      },
    },
  ];

  const meta = {
    ...projectMeta,
    appeal_axes_count: 1,
    copies_per_axis: 1,
  };

  if (isBanner) {
    return await generateBulkBannerPptx({
      batch,
      compositionJobs,
      meta: { ...meta, banner_type: 'デジタル静止画広告' },
    });
  }

  // 同じ project の NA原稿・絵コンテ画像ジョブを parent_composition_job_id で取得
  const { data: relatedJobs } = await supabase
    .from('gen_spot_jobs')
    .select('*')
    .in('tool_type', ['narration_script', 'image_generation'])
    .eq('status', 'completed');

  const naScriptJobs =
    (relatedJobs || []).filter(
      (j) =>
        j.tool_type === 'narration_script' &&
        (j.input_data as Record<string, unknown> | null)?.parent_composition_job_id ===
          input.jobId
    );

  const storyboardJobs =
    (relatedJobs || []).filter(
      (j) =>
        j.tool_type === 'image_generation' &&
        (j.input_data as Record<string, unknown> | null)?.parent_composition_job_id ===
          input.jobId &&
        (j.input_data as Record<string, unknown> | null)?.storyboard_kind === 'spot'
    );

  return await generateBulkVideoPptx({
    batch: { ...batch, with_storyboard_images: storyboardJobs.length > 0 },
    compositionJobs,
    naScriptJobs,
    storyboardJobs,
    meta,
  });
}

/**
 * 単体の NA原稿ジョブから pptx Blob を生成する
 * 対応する構成案ジョブがあれば構成案も含める
 */
export async function generateSingleNaScriptPptx(
  input: SingleNaScriptInput,
  projectMeta: SinglePptxProjectMeta
): Promise<Blob> {
  // 構成案ジョブを取得(あれば)
  let compositionJob: Record<string, unknown> | null = null;
  if (input.parentCompositionJobId) {
    const { data } = await supabase
      .from('gen_spot_jobs')
      .select('*')
      .eq('id', input.parentCompositionJobId)
      .maybeSingle();
    compositionJob = data as Record<string, unknown> | null;
  }

  const compInput = (compositionJob?.input_data ?? {}) as Record<string, unknown>;
  const compOutput = (compositionJob?.output_data ?? {}) as Record<string, unknown>;
  const scenes = ((compOutput.scenes ?? []) as unknown[]) as Array<{
    part: string;
    time_range?: string;
    telop?: string;
    visual?: string;
    narration?: string;
  }>;

  const appealAxis =
    (compInput.appeal_axis as string) ??
    (compOutput.appeal_axis as string) ??
    '';
  const copyText =
    (compInput.copy_text as string) ?? (compOutput.copy_text as string) ?? '';

  const batch = {
    id: `single-na-${input.jobId}`,
    duration_seconds: input.duration,
    with_storyboard_images: false,
  };

  const compositionJobs = [
    {
      id: compositionJob?.id ?? `placeholder-${input.jobId}`,
      tool_type: 'composition',
      input_data: {
        appeal_axis: appealAxis,
        copy_text: copyText,
        duration_seconds: input.duration,
        creative_type: 'video',
        bulk_index: 0,
      },
      output_data: {
        appeal_axis: appealAxis,
        copy_text: copyText,
        scenes,
      },
    },
  ];

  const naScriptJobs = [
    {
      id: input.jobId,
      tool_type: 'narration_script',
      input_data: {
        parent_composition_job_id: compositionJobs[0].id,
      },
      output_data: {
        sections: input.sections ?? [],
        full_script: input.fullScript ?? '',
      },
    },
  ];

  return await generateBulkVideoPptx({
    batch,
    compositionJobs,
    naScriptJobs,
    storyboardJobs: [],
    meta: {
      ...projectMeta,
      appeal_axes_count: 1,
      copies_per_axis: 1,
    },
  });
}
