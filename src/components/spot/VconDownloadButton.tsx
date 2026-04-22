import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { VconCut } from './VConResult';

interface Props {
  cuts: VconCut[];
  narrationUrl: string | null;
  bgmUrl: string | null;
  totalDuration: number;
  bgmVolume?: number;
  narrationVolume?: number;
}

/**
 * Records the V-Con (telop animation + narration + BGM) into a downloadable
 * video file using Canvas + MediaRecorder, no backend required.
 */
const VconDownloadButton = ({
  cuts,
  narrationUrl,
  bgmUrl,
  totalDuration,
  bgmVolume = 0.3,
  narrationVolume = 1.0,
}: Props) => {
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadAudioElement = async (
    url: string,
    loop: boolean,
  ): Promise<{ el: HTMLAudioElement; cleanup: () => void }> => {
    // Try direct CORS first
    const tryLoad = (src: string, crossOrigin: 'anonymous' | null) =>
      new Promise<HTMLAudioElement>((resolve, reject) => {
        const el = new Audio();
        if (crossOrigin) el.crossOrigin = crossOrigin;
        el.loop = loop;
        el.preload = 'auto';
        el.src = src;
        const onLoaded = () => {
          el.removeEventListener('loadedmetadata', onLoaded);
          el.removeEventListener('error', onError);
          resolve(el);
        };
        const onError = () => {
          el.removeEventListener('loadedmetadata', onLoaded);
          el.removeEventListener('error', onError);
          reject(new Error('audio load failed'));
        };
        el.addEventListener('loadedmetadata', onLoaded);
        el.addEventListener('error', onError);
        el.load();
      });

    try {
      const el = await tryLoad(url, 'anonymous');
      return { el, cleanup: () => el.pause() };
    } catch {
      // Fallback: fetch as blob then play from blob URL
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const el = await tryLoad(blobUrl, null);
      return {
        el,
        cleanup: () => {
          el.pause();
          URL.revokeObjectURL(blobUrl);
        },
      };
    }
  };

  const handleDownload = async () => {
    if (cuts.length === 0) return;
    setIsRecording(true);
    setProgress(0);

    let audioContext: AudioContext | null = null;
    const cleanups: Array<() => void> = [];

    try {
      // 1. Canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Audio mix
      audioContext = new AudioContext();
      const audioDestination = audioContext.createMediaStreamDestination();

      let narrationEl: HTMLAudioElement | null = null;
      if (narrationUrl) {
        try {
          const { el, cleanup } = await loadAudioElement(narrationUrl, false);
          narrationEl = el;
          cleanups.push(cleanup);
          const src = audioContext.createMediaElementSource(el);
          const gain = audioContext.createGain();
          gain.gain.value = narrationVolume;
          src.connect(gain);
          gain.connect(audioDestination);
        } catch (e) {
          console.error('[Vcon Download] narration load error:', e);
        }
      }

      let bgmEl: HTMLAudioElement | null = null;
      if (bgmUrl) {
        try {
          const { el, cleanup } = await loadAudioElement(bgmUrl, true);
          bgmEl = el;
          cleanups.push(cleanup);
          const src = audioContext.createMediaElementSource(el);
          const gain = audioContext.createGain();
          gain.gain.value = bgmVolume;
          src.connect(gain);
          gain.connect(audioDestination);
        } catch (e) {
          console.error('[Vcon Download] bgm load error:', e);
        }
      }

      // 3. Combined stream
      const canvasStream = canvas.captureStream(30);
      const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      if (narrationEl || bgmEl) {
        tracks.push(...audioDestination.stream.getAudioTracks());
      }
      const combinedStream = new MediaStream(tracks);

      // 4. Recorder
      const mp4Type = 'video/mp4;codecs=avc1,mp4a.40.2';
      const webmType = 'video/webm;codecs=vp9,opus';
      const webmFallback = 'video/webm';
      let mimeType = '';
      let extension = 'webm';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mp4Type)) {
        mimeType = mp4Type;
        extension = 'mp4';
      } else if (MediaRecorder.isTypeSupported(webmType)) {
        mimeType = webmType;
        extension = 'webm';
      } else {
        mimeType = webmFallback;
        extension = 'webm';
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 4_000_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const finishPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      recorder.start();

      // 5. Start audio
      if (narrationEl) {
        try {
          narrationEl.currentTime = 0;
          await narrationEl.play();
        } catch (e) {
          console.error('[Vcon Download] narration play error:', e);
        }
      }
      if (bgmEl) {
        try {
          bgmEl.currentTime = 0;
          await bgmEl.play();
        } catch (e) {
          console.error('[Vcon Download] bgm play error:', e);
        }
      }

      // 6. Animate
      const startTime = performance.now();
      const totalMs = totalDuration * 1000;

      await new Promise<void>((resolve) => {
        const drawFrame = () => {
          const elapsed = performance.now() - startTime;
          const elapsedSec = elapsed / 1000;
          setProgress(Math.min((elapsed / totalMs) * 100, 100));

          if (elapsed >= totalMs) {
            try {
              recorder.stop();
            } catch {
              /* ignore */
            }
            resolve();
            return;
          }

          const currentCut =
            cuts.find((c) => elapsedSec >= c.time_start && elapsedSec < c.time_end) ??
            cuts[cuts.length - 1];

          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          if (currentCut) {
            const isBottomLeft = currentCut.text_position === 'bottom-left';
            const isLarge = currentCut.text_size === 'large';
            const isSmall = currentCut.text_size === 'small';
            const fontSize = isLarge ? 80 : isSmall ? 36 : 64;
            const fontWeight = isLarge ? 'bold' : 'normal';

            ctx.fillStyle = '#FFFFFF';
            ctx.font = `${fontWeight} ${fontSize}px "Noto Sans JP", "Hiragino Sans", sans-serif`;
            ctx.textBaseline = 'middle';

            const lines = (currentCut.telop || '').split('\n');
            const lineHeight = fontSize * 1.25;

            if (isBottomLeft) {
              ctx.textAlign = 'left';
              const baseY = canvas.height - 80 - (lines.length - 1) * lineHeight;
              lines.forEach((line, idx) => {
                ctx.fillText(line, 60, baseY + idx * lineHeight);
              });
            } else {
              ctx.textAlign = 'center';
              const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
              lines.forEach((line, idx) => {
                ctx.fillText(line, canvas.width / 2, startY + idx * lineHeight);
              });
            }

            if (currentCut.annotations && currentCut.annotations.length > 0) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
              ctx.font = '22px "Noto Sans JP", "Hiragino Sans", sans-serif';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'bottom';
              const ann = currentCut.annotations;
              ann.forEach((note, i) => {
                ctx.fillText(note, 30, canvas.height - 20 - (ann.length - 1 - i) * 28);
              });
            }
          }

          requestAnimationFrame(drawFrame);
        };
        requestAnimationFrame(drawFrame);
      });

      // 7. Finalize
      const blob = await finishPromise;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vcon_${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('動画をダウンロードしました');
    } catch (err) {
      console.error('[Vcon Download] Error:', err);
      toast.error(`動画ダウンロードに失敗しました: ${(err as Error).message}`);
    } finally {
      cleanups.forEach((c) => {
        try {
          c();
        } catch {
          /* ignore */
        }
      });
      if (audioContext) {
        try {
          await audioContext.close();
        } catch {
          /* ignore */
        }
      }
      setIsRecording(false);
      setProgress(0);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isRecording || cuts.length === 0}
      variant="outline"
      size="sm"
    >
      {isRecording ? (
        <>
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          録画中... {progress.toFixed(0)}%
        </>
      ) : (
        <>
          <Download className="h-3.5 w-3.5 mr-1" /> 動画をダウンロード
        </>
      )}
    </Button>
  );
};

export default VconDownloadButton;
