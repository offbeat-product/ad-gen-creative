import { ExternalLink, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import {
  formatCompetitors,
  type AdBrainContextResponse,
  type LpInfo,
} from '@/hooks/useAdBrainContext';

const AD_PURPOSE_LABEL: Record<string, string> = {
  awareness: '認知拡大',
  conversion: 'コンバージョン',
  retention: 'リテンション',
  lead_generation: 'リード獲得',
  other: 'その他',
};

interface Props {
  data: AdBrainContextResponse | null;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg bg-muted/40 border border-border/40 p-3 space-y-2">
    <div className="text-xs font-semibold text-foreground">{title}</div>
    <div className="text-xs text-muted-foreground space-y-1">{children}</div>
  </div>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="flex gap-2">
      <span className="text-foreground/70 shrink-0 min-w-[88px]">{label}:</span>
      <span className="break-words">{value}</span>
    </div>
  );
};

const AdBrainProjectInfoCard = ({ data }: Props) => {
  if (!data) return null;
  const product = data.product;
  const brief = data.project?.brief ?? {};
  const lp: LpInfo = (brief.lp_info ?? {}) as LpInfo;
  const editUrl = `https://ad-brain-rho.vercel.app/projects/${data.project_id}?tab=info`;

  const adPurposes = (brief.ad_purposes ?? []).map((c) => AD_PURPOSE_LABEL[c] ?? c);
  const competitorsText = formatCompetitors(product?.competitors);

  return (
    <Collapsible defaultOpen className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/20">
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold flex-1 group">
          <Info className="h-4 w-4 text-secondary" />
          <span>📋 案件情報(Ad Brain)</span>
          <span className="text-xs text-muted-foreground font-normal">
            ※ 編集は Ad Brain 側で行ってください
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto group-data-[state=open]:rotate-180 transition-transform" />
        </CollapsibleTrigger>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <a href={editUrl} target="_blank" rel="noopener noreferrer">
            Ad Brain で編集 <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </div>
      <CollapsibleContent className="px-4 py-3 space-y-3">
        {/* A. 商材サマリー */}
        <Section title="A. 商材サマリー(継承)">
          <Row label="ターゲット" value={product?.target_audience} />
          <Row label="USP" value={product?.usp} />
          <Row label="価格" value={product?.price_range} />
          <Row label="競合" value={competitorsText} />
        </Section>

        {/* B. 訴求方針 */}
        <Section title="B. 訴求方針(広告目的)">
          {adPurposes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {adPurposes.map((p) => (
                <Badge key={p} variant="secondary">{p}</Badge>
              ))}
            </div>
          )}
          <Row label="目的の補足" value={brief.ad_purpose_note} />
        </Section>

        {/* C. 訴求・トンマナ希望 */}
        <Section title="C. 訴求・トンマナ希望">
          <Row
            label="件数"
            value={`構成案 ${brief.compositions_count ?? 0} / トンマナ ${brief.tone_manners_count ?? 0}`}
          />
          {brief.appeal_requests && brief.appeal_requests.length > 0 && (
            <div>
              <div className="text-foreground/70">訴求希望:</div>
              <ul className="pl-3 space-y-0.5">
                {brief.appeal_requests.map((a, i) => (
                  <li key={i}>・構成案 {i + 1}: {a}</li>
                ))}
              </ul>
            </div>
          )}
          {brief.tone_manner_requests && brief.tone_manner_requests.length > 0 && (
            <div>
              <div className="text-foreground/70">トンマナ希望:</div>
              <ul className="pl-3 space-y-0.5">
                {brief.tone_manner_requests.map((t, i) => (
                  <li key={i}>・トンマナ {i + 1}: {t}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* D. LP 情報 */}
        <Section title="D. LP 情報">
          {brief.lp_url && (
            <div className="flex gap-2">
              <span className="text-foreground/70 shrink-0 min-w-[88px]">LP URL:</span>
              <a
                href={brief.lp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary underline break-all"
              >
                {brief.lp_url}
              </a>
            </div>
          )}
          <Row label="LPサマリー" value={brief.lp_summary} />
          <Row label="ヘッドライン" value={lp.headline as string | undefined} />
          <Row label="主要メッセージ" value={lp.main_message as string | undefined} />
          {Array.isArray(lp.appeal_points) && lp.appeal_points.length > 0 && (
            <div>
              <div className="text-foreground/70">訴求ポイント:</div>
              <ul className="pl-3 space-y-0.5">
                {lp.appeal_points.map((p, i) => (
                  <li key={i}>・{p}</li>
                ))}
              </ul>
            </div>
          )}
          <Row label="推定ターゲット" value={lp.target_audience_inferred as string | undefined} />
          <Row label="CTA" value={lp.cta as string | undefined} />
        </Section>

        {/* E. NG / 制約事項 */}
        <Section title="E. NG / 制約事項(継承)">
          <Row label="NGワード" value={(product?.ng_words ?? []).join('、')} />
          <Row label="適用法令" value={(product?.applicable_laws ?? []).join('、')} />
        </Section>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AdBrainProjectInfoCard;
