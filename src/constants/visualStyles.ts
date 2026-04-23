export const VISUAL_STYLE_PRESETS = [
  {
    value: 'ugc',
    label: 'UGC風(一般ユーザー投稿風)',
    emoji: '🎥',
    description: '本人視点・自撮り・生活感・等身大',
  },
  {
    value: 'interview',
    label: 'インタビュー/トーク風',
    emoji: '🎤',
    description: '顔出しトーク・体験談・レビュー',
  },
  {
    value: 'animation',
    label: 'アニメーション/モーショングラフィックス風',
    emoji: '🎨',
    description: 'イラスト・図解・テキストアニメーション',
  },
  {
    value: 'custom',
    label: 'カスタム(自由記述)',
    emoji: '✏️',
    description: '補足欄に詳細を記載してください',
  },
] as const;

export type VisualStyleValue = typeof VISUAL_STYLE_PRESETS[number]['value'];

export const DEFAULT_VISUAL_STYLE: VisualStyleValue = 'ugc';
