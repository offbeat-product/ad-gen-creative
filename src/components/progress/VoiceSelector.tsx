import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Loader2, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const VOICE_OPTIONS = {
  male: [
    {
      id: '3JDquces8E8bkmvbh6Bc',
      name: '男性ボイス A',
      description: 'はっきりした発声、広告ナレーション向き',
    },
    {
      id: 'j210dv0vWm7fCknyQpbA',
      name: '男性ボイス B',
      description: '落ち着いたトーン、説明・解説向き',
    },
  ],
  female: [
    {
      id: 'T7yYq3WpB94yAuOXraRi',
      name: '女性ボイス A',
      description: '明るく親しみやすい、広告ナレーション向き',
    },
    {
      id: 'WQz3clzUdMqvBf0jswZQ',
      name: '女性ボイス B',
      description: '落ち着いたトーン、信頼感のある声',
    },
  ],
};

const VOICE_SAMPLES: Record<string, string> = {
  '3JDquces8E8bkmvbh6Bc': 'https://storage.googleapis.com/eleven-public-cdn/premade/voices/3JDquces8E8bkmvbh6Bc/preview.mp3',
  'j210dv0vWm7fCknyQpbA': 'https://storage.googleapis.com/eleven-public-cdn/premade/voices/j210dv0vWm7fCknyQpbA/preview.mp3',
  'T7yYq3WpB94yAuOXraRi': 'https://storage.googleapis.com/eleven-public-cdn/premade/voices/T7yYq3WpB94yAuOXraRi/preview.mp3',
  'WQz3clzUdMqvBf0jswZQ': 'https://storage.googleapis.com/eleven-public-cdn/premade/voices/WQz3clzUdMqvBf0jswZQ/preview.mp3',
};

interface Props {
  onGenerate: (voiceIdA: string, voiceIdB: string, gender: 'male' | 'female') => void;
  loading?: boolean;
}

const SamplePlayer = ({ voiceId }: { voiceId: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  const sampleUrl = VOICE_SAMPLES[voiceId];

  const toggle = () => {
    if (!audioRef.current || !sampleUrl) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setError(true));
      setPlaying(true);
    }
  };

  if (!sampleUrl || error) {
    return <p className="text-xs text-muted-foreground mt-2">サンプル準備中</p>;
  }

  return (
    <div className="mt-3">
      <button
        onClick={toggle}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium brand-gradient-bg text-primary-foreground hover:opacity-90 transition-opacity"
      >
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        サンプル試聴
      </button>
      <audio
        ref={audioRef}
        src={sampleUrl}
        onEnded={() => setPlaying(false)}
        onError={() => setError(true)}
        preload="none"
      />
    </div>
  );
};

const VoiceSelector = ({ onGenerate, loading }: Props) => {
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');

  const voices = VOICE_OPTIONS[selectedGender];

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h3 className="text-base font-bold font-display">🎙️ ナレーションのボイスを選択</h3>
        <p className="text-sm text-muted-foreground">性別を選んでサンプルを試聴。2つのボイスで一括生成し、比較できます。</p>
      </div>

      <Tabs defaultValue="male" onValueChange={(v) => setSelectedGender(v as 'male' | 'female')} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="male" className="flex-1">男性ボイス</TabsTrigger>
          <TabsTrigger value="female" className="flex-1">女性ボイス</TabsTrigger>
        </TabsList>
        <TabsContent value="male">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {VOICE_OPTIONS.male.map(voice => (
              <VoiceCard key={voice.id} voice={voice} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="female">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {VOICE_OPTIONS.female.map(voice => (
              <VoiceCard key={voice.id} voice={voice} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center">
        ※ 2つのボイスでナレーションを生成し、比較試聴後にどちらかを選べます
      </p>

      <Button
        variant="brand"
        size="lg"
        className="w-full"
        onClick={() => onGenerate(voices[0].id, voices[1].id, selectedGender)}
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
            この2つの声でナレーションを生成
          </>
        )}
      </Button>
    </div>
  );
};

const VoiceCard = ({ voice }: { voice: { id: string; name: string; description: string } }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    className="rounded-xl p-4 bg-card border border-border shadow-sm space-y-1"
  >
    <div className="flex items-center gap-2">
      <Mic className="h-4 w-4 text-secondary" />
      <p className="text-sm font-semibold">{voice.name}</p>
    </div>
    <p className="text-xs text-muted-foreground">{voice.description}</p>
    <SamplePlayer voiceId={voice.id} />
  </motion.div>
);

export default VoiceSelector;
