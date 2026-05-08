import { useQuery } from '@tanstack/react-query';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export interface LpInfo {
  headline?: string | null;
  main_message?: string | null;
  sub_messages?: string[] | null;
  appeal_points?: string[] | null;
  product_features?: string[] | null;
  differentiation_points?: string[] | null;
  social_proof?: string[] | null;
  cta?: string | null;
  target_audience_inferred?: string | null;
  [k: string]: unknown;
}

export interface AdBrainBrief {
  ad_objective?: string | null;
  target_audience?: string | null;
  lp_url?: string | null;
  lp_summary?: string | null;
  ng_words?: string[] | null;
  reference_creatives?: string | null;
  appeal_requests?: string[] | null;
  tone_manner_requests?: string[] | null;
  lp_info?: LpInfo | null;
  ad_purposes?: string[] | null;
  ad_purpose_note?: string | null;
  compositions_count?: number | null;
  tone_manners_count?: number | null;
}

export interface AdBrainCompetitor {
  name: string;
  description?: string | null;
}

export interface AdBrainProduct {
  id: string;
  name: string;
  applicable_laws?: string[];
  rules_count: number;
  materials_count: number;
  /** v2.6: 配列(オブジェクト)に変更。後方互換で string も許容 */
  competitors?: AdBrainCompetitor[] | string | null;
  usp?: string | null;
  target_audience?: string | null;
  lp_url?: string | null;
  ng_words?: string[] | null;
  price_range?: string | null;
  industry_category?: string | null;
  description?: string | null;
}

export interface AdBrainContextResponse {
  project_id: string;
  schema_version: string;
  client: { id: string; name: string; rules_count: number; materials_count: number };
  product: AdBrainProduct;
  project: {
    id: string;
    name: string;
    rules_count: number;
    materials_count: number;
    master_media_codes?: string[];
    brief?: AdBrainBrief;
  };
  master_regulations?: { laws_count: number; media_count: number };
  statistics: {
    total_rules: number;
    total_materials: number;
    materials_with_empty_content: number;
    master_laws_count: number;
    master_media_count: number;
  };
  ai_rule_filter?: { applied: boolean };
  generated_at: string;
}

async function fetchAdBrainContext(projectId: string): Promise<AdBrainContextResponse> {
  const url = `${SUPABASE_URL}/functions/v1/ad-brain-context?project_id=${projectId}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
  });
  if (!res.ok) throw new Error(`ad-brain-context HTTP ${res.status}`);
  return (await res.json()) as AdBrainContextResponse;
}

export function useAdBrainContext(projectId: string | null) {
  const q = useQuery({
    queryKey: ['ad-brain-context', projectId],
    queryFn: () => fetchAdBrainContext(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });
  return { data: q.data ?? null, loading: q.isLoading, error: q.error, refetch: q.refetch };
}

/** 競合(配列 or 文字列)を表示用文字列へ整形(共通ユーティリティ) */
export function formatCompetitors(competitors: unknown): string {
  if (!competitors) return '';
  if (typeof competitors === 'string') return competitors;
  if (Array.isArray(competitors)) {
    return competitors
      .map((c) => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object' && 'name' in (c as Record<string, unknown>)) {
          const obj = c as { name?: string; description?: string };
          return obj.description ? `${obj.name}(${obj.description})` : obj.name ?? '';
        }
        return String(c);
      })
      .filter(Boolean)
      .join('、');
  }
  return String(competitors);
}
