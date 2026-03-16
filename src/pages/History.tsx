import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText, UserPlus, CalendarIcon, Image, Video, X } from 'lucide-react';
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

/* ─── Types & Data ─── */
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
  status: '完了' | '生成中' | '一部依頼中';
}

const historyData: HistoryRow[] = [
  { id: 'r1', date: '03/16 15:30', client: 'レバレジーズ', product: 'LevTech Rookie', project: 'EXPO 2026春', type: '動画30秒', patterns: 'A〜I × 2', total: '18本', totalNum: 18, status: '完了' },
  { id: 'r2', date: '03/16 14:00', client: 'Belmis', product: '着圧レギンス', project: '春キャンペーン', type: '静止画', patterns: 'A〜F × 3', total: '18本', totalNum: 18, status: '完了' },
  { id: 'r3', date: '03/15 16:45', client: 'コミックシーモア', product: 'コミックシーモア', project: '新刊プロモ', type: '動画15秒', patterns: 'A〜D × 1', total: '4本', totalNum: 4, status: '完了' },
  { id: 'r4', date: '03/15 11:20', client: 'レバレジーズ', product: 'LevTech Rookie', project: '通年リクルーティング', type: '静止画', patterns: 'A〜C × 4', total: '12本', totalNum: 12, status: '完了' },
  { id: 'r5', date: '03/14 09:00', client: 'TMD AGA', product: 'AGA治療', project: '春の抜け毛対策', type: '動画30秒', patterns: 'A〜C × 3', total: '9本', totalNum: 9, status: '完了' },
  { id: 'r6', date: '03/13 17:30', client: 'Belmis', product: '着圧レギンス', project: 'インスタ施策', type: '静止画', patterns: 'A〜D × 2', total: '8本', totalNum: 8, status: '完了' },
  { id: 'r7', date: '03/13 10:00', client: 'レバレジーズ', product: 'ハタラクティブ', project: '未経験者訴求', type: '動画30秒', patterns: 'A〜F × 2', total: '12本', totalNum: 12, status: '一部依頼中' },
  { id: 'r8', date: '03/12 15:00', client: 'コミックシーモア', product: 'コミックシーモア', project: '週末限定セール', type: '静止画', patterns: 'A〜C × 3', total: '9本', totalNum: 9, status: '完了' },
  { id: 'r9', date: '03/12 09:30', client: 'TMD AGA', product: 'FAGA治療', project: '女性向け訴求', type: '動画15秒', patterns: 'A〜C × 2', total: '6本', totalNum: 6, status: '完了' },
  { id: 'r10', date: '03/11 16:00', client: 'レバレジーズ', product: 'レバテックキャリア', project: '年収UP訴求', type: '動画30秒', patterns: 'A〜I × 2', total: '18本', totalNum: 18, status: '完了' },
  { id: 'r11', date: '03/11 11:00', client: 'Belmis', product: '着圧レギンス', project: 'YouTube施策', type: '動画60秒', patterns: 'A〜D × 2', total: '8本', totalNum: 8, status: '完了' },
  { id: 'r12', date: '03/10 14:00', client: 'TMD AGA', product: 'AGA治療', project: 'リスティング素材', type: '静止画', patterns: 'A〜F × 2', total: '12本', totalNum: 12, status: '完了' },
];

const statusConfig: Record<string, { className: string; pulse?: boolean }> = {
  '完了': { className: 'bg-success-wash text-success' },
  '生成中': { className: 'bg-secondary-wash text-secondary', pulse: true },
  '一部依頼中': { className: 'bg-warning-wash text-warning' },
};

const clientIndustry: Record<string, { label: string; className: string }> = {
  'レバレジーズ': { label: '人材・IT', className: 'bg-primary-wash text-primary' },
  'Belmis': { label: 'D2C・美容', className: 'bg-secondary-wash text-secondary' },
  'コミックシーモア': { label: 'エンタメ', className: 'bg-success-wash text-success' },
  'TMD AGA': { label: '医療', className: 'bg-warning-wash text-warning' },
};

const PAGE_SIZE = 10;

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
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
  const cellMap: Record<string, React.ReactNode> = {
    '日時': <span className="text-muted-foreground whitespace-nowrap">{row.date}</span>,
    'クライアント': <span className="font-medium">{row.client}</span>,
    '商材': row.product,
    '案件': row.project,
    'タイプ': row.type,
    'パターン数': <span className="text-muted-foreground">{row.patterns}</span>,
    '合計本数': <span className="tabular-nums">{row.total}</span>,
    'ステータス': <StatusBadge status={row.status} />,
    'アクション': (
      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/result/${row.id}`); }}>
        詳細
      </Button>
    ),
  };

  return (
    <tr
      className="border-b last:border-0 hover:bg-primary-wash transition-colors cursor-pointer"
      onClick={() => navigate(`/result/${row.id}`)}
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

function GroupedByClient({ navigate }: { navigate: (path: string) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, HistoryRow[]>();
    historyData.forEach(r => {
      if (!map.has(r.client)) map.set(r.client, []);
      map.get(r.client)!.push(r);
    });
    return Array.from(map.entries());
  }, []);

  const [expanded, setExpanded] = useState<string | null>(groups[0]?.[0] ?? null);
  const columns = ['日時', '商材', '案件', 'タイプ', 'パターン数', '合計本数', 'ステータス'];

  return (
    <div className="space-y-2 mt-4">
      {groups.map(([client, rows]) => {
        const totalItems = rows.reduce((s, r) => s + r.totalNum, 0);
        const ind = clientIndustry[client];
        return (
          <Collapsible key={client} open={expanded === client} onOpenChange={() => setExpanded(expanded === client ? null : client)}>
            <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors">
              {expanded === client ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <span className="font-semibold">{client}</span>
              {ind && <Badge className={cn('text-xs', ind.className)}>{ind.label}</Badge>}
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

function GroupedByProduct({ navigate }: { navigate: (path: string) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, { client: string; rows: HistoryRow[] }>();
    historyData.forEach(r => {
      if (!map.has(r.product)) map.set(r.product, { client: r.client, rows: [] });
      map.get(r.product)!.rows.push(r);
    });
    return Array.from(map.entries());
  }, []);

  const [expanded, setExpanded] = useState<string | null>(groups[0]?.[0] ?? null);
  const columns = ['日時', '案件', 'タイプ', 'パターン数', '合計本数', 'ステータス'];

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

function GroupedByProject({ navigate }: { navigate: (path: string) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, { client: string; product: string; rows: HistoryRow[] }>();
    historyData.forEach(r => {
      if (!map.has(r.project)) map.set(r.project, { client: r.client, product: r.product, rows: [] });
      map.get(r.project)!.rows.push(r);
    });
    return Array.from(map.entries());
  }, []);

  const [expanded, setExpanded] = useState<string | null>(groups[0]?.[0] ?? null);
  const columns = ['日時', 'タイプ', 'パターン数', '合計本数', 'ステータス'];

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

function GroupedByType({ navigate }: { navigate: (path: string) => void }) {
  const groups = useMemo(() => {
    const order = ['静止画', '動画15秒', '動画30秒', '動画60秒'];
    const map = new Map<string, HistoryRow[]>();
    order.forEach(t => map.set(t, []));
    historyData.forEach(r => {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    });
    return Array.from(map.entries()).filter(([, rows]) => rows.length > 0);
  }, []);

  const columns = ['日時', 'クライアント', '商材', '案件', 'パターン数', '合計本数', 'ステータス'];

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

/* ─── Main Component ─── */

const HistoryPage = () => {
  const navigate = useNavigate();
  const [clientFilter, setClientFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return historyData.filter(r => {
      if (clientFilter !== 'all' && r.client !== clientFilter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [clientFilter, typeFilter, statusFilter]);

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
  const allColumns = ['日時', 'クライアント', '商材', '案件', 'タイプ', 'パターン数', '合計本数', 'ステータス', 'アクション'];

  return (
    <motion.div className="max-w-7xl mx-auto space-y-6" initial="initial" animate="animate">
      <motion.h1 variants={fadeUp} className="text-2xl font-bold tracking-tight font-display">生成履歴</motion.h1>

      {/* Summary cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard icon={Sparkles} iconColor="text-secondary" label="今月の生成ジョブ数" value={`${historyData.length}件`} borderColor="border-secondary" />
        <SummaryCard icon={FileText} iconColor="text-primary" label="合計クリエイティブ数" value={`${totalCreatives}本`} borderColor="border-primary" />
        <SummaryCard icon={UserPlus} iconColor="text-warning" label="プロ依頼中" value="2件" borderColor="border-warning" />
      </motion.div>

      {/* Grouping Tabs */}
      <motion.div variants={fadeUp}>
        <Tabs defaultValue="list">
          <TabsList className="mb-4">
            <TabsTrigger value="list">一覧表示</TabsTrigger>
            <TabsTrigger value="client">クライアント別</TabsTrigger>
            <TabsTrigger value="product">商材別</TabsTrigger>
            <TabsTrigger value="project">案件別</TabsTrigger>
            <TabsTrigger value="type">生成タイプ別</TabsTrigger>
          </TabsList>

          {/* Tab 1: List view */}
          <TabsContent value="list">
            <AnimatePresence mode="wait">
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="クライアント" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全て</SelectItem>
                      <SelectItem value="レバレジーズ">レバレジーズ</SelectItem>
                      <SelectItem value="Belmis">Belmis</SelectItem>
                      <SelectItem value="コミックシーモア">コミックシーモア</SelectItem>
                      <SelectItem value="TMD AGA">TMD AGA</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="タイプ" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全て</SelectItem>
                      <SelectItem value="静止画">静止画バナー</SelectItem>
                      <SelectItem value="動画15秒">動画15秒</SelectItem>
                      <SelectItem value="動画30秒">動画30秒</SelectItem>
                      <SelectItem value="動画60秒">動画60秒</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="ステータス" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全て</SelectItem>
                      <SelectItem value="完了">完了</SelectItem>
                      <SelectItem value="生成中">生成中</SelectItem>
                      <SelectItem value="一部依頼中">一部依頼中</SelectItem>
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

          {/* Tab 2: By Client */}
          <TabsContent value="client">
            <AnimatePresence mode="wait">
              <motion.div key="client" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <GroupedByClient navigate={navigate} />
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* Tab 3: By Product */}
          <TabsContent value="product">
            <AnimatePresence mode="wait">
              <motion.div key="product" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <GroupedByProduct navigate={navigate} />
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* Tab 4: By Project */}
          <TabsContent value="project">
            <AnimatePresence mode="wait">
              <motion.div key="project" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <GroupedByProject navigate={navigate} />
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* Tab 5: By Type */}
          <TabsContent value="type">
            <AnimatePresence mode="wait">
              <motion.div key="type" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <GroupedByType navigate={navigate} />
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

export default HistoryPage;
