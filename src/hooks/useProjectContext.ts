import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectWithContext {
  id: string;
  name: string;
  description: string | null;
  work_title: string | null;
  copyright_text: string | null;
  deadline: string | null;
  status: string | null;
  product: {
    id: string;
    name: string;
    rules_desc: string | null;
    color: string | null;
    frame_image_url?: string | null;
    logo_image_url?: string | null;
    default_bg_color?: string | null;
    default_transition?: string | null;
    default_display_sec?: number | null;
    default_switch_sec?: number | null;
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
  process_type: string;
  is_active: boolean | null;
}

export interface ReferenceMaterial {
  id: string;
  title: string;
  material_type: string;
  source_type: string;
  source_url: string | null;
  file_name: string | null;
  file_data: string | null;
  content_text: string | null;
  scope_type: string;
  scope_id: string;
}

export interface ProjectContext {
  project: ProjectWithContext;
  rules: CheckRule[];
  materials: ReferenceMaterial[];
  corrections: any[];
}

async function loadProjectContext(projectId: string): Promise<ProjectContext> {
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select(`
      id, name, description, work_title, copyright_text, deadline, status,
      product:products(
        id, name,
        color,
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

  const productId = (project.product as any).id;

  // reference_materials may not exist; guard with try/catch
  let materialsData: any[] = [];
  try {
    const { data, error } = await (supabase as any)
      .from('reference_materials')
      .select('*')
      .or(`and(scope_type.eq.project,scope_id.eq.${projectId}),and(scope_type.eq.product,scope_id.eq.${productId})`)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) console.error('materials error:', error);
    materialsData = data ?? [];
  } catch (e) {
    console.warn('reference_materials table unavailable', e);
  }

  const [rulesRes, correctionsRes] = await Promise.all([
    supabase
      .from('check_rules')
      .select('id, rule_id, title, description, category, severity, process_type, is_active')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('correction_patterns')
      .select('*')
      .eq('product_id', productId)
      .limit(50),
  ]);

  if (rulesRes.error) console.error('rules error:', rulesRes.error);
  if (correctionsRes.error) console.error('corrections error:', correctionsRes.error);

  // Attach rules_desc from product_check_settings if available
  let rulesDesc: string | null = null;
  try {
    const { data } = await supabase
      .from('product_check_settings')
      .select('rules_desc')
      .eq('product_id', productId)
      .maybeSingle();
    rulesDesc = data?.rules_desc ?? null;
  } catch (e) {
    // ignore
  }

  const productOut = { ...(project.product as any), rules_desc: rulesDesc };

  return {
    project: { ...(project as any), product: productOut } as ProjectWithContext,
    rules: (rulesRes.data ?? []) as CheckRule[],
    materials: materialsData as ReferenceMaterial[],
    corrections: (correctionsRes.data ?? []) as any[],
  };
}

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

export const useProjectMaterials = (projectId: string | null, materialType?: string) => {
  const { context, loading } = useProjectContext(projectId);
  const materials = context?.materials ?? [];
  const filtered = materialType
    ? materials.filter((m) => m.material_type === materialType)
    : materials;
  return { materials: filtered, loading };
};
