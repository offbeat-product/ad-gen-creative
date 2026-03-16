import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, FileText, UserPlus, CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

/* ─── Dummy data ─── */
interface HistoryRow {
  id: string;
  date: string;
  client: string;
  product: string;
  project: string;
  type: string;
  patterns: string;
  total: string;
  status: '完了' | '生成中' | '一部依頼中';
}

const historyData: HistoryRow[] = [
  { id: 'r1', date: '03/16 15:30', client: 'レバレジーズ', product: 'LevTech Rookie', project: 'EXPO 2026春', type: '動画30秒', patterns: 'A〜I × 2', total: '18本', status: '完了' },
  { id: 'r2', date: '03/16 14:00', client: 'Belmis', product: '着圧レギンス', project: '春キャンペーン', type: '静止画', patterns: 'A〜F × 3', total: '18本', status: '完了' },
  { id: 'r3', date: '03/15 16:45', client: 'コミックシーモア', product: 'コミックシーモア', project: '新刊プロモ', type: '動画15秒', patterns: 'A〜D × 1', total: '4本', status: '完了' },
  { id: 'r4', date: '03/15 11:20', client: 'レバレジーズ', product: 'LevTech Rookie', project: '通年リクルーティング', type: '静止画', patterns: 'A〜C × 4', total: '12本', status: '完了' },
  { id: 'r5', date: '03/14 09:00', client: 'TMD AGA', product: 'AGA治療', project: '春の抜け毛対策', type: '動画30秒', patterns: 'A〜C × 3', total: '9本', status: '完了' },
  { id: 'r6', date: '03/13 17:30', client: 'Belmis', product: '着圧レギンス', project: 'インスタ施策', type: '静止画', patterns: 'A〜D × 2', total: '8本', status: '完了' },
  { id: 'r7', date: '03/13 10:00', client: 'レバレジーズ', product: 'ハタラクティブ', project: '未経験者訴求', type: '動画30秒', patterns: 'A〜F × 2', total: '12本', status: '一部依頼中' },
  { id: 'r8', date: '03/12 15:00', client: 'コミックシーモア', product: 'コミックシーモア', project: '週末限定セール', type: '静止画', patterns: 'A〜C × 3', total: '9本', status: '完了' },
  { id: 'r9', date: '03/12 09:30', client: 'TMD AGA', product: 'FAGA治療', project: '女性向け訴求', type: '動画15秒', patterns: 'A〜C × 2', total: '6本', status: '完了' },
  { id: 'r10', date: '03/11 16:00', client: 'レバレジーズ', product: 'レバテックキャリア', project: '年収UP訴求', type: '動画30秒', patterns: 'A〜I × 2', total: '18本', status: '完了' },
  { id: 'r11', date: '03/11 11:00', client: 'Belmis', product: '着圧レギンス', project: 'YouTube施策', type: '動画60秒', patterns: 'A〜D × 2', total: '8本', status: '完了' },
  { id: 'r12', date: '03/10 14:00', client: 'TMD AGA', product: 'AGA治療', project: 'リスティング素材', type: '静止画', patterns: 'A〜F × 2', total: '12本', status: '完了' },
];

const statusConfig: Record<string, { className: string; pulse?: boolean }> = {
  '完了': { className: 'bg-success-wash text-success' },
  '生成中': { className: 'bg-secondary-wash text-secondary', pulse: true },
  '一部依頼中': { className: 'bg-warning-wash text-warning' },
};

const PAGE_SIZE = 10;

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

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

  const totalCreatives = historyData.reduce((sum, r) => sum + parseInt(r.total), 0);

  return (
    <motion.div className="max-w-7xl mx-auto space-y-6" initial="initial" animate="animate">
      <motion.h1 variants={fadeUp} className="text-2xl font-bold tracking-tight font-display">生成履歴</motion.h1>

      {/* Summary cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard icon={Sparkles} iconColor="text-secondary" label="今月の生成ジョブ数" value={`${historyData.length}件`} borderColor="border-secondary" />
        <SummaryCard icon={FileText} iconColor="text-primary" label="合計クリエイティブ数" value={`${totalCreatives}本`} borderColor="border-primary" />
        <SummaryCard icon={UserPlus} iconColor="text-warning" label="プロ依頼中" value="2件" borderColor="border-warning" />
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
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

        {/* Date from */}
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
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left p-3 font-medium">日時</th>
              <th className="text-left p-3 font-medium">クライアント</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">商材</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">案件</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">タイプ</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">パターン数</th>
              <th className="text-left p-3 font-medium">合計</th>
              <th className="text-left p-3 font-medium">ステータス</th>
              <th className="text-left p-3 font-medium">アクション</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => {
              const sc = statusConfig[row.status];
              return (
                <tr
                  key={row.id}
                  className="border-b last:border-0 hover:bg-primary-wash transition-colors cursor-pointer"
                  onClick={() => navigate(`/result/${row.id}`)}
                >
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{row.date}</td>
                  <td className="p-3 font-medium">{row.client}</td>
                  <td className="p-3 hidden sm:table-cell">{row.product}</td>
                  <td className="p-3 hidden md:table-cell">{row.project}</td>
                  <td className="p-3 hidden lg:table-cell">{row.type}</td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground">{row.patterns}</td>
                  <td className="p-3 tabular-nums">{row.total}</td>
                  <td className="p-3">
                    <Badge className={cn('text-xs', sc.className, sc.pulse && 'animate-pulse')}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/result/${row.id}`); }}
                    >
                      詳細
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>

      {/* Pagination */}
      <motion.div variants={fadeUp} className="flex items-center justify-center gap-4">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>前へ</Button>
        <span className="text-sm text-muted-foreground">{page} / {totalPages} ページ</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>次へ</Button>
      </motion.div>
    </motion.div>
  );
};

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

export default HistoryPage;
