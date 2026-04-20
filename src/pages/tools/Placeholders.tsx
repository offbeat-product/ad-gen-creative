import { Sparkles } from 'lucide-react';

interface ToolPlaceholderProps {
  emoji: string;
  title: string;
  description: string;
}

const ToolPlaceholder = ({ emoji, title, description }: ToolPlaceholderProps) => (
  <div className="max-w-3xl mx-auto p-6 space-y-6">
    <div className="space-y-1">
      <h1 className="text-2xl font-bold font-display">
        {emoji} {title}
      </h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="rounded-2xl border border-dashed bg-gradient-to-br from-secondary-wash/40 to-primary-wash/30 p-12 text-center space-y-3">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">近日公開</p>
        <p className="text-sm text-muted-foreground">
          このツールは現在開発中です。もうしばらくお待ちください。
        </p>
      </div>
    </div>
  </div>
);

export const AppealAxisPage = () => (
  <ToolPlaceholder emoji="🎯" title="訴求軸・コピー生成" description="LP URLや過去データから訴求軸・コピーを生成します" />
);
export const CompositionPage = () => (
  <ToolPlaceholder emoji="📋" title="構成案・字コンテ生成" description="訴求軸から構成案・字コンテを生成します" />
);
export const NarrationScriptPage = () => (
  <ToolPlaceholder emoji="📝" title="NA原稿生成" description="構成案・字コンテからNA原稿を生成します" />
);
export const ImageGenerationPage = () => (
  <ToolPlaceholder emoji="🎨" title="イメージ画像生成" description="プロンプトや字コンテからイメージ画像を生成します" />
);
export const BannerImagePage = () => (
  <ToolPlaceholder emoji="🖼️" title="バナー画像生成" description="商材情報からバナー画像を一括生成します" />
);
export const CarouselVideoPage = () => (
  <ToolPlaceholder emoji="🎴" title="カルーセル動画生成" description="原作イラストからカルーセル動画を生成します" />
);
export const VideoResizePage = () => (
  <ToolPlaceholder emoji="♻️" title="動画リサイズ" description="横動画を縦動画・スクエア動画にリサイズします" />
);
