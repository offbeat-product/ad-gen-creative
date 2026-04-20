import { ReactNode } from 'react';
import { Target, Layout, FileText, Mic, Image as ImageIcon, Film, Maximize2 } from 'lucide-react';

const ToolPlaceholder = ({ icon, title }: { icon: ReactNode; title: string }) => (
  <div className="max-w-4xl mx-auto space-y-6 p-6">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary-wash text-primary flex items-center justify-center">
        {icon}
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
    <p className="text-muted-foreground">実装予定</p>
  </div>
);

export const AppealAxisPage = () => (
  <ToolPlaceholder icon={<Target className="h-5 w-5" />} title="訴求軸・コピー生成" />
);
export const CompositionPage = () => (
  <ToolPlaceholder icon={<Layout className="h-5 w-5" />} title="構成案・字コンテ生成" />
);
export const NarrationScriptPage = () => (
  <ToolPlaceholder icon={<FileText className="h-5 w-5" />} title="NA原稿生成" />
);
export const NarrationAudioPage = () => (
  <ToolPlaceholder icon={<Mic className="h-5 w-5" />} title="ナレーション音声生成" />
);
export const ImageGenerationPage = () => (
  <ToolPlaceholder icon={<ImageIcon className="h-5 w-5" />} title="イメージ画像生成" />
);
export const CarouselVideoPage = () => (
  <ToolPlaceholder icon={<Film className="h-5 w-5" />} title="カルーセル動画生成" />
);
export const VideoResizePage = () => (
  <ToolPlaceholder icon={<Maximize2 className="h-5 w-5" />} title="動画リサイズ" />
);
