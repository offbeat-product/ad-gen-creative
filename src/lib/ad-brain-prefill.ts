import { supabase } from '@/integrations/supabase/client';
import type { BriefData } from '@/components/spot/BriefSection';
import {
  formatCompetitors,
  type AdBrainBrief,
  type AdBrainContextResponse,
} from '@/hooks/useAdBrainContext';

interface ProductPrefillRow {
  competitors: unknown;
  usp: string | null;
  target_audience: string | null;
  lp_url: string | null;
  ng_words: string[] | null;
}

/**
 * Ad Brain の projects(brief) + products データから Step3 用の BriefData / hint を組み立てる。
 * - 既存値は上書きしない(空欄のフィールドのみ初期値投入)
 */
export async function buildPrefillFromAdBrain(
  ctx: AdBrainContextResponse,
  current: BriefData,
  currentHint: string
): Promise<{ brief: BriefData; hint: string }> {
  const brief: AdBrainBrief = ctx.project?.brief ?? {};
  const productId = ctx.product?.id;

  let product: ProductPrefillRow = {
    competitors: null,
    usp: null,
    target_audience: null,
    lp_url: null,
    ng_words: null,
  };
  if (productId) {
    const { data } = await supabase
      .from('products')
      .select('competitors, usp, target_audience, lp_url, ng_words')
      .eq('id', productId)
      .maybeSingle();
    if (data) product = data as unknown as ProductPrefillRow;
  }

  // ② ターゲット
  const target_audience =
    current.target_audience ||
    brief.target_audience ||
    product.target_audience ||
    '';

  // ④ LP URL
  const lp_url = current.lp_url || brief.lp_url || product.lp_url || '';

  // ④ LP内容サマリー: lp_info から整形
  let lp_summary = current.lp_summary || brief.lp_summary || '';
  if (!lp_summary && brief.lp_info) {
    const lp = brief.lp_info;
    const parts: string[] = [];
    if (lp.headline) parts.push(`【ヘッドライン】${lp.headline}`);
    if (lp.main_message) parts.push(`【メインメッセージ】${lp.main_message}`);
    if (lp.appeal_points && lp.appeal_points.length > 0) {
      parts.push(`【主要訴求】\n${lp.appeal_points.map((p) => `・${p}`).join('\n')}`);
    }
    if (lp.product_features && lp.product_features.length > 0) {
      parts.push(`【商品特徴】\n${lp.product_features.map((p) => `・${p}`).join('\n')}`);
    }
    if (lp.cta) parts.push(`【CTA】${lp.cta}`);
    lp_summary = parts.join('\n\n');
  }

  // ⑤ トンマナ: tone_manner_requests → custom 欄
  let tone_preset = current.tone_preset || '';
  if (!tone_preset && brief.tone_manner_requests && brief.tone_manner_requests.length > 0) {
    tone_preset = `custom:${brief.tone_manner_requests.join(', ')}`;
  }

  // ⑥ 競合・差別化ポイント
  let differentiation = current.differentiation || '';
  if (!differentiation) {
    const lines: string[] = [];
    if (product.competitors) lines.push(`競合: ${product.competitors}`);
    if (product.usp) lines.push(`強み: ${product.usp}`);
    if (lines.length > 0) differentiation = lines.join('\n');
  }

  // ⑦ NGワード
  let ng_words = current.ng_words;
  if (!ng_words || ng_words.length === 0) {
    const merged = [
      ...(brief.ng_words ?? []),
      ...(product.ng_words ?? []),
    ].filter((v, i, a) => v && a.indexOf(v) === i);
    if (merged.length > 0) ng_words = merged;
  }

  // ⑧ 参考クリエイティブ
  const reference_creatives =
    current.reference_creatives || brief.reference_creatives || '';

  const nextBrief: BriefData = {
    ad_objective: current.ad_objective || '', // ① プリフィルなし
    target_audience,
    target_insight: current.target_insight || '', // ③ プリフィルなし(セッション一時)
    lp_url,
    lp_summary,
    tone_preset,
    differentiation,
    ng_words: ng_words ?? [],
    reference_creatives,
  };

  // hint: appeal_requests
  let hint = currentHint;
  if (!hint && brief.appeal_requests && brief.appeal_requests.length > 0) {
    hint = brief.appeal_requests.map((a) => `・${a}`).join('\n');
  }

  return { brief: nextBrief, hint };
}
