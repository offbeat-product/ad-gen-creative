import { useState } from 'react';
import { Image, Check, Upload, Link, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState, referenceCreatives } from '@/data/wizard-data';

interface Props {
  state: WizardState;
  updateState: (u: Partial<WizardState>) => void;
}

const tabs = ['クリエイティブライブラリ', 'アップロード', 'URL入力'] as const;

const StepReference = ({ state, updateState }: Props) => {
  const [activeTab, setActiveTab] = useState(0);
  const [urlInput, setUrlInput] = useState('');

  const toggleRef = (id: string) => {
    const ids = state.referenceIds.includes(id)
      ? state.referenceIds.filter(r => r !== id)
      : [...state.referenceIds, id];
    updateState({ referenceIds: ids });
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

      {/* Tab 1: Library */}
      {activeTab === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {referenceCreatives.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleRef(c.id)}
              className={cn(
                "relative rounded-xl border p-3 text-left transition-all",
                state.referenceIds.includes(c.id)
                  ? "border-secondary bg-secondary-wash/50"
                  : "border-border bg-card hover:shadow-elevated"
              )}
            >
              <div className="aspect-video rounded-lg bg-accent flex items-center justify-center mb-2">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
              {state.referenceIds.includes(c.id) && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-secondary-foreground" />
                </div>
              )}
              <p className="text-xs font-medium truncate">{c.title}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-muted-foreground">CVR {c.cvr}</span>
                {c.best && <Star className="h-3 w-3 text-warning fill-warning" />}
              </div>
            </button>
          ))}
        </div>
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
