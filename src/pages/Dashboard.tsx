import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Building2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const recentGenerations = [
  { date: '03/16 15:30', client: 'レバレジーズ', product: 'LevTech Rookie', type: '動画30秒', count: '6本', status: '完了' },
  { date: '03/16 14:00', client: 'Belmis', product: '着圧レギンス', type: '静止画バナー', count: '18本', status: '完了' },
  { date: '03/15 16:45', client: 'コミックシーモア', product: 'コミックシーモア', type: '動画15秒', count: '4本', status: '完了' },
  { date: '03/15 11:20', client: 'レバレジーズ', product: 'LevTech Rookie', type: '静止画バナー', count: '12本', status: '完了' },
  { date: '03/14 09:00', client: 'TMD AGA', product: 'AGA治療', type: '動画30秒', count: '9本', status: '完了' },
];

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.2, 0, 0, 1] as const } },
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userName = user?.email?.split('@')[0] ?? '';

  return (
    <motion.div className="max-w-7xl mx-auto space-y-8" variants={stagger} initial="initial" animate="animate">
      {/* Welcome */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight font-display">ようこそ、{userName}さん</h1>
        <Button variant="brand" size="lg" onClick={() => navigate('/generate')}>
          <Sparkles className="h-5 w-5" />
          新規生成を開始する
        </Button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard icon={Sparkles} iconColor="text-secondary" label="今月の生成数" value="24件" sub="+8件 ↑" subColor="text-success" borderColor="border-secondary" />
        <SummaryCard icon={Building2} iconColor="text-primary" label="稼働クライアント数" value="4社" borderColor="border-primary" />
        <SummaryCard icon={Clock} iconColor="text-warning" label="平均生成時間" value="2分30秒" borderColor="border-warning" />
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-semibold font-display mb-4">最近の生成</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left p-3 font-medium">日時</th>
                <th className="text-left p-3 font-medium">クライアント</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">商材</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">タイプ</th>
                <th className="text-left p-3 font-medium">本数</th>
                <th className="text-left p-3 font-medium">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {recentGenerations.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-accent/50 transition-colors cursor-pointer">
                  <td className="p-3 text-muted-foreground">{row.date}</td>
                  <td className="p-3 font-medium">{row.client}</td>
                  <td className="p-3 hidden sm:table-cell">{row.product}</td>
                  <td className="p-3 hidden md:table-cell">{row.type}</td>
                  <td className="p-3 tabular-nums">{row.count}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-success-wash px-2 py-0.5 text-xs font-medium text-success">{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

function SummaryCard({ icon: Icon, iconColor, label, value, sub, subColor, borderColor }: {
  icon: React.ElementType; iconColor: string; label: string; value: string;
  sub?: string; subColor?: string; borderColor: string;
}) {
  return (
    <div className={`bg-card rounded-xl border-l-4 ${borderColor} p-6 shadow-subtle`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">{value}</span>
        {sub && <span className={`text-sm font-medium ${subColor}`}>{sub}</span>}
      </div>
    </div>
  );
}

export default Dashboard;
