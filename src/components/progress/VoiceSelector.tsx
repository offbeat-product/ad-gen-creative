import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const VOICE_OPTIONS = [
  {
    id: '3JDquces8E8bkmvbh6Bc',
    name: '男性ボイス A',
    gender: 'male' as const,
    description: 'はっきりした発声、広告ナレーション向き',
  },
  {
    id: 'j210dv0vWm7fCknyQpbA',
    name: '男性ボイス B',
    gender: 'male' as const,
    description: '落ち着いたトーン、説明・解説向き',
  },
  {
    id: 'T7yYq3WpB94yAuOXraRi',
    name: '女性ボイス A',
    gender: 'female' as const,
    description: '明るく親しみやすい、広告ナレーション向き',
  },
  {
    id: 'WQz3clzUdMqvBf0jswZQ',
    name: '女性ボイス B',
    gender: 'female' as const,
    description: '落ち着いたトーン、信頼感のある声',
  },
];

interface Props {
  onGenerate: (voiceId: string) => void;
  loading?: boolean;
}

const VoiceSelector = ({ onGenerate, loading }: Props) => {
  const [selectedVoiceId, setSelectedVoiceId] = useState(VOICE_OPTIONS[0].id);

  const maleVoices = VOICE_OPTIONS.filter(v => v.gender === 'male');
  const femaleVoices = VOICE_OPTIONS.filter(v => v.gender === 'female');

  const renderCards = (voices: typeof VOICE_OPTIONS) =>
    voices.map(voice => {
      const isSelected = selectedVoiceId === voice.id;
      return (
        <motion.div
          key={voice.id}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setSelectedVoiceId(voice.id)}
          className={cn(
            'relative rounded-xl p-4 cursor-pointer transition-all border-2',
            isSelected
              ? 'border-transparent bg-card shadow-md'
              : 'border-border bg-card hover:border-muted-foreground/30',
          )}
          style={isSelected ? {
            borderImage: 'linear-gradient(135deg, hsl(var(--brand-sky)), hsl(var(--brand-periwinkle))) 1',
            borderImageSlice: 1,
          } : undefined}
        >
          {/* Gradient border overlay for selected */}
          {isSelected && (
            <div className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, hsl(199 89% 48% / 0.06), hsl(241 100% 74% / 0.06))',
              }}
            />
          )}
          <div className="flex items-start gap-3 relative">
            <div className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
              isSelected ? 'border-secondary' : 'border-muted-foreground/40',
            )}>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2.5 h-2.5 rounded-full brand-gradient-bg"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold', isSelected && 'text-secondary')}>
                {voice.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{voice.description}</p>
            </div>
            <Mic className={cn('h-4 w-4 shrink-0', isSelected ? 'text-secondary' : 'text-muted-foreground')} />
          </div>
        </motion.div>
      );
    });

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-base font-bold font-display">ナレーション音声のボイスを選択</h3>
        <p className="text-sm text-muted-foreground">NA原稿をAI音声で読み上げます。お好みのボイスを選んでください。</p>
      </div>

      <Tabs defaultValue="male" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="male" className="flex-1">男性ボイス</TabsTrigger>
          <TabsTrigger value="female" className="flex-1">女性ボイス</TabsTrigger>
        </TabsList>
        <TabsContent value="male">
          <div className="space-y-3 mt-3">{renderCards(maleVoices)}</div>
        </TabsContent>
        <TabsContent value="female">
          <div className="space-y-3 mt-3">{renderCards(femaleVoices)}</div>
        </TabsContent>
      </Tabs>

      <Button
        variant="brand"
        size="lg"
        className="w-full"
        onClick={() => onGenerate(selectedVoiceId)}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ナレーション音声を生成中...
          </>
        ) : (
          <>
            <Mic className="h-4 w-4 mr-2" />
            この声でナレーションを生成
          </>
        )}
      </Button>
    </div>
  );
};

export default VoiceSelector;
