import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const N8N_EDIT_WEBHOOK_URL =
  'https://offbeat-inc.app.n8n.cloud/webhook/banner-edit';

export interface BannerEditTargetAsset {
  id: string;
  job_id: string;
  file_url: string;
  version?: number | null;
  metadata?: {
    width?: number;
    height?: number;
    size_label?: string;
  } | null;
}

export interface BannerEditCompletePayload {
  id: string;
  png_url: string;
  version: number;
  edit_instruction: string;
  parent_asset_id: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  asset: BannerEditTargetAsset;
  projectId: string;
  onEditComplete: (newAsset: BannerEditCompletePayload) => void;
}

const SUGGESTIONS = [
  '日本語の誤字を正しく修正して',
  'CTAボタンの文字を変更したい',
  '背景をもっと明るく',
  '初回限定バッジを削除',
  '人物をもっと若い印象に',
  'もっとポップな色味に',
];

const BannerEditModal = ({
  isOpen,
  onClose,
  asset,
  projectId,
  onEditComplete,
}: Props) => {
  const [instruction, setInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const currentVersion = asset.version ?? 1;
  const sizeLabel =
    asset.metadata?.size_label ??
    (asset.metadata?.width && asset.metadata?.height
      ? `${asset.metadata.width}×${asset.metadata.height}`
      : null);

  const handleSuggestionClick = (suggestion: string) => {
    setInstruction((prev) => (prev ? `${prev}\n${suggestion}` : suggestion));
  };

  const handleClose = () => {
    if (isEditing) return;
    setInstruction('');
    onClose();
  };

  const handleEdit = async () => {
    const trimmed = instruction.trim();
    if (!trimmed) {
      toast.error('修正指示を入力してください');
      return;
    }

    setIsEditing(true);
    try {
      const response = await fetch(N8N_EDIT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_asset_id: asset.id,
          spot_job_id: asset.job_id,
          source_image_url: asset.file_url,
          edit_instruction: trimmed,
          current_version: currentVersion,
          project_id: projectId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Edit failed: HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result?.success) {
        throw new Error(result?.error ?? '編集に失敗しました');
      }

      toast.success('✨ 修正が完了しました');

      onEditComplete({
        id: result.asset_id,
        png_url: result.png_url,
        version: result.version,
        edit_instruction: result.edit_instruction ?? trimmed,
        parent_asset_id: asset.id,
      });

      setInstruction('');
      onClose();
    } catch (error) {
      console.error('Banner edit error:', error);
      toast.error(`エラー: ${(error as Error).message}`);
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" />
            AI で修正
          </DialogTitle>
          <DialogDescription>
            修正したい内容を自然な日本語で入力してください。AI が該当箇所だけを
            修正し、他の部分は保持します。
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
          <div className="rounded-lg border bg-muted overflow-hidden aspect-square flex items-center justify-center">
            <img
              src={asset.file_url}
              alt="編集対象バナー"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[11px]">
                現在: v{currentVersion}
              </Badge>
              {sizeLabel && (
                <Badge variant="outline" className="text-[11px] tabular-nums">
                  {sizeLabel}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              修正には15〜30秒ほどかかります。完了後、新しいバージョンとして
              履歴に追加されます。
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            💡 よくある修正例(クリックで追加)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSuggestionClick(s)}
                disabled={isEditing}
                className="text-[11px] px-2.5 py-1 rounded-full border border-input bg-background hover:bg-accent hover:border-accent-foreground/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="例: CTAボタンの文字を「今すぐ無料体験」に変更して、背景をもう少し明るく"
          rows={4}
          disabled={isEditing}
          className="resize-none"
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isEditing}>
            キャンセル
          </Button>
          <Button
            onClick={handleEdit}
            disabled={isEditing || !instruction.trim()}
          >
            {isEditing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AIが修正中... (15〜30秒)
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                AI修正を実行
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BannerEditModal;
