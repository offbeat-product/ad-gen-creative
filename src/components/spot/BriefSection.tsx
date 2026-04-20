import { useEffect, useState, useCallback, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Download, Save, Loader2, Target, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
}: BriefSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
      const { data, error } = await supabase
        .from('projects')
        .select(
          'ad_objective, target_audience, target_insight, lp_url, lp_summary, tone_preset, differentiation, ng_words, reference_creatives, lp_scraped_content'
        )
        .eq('id', projectId)
        .single();
      setLoading(false);

      if (error) {
        if (!silent) toast.error(`読み込み失敗: ${error.message}`);
        return;
      }
      if (!data) return;

      const loaded: BriefData = {
        ad_objective: (data as any).ad_objective ?? '',
        target_audience: (data as any).target_audience ?? '',
        target_insight: (data as any).target_insight ?? '',
        lp_url: (data as any).lp_url ?? '',
        lp_summary: (data as any).lp_summary ?? '',
        tone_preset: (data as any).tone_preset ?? '',
        differentiation: (data as any).differentiation ?? '',
        ng_words: ((data as any).ng_words ?? []) as string[],
        reference_creatives: (data as any).reference_creatives ?? '',
      };
      onChange(loaded);
      onLpScrapedContentLoaded?.((data as any).lp_scraped_content ?? null);

      const hasContent =
        loaded.ad_objective ||
        loaded.target_audience ||
        loaded.target_insight ||
        loaded.lp_url ||
        loaded.tone_preset;
      if (!silent && hasContent) {
        toast.success('✓ ブリーフを読み込みました');
      }
    },
    [projectId, onChange, onLpScrapedContentLoaded]
  );

  // 初回マウント時に自動ロード
  useEffect(() => {
    if (projectId) loadFromProject(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const saveToProject = async () => {
    if (!projectId) return;
    setSaving(true);
    const { error } = await supabase
      .from('projects')
      .update({
        ad_objective: value.ad_objective || null,
        target_audience: value.target_audience || null,
        target_insight: value.target_insight || null,
        lp_url: value.lp_url || null,
        lp_summary: value.lp_summary || null,
        tone_preset: value.tone_preset || null,
        differentiation: value.differentiation || null,
        ng_words: value.ng_words.length > 0 ? value.ng_words : null,
        reference_creatives: value.reference_creatives || null,
      } as any)
      .eq('id', projectId);
    setSaving(false);

    if (error) {
      toast.error(`保存失敗: ${error.message}`);
      return;
    }
    toast.success('✓ 案件にブリーフを保存しました');
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
            {/* アクションボタン */}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadFromProject(false)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Download className="h-3 w-3 mr-1" />
                )}
                保存済みブリーフを読み込み
              </Button>
              <Button
                variant="brand"
                size="sm"
                onClick={saveToProject}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                ブリーフを案件に保存
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
