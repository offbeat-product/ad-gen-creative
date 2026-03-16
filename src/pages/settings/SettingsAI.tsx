import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const SettingsAI = () => {
  const { toast } = useToast();
  const [creativeType, setCreativeType] = useState('動画');
  const [duration, setDuration] = useState('30秒');
  const [genMode, setGenMode] = useState('全自動モード');
  const [appealCount, setAppealCount] = useState([3]);
  const [copyCount, setCopyCount] = useState([3]);
  const [toneCount, setToneCount] = useState([2]);
  const [voiceType, setVoiceType] = useState('女性ナチュラル');
  const [copyTone, setCopyTone] = useState('親しみやすい');
  const [template, setTemplate] = useState('冒頭→前半→後半→締め');
  const [resolution, setResolution] = useState('1920×1080');
  const [autoResize, setAutoResize] = useState(true);
  const [imageFormat, setImageFormat] = useState('PNG');

  const total = appealCount[0] * copyCount[0] * toneCount[0];

  const resetDefaults = () => {
    setCreativeType('動画'); setDuration('30秒'); setGenMode('全自動モード');
    setAppealCount([3]); setCopyCount([3]); setToneCount([2]);
    setVoiceType('女性ナチュラル'); setCopyTone('親しみやすい'); setTemplate('冒頭→前半→後半→締め');
    setResolution('1920×1080'); setAutoResize(true); setImageFormat('PNG');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
      {/* Section 1: Default Creative Settings */}
      <Card>
        <CardHeader><CardTitle className="text-base">デフォルトクリエイティブ設定</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">クリエイティブタイプ</Label>
            <RadioGroup value={creativeType} onValueChange={setCreativeType} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="静止画バナー" id="ct-static" /><Label htmlFor="ct-static">静止画バナー</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="動画" id="ct-video" /><Label htmlFor="ct-video">動画</Label></div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">動画デフォルト尺</Label>
            <RadioGroup value={duration} onValueChange={setDuration} className="flex gap-4">
              {['15秒', '30秒', '60秒'].map(d => (
                <div key={d} className="flex items-center gap-2"><RadioGroupItem value={d} id={`dur-${d}`} /><Label htmlFor={`dur-${d}`}>{d}</Label></div>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">デフォルト生成モード</Label>
            <RadioGroup value={genMode} onValueChange={setGenMode} className="flex gap-4">
              {['全自動モード', 'ステップ確認モード'].map(m => (
                <div key={m} className="flex items-center gap-2"><RadioGroupItem value={m} id={`gm-${m}`} /><Label htmlFor={`gm-${m}`}>{m}</Label></div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Default Pattern Count */}
      <Card>
        <CardHeader><CardTitle className="text-base">デフォルトパターン数</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {[
            { label: '訴求軸パターン数', value: appealCount, set: setAppealCount },
            { label: 'コピーパターン数', value: copyCount, set: setCopyCount },
            { label: 'トンマナパターン数', value: toneCount, set: setToneCount },
          ].map(({ label, value, set }) => (
            <div key={label} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{label}</Label>
                <span className="text-lg font-bold text-secondary tabular-nums">{value[0]}</span>
              </div>
              <Slider value={value} onValueChange={set} min={1} max={10} step={1} />
            </div>
          ))}
          <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
            デフォルト: <span className="font-semibold text-foreground">{total}本</span>（{appealCount[0]}×{copyCount[0]}×{toneCount[0]}）
          </div>
        </CardContent>
      </Card>

      {/* Section 3: AI Quality Settings */}
      <Card>
        <CardHeader><CardTitle className="text-base">AI生成品質設定</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <SettingSelect label="ナレーション音声タイプ" value={voiceType} onValueChange={setVoiceType}
            options={['女性ナチュラル', '男性ナチュラル', '女性プロフェッショナル', '男性プロフェッショナル']} />
          <SettingSelect label="コピートーン" value={copyTone} onValueChange={setCopyTone}
            options={['親しみやすい', 'プロフェッショナル', '緊急感', 'ナチュラル', 'カジュアル']} />
          <SettingSelect label="構成案テンプレート" value={template} onValueChange={setTemplate}
            options={['冒頭→前半→後半→締め', '問題提起→共感→解決→CTA', 'ストーリー型', '比較型']} />
        </CardContent>
      </Card>

      {/* Section 4: Output Settings */}
      <Card>
        <CardHeader><CardTitle className="text-base">出力設定</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <SettingSelect label="動画解像度" value={resolution} onValueChange={setResolution}
            options={['1920×1080（フルHD）', '1280×720（HD）', '3840×2160（4K）']} />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">自動縦動画リサイズ</Label>
              <p className="text-xs text-muted-foreground mt-0.5">横動画生成後に自動で縦動画（9:16）にリサイズします</p>
            </div>
            <Switch checked={autoResize} onCheckedChange={setAutoResize} />
          </div>
          <SettingSelect label="静止画出力形式" value={imageFormat} onValueChange={setImageFormat}
            options={['PNG', 'JPG', 'WebP']} />
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-4">
        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => toast({ title: 'AI生成設定を保存しました' })}>
          設定を保存
        </Button>
        <button onClick={resetDefaults} className="text-sm text-secondary hover:underline">デフォルトに戻す</button>
      </div>
    </motion.div>
  );
};

function SettingSelect({ label, value, onValueChange, options }: { label: string; value: string; onValueChange: (v: string) => void; options: string[] }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full max-w-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export default SettingsAI;
