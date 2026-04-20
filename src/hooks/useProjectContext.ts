import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// -----------------------------------------------------------------------------
// 型定義
// -----------------------------------------------------------------------------

export type MaterialType =
  | 'pricing'
  | 'contract'
  | 'correction_history'
  | 'wcheck'
  | 'brand_guideline'
  | 'media_regulation'
  | 'legal_rule'
  | 'orientation'
  | 'client_shared_assets'
  | 'meeting_minutes'
  | string;

export type ProcessType =
  | 'video_vertical'
  | 'video_horizontal'
  | 'video_horizontal/video_vertical'
  | 'vcon'
  | 'styleframe'
  | 'storyboard'
  | 'banner_design'
  | 'script'
  | 'banner_draft'
  | 'na_script'
  | 'narration'
  | 'bgm'
  | string;

export interface ProjectWithContext {
  id: string;
  name: string;
  description: string | null;
  work_title: string | null;
  copyright_text: string | null;
  deadline: string | null;
  status: string | null;
  creative_type: string | null;
  video_duration_seconds: number | null;
  total_video_count: number | null;
  product: {
    id: string;
    name: string;
    rules_desc: string | null;
    color: string | null;
    frame_image_url: string | null;
    logo_image_url: string | null;
    default_bg_color: string | null;
    default_transition: string | null;
    default_display_sec: number | null;
    default_switch_sec: number | null;
    client: {
      id: string;
      name: string;
    };
  };
}

export interface CheckRule {
  id: string;
  rule_id: string;
  title: string | null;
  description: string;
  category: string;
  severity: string;
  process_type: ProcessType;
  is_active: boolean | null;
}

export interface ReferenceMaterial {
  id: string;
  title: string;
  material_type: MaterialType;
  source_type: string;
  source_url: string | null;
  file_name: string | null;
  file_data: string | null;
  content_text: string | null;
  scope_type: 'client' | 'product' | 'project';
  scope_id: string;
  sort_order: number;
}

export interface CorrectionPattern {
  id: string;
  [key: string]: unknown;
}

export interface ProjectContext {
  project: ProjectWithContext;
  rules: CheckRule[];
  materials: ReferenceMaterial[];
  corrections: CorrectionPattern[];
  stats: {
    rulesByProcessType: Record<string, number>;
    materialsByType: Record<string, number>;
    materialsByScope: Record<string, number>;
  };
}

// -----------------------------------------------------------------------------
// 内部ローダー
// -----------------------------------------------------------------------------

async function loadProjectContext(projectId: string): Promise<ProjectContext> {
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select(`
      id, name, description, work_title, copyright_text, deadline, status,
      creative_type, video_duration_seconds, total_video_count,
      product:products(
        id, name, color,
        frame_image_url, logo_image_url,
        default_bg_color, default_transition,
        default_display_sec, default_switch_sec,
        client:clients(id, name)
      )
    `)
    .eq('id', projectId)
    .single();

  if (pErr) throw new Error(`Failed to load project: ${pErr.message}`);
  if (!project) throw new Error('Project not found');
  if (!project.product) throw new Error('Product not linked to project');

  const productData = project.product as unknown as { id: string; client?: { id: string } };
  const productId = productData.id;
  const clientId = productData.client?.id;

  // reference_materials may not exist — guard in try/catch
  const materialsPromise = (async () => {
    try {
      const orFilter = [
        `and(scope_type.eq.project,scope_id.eq.${projectId})`,
        `and(scope_type.eq.product,scope_id.eq.${productId})`,
        clientId ? `and(scope_type.eq.client,scope_id.eq.${clientId})` : '',
      ]
        .filter(Boolean)
        .join(',');
      const { data, error } = await (supabase as any)
        .from('reference_materials')
        .select('*')
        .eq('is_active', true)
        .or(orFilter)
        .order('sort_order', { ascending: true });
      if (error) {
        console.error('[useProjectContext] materials error:', error);
        return [];
      }
      return data ?? [];
    } catch (e) {
      console.warn('[useProjectContext] reference_materials unavailable', e);
      return [];
    }
  })();

  // product_check_settings.rules_desc fetch (separate, optional)
  const rulesDescPromise = (async () => {
    try {
      const { data } = await supabase
        .from('product_check_settings')
        .select('rules_desc')
        .eq('product_id', productId)
        .maybeSingle();
      return data?.rules_desc ?? null;
    } catch {
      return null;
    }
  })();

  const [rulesRes, materialsData, correctionsRes, rulesDesc] = await Promise.all([
    supabase
      .from('check_rules')
      .select('id, rule_id, title, description, category, severity, process_type, is_active')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    materialsPromise,
    supabase.from('correction_patterns').select('*').eq('product_id', productId).limit(50),
    rulesDescPromise,
  ]);

  if (rulesRes.error) console.error('[useProjectContext] rules error:', rulesRes.error);
  if (correctionsRes.error) console.error('[useProjectContext] corrections error:', correctionsRes.error);

  const rules = (rulesRes.data ?? []) as CheckRule[];
  const materials = (materialsData ?? []) as ReferenceMaterial[];
  const corrections = (correctionsRes.data ?? []) as CorrectionPattern[];

  const rulesByProcessType: Record<string, number> = {};
  rules.forEach((r) => {
    rulesByProcessType[r.process_type] = (rulesByProcessType[r.process_type] ?? 0) + 1;
  });

  const materialsByType: Record<string, number> = {};
  const materialsByScope: Record<string, number> = {};
  materials.forEach((m) => {
    materialsByType[m.material_type] = (materialsByType[m.material_type] ?? 0) + 1;
    materialsByScope[m.scope_type] = (materialsByScope[m.scope_type] ?? 0) + 1;
  });

  const productOut = { ...(project.product as any), rules_desc: rulesDesc };

  return {
    project: { ...(project as any), product: productOut } as ProjectWithContext,
    rules,
    materials,
    corrections,
    stats: { rulesByProcessType, materialsByType, materialsByScope },
  };
}

// -----------------------------------------------------------------------------
// メインhook
// -----------------------------------------------------------------------------

export const useProjectContext = (projectId: string | null) => {
  const query = useQuery({
    queryKey: ['project-context', projectId],
    queryFn: () => loadProjectContext(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    context: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

// -----------------------------------------------------------------------------
// 補助hook
// -----------------------------------------------------------------------------

export const useProjectMaterials = (
  projectId: string | null,
  filter?: {
    materialType?: MaterialType | MaterialType[];
    scopeType?: 'client' | 'product' | 'project';
  }
) => {
  const { context, loading } = useProjectContext(projectId);
  let materials = context?.materials ?? [];

  if (filter?.materialType) {
    const types = Array.isArray(filter.materialType) ? filter.materialType : [filter.materialType];
    materials = materials.filter((m) => types.includes(m.material_type as MaterialType));
  }

  if (filter?.scopeType) {
    materials = materials.filter((m) => m.scope_type === filter.scopeType);
  }

  return { materials, loading };
};

export const useProjectRules = (
  projectId: string | null,
  processType?: ProcessType | ProcessType[]
) => {
  const { context, loading } = useProjectContext(projectId);
  let rules = context?.rules ?? [];

  if (processType) {
    const types = Array.isArray(processType) ? processType : [processType];
    rules = rules.filter((r) => types.some((t) => r.process_type === t || r.process_type.includes(t)));
  }

  return { rules, loading };
};
