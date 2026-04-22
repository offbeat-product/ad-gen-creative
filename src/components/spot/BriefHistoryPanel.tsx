import { useEffect, useState } from 'react';
import { History, Loader2, RotateCcw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  loadBriefHistory,
  restoreBriefFromHistory,
  type BriefHistoryItem,
  type BriefSource,
} from '@/lib/brief-persistence';

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
}

const sourceLabel = (source: BriefSource | string) => {
  switch (source) {
    case 'ai_autogen':
      return '🤖 AI自動生成';
    case 'manual_edit':
      return '✏️ 手動編集';
    case 'generation_trigger':
      return '🎬 生成実行時';
    case 'restore':
      return '⏪ 履歴から復元';
    default:
      return source;
  }
};

const BriefHistoryPanel = ({ projectId, open, onOpenChange, onRestored }: Props) => {
  const [history, setHistory] = useState<BriefHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);
    loadBriefHistory(projectId, 30)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [open, projectId]);

  const handleRestore = async (item: BriefHistoryItem) => {
    const ts = new Date(item.created_at).toLocaleString('ja-JP');
    if (!confirm(`${ts} のブリーフを復元しますか?\n現在のブリーフは履歴に残ります。`)) return;

    setRestoringId(item.id);
    const result = await restoreBriefFromHistory(projectId, item.id);
    setRestoringId(null);

    if (result.success) {
      toast.success('ブリーフを復元しました');
      onRestored();
      onOpenChange(false);
    } else {
      toast.error(`復元に失敗: ${result.error ?? 'unknown'}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-secondary" />
            ブリーフ履歴
          </SheetTitle>
          <SheetDescription>
            過去のブリーフを閲覧・復元できます。復元すると新しい履歴として記録されます。
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              読み込み中...
            </div>
          )}

          {!loading && history.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              履歴はまだありません
            </div>
          )}

          {!loading && history.length > 0 && (
            <ul className="space-y-3 pb-6">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border bg-card p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString('ja-JP')}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {sourceLabel(item.source)}
                      </Badge>
                      {item.is_current && (
                        <Badge className="text-[10px] bg-secondary text-secondary-foreground">
                          現在
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="line-clamp-2">
                      <span className="text-muted-foreground">目的:</span>{' '}
                      <span className="text-foreground">
                        {item.ad_objective || '(未設定)'}
                      </span>
                    </div>
                    <div className="line-clamp-2">
                      <span className="text-muted-foreground">ターゲット:</span>{' '}
                      <span className="text-foreground">
                        {item.target_audience || '(未設定)'}
                      </span>
                    </div>
                    {item.note && (
                      <div className="text-muted-foreground italic line-clamp-2">
                        📝 {item.note}
                      </div>
                    )}
                  </div>

                  {!item.is_current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(item)}
                      disabled={restoringId !== null}
                      className="w-full mt-2"
                    >
                      {restoringId === item.id ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          復元中...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3 w-3 mr-1.5" />
                          このブリーフを復元
                        </>
                      )}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default BriefHistoryPanel;
