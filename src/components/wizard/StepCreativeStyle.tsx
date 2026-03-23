import { useState } from 'react';
import { Camera, Wand2, Shuffle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState, type StyleOptions } from '@/data/wizard-data';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  state: WizardState;
  updateState: (u: Partial<WizardState>) => void;
}

const STYLES = [
  {
    id: 'photographic' as const,
    icon: Camera,
    title: '🎬 実写素材型',
    description: '写実的な広告写真をAIで生成。人物・商品・ロケーションの素材を自動作成します。',
    suited: '商品訴求、人物訴求、ライフスタイル系',
    examples: 'AGA治療（悩む男性）、レギンス（着用シーン）',
  },
  {
    id: 'motion_graphics' as const,
    icon: Wand2,
    title: '🎨 モーショングラフィックス型',
    description: 'テロップ演出・イラスト・図形を組み合わせたデザインカンプを自動生成します。',
    suited: 'サービス紹介、イベント告知、数字インパクト系',
    examples: 'LTR EXPO（就活イベント告知）、SaaS紹介',
  },
  {
    id: 'hybrid' as const,
    icon: Shuffle,
    title: '🔀 ハイブリッド型',
    description: '実写素材とモーショングラフィックスを組み合わせ。カットによって最適なスタイルをAIが判定します。',
    suited: '冒頭は実写で引き付け、後半はテロップ演出で訴求',
    examples: '冒頭実写 → 中盤テロップ → 締め実写',
  },
];

const COLOR_PRESETS = [
  { name: 'コーポレートブルー', emoji: '🔵', primary: '#1E40AF', secondary: '#3B82F6', background: '#DBEAFE' },
  { name: 'フレッシュグリーン', emoji: '🟢', primary: '#166534', secondary: '#22C55E', background: '#DCFCE7' },
  { name: 'エナジーレッド', emoji: '🔴', primary: '#991B1B', secondary: '#EF4444', background: '#FEE2E2' },
  { name: 'テックパープル', emoji: '🟣', primary: '#581C87', secondary: '#A855F7', background: '#F3E8FF' },
  { name: 'ポジティブイエロー', emoji: '🟡', primary: '#854D0E', secondary: '#EAB308', background: '#FEF9C3' },
];

const TASTES = [
  { id: 'pop_colorful', label: 'ポップ・カラフル' },
  { id: 'cool_corporate', label: 'クール・コーポレート' },
  { id: 'simple_minimal', label: 'シンプル・ミニマル' },
  { id: 'dynamic_impact', label: 'ダイナミック・インパクト' },
];

const FONT_STYLES = [
  { id: 'bold_gothic' as const, label: '太ゴシック', desc: 'インパクト系' },
  { id: 'round_gothic' as const, label: '丸ゴシック', desc: '親しみやすさ系' },
  { id: 'mincho' as const, label: '明朝', desc: '高級感・信頼感系' },
  { id: 'handwritten' as const, label: '手書き風', desc: 'カジュアル系' },
];

const ILLUSTRATION_STYLES = [
  { id: 'flat_design' as const, label: 'フラットデザイン' },
  { id: 'line_art' as const, label: '線画イラスト' },
  { id: 'isometric' as const, label: 'アイソメトリック' },
  { id: 'none' as const, label: 'なし（テロップのみ）' },
];

const StepCreativeStyle = ({ state, updateState }: Props) => {
  const [useCustomColor, setUseCustomColor] = useState(false);
  const selectedPresetIdx = COLOR_PRESETS.findIndex(
    p => p.primary === state.styleOptions.colorPalette.primary &&
         p.secondary === state.styleOptions.colorPalette.secondary
  );

  const updateStyleOptions = (partial: Partial<StyleOptions>) => {
    updateState({ styleOptions: { ...state.styleOptions, ...partial } });
  };

  const toggleTaste = (tasteId: string) => {
    const current = state.styleOptions.taste;
    const next = current.includes(tasteId)
      ? current.filter(t => t !== tasteId)
      : [...current, tasteId];
    updateStyleOptions({ taste: next });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold font-display tracking-tight">クリエイティブスタイルを選択</h2>
        <p className="text-sm text-muted-foreground mt-1">AIが生成するスタイルフレームのデザイン方向性を選択します。</p>
      </div>

      {/* Style Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STYLES.map((s) => {
          const selected = state.creativeStyle === s.id;
          return (
            <button
              key={s.id}
              onClick={() => updateState({ creativeStyle: s.id })}
              className={cn(
                "relative flex flex-col items-start gap-3 rounded-xl border-2 p-6 text-left transition-all duration-200",
                selected
                  ? "border-secondary bg-secondary-wash scale-[1.01]"
                  : "border-border bg-card hover:shadow-elevated hover:-translate-y-0.5"
              )}
            >
              {selected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                  <Check className="h-4 w-4 text-secondary-foreground" />
                </div>
              )}
              <s.icon className={cn("h-10 w-10", selected ? "text-secondary" : "text-muted-foreground")} />
              <span className="text-lg font-semibold">{s.title}</span>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              <div className="mt-auto pt-3 space-y-1 w-full">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">向いている案件:</span> {s.suited}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">例:</span> {s.examples}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Motion Graphics Options */}
      {(state.creativeStyle === 'motion_graphics' || state.creativeStyle === 'hybrid') && (
        <div className="space-y-6 rounded-xl border bg-card p-6">
          <h3 className="text-base font-semibold font-display">モーショングラフィックス設定</h3>

          {/* Taste */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">テイスト（複数選択可）</Label>
            <div className="flex flex-wrap gap-2">
              {TASTES.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleTaste(t.id)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-all",
                    state.styleOptions.taste.includes(t.id)
                      ? "border-secondary bg-secondary-wash text-secondary font-medium"
                      : "border-border bg-card hover:bg-accent"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">カラーパレット</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {COLOR_PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setUseCustomColor(false);
                    updateStyleOptions({
                      colorPalette: { primary: p.primary, secondary: p.secondary, background: p.background },
                    });
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all",
                    !useCustomColor && selectedPresetIdx === i
                      ? "border-secondary bg-secondary-wash"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <div className="flex gap-1">
                    <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: p.primary }} />
                    <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: p.secondary }} />
                    <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: p.background }} />
                  </div>
                  <span className="text-xs">{p.emoji} {p.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                checked={useCustomColor}
                onCheckedChange={(v) => setUseCustomColor(!!v)}
                id="custom-color"
              />
              <Label htmlFor="custom-color" className="text-sm">カスタムカラーを使用</Label>
            </div>

            {useCustomColor && (
              <div className="grid grid-cols-3 gap-3">
                {(['primary', 'secondary', 'background'] as const).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs capitalize">
                      {key === 'primary' ? 'メインカラー' : key === 'secondary' ? 'サブカラー' : '背景色'}
                    </Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={state.styleOptions.colorPalette[key]}
                        onChange={(e) => updateStyleOptions({
                          colorPalette: { ...state.styleOptions.colorPalette, [key]: e.target.value },
                        })}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={state.styleOptions.colorPalette[key]}
                        onChange={(e) => updateStyleOptions({
                          colorPalette: { ...state.styleOptions.colorPalette, [key]: e.target.value },
                        })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Font Style */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">テロップフォントスタイル</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FONT_STYLES.map(f => (
                <button
                  key={f.id}
                  onClick={() => updateStyleOptions({ fontStyle: f.id })}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm text-left transition-all",
                    state.styleOptions.fontStyle === f.id
                      ? "border-secondary bg-secondary-wash"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <div className="font-medium">{f.label}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Illustration Style */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">イラストスタイル</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ILLUSTRATION_STYLES.map(il => (
                <button
                  key={il.id}
                  onClick={() => updateStyleOptions({ illustrationStyle: il.id })}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm transition-all",
                    state.styleOptions.illustrationStyle === il.id
                      ? "border-secondary bg-secondary-wash"
                      : "border-border hover:bg-accent"
                  )}
                >
                  {il.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepCreativeStyle;
