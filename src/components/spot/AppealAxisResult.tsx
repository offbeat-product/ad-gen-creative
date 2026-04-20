import { useNavigate } from 'react-router-dom';
import {
  Copy,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  FileDown,
  RotateCcw,
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type { BriefData } from '@/components/spot/BriefSection';
import type { SpotWizardState } from '@/hooks/useSpotWizard';
import type { useProjectContext } from '@/hooks/useProjectContext';

export interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
}

export interface CopyItem {
  pattern_id: string;
  appeal_axis_index: number;
  appeal_axis_text?: string;
  copy_index: number;
  copy_text: string;
  hook?: string;
}

export interface AppealAxisObj {
  text: string;
  reasoning?: string;
}

export interface SpotAsset {
  id: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata: {
    appeal_axes?: (string | AppealAxisObj)[];
    copies?: CopyItem[];
    hint?: string;
  } | null;
}

interface Props {
  job: SpotJob | null;
  assets: SpotAsset[];
  jobId: string | null;
  context: ReturnType<typeof useProjectContext>['context'];
  briefData: BriefData;
  state: SpotWizardState;
  onStartNew: () => void;
}

const buildFormattedText = (
  appealAxes: AppealAxisObj[],
  copies: CopyItem[]
): string => {
  const lines: string[] = [];
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('  訴求軸・コピー生成結果');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  appealAxes.forEach((axis, i) => {
    const axisNum = i + 1;
    lines.push(`■ 訴求軸${axisNum}: ${axis.text}`);
    if (axis.reasoning) lines.push(`  根拠: ${axis.reasoning}`);
    lines.push('');
    const axisCopies = copies.filter((c) => c.appeal_axis_index === axisNum);
    axisCopies.forEach((c) => {
      lines.push(`  ${c.pattern_id}. ${c.copy_text}`);
      if (c.hook) lines.push(`     狙い: ${c.hook}`);
    });
    lines.push('');
  });
  return lines.join('\n');
};

const handleCopy = async (text: string, label = 'コピーしました') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error('コピーに失敗しました');
  }
};

const AppealAxisResult = ({
  job,
  assets,
  jobId,
  context,
  briefData,
  state,
  onStartNew,
}: Props) => {
  const navigate = useNavigate();
  const isRunning = job?.status === 'pending' || job?.status === 'running';

  if (!jobId || !job) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
        生成結果がありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* トップバー */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-display tracking-tight">生成結果</h2>
        <Button variant="outline" size="sm" onClick={onStartNew}>
          <RotateCcw className="h-3 w-3 mr-1" /> 新しく生成する
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">ステータス</h3>
          <span className="text-xs">
            {job.status === 'pending' && (
              <span className="text-muted-foreground">待機中...</span>
            )}
            {job.status === 'running' && <span className="text-warning">処理中...</span>}
            {job.status === 'completed' && (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" /> 完了
              </span>
            )}
            {job.status === 'failed' && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" /> 失敗
              </span>
            )}
          </span>
        </div>

        {isRunning && <Progress value={job.status === 'running' ? 60 : 20} />}

        {job.status === 'failed' && job.error_message && (
          <div className="text-xs text-destructive bg-destructive/10 p-3 rounded">
            {job.error_message}
          </div>
        )}

        {assets.length > 0 &&
          assets.map((asset) => {
            const appealAxesRaw = asset.metadata?.appeal_axes ?? [];
            const copies = asset.metadata?.copies ?? [];

            const appealAxes: AppealAxisObj[] = appealAxesRaw.map((a) =>
              typeof a === 'string' ? { text: a } : a
            );

            const handleCopyAll = () => {
              handleCopy(
                buildFormattedText(appealAxes, copies),
                '全訴求軸・コピーをコピーしました'
              );
            };

            const handleDownloadTxt = () => {
              const text = buildFormattedText(appealAxes, copies);
              const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
              const projectName = context?.project.name ?? 'project';
              saveAs(
                blob,
                `訴求軸コピー_${projectName}_${new Date().toISOString().split('T')[0]}.txt`
              );
              toast.success('TXTをダウンロードしました');
            };

            const handleDownloadDocx = async () => {
              const projectName = context?.project.name ?? 'project';
              const clientName = context?.project.product.client.name ?? '';
              const productName = context?.project.product.name ?? '';

              const children: Paragraph[] = [
                new Paragraph({
                  text: '訴求軸・コピー生成結果',
                  heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                  children: [new TextRun({ text: `クライアント: ${clientName}` })],
                }),
                new Paragraph({
                  children: [new TextRun({ text: `商材: ${productName}` })],
                }),
                new Paragraph({
                  children: [new TextRun({ text: `案件: ${projectName}` })],
                }),
                new Paragraph({ text: '' }),
              ];

              appealAxes.forEach((axis, i) => {
                const axisNum = i + 1;
                children.push(
                  new Paragraph({
                    text: `訴求軸${axisNum}: ${axis.text}`,
                    heading: HeadingLevel.HEADING_2,
                  })
                );
                if (axis.reasoning) {
                  children.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `根拠: ${axis.reasoning}`,
                          italics: true,
                          color: '666666',
                        }),
                      ],
                    })
                  );
                }
                children.push(new Paragraph({ text: '' }));
                const axisCopies = copies.filter((c) => c.appeal_axis_index === axisNum);
                axisCopies.forEach((c) => {
                  children.push(
                    new Paragraph({
                      children: [
                        new TextRun({ text: `${c.pattern_id}. `, bold: true }),
                        new TextRun({ text: c.copy_text, bold: true, size: 24 }),
                      ],
                    })
                  );
                  if (c.hook) {
                    children.push(
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `   狙い: ${c.hook}`,
                            italics: true,
                            size: 20,
                            color: '666666',
                          }),
                        ],
                      })
                    );
                  }
                });
                children.push(new Paragraph({ text: '' }));
              });

              const doc = new Document({ sections: [{ children }] });
              const blob = await Packer.toBlob(doc);
              saveAs(
                blob,
                `訴求軸コピー_${projectName}_${new Date().toISOString().split('T')[0]}.docx`
              );
              toast.success('Wordドキュメントをダウンロードしました');
            };

            const handleGoToComposition = (c: CopyItem) => {
              const axis = appealAxes[c.appeal_axis_index - 1];
              sessionStorage.setItem(
                'composition_seed',
                JSON.stringify({
                  from_tool: 'appeal_axis_copy',
                  from_job_id: jobId,
                  appeal_axis_text: axis?.text ?? '',
                  appeal_axis_reasoning: axis?.reasoning ?? '',
                  copy_text: c.copy_text,
                  copy_hook: c.hook ?? '',
                  pattern_id: c.pattern_id,
                  brief: briefData,
                  project_id: state.projectId,
                  client_id: state.clientId,
                  product_id: state.productId,
                })
              );
              toast.success('選択したコピーで構成案を生成します');
              navigate('/tools/composition');
            };

            const grouped = appealAxes.map((_, axisIdx) =>
              copies.filter((c) => c.appeal_axis_index === axisIdx + 1)
            );

            return (
              <div key={asset.id} className="space-y-6">
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAll}
                    disabled={appealAxes.length === 0}
                  >
                    <Copy className="h-3 w-3 mr-1" /> 全体をコピー
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTxt}
                    disabled={appealAxes.length === 0}
                  >
                    <FileText className="h-3 w-3 mr-1" /> .txt ダウンロード
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadDocx}
                    disabled={appealAxes.length === 0}
                  >
                    <FileDown className="h-3 w-3 mr-1" /> .docx ダウンロード
                  </Button>
                </div>

                {appealAxes.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      訴求軸 ({appealAxes.length}件)
                    </div>
                    <div className="grid gap-2">
                      {appealAxes.map((axis, i) => (
                        <div
                          key={i}
                          className="rounded-lg border bg-accent/20 p-3 flex items-start gap-3"
                        >
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </span>
                          <div className="flex-1 space-y-1 pt-0.5">
                            <div className="text-sm leading-relaxed font-medium">
                              {axis.text}
                            </div>
                            {axis.reasoning && (
                              <div className="text-xs text-muted-foreground leading-relaxed">
                                根拠: {axis.reasoning}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {copies.length > 0 && (
                  <div className="space-y-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      台本パターン ({copies.length}件)
                    </div>
                    {grouped.map((group, axisIdx) => (
                      <div key={axisIdx} className="rounded-lg border overflow-hidden">
                        <div className="bg-muted px-4 py-2 text-sm font-semibold">
                          訴求軸{axisIdx + 1}: {appealAxes[axisIdx]?.text ?? '(未定義)'}
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">No.</TableHead>
                              <TableHead>コピー</TableHead>
                              <TableHead className="w-44 text-right">アクション</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.map((c) => (
                              <TableRow key={`${axisIdx}-${c.copy_index}`}>
                                <TableCell className="font-bold align-top">
                                  {c.pattern_id}
                                </TableCell>
                                <TableCell className="text-sm align-top whitespace-pre-wrap">
                                  <div className="font-semibold leading-relaxed">
                                    {c.copy_text}
                                  </div>
                                  {c.hook && (
                                    <div className="text-xs text-muted-foreground mt-1.5">
                                      💡 狙い: {c.hook}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right align-top">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGoToComposition(c)}
                                  >
                                    <ArrowRight className="h-3 w-3 mr-1" /> 構成案生成
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default AppealAxisResult;
