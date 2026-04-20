import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Layout, FileText, Mic, Image as ImageIcon, Film, Maximize2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const tools: { path: string; label: string; Icon: typeof Target; description: string; comingSoon?: boolean }[] = [
  { path: '/tools/appeal-axis', label: '訴求軸・コピー生成', Icon: Target, description: 'LP URLや過去データから訴求軸・コピーを生成' },
  { path: '/tools/composition', label: '構成案・字コンテ生成', Icon: Layout, description: '訴求軸から構成案・字コンテを生成' },
  { path: '/tools/narration-script', label: 'NA原稿生成', Icon: FileText, description: '構成案からNA原稿を生成' },
  { path: '/tools/narration-audio', label: 'ナレーション音声生成', Icon: Mic, description: 'NA原稿から音声ファイルを生成' },
  { path: '/tools/image-generation', label: '絵コンテ用画像生成', Icon: ImageIcon, description: '字コンテから絵コンテ用の画像を生成' },
  { path: '/tools/banner-image', label: 'バナー画像生成', Icon: ImageIcon, description: '訴求軸からバナー画像を生成', comingSoon: true },
  { path: '/tools/carousel-video', label: 'カルーセル動画生成', Icon: Film, description: '原作イラストからカルーセル動画を生成', comingSoon: true },
  { path: '/tools/video-resize', label: '動画リサイズ', Icon: Maximize2, description: '横動画を縦動画・スクエアにリサイズ', comingSoon: true },
];

const toolLabelMap: Record<string, string> = {
  appeal_axis: '訴求軸・コピー生成',
  composition: '構成案・字コンテ生成',
  narration_script: 'NA原稿生成',
  narration_audio: 'ナレーション音声生成',
  image_generation: '絵コンテ用画像生成',
  banner_image: 'バナー画像生成',
  carousel_video: 'カルーセル動画生成',
  video_resize: '動画リサイズ',
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function formatToday() {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`;
}

function formatRelativeTime(iso: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

function formatDuration(ms: number | null) {
  if (!ms || ms <= 0) return '-';
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}秒`;
  return `${m}分${s}秒`;
}

interface JobRow {
  id: string;
  tool_type: string;
  status: string | null;
  created_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  project: {
    name: string | null;
    product: { name: string | null; client_id: string | null; client: { name: string | null } | null } | null;
  } | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const userName = user?.email?.split('@')[0] ?? '';
  const today = formatToday();

  const [runningJobs, setRunningJobs] = useState<JobRow[]>([]);
  const [recentJobs, setRecentJobs] = useState<JobRow[]>([]);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [avgDuration, setAvgDuration] = useState<string>('-');

  useEffect(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartISO = monthStart.toISOString();

    const sel = `id, tool_type, status, created_at, completed_at, duration_ms,
      project:projects(name, product:products(name, client_id, client:clients(name)))`;

    (async () => {
      const [runningRes, recentRes, monthlyRes, clientsRes, durationsRes] = await Promise.all([
        supabase.from('gen_spot_jobs').select(sel).in('status', ['pending', 'running']).order('created_at', { ascending: false }).limit(10),
        supabase.from('gen_spot_jobs').select(sel).eq('status', 'completed').order('completed_at', { ascending: false }).limit(10),
        supabase.from('gen_spot_jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', monthStartISO),
        supabase.from('gen_spot_jobs').select('project:projects(product:products(client_id))').gte('created_at', monthStartISO),
        supabase.from('gen_spot_jobs').select('duration_ms').eq('status', 'completed').gte('created_at', monthStartISO).not('duration_ms', 'is', null),
      ]);

      setRunningJobs((runningRes.data ?? []) as unknown as JobRow[]);
      setRecentJobs((recentRes.data ?? []) as unknown as JobRow[]);
      setMonthlyCount(monthlyRes.count ?? 0);

      const clientIds = new Set<string>();
      (clientsRes.data ?? []).forEach((row: any) => {
        const cid = row?.project?.product?.client_id;
        if (cid) clientIds.add(cid);
      });
      setClientCount(clientIds.size);

      const durations = (durationsRes.data ?? []).map((d: any) => d.duration_ms).filter((n: number) => n > 0);
      if (durations.length > 0) {
        const avg = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
        setAvgDuration(formatDuration(avg));
      } else {
        setAvgDuration('-');
      }
    })();
  }, []);

  return (
    <motion.div
      className="max-w-7xl mx-auto space-y-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section 1: Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">おかえりなさい、{userName}さん</h1>
        <p className="text-sm text-muted-foreground">本日 {today}</p>
      </div>

      {/* Section 2: Quick Start */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">何を生成しますか?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tools.map((tool) => (
            <Link
              key={tool.path}
              to={tool.path}
              className="group rounded-xl border bg-card p-4 hover:shadow-elevated hover:-translate-y-0.5 transition-all"
            >
              <tool.Icon className="h-6 w-6 text-secondary mb-2" />
              <div className="font-semibold text-sm">{tool.label}</div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{tool.description}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 3: Running + Monthly KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="md:col-span-2 rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">進行中のタスク</h2>
            <span className="text-xs text-muted-foreground">{runningJobs.length}件</span>
          </div>
          {runningJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">進行中のタスクはありません</p>
          ) : (
            <div className="space-y-2">
              {runningJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                  <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{toolLabelMap[job.tool_type] ?? job.tool_type}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {job.project?.product?.client?.name ?? '-'} / {job.project?.product?.name ?? '-'}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(job.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="font-semibold">今月の生成</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">生成数</div>
              <div className="text-2xl font-bold tabular-nums">{monthlyCount}件</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">稼働クライアント</div>
              <div className="text-2xl font-bold tabular-nums">{clientCount}社</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">平均生成時間</div>
              <div className="text-2xl font-bold tabular-nums">{avgDuration}</div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 4: Recent Generations */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold">最近の生成</h2>
          <Link to="/history" className="text-xs text-secondary hover:underline">すべて見る →</Link>
        </div>
        {recentJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground p-8 text-center">
            まだ生成履歴がありません。上の「何を生成しますか?」から始めてください。
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>クライアント</TableHead>
                <TableHead>商材</TableHead>
                <TableHead>ツール</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="text-muted-foreground">{formatDateTime(job.completed_at)}</TableCell>
                  <TableCell>{job.project?.product?.client?.name ?? '-'}</TableCell>
                  <TableCell>{job.project?.product?.name ?? '-'}</TableCell>
                  <TableCell>{toolLabelMap[job.tool_type] ?? job.tool_type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-success border-success/30">完了</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </motion.div>
  );
};

export default Dashboard;
