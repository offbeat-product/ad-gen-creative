import { useState, useEffect } from 'react';
import { Image, Check, Upload, Link, Film, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState } from '@/data/wizard-data';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface Props {
  state: WizardState;
  updateState: (u: Partial<WizardState>) => void;
}

interface Creative {
  id: string;
  file_name: string;
  file_data: string | null;
  process_type: string;
  status: string | null;
  created_at: string | null;
}

const statusLabel: Record<string, string> = {
  uploaded: 'アップロード済',
  checking: 'チェック中',
  checked: 'チェック済',
  client_review: '確認中',
  approved: '承認済',
  fixed: '修正済',
};

const tabs = ['クリエイティブライブラリ', 'アップロード', 'URL入力'] as const;

const StepReference = ({ state, updateState }: Props) => {
  const [activeTab, setActiveTab] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch real creatives for the selected product
  useEffect(() => {
    if (!state.productId) return;
    let cancelled = false;

    const fetchCreatives = async () => {
      setLoading(true);
      // Get projects for this product
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('product_id', state.productId!);

      const projectIds = projects?.map(p => p.id) || [];

      if (projectIds.length === 0) {
        setCreatives([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('project_files')
        .select('id, file_name, file_data, process_type, status, created_at')
        .in('project_id', projectIds)
        .eq('process_type', 'video_horizontal')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!cancelled) {
        setCreatives(data ?? []);
        setLoading(false);
      }
    };

    fetchCreatives();
    return () => { cancelled = true; };
  }, [state.productId]);

  const toggleRef = (id: string, fileName: string) => {
    const ids = state.referenceIds.includes(id)
      ? state.referenceIds.filter(r => r !== id)
      : [...state.referenceIds, id];
    const fileNames = { ...state.referenceFileNames };
    if (ids.includes(id)) {
      fileNames[id] = fileName;
    } else {
      delete fileNames[id];
    }
    updateState({ referenceIds: ids, referenceFileNames: fileNames });
  };

  const addUrl = () => {
    if (urlInput.trim()) {
      updateState({ referenceUrls: [...state.referenceUrls, urlInput.trim()] });
      setUrlInput('');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">参考にするクリエイティブを選択（任意）</h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === i ? "border-secondary text-secondary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1: Library — real data */}
      {activeTab === 0 && (
        loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">読み込み中...</div>
        ) : creatives.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Film className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">この商材の過去クリエイティブはまだありません。</p>
            <p className="text-xs text-muted-foreground">アップロードまたはURL入力で参考素材を追加できます。</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {creatives.map((c) => {
              const selected = state.referenceIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleRef(c.id)}
                  className={cn(
                    "relative rounded-xl border p-3 text-left transition-all",
                    selected
                      ? "border-secondary bg-secondary-wash/50 ring-2 ring-secondary"
                      : "border-border bg-card hover:shadow-elevated"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video rounded-lg bg-accent overflow-hidden mb-2">
                    {c.file_data ? (
                      <video
                        src={c.file_data}
                        preload="metadata"
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Check indicator */}
                  {selected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-secondary-foreground" />
                    </div>
                  )}

                  {/* File name */}
                  <p className="text-xs font-medium truncate">{c.file_name}</p>

                  {/* Status + date */}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {c.status && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {statusLabel[c.status] || c.status}
                      </Badge>
                    )}
                    {c.created_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}

      {/* Tab 2: Upload */}
      {activeTab === 1 && (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">ファイルをドラッグ＆ドロップ、またはクリックして選択</p>
          <p className="text-xs text-muted-foreground mt-1">対応形式: PNG, JPG, MP4, MOV</p>
        </div>
      )}

      {/* Tab 3: URL */}
      {activeTab === 2 && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="参考クリエイティブのURLを入力..."
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              className="flex-1 rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={addUrl} className="rounded-xl brand-gradient-bg text-primary-foreground px-4 py-2 text-sm font-medium">追加</button>
          </div>
          {state.referenceUrls.map((url, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Link className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate flex-1 text-secondary">{url}</span>
              <button
                onClick={() => updateState({ referenceUrls: state.referenceUrls.filter((_, j) => j !== i) })}
                className="text-xs text-destructive hover:underline"
              >削除</button>
            </div>
          ))}
        </div>
      )}

      <div className="text-right">
        <span className="text-xs text-muted-foreground cursor-pointer hover:text-secondary">スキップして次へ →</span>
      </div>
    </div>
  );
};

export default StepReference;
