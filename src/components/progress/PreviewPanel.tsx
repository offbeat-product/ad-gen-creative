import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Image, Play, Music as MusicIcon, Pause,
  Check, X, Plus, Trash2, SkipForward, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { PipelineStep } from '@/pages/GenerateProgress';
import type { WizardState } from '@/data/wizard-data';
import ActionBar from './ActionBar';
import VoiceSelector from './VoiceSelector';
import NarrationAudioPlayer from './NarrationAudioPlayer';
import VconPreview from './VconPreview';
import BgmUploader from './BgmUploader';


interface Props {
  pipeline: PipelineStep[];
  selectedStepIndex: number | null;
  completedIndexes: Set<number>;
  skippedIndexes?: Set<number>;
  allDone: boolean;
  total: number;
  state: WizardState;
  waitingForApproval: number;
  effectiveAutoMode: boolean;
  genStepResult?: any;
  appealAxesResult?: any;
  copyStepResult?: any;
  compositionStepResult?: any;
  narrationScriptResult?: any;
  jobId?: string | null;
  voiceSelectionPending?: boolean;
  voiceGenerating?: boolean;
  narrationAudioMap?: Record<string, string | null>;
  narrationAudioMapB?: Record<string, string | null>;
  selectedGender?: 'male' | 'female';
  errorMap?: Record<number, string>;
  genStepsData?: any[];
  styleSelectionPending?: boolean;
  onApprove: (idx: number) => void;
  onRegenerate: (idx: number) => void;
  onSwitchToAuto: () => void;
  onNavigateDashboard: () => void;
  onResultUpdated?: () => void;
  onTriggerNarrationAudio?: (voiceIdA: string, voiceIdB: string, gender: 'male' | 'female') => void;
  onSkipStep?: (idx: number) => void;
  onRetryStep?: (idx: number) => void;
  onStyleSelected?: (style: string) => void;
}

/* ─── Pattern naming helpers ─── */

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const getPatternLetter = (appealIdx: number, copyIdx: number, copyCount: number) =>
  ALPHA[appealIdx * copyCount + copyIdx] ?? '?';

const getPatternRange = (appealIdx: number, copyCount: number) => {
  const start = ALPHA[appealIdx * copyCount];
  const end = ALPHA[appealIdx * copyCount + copyCount - 1];
  return `${start}〜${end}`;
};

const generatePatternIds = (appealCount: number, copyCount: number, toneCount: number) => {
  const ids: string[] = [];
  for (let a = 0; a < appealCount; a++) {
    for (let c = 0; c < copyCount; c++) {
      for (let t = 0; t < toneCount; t++) {
        ids.push(`${ALPHA[a * copyCount + c]}${t + 1}`);
      }
    }
  }
  return ids;
};

/* ─── Dummy data for previews (fallback) ─── */

const APPEAL_AXES_VIDEO = [
  '未経験からエンジニア転職を実現',
  '年収400万→600万のキャリアアップ',
  '最短3ヶ月でIT業界デビュー',
];

const APPEAL_AXES_BANNER = [
  '着圧効果で美脚を実現',
  '履くだけで-3cm細見え',
  '24時間快適な着用感',
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
  '着圧効果で美脚を実現': [
    '美脚革命、始めませんか？',
    '理想の脚線美を、毎日の日常に。',
    '着圧で叶える、スラッとした美脚。',
  ],
  '履くだけで-3cm細見え': [
    '-3cmの自信、履くだけで。',
    'パンツスタイルが変わる、-3cmの魔法。',
    '細見え効果で、毎日がランウェイ。',
  ],
  '24時間快適な着用感': [
    '24時間、美しいラインをキープ',
    '朝から夜まで、ストレスフリーな着心地。',
    '快適さと美脚を、両方手に入れる。',
  ],
};

const SCENE_DATA = [
  { time: '0:00-0:05', type: '冒頭', telop: 'あなたは今、この仕事に満足していますか？', visual: 'オフィスで悩む若者のシルエット', na: 'あなたは今、この仕事に満足していますか？' },
  { time: '0:05-0:15', type: '前半', telop: '実は、未経験から転職した人の多くが同じ悩みを持っていました', visual: '統計データとグラフのアニメーション', na: '実は、未経験からエンジニアに転職した人の多くが、最初は同じ不安を抱えていました。' },
  { time: '0:15-0:25', type: '後半', telop: 'LevTech Rookieなら、最短3ヶ月でIT業界デビュー', visual: 'サービス画面とメンターの映像', na: 'LevTech Rookieなら、経験豊富なメンターが一人ひとりに寄り添い、最短3ヶ月でIT業界デビューを実現します。' },
  { time: '0:25-0:30', type: '締め', telop: '今すぐ無料カウンセリングを予約', visual: 'CTA画面とQRコード', na: '今すぐ無料カウンセリングを予約。あなたの未来が変わる。' },
];

const NA_SCRIPT = `(0:00-0:05) あなたは今、この仕事に満足していますか？
(0:05-0:15) 実は、未経験からエンジニアに転職した人の多くが、最初は同じ不安を抱えていました。でも、正しいサポートがあれば、その不安は自信に変わります。
(0:15-0:25) LevTech Rookieなら、経験豊富なメンターが一人ひとりに寄り添い、最短3ヶ月でIT業界デビューを実現します。
(0:25-0:30) 今すぐ無料カウンセリングを予約。あなたの未来が変わる。`;

const BGM_DATA = [
  { name: 'アップテンポ・ポジティブ', bpm: 120, genre: 'Corporate Pop' },
  { name: 'エモーショナル・ドラマティック', bpm: 90, genre: 'Cinematic' },
  { name: 'クール・テクノ', bpm: 130, genre: 'Electronic' },
];

const STYLE_FRAMES = [
  { name: 'クリーン・コーポレート', colors: ['#1e3a5f', '#ffffff', '#87ceeb', '#94a3b8'] },
  { name: 'カジュアル・ポップ', colors: ['#f97316', '#facc15', '#ffffff', '#e2e8f0'] },
];

/* ─── Sub-components ─── */

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
    <Sparkles className="h-16 w-16 text-secondary animate-pulse mb-4" />
    <p className="text-lg font-medium mb-2">AIがクリエイティブを生成しています...</p>
    <p className="text-sm text-muted-foreground">左のパイプラインから完了した工程をクリックすると、生成物をプレビューできます。</p>
  </div>
);

const CompletionBanner = ({ total, onNavigate, jobId }: { total: number; onNavigate: () => void; jobId?: string | null }) => {
  const navigate = useNavigate();
  return (
    <div className="text-center py-6 space-y-3">
      <p className="text-xl font-bold font-display">🎉 すべての生成が完了しました！</p>
      <p className="text-sm text-muted-foreground">合計 {total}本 のクリエイティブを生成しました</p>
      <Button variant="brand" size="lg" onClick={() => navigate(`/result/${jobId ?? 'latest'}`)}>
        結果を確認する
      </Button>
      <div>
        <button onClick={onNavigate} className="text-sm text-muted-foreground hover:text-foreground underline">
          ダッシュボードに戻る
        </button>
      </div>
    </div>
  );
};

const ImagePlaceholder = ({ label, aspect = '16/9', size = 'md' }: { label: string; aspect?: string; size?: 'sm' | 'md' }) => (
  <div
    className={cn(
      "bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground",
      size === 'sm' ? 'p-3' : 'p-8',
    )}
    style={{ aspectRatio: aspect }}
  >
    <Image className={cn(size === 'sm' ? 'h-6 w-6' : 'h-10 w-10', 'mb-1')} />
    <span className="text-xs">{label}</span>
  </div>
);

const AudioPlayer = ({ label }: { label: string }) => (
  <div className="bg-muted rounded-lg p-4 flex items-center gap-3">
    <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground shrink-0">
      <Play className="h-4 w-4" />
    </button>
    <div className="flex-1">
      <div className="h-1.5 rounded-full bg-border w-full">
        <div className="h-full rounded-full bg-secondary w-1/3" />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
    <span className="text-xs text-muted-foreground tabular-nums">0:00 / 0:30</span>
  </div>
);

const AccordionSection = ({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 rounded-t-lg transition-colors"
      >
        <span className="font-medium text-sm">{title}</span>
        <span className="text-muted-foreground text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="p-3 pt-0 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
};

/* ─── Step-specific preview renderers ─── */

const PreviewAppealAxis = ({ isVideo, state, genStepResult, editing, editData, setEditData }: {
  isVideo: boolean; state: WizardState; genStepResult?: any;
  editing?: boolean; editData?: any; setEditData?: (d: any) => void;
}) => {
  const realAxes: any[] | null = (() => {
    try {
      if (genStepResult?.appeal_axes && Array.isArray(genStepResult.appeal_axes)) {
        return genStepResult.appeal_axes;
      }
    } catch {}
    return null;
  })();

  const copyCount = state.copyPatterns;
  const isNewFormat = realAxes && realAxes.length > 0 && typeof realAxes[0] === 'object' && realAxes[0].axis_type;

  // ── Editing mode ──
  if (editing && editData?.appeal_axes && setEditData) {
    const updateAxis = (i: number, field: string, value: any) => {
      const newAxes = [...editData.appeal_axes];
      newAxes[i] = { ...newAxes[i], [field]: value };
      setEditData({ ...editData, appeal_axes: newAxes });
    };
    const updateExample = (axisIdx: number, exIdx: number, value: string) => {
      const newAxes = [...editData.appeal_axes];
      const newExamples = [...(newAxes[axisIdx].examples || [])];
      newExamples[exIdx] = value;
      newAxes[axisIdx] = { ...newAxes[axisIdx], examples: newExamples };
      setEditData({ ...editData, appeal_axes: newAxes });
    };
    const addExample = (axisIdx: number) => {
      const newAxes = [...editData.appeal_axes];
      newAxes[axisIdx] = { ...newAxes[axisIdx], examples: [...(newAxes[axisIdx].examples || []), ''] };
      setEditData({ ...editData, appeal_axes: newAxes });
    };
    const removeExample = (axisIdx: number, exIdx: number) => {
      const newAxes = [...editData.appeal_axes];
      const newExamples = [...(newAxes[axisIdx].examples || [])];
      newExamples.splice(exIdx, 1);
      newAxes[axisIdx] = { ...newAxes[axisIdx], examples: newExamples };
      setEditData({ ...editData, appeal_axes: newAxes });
    };

    return (
      <div className="space-y-3">
        {editData.appeal_axes.map((axis: any, i: number) => (
          <div key={i} className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-sm font-bold shrink-0">{axis.index ?? i + 1}</div>
              <span className="text-sm font-semibold">訴求軸{i + 1}</span>
              <Badge variant="outline" className="text-xs shrink-0 ml-auto">パターン {getPatternRange(i, copyCount)}</Badge>
            </div>
            <div className="space-y-2 pl-10">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20 shrink-0">タイプ:</span>
                <Input value={axis.axis_type ?? ''} onChange={e => updateAxis(i, 'axis_type', e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20 shrink-0">ラベル:</span>
                <Input value={axis.axis_label ?? ''} onChange={e => updateAxis(i, 'axis_label', e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20 shrink-0">テキスト:</span>
                <Input value={axis.text ?? ''} onChange={e => updateAxis(i, 'text', e.target.value)} className="h-8 text-sm" />
              </div>
              {axis.examples && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">例文:</span>
                  {axis.examples.map((ex: string, j: number) => (
                    <div key={j} className="flex items-center gap-1">
                      <Input value={ex} onChange={e => updateExample(i, j, e.target.value)} className="h-8 text-sm flex-1" />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeExample(i, j)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => addExample(i)}>
                    <Plus className="h-3 w-3 mr-1" />例文を追加
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Display mode (existing logic) ──
  if (isNewFormat && realAxes) {
    return (
      <div className="space-y-3">
        <Badge className="bg-success-wash text-success text-xs mb-2">AI生成データ</Badge>
        {realAxes.map((axis: any, i: number) => (
          <div key={i} className="rounded-lg border p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-sm font-bold shrink-0">
              {axis.index ?? i + 1}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-semibold">
                {axis.axis_type}
                {axis.axis_label && <span className="text-muted-foreground font-normal">（{axis.axis_label}）</span>}
              </p>
              {axis.text && <p className="text-sm">{axis.text}</p>}
              {axis.examples && Array.isArray(axis.examples) && axis.examples.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  例）{axis.examples.map((ex: string) => `「${ex}」`).join('')}
                </p>
              )}
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              パターン {getPatternRange(i, copyCount)}
            </Badge>
          </div>
        ))}
      </div>
    );
  }

  const axes: string[] = realAxes
    ? realAxes.map((a: any) => (typeof a === 'string' ? a : a.text ?? JSON.stringify(a)))
    : (isVideo ? APPEAL_AXES_VIDEO : APPEAL_AXES_BANNER);

  return (
    <div className="space-y-3">
      {realAxes && <Badge className="bg-success-wash text-success text-xs mb-2">AI生成データ</Badge>}
      {axes.map((axis, i) => (
        <div key={i} className="rounded-lg border p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</div>
          <div className="flex-1"><p className="text-sm font-medium">{axis}</p></div>
          <Badge variant="outline" className="text-xs shrink-0">パターン {getPatternRange(i, copyCount)}</Badge>
        </div>
      ))}
    </div>
  );
};

const PreviewCopy = ({ isVideo, state, genStepResult, appealAxesResult, editing, editData, setEditData }: {
  isVideo: boolean; state: WizardState; genStepResult?: any; appealAxesResult?: any;
  editing?: boolean; editData?: any; setEditData?: (d: any) => void;
}) => {
  const copyCount = state.copyPatterns;

  const parsedAxesResult = (() => {
    if (!appealAxesResult) return null;
    try { return typeof appealAxesResult === 'string' ? JSON.parse(appealAxesResult) : appealAxesResult; } catch { return null; }
  })();
  const axesLookup: Record<number, { axis_type: string; axis_label: string }> = {};
  if (parsedAxesResult?.appeal_axes && Array.isArray(parsedAxesResult.appeal_axes)) {
    for (const ax of parsedAxesResult.appeal_axes) {
      if (ax.index != null) axesLookup[ax.index] = { axis_type: ax.axis_type, axis_label: ax.axis_label };
    }
  }

  const realCopies: any[] | null = (() => {
    try {
      if (genStepResult?.copies && Array.isArray(genStepResult.copies)) return genStepResult.copies;
    } catch {}
    return null;
  })();

  // ── Editing mode ──
  if (editing && editData?.copies && setEditData) {
    const updateCopyText = (patternId: string, value: string) => {
      const newCopies = editData.copies.map((c: any) =>
        c.pattern_id === patternId ? { ...c, copy_text: value } : c
      );
      setEditData({ ...editData, copies: newCopies });
    };

    const grouped = editData.copies.reduce((acc: Record<string, { axisIndex: number; copies: any[] }>, copy: any) => {
      const idx = copy.appeal_axis_index ?? 0;
      const key = String(idx);
      if (!acc[key]) acc[key] = { axisIndex: idx, copies: [] };
      acc[key].copies.push(copy);
      return acc;
    }, {} as Record<string, { axisIndex: number; copies: any[] }>);
    const groups = Object.values(grouped);

    return (
      <div className="space-y-6">
        {groups.map((group: { axisIndex: number; copies: any[] }, i: number) => {
          const axInfo = axesLookup[group.axisIndex];
          const heading = axInfo ? `${axInfo.axis_type}（${axInfo.axis_label}）` : group.copies[0]?.appeal_axis_text ?? `訴求軸${group.axisIndex}`;
          return (
            <div key={i}>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                {heading}
              </h4>
              <div className="space-y-2 pl-7">
                {group.copies.map((copy: any, j: number) => (
                  <div key={j} className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 space-y-2">
                    <Badge variant="outline" className="text-xs font-mono">{copy.pattern_id ?? getPatternLetter(i, j, copyCount)}</Badge>
                    <Textarea
                      value={copy.copy_text ?? ''}
                      onChange={e => updateCopyText(copy.pattern_id, e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Display mode (existing) ──
  if (realCopies && realCopies.length > 0) {
    const grouped = realCopies.reduce((acc: Record<string, { axisIndex: number; copies: any[] }>, copy: any) => {
      const idx = copy.appeal_axis_index ?? 0;
      const key = String(idx);
      if (!acc[key]) acc[key] = { axisIndex: idx, copies: [] };
      acc[key].copies.push(copy);
      return acc;
    }, {} as Record<string, { axisIndex: number; copies: any[] }>);
    const groups = Object.values(grouped);

    return (
      <div className="space-y-6">
        <Badge className="bg-success-wash text-success text-xs">AI生成データ</Badge>
        {groups.map((group: { axisIndex: number; copies: any[] }, i: number) => {
          const axInfo = axesLookup[group.axisIndex];
          const heading = axInfo ? `${axInfo.axis_type}（${axInfo.axis_label}）` : group.copies[0]?.appeal_axis_text ?? `訴求軸${group.axisIndex}`;
          return (
            <div key={i}>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                {heading}
              </h4>
              <div className="space-y-2 pl-7">
                {group.copies.map((copy: any, j: number) => (
                  <div key={j} className="rounded-lg border p-3 text-sm flex items-center gap-3">
                    <Badge variant="outline" className="text-xs shrink-0 font-mono">{copy.pattern_id ?? getPatternLetter(i, j, copyCount)}</Badge>
                    <span>{copy.copy_text ?? copy.text ?? ''}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const axes = isVideo ? APPEAL_AXES_VIDEO : APPEAL_AXES_BANNER;
  return (
    <div className="space-y-6">
      {axes.map((axis, i) => (
        <div key={i}>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-xs font-bold">{i + 1}</span>
            {axis}
          </h4>
          <div className="space-y-2 pl-7">
            {(COPY_DATA[axis] ?? []).map((copy, j) => (
              <div key={j} className="rounded-lg border p-3 text-sm flex items-center gap-3">
                <Badge variant="outline" className="text-xs shrink-0 font-mono">{getPatternLetter(i, j, copyCount)}</Badge>
                <span>{copy}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const PatternHeader = ({ patternId, copyStepResult, appealAxesResult }: { patternId: string; copyStepResult?: any; appealAxesResult?: any }) => {
  if (!copyStepResult?.copies) return null;
  const copies: any[] = copyStepResult.copies;
  const matchingCopy = copies.find((c: any) => c.pattern_id === patternId);
  if (!matchingCopy) return null;

  const axesLookup: Record<number, { axis_type: string; axis_label: string }> = {};
  if (appealAxesResult?.appeal_axes && Array.isArray(appealAxesResult.appeal_axes)) {
    for (const ax of appealAxesResult.appeal_axes) {
      if (ax.index != null) axesLookup[ax.index] = { axis_type: ax.axis_type, axis_label: ax.axis_label };
    }
  }
  const axInfo = axesLookup[matchingCopy.appeal_axis_index];
  const axisDisplay = axInfo
    ? `${matchingCopy.appeal_axis_text ?? ''}（${axInfo.axis_type}）`
    : matchingCopy.appeal_axis_text ?? '';

  return (
    <div className="bg-muted/50 rounded-lg p-3 mb-4 space-y-1 text-sm">
      <div className="flex gap-2">
        <span className="text-muted-foreground shrink-0 w-14">訴求軸:</span>
        <span className="font-medium">{axisDisplay}</span>
      </div>
      <div className="flex gap-2">
        <span className="text-muted-foreground shrink-0 w-14">コピー:</span>
        <span className="font-medium">{matchingCopy.copy_text ?? ''}</span>
      </div>
    </div>
  );
};

const PreviewStoryboard = ({ isVideo, state, genStepResult, copyStepResult, appealAxesResult, editing, editData, setEditData }: {
  isVideo: boolean; state: WizardState; genStepResult?: any; copyStepResult?: any; appealAxesResult?: any;
  editing?: boolean; editData?: any; setEditData?: (d: any) => void;
}) => {
  const copyCount = state.copyPatterns;
  const scriptCount = state.appealAxis * copyCount;
  const tabKeys = Array.from({ length: Math.min(scriptCount, 9) }, (_, i) => ALPHA[i]);

  const realCompositions: any[] | null = (() => {
    try {
      if (genStepResult?.compositions && Array.isArray(genStepResult.compositions)) return genStepResult.compositions;
    } catch {}
    return null;
  })();

  // ── Editing mode ──
  if (editing && editData?.compositions && setEditData) {
    const updateScene = (compIdx: number, sceneIdx: number, field: string, value: string) => {
      const newComps = editData.compositions.map((c: any, ci: number) => {
        if (ci !== compIdx) return c;
        const newScenes = c.scenes.map((s: any, si: number) =>
          si === sceneIdx ? { ...s, [field]: value } : s
        );
        return { ...c, scenes: newScenes };
      });
      setEditData({ ...editData, compositions: newComps });
    };

    return (
      <div className="space-y-4">
        <Tabs defaultValue={tabKeys[0]}>
          <TabsList className="w-full flex-wrap h-auto gap-1">
            {tabKeys.map((letter) => (
              <TabsTrigger key={letter} value={letter} className="text-xs font-mono">{letter}</TabsTrigger>
            ))}
          </TabsList>
          {tabKeys.map((letter, tabIdx) => {
            const comp = editData.compositions[tabIdx];
            const scenes = comp?.scenes ?? [];
            return (
              <TabsContent key={letter} value={letter}>
                <div className="space-y-3 mt-3">
                  <PatternHeader patternId={letter} copyStepResult={copyStepResult} appealAxesResult={appealAxesResult} />
                  {scenes.map((scene: any, j: number) => (
                    <div key={j} className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        {(scene.time_range || scene.time) && <Badge variant="outline" className="text-xs">{scene.time_range ?? scene.time}</Badge>}
                        <Badge className="bg-secondary text-secondary-foreground text-xs">【{scene.part ?? scene.type ?? `シーン${j+1}`}】</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16 shrink-0">テロップ:</span>
                        <Input value={scene.telop ?? ''} onChange={e => updateScene(tabIdx, j, 'telop', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <span className="text-xs text-muted-foreground w-16 shrink-0 pt-1">映像:</span>
                        <Textarea value={scene.visual ?? ''} onChange={e => updateScene(tabIdx, j, 'visual', e.target.value)} className="text-sm min-h-[60px]" />
                      </div>
                      {(scene.narration !== undefined || scene.na !== undefined) && (
                        <div className="flex gap-2">
                          <span className="text-xs text-muted-foreground w-16 shrink-0 pt-1">NA:</span>
                          <Textarea value={scene.narration ?? scene.na ?? ''} onChange={e => updateScene(tabIdx, j, 'narration', e.target.value)} className="text-sm min-h-[60px]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    );
  }

  // ── Display mode (existing) ──
  if (realCompositions) {
    return (
      <div className="space-y-4">
        <Badge className="bg-success-wash text-success text-xs">AI生成データ</Badge>
        <Tabs defaultValue={tabKeys[0]}>
          <TabsList className="w-full flex-wrap h-auto gap-1">
            {tabKeys.map((letter) => (
              <TabsTrigger key={letter} value={letter} className="text-xs font-mono">{letter}</TabsTrigger>
            ))}
          </TabsList>
          {tabKeys.map((letter, tabIdx) => {
            const comp = realCompositions[tabIdx];
            const scenes = comp?.scenes ?? [];
            return (
              <TabsContent key={letter} value={letter}>
                <div className="space-y-3 mt-3">
                  <PatternHeader patternId={letter} copyStepResult={copyStepResult} appealAxesResult={appealAxesResult} />
                  {scenes.map((scene: any, j: number) => (
                    <div key={j} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {(scene.time_range || scene.time) && <Badge variant="outline" className="text-xs">{scene.time_range ?? scene.time}</Badge>}
                        <Badge className="bg-secondary text-secondary-foreground text-xs">【{scene.part ?? scene.type ?? `シーン${j+1}`}】</Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        {scene.telop && <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">テロップ:</span><span>{scene.telop}</span></div>}
                        {scene.visual && <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">映像:</span><span>{scene.visual}</span></div>}
                        {(scene.narration || scene.na) && <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">NA:</span><span>{scene.narration ?? scene.na}</span></div>}
                        {scene.content && <p className="text-muted-foreground">{scene.content}</p>}
                      </div>
                    </div>
                  ))}
                  {scenes.length === 0 && comp && (
                    <div className="border rounded-lg p-4">
                      <pre className="text-sm whitespace-pre-wrap font-sans">{typeof comp === 'string' ? comp : JSON.stringify(comp, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    );
  }

  // Fallback to dummy
  if (!isVideo) {
    return (
      <div className="space-y-4">
        <Tabs defaultValue={tabKeys[0]}>
          <TabsList className="w-full flex-wrap h-auto gap-1">
            {tabKeys.map((letter) => (
              <TabsTrigger key={letter} value={letter} className="text-xs font-mono">{letter}</TabsTrigger>
            ))}
          </TabsList>
          {tabKeys.map((letter) => (
            <TabsContent key={letter} value={letter}>
              <div className="border rounded-lg p-4 space-y-3 mt-3">
                <p className="text-sm font-medium">構成案 パターン {letter}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2"><Badge className="bg-secondary text-secondary-foreground text-xs shrink-0">冒頭</Badge><span className="text-muted-foreground w-24 shrink-0">ヘッドコピー:</span><span>美脚革命、始めませんか？</span></div>
                  <div className="flex gap-2"><Badge className="bg-secondary text-secondary-foreground text-xs shrink-0">前半</Badge><span className="text-muted-foreground w-24 shrink-0">サブコピー:</span><span>着圧効果で理想のラインを実現</span></div>
                  <div className="flex gap-2"><Badge className="bg-secondary text-secondary-foreground text-xs shrink-0">後半</Badge><span className="text-muted-foreground w-24 shrink-0">ビジュアル:</span><span>商品着用イメージ（全身）</span></div>
                  <div className="flex gap-2"><Badge className="bg-secondary text-secondary-foreground text-xs shrink-0">締め</Badge><span className="text-muted-foreground w-24 shrink-0">CTA・オファー:</span><span>「今すぐチェック」ボタン 右下配置</span></div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue={tabKeys[0]}>
        <TabsList className="w-full flex-wrap h-auto gap-1">
          {tabKeys.map((letter) => (
            <TabsTrigger key={letter} value={letter} className="text-xs font-mono">{letter}</TabsTrigger>
          ))}
        </TabsList>
        {tabKeys.map((letter) => (
          <TabsContent key={letter} value={letter}>
            <div className="space-y-3 mt-3">
              {SCENE_DATA.map((scene, j) => (
                <div key={j} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{scene.time}</Badge>
                    <Badge className="bg-secondary text-secondary-foreground text-xs">【{scene.type}】</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">テロップ:</span><span>{scene.telop}</span></div>
                    <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">映像:</span><span>{scene.visual}</span></div>
                    <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">NA:</span><span>{scene.na}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

const PreviewNAScript = ({ state, genStepResult, copyStepResult, appealAxesResult, compositionStepResult, editing, editData, setEditData }: {
  state: WizardState; genStepResult?: any; copyStepResult?: any; appealAxesResult?: any; compositionStepResult?: any;
  editing?: boolean; editData?: any; setEditData?: (d: any) => void;
}) => {
  const copyCount = state.copyPatterns;
  const scriptCount = state.appealAxis * copyCount;
  const tabKeys = Array.from({ length: Math.min(scriptCount, 9) }, (_, i) => ALPHA[i]);

  const realNarrations: any[] | null = (() => {
    try {
      if (genStepResult?.narrations && Array.isArray(genStepResult.narrations)) return genStepResult.narrations;
    } catch {}
    return null;
  })();

  const compositionByPattern: Record<string, any> = {};
  if (compositionStepResult?.compositions && Array.isArray(compositionStepResult.compositions)) {
    for (const comp of compositionStepResult.compositions) {
      if (comp.pattern_id) compositionByPattern[comp.pattern_id] = comp;
    }
  }

  // ── Editing mode ──
  if (editing && editData?.narrations && setEditData) {
    const narrationByPattern: Record<string, { narration: any; idx: number }> = {};
    for (let i = 0; i < editData.narrations.length; i++) {
      const n = editData.narrations[i];
      if (n.pattern_id) narrationByPattern[n.pattern_id] = { narration: n, idx: i };
    }

    const updateSection = (narrIdx: number, secIdx: number, value: string) => {
      const newNarrations = editData.narrations.map((n: any, ni: number) => {
        if (ni !== narrIdx) return n;
        const newSections = n.sections.map((s: any, si: number) =>
          si === secIdx ? { ...s, text: value } : s
        );
        const totalChars = newSections.reduce((sum: number, s: any) => sum + (s.text?.length ?? 0), 0);
        return { ...n, sections: newSections, char_count: totalChars };
      });
      setEditData({ ...editData, narrations: newNarrations });
    };

    return (
      <div className="space-y-4">
        <Tabs defaultValue={tabKeys[0]}>
          <TabsList className="w-full flex-wrap h-auto gap-1">
            {tabKeys.map((letter) => (
              <TabsTrigger key={letter} value={letter} className="text-xs font-mono">{letter}</TabsTrigger>
            ))}
          </TabsList>
          {tabKeys.map((letter, tabIdx) => {
            const narrData = narrationByPattern[letter] ?? { narration: editData.narrations[tabIdx], idx: tabIdx };
            const narration = narrData.narration;
            const narrIdx = narrData.idx;
            const sections: any[] = narration?.sections ?? [];
            const charCount = narration?.char_count ?? sections.reduce((s: number, sec: any) => s + (sec.text?.length ?? 0), 0);
            const composition = compositionByPattern[letter];
            const compScenes: any[] = composition?.scenes ?? [];

            return (
              <TabsContent key={letter} value={letter}>
                <div className="mt-3 space-y-4">
                  <PatternHeader patternId={letter} copyStepResult={copyStepResult} appealAxesResult={appealAxesResult} />

                  {compScenes.length > 0 && (
                    <div>
                      <p className="text-sm font-bold mb-2">━━ 構成案・字コンテ ━━</p>
                      <div className="space-y-2">
                        {compScenes.map((scene: any, j: number) => (
                          <div key={j} className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              {scene.time_range && <Badge variant="outline" className="text-xs">{scene.time_range}</Badge>}
                              <Badge className="bg-secondary text-secondary-foreground text-xs">【{scene.part ?? scene.type}】</Badge>
                            </div>
                            <div className="space-y-1 text-sm">
                              {scene.telop && <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">テロップ:</span><span>{scene.telop}</span></div>}
                              {scene.visual && <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">映像:</span><span>{scene.visual}</span></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-bold mb-2">━━ NA原稿 ━━</p>
                    <div className="space-y-2">
                      {sections.map((sec: any, j: number) => (
                        <div key={j} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            {sec.time_range && <Badge variant="outline" className="text-xs">{sec.time_range}</Badge>}
                            <Badge className="bg-secondary text-secondary-foreground text-xs">【{sec.part}】</Badge>
                          </div>
                          <Textarea
                            value={sec.text ?? ''}
                            onChange={e => updateSection(narrIdx, j, e.target.value)}
                            className="text-sm min-h-[80px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />
                  <p className="text-xs text-muted-foreground">合計: {charCount}文字 / {state.videoDuration}秒尺</p>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    );
  }

  // ── Display mode (existing) ──
  if (realNarrations && realNarrations.length > 0) {
    const narrationByPattern: Record<string, any> = {};
    for (const n of realNarrations) {
      if (n.pattern_id) narrationByPattern[n.pattern_id] = n;
    }

    return (
      <div className="space-y-4">
        <Badge className="bg-success-wash text-success text-xs">AI生成データ</Badge>
        <Tabs defaultValue={tabKeys[0]}>
          <TabsList className="w-full flex-wrap h-auto gap-1">
            {tabKeys.map((letter) => (
              <TabsTrigger key={letter} value={letter} className="text-xs font-mono">{letter}</TabsTrigger>
            ))}
          </TabsList>
          {tabKeys.map((letter, tabIdx) => {
            const narration = narrationByPattern[letter] ?? realNarrations[tabIdx];
            const naSections: any[] = narration?.sections ?? [];
            const charCount = narration?.char_count ?? 0;
            const composition = compositionByPattern[letter];
            const compScenes: any[] = composition?.scenes ?? [];
            return (
              <TabsContent key={letter} value={letter}>
                <div className="mt-3 space-y-4">
                  <PatternHeader patternId={letter} copyStepResult={copyStepResult} appealAxesResult={appealAxesResult} />

                  {compScenes.length > 0 && (
                    <div>
                      <p className="text-sm font-bold mb-2">━━ 構成案・字コンテ ━━</p>
                      <div className="space-y-2">
                        {compScenes.map((scene: any, j: number) => (
                          <div key={j} className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              {scene.time_range && <Badge variant="outline" className="text-xs">{scene.time_range}</Badge>}
                              <Badge className="bg-secondary text-secondary-foreground text-xs">【{scene.part ?? scene.type}】</Badge>
                            </div>
                            <div className="space-y-1 text-sm">
                              {scene.telop && <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">テロップ:</span><span>{scene.telop}</span></div>}
                              {scene.visual && <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">映像:</span><span>{scene.visual}</span></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-bold mb-2">━━ NA原稿 ━━</p>
                    <div className="space-y-2">
                      {naSections.map((sec: any, j: number) => (
                        <div key={j} className="bg-accent/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            {sec.time_range && <Badge variant="outline" className="text-xs">{sec.time_range}</Badge>}
                            <Badge className="bg-secondary text-secondary-foreground text-xs">【{sec.part}】</Badge>
                          </div>
                          <p className="text-sm leading-relaxed">{sec.text}</p>
                        </div>
                      ))}
                      {naSections.length === 0 && narration?.full_script && (
                        <div className="bg-accent/30 rounded-lg p-4">
                          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{narration.full_script}</pre>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />
                  <p className="text-xs text-muted-foreground">合計: {charCount}文字 / {state.videoDuration}秒尺</p>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-muted rounded-lg p-4">
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{NA_SCRIPT}</pre>
      </div>
      <p className="text-xs text-muted-foreground">{NA_SCRIPT.length}文字 / {state.videoDuration}秒尺</p>
    </div>
  );
};

const VOICE_NAMES: Record<string, Record<string, string>> = {
  male: { a: '男性ボイス A', b: '男性ボイス B' },
  female: { a: '女性ボイス A', b: '女性ボイス B' },
};

const PreviewNarration = ({ state, narrationAudioMap, narrationAudioMapB, selectedGender, jobId, appealAxesResult, copyStepResult, compositionStepResult, narrationScriptResult }: {
  state: WizardState;
  narrationAudioMap?: Record<string, string | null>;
  narrationAudioMapB?: Record<string, string | null>;
  selectedGender?: 'male' | 'female';
  jobId?: string | null;
  appealAxesResult?: any;
  copyStepResult?: any;
  compositionStepResult?: any;
  narrationScriptResult?: any;
}) => {
  const [genPatterns, setGenPatterns] = useState<Array<{
    pattern_id: string;
    appeal_axis_text: string | null;
    copy_text: string | null;
    narration_script: string | null;
    narration_audio_url: string | null;
    narration_audio_url_b: string | null;
  }>>([]);
  const [selectedVoice, setSelectedVoice] = useState<'a' | 'b'>('a');

  useEffect(() => {
    if (!jobId) return;
    const fetchPatterns = async () => {
      const { data } = await supabase
        .from('gen_patterns')
        .select('pattern_id, appeal_axis_text, copy_text, narration_script, narration_audio_url, narration_audio_url_b')
        .eq('job_id', jobId)
        .order('pattern_id', { ascending: true });
      if (data) setGenPatterns(data);
    };
    fetchPatterns();
  }, [jobId, narrationAudioMap, narrationAudioMapB]);

  const patternsWithAudio = genPatterns.map(p => ({
    ...p,
    narration_audio_url: narrationAudioMap?.[p.pattern_id] ?? p.narration_audio_url,
    narration_audio_url_b: narrationAudioMapB?.[p.pattern_id] ?? p.narration_audio_url_b,
  }));

  // Group by base letter (strip trailing tone number)
  const getBaseLetter = (pid: string) => pid.replace(/\d+$/, '');
  const uniqueLetters = [...new Set(patternsWithAudio.map(p => getBaseLetter(p.pattern_id)))].sort();

  const gender = selectedGender ?? 'male';
  const voiceNameA = VOICE_NAMES[gender]?.a ?? 'サンプルボイスA';
  const voiceNameB = VOICE_NAMES[gender]?.b ?? 'サンプルボイスB';

  if (uniqueLetters.length === 0) {
    return (
      <div className="space-y-3">
        <AudioPlayer label="音声タイプ: 女性ナチュラル" />
        <p className="text-xs text-muted-foreground">※ デモ用プレースホルダーです</p>
      </div>
    );
  }

  const getPatternForLetter = (letter: string) =>
    patternsWithAudio.find(p => getBaseLetter(p.pattern_id) === letter);

  const getCompositionForLetter = (letter: string) => {
    if (!compositionStepResult?.compositions) return null;
    return compositionStepResult.compositions.find((c: any) => c.pattern_id === letter);
  };

  const getNarrationForLetter = (letter: string) => {
    if (!narrationScriptResult?.narrations) return null;
    return narrationScriptResult.narrations.find((n: any) => n.pattern_id === letter);
  };

  return (
    <div className="space-y-4">
      <Badge className="bg-success-wash text-success text-xs">AI生成音声</Badge>

      {/* Voice A/B toggle */}
      <div className="flex gap-2">
        {(['a', 'b'] as const).map(v => (
          <button
            key={v}
            onClick={() => setSelectedVoice(v)}
            className={cn(
              'flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all',
              selectedVoice === v
                ? 'brand-gradient-bg text-primary-foreground shadow-md'
                : 'bg-muted text-muted-foreground hover:bg-accent',
            )}
          >
            {v === 'a' ? `🔵 ${voiceNameA}` : `⚪ ${voiceNameB}`}
          </button>
        ))}
      </div>

      {/* Pattern A-I tabs */}
      <Tabs defaultValue={uniqueLetters[0]}>
        <TabsList className="w-full flex-wrap h-auto gap-1">
          {uniqueLetters.map(letter => (
            <TabsTrigger key={letter} value={letter} className="text-xs font-mono">{letter}</TabsTrigger>
          ))}
        </TabsList>
        {uniqueLetters.map(letter => {
          const pattern = getPatternForLetter(letter);
          const composition = getCompositionForLetter(letter);
          const narration = getNarrationForLetter(letter);
          const audioUrl = selectedVoice === 'a' ? pattern?.narration_audio_url : pattern?.narration_audio_url_b;

          return (
            <TabsContent key={letter} value={letter}>
              <div className="mt-3 space-y-3">
                {/* Pattern summary */}
                {(pattern?.appeal_axis_text || pattern?.copy_text) && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                    {pattern?.appeal_axis_text && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0 w-14">訴求軸:</span>
                        <span className="font-medium">{pattern.appeal_axis_text}</span>
                      </div>
                    )}
                    {pattern?.copy_text && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0 w-14">コピー:</span>
                        <span className="font-medium">「{pattern.copy_text}」</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Closed accordions for older previous steps */}
                {appealAxesResult?.appeal_axes && (
                  <AccordionSection title="訴求軸" defaultOpen={false}>
                    <div className="space-y-2">
                      {appealAxesResult.appeal_axes.map((axis: any, i: number) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{axis.index ?? i + 1}. {axis.axis_type ?? ''}</span>
                          {axis.axis_label && <span className="text-muted-foreground">（{axis.axis_label}）</span>}
                          {axis.text && <p className="text-muted-foreground ml-4">{axis.text}</p>}
                        </div>
                      ))}
                    </div>
                  </AccordionSection>
                )}

                {copyStepResult?.copies && (
                  <AccordionSection title="コピー" defaultOpen={false}>
                    <div className="space-y-1">
                      {copyStepResult.copies.slice(0, 9).map((c: any, i: number) => (
                        <p key={i} className="text-sm">
                          <span className="font-mono text-xs text-muted-foreground mr-1">{c.pattern_id}</span>
                          「{c.copy_text ?? ''}」
                        </p>
                      ))}
                    </div>
                  </AccordionSection>
                )}

                {composition && (
                  <AccordionSection title="構成案・字コンテ" defaultOpen={false}>
                    <div className="space-y-2">
                      {(composition.scenes ?? []).map((scene: any, j: number) => (
                        <div key={j} className="text-sm">
                          <span className="font-medium">【{scene.part ?? scene.type}】</span>
                          {scene.time_range && <span className="text-muted-foreground text-xs ml-1">{scene.time_range}</span>}
                          {scene.telop && <p className="text-muted-foreground ml-4">テロップ: {scene.telop}</p>}
                        </div>
                      ))}
                    </div>
                  </AccordionSection>
                )}

                {/* Open accordion for immediate previous step (NA原稿) */}
                {narration && (
                  <AccordionSection title="NA原稿" defaultOpen={true}>
                    <div className="space-y-2">
                      {(narration.sections ?? []).map((sec: any, j: number) => (
                        <div key={j} className="bg-accent/30 rounded-lg p-2">
                          <div className="flex items-center gap-2 mb-1">
                            {sec.time_range && <Badge variant="outline" className="text-xs">{sec.time_range}</Badge>}
                            <Badge className="bg-secondary text-secondary-foreground text-xs">【{sec.part}】</Badge>
                          </div>
                          <p className="text-sm leading-relaxed">{sec.text}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionSection>
                )}

                {/* Main content: Audio player */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    ▶ ナレーション音声（{selectedVoice === 'a' ? voiceNameA : voiceNameB}）
                  </p>
                  {audioUrl ? (
                    <NarrationAudioPlayer audioUrl={audioUrl} patternName={`パターン${letter}_${selectedVoice === 'a' ? 'A' : 'B'}`} />
                  ) : (
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground">音声未生成</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

const PreviewBGM = ({ genStepResult, jobId, onBgmUpdated }: { genStepResult?: any; jobId?: string | null; onBgmUpdated?: () => void }) => {
  const [bgmUrl, setBgmUrl] = useState<string | null>(null);

  const parsed = (() => {
    if (!genStepResult) return null;
    try {
      const r = typeof genStepResult === 'string' ? JSON.parse(genStepResult) : genStepResult;
      return r?.bgm_suggestions || null;
    } catch { return null; }
  })();

  // Extract 2 shared candidates (primary/alternative) from the first pattern
  const candidates = (() => {
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) return null;
    const first = parsed[0];
    return { primary: first?.primary, alternative: first?.alternative };
  })();

  // Fetch existing BGM URL from gen_patterns (all patterns share same BGM)
  useEffect(() => {
    if (!jobId) return;
    const fetchBgm = async () => {
      const { data } = await supabase
        .from('gen_patterns')
        .select('bgm_url')
        .eq('job_id', jobId)
        .not('bgm_url', 'is', null)
        .limit(1);
      if (data && data.length > 0 && data[0].bgm_url) {
        setBgmUrl(data[0].bgm_url);
      }
    };
    fetchBgm();
  }, [jobId]);

  const renderCandidate = (candidate: any, label: string, isPrimary: boolean) => {
    if (!candidate) return null;
    return (
      <div className={cn('rounded-lg p-4 space-y-2', isPrimary ? 'border-l-4 border-l-secondary border border-border' : 'border-l-4 border-l-muted-foreground/30 border border-border')}>
        <p className="text-sm font-bold">{label}: {candidate.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {candidate.mood && <Badge variant="outline" className="text-xs">Mood: {candidate.mood}</Badge>}
          {candidate.genre && <Badge variant="outline" className="text-xs">Genre: {candidate.genre}</Badge>}
          {candidate.tempo && <Badge variant="outline" className="text-xs">Tempo: {candidate.tempo}</Badge>}
          {candidate.theme && <Badge variant="outline" className="text-xs">Theme: {candidate.theme}</Badge>}
          {candidate.vocals && <Badge variant="outline" className="text-xs">Vocals: {candidate.vocals}</Badge>}
        </div>
        {candidate.reason && <p className="text-xs text-muted-foreground">{candidate.reason}</p>}
        {candidate.search_url && (
          <a href={candidate.search_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-secondary hover:underline mt-1">
            🔗 Envato Elementsで検索
          </a>
        )}
      </div>
    );
  };

  if (!candidates) {
    return (
      <div className="space-y-3">
        {BGM_DATA.map((bgm, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{bgm.name}</p>
              <Badge variant="outline">BPM {bgm.bpm}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{bgm.genre}</p>
            <AudioPlayer label={bgm.name} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Badge className="bg-success-wash text-success text-xs">AI生成データ</Badge>

      <p className="text-sm text-muted-foreground">
        AIが提案した2つのBGM候補です。どちらかを選んでEnvato Elementsからダウンロードし、アップロードしてください。
        <br />
        <span className="font-medium text-foreground">※ 全パターン共通のBGMとして使用されます。</span>
      </p>

      <div className="space-y-3">
        {renderCandidate(candidates.primary, '第1候補', true)}
        {renderCandidate(candidates.alternative, '第2候補', false)}
      </div>

      <Separator />

      {jobId && (
        <BgmUploader
          jobId={jobId}
          existingBgmUrl={bgmUrl}
          onUploaded={(url) => {
            setBgmUrl(url);
            onBgmUpdated?.();
          }}
          onDeleted={() => {
            setBgmUrl(null);
            onBgmUpdated?.();
          }}
        />
      )}
    </div>
  );
};

const PreviewVCon = ({ genStepResult, narrationAudioMap, narrationAudioMapB, selectedGender, jobId }: {
  genStepResult?: any; narrationAudioMap?: Record<string, string | null>; narrationAudioMapB?: Record<string, string | null>; selectedGender?: 'male' | 'female'; jobId?: string | null;
}) => (
  <VconPreview
    genStepResult={genStepResult}
    narrationAudioMap={narrationAudioMap}
    narrationAudioMapB={narrationAudioMapB}
    selectedGender={selectedGender}
    jobId={jobId}
  />
);

/* ─── Style Selection UI (inline for progress page) ─── */

const CREATIVE_STYLES = [
  { id: 'photographic', title: '🎬 実写素材型', desc: '写実的な広告写真をAIで生成' },
  { id: 'motion_graphics', title: '🎨 モーショングラフィックス型', desc: 'テロップ演出・イラスト・装飾をAIで生成' },
  { id: 'hybrid', title: '🔀 ハイブリッド型', desc: '実写+テロップの組み合わせ' },
];

const StyleSelectionForStyleframe = ({ onSelect }: { onSelect: (style: string) => void }) => {
  const [selected, setSelected] = useState<string>('photographic');
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">クリエイティブスタイルを選択してください。</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CREATIVE_STYLES.map(s => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={cn(
              'rounded-xl border-2 p-4 text-left transition-all',
              selected === s.id
                ? 'border-secondary bg-secondary/5'
                : 'border-border hover:border-muted-foreground/30',
            )}
          >
            <p className="text-sm font-bold mb-1">{s.title}</p>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
          </button>
        ))}
      </div>
      <Button variant="brand" onClick={() => onSelect(selected)} className="w-full">
        🚀 スタイルフレームを生成
      </Button>
    </div>
  );
};

const PreviewStyleFrames = ({ genStepResult, jobId }: { genStepResult?: any; jobId?: string | null }) => {
  const [vconCuts, setVconCuts] = useState<Record<string, any[]>>({});
  const [tonmanaGroups, setTonmanaGroups] = useState<Record<string, { name: string; frames: any[] }>>({});

  const parsed = (() => {
    if (!genStepResult) return null;
    try {
      let r = typeof genStepResult === 'string' ? JSON.parse(genStepResult) : genStepResult;
      if (typeof r === 'string') {
        try { r = JSON.parse(r); } catch {}
      }
      return r?.styleframes ?? null;
    } catch { return null; }
  })();

  // Fetch vcon data and gen_patterns tonmana info
  useEffect(() => {
    if (!jobId) return;
    const fetchData = async () => {
      // Fetch vcon step result for telop/annotations
      const { data: vconStep } = await supabase
        .from('gen_steps')
        .select('result')
        .eq('job_id', jobId)
        .eq('step_key', 'vcon')
        .single();

      if (vconStep?.result) {
        const vconResult = typeof vconStep.result === 'string'
          ? JSON.parse(vconStep.result) : vconStep.result;
        const vconData = vconResult?.vcon_data || [];
        const cutsMap: Record<string, any[]> = {};
        for (const pattern of vconData) {
          cutsMap[pattern.pattern_name] = pattern.cuts || [];
          // Also store with base letter for matching
          const base = pattern.pattern_name.replace(/[-_]\d+$/, '');
          if (!cutsMap[base]) cutsMap[base] = pattern.cuts || [];
        }
        setVconCuts(cutsMap);
      }

      // Fetch gen_patterns for tonmana grouping
      const { data: patterns } = await supabase
        .from('gen_patterns')
        .select('pattern_id, tonmana_index, tonmana_name')
        .eq('job_id', jobId);

      if (patterns && patterns.length > 0) {
        // Group by tonmana_index
        const groups: Record<number, { name: string; patternIds: Set<string> }> = {};
        for (const p of patterns) {
          const ti = p.tonmana_index ?? 1;
          if (!groups[ti]) {
            groups[ti] = { name: p.tonmana_name ?? `トンマナ ${ti}`, patternIds: new Set() };
          }
          // Extract base letter from pattern_id (e.g., "A-1" → "A", "A1" → "A")
          const base = p.pattern_id.replace(/[-_]?\d+$/, '');
          groups[ti].patternIds.add(base);
          groups[ti].patternIds.add(p.pattern_id);
        }
        setTonmanaGroups(
          Object.fromEntries(
            Object.entries(groups).map(([k, v]) => [k, { name: v.name, patternIds: v.patternIds }])
          ) as any
        );
      }
    };
    fetchData();
  }, [jobId]);

  // Helper to find vcon cut for a given pattern + cut_number
  const getVconCut = (patternName: string, cutNumber: number) => {
    const base = patternName.replace(/[-_]\d+$/, '');
    const cuts = vconCuts[patternName] || vconCuts[base] || [];
    return cuts.find((c: any) => c.cut_number === cutNumber) ?? null;
  };

  // Render a single styleframe card with design overlay
  const renderFrameCard = (sf: any) => {
    const vconCut = getVconCut(sf.pattern_name ?? 'A', sf.cut_number ?? 1);
    const telop = vconCut?.telop || '';
    const annotations = vconCut?.annotations || [];

    return (
      <div key={`${sf.pattern_name}-${sf.cut_number}`} className="border rounded-lg overflow-hidden">
        <div className="relative overflow-hidden" style={{ aspectRatio: sf.aspect_ratio === '9:16' ? '9/16' : '16/9' }}>
          {/* Background: AI generated image */}
          {sf.image_url ? (
            <img
              src={sf.image_url}
              alt={`Cut ${sf.cut_number ?? 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImagePlaceholder label={`Cut ${sf.cut_number ?? 1}`} aspect={sf.aspect_ratio === '9:16' ? '9/16' : '16/9'} size="sm" />
          )}

          {/* Overlay: dark gradient for text visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Main telop overlay */}
          {telop && (
            <div className="absolute inset-0 flex items-center justify-center px-3">
              <p
                className="text-center whitespace-pre-line leading-tight drop-shadow-lg"
                style={{
                  color: '#fff',
                  fontSize: 'clamp(0.875rem, 2.5vw, 1.5rem)',
                  fontWeight: 'bold',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                }}
              >
                {telop}
              </p>
            </div>
          )}

          {/* Annotations (※ notes) — bottom left */}
          {annotations.length > 0 && (
            <div className="absolute bottom-2 left-2 right-2">
              {annotations.map((annotation: string, i: number) => (
                <p key={i} className="leading-tight" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>
                  {annotation}
                </p>
              ))}
            </div>
          )}

          {/* Logo placeholder — top right */}
          <div className="absolute top-2 right-2 rounded border border-white/30 bg-white/10 backdrop-blur-sm px-2 py-1">
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px' }}>LOGO</span>
          </div>
        </div>

        <div className="p-2 space-y-1">
          <p className="text-xs font-medium">Cut {sf.cut_number ?? 1}{vconCut?.section ? ` — ${vconCut.section}` : ''}</p>
          {sf.prompt && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">プロンプト</summary>
              <p className="mt-1 text-[11px] leading-relaxed">{sf.prompt}</p>
            </details>
          )}
        </div>
      </div>
    );
  };

  if (parsed && Array.isArray(parsed) && parsed.length > 0) {
    // Group frames by tonmana_id directly from styleframe result data
    const framesByTonmana: Record<number, { name: string; frames: any[] }> = {};
    for (const sf of parsed) {
      const ti = sf.tonmana_id ?? 1;
      if (!framesByTonmana[ti]) {
        framesByTonmana[ti] = { name: sf.tonmana_name ?? `トンマナ ${ti}`, frames: [] };
      }
      framesByTonmana[ti].frames.push(sf);
    }

    const tonmanaKeys = Object.keys(framesByTonmana).map(Number).sort((a, b) => a - b);
    const hasTonmana = tonmanaKeys.length > 1;

    if (hasTonmana) {
      return (
        <div className="space-y-4">
          <Badge className="bg-success-wash text-success text-xs">AI生成データ</Badge>
          <Tabs defaultValue={String(tonmanaKeys[0])}>
            <TabsList className="w-full flex-wrap h-auto gap-1">
              {tonmanaKeys.map(key => (
                <TabsTrigger key={key} value={String(key)} className="text-xs">
                  トンマナ {key} — {framesByTonmana[key].name}
                </TabsTrigger>
              ))}
            </TabsList>
            {tonmanaKeys.map(key => (
              <TabsContent key={key} value={String(key)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  {framesByTonmana[key].frames
                    .sort((a: any, b: any) => (a.cut_number ?? 0) - (b.cut_number ?? 0))
                    .map((sf: any) => renderFrameCard(sf))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      );
    }

    // Fallback: no tonmana info, group by pattern (deduplicated by base letter)
    const grouped: Record<string, any[]> = {};
    for (const sf of parsed) {
      const pn = sf.pattern_name ?? 'A';
      const base = pn.replace(/[-_]\d+$/, '');
      if (!grouped[base]) grouped[base] = [];
      grouped[base].push(sf);
    }
    const patternNames = Object.keys(grouped).sort();

    return (
      <div className="space-y-4">
        <Badge className="bg-success-wash text-success text-xs">AI生成データ</Badge>
        {patternNames.length > 1 ? (
          <Tabs defaultValue={patternNames[0]}>
            <TabsList className="w-full flex-wrap h-auto gap-1">
              {patternNames.map(pn => (
                <TabsTrigger key={pn} value={pn} className="text-xs font-mono">トンマナ {pn}</TabsTrigger>
              ))}
            </TabsList>
            {patternNames.map(pn => (
              <TabsContent key={pn} value={pn}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  {grouped[pn].sort((a: any, b: any) => (a.cut_number ?? 0) - (b.cut_number ?? 0)).map((sf: any) => renderFrameCard(sf))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {parsed.sort((a: any, b: any) => (a.cut_number ?? 0) - (b.cut_number ?? 0)).map((sf: any) => renderFrameCard(sf))}
          </div>
        )}
      </div>
    );
  }

  // Fallback: dummy display
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {STYLE_FRAMES.map((sf, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">トンマナ {i + 1}</Badge>
            <p className="text-sm font-medium">{sf.name}</p>
          </div>
          <div className="flex gap-2">
            {sf.colors.map((c, j) => (
              <div key={j} className="w-8 h-8 rounded-full border" style={{ backgroundColor: c }} />
            ))}
          </div>
          <ImagePlaceholder label={`スタイルフレーム ${i + 1}`} />
        </div>
      ))}
    </div>
  );
};

const PreviewEkonte = ({ total }: { total: number }) => {
  const count = Math.min(total, 6);
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ImagePlaceholder key={i} label={`シーン ${i + 1}`} aspect="16/9" size="sm" />
      ))}
    </div>
  );
};

const PreviewFinalVideo = ({ total, state, aspect, resolution }: {
  total: number; state: WizardState; aspect: '16/9' | '9/16'; resolution: string;
}) => {
  const ids = generatePatternIds(state.appealAxis, state.copyPatterns, state.tonePatterns);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedId = ids[selectedIdx] ?? 'A1';
  const scriptLetter = selectedId.replace(/\d+$/, '');
  const toneNum = selectedId.replace(/^[A-Z]+/, '');
  const toneName = STYLE_FRAMES[parseInt(toneNum) - 1]?.name ?? `トンマナ ${toneNum}`;

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <span className="font-mono font-bold text-secondary text-lg mr-2">{selectedId}</span>
        <span className="text-muted-foreground">台本パターン {scriptLetter} × {toneName}</span>
      </div>
      <div className={cn("bg-muted rounded-xl flex items-center justify-center mx-auto", aspect === '9/16' && 'w-48')} style={{ aspectRatio: aspect }}>
        <Play className="h-12 w-12 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground text-center">解像度: {resolution} / {state.videoDuration}秒</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {ids.slice(0, Math.min(ids.length, 18)).map((id, i) => (
          <button
            key={id}
            onClick={() => setSelectedIdx(i)}
            className={cn(
              "shrink-0 rounded border text-xs font-mono flex items-center justify-center transition-all",
              aspect === '9/16' ? 'w-12 h-20' : 'w-24 h-14',
              i === selectedIdx
                ? 'border-secondary bg-secondary/10 text-secondary font-bold'
                : 'bg-muted text-muted-foreground hover:border-secondary/50',
            )}
          >
            {id}
          </button>
        ))}
      </div>
    </div>
  );
};

const PreviewBannerImages = ({ total, state }: { total: number; state: WizardState }) => {
  const ids = generatePatternIds(state.appealAxis, state.copyPatterns, state.tonePatterns);
  const count = Math.min(ids.length, 9);
  return (
    <div className="grid grid-cols-3 gap-3">
      {ids.slice(0, count).map((id) => (
        <div key={id} className="space-y-1">
          <ImagePlaceholder label={id} aspect="1/1" size="sm" />
          <p className="text-xs text-center font-mono text-muted-foreground">{id}</p>
        </div>
      ))}
    </div>
  );
};

const PreviewToneManner = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {STYLE_FRAMES.map((sf, i) => (
      <div key={i} className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">トンマナ {i + 1}</Badge>
          <p className="text-sm font-medium">{sf.name}</p>
        </div>
        <div className="flex gap-2">
          {sf.colors.map((c, j) => (
            <div key={j} className="w-8 h-8 rounded-full border" style={{ backgroundColor: c }} />
          ))}
        </div>
        <ImagePlaceholder label={`トンマナ ${i + 1}`} />
      </div>
    ))}
  </div>
);

/* ─── Download text generators ─── */

const generateDownloadText = (
  stepKey: string,
  result: any,
  state: WizardState,
  appealAxesResult?: any,
  copyStepResult?: any,
  compositionStepResult?: any,
): string => {
  if (!result) return '';

  const buildAxesLookup = (src?: any) => {
    const lookup: Record<number, any> = {};
    if (src?.appeal_axes) {
      for (const ax of src.appeal_axes) {
        if (ax.index != null) lookup[ax.index] = ax;
      }
    }
    return lookup;
  };

  const buildCopiesLookup = (src?: any) => {
    const lookup: Record<string, any> = {};
    if (src?.copies) {
      for (const c of src.copies) {
        if (c.pattern_id) lookup[c.pattern_id] = c;
      }
    }
    return lookup;
  };

  switch (stepKey) {
    case 'appeal_axis': {
      const axes = result.appeal_axes ?? [];
      let text = '=== 訴求軸一覧 ===\n\n';
      axes.forEach((axis: any, i: number) => {
        text += `【訴求軸${axis.index ?? i + 1}】${axis.axis_type ?? ''}（${axis.axis_label ?? ''}）\n`;
        if (axis.text) text += `${axis.text}\n`;
        if (axis.examples?.length) text += `例）${axis.examples.map((e: string) => `「${e}」`).join('')}\n`;
        text += '\n';
      });
      return text;
    }
    case 'copy': {
      const copies = result.copies ?? [];
      const axesLookup = buildAxesLookup(appealAxesResult);
      const grouped: Record<number, any[]> = {};
      copies.forEach((c: any) => {
        const idx = c.appeal_axis_index ?? 0;
        if (!grouped[idx]) grouped[idx] = [];
        grouped[idx].push(c);
      });
      let text = '=== コピー一覧 ===\n\n';
      Object.entries(grouped).forEach(([idxStr, groupCopies]) => {
        const idx = parseInt(idxStr);
        const ax = axesLookup[idx];
        const heading = ax ? `${ax.axis_type}（${ax.axis_label}）` : groupCopies[0]?.appeal_axis_text ?? `訴求軸${idx}`;
        text += `--- 訴求軸${idx}: ${heading} ---\n`;
        groupCopies.forEach((c: any) => { text += `${c.pattern_id}: ${c.copy_text ?? ''}\n`; });
        text += '\n';
      });
      return text;
    }
    case 'composition': {
      const compositions = result.compositions ?? [];
      const copiesLookup = buildCopiesLookup(copyStepResult);
      const axesLookup = buildAxesLookup(appealAxesResult);
      let text = '=== 構成案・字コンテ ===\n\n';
      compositions.forEach((comp: any, i: number) => {
        const pid = comp.pattern_id ?? ALPHA[i];
        text += `--- パターン${pid} ---\n`;
        const copy = copiesLookup[pid];
        if (copy) {
          const ax = axesLookup[copy.appeal_axis_index];
          text += `訴求軸: ${copy.appeal_axis_text ?? ''}${ax ? `（${ax.axis_type}）` : ''}\n`;
          text += `コピー: ${copy.copy_text ?? ''}\n\n`;
        }
        (comp.scenes ?? []).forEach((scene: any) => {
          text += `【${scene.part ?? scene.type}】${scene.time_range ?? scene.time ?? ''}\n`;
          if (scene.telop) text += `テロップ: ${scene.telop}\n`;
          if (scene.visual) text += `映像: ${scene.visual}\n`;
          if (scene.narration || scene.na) text += `NA: ${scene.narration ?? scene.na}\n`;
          text += '\n';
        });
        text += '\n';
      });
      return text;
    }
    case 'narration_script': {
      const narrations = result.narrations ?? [];
      const copiesLookup = buildCopiesLookup(copyStepResult);
      const axesLookup = buildAxesLookup(appealAxesResult);
      let text = '=== NA原稿 ===\n\n';
      narrations.forEach((narr: any, i: number) => {
        const pid = narr.pattern_id ?? ALPHA[i];
        text += `--- パターン${pid} ---\n`;
        const copy = copiesLookup[pid];
        if (copy) {
          const ax = axesLookup[copy.appeal_axis_index];
          text += `訴求軸: ${copy.appeal_axis_text ?? ''}${ax ? `（${ax.axis_type}）` : ''}\n`;
          text += `コピー: ${copy.copy_text ?? ''}\n\n`;
        }
        (narr.sections ?? []).forEach((sec: any) => {
          text += `【${sec.part}】${sec.time_range ?? ''}\n`;
          text += `${sec.text ?? ''}\n\n`;
        });
        text += `合計: ${narr.char_count ?? 0}文字 / ${state.videoDuration}秒尺\n\n`;
      });
      return text;
    }
    default:
      return JSON.stringify(result, null, 2);
  }
};

/* ─── Preview Panel ─── */

const PreviewPanel = ({
  pipeline, selectedStepIndex, completedIndexes, skippedIndexes, allDone, total, state,
  waitingForApproval, effectiveAutoMode, genStepResult, appealAxesResult, copyStepResult, compositionStepResult, narrationScriptResult, jobId,
  voiceSelectionPending, voiceGenerating, narrationAudioMap, narrationAudioMapB, selectedGender,
  errorMap, genStepsData, styleSelectionPending,
  onApprove, onRegenerate, onSwitchToAuto, onNavigateDashboard, onResultUpdated, onTriggerNarrationAudio,
  onSkipStep, onRetryStep, onStyleSelected,
}: Props) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [voiceApprovalOpen, setVoiceApprovalOpen] = useState(false);
  const [chosenVoice, setChosenVoice] = useState<'a' | 'b'>('a');

  // Reset editing when step changes
  useEffect(() => {
    setEditing(false);
    setEditData(null);
  }, [selectedStepIndex]);

  const parsedResult = (() => {
    if (!genStepResult) return null;
    try {
      return typeof genStepResult === 'string' ? JSON.parse(genStepResult) : genStepResult;
    } catch {
      return null;
    }
  })();
  const isVideo = state.creativeType === 'video';
  const showApprovalBar = !effectiveAutoMode && waitingForApproval >= 0 && !voiceSelectionPending;

  // Determine the status of the selected step from genStepsData
  const selectedStepStatus = (() => {
    if (selectedStepIndex === null) return null;
    const pipelineStep = pipeline[selectedStepIndex];
    if (!pipelineStep || !genStepsData) return null;
    const gs = genStepsData.find((s: any) => s.step_key === pipelineStep.stepKey);
    return gs?.status ?? null;
  })();

  const selectedStepError = selectedStepIndex !== null ? errorMap?.[selectedStepIndex] : null;
  const isSelectedCompleted = selectedStepIndex !== null && completedIndexes.has(selectedStepIndex);
  const isSelectedSkipped = selectedStepIndex !== null && skippedIndexes?.has(selectedStepIndex);
  const isSelectedInProgress = selectedStepStatus === 'processing' || selectedStepStatus === 'in_progress';
  const isSelectedFailed = selectedStepStatus === 'failed' || selectedStepStatus === 'error';

  const STEP_RUNNING_MESSAGES: Record<string, string> = {
    appeal_axis: 'AIが訴求軸を生成しています...',
    copy: '各訴求軸に対するコピーを生成しています...',
    composition: '構成案・字コンテを生成しています...',
    narration_script: 'NA原稿を生成しています...',
    narration_audio: 'AI音声でNA原稿を読み上げています...',
    bgm_suggestion: 'AIが最適なBGMを選定しています...',
    vcon: 'AIがVコン設計データを生成しています...',
    styleframe: 'AIがスタイルフレームを生成しています...',
    ekonte: 'AIが絵コンテを生成しています...',
  };

  // Show voice selection or voice generating state
  // Show style selection UI for styleframe step
  if (styleSelectionPending && onStyleSelected) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-secondary" />
            <h2 className="text-lg font-bold font-display">スタイルフレーム作成</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Vコンが完了しました。スタイルフレームのクリエイティブスタイルを選択してください。</p>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <StyleSelectionForStyleframe onSelect={onStyleSelected} />
        </div>
      </div>
    );
  }

  if (voiceSelectionPending && onTriggerNarrationAudio) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-secondary" />
            <h2 className="text-lg font-bold font-display">ナレーション音声生成</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">NA原稿が承認されました。ボイスを選択して音声を生成します。</p>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <VoiceSelector onGenerate={onTriggerNarrationAudio} />
        </div>
      </div>
    );
  }

  if (voiceGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
        <Loader2 className="h-12 w-12 text-secondary animate-spin mb-4" />
        <p className="text-lg font-medium mb-2">ナレーション音声を生成中...</p>
        <p className="text-sm text-muted-foreground">AI音声でNA原稿を読み上げています。しばらくお待ちください。</p>
      </div>
    );
  }

  // Show in_progress state for selected step
  if (selectedStepIndex !== null && isSelectedInProgress) {
    const step = pipeline[selectedStepIndex];
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <step.icon className="h-5 w-5 text-secondary" />
            <h2 className="text-lg font-bold font-display">{step.label}</h2>
            <Badge className="ml-auto bg-secondary text-secondary-foreground">生成中</Badge>
          </div>
        </div>
        <Separator />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <Loader2 className="h-12 w-12 text-secondary animate-spin mb-4" />
          <p className="text-lg font-medium mb-2">{step.label}を生成中...</p>
          <p className="text-sm text-muted-foreground">
            {STEP_RUNNING_MESSAGES[step.stepKey] || 'AIが処理を実行しています...'}
          </p>
        </div>
      </div>
    );
  }

  // Show failed state for selected step
  if (selectedStepIndex !== null && isSelectedFailed) {
    const step = pipeline[selectedStepIndex];
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <step.icon className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-bold font-display">{step.label}</h2>
            <Badge className="ml-auto bg-destructive text-destructive-foreground">エラー</Badge>
          </div>
        </div>
        <Separator />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium mb-2">ステップの実行に失敗しました</p>
          <p className="text-sm text-muted-foreground mb-6">
            {selectedStepError || 'ステップが失敗しました'}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onRetryStep?.(selectedStepIndex)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />再生成
            </Button>
            <Button
              variant="outline"
              className="border-warning text-warning hover:bg-warning/10"
              onClick={() => onSkipStep?.(selectedStepIndex)}
            >
              <SkipForward className="h-3.5 w-3.5 mr-1" />スキップして次へ進む
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show skipped state for selected step
  if (selectedStepIndex !== null && isSelectedSkipped) {
    const step = pipeline[selectedStepIndex];
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <step.icon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-bold font-display">{step.label}</h2>
            <Badge variant="outline" className="ml-auto">スキップ</Badge>
          </div>
        </div>
        <Separator />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <SkipForward className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">このステップはスキップされました</p>
        </div>
      </div>
    );
  }

  const noSelection = selectedStepIndex === null || !isSelectedCompleted;
  if (noSelection && !allDone && !showApprovalBar) return <EmptyState />;

  const step = selectedStepIndex !== null ? pipeline[selectedStepIndex] : null;

  const startEdit = () => {
    if (!parsedResult) return;
    setEditData(JSON.parse(JSON.stringify(parsedResult)));
    setEditing(true);
  };

  const handleSave = async () => {
    if (!jobId || !step || !editData) return;
    const { error } = await supabase
      .from('gen_steps')
      .update({ result: editData })
      .eq('job_id', jobId)
      .eq('step_key', step.stepKey);
    if (error) {
      toast({ title: '保存に失敗しました', variant: 'destructive' });
    } else {
      toast({ title: '変更を保存しました' });
      setEditing(false);
      setEditData(null);
      onResultUpdated?.();
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData(null);
  };

  const handleDownload = () => {
    if (!step) return;
    const data = editing ? editData : parsedResult;
    if (!data) {
      toast({ title: 'ダウンロードするデータがありません' });
      return;
    }
    const content = generateDownloadText(step.stepKey, data, state, appealAxesResult, copyStepResult, compositionStepResult);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jobId ?? 'draft'}_${step.stepKey}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'ダウンロード完了' });
  };

  // Build accordion sections for previous steps (video pipeline only, steps 1-4)
  const buildPreviousAccordions = (currentIdx: number) => {
    if (!isVideo || currentIdx <= 0 || currentIdx > 3) return null;
    const sections: JSX.Element[] = [];

    const stepDefs: Array<{ maxIdx: number; title: string; result: any; render: () => React.ReactNode }> = [
      {
        maxIdx: 0, title: '訴求軸', result: appealAxesResult,
        render: () => appealAxesResult?.appeal_axes ? (
          <div className="space-y-1">{appealAxesResult.appeal_axes.map((a: any, i: number) => (
            <p key={i} className="text-sm"><span className="font-medium">{a.index ?? i + 1}.</span> {a.axis_type ?? a.text ?? ''}{a.axis_label ? `（${a.axis_label}）` : ''}</p>
          ))}</div>
        ) : null,
      },
      {
        maxIdx: 1, title: 'コピー', result: copyStepResult,
        render: () => copyStepResult?.copies ? (
          <div className="space-y-1">{copyStepResult.copies.slice(0, 9).map((c: any, i: number) => (
            <p key={i} className="text-sm"><span className="font-mono text-xs text-muted-foreground mr-1">{c.pattern_id}</span>「{c.copy_text ?? ''}」</p>
          ))}</div>
        ) : null,
      },
      {
        maxIdx: 2, title: '構成案・字コンテ', result: compositionStepResult,
        render: () => compositionStepResult?.compositions ? (
          <p className="text-sm text-muted-foreground">{compositionStepResult.compositions.length}パターンの構成案を生成済み</p>
        ) : null,
      },
    ];

    for (const def of stepDefs) {
      if (def.maxIdx < currentIdx && def.result) {
        const isImmediatePrevious = def.maxIdx === currentIdx - 1;
        const content = def.render();
        if (content) {
          sections.push(
            <AccordionSection key={def.title} title={def.title} defaultOpen={isImmediatePrevious}>
              {content}
            </AccordionSection>
          );
        }
      }
    }

    return sections.length > 0 ? <div className="mb-4">{sections}</div> : null;
  };

  const renderPreview = () => {
    if (!step || selectedStepIndex === null) return null;
    const displayData = editing ? editData : parsedResult;

    let mainContent: React.ReactNode = null;

    if (isVideo) {
      switch (selectedStepIndex) {
        case 0: mainContent = <PreviewAppealAxis isVideo state={state} genStepResult={displayData} editing={editing} editData={editData} setEditData={setEditData} />; break;
        case 1: mainContent = <PreviewCopy isVideo state={state} genStepResult={displayData} appealAxesResult={appealAxesResult} editing={editing} editData={editData} setEditData={setEditData} />; break;
        case 2: mainContent = <PreviewStoryboard isVideo state={state} genStepResult={displayData} copyStepResult={copyStepResult} appealAxesResult={appealAxesResult} editing={editing} editData={editData} setEditData={setEditData} />; break;
        case 3: mainContent = <PreviewNAScript state={state} genStepResult={displayData} copyStepResult={copyStepResult} appealAxesResult={appealAxesResult} compositionStepResult={compositionStepResult} editing={editing} editData={editData} setEditData={setEditData} />; break;
        case 4: return <PreviewNarration state={state} narrationAudioMap={narrationAudioMap} narrationAudioMapB={narrationAudioMapB} selectedGender={selectedGender} jobId={jobId} appealAxesResult={appealAxesResult} copyStepResult={copyStepResult} compositionStepResult={compositionStepResult} narrationScriptResult={narrationScriptResult} />;
        case 5: mainContent = <PreviewBGM genStepResult={displayData} jobId={jobId} onBgmUpdated={onResultUpdated} />; break;
        case 6: mainContent = <PreviewVCon genStepResult={displayData} narrationAudioMap={narrationAudioMap} narrationAudioMapB={narrationAudioMapB} selectedGender={selectedGender} jobId={jobId} />; break;
        case 7: mainContent = <PreviewStyleFrames genStepResult={displayData} jobId={jobId} />; break;
        case 8: mainContent = <PreviewEkonte total={total} />; break;
        case 9: mainContent = <PreviewFinalVideo total={total} state={state} aspect="16/9" resolution="1920 × 1080" />; break;
        case 10: mainContent = <PreviewFinalVideo total={total} state={state} aspect="9/16" resolution="1080 × 1920" />; break;
        default: return null;
      }
    } else {
      switch (selectedStepIndex) {
        case 0: mainContent = <PreviewAppealAxis isVideo={false} state={state} genStepResult={displayData} editing={editing} editData={editData} setEditData={setEditData} />; break;
        case 1: mainContent = <PreviewCopy isVideo={false} state={state} genStepResult={displayData} appealAxesResult={appealAxesResult} editing={editing} editData={editData} setEditData={setEditData} />; break;
        case 2: mainContent = <PreviewStoryboard isVideo={false} state={state} genStepResult={displayData} copyStepResult={copyStepResult} appealAxesResult={appealAxesResult} editing={editing} editData={editData} setEditData={setEditData} />; break;
        case 3: mainContent = <PreviewToneManner />; break;
        case 4: mainContent = <PreviewBannerImages total={total} state={state} />; break;
        default: return null;
      }
    }

    const accordions = buildPreviousAccordions(selectedStepIndex);
    return (
      <>
        {accordions}
        {mainContent}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {allDone && <CompletionBanner total={total} onNavigate={onNavigateDashboard} jobId={jobId} />}

      {step && selectedStepIndex !== null && (
        <>
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <step.icon className="h-5 w-5 text-secondary" />
              <h2 className="text-lg font-bold font-display">{step.label}</h2>
              <Badge className={cn(
                'ml-auto',
                editing
                  ? 'bg-yellow-100 text-yellow-800'
                  : completedIndexes.has(selectedStepIndex)
                    ? 'bg-success text-success-foreground'
                    : 'bg-secondary text-secondary-foreground',
              )}>
                {editing ? '編集中' : completedIndexes.has(selectedStepIndex) ? '完了' : '実行中'}
              </Badge>
            </div>
            {step.completedText && completedIndexes.has(selectedStepIndex) && !editing && (
              <p className="text-sm text-muted-foreground mt-1">{step.completedText}</p>
            )}
          </div>

          <Separator />

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedStepIndex}-${editing}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderPreview()}
              </motion.div>
            </AnimatePresence>
          </div>

          <Separator />

          {showApprovalBar && !editing && (
            <div className="sticky bottom-0 px-6 py-3 flex items-center gap-3 border-t border-border bg-background">
              <Button variant="brand" onClick={() => {
                // If narration step, show voice selection dialog
                const currentStep = pipeline[waitingForApproval];
                if (currentStep?.stepKey === 'narration') {
                  setVoiceApprovalOpen(true);
                } else {
                  onApprove(waitingForApproval);
                }
              }}>
                承認して次へ進む
              </Button>
              <Button variant="outline" onClick={() => onRegenerate(waitingForApproval)}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />この工程を再生成
              </Button>
              <button onClick={onSwitchToAuto} className="text-sm text-secondary hover:underline ml-auto">
                残りを全自動で実行
              </button>
            </div>
          )}

          {/* Voice selection dialog for narration approval */}
          <Dialog open={voiceApprovalOpen} onOpenChange={setVoiceApprovalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>どちらのボイスで進めますか？</DialogTitle>
                <DialogDescription>選んだボイスが最終ナレーションとして使用されます。</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                {(['a', 'b'] as const).map((v) => {
                  const gender = selectedGender ?? 'male';
                  const voiceName = v === 'a'
                    ? VOICE_NAMES[gender]?.a ?? 'ボイスA'
                    : VOICE_NAMES[gender]?.b ?? 'ボイスB';
                  return (
                    <button
                      key={v}
                      onClick={() => setChosenVoice(v)}
                      className={cn(
                        'w-full rounded-xl p-4 border-2 text-left transition-all',
                        chosenVoice === v
                          ? 'border-secondary bg-secondary/5'
                          : 'border-border hover:border-muted-foreground/30',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                          chosenVoice === v ? 'border-secondary' : 'border-muted-foreground/40',
                        )}>
                          {chosenVoice === v && <div className="w-2.5 h-2.5 rounded-full brand-gradient-bg" />}
                        </div>
                        <span className="text-sm font-semibold">
                          {v === 'a' ? '🔵' : '⚪'} {voiceName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVoiceApprovalOpen(false)}>キャンセル</Button>
                <Button variant="brand" onClick={async () => {
                  // Update gen_patterns selected_voice
                  if (jobId) {
                    await supabase
                      .from('gen_patterns')
                      .update({ selected_voice: chosenVoice })
                      .eq('job_id', jobId);
                  }
                  setVoiceApprovalOpen(false);
                  onApprove(waitingForApproval);
                }}>
                  この声で決定
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ActionBar
            step={step}
            stepIndex={selectedStepIndex}
            state={state}
            pipeline={pipeline}
            completedIndexes={completedIndexes}
            editing={editing}
            onStartEdit={startEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            onDownload={handleDownload}
          />
        </>
      )}
    </div>
  );
};

export default PreviewPanel;
