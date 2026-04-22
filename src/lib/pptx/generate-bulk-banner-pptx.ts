import pptxgen from 'pptxgenjs';
import type {
  BulkCompositionBatch,
  BulkCompositionJob,
} from '@/types/bulk-composition';

const COLORS = {
  tableHeader: '4472C4',
  hlDark: '1F3864',
  appealAxisLabel: '8B5CF6',
  border: 'D0D0D0',
  white: 'FFFFFF',
  dark: '1F2937',
  mediumGray: '6B7280',
  lightGray: 'F3F4F6',
  bannerBg: 'DADADA',
  bannerBtnRed: 'C00000',
  bannerBtnBlue: '4472C4',
  titleAccent: '5B9BD5',
};
const FONT = 'Yu Gothic';

interface Params {
  batch: BulkCompositionBatch;
  jobs: BulkCompositionJob[];
  meta: {
    client_name: string;
    product_name: string;
    project_name: string;
  };
}

export async function generateBulkBannerPptx(params: Params): Promise<Blob> {
  const { jobs, meta } = params;

  const sortedJobs = [...jobs].sort(
    (a, b) =>
      ((a.input_data as any).bulk_index ?? 0) -
      ((b.input_data as any).bulk_index ?? 0)
  );

  const pres = new pptxgen();
  pres.defineLayout({ name: 'BANNER_WIDE', width: 13.333, height: 7.5 });
  pres.layout = 'BANNER_WIDE';

  sortedJobs.forEach((job, idx) => {
    const output = (job.output_data || {}) as any;
    const banner = output.banner || {};
    const brief = output.brief || {};
    const slideLabel = `静止画${String.fromCharCode(65 + idx)}`;

    buildSlide(pres, {
      slideLabel,
      brief,
      banner,
      appealAxis: output.appeal_axis || (job.input_data as any).appeal_axis || '',
      meta,
    });
  });

  const blob = await pres.write({ outputType: 'blob' });
  return blob as Blob;
}

function buildSlide(
  pres: pptxgen,
  data: {
    slideLabel: string;
    brief: any;
    banner: any;
    appealAxis: string;
    meta: { client_name: string; product_name: string; project_name: string };
  }
) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };

  // ===== 左上タイトル =====
  slide.addText(data.slideLabel, {
    x: 0.35,
    y: 0.2,
    w: 1.8,
    h: 0.5,
    fontSize: 22,
    bold: true,
    fontFace: FONT,
    color: COLORS.dark,
    valign: 'middle',
  });

  // 装飾ライン
  slide.addShape('rect' as any, {
    x: 0.35,
    y: 0.72,
    w: 12.6,
    h: 0.03,
    fill: { color: COLORS.titleAccent },
    line: { type: 'none' } as any,
  });

  // ===== 左側ブリーフテーブル =====
  const leftX = 0.35;
  const leftY = 1.0;
  const briefLabelW = 2.0;
  const briefValueW = 4.2;

  const briefRows = [
    { label: '対象年齢', value: data.brief.target_age || '-', highlight: false },
    { label: 'インサイトカテゴリ', value: data.brief.insight_category || '-', highlight: false },
    { label: 'インサイト', value: data.brief.insight || '-', highlight: false },
    { label: 'What to Say', value: data.brief.what_to_say || '-', highlight: true },
    { label: 'ユーザーのシチュエーション', value: data.brief.user_situation || '-', highlight: false },
    { label: 'ユーザーのモチベーション', value: data.brief.user_motivation || '-', highlight: false },
    { label: 'ユーザーにとってのメリット', value: data.brief.user_merit || '-', highlight: false },
  ];

  const briefHeights = briefRows.map((r) => {
    const len = (r.value || '').length;
    if (len > 40) return 0.85;
    if (len > 25) return 0.7;
    return 0.45;
  });

  let curY = leftY;
  briefRows.forEach((row, rowIdx) => {
    const rowH = briefHeights[rowIdx];
    const labelColor = row.highlight ? COLORS.hlDark : COLORS.tableHeader;

    slide.addText(row.label, {
      x: leftX,
      y: curY,
      w: briefLabelW,
      h: rowH,
      fontSize: 11,
      bold: true,
      fontFace: FONT,
      color: COLORS.white,
      fill: { color: labelColor },
      valign: 'middle',
      align: 'left',
      margin: 6,
      line: { color: COLORS.border, width: 0.5 },
    });

    slide.addText(row.value, {
      x: leftX + briefLabelW,
      y: curY,
      w: briefValueW,
      h: rowH,
      fontSize: 11,
      fontFace: FONT,
      color: COLORS.dark,
      fill: { color: COLORS.white },
      valign: 'middle',
      align: 'left',
      margin: 6,
      line: { color: COLORS.border, width: 0.5 },
    });

    curY += rowH;
  });

  // ===== 右側: 訴求軸 → メインコピー → サブコピー =====
  const rightX = 6.9;
  const copyLabelW = 1.4;
  const copyValueW = 4.7;

  const appealAxisText = data.appealAxis || '';
  const appealAxisH = appealAxisText.length > 60 ? 0.9 : 0.7;

  // 訴求軸ラベル(紫)
  slide.addText('訴求軸', {
    x: rightX,
    y: leftY,
    w: copyLabelW,
    h: appealAxisH,
    fontSize: 11,
    bold: true,
    fontFace: FONT,
    color: COLORS.white,
    fill: { color: COLORS.appealAxisLabel },
    valign: 'middle',
    margin: 6,
    line: { color: COLORS.border, width: 0.5 },
  });
  slide.addText(appealAxisText, {
    x: rightX + copyLabelW,
    y: leftY,
    w: copyValueW,
    h: appealAxisH,
    fontSize: 10,
    fontFace: FONT,
    color: COLORS.dark,
    fill: { color: COLORS.white },
    valign: 'middle',
    margin: 6,
    line: { color: COLORS.border, width: 0.5 },
  });

  const copyY = leftY + appealAxisH;

  const mainCopyLines: string[] = data.banner.main_copy_lines || [];
  const subCopy = (data.banner.sub_copy || '').replace(/\\n/g, ' ');

  // メインコピー
  slide.addText('メインコピー', {
    x: rightX,
    y: copyY,
    w: copyLabelW,
    h: 0.5,
    fontSize: 11,
    bold: true,
    fontFace: FONT,
    color: COLORS.white,
    fill: { color: COLORS.tableHeader },
    valign: 'middle',
    margin: 6,
    line: { color: COLORS.border, width: 0.5 },
  });
  slide.addText(mainCopyLines.join(''), {
    x: rightX + copyLabelW,
    y: copyY,
    w: copyValueW,
    h: 0.5,
    fontSize: 11,
    bold: true,
    fontFace: FONT,
    color: COLORS.dark,
    fill: { color: COLORS.white },
    valign: 'middle',
    margin: 6,
    line: { color: COLORS.border, width: 0.5 },
  });

  // サブコピー
  slide.addText('サブコピー', {
    x: rightX,
    y: copyY + 0.5,
    w: copyLabelW,
    h: 0.7,
    fontSize: 11,
    bold: true,
    fontFace: FONT,
    color: COLORS.white,
    fill: { color: COLORS.tableHeader },
    valign: 'middle',
    margin: 6,
    line: { color: COLORS.border, width: 0.5 },
  });
  slide.addText(subCopy, {
    x: rightX + copyLabelW,
    y: copyY + 0.5,
    w: copyValueW,
    h: 0.7,
    fontSize: 11,
    fontFace: FONT,
    color: COLORS.dark,
    fill: { color: COLORS.white },
    valign: 'middle',
    margin: 6,
    line: { color: COLORS.border, width: 0.5 },
  });

  // ===== バナー疑似プレビュー =====
  const bannerSectY = copyY + 1.5;

  slide.addText('バナー構成案', {
    x: rightX,
    y: bannerSectY,
    w: 3.5,
    h: 0.35,
    fontSize: 11,
    bold: true,
    fontFace: FONT,
    color: COLORS.dark,
    align: 'center',
    valign: 'middle',
  });

  slide.addText('参考イメージ', {
    x: rightX + 3.7,
    y: bannerSectY,
    w: 2.4,
    h: 0.35,
    fontSize: 11,
    bold: true,
    fontFace: FONT,
    color: COLORS.dark,
    align: 'center',
    valign: 'middle',
  });

  const bnrX = rightX + 0.2;
  const bnrY = bannerSectY + 0.35;
  const bnrW = 3.1;
  const bnrH = 3.3;

  slide.addShape('rect' as any, {
    x: bnrX,
    y: bnrY,
    w: bnrW,
    h: bnrH,
    fill: { color: COLORS.bannerBg },
    line: { type: 'none' } as any,
  });

  slide.addText(`▸ ${data.meta.product_name}`, {
    x: bnrX,
    y: bnrY + 0.12,
    w: bnrW,
    h: 0.25,
    fontSize: 9,
    bold: true,
    fontFace: FONT,
    color: COLORS.dark,
    align: 'center',
    valign: 'middle',
  });

  slide.addText(mainCopyLines.join('\n'), {
    x: bnrX,
    y: bnrY + 0.5,
    w: bnrW,
    h: 1.1,
    fontSize: 18,
    bold: true,
    fontFace: FONT,
    color: COLORS.dark,
    align: 'center',
    valign: 'middle',
  });

  slide.addText((data.banner.sub_copy || '').replace(/\\n/g, '\n'), {
    x: bnrX,
    y: bnrY + 1.7,
    w: bnrW,
    h: 0.7,
    fontSize: 10,
    fontFace: FONT,
    color: COLORS.dark,
    align: 'center',
    valign: 'middle',
  });

  // CTAボタン
  const btnW = 1.2;
  const btnH = 0.35;
  const btnY = bnrY + 2.5;
  const btnGap = 0.15;
  const totalBtnW = btnW * 2 + btnGap;
  const btnStartX = bnrX + (bnrW - totalBtnW) / 2;

  const ctaButtons: string[] = data.banner.cta_buttons || ['詳しく見る', '今すぐ応募'];

  slide.addText(ctaButtons[0] || 'CTA1', {
    x: btnStartX,
    y: btnY,
    w: btnW,
    h: btnH,
    fontSize: 10,
    bold: true,
    fontFace: FONT,
    color: COLORS.white,
    fill: { color: COLORS.bannerBtnRed },
    align: 'center',
    valign: 'middle',
  });
  slide.addText(ctaButtons[1] || 'CTA2', {
    x: btnStartX + btnW + btnGap,
    y: btnY,
    w: btnW,
    h: btnH,
    fontSize: 10,
    bold: true,
    fontFace: FONT,
    color: COLORS.white,
    fill: { color: COLORS.bannerBtnBlue },
    align: 'center',
    valign: 'middle',
  });

  slide.addText('▸ ' + (data.banner.support_text || ''), {
    x: bnrX,
    y: bnrY + 2.95,
    w: bnrW,
    h: 0.3,
    fontSize: 8,
    italic: true,
    fontFace: FONT,
    color: COLORS.dark,
    align: 'center',
    valign: 'middle',
  });

  // ===== 参考イメージ =====
  const refX = rightX + 3.7;
  const refY = bannerSectY + 0.35;
  const refW = 2.4;
  const refH = 2.4;

  slide.addShape('rect' as any, {
    x: refX + 0.2,
    y: refY,
    w: refW - 0.4,
    h: refH - 0.4,
    fill: { color: COLORS.lightGray },
    line: { color: COLORS.border, width: 1 },
  });
  slide.addText('(参考イメージ未登録)', {
    x: refX + 0.2,
    y: refY,
    w: refW - 0.4,
    h: refH - 0.4,
    fontSize: 10,
    fontFace: FONT,
    color: COLORS.mediumGray,
    italic: true,
    align: 'center',
    valign: 'middle',
  });
  slide.addText('参考① 既存のあたりバナー', {
    x: refX,
    y: refY + refH - 0.3,
    w: refW,
    h: 0.3,
    fontSize: 9,
    fontFace: FONT,
    color: COLORS.mediumGray,
    align: 'center',
    valign: 'middle',
  });

  // フッター
  slide.addText('Copyright © Off Beat Inc. All Rights Reserved.', {
    x: 5,
    y: 7.1,
    w: 8,
    h: 0.3,
    fontSize: 9,
    fontFace: FONT,
    color: COLORS.mediumGray,
    align: 'right',
    valign: 'middle',
  });
}

export function downloadBulkBannerPptx(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
