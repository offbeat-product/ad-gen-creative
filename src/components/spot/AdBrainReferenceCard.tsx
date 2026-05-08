import { AlertTriangle, ChevronDown, Database } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { AdBrainContextResponse } from '@/hooks/useAdBrainContext';
import { cn } from '@/lib/utils';

interface Props {
  data: AdBrainContextResponse | null;
  loading: boolean;
}

const AdBrainReferenceCard = ({ data, loading }: Props) => {
  if (loading) {
    return (
      <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 text-xs text-muted-foreground">
        AD BRAIN コンテキストを読み込み中…
      </div>
    );
  }
  if (!data) return null;

  const { statistics: s, client, product, project, master_regulations } = data;
  const total_rules = s?.total_rules ?? 0;
  const total_materials = s?.total_materials ?? 0;
  const lawsCount = master_regulations?.laws_count ?? s?.master_laws_count ?? 0;
  const mediaCount = master_regulations?.media_count ?? s?.master_media_count ?? 0;
  const empty = s?.materials_with_empty_content ?? 0;
  const noRules = total_rules === 0;

  return (
    <Collapsible className="rounded-xl bg-secondary-wash/40 border border-secondary/20">
      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-secondary-wash/60 transition-colors rounded-xl group">
        <div className="flex items-center gap-2 text-xs">
          <Database className="h-3.5 w-3.5 text-secondary" />
          <span className="font-semibold text-secondary uppercase tracking-wide">
            AD BRAIN 参照
          </span>
          <span className={cn('text-foreground', noRules && 'text-destructive font-medium')}>
            {noRules ? (
              <>
                <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
                ルール 0 件
              </>
            ) : (
              <>✅ ルール {total_rules} 件</>
            )}
          </span>
          <span className="text-foreground">📚 ナレッジ {total_materials} 件</span>
          <span className="text-muted-foreground">
            ⚖️ {lawsCount} / 📢 {mediaCount}
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-0 space-y-3 text-xs">
        <div>
          <div className="font-medium text-foreground mb-1">
            ✅ ルール {total_rules} 件 を AI に参照させます
          </div>
          <ul className="text-muted-foreground space-y-0.5 pl-4">
            <li>├─ クライアント: {client?.rules_count ?? 0} 件</li>
            <li>├─ 商材: {product?.rules_count ?? 0} 件</li>
            <li>└─ 案件: {project?.rules_count ?? 0} 件</li>
          </ul>
        </div>
        <div>
          <div className="font-medium text-foreground mb-1">
            📚 ナレッジ {total_materials} 件 を参照
          </div>
          <ul className="text-muted-foreground space-y-0.5 pl-4">
            <li>├─ クライアント: {client?.materials_count ?? 0} 件</li>
            <li>├─ 商材: {product?.materials_count ?? 0} 件</li>
            <li>└─ 案件: {project?.materials_count ?? 0} 件</li>
          </ul>
        </div>
        <div className="text-muted-foreground">
          ⚖️ 法令: {lawsCount} 件 / 📢 媒体: {mediaCount} 件
        </div>
        {empty > 0 && (
          <div className="rounded-md bg-secondary-wash/60 border border-secondary/20 px-2 py-1.5 text-foreground">
            📝 コンテンツが空のナレッジ {empty} 件あります。内容を追加すると AI 生成精度が向上します。
          </div>
        )}
        {noRules && (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-1.5 text-amber-700 dark:text-amber-400 space-y-1">
            <div>⚠️ この商材・案件にはルールが未設定です。</div>
            {client?.id && (
              <a
                href={`https://ad-brain-rho.vercel.app/clients/${client.id}/rules`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                ルール管理ページで追加 →
              </a>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AdBrainReferenceCard;
