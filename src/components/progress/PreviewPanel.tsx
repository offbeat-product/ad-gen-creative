import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Image, Play, Music as MusicIcon, Pause,
  Check, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import type { PipelineStep } from '@/pages/GenerateProgress';
import type { WizardState } from '@/data/wizard-data';
import ActionBar from './ActionBar';

interface Props {
  pipeline: PipelineStep[];
  selectedStepIndex: number | null;
  completedIndexes: Set<number>;
  allDone: boolean;
  total: number;
  state: WizardState;
  waitingForApproval: number;
  effectiveAutoMode: boolean;
  onApprove: (idx: number) => void;
  onRegenerate: (idx: number) => void;
  onSwitchToAuto: () => void;
  onNavigateDashboard: () => void;
}

/* ─── Dummy data for previews ─── */

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
  { time: '0:00-0:05', type: 'Hook', telop: 'あなたは今、この仕事に満足していますか？', visual: 'オフィスで悩む若者のシルエット' },
  { time: '0:05-0:15', type: 'Problem', telop: '実は、未経験からエンジニアに転職した人の多くが同じ悩みを持っていました', visual: '統計データとグラフのアニメーション' },
  { time: '0:15-0:25', type: 'Solution', telop: 'LevTech Rookieなら、最短3ヶ月でIT業界デビュー', visual: 'サービス画面とメンターの映像' },
  { time: '0:25-0:30', type: 'CTA', telop: '今すぐ無料カウンセリングを予約', visual: 'CTA画面とQRコード' },
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

const CompletionBanner = ({ total, onNavigate }: { total: number; onNavigate: () => void }) => (
  <div className="text-center py-6 space-y-3">
    <p className="text-xl font-bold font-display">🎉 すべての生成が完了しました！</p>
    <p className="text-sm text-muted-foreground">合計 {total}本 のクリエイティブを生成しました</p>
    <Button variant="brand" size="lg" onClick={() => alert('結果画面は次フェーズで実装予定')}>
      結果を確認する
    </Button>
    <div>
      <button onClick={onNavigate} className="text-sm text-muted-foreground hover:text-foreground underline">
        ダッシュボードに戻る
      </button>
    </div>
  </div>
);

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

/* ─── Step-specific preview renderers ─── */

const PreviewAppealAxis = ({ isVideo }: { isVideo: boolean }) => {
  const axes = isVideo ? APPEAL_AXES_VIDEO : APPEAL_AXES_BANNER;
  return (
    <div className="space-y-3">
      {axes.map((axis, i) => (
        <div key={i} className="rounded-lg border p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-sm font-bold shrink-0">
            {i + 1}
          </div>
          <p className="text-sm font-medium">{axis}</p>
        </div>
      ))}
    </div>
  );
};

const PreviewCopy = ({ isVideo }: { isVideo: boolean }) => {
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
              <div key={j} className="rounded-lg border p-3 text-sm">{copy}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const PreviewStoryboard = ({ isVideo, state }: { isVideo: boolean; state: WizardState }) => {
  if (!isVideo) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">バナー構成案を表示しています</p>
        <div className="grid grid-cols-1 gap-4">
          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">構成案 #1</p>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">ヘッドコピー:</span><span>美脚革命、始めませんか？</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">サブコピー:</span><span>着圧効果で理想のラインを実現</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">ビジュアル:</span><span>商品着用イメージ（全身）</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">CTA:</span><span>「今すぐチェック」ボタン 右下配置</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="combo-0">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          {APPEAL_AXES_VIDEO.slice(0, 3).map((_, i) => (
            <TabsTrigger key={i} value={`combo-${i}`} className="text-xs">
              訴求軸{i + 1} × コピー1
            </TabsTrigger>
          ))}
        </TabsList>
        {APPEAL_AXES_VIDEO.slice(0, 3).map((_, i) => (
          <TabsContent key={i} value={`combo-${i}`}>
            <div className="space-y-3 mt-3">
              {SCENE_DATA.map((scene, j) => (
                <div key={j} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{scene.time}</Badge>
                    <Badge className="bg-secondary text-secondary-foreground text-xs">{scene.type}</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">テロップ:</span><span>{scene.telop}</span></div>
                    <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">映像:</span><span>{scene.visual}</span></div>
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

const PreviewNAScript = ({ state }: { state: WizardState }) => {
  const charCount = state.videoDuration === 15 ? 60 : state.videoDuration === 30 ? 120 : 240;
  return (
    <div className="space-y-3">
      <div className="bg-muted rounded-lg p-4">
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{NA_SCRIPT}</pre>
      </div>
      <p className="text-xs text-muted-foreground">{NA_SCRIPT.length}文字 / {state.videoDuration}秒尺</p>
    </div>
  );
};

const PreviewNarration = () => (
  <div className="space-y-3">
    <AudioPlayer label="音声タイプ: 女性ナチュラル" />
    <p className="text-xs text-muted-foreground">※ デモ用プレースホルダーです</p>
  </div>
);

const PreviewBGM = () => (
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

const PreviewVCon = () => (
  <div className="space-y-3">
    <div className="bg-muted rounded-xl flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
      <Play className="h-12 w-12 text-muted-foreground" />
    </div>
    <p className="text-xs text-muted-foreground">字コンテ + NA + BGMの統合</p>
  </div>
);

const PreviewStyleFrames = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {STYLE_FRAMES.map((sf, i) => (
      <div key={i} className="border rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">{sf.name}</p>
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

const PreviewHorizontalVideo = ({ total, state }: { total: number; state: WizardState }) => (
  <div className="space-y-4">
    <div className="bg-muted rounded-xl flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
      <Play className="h-12 w-12 text-muted-foreground" />
    </div>
    <p className="text-xs text-muted-foreground">解像度: 1920 × 1080 / {state.videoDuration}秒</p>
    <div className="flex gap-2 overflow-x-auto pb-2">
      {Array.from({ length: Math.min(total, 6) }).map((_, i) => (
        <div key={i} className="w-24 h-14 rounded bg-muted flex items-center justify-center shrink-0 border text-xs text-muted-foreground">
          #{i + 1}
        </div>
      ))}
    </div>
  </div>
);

const PreviewVerticalVideo = ({ total, state }: { total: number; state: WizardState }) => (
  <div className="space-y-4 flex flex-col items-center">
    <div className="bg-muted rounded-xl flex items-center justify-center w-48" style={{ aspectRatio: '9/16' }}>
      <Play className="h-10 w-10 text-muted-foreground" />
    </div>
    <p className="text-xs text-muted-foreground">解像度: 1080 × 1920 / {state.videoDuration}秒</p>
    <div className="flex gap-2 overflow-x-auto pb-2 w-full">
      {Array.from({ length: Math.min(total, 6) }).map((_, i) => (
        <div key={i} className="w-12 h-20 rounded bg-muted flex items-center justify-center shrink-0 border text-xs text-muted-foreground">
          #{i + 1}
        </div>
      ))}
    </div>
  </div>
);

const PreviewBannerImages = ({ total }: { total: number }) => {
  const count = Math.min(total, 9);
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ImagePlaceholder key={i} label={`バリエーション ${i + 1}`} aspect="1/1" size="sm" />
      ))}
    </div>
  );
};

const PreviewToneManner = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {STYLE_FRAMES.map((sf, i) => (
      <div key={i} className="border rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">{sf.name}</p>
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

/* ─── Preview Panel ─── */

const PreviewPanel = ({
  pipeline, selectedStepIndex, completedIndexes, allDone, total, state,
  waitingForApproval, effectiveAutoMode, onApprove, onRegenerate, onSwitchToAuto,
  onNavigateDashboard,
}: Props) => {
  const isVideo = state.creativeType === 'video';
  const noSelection = selectedStepIndex === null || !completedIndexes.has(selectedStepIndex);

  if (noSelection && !allDone) return <EmptyState />;

  const step = selectedStepIndex !== null ? pipeline[selectedStepIndex] : null;
  const isWaitingApproval = selectedStepIndex !== null && waitingForApproval === selectedStepIndex;

  const renderPreview = () => {
    if (!step || selectedStepIndex === null) return null;

    if (isVideo) {
      // Video pipeline: 11 steps
      switch (selectedStepIndex) {
        case 0: return <PreviewAppealAxis isVideo />;
        case 1: return <PreviewCopy isVideo />;
        case 2: return <PreviewStoryboard isVideo state={state} />;
        case 3: return <PreviewNAScript state={state} />;
        case 4: return <PreviewNarration />;
        case 5: return <PreviewBGM />;
        case 6: return <PreviewVCon />;
        case 7: return <PreviewStyleFrames />;
        case 8: return <PreviewEkonte total={total} />;
        case 9: return <PreviewHorizontalVideo total={total} state={state} />;
        case 10: return <PreviewVerticalVideo total={total} state={state} />;
        default: return null;
      }
    } else {
      // Banner pipeline: 5 steps
      switch (selectedStepIndex) {
        case 0: return <PreviewAppealAxis isVideo={false} />;
        case 1: return <PreviewCopy isVideo={false} />;
        case 2: return <PreviewStoryboard isVideo={false} state={state} />;
        case 3: return <PreviewToneManner />;
        case 4: return <PreviewBannerImages total={total} />;
        default: return null;
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Completion banner */}
      {allDone && (
        <CompletionBanner total={total} onNavigate={onNavigateDashboard} />
      )}

      {step && selectedStepIndex !== null && (
        <>
          {/* Step header */}
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <step.icon className="h-5 w-5 text-secondary" />
              <h2 className="text-lg font-bold font-display">{step.label}</h2>
              <Badge className={cn(
                'ml-auto',
                completedIndexes.has(selectedStepIndex)
                  ? 'bg-success text-success-foreground'
                  : 'bg-secondary text-secondary-foreground',
              )}>
                {completedIndexes.has(selectedStepIndex) ? '完了' : '実行中'}
              </Badge>
            </div>
            {step.completedText && completedIndexes.has(selectedStepIndex) && (
              <p className="text-sm text-muted-foreground mt-1">{step.completedText}</p>
            )}
          </div>

          <Separator />

          {/* Preview content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedStepIndex}
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

          {/* Step-confirm mode approval buttons */}
          {!effectiveAutoMode && isWaitingApproval && (
            <div className="px-6 py-3 flex items-center gap-3 border-b border-border">
              <Button variant="brand" onClick={() => onApprove(selectedStepIndex)}>
                承認して次へ進む
              </Button>
              <Button variant="outline" onClick={() => onRegenerate(selectedStepIndex)}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />この工程を再生成
              </Button>
              <button onClick={onSwitchToAuto} className="text-sm text-secondary hover:underline ml-auto">
                残りを全自動で実行
              </button>
            </div>
          )}

          {/* Action bar */}
          <ActionBar step={step} stepIndex={selectedStepIndex} />
        </>
      )}
    </div>
  );
};

export default PreviewPanel;
