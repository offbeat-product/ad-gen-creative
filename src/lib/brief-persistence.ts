import { supabase } from '@/integrations/supabase/client';
import type { BriefData } from '@/components/spot/BriefSection';

/**
 * 広告ブリーフを projects テーブルに永続保存する。
 * エラーがあっても呼び出し元の処理を止めないよう、必ず success フラグを返す。
 */
export async function saveBriefToProject(
  projectId: string | null | undefined,
  brief: BriefData
): Promise<{ success: boolean; error?: string }> {
  if (!projectId) return { success: false, error: 'projectId is empty' };
  try {
    const { error } = await supabase
      .from('projects')
      .update({
        ad_objective: brief.ad_objective || null,
        target_audience: brief.target_audience || null,
        target_insight: brief.target_insight || null,
        lp_url: brief.lp_url || null,
        lp_summary: brief.lp_summary || null,
        tone_preset: brief.tone_preset || null,
        differentiation: brief.differentiation || null,
        ng_words:
          brief.ng_words && brief.ng_words.length > 0 ? brief.ng_words : null,
        reference_creatives: brief.reference_creatives || null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', projectId);

    if (error) {
      console.error('[saveBriefToProject] Error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[saveBriefToProject] Exception:', err);
    return { success: false, error: message };
  }
}
