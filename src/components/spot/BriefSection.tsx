import { useEffect, useState, useCallback, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, Target, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { loadCurrentBrief, saveBriefAsNewVersion } from '@/lib/brief-persistence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';

export interface BriefData {
  ad_objective: string;
  target_audience: string;
  target_insight: string;
  lp_url: string;
  lp_summary: string;
  tone_preset: string;
  differentiation: string;
  ng_words: string[];
  reference_creatives: string;
}

export const EMPTY_BRIEF: BriefData = {
  ad_objective: '',
  target_audience: '',
  target_insight: '',
  lp_url: '',
  lp_summary: '',
  tone_preset: '',
  differentiation: '',
  ng_words: [],
  reference_creatives: '',
};

interface BriefSectionProps {
  projectId: string;
  value: BriefData;
  onChange: (brief: BriefData) => void;
  onLpScrapedContentLoaded?: (content: string | null) => void;
  onHintGenerated?: (hint: string) => void;
}

const OBJECTIVES = [
  { value: 'cvr', label: 'CVR最大化' },
  { value: 'awareness', label: '認知拡大' },
  { value: 'retention', label: 'リテンション' },
  { value: 'lead', label: 'リード獲得' },
  { value: 'other', label: 'その他' },
];

const TONES = [
  { value: 'friendly', label: '親しみやすい・カジュアル' },
  { value: 'dramatic', label: '情熱的・ドラマチック' },
  { value: 'logical', label: '論理的・信頼感' },
  { value: 'edgy', label: 'エッジィ・ユーモラス' },
];

const BriefSection = ({
  projectId,
  value,
  onChange,
  onLpScrapedContentLoaded,
  onHintGenerated,
}: BriefSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [ngInput, setNgInput] = useState('');

  const update = useCallback(
    <K extends keyof BriefData>(key: K, v: BriefData[K]) => {
      onChange({ ...value, [key]: v });
    },
    [value, onChange]
  );

  const loadFromProject = useCallback(
    async (silent = false) => {
      if (!projectId) return;
      setLoading(true);
      // 履歴対応: project_briefs(is_current=true)を最優先、無ければprojectsからフォールバック
      const loaded = await loadCurrentBrief(projectId);

      // lp_scraped_content だけは projects テーブル固有なので別途取得
      const { data: extra } = await supabase
        .from('projects')
        .select('lp_scraped_content')
        .eq('id', projectId)
        .maybeSingle();
      setLoading(false);

      if (loaded) {
        onChange(loaded);
        const hasContent =
          loaded.ad_objective ||
          loaded.target_audience ||
          loaded.target_insight ||
          loaded.lp_url ||
          loaded.tone_preset;
        if (!silent && hasContent) {
          toast.success('✓ ブリーフを読み込みました');
        }
      }
      onLpScrapedContentLoaded?.(
        (extra as { lp_scraped_content?: string | null } | null)?.lp_scraped_content ?? null
      );
    },
    [projectId, onChange, onLpScrapedContentLoaded]
  );

  // 初回マウント時に自動ロード
  useEffect(() => {
    if (projectId) loadFromProject(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleAutoGenerateBrief = async () => {
    if (!projectId) {
      toast.error('プロジェクトが選択されていません');
      return;
    }
    setIsGeneratingBrief(true);
    try {
      const response = await fetch(
        'https://offbeat-inc.app.n8n.cloud/webhook/adgen-brief-autogen',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId }),
          signal: AbortSignal.timeout(60000),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      console.log('[BriefAutogen] Response:', data);
      if (!data.success || !data.brief) {
        throw new Error(data.error || 'ブリーフデータが空で返されました');
      }
      const brief = data.brief;

      // ad_objective: label→value
      const objMatch = OBJECTIVES.find((o) => o.label === brief.ad_objective);
      const safeObjective = objMatch?.value ?? '';

      // tone_preset: label→value, custom→'custom:xxx'
      const toneMatch = TONES.find((t) => t.label === brief.tone_preset);
      let safeTone = '';
      if (toneMatch) {
        safeTone = toneMatch.value;
      } else if (brief.tone_preset === 'custom' || brief.tone_custom) {
        safeTone = `custom:${brief.tone_custom || ''}`;
      }

      const nextBrief: BriefData = {
        ad_objective: safeObjective,
        target_audience: brief.target_audience || '',
        target_insight: brief.target_insight || '',
        lp_url: brief.lp_url || '',
        lp_summary: brief.lp_summary || '',
        tone_preset: safeTone,
        differentiation: brief.differentiation || '',
        ng_words: Array.isArray(brief.ng_words) ? brief.ng_words : [],
        reference_creatives: brief.reference_creatives || '',
      };
      onChange(nextBrief);

      // 履歴に新バージョンとして保存(source='ai_autogen')
      saveBriefAsNewVersion(
        projectId,
        { ...nextBrief, hint: typeof brief.hint === 'string' ? brief.hint : undefined },
        'ai_autogen',
        'AI自動生成による作成'
      ).catch((e) => console.error('[BriefAutogen] persist error:', e));

      if (typeof brief.hint === 'string') {
        onHintGenerated?.(brief.hint);
      }

      const info = data.source_count || {};
      const infoMsg = [
        info.reference_materials_count ? `参考資料 ${info.reference_materials_count}件` : null,
        info.has_lp_info ? 'LP情報' : null,
        info.has_ad_gen_info ? '登録済み企画情報' : null,
      ]
        .filter(Boolean)
        .join(' / ');
      toast.success(
        `広告ブリーフを自動生成しました${infoMsg ? `\n(参照元: ${infoMsg})` : ''}`
      );
    } catch (error) {
      console.error('[BriefAutogen] Error:', error);
      toast.error(
        `ブリーフの自動生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  // tone_preset: 'friendly'|'dramatic'|'logical'|'edgy'|'custom:xxx'
  const isCustomTone = value.tone_preset.startsWith('custom:');
  const toneRadioValue = isCustomTone ? 'custom' : value.tone_preset;
  const customToneText = isCustomTone ? value.tone_preset.slice('custom:'.length) : '';

  const setToneRadio = (v: string) => {
    if (v === 'custom') {
      update('tone_preset', 'custom:');
    } else {
      update('tone_preset', v);
    }
  };

  const setCustomToneText = (text: string) => {
    update('tone_preset', `custom:${text}`);
  };

  const addNgWord = (word: string) => {
    const w = word.trim();
    if (!w) return;
    if (value.ng_words.includes(w)) return;
    update('ng_words', [...value.ng_words, w]);
  };

  const removeNgWord = (word: string) => {
    update(
      'ng_words',
      value.ng_words.filter((w) => w !== word)
    );
  };

  const handleNgKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addNgWord(ngInput);
      setNgInput('');
    } else if (e.key === 'Backspace' && !ngInput && value.ng_words.length > 0) {
      removeNgWord(value.ng_words[value.ng_words.length - 1]);
    }
  };

  return (
    <Accordion type="single" collapsible defaultValue="brief" className="w-full">
      <AccordionItem
        value="brief"
        className="rounded-xl border bg-card overflow-hidden"
      >
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex items-center gap-2 text-left">
            <Target className="h-4 w-4 text-secondary" />
            <span className="font-semibold text-sm">
              🎯 広告ブリーフ
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              (精度を大きく左右します)
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* AI自動生成ボタン */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="brand"
                size="lg"
                onClick={handleAutoGenerateBrief}
                disabled={isGeneratingBrief || !projectId}
                title="プロジェクト情報・オリエンシート等からAIがブリーフを一括作成します"
              >
                {isGeneratingBrief ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    AIで自動生成
                  </>
                )}
              </Button>
            </div>

            {/* ① 広告の目的 */}
            <div className="space-y-2">
              <Label>
                ① 広告の目的 <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={value.ad_objective}
                onValueChange={(v) => update('ad_objective', v)}
                className="grid grid-cols-2 md:grid-cols-3 gap-2"
              >
                {OBJECTIVES.map((o) => (
                  <label
                    key={o.value}
                    className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 cursor-pointer hover:bg-accent/30"
                  >
                    <RadioGroupItem value={o.value} />
                    <span className="text-sm">{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* ② ターゲット */}
            <div className="space-y-2">
              <Label htmlFor="target_audience">
                ② ターゲット <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="target_audience"
                rows={3}
                value={value.target_audience}
                onChange={(e) => update('target_audience', e.target.value)}
                placeholder="例: 20代後半〜30代前半女性、仕事は忙しいがプライベートで息抜きを求める..."
              />
            </div>

            {/* ③ ターゲットのインサイト */}
            <div className="space-y-2">
              <Label htmlFor="target_insight">
                ③ ターゲットのインサイト{' '}
                <span className="text-xs text-muted-foreground">推奨</span>
              </Label>
              <Textarea
                id="target_insight"
                rows={3}
                value={value.target_insight}
                onChange={(e) => update('target_insight', e.target.value)}
                placeholder="例:「ストレスから逃げ出したい」「現実逃避したいけど罪悪感も」..."
              />
            </div>

            {/* ④ LP URL / 参考資料 */}
            <div className="space-y-2">
              <Label htmlFor="lp_url">
                ④ LP URL / 参考資料{' '}
                <span className="text-xs text-muted-foreground">推奨</span>
              </Label>
              <Input
                id="lp_url"
                type="url"
                value={value.lp_url}
                onChange={(e) => update('lp_url', e.target.value)}
                placeholder="https://www.cmoa.jp/..."
              />
              <p className="text-xs text-muted-foreground">
                URLを入れると生成時に自動でLP内容を読み取ります
              </p>
              <Textarea
                rows={2}
                value={value.lp_summary}
                onChange={(e) => update('lp_summary', e.target.value)}
                placeholder="LP内容サマリー (URLを入れない場合はこちらに主要な魅力ポイントを入力)"
              />
            </div>

            {/* ⑤ トンマナ */}
            <div className="space-y-2">
              <Label>
                ⑤ トンマナ <span className="text-xs text-muted-foreground">推奨</span>
              </Label>
              <RadioGroup
                value={toneRadioValue}
                onValueChange={setToneRadio}
                className="space-y-2"
              >
                {TONES.map((t) => (
                  <label
                    key={t.value}
                    className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 cursor-pointer hover:bg-accent/30"
                  >
                    <RadioGroupItem value={t.value} />
                    <span className="text-sm">{t.label}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 cursor-pointer hover:bg-accent/30">
                  <RadioGroupItem value="custom" />
                  <span className="text-sm whitespace-nowrap">カスタム:</span>
                  <Input
                    value={customToneText}
                    onChange={(e) => setCustomToneText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => {
                      if (!isCustomTone) setToneRadio('custom');
                    }}
                    placeholder="自由記述"
                    className="h-8"
                  />
                </label>
              </RadioGroup>
            </div>

            {/* ⑥ 競合・差別化ポイント */}
            <div className="space-y-2">
              <Label htmlFor="differentiation">
                ⑥ 競合・差別化ポイント{' '}
                <span className="text-xs text-muted-foreground">任意</span>
              </Label>
              <Textarea
                id="differentiation"
                rows={2}
                value={value.differentiation}
                onChange={(e) => update('differentiation', e.target.value)}
                placeholder="競合と比べた強み、独自のポジションなど"
              />
            </div>

            {/* ⑦ NGワード */}
            <div className="space-y-2">
              <Label>
                ⑦ NGワード <span className="text-xs text-muted-foreground">任意</span>
              </Label>
              <div className="flex flex-wrap gap-2 items-center rounded-lg border bg-background px-3 py-2 min-h-[42px]">
                {value.ng_words.map((w) => (
                  <Badge
                    key={w}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {w}
                    <button
                      type="button"
                      onClick={() => removeNgWord(w)}
                      className="rounded-full hover:bg-destructive/20 p-0.5"
                      aria-label={`${w}を削除`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  value={ngInput}
                  onChange={(e) => setNgInput(e.target.value)}
                  onKeyDown={handleNgKeyDown}
                  onBlur={() => {
                    if (ngInput.trim()) {
                      addNgWord(ngInput);
                      setNgInput('');
                    }
                  }}
                  placeholder={
                    value.ng_words.length === 0
                      ? '例: 絶対, 完全, 100% (Enter or , で追加)'
                      : '追加...'
                  }
                  className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
                />
              </div>
            </div>

            {/* ⑧ 参考クリエイティブ */}
            <div className="space-y-2">
              <Label htmlFor="reference_creatives">
                ⑧ 参考クリエイティブ{' '}
                <span className="text-xs text-muted-foreground">任意</span>
              </Label>
              <Textarea
                id="reference_creatives"
                rows={3}
                value={value.reference_creatives}
                onChange={(e) => update('reference_creatives', e.target.value)}
                placeholder="過去の成功コピーや参考にしたい表現を自由に記述"
              />
            </div>
          </motion.div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default BriefSection;
