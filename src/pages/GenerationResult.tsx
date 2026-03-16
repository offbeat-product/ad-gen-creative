import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, ShieldCheck, Share2, Play, Image, MoreHorizontal,
  Target, Type, Film, FileText, Mic, Music, PenTool, Monitor, Smartphone,
  LayoutTemplate, Palette, ChevronDown, ChevronRight, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

/* ─── Constants ─── */
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const APPEAL_AXES = [
  '未経験からエンジニア転職を実現',
  '年収400万→600万のキャリアアップ',
  '最短3ヶ月でIT業界デビュー',
];

const COPY_DATA: Record<string, string[]> = {
  '未経験からエンジニア転職を実現': [
    '未経験でも大丈夫。あなたの"好き"がキャリアになる。',
    'プログラミング経験ゼロからエンジニアへ。最短ルートはここにある。',
    '今の仕事、本当にやりたいこと？ IT業界への第一歩を踏み出そう。',
  ],
  '年収400万→600万のキャリアアップ': [
    '年収200万アップは、夢じゃない。',
    'スキルが変われば、年収が変わる。',
    'あなたの市場価値、知っていますか？',
  ],
  '最短3ヶ月でIT業界デビュー': [
    '3ヶ月後、あなたはエンジニアになっている。',
    '最短距離でITキャリアをスタート。',
    '未来を変える90日間、始めませんか？',
  ],
};

const TONMANA = [
  { name: 'クリーン・コーポレート', colors: ['#1e293b', '#ffffff', '#3b82f6', '#94a3b8'] },
  { name: 'カジュアル・ポップ', colors: ['#f97316', '#facc15', '#ffffff', '#e2e8f0'] },
];

const SCENE_DATA = [
  { time: '0:00-0:05', type: '冒頭', telop: 'あなたは今、この仕事に満足していますか？', visual: 'オフィスで悩む若者のシルエット', na: 'あなたは今、この仕事に満足していますか？' },
  { time: '0:05-0:15', type: '前半', telop: '実は、未経験から転職した人の多くが同じ悩みを持っていました', visual: '統計データとグラフのアニメーション', na: '実は、未経験からエンジニアに転職した人の多くが、最初は同じ不安を抱えていました。' },
  { time: '0:15-0:25', type: '後半', telop: 'LevTech Rookieなら、最短3ヶ月でIT業界デビュー', visual: 'サービス画面とメンターの映像', na: 'LevTech Rookieなら、経験豊富なメンターが一人ひとりに寄り添い、最短3ヶ月でIT業界デビューを実現します。' },
  { time: '0:25-0:30', type: '締め', telop: '今すぐ無料カウンセリングを予約', visual: 'CTA画面とQRコード', na: '今すぐ無料カウンセリングを予約。あなたの未来が変わる。' },
];

const APPEAL_COUNT = 3;
const COPY_COUNT = 3;
const TONE_COUNT = 2;

interface PatternItem {
  id: string;
  appealIdx: number;
  copyIdx: number;
  toneIdx: number;
  appeal: string;
  copy: string;
  tonmana: string;
  status: 'ai-done' | 'pro-pending' | 'adcheck';
}

const generatePatterns = (): PatternItem[] => {
  const items: PatternItem[] = [];
  for (let a = 0; a < APPEAL_COUNT; a++) {
    for (let c = 0; c < COPY_COUNT; c++) {
      for (let t = 0; t < TONE_COUNT; t++) {
        const letter = ALPHA[a * COPY_COUNT + c];
        const appeal = APPEAL_AXES[a];
        const copies = COPY_DATA[appeal] ?? [];
        const statuses: PatternItem['status'][] = ['ai-done', 'ai-done', 'ai-done', 'pro-pending', 'adcheck', 'ai-done'];
        items.push({
          id: `${letter}${t + 1}`,
          appealIdx: a,
          copyIdx: c,
          toneIdx: t,
          appeal,
          copy: copies[c] ?? '',
          tonmana: TONMANA[t].name,
          status: statuses[items.length % statuses.length],
        });
      }
    }
  }
  return items;
};

const ALL_PATTERNS = generatePatterns();

const statusConfig: Record<string, { label: string; className: string }> = {
  'ai-done': { label: 'AI生成済み', className: 'bg-success-wash text-success' },
  'pro-pending': { label: 'プロに依頼中', className: 'bg-secondary-wash text-secondary' },
  'adcheck': { label: 'Ad Check中', className: 'bg-primary-wash text-primary' },
};

const VIDEO_STEPS = [
  { icon: Target, label: '訴求軸作成', count: '3つの訴求軸' },
  { icon: Type, label: 'コピー作成', count: '9パターン' },
  { icon: Film, label: '構成案・字コンテ作成', count: '9パターン' },
  { icon: FileText, label: 'NA原稿作成', count: '9パターン' },
  { icon: Mic, label: 'ナレーション作成', count: '9パターン' },
  { icon: Music, label: 'BGM提案', count: '3曲' },
  { icon: Play, label: 'Vコン作成', count: '9パターン' },
  { icon: Palette, label: 'スタイルフレーム作成', count: '2パターン' },
  { icon: PenTool, label: '絵コンテ作成', count: '18パターン' },
  { icon: Monitor, label: '横動画作成', count: '18本' },
  { icon: Smartphone, label: '縦動画・リサイズ', count: '18本' },
];

/* ─── Subcomponents ─── */

const PatternCard = ({ item, onClick }: { item: PatternItem; onClick: () => void }) => {
  const { toast } = useToast();
  const sc = statusConfig[item.status];
  const fullText = `${item.appeal} × ${item.copy}`;

  return (
    <motion.div
      className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 relative group"
      onClick={onClick}
      whileHover={{ y: -2 }}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted flex items-center justify-center">
        <Play className="h-8 w-8 text-muted-foreground/40" />
      </div>

      {/* Mini actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 backdrop-blur-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toast({ title: 'ダウンロード完了' })}>
              <Download className="h-3.5 w-3.5 mr-2" />ダウンロード
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: 'Ad Checkに送信しました' })}>
              <ShieldCheck className="h-3.5 w-3.5 mr-2" />Ad Check送信
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share2 className="h-3.5 w-3.5 mr-2" />共有
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-secondary">{item.id}</span>
          <Badge className={cn('text-xs', sc.className)}>{sc.label}</Badge>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-muted-foreground line-clamp-2">{fullText}</p>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">{fullText}</p>
          </TooltipContent>
        </Tooltip>
        <Badge variant="outline" className="text-xs">{item.tonmana}</Badge>
      </div>
    </motion.div>
  );
};

const ImagePlaceholder = ({ label, aspect = '16/9' }: { label: string; aspect?: string }) => (
  <div className="bg-muted rounded-lg flex items-center justify-center" style={{ aspectRatio: aspect }}>
    <div className="text-center">
      <Image className="h-8 w-8 text-muted-foreground/40 mx-auto mb-1" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  </div>
);

/* ─── Detail Modal ─── */

const PatternDetailModal = ({ item, open, onClose }: { item: PatternItem | null; open: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const [storyOpen, setStoryOpen] = useState(false);
  const [naOpen, setNaOpen] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'h' | 'v'>('h');

  if (!item) return null;
  const sc = statusConfig[item.status];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] max-h-[85vh] overflow-y-auto p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Left: preview */}
          <div className="lg:w-[55%] p-6 bg-muted/30">
            <Tabs value={videoOrientation} onValueChange={(v) => setVideoOrientation(v as 'h' | 'v')}>
              <TabsList className="mb-3">
                <TabsTrigger value="h">横動画 16:9</TabsTrigger>
                <TabsTrigger value="v">縦動画 9:16</TabsTrigger>
              </TabsList>
              <TabsContent value="h">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <Play className="h-12 w-12 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">1920×1080 / 30秒</p>
              </TabsContent>
              <TabsContent value="v">
                <div className="max-w-[200px] mx-auto">
                  <div className="bg-muted rounded-lg flex items-center justify-center" style={{ aspectRatio: '9/16' }}>
                    <Play className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">1080×1920 / 30秒</p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: details */}
          <div className="lg:w-[45%] p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl font-bold text-secondary">{item.id}</span>
                <Badge className={cn('text-xs', sc.className)}>{sc.label}</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">訴求軸:</span> {item.appeal}</p>
              <p><span className="text-muted-foreground">コピー:</span> {item.copy}</p>
              <p><span className="text-muted-foreground">トンマナ:</span> {item.tonmana}</p>
            </div>

            <Separator />

            {/* Storyboard collapsible */}
            <Collapsible open={storyOpen} onOpenChange={setStoryOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full">
                {storyOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                構成案（冒頭/前半/後半/締め）
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2 text-xs text-muted-foreground bg-muted rounded-lg p-3">
                  {SCENE_DATA.map((s, i) => (
                    <div key={i}>
                      <span className="font-medium text-foreground">【{s.type}】</span> {s.telop}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* NA collapsible */}
            <Collapsible open={naOpen} onOpenChange={setNaOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full">
                {naOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                NA原稿
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 text-xs text-muted-foreground bg-muted rounded-lg p-3 space-y-1">
                  {SCENE_DATA.map((s, i) => (
                    <p key={i}>({s.time}) {s.na}</p>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="text-xs text-muted-foreground space-y-1">
              <p><span className="font-medium">BGM:</span> アップテンポ・ポジティブ（BPM 120）</p>
              <p><span className="font-medium">生成日時:</span> 2026/03/16 15:30</p>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => toast({ title: 'ダウンロード完了' })}>
                <Download className="h-3.5 w-3.5 mr-1" />ダウンロード
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => toast({ title: 'Ad Checkに送信しました' })}>
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />Ad Check
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-3.5 w-3.5 mr-1" />共有
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Step Accordion Content ─── */

const StepAccordionContent = ({ stepLabel }: { stepLabel: string }) => {
  switch (stepLabel) {
    case '訴求軸作成':
      return (
        <div className="grid gap-3">
          {APPEAL_AXES.map((ax, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">訴求軸{i + 1}</Badge>
                <span className="text-xs text-muted-foreground">パターン {ALPHA[i * COPY_COUNT]}〜{ALPHA[i * COPY_COUNT + COPY_COUNT - 1]}</span>
              </div>
              <p className="text-sm font-medium">{ax}</p>
            </div>
          ))}
        </div>
      );
    case 'コピー作成':
      return (
        <div className="space-y-4">
          {APPEAL_AXES.map((ax, ai) => (
            <div key={ai}>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">訴求軸{ai + 1}: {ax}</h4>
              <div className="grid gap-2">
                {(COPY_DATA[ax] ?? []).map((copy, ci) => (
                  <div key={ci} className="bg-card rounded-lg border border-border p-3 flex items-start gap-2">
                    <Badge className="bg-secondary/10 text-secondary text-xs shrink-0">{ALPHA[ai * COPY_COUNT + ci]}</Badge>
                    <p className="text-sm">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case 'BGM提案':
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {['アップテンポ・ポジティブ（BPM 120）', 'エモーショナル・ドラマティック（BPM 90）', 'クール・テクノ（BPM 130）'].map((bgm, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4 text-center">
              <Music className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium">{bgm}</p>
            </div>
          ))}
        </div>
      );
    case 'スタイルフレーム作成':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {TONMANA.map((tm, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4">
              <p className="text-sm font-medium mb-2">トンマナ {i + 1}: {tm.name}</p>
              <div className="flex gap-2 mb-3">
                {tm.colors.map((c, ci) => (
                  <div key={ci} className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: c }} />
                ))}
              </div>
              <ImagePlaceholder label={tm.name} />
            </div>
          ))}
        </div>
      );
    case '横動画作成':
    case '縦動画・リサイズ':
    case '絵コンテ作成':
    case '静止画バナー作成': {
      const isVertical = stepLabel === '縦動画・リサイズ';
      const aspect = isVertical ? '9/16' : '16/9';
      return (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {ALL_PATTERNS.slice(0, 18).map((p) => (
            <div key={p.id} className="text-center">
              <div className="bg-muted rounded-lg flex items-center justify-center" style={{ aspectRatio: aspect }}>
                {stepLabel.includes('動画') ? <Play className="h-6 w-6 text-muted-foreground/40" /> : <Image className="h-6 w-6 text-muted-foreground/40" />}
              </div>
              <p className="text-xs font-medium mt-1 text-secondary">{p.id}</p>
            </div>
          ))}
        </div>
      );
    }
    default:
      return (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <ImagePlaceholder key={i} label={`${ALPHA[i]}`} />
          ))}
        </div>
      );
  }
};

/* ─── Main Component ─── */

const GenerationResult = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filterScript, setFilterScript] = useState('all');
  const [filterTone, setFilterTone] = useState('all');
  const [selectedPattern, setSelectedPattern] = useState<PatternItem | null>(null);
  const [expandedStep, setExpandedStep] = useState<number>(0);

  const filtered = ALL_PATTERNS.filter(p => {
    if (filterScript !== 'all' && ALPHA[p.appealIdx * COPY_COUNT + p.copyIdx] !== filterScript) return false;
    if (filterTone !== 'all' && String(p.toneIdx + 1) !== filterTone) return false;
    return true;
  });

  const scriptLetters = Array.from(new Set(ALL_PATTERNS.map(p => ALPHA[p.appealIdx * COPY_COUNT + p.copyIdx])));

  return (
    <motion.div
      className="max-w-7xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <button onClick={() => navigate('/')} className="hover:text-foreground">ダッシュボード</button>
        <span className="mx-2">&gt;</span>
        <button onClick={() => navigate('/history')} className="hover:text-foreground">生成履歴</button>
        <span className="mx-2">&gt;</span>
        <span className="text-foreground">結果詳細</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-display">生成結果 — EXPO 2026春</h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">動画30秒 / レバレジーズ / LevTech Rookie / パターン展開 / 合計18本 / 2026/03/16 15:30</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast({ title: '一括ダウンロード完了' })}>
            <Download className="h-3.5 w-3.5 mr-1" />一括DL
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => toast({ title: 'Ad Checkに一括送信しました' })}>
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />Ad Check
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-3.5 w-3.5 mr-1" />共有
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <TabsList className="w-max">
            <TabsTrigger value="all">全パターン一覧</TabsTrigger>
            <TabsTrigger value="appeal">訴求軸別</TabsTrigger>
            <TabsTrigger value="step">工程別</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: All patterns */}
        <TabsContent value="all">
          <AnimatePresence mode="wait">
            <motion.div key="all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-6 mt-4">
                <Select value={filterScript} onValueChange={setFilterScript}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="台本パターン" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全て</SelectItem>
                    {scriptLetters.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterTone} onValueChange={setFilterTone}>
                  <SelectTrigger className="w-[240px]"><SelectValue placeholder="トンマナ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全て</SelectItem>
                    {TONMANA.map((t, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}: {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(item => (
                  <PatternCard key={item.id} item={item} onClick={() => setSelectedPattern(item)} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* Tab 2: By appeal axis */}
        <TabsContent value="appeal">
          <AnimatePresence mode="wait">
            <motion.div key="appeal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="space-y-8 mt-4">
                {APPEAL_AXES.map((ax, ai) => {
                  const rangeStart = ALPHA[ai * COPY_COUNT];
                  const rangeEnd = ALPHA[ai * COPY_COUNT + COPY_COUNT - 1];
                  const patterns = ALL_PATTERNS.filter(p => p.appealIdx === ai);
                  return (
                    <div key={ai}>
                      <h3 className="text-base font-semibold font-display mb-3">
                        訴求軸{ai + 1}: {ax}
                        <span className="text-sm text-muted-foreground font-normal ml-2">（パターン {rangeStart}〜{rangeEnd}）</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {patterns.map(item => (
                          <PatternCard key={item.id} item={item} onClick={() => setSelectedPattern(item)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* Tab 3: By step */}
        <TabsContent value="step">
          <AnimatePresence mode="wait">
            <motion.div key="step" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="space-y-2 mt-4">
                {VIDEO_STEPS.map((vs, i) => (
                  <Collapsible key={i} open={expandedStep === i} onOpenChange={() => setExpandedStep(expandedStep === i ? -1 : i)}>
                    <CollapsibleTrigger className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                      {expandedStep === i ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      <vs.icon className="h-4 w-4 text-secondary shrink-0" />
                      <span className="text-sm font-medium">{vs.label}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{vs.count}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="p-4 border-x border-b border-border rounded-b-lg"
                      >
                        <StepAccordionContent stepLabel={vs.label} />
                      </motion.div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Detail modal */}
      <PatternDetailModal item={selectedPattern} open={!!selectedPattern} onClose={() => setSelectedPattern(null)} />
    </motion.div>
  );
};

export default GenerationResult;
