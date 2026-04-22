import { supabase } from '@/integrations/supabase/client';
import type { BriefData } from '@/components/spot/BriefSection';

export type { BriefData };

export type BriefSource =
  | 'ai_autogen'
  | 'manual_edit'
  | 'generation_trigger'
  | 'restore';

export interface BriefHistoryItem {
  id: string;
  project_id: string;
  ad_objective: string | null;
  target_audience: string | null;
  target_insight: string | null;
  lp_url: string | null;
  lp_summary: string | null;
  tone_preset: string | null;
  differentiation: string | null;
  ng_words: string[] | null;
  reference_creatives: string | null;
  hint: string | null;
  source: BriefSource;
  is_current: boolean;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

/**
 * 広告ブリーフを新しいバージョンとして履歴保存(INSERT)。
 * 同時に projects テーブルの最新スナップショットも更新する。
 * DBトリガーが他レコードの is_current を自動で false にする想定。
 */
export async function saveBriefAsNewVersion(
  projectId: string | null | undefined,
  brief: BriefData,
  source: BriefSource,
  note?: string
): Promise<{ success: boolean; error?: string; briefId?: string }> {
  if (!projectId) return { success: false, error: 'projectId is empty' };
  try {
    const { data: userRes } = await supabase.auth.getUser();

    const payload = {
      project_id: projectId,
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
      hint: (brief as BriefData & { hint?: string }).hint || null,
      source,
      is_current: true,
      note: note || null,
      created_by: userRes.user?.id || null,
    };

    const { data, error } = await supabase
      .from('project_briefs')
      .insert(payload as never)
      .select('id')
      .single();

    if (error) {
      console.error('[saveBriefAsNewVersion] Error:', error);
      return { success: false, error: error.message };
    }

    // projects テーブルにも最新内容を反映(既存UI互換)
    await supabase
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

    return { success: true, briefId: (data as { id?: string } | null)?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[saveBriefAsNewVersion] Exception:', err);
    return { success: false, error: message };
  }
}

/**
 * 後方互換用ラッパー: 既存呼び出し箇所を壊さないために残す。
 * 内部で saveBriefAsNewVersion('generation_trigger') を呼ぶ。
 */
export async function saveBriefToProject(
  projectId: string | null | undefined,
  brief: BriefData
): Promise<{ success: boolean; error?: string }> {
  return saveBriefAsNewVersion(projectId, brief, 'generation_trigger');
}

/**
 * 最新の有効ブリーフ(is_current=true)を取得。
 * project_briefs に無ければ projects テーブルからフォールバック取得。
 */
export async function loadCurrentBrief(
  projectId: string | null | undefined
): Promise<BriefData | null> {
  if (!projectId) return null;
  try {
    const { data, error } = await supabase
      .from('project_briefs')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .maybeSingle();

    if (error) {
      console.error('[loadCurrentBrief] Error:', error);
    }

    if (data) {
      const d = data as unknown as BriefHistoryItem;
      return {
        ad_objective: d.ad_objective ?? '',
        target_audience: d.target_audience ?? '',
        target_insight: d.target_insight ?? '',
        lp_url: d.lp_url ?? '',
        lp_summary: d.lp_summary ?? '',
        tone_preset: d.tone_preset ?? '',
        differentiation: d.differentiation ?? '',
        ng_words: d.ng_words ?? [],
        reference_creatives: d.reference_creatives ?? '',
      };
    }

    // フォールバック: projects テーブル
    const { data: projectData } = await supabase
      .from('projects')
      .select(
        'ad_objective, target_audience, target_insight, lp_url, lp_summary, tone_preset, differentiation, ng_words, reference_creatives'
      )
      .eq('id', projectId)
      .maybeSingle();

    if (!projectData) return null;
    const p = projectData as Record<string, unknown>;
    return {
      ad_objective: (p.ad_objective as string) ?? '',
      target_audience: (p.target_audience as string) ?? '',
      target_insight: (p.target_insight as string) ?? '',
      lp_url: (p.lp_url as string) ?? '',
      lp_summary: (p.lp_summary as string) ?? '',
      tone_preset: (p.tone_preset as string) ?? '',
      differentiation: (p.differentiation as string) ?? '',
      ng_words: (p.ng_words as string[]) ?? [],
      reference_creatives: (p.reference_creatives as string) ?? '',
    };
  } catch (err) {
    console.error('[loadCurrentBrief] Exception:', err);
    return null;
  }
}

/**
 * 案件のブリーフ履歴一覧を新しい順で取得。
 */
export async function loadBriefHistory(
  projectId: string | null | undefined,
  limit: number = 20
): Promise<BriefHistoryItem[]> {
  if (!projectId) return [];
  try {
    const { data, error } = await supabase
      .from('project_briefs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[loadBriefHistory] Error:', error);
      return [];
    }
    return (data ?? []) as unknown as BriefHistoryItem[];
  } catch (err) {
    console.error('[loadBriefHistory] Exception:', err);
    return [];
  }
}

/**
 * 過去のブリーフを「現在版」として復元。
 * 復元時は新規レコードとして source='restore' で INSERT。
 */
export async function restoreBriefFromHistory(
  projectId: string,
  briefHistoryItemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: source, error: fetchError } = await supabase
      .from('project_briefs')
      .select('*')
      .eq('id', briefHistoryItemId)
      .single();

    if (fetchError || !source) {
      return { success: false, error: 'Source brief not found' };
    }

    const s = source as unknown as BriefHistoryItem;
    return await saveBriefAsNewVersion(
      projectId,
      {
        ad_objective: s.ad_objective ?? '',
        target_audience: s.target_audience ?? '',
        target_insight: s.target_insight ?? '',
        lp_url: s.lp_url ?? '',
        lp_summary: s.lp_summary ?? '',
        tone_preset: s.tone_preset ?? '',
        differentiation: s.differentiation ?? '',
        ng_words: s.ng_words ?? [],
        reference_creatives: s.reference_creatives ?? '',
      },
      'restore',
      `履歴から復元: ${new Date(s.created_at).toLocaleString('ja-JP')}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return { success: false, error: message };
  }
}
