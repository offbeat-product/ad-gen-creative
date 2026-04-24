import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  Target,
  Layout,
  FileText,
  Mic,
  Music,
  Clapperboard,
  Image as ImageIcon,
  Film,
  Maximize2,
  CalendarIcon,
  AlertCircle,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE = 20;

const TOOL_LABELS: Record<string, { label: string; icon: typeof Target; path: string }> = {
  appeal_axis_copy: { label: '訴求軸・コピー生成', icon: Target, path: '/tools/appeal-axis' },
  composition: { label: '構成案・字コンテ生成', icon: Layout, path: '/tools/composition' },
  narration_script: { label: 'NA原稿生成', icon: FileText, path: '/tools/narration-script' },
  narration_audio: { label: 'ナレーション音声生成', icon: Mic, path: '/tools/narration-audio' },
  bgm_suggestion: { label: 'BGM提案', icon: Music, path: '/tools/bgm-suggestion' },
  vcon: { label: 'Vコン作成', icon: Clapperboard, path: '/tools/vcon' },
  image_generation: { label: '絵コンテ用画像生成', icon: ImageIcon, path: '/tools/image-generation' },
  banner_image: { label: 'バナー画像生成', icon: ImageIcon, path: '/tools/banner-image' },
  carousel_video: { label: 'カルーセル動画生成', icon: Film, path: '/tools/carousel-video' },
  video_resize: { label: '動画リサイズ', icon: Maximize2, path: '/tools/video-resize' },
};

interface ProjectRel {
  id: string;
  name: string | null;
  product: {
    id: string;
    name: string | null;
    client: { id: string; name: string | null } | null;
  } | null;
}

interface SpotJobRow {
  kind: 'job';
  id: string;
  tool_type: string;
  status: string | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  bulk_batch_id: string | null;
  project_id: string | null;
  project: ProjectRel | null;
}

interface BulkBatchRow {
  kind: 'batch';
  id: string;
  status: string | null;
  total_count: number;
  completed_count: number;
  failed_count: number;
  created_at: string | null;
  completed_at: string | null;
  project_id: string;
  project: ProjectRel | null;
}

type HistoryRow = SpotJobRow | BulkBatchRow;

interface ClientOption { id: string; name: string }
interface ProductOption { id: string; name: string; client_id: string | null }
interface ProjectOption { id: string; name: string; product_id: string | null }

function formatDateTime(iso: string | null) {
  if (!iso) return '-';
  return format(new Date(iso), 'MM/dd HH:mm');
}

function formatDuration(ms: number | null) {
  if (!ms || ms <= 0) return '-';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}分` : `${m}分${s}秒`;
}

function batchDurationMs(batch: BulkBatchRow): number | null {
  if (!batch.created_at || !batch.completed_at) return null;
  return new Date(batch.completed_at).getTime() - new Date(batch.created_at).getTime();
}

function StatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="text-success border-success/30 bg-success/5">完了</Badge>;
    case 'partially_completed':
      return <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5">一部完了</Badge>;
    case 'running':
    case 'pending':
      return <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5">生成中</Badge>;
    case 'failed':
      return <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">失敗</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="text-muted-foreground">キャンセル</Badge>;
    default:
      return <Badge variant="outline">{status ?? '-'}</Badge>;
  }
}

interface SummaryCardProps {
  label: string;
  value: number;
  Icon: typeof Sparkles;
  color: string;
  spin?: boolean;
}

const SummaryCard = ({ label, value, Icon, color, spin }: SummaryCardProps) => (
  <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
    <div className={cn('h-10 w-10 rounded-lg bg-muted flex items-center justify-center', color)}>
      <Icon className={cn('h-5 w-5', spin && 'animate-spin')} />
    </div>
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  </div>
);

const History = () => {
  const navigate = useNavigate();

  // Filter options
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Filters
  const [clientId, setClientId] = useState<string>('all');
  const [productId, setProductId] = useState<string>('all');
  const [projectId, setProjectId] = useState<string>('all');
  const [toolType, setToolType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Data
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // Error dialog
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  // Load filter master data
  useEffect(() => {
    (async () => {
      const [clientsRes, productsRes, projectsRes] = await Promise.all([
        supabase.from('clients').select('id, name').order('sort_order').order('name'),
        supabase.from('products').select('id, name, client_id').order('sort_order').order('name'),
        supabase.from('projects').select('id, name, product_id').order('created_at', { ascending: false }),
      ]);
      setClients(clientsRes.data ?? []);
      setProducts((productsRes.data ?? []) as ProductOption[]);
      setProjects((projectsRes.data ?? []) as ProjectOption[]);
    })();
  }, []);

  const filteredProducts = useMemo(
    () => (clientId === 'all' ? products : products.filter((p) => p.client_id === clientId)),
    [products, clientId],
  );

  const filteredProjects = useMemo(
    () => (productId === 'all' ? projects : projects.filter((p) => p.product_id === productId)),
    [projects, productId],
  );

  // Load jobs + bulk batches, then merge by created_at
  const loadJobs = async (reset: boolean) => {
    setLoading(true);
    const from = reset ? 0 : page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // ---- Spot jobs query
    let jobsQuery = supabase
      .from('gen_spot_jobs')
      .select(
        `id, tool_type, status, error_message, duration_ms, created_at, started_at, completed_at, project_id, input_data,
         project:projects(id, name, product:products(id, name, client:clients(id, name)))`,
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (toolType !== 'all') jobsQuery = jobsQuery.eq('tool_type', toolType);
    if (status !== 'all') jobsQuery = jobsQuery.eq('status', status);
    if (projectId !== 'all') jobsQuery = jobsQuery.eq('project_id', projectId);
    if (dateFrom) jobsQuery = jobsQuery.gte('created_at', dateFrom.toISOString());
    if (dateTo) {
      const toEnd = new Date(dateTo);
      toEnd.setHours(23, 59, 59, 999);
      jobsQuery = jobsQuery.lte('created_at', toEnd.toISOString());
    }

    // ---- Bulk batches query (only fetch when tool filter allows: 'all' or 'composition')
    const includeBatches = toolType === 'all' || toolType === 'composition';
    let batchesPromise:
      | Promise<{ data: unknown[] | null; error: unknown }>
      | null = null;

    if (includeBatches) {
      let batchQuery = supabase
        .from('bulk_composition_batches')
        .select(
          `id, status, total_count, completed_count, failed_count, created_at, completed_at, project_id,
           project:projects(id, name, product:products(id, name, client:clients(id, name)))`,
        )
        .order('created_at', { ascending: false })
        .range(0, from + PAGE_SIZE - 1); // Get all batches up to this point for proper merge

      // Map batch status filter
      if (status === 'completed') {
        batchQuery = batchQuery.in('status', ['completed', 'partially_completed']);
      } else if (status === 'running' || status === 'pending') {
        batchQuery = batchQuery.eq('status', 'running');
      } else if (status === 'failed') {
        batchQuery = batchQuery.eq('status', 'failed');
      }
      if (projectId !== 'all') batchQuery = batchQuery.eq('project_id', projectId);
      if (dateFrom) batchQuery = batchQuery.gte('created_at', dateFrom.toISOString());
      if (dateTo) {
        const toEnd = new Date(dateTo);
        toEnd.setHours(23, 59, 59, 999);
        batchQuery = batchQuery.lte('created_at', toEnd.toISOString());
      }
      batchesPromise = batchQuery as unknown as Promise<{ data: unknown[] | null; error: unknown }>;
    }

    const [jobsRes, batchesRes] = await Promise.all([
      jobsQuery,
      batchesPromise ?? Promise.resolve({ data: [], error: null }),
    ]);

    if (jobsRes.error) {
      console.error('History load error (jobs):', jobsRes.error);
      setLoading(false);
      return;
    }

    type JobRaw = Omit<SpotJobRow, 'kind' | 'bulk_batch_id'> & {
      input_data: { bulk_batch_id?: string } | null;
    };
    const jobsRaw = (jobsRes.data ?? []) as unknown as JobRaw[];
    let jobRows: SpotJobRow[] = jobsRaw.map((j) => ({
      kind: 'job',
      id: j.id,
      tool_type: j.tool_type,
      status: j.status,
      error_message: j.error_message,
      duration_ms: j.duration_ms,
      created_at: j.created_at,
      started_at: j.started_at,
      completed_at: j.completed_at,
      project_id: j.project_id,
      bulk_batch_id: j.input_data?.bulk_batch_id ?? null,
      project: j.project,
    }));

    let batchRows: BulkBatchRow[] = (
      (batchesRes.data ?? []) as unknown as Array<Omit<BulkBatchRow, 'kind'>>
    ).map((b) => ({ kind: 'batch', ...b }));

    // Client/Product filter (in-memory because of nested relations)
    if (clientId !== 'all') {
      jobRows = jobRows.filter((r) => r.project?.product?.client?.id === clientId);
      batchRows = batchRows.filter((r) => r.project?.product?.client?.id === clientId);
    }
    if (productId !== 'all') {
      jobRows = jobRows.filter((r) => r.project?.product?.id === productId);
      batchRows = batchRows.filter((r) => r.project?.product?.id === productId);
    }

    // Merge & sort by created_at desc
    const merged: HistoryRow[] = [...jobRows, ...batchRows].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    setHasMore((jobsRes.data ?? []).length === PAGE_SIZE);
    setRows(reset ? merged : [...rows, ...merged]);
    setLoading(false);
  };

  useEffect(() => {
    setPage(0);
    loadJobs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, productId, projectId, toolType, status, dateFrom, dateTo]);

  useEffect(() => {
    if (page === 0) return;
    loadJobs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Summary
  const summary = useMemo(() => {
    return {
      total: rows.length,
      completed: rows.filter((r) =>
        r.status === 'completed' || r.status === 'partially_completed',
      ).length,
      running: rows.filter((r) => r.status === 'running' || r.status === 'pending').length,
      failed: rows.filter((r) => r.status === 'failed').length,
    };
  }, [rows]);

  const handleRowClick = (row: HistoryRow) => {
    if (row.kind === 'batch') {
      navigate(
        `/tools/composition/bulk-result?project_id=${row.project_id}&batch_id=${row.id}`,
      );
      return;
    }
    if (row.status === 'failed') {
      setErrorDialog({ open: true, message: row.error_message ?? 'エラーの詳細はありません' });
      return;
    }
    const tool = TOOL_LABELS[row.tool_type];
    if (!tool) return;
    navigate(`${tool.path}?job_id=${row.id}`);
  };

  const handleViewBulkResult = (
    e: React.MouseEvent,
    row: SpotJobRow,
  ) => {
    e.stopPropagation();
    if (!row.bulk_batch_id || !row.project_id) return;
    navigate(
      `/tools/composition/bulk-result?project_id=${row.project_id}&batch_id=${row.bulk_batch_id}`,
    );
  };

  const resetFilters = () => {
    setClientId('all');
    setProductId('all');
    setProjectId('all');
    setToolType('all');
    setStatus('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <motion.div
      className="max-w-7xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">生成履歴</h1>
        <p className="text-sm text-muted-foreground">
          全ツールの生成履歴と一括生成バッチを確認できます
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="総生成数" value={summary.total} Icon={Sparkles} color="text-primary" />
        <SummaryCard label="完了" value={summary.completed} Icon={CheckCircle} color="text-success" />
        <SummaryCard label="生成中" value={summary.running} Icon={Loader2} color="text-warning" spin={summary.running > 0} />
        <SummaryCard label="失敗" value={summary.failed} Icon={XCircle} color="text-destructive" />
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <Select value={clientId} onValueChange={(v) => { setClientId(v); setProductId('all'); setProjectId('all'); }}>
            <SelectTrigger><SelectValue placeholder="クライアント" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべてのクライアント</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={productId} onValueChange={(v) => { setProductId(v); setProjectId('all'); }}>
            <SelectTrigger><SelectValue placeholder="商材" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての商材</SelectItem>
              {filteredProducts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger><SelectValue placeholder="案件" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての案件</SelectItem>
              {filteredProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={toolType} onValueChange={setToolType}>
            <SelectTrigger><SelectValue placeholder="ツール" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべてのツール</SelectItem>
              {Object.entries(TOOL_LABELS).map(([key, t]) => (
                <SelectItem key={key} value={key}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="ステータス" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="completed">完了</SelectItem>
              <SelectItem value="running">生成中</SelectItem>
              <SelectItem value="pending">待機中</SelectItem>
              <SelectItem value="failed">失敗</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('justify-start text-left font-normal', !dateFrom && !dateTo && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom || dateTo ? (
                  <span className="text-xs truncate">
                    {dateFrom ? format(dateFrom, 'MM/dd') : '...'} - {dateTo ? format(dateTo, 'MM/dd') : '...'}
                  </span>
                ) : (
                  <span>日付範囲</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">開始日</p>
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-0 pointer-events-auto" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">終了日</p>
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-0 pointer-events-auto" />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={resetFilters}>フィルタをリセット</Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">日時</TableHead>
                <TableHead className="whitespace-nowrap">クライアント</TableHead>
                <TableHead className="whitespace-nowrap">商材</TableHead>
                <TableHead className="whitespace-nowrap">案件</TableHead>
                <TableHead className="whitespace-nowrap">ツール</TableHead>
                <TableHead className="whitespace-nowrap">ステータス</TableHead>
                <TableHead className="whitespace-nowrap">生成時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    まだ生成履歴がありません
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  if (row.kind === 'batch') {
                    return (
                      <TableRow
                        key={`batch-${row.id}`}
                        className="cursor-pointer hover:bg-accent/40 bg-primary/5"
                        onClick={() => handleRowClick(row)}
                      >
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDateTime(row.created_at)}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate">
                          {row.project?.product?.client?.name ?? '-'}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate">
                          {row.project?.product?.name ?? '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {row.project?.name ?? '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <Layers className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm font-medium">構成案 一括生成</span>
                            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] py-0 px-1.5 h-4">
                              {row.completed_count}/{row.total_count}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={row.status} /></TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">
                          {formatDuration(batchDurationMs(row))}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const tool = TOOL_LABELS[row.tool_type];
                  const Icon = tool?.icon ?? Sparkles;
                  return (
                    <TableRow
                      key={`job-${row.id}`}
                      className="cursor-pointer hover:bg-accent/40"
                      onClick={() => handleRowClick(row)}
                    >
                      <TableCell className="text-muted-foreground whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{row.project?.product?.client?.name ?? '-'}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{row.project?.product?.name ?? '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{row.project?.name ?? '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Icon className="h-4 w-4 text-secondary shrink-0" />
                          <span className="text-sm">{tool?.label ?? row.tool_type}</span>
                          {row.bulk_batch_id && (
                            <button
                              type="button"
                              onClick={(e) => handleViewBulkResult(e, row)}
                              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
                              title="この一括バッチの結果を見る"
                            >
                              <Layers className="h-2.5 w-2.5" />
                              一括
                              <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={row.status} /></TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatDuration(row.duration_ms)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {hasMore && (
          <div className="border-t p-3 text-center">
            <Button variant="outline" size="sm" disabled={loading} onClick={() => setPage((p) => p + 1)}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              もっと読み込む
            </Button>
          </div>
        )}
      </div>

      {/* Error dialog */}
      <Dialog open={errorDialog.open} onOpenChange={(o) => setErrorDialog({ ...errorDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              エラー詳細
            </DialogTitle>
            <DialogDescription>このジョブは失敗しました</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-sm whitespace-pre-wrap break-all">
            {errorDialog.message}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default History;
