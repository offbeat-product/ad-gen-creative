import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type {
  BulkCompositionBatch,
  BulkCompositionJob,
  AppealAxisCopy,
} from '@/types/bulk-composition';

interface StartOptions {
  duration_seconds?: number;
  creative_type?: 'video' | 'banner';
  brief?: import('@/types/bulk-composition').BannerBrief;
  client_name?: string;
  product_name?: string;
  project_name?: string;
  copyright_text?: string;
  rules?: unknown[];
  correction_patterns?: unknown[];
  with_na_script?: boolean;
  with_storyboard_images?: boolean;
}

export function useBulkComposition(projectId: string) {
  const [currentBatch, setCurrentBatch] = useState<BulkCompositionBatch | null>(null);
  const [jobs, setJobs] = useState<BulkCompositionJob[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-navigate to result page when batch reaches a terminal status
  useEffect(() => {
    if (!currentBatch) return;
    const isTerminal =
      currentBatch.status === 'completed' ||
      currentBatch.status === 'partially_completed' ||
      currentBatch.status === 'failed';
    if (!isTerminal) return;
    if (location.pathname.includes('/bulk-result')) return;

    const timer = setTimeout(() => {
      navigate(
        `/tools/composition/bulk-result?project_id=${projectId}&batch_id=${currentBatch.id}`,
        { replace: true }
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [currentBatch?.status, currentBatch?.id, projectId, navigate, location.pathname, currentBatch]);

  const startBulkGeneration = useCallback(
    async (appealAxesCopies: AppealAxisCopy[], options: StartOptions = {}) => {
      setIsStarting(true);
      setError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error('認証されていません');

        const { data, error: fnError } = await supabase.functions.invoke(
          'start-bulk-composition',
          {
            body: {
              project_id: projectId,
              appeal_axes_copies: appealAxesCopies,
              duration_seconds: options.duration_seconds ?? 30,
              creative_type: options.creative_type ?? 'video',
              brief: options.brief,
              client_name: options.client_name,
              product_name: options.product_name,
              project_name: options.project_name,
              copyright_text: options.copyright_text,
              rules: options.rules ?? [],
              correction_patterns: options.correction_patterns ?? [],
              with_na_script: options.with_na_script ?? false,
              with_storyboard_images: options.with_storyboard_images ?? false,
            },
          }
        );

        if (fnError) throw new Error(fnError.message);
        if (!data?.bulk_batch_id) throw new Error('バッチIDが取得できませんでした');

        const { data: batch } = await supabase
          .from('bulk_composition_batches')
          .select('*')
          .eq('id', data.bulk_batch_id)
          .single();

        if (batch) setCurrentBatch(batch as unknown as BulkCompositionBatch);
        return data;
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        throw err;
      } finally {
        setIsStarting(false);
      }
    },
    [projectId]
  );

  // Realtime subscription for batch + jobs
  useEffect(() => {
    if (!currentBatch?.id) return;
    const batchId = currentBatch.id;
    const jobIds = currentBatch.spot_job_ids ?? [];

    const batchChannel = supabase
      .channel(`bulk_batch_${batchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bulk_composition_batches',
          filter: `id=eq.${batchId}`,
        },
        (payload) => {
          setCurrentBatch(payload.new as unknown as BulkCompositionBatch);
        }
      )
      .subscribe();

    const jobsChannel = supabase
      .channel(`bulk_jobs_${batchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gen_spot_jobs',
        },
        (payload) => {
          const updatedJob = payload.new as unknown as BulkCompositionJob | null;
          if (!updatedJob) return;
          // Match either by spot_job_ids (composition jobs) OR by input_data.bulk_batch_id
          // (covers chained narration_script + image_generation jobs).
          const inputData = (updatedJob.input_data ?? {}) as Record<string, unknown>;
          const matchesBatch =
            jobIds.includes(updatedJob.id) ||
            inputData.bulk_batch_id === batchId;
          if (!matchesBatch) return;
          setJobs((prev) => {
            const idx = prev.findIndex((j) => j.id === updatedJob.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updatedJob;
              return next;
            }
            return [...prev, updatedJob];
          });
        }
      )
      .subscribe();

    // Initial jobs fetch — composition + chained NA-script + storyboard image jobs
    (async () => {
      const composedQuery = supabase
        .from('gen_spot_jobs')
        .select('*')
        .eq('project_id', projectId)
        .contains('input_data', { bulk_batch_id: batchId })
        .order('created_at', { ascending: true });
      const { data: chainedJobs } = await composedQuery;

      let merged = (chainedJobs || []) as unknown as BulkCompositionJob[];

      // Fallback: also fetch by explicit IDs in case input_data.bulk_batch_id was not stored.
      if (jobIds.length > 0) {
        const { data: byIds } = await supabase
          .from('gen_spot_jobs')
          .select('*')
          .in('id', jobIds);
        if (byIds) {
          const seen = new Set(merged.map((j) => j.id));
          for (const j of byIds as unknown as BulkCompositionJob[]) {
            if (!seen.has(j.id)) merged.push(j);
          }
        }
      }

      merged = merged.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setJobs(merged);
    })();

    return () => {
      supabase.removeChannel(batchChannel);
      supabase.removeChannel(jobsChannel);
    };
  }, [currentBatch?.id, currentBatch?.spot_job_ids, projectId]);

  const resetBatch = useCallback(() => {
    setCurrentBatch(null);
    setJobs([]);
    setError(null);
  }, []);

  const totalDone =
    (currentBatch?.completed_count ?? 0) + (currentBatch?.failed_count ?? 0);
  const progress =
    currentBatch && currentBatch.total_count > 0
      ? Math.round((totalDone / currentBatch.total_count) * 100)
      : 0;

  return {
    currentBatch,
    jobs,
    isStarting,
    error,
    startBulkGeneration,
    resetBatch,
    isRunning: currentBatch?.status === 'running',
    isCompleted: currentBatch?.status === 'completed',
    isPartiallyCompleted: currentBatch?.status === 'partially_completed',
    isAllFinished: currentBatch ? currentBatch.status !== 'running' : false,
    progress,
  };
}
