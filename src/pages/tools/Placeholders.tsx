interface ToolPlaceholderProps {
  emoji: string;
  title: string;
  description: string;
}

const ToolPlaceholder = ({ emoji, title, description }: ToolPlaceholderProps) => (
  <div className="max-w-4xl mx-auto p-6 space-y-6">
    <div className="space-y-1">
      <h1 className="text-2xl font-bold">{emoji} {title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="rounded-xl border bg-muted/30 p-8 text-center">
      <p className="text-sm text-muted-foreground">
        クライアント→商材→案件を選択するウィザードをここに実装予定
      </p>
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
export const CarouselVideoPage = () => (
  <ToolPlaceholder emoji="🎴" title="カルーセル動画生成" description="原作イラストからカルーセル動画を生成します" />
);
export const VideoResizePage = () => (
  <ToolPlaceholder emoji="♻️" title="動画リサイズ" description="横動画を縦動画・スクエア動画にリサイズします" />
);
