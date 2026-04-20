import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'adgen.user_preferences';

interface UserPreferences {
  default_voice_id: string;
  default_voice_speed: number;
  default_banner_style: string;
  default_image_style: string;
  default_duration_seconds: number;
  default_aspect_ratio: string;
}

const DEFAULTS: UserPreferences = {
  default_voice_id: 'female_a',
  default_voice_speed: 1.0,
  default_banner_style: 'photographic',
  default_image_style: 'photographic',
  default_duration_seconds: 30,
  default_aspect_ratio: '9:16',
};

function loadPrefs(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

const SettingsAI = () => {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULTS);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    toast({ title: 'デフォルト値を保存しました' });
  };

  const handleReset = () => {
    setPrefs(DEFAULTS);
    localStorage.removeItem(STORAGE_KEY);
    toast({ title: 'デフォルト値をリセットしました' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        各ツールの初期値として使われる、よく使う設定を保存できます。
      </p>

      {/* Narration */}
      <Card>
        <CardHeader><CardTitle className="text-base">ナレーション音声</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">デフォルト声優</Label>
            <RadioGroup
              value={prefs.default_voice_id}
              onValueChange={(v) => update('default_voice_id', v)}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
              {[
                { value: 'male_a', label: '男性A' },
                { value: 'male_b', label: '男性B' },
                { value: 'female_a', label: '女性A' },
                { value: 'female_b', label: '女性B' },
              ].map((v) => (
                <div key={v.value} className="flex items-center gap-2 border rounded-lg px-3 py-2">
                  <RadioGroupItem value={v.value} id={`voice-${v.value}`} />
                  <Label htmlFor={`voice-${v.value}`} className="cursor-pointer">{v.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">デフォルト速度</Label>
              <span className="text-sm font-bold text-secondary tabular-nums">{prefs.default_voice_speed.toFixed(1)}x</span>
            </div>
            <Slider
              value={[prefs.default_voice_speed]}
              onValueChange={(v) => update('default_voice_speed', v[0])}
              min={0.5}
              max={2.0}
              step={0.1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5x (遅い)</span>
              <span>1.0x (標準)</span>
              <span>2.0x (速い)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image styles */}
      <Card>
        <CardHeader><CardTitle className="text-base">画像生成スタイル</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <StyleSelect
            label="バナー画像のデフォルトスタイル"
            value={prefs.default_banner_style}
            onChange={(v) => update('default_banner_style', v)}
          />
          <StyleSelect
            label="絵コンテ画像のデフォルトスタイル"
            value={prefs.default_image_style}
            onChange={(v) => update('default_image_style', v)}
          />
        </CardContent>
      </Card>

      {/* Video defaults */}
      <Card>
        <CardHeader><CardTitle className="text-base">動画デフォルト</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">デフォルト動画尺</Label>
            <RadioGroup
              value={String(prefs.default_duration_seconds)}
              onValueChange={(v) => update('default_duration_seconds', Number(v))}
              className="flex gap-4"
            >
              {[15, 30, 60].map((d) => (
                <div key={d} className="flex items-center gap-2 border rounded-lg px-3 py-2">
                  <RadioGroupItem value={String(d)} id={`dur-${d}`} />
                  <Label htmlFor={`dur-${d}`} className="cursor-pointer">{d}秒</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">デフォルトアスペクト比</Label>
            <RadioGroup
              value={prefs.default_aspect_ratio}
              onValueChange={(v) => update('default_aspect_ratio', v)}
              className="flex gap-4"
            >
              {[
                { value: '9:16', label: '9:16 (縦)' },
                { value: '16:9', label: '16:9 (横)' },
                { value: '1:1', label: '1:1 (正方形)' },
              ].map((a) => (
                <div key={a.value} className="flex items-center gap-2 border rounded-lg px-3 py-2">
                  <RadioGroupItem value={a.value} id={`ar-${a.value}`} />
                  <Label htmlFor={`ar-${a.value}`} className="cursor-pointer">{a.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleSave}>
          デフォルト値を保存
        </Button>
        <button onClick={handleReset} className="text-sm text-secondary hover:underline">
          初期設定に戻す
        </button>
      </div>
    </motion.div>
  );
};

function StyleSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const options = [
    { value: 'photographic', label: 'リアル' },
    { value: 'illustration', label: 'イラスト' },
    { value: 'motion_graphics', label: 'モーショングラフィックス' },
  ];
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((o) => (
          <div key={o.value} className="flex items-center gap-2 border rounded-lg px-3 py-2">
            <RadioGroupItem value={o.value} id={`${label}-${o.value}`} />
            <Label htmlFor={`${label}-${o.value}`} className="cursor-pointer">{o.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

export default SettingsAI;
