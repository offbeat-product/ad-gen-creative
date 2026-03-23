import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Play, Pause, Trash2, Music, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  jobId: string;
  patternName: string;
  existingBgmUrl?: string | null;
  onUploaded: (url: string) => void;
  onDeleted: () => void;
}

const ACCEPTED_FORMATS = '.mp3,.wav,.m4a';
const MAX_SIZE_MB = 50;

const BgmUploader = ({ jobId, patternName, existingBgmUrl, onUploaded, onDeleted }: Props) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [uploading, setUploading] = useState(false);
  const [bgmUrl, setBgmUrl] = useState<string | null>(existingBgmUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setBgmUrl(existingBgmUrl ?? null);
  }, [existingBgmUrl]);

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({ title: `ファイルサイズが${MAX_SIZE_MB}MBを超えています`, variant: 'destructive' });
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp3';
    if (!['mp3', 'wav', 'm4a'].includes(ext)) {
      toast({ title: '対応していないファイル形式です（MP3, WAV, M4A）', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const path = `bgm/${jobId}/${patternName}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('audios')
      .upload(path, file, { upsert: true });

    if (error) {
      toast({ title: 'アップロードに失敗しました', description: error.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('audios').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // Update gen_patterns
    await supabase
      .from('gen_patterns')
      .update({ bgm_url: publicUrl, bgm_source: 'envato_elements' })
      .eq('job_id', jobId)
      .eq('pattern_id', patternName);

    setBgmUrl(publicUrl);
    setFileName(file.name);
    setUploading(false);
    onUploaded(publicUrl);
    toast({ title: 'BGMをアップロードしました' });
  }, [jobId, patternName, onUploaded, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async () => {
    await supabase
      .from('gen_patterns')
      .update({ bgm_url: null, bgm_source: null })
      .eq('job_id', jobId)
      .eq('pattern_id', patternName);

    setBgmUrl(null);
    setFileName(null);
    setIsPlaying(false);
    onDeleted();
    toast({ title: 'BGMを削除しました' });
  };

  const togglePlay = () => {
    if (!audioRef.current || !bgmUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnded = () => { setIsPlaying(false); setProgress(0); };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [bgmUrl]);

  if (bgmUrl) {
    const displayName = fileName || bgmUrl.split('/').pop() || 'BGM';
    return (
      <div className="space-y-2 mt-3">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-secondary" />
          <span className="text-sm font-medium">BGMアップロード済み</span>
          <Badge variant="outline" className="text-xs">Envato Elements</Badge>
        </div>
        <div className="bg-muted rounded-lg p-3 flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground shrink-0"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate">{displayName}</p>
            <div className="h-1.5 rounded-full bg-border w-full mt-1">
              <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {bgmUrl && <audio ref={audioRef} src={bgmUrl} preload="auto" />}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">BGMをアップロード</span>
      </div>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          dragOver ? 'border-secondary bg-secondary/5' : 'border-border hover:border-secondary/50',
          uploading && 'pointer-events-none opacity-60',
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-secondary animate-spin" />
            <p className="text-sm text-muted-foreground">アップロード中...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">BGMファイルをドラッグ＆ドロップ</p>
            <p className="text-xs text-muted-foreground">または クリックして選択</p>
            <p className="text-xs text-muted-foreground">対応形式: MP3, WAV, M4A</p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default BgmUploader;
