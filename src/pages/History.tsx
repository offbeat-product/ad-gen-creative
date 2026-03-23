import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText, UserPlus, CalendarIcon, Image, Video, X, Loader2, PlayCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/* ─── Step progress logic ─── */

const VIDEO_STEPS = [
  'appeal_axis', 'copy', 'composition', 'narration_script',
  'narration_audio', 'bgm_suggestion', 'vcon', 'styleframe',
  'storyboard', 'video_horizontal', 'video_vertical',
];

const IMAGE_STEPS = [
  'appeal_axis', 'copy', 'design_concept', 'layout', 'banner',
];

const STEP_LABELS: Record<string, string> = {
  appeal_axis: '訴求軸作成',
  copy: 'コピー作成',
  composition: '構成案・字コンテ作成',
  narration_script: 'NA原稿作成',
  narration_audio: 'ナレーション作成',
  bgm_suggestion: 'BGM提案',
  vcon: 'Vコン作成',
  styleframe: 'スタイルフレーム作成',
  storyboard: '絵コンテ作成',
  video_horizontal: '横動画作成',
  video_vertical: '縦動画・リサイズ',
  design_concept: 'デザインコンセプト',
  layout: 'レイアウト作成',
  banner: '静止画バナー作成',
};

type JobProgressStatus = 'completed' | 'in_progress' | 'not_started';

interface JobProgress {
  lastCompletedStep: string | null;
  nextStep: string | null;
  status: JobProgressStatus;
  completedCount: number;
  totalSteps: number;
}

const getJobProgress = (
  creativeType: string,
  steps: Array<{ step_key: string; status: string }>,
  patterns?: Array<{ narration_audio_url: string | null }>,
): JobProgress => {
  const allSteps = creativeType === 'video' ? VIDEO_STEPS : IMAGE_STEPS;
  const totalSteps = allSteps.length;

  let completedCount = 0;
  let lastCompleted: string | null = null;
  let nextStep: string | null = null;

  for (const stepKey of allSteps) {
    let isDone = false;
    if (stepKey === 'narration_audio') {
      // ナレーション作成はgen_patternsのnarration_audio_urlの有無で判定
      isDone = (patterns ?? []).some(p => !!p.narration_audio_url);
    } else {
      const step = steps.find(s => s.step_key === stepKey);
      isDone = step?.status === 'completed' || step?.status === 'skipped';
    }

    if (isDone) {
      completedCount++;
      lastCompleted = stepKey;
    } else {
      if (!nextStep) nextStep = stepKey;
    }
  }

  let status: JobProgressStatus;
  if (completedCount === totalSteps) {
    status = 'completed';
  } else if (completedCount > 0) {
    status = 'in_progress';
  } else {
    status = 'not_started';
  }

  return { lastCompletedStep: lastCompleted, nextStep, status, completedCount, totalSteps };
};

/* ─── Types ─── */
interface HistoryRow {
  id: string;
  date: string;
  client: string;
  product: string;
  project: string;
  type: string;
  patterns: string;
  total: string;
  totalNum: number;
  status: '完了' | '生成中' | '未開始';
  progress: JobProgress;
}

const statusConfig: Record<string, { className: string; pulse?: boolean }> = {
  '完了': { className: 'bg-success-wash text-success' },
  '生成中': { className: 'bg-warning-wash text-warning', pulse: true },
  '未開始': { className: 'bg-muted text-muted-foreground' },
};

const PAGE_SIZE = 10;

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

/* ─── Map gen_jobs row to HistoryRow ─── */
const mapJobToRow = (job: any): HistoryRow => {
  const createdAt = job.created_at ? new Date(job.created_at) : new Date();
  const clientName = job.projects?.products?.clients?.name ?? '—';
  const productName = job.projects?.products?.name ?? '—';
  const projectName = job.projects?.name ?? '—';
  const isVideo = job.creative_type === 'video';
  const typeLabel = isVideo ? `動画${job.duration_seconds ?? 30}秒` : '静止画';
  const axes = job.num_appeal_axes ?? 3;
  const copies = job.num_copies ?? 3;
  const tones = job.num_tonmana ?? 2;
  const totalPatterns = job.total_patterns || axes * copies * tones;

  const steps = (job.gen_steps ?? []) as Array<{ step_key: string; status: string }>;
  const patternsForAudio = (job.gen_patterns ?? []) as Array<{ narration_audio_url: string | null }>;
  const progress = getJobProgress(job.creative_type, steps, patternsForAudio);

  let statusLabel: HistoryRow['status'];
  if (progress.status === 'completed') statusLabel = '完了';
  else if (progress.status === 'in_progress') statusLabel = '生成中';
  else statusLabel = '未開始';

  return {
    id: job.id,
    date: format(createdAt, 'MM/dd HH:mm'),
    client: clientName,
    product: productName,
    project: projectName,
    type: typeLabel,
    patterns: `${axes * copies}パターン × ${tones}`,
    total: `${totalPatterns}本`,
    totalNum: totalPatterns,
    status: statusLabel,
    progress,
  };
};

/* ─── Reusable sub-components ─── */

function SummaryCard({ icon: Icon, iconColor, label, value, borderColor }: {
  icon: React.ElementType; iconColor: string; label: string; value: string; borderColor: string;
}) {
  return (
    <div className={`bg-card rounded-xl border-l-4 ${borderColor} p-6 shadow-subtle`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <span className="text-3xl font-bold tabular-nums">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const sc = statusConfig[status];
  if (!sc) return null;
  return <Badge className={cn('text-xs', sc.className, sc.pulse && 'animate-pulse')}>{status}</Badge>;
}

/* ─── Progress cell for table rows ─── */

function ProgressCell({ row, navigate }: { row: HistoryRow; navigate: (path: string) => void }) {
  const { progress } = row;
  const pct = Math.round((progress.completedCount / progress.totalSteps) * 100);

  if (progress.status === 'completed') {
    return (
      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/result/${row.id}`); }}>
        結果を見る
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex-1 min-w-[80px]">
        <Progress value={pct} className="h-2" />
        <span className="text-[10px] text-muted-foreground mt-0.5 block">
          {progress.completedCount}/{progress.totalSteps}工程
          {progress.nextStep && ` • 次: ${STEP_LABELS[progress.nextStep]}`}
        </span>
      </div>
      <Button
        variant="brand" size="sm" className="whitespace-nowrap text-xs px-3 h-7"
        onClick={() => navigate(`/generate/progress?job_id=${row.id}`)}
      >
        {progress.status === 'not_started' ? '開始' : '再開'}
        <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}

/* ─── Table Components ─── */

function HistoryTableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="border-b text-muted-foreground">
        {columns.map((col) => (
          <th key={col} className="text-left p-3 font-medium text-sm">{col}</th>
        ))}
      </tr>
    </thead>
  );
}

function HistoryTableRow({ row, columns, navigate }: { row: HistoryRow; columns: string[]; navigate: (path: string) => void }) {
  const handleRowClick = () => {
    if (row.progress.status === 'completed') {
      navigate(`/result/${row.id}`);
    } else {
      navigate(`/generate/progress?job_id=${row.id}`);
    }
  };

  const cellMap: Record<string, React.ReactNode> = {
    '日時': <span className="text-muted-foreground whitespace-nowrap">{row.date}</span>,
    'クライアント': <span className="font-medium">{row.client}</span>,
    '商材': row.product,
    '案件': row.project,
    'タイプ': row.type,
    'パターン数': <span className="text-muted-foreground">{row.patterns}</span>,
    '合計本数': <span className="tabular-nums">{row.total}</span>,
    'ステータス': <StatusBadge status={row.status} />,
    '進捗': <ProgressCell row={row} navigate={navigate} />,
  };

  return (
    <tr
      className="border-b last:border-0 hover:bg-primary-wash transition-colors cursor-pointer"
      onClick={handleRowClick}
    >
      {columns.map((col) => (
        <td key={col} className="p-3 text-sm">{cellMap[col]}</td>
      ))}
    </tr>
  );
}

function MiniTable({ rows, columns, navigate }: { rows: HistoryRow[]; columns: string[]; navigate: (path: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <HistoryTableHead columns={columns} />
        <tbody>
          {rows.map((row) => (
            <HistoryTableRow key={row.id} row={row} columns={columns} navigate={navigate} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Grouped Views ─── */

function GroupedByClient({ data, navigate }: { data: HistoryRow[]; navigate: (path: string) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, HistoryRow[]>();
    data.forEach(r => {
      if (!map.has(r.client)) map.set(r.client, []);
      map.get(r.client)!.push(r);
    });
    return Array.from(map.entries());
  }, [data]);

  const [expanded, setExpanded] = useState<string | null>(groups[0]?.[0] ?? null);
  const columns = ['日時', '商材', '案件', 'タイプ', 'パターン数', 'ステータス', '進捗'];

  return (
    <div className="space-y-2 mt-4">
      {groups.map(([client, rows]) => {
        const totalItems = rows.reduce((s, r) => s + r.totalNum, 0);
        return (
          <Collapsible key={client} open={expanded === client} onOpenChange={() => setExpanded(expanded === client ? null : client)}>
            <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors">
              {expanded === client ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <span className="font-semibold">{client}</span>
              <span className="ml-auto text-sm text-muted-foreground">{rows.length}件 / 合計{totalItems}本</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="p-2">
                <MiniTable rows={rows} columns={columns} navigate={navigate} />
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

function GroupedByProduct({ data, navigate }: { data: HistoryRow[]; navigate: (path: string) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, { client: string; rows: HistoryRow[] }>();
    data.forEach(r => {
      if (!map.has(r.product)) map.set(r.product, { client: r.client, rows: [] });
      map.get(r.product)!.rows.push(r);
    });
    return Array.from(map.entries());
  }, [data]);

  const [expanded, setExpanded] = useState<string | null>(groups[0]?.[0] ?? null);
  const columns = ['日時', '案件', 'タイプ', 'パターン数', 'ステータス', '進捗'];

  return (
    <div className="space-y-2 mt-4">
      {groups.map(([product, { client, rows }]) => {
        const totalItems = rows.reduce((s, r) => s + r.totalNum, 0);
        return (
          <Collapsible key={product} open={expanded === product} onOpenChange={() => setExpanded(expanded === product ? null : product)}>
            <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors">
              {expanded === product ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <span className="font-semibold">{product}</span>
              <span className="text-xs text-muted-foreground">（{client}）</span>
              <span className="ml-auto text-sm text-muted-foreground">{rows.length}件 / 合計{totalItems}本</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="p-2">
                <MiniTable rows={rows} columns={columns} navigate={navigate} />
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

function GroupedByProject({ data, navigate }: { data: HistoryRow[]; navigate: (path: string) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, { client: string; product: string; rows: HistoryRow[] }>();
    data.forEach(r => {
      if (!map.has(r.project)) map.set(r.project, { client: r.client, product: r.product, rows: [] });
      map.get(r.project)!.rows.push(r);
    });
    return Array.from(map.entries());
  }, [data]);

  const [expanded, setExpanded] = useState<string | null>(groups[0]?.[0] ?? null);
  const columns = ['日時', 'タイプ', 'パターン数', 'ステータス', '進捗'];

  return (
    <div className="space-y-2 mt-4">
      {groups.map(([project, { client, product, rows }]) => {
        const totalItems = rows.reduce((s, r) => s + r.totalNum, 0);
        return (
          <Collapsible key={project} open={expanded === project} onOpenChange={() => setExpanded(expanded === project ? null : project)}>
            <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors">
              {expanded === project ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <span className="font-semibold">{project}</span>
              <span className="text-xs text-muted-foreground">（{client} &gt; {product}）</span>
              <span className="ml-auto text-sm text-muted-foreground">{rows.length}件 / 合計{totalItems}本</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="p-2">
                <MiniTable rows={rows} columns={columns} navigate={navigate} />
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

function GroupedByType({ data, navigate }: { data: HistoryRow[]; navigate: (path: string) => void }) {
  const groups = useMemo(() => {
    const order = ['静止画', '動画15秒', '動画30秒', '動画60秒'];
    const map = new Map<string, HistoryRow[]>();
    order.forEach(t => map.set(t, []));
    data.forEach(r => {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    });
    return Array.from(map.entries()).filter(([, rows]) => rows.length > 0);
  }, [data]);

  const columns = ['日時', 'クライアント', '商材', '案件', 'パターン数', 'ステータス', '進捗'];

  const typeIcon = (type: string) => {
    if (type === '静止画') return <Image className="h-4 w-4 text-muted-foreground" />;
    return <Video className="h-4 w-4 text-muted-foreground" />;
  };

  const typeBadge = (type: string) => {
    if (type.includes('15')) return '15s';
    if (type.includes('30')) return '30s';
    if (type.includes('60')) return '60s';
    return null;
  };

  return (
    <div className="space-y-8 mt-4">
      {groups.map(([type, rows]) => {
        const totalItems = rows.reduce((s, r) => s + r.totalNum, 0);
        const badge = typeBadge(type);
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-3">
              {typeIcon(type)}
              <h3 className="text-base font-semibold font-display">{type === '静止画' ? '静止画バナー' : type}</h3>
              {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
              <span className="text-sm text-muted-foreground ml-2">（{rows.length}件 / 合計{totalItems}本）</span>
            </div>
            <MiniTable rows={rows} columns={columns} navigate={navigate} />
          </div>
        );
      })}
    </div>
  );
}

/* ─── Empty State ─── */

function EmptyHistory({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Sparkles className="h-16 w-16 text-secondary/30 mb-4" />
      <h2 className="text-xl font-bold font-display mb-2">まだ生成履歴がありません</h2>
      <p className="text-sm text-muted-foreground mb-6">新規生成を開始してクリエイティブを作成しましょう。</p>
      <Button variant="brand" onClick={() => navigate('/generate')}>
        <Sparkles className="h-4 w-4 mr-2" />
        新規生成を開始する
      </Button>
    </div>
  );
}

/* ─── Main Component ─── */

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [clientFilter, setClientFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [page, setPage] = useState(1);

  // Fetch gen_jobs with gen_steps from Supabase
  useEffect(() => {
    if (!user) return;
    const fetchJobs = async () => {
      setLoading(true);
      const { data: jobs, error } = await supabase
        .from('gen_jobs')
        .select(`
          *,
          projects (
            name,
            products (
              name,
              clients (
                name
              )
            )
          ),
          gen_steps (
            step_key,
            status
          ),
          gen_patterns (
            narration_audio_url
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch gen_jobs:', error);
        setHistoryData([]);
      } else {
        setHistoryData((jobs ?? []).map(mapJobToRow));
      }
      setLoading(false);
    };
    fetchJobs();
  }, [user]);

  // Unique client names for filter
  const clientNames = useMemo(() => Array.from(new Set(historyData.map(r => r.client).filter(c => c !== '—'))), [historyData]);
  const typeNames = useMemo(() => Array.from(new Set(historyData.map(r => r.type))), [historyData]);

  const filtered = useMemo(() => {
    return historyData.filter(r => {
      if (clientFilter !== 'all' && r.client !== clientFilter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [historyData, clientFilter, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setClientFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  };

  const totalCreatives = historyData.reduce((sum, r) => sum + r.totalNum, 0);
  const allColumns = ['日時', 'クライアント', '商材', '案件', 'タイプ', 'ステータス', '進捗'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-secondary animate-spin" />
      </div>
    );
  }

  if (historyData.length === 0) {
    return (
      <motion.div className="max-w-7xl mx-auto space-y-6" initial="initial" animate="animate">
        <motion.h1 variants={fadeUp} className="text-2xl font-bold tracking-tight font-display">生成履歴</motion.h1>
        <EmptyHistory navigate={navigate} />
      </motion.div>
    );
  }

  return (
    <motion.div className="max-w-7xl mx-auto space-y-6" initial="initial" animate="animate">
      <motion.h1 variants={fadeUp} className="text-2xl font-bold tracking-tight font-display">生成履歴</motion.h1>

      {/* Summary cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard icon={Sparkles} iconColor="text-secondary" label="生成ジョブ数" value={`${historyData.length}件`} borderColor="border-secondary" />
        <SummaryCard icon={FileText} iconColor="text-primary" label="合計クリエイティブ数" value={`${totalCreatives}本`} borderColor="border-primary" />
        <SummaryCard icon={UserPlus} iconColor="text-warning" label="生成中" value={`${historyData.filter(r => r.status === '生成中').length}件`} borderColor="border-warning" />
      </motion.div>

      {/* Grouping Tabs */}
      <motion.div variants={fadeUp}>
        <Tabs defaultValue="list">
          <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 mb-4">
            <TabsList className="w-max">
              <TabsTrigger value="list">一覧表示</TabsTrigger>
              <TabsTrigger value="client">クライアント別</TabsTrigger>
              <TabsTrigger value="product">商材別</TabsTrigger>
              <TabsTrigger value="project">案件別</TabsTrigger>
              <TabsTrigger value="type">生成タイプ別</TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: List view */}
          <TabsContent value="list">
            <AnimatePresence mode="wait">
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                  <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[140px] sm:w-[180px]"><SelectValue placeholder="クライアント" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全て</SelectItem>
                      {clientNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="タイプ" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全て</SelectItem>
                      {typeNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="ステータス" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全て</SelectItem>
                      <SelectItem value="完了">完了</SelectItem>
                      <SelectItem value="生成中">生成中</SelectItem>
                      <SelectItem value="未開始">未開始</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-[130px] justify-start", !dateFrom && "text-muted-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                        {dateFrom ? format(dateFrom, 'MM/dd') : 'From'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground text-sm">〜</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-[130px] justify-start", !dateTo && "text-muted-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                        {dateTo ? format(dateTo, 'MM/dd') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>

                  <button onClick={resetFilters} className="text-sm text-secondary hover:underline">フィルターをリセット</button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border bg-card">
                  <table className="w-full text-sm">
                    <HistoryTableHead columns={allColumns} />
                    <tbody>
                      {paged.map((row) => (
                        <HistoryTableRow key={row.id} row={row} columns={allColumns} navigate={navigate} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>前へ</Button>
                  <span className="text-sm text-muted-foreground">{page} / {totalPages} ページ</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>次へ</Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="client">
            <AnimatePresence mode="wait">
              <motion.div key="client" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <GroupedByClient data={historyData} navigate={navigate} />
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="product">
            <AnimatePresence mode="wait">
              <motion.div key="product" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <GroupedByProduct data={historyData} navigate={navigate} />
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="project">
            <AnimatePresence mode="wait">
              <motion.div key="project" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <GroupedByProject data={historyData} navigate={navigate} />
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="type">
            <AnimatePresence mode="wait">
              <motion.div key="type" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <GroupedByType data={historyData} navigate={navigate} />
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

export default HistoryPage;
