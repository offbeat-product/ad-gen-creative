import { useEffect, useRef, useState } from 'react';
import { Loader2, Save, StickyNote, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  projectId: string | null;
  initialMemo: string | null | undefined;
  /** Edge Function 再フェッチでデータが入れ替わった時の同期用 */
  contextKey?: string | null;
}

const AdBrainMemoSection = ({ projectId, initialMemo, contextKey }: Props) => {
  const [memo, setMemo] = useState<string>(initialMemo ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const lastSavedRef = useRef<string>(initialMemo ?? '');
  const dirtyRef = useRef(false);

  // プロジェクト切替・コンテキスト再取得時にリセット
  useEffect(() => {
    setMemo(initialMemo ?? '');
    lastSavedRef.current = initialMemo ?? '';
    dirtyRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, contextKey]);

  const persist = async (value: string) => {
    if (!projectId) return;
    if (value === lastSavedRef.current) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ memo: value || null } as never)
        .eq('id', projectId);
      if (error) throw error;
      lastSavedRef.current = value;
      dirtyRef.current = false;
      setSavedAt(Date.now());
    } catch (e) {
      console.error('[AdBrainMemo] save error:', e);
      toast.error('補足メモの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // Debounced auto-save (2s)
  useEffect(() => {
    if (!projectId) return;
    if (memo === lastSavedRef.current) return;
    dirtyRef.current = true;
    const t = setTimeout(() => {
      persist(memo);
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memo, projectId]);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/20">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <StickyNote className="h-4 w-4 text-secondary" />
          <span>📝 補足メモ(任意)</span>
          <span className="text-xs text-muted-foreground font-normal">
            ※ Ad Brain にも反映されます
          </span>
        </div>
        <div className="flex items-center gap-2">
          {saving ? (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> 保存中…
            </span>
          ) : savedAt && memo === lastSavedRef.current ? (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Check className="h-3 w-3" /> 保存済み
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!projectId || saving || memo === lastSavedRef.current}
            onClick={() => persist(memo)}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Ad Brain に保存
          </Button>
        </div>
      </div>
      <div className="px-4 py-3">
        <Textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={5}
          placeholder={'例: 5月のSPでは「お試し感」を強めに訴求してほしい\n例: 直近のCV傾向を踏まえて、安定収入訴求を優先'}
          className="text-sm"
          disabled={!projectId}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          AI 生成時のヒントとして利用されます。入力後 2 秒で自動保存されます。
        </p>
      </div>
    </div>
  );
};

export default AdBrainMemoSection;
