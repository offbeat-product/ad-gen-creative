/**
 * バナー構成案 一括出力 pptx 生成関数
 * Off Beat ブランド v4 レイアウト準拠
 * - プライマリーブルー統一
 * - CTAボタンは0個または1個(オプション)
 * - CTAなしの場合はメインコピー/サブコピー拡大
 */

import pptxgen from 'pptxgenjs';

// ==================== Off Beat ブランドカラー ====================
const COLORS = {
  textBlack: '111111',
  primaryBlue: '3B82F6',
  blueHover: '2563EB',
  blueDark: '1E40AF',
  bgWhite: 'FFFFFF',
  textGray: '9CA3AF',
  textDark: '1F2937',
  bgLightGray: 'F8F9FA',
  border: 'E5E7EB',
  mainCopyBg: 'EFF6FF',
  mainCopyText: '1E40AF',
  mainCopyAccent: '3B82F6',
  subCopyBg: 'F8F9FA',
  subCopyBorder: '3B82F6',
  ctaBg: '3B82F6',
  ctaText: 'FFFFFF',
  supportBg: 'F3F4F6',
  supportText: '4B5563',
  briefLabelBg: 'E0E7FF',
  briefLabelText: '3730A3',
};
const FONT = 'Yu Gothic';

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const LOGO_RATIO = 1004 / 227;

// ==================== ロゴ読み込み ====================
async function loadLogoAsBase64(): Promise<string> {
  try {
    const response = await fetch('/images/offbeat_logo_transparent.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('[banner pptx] Logo load failed:', err);
    return '';
  }
}

// ==================== 型定義 ====================
interface BannerData {
  main_copy_lines: string[];
  sub_copy: string;
  cta_button: string | null;  // 🆕 単数、nullable
  support_text: string;
}

interface BriefData {
  target_age?: string;
  insight_category?: string;
  insight?: string;
  what_to_say?: string;
  user_situation?: string;
  user_motivation?: string;
  user_merit?: string;
}

interface BannerCompositionData {
  label: string;
  appealAxis: string;
  copyText: string;
  banner: BannerData;
  brief: BriefData;
}

interface BannerMeta {
  client_name: string;
  product_name: string;
  project_name: string;
  banner_type: string;
  total_patterns: number;
  appeal_axes_count: number;
  copies_per_axis: number;
}

// ==================== 訴求軸パース ====================
function parseAppealAxis(text: string): { tag: string; body: string } {
  const m = text.match(/^([^:]+?型)[:](.+)$/s);
  if (m) return { tag: m[1], body: m[2].trim() };
  const m2 = text.match(/^([^:]+?)[:](.+)$/s);
  if (m2) return { tag: m2[1], body: m2[2].trim() };
  return { tag: '', body: text };
}

// ==================== 表紙 ====================
function addCoverSlide(pres: pptxgen, meta: BannerMeta, logoBase64: string) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.bgWhite };

  if (logoBase64) {
    const logoH = 0.6;
    slide.addImage({
      data: logoBase64,
      x: 0.5, y: 0.4, w: logoH * LOGO_RATIO, h: logoH,
    });
  }

  slide.addShape('rect', {
    x: 3.5, y: 2.6, w: 0.1, h: 1.0,
    fill: { color: COLORS.primaryBlue }, line: { type: 'none' },
  });
  slide.addText('バナー構成案', {
    x: 3.75, y: 2.5, w: 9.0, h: 0.7,
    fontSize: 40, bold: true, fontFace: FONT,
    color: COLORS.textBlack, align: 'left', valign: 'middle',
  });
  slide.addText('Banner Composition Brief', {
    x: 3.75, y: 3.15, w: 9.0, h: 0.5,
    fontSize: 16, italic: true, fontFace: FONT,
    color: COLORS.textGray, align: 'left', valign: 'middle',
  });

  const patternLabel = `${meta.total_patterns}パターン(訴求軸${meta.appeal_axes_count}軸 × ${meta.copies_per_axis}コピー)`;
  const metaRows: [string, string][] = [
    ['クライアント', meta.client_name],
    ['商材', meta.product_name],
    ['案件', meta.project_name],
    ['バナー種別', meta.banner_type],
    ['構成案パターン数', patternLabel],
  ];
  let metaY = 4.5;
  metaRows.forEach(([label, value]) => {
    slide.addText(label, {
      x: 3.5, y: metaY, w: 2.5, h: 0.4,
      fontSize: 11, bold: true, fontFace: FONT,
      color: COLORS.textGray, valign: 'middle', align: 'left', margin: 0,
    });
    slide.addText(value, {
      x: 6.0, y: metaY, w: 6.5, h: 0.4,
      fontSize: 11, fontFace: FONT, color: COLORS.textDark,
      valign: 'middle', align: 'left', margin: 0,
    });
    slide.addShape('line', {
      x: 3.5, y: metaY + 0.38, w: 9.0, h: 0,
      line: { color: COLORS.border, width: 0.5 },
    });
    metaY += 0.4;
  });

  slide.addText('©Off Beat Inc. All Rights Reserved.', {
    x: 0.5, y: SLIDE_H - 0.35, w: 5.0, h: 0.25,
    fontSize: 8, fontFace: FONT, color: COLORS.textGray,
    align: 'left', valign: 'middle',
  });
}

// ==================== バナースライド(CTA単数/任意対応) ====================
function addBannerSlide(
  pres: pptxgen,
  comp: BannerCompositionData,
  logoBase64: string
) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.bgWhite };

  // ヘッダー
  slide.addShape('rect', {
    x: 0.5, y: 0.4, w: 0.08, h: 0.5,
    fill: { color: COLORS.primaryBlue }, line: { type: 'none' },
  });
  slide.addText(comp.label, {
    x: 0.65, y: 0.35, w: 6.0, h: 0.5,
    fontSize: 20, bold: true, fontFace: FONT,
    color: COLORS.textBlack, valign: 'middle',
  });
  slide.addText('デジタル静止画広告', {
    x: 0.65, y: 0.8, w: 6.0, h: 0.3,
    fontSize: 10, fontFace: FONT, color: COLORS.textGray,
    valign: 'middle',
  });

  if (logoBase64) {
    const logoH = 0.5;
    const logoW = logoH * LOGO_RATIO;
    slide.addImage({
      data: logoBase64,
      x: SLIDE_W - logoW - 0.5, y: 0.4, w: logoW, h: logoH,
    });
  }

  slide.addShape('rect', {
    x: 0.5, y: 1.15, w: SLIDE_W - 1.0, h: 0.025,
    fill: { color: COLORS.primaryBlue }, line: { type: 'none' },
  });

  // 訴求軸
  const topY = 1.35;
  const labelW = 1.3;
  const appealH = (comp.appealAxis || '').length > 60 ? 0.6 : 0.45;

  slide.addText('訴求軸', {
    x: 0.5, y: topY, w: labelW, h: appealH,
    fontSize: 10, bold: true, fontFace: FONT,
    color: COLORS.bgWhite, fill: { color: COLORS.primaryBlue },
    valign: 'middle', align: 'center', margin: 6,
  });

  const parsed = parseAppealAxis(comp.appealAxis);
  slide.addText([
    { text: `【${parsed.tag}】`, options: { bold: true, color: COLORS.primaryBlue, fontSize: 11 } },
    { text: '  ' + parsed.body, options: { color: COLORS.textDark, fontSize: 10 } },
  ], {
    x: 0.5 + labelW, y: topY, w: SLIDE_W - 1.0 - labelW, h: appealH,
    fontFace: FONT,
    fill: { color: COLORS.bgLightGray },
    valign: 'middle', align: 'left', margin: 8,
  });

  // コピー
  const copyY = topY + appealH + 0.05;
  slide.addText('コピー', {
    x: 0.5, y: copyY, w: labelW, h: 0.45,
    fontSize: 10, bold: true, fontFace: FONT,
    color: COLORS.bgWhite, fill: { color: COLORS.blueHover },
    valign: 'middle', align: 'center', margin: 6,
  });
  slide.addText(comp.copyText, {
    x: 0.5 + labelW, y: copyY, w: SLIDE_W - 1.0 - labelW, h: 0.45,
    fontSize: 10, bold: true, fontFace: FONT, color: COLORS.textBlack,
    fill: { color: COLORS.bgLightGray },
    valign: 'middle', align: 'left', margin: 8,
  });

  // ===== 左側: バナー構成要素(CTA有無で分岐) =====
  const contentY = copyY + 0.55;
  const leftX = 0.5;
  const leftW = 6.2;

  slide.addText('■ バナー構成要素', {
    x: leftX, y: contentY, w: leftW, h: 0.3,
    fontSize: 11, bold: true, fontFace: FONT,
    color: COLORS.primaryBlue, valign: 'middle',
  });

  const bottomLimit = SLIDE_H - 0.5;

  // 🆕 CTA有無判定
  const hasCta = !!(comp.banner.cta_button && comp.banner.cta_button.trim() !== '');
  const hasSupport = !!(comp.banner.support_text && comp.banner.support_text.trim() !== '');

  // CTAあり: メインコピー標準、CTA中央1個
  // CTAなし: メインコピー拡大、サブコピー拡大
  const mainCopyH = hasCta ? 1.2 : 1.5;
  const subCopyH = hasCta ? 0.85 : 1.1;
  const ctaH = 0.55;
  const supportH = hasCta ? 0.35 : 0.5;
  const gap = 0.3;
  const labelH = 0.25;

  let bY = contentY + 0.4;

  // メインコピー
  slide.addText('メインコピー', {
    x: leftX, y: bY, w: 1.5, h: labelH,
    fontSize: 9, bold: true, fontFace: FONT,
    color: COLORS.mainCopyText, valign: 'middle',
  });
  const mainText = (comp.banner.main_copy_lines || []).join('\n');
  slide.addShape('rect', {
    x: leftX, y: bY + 0.28, w: leftW, h: mainCopyH,
    fill: { color: COLORS.mainCopyBg },
    line: { color: COLORS.mainCopyAccent, width: 2.0 },
  });
  slide.addText(mainText, {
    x: leftX + 0.1, y: bY + 0.28, w: leftW - 0.2, h: mainCopyH,
    fontSize: hasCta ? 22 : 26, bold: true, fontFace: FONT,
    color: COLORS.mainCopyText, align: 'center', valign: 'middle',
  });

  // サブコピー
  bY += mainCopyH + gap;
  slide.addText('サブコピー', {
    x: leftX, y: bY, w: 1.2, h: labelH,
    fontSize: 9, bold: true, fontFace: FONT,
    color: COLORS.blueDark, valign: 'middle',
  });
  slide.addText(comp.banner.sub_copy || '', {
    x: leftX, y: bY + 0.28, w: leftW, h: subCopyH,
    fontSize: hasCta ? 12 : 14, bold: true, fontFace: FONT,
    color: COLORS.textDark,
    fill: { color: COLORS.subCopyBg },
    valign: 'middle', align: 'center', margin: 6,
    line: { color: COLORS.subCopyBorder, width: 0.5 },
  });

  // CTAボタン(ある場合のみ、中央に1つ)
  if (hasCta) {
    bY += subCopyH + gap;
    slide.addText('CTAボタン', {
      x: leftX, y: bY, w: 1.2, h: labelH,
      fontSize: 9, bold: true, fontFace: FONT,
      color: COLORS.primaryBlue, valign: 'middle',
    });
    const ctaW = leftW * 0.6;
    const ctaX = leftX + (leftW - ctaW) / 2;
    slide.addShape('roundRect', {
      x: ctaX, y: bY + 0.28, w: ctaW, h: ctaH,
      fill: { color: COLORS.ctaBg }, line: { type: 'none' },
      rectRadius: 0.1,
    });
    slide.addText(comp.banner.cta_button as string, {
      x: ctaX, y: bY + 0.28, w: ctaW, h: ctaH,
      fontSize: 17, bold: true, fontFace: FONT,
      color: COLORS.ctaText, align: 'center', valign: 'middle',
    });
    bY += ctaH + gap;
  } else {
    bY += subCopyH + gap;
  }

  // サポートテキスト(ある場合のみ)
  if (hasSupport) {
    slide.addText('サポートテキスト', {
      x: leftX, y: bY, w: 1.8, h: labelH,
      fontSize: 9, bold: true, fontFace: FONT,
      color: COLORS.supportText, valign: 'middle',
    });
    slide.addText(`※ ${comp.banner.support_text}`, {
      x: leftX, y: bY + 0.28, w: leftW, h: supportH,
      fontSize: hasCta ? 9 : 11, fontFace: FONT, color: COLORS.supportText,
      fill: { color: COLORS.supportBg },
      valign: 'middle', align: 'left', margin: 5,
    });
  }

  // ===== 右側: ブリーフ情報 =====
  const rightX = leftX + leftW + 0.3;
  const rightW = SLIDE_W - 0.5 - rightX;

  slide.addText('■ ブリーフ情報', {
    x: rightX, y: contentY, w: rightW, h: 0.3,
    fontSize: 11, bold: true, fontFace: FONT,
    color: COLORS.primaryBlue, valign: 'middle',
  });

  const b = comp.brief || {};
  const briefRows: [string, string][] = [
    ['ターゲット年齢', b.target_age || '-'],
    ['インサイトカテゴリ', b.insight_category || '-'],
    ['インサイト', b.insight || '-'],
    ['What to Say', b.what_to_say || '-'],
    ['ユーザーシチュエーション', b.user_situation || '-'],
    ['ユーザーモチベーション', b.user_motivation || '-'],
    ['ユーザーメリット', b.user_merit || '-'],
  ];

  const rightAvailH = bottomLimit - (contentY + 0.4);
  const rowH = rightAvailH / briefRows.length;
  const labelColW = 2.3;

  let rY = contentY + 0.4;
  briefRows.forEach(([label, value]) => {
    slide.addText(label, {
      x: rightX, y: rY, w: labelColW, h: rowH - 0.04,
      fontSize: 9, bold: true, fontFace: FONT,
      color: COLORS.briefLabelText,
      fill: { color: COLORS.briefLabelBg },
      valign: 'middle', align: 'center', margin: 4,
      line: { color: COLORS.border, width: 0.3 },
    });
    slide.addText(value, {
      x: rightX + labelColW, y: rY, w: rightW - labelColW, h: rowH - 0.04,
      fontSize: 9, fontFace: FONT, color: COLORS.textDark,
      fill: { color: COLORS.bgWhite },
      valign: 'middle', align: 'left', margin: 6,
      line: { color: COLORS.border, width: 0.3 },
    });
    rY += rowH;
  });

  // フッター
  slide.addText('©Off Beat Inc. All Rights Reserved.', {
    x: 0.5, y: SLIDE_H - 0.3, w: 5.0, h: 0.2,
    fontSize: 8, fontFace: FONT, color: COLORS.textGray,
    align: 'left', valign: 'middle',
  });
}

// ==================== メインエクスポート ====================
interface GenerateBulkBannerPptxParams {
  batch: any;
  compositionJobs: any[];
  meta: {
    client_name: string;
    product_name: string;
    project_name: string;
    appeal_axes_count: number;
    copies_per_axis: number;
    banner_type?: string;
  };
}

export async function generateBulkBannerPptx(params: GenerateBulkBannerPptxParams): Promise<Blob> {
  const { compositionJobs, meta: metaInput } = params;

  const logoBase64 = await loadLogoAsBase64();

  // bulk_index 順にソート
  const sortedComps = [...compositionJobs].sort((a, b) => {
    const ai = (a.input_data?.bulk_index ?? 0) as number;
    const bi = (b.input_data?.bulk_index ?? 0) as number;
    return ai - bi;
  });

  // CompositionData に変換
  const compositions: BannerCompositionData[] = sortedComps.map((job, idx) => {
    const label = `パターン${String.fromCharCode(65 + idx)}`;
    const outputData = job.output_data || {};
    const inputData = job.input_data || {};

    const rawBanner = outputData.banner || {};
    
    // 🆕 cta_button 取得(新形式 + 旧形式 両対応)
    let ctaButton: string | null = null;
    if (rawBanner.cta_button !== undefined && rawBanner.cta_button !== null) {
      const s = String(rawBanner.cta_button).trim();
      ctaButton = s === '' ? null : s;
    } else if (Array.isArray(rawBanner.cta_buttons) && rawBanner.cta_buttons.length > 0) {
      // 旧形式(cta_buttons配列)があれば最初の1つだけ採用
      const s = String(rawBanner.cta_buttons[0] || '').trim();
      ctaButton = s === '' ? null : s;
    }

    const banner: BannerData = {
      main_copy_lines: rawBanner.main_copy_lines || [],
      sub_copy: rawBanner.sub_copy || '',
      cta_button: ctaButton,
      support_text: rawBanner.support_text || '',
    };

    const brief: BriefData = outputData.brief || inputData.brief || {};

    return {
      label,
      appealAxis: inputData.appeal_axis || outputData.appeal_axis || '',
      copyText: inputData.copy_text || outputData.copy_text || '',
      banner,
      brief,
    };
  });

  const meta: BannerMeta = {
    client_name: metaInput.client_name,
    product_name: metaInput.product_name,
    project_name: metaInput.project_name,
    banner_type: metaInput.banner_type || 'デジタル静止画広告',
    total_patterns: compositions.length,
    appeal_axes_count: metaInput.appeal_axes_count,
    copies_per_axis: metaInput.copies_per_axis,
  };

  const pres = new pptxgen();
  pres.defineLayout({ name: 'BANNER_WIDE', width: SLIDE_W, height: SLIDE_H });
  pres.layout = 'BANNER_WIDE';

  addCoverSlide(pres, meta, logoBase64);
  compositions.forEach((comp) => {
    addBannerSlide(pres, comp, logoBase64);
  });

  const data = await pres.write({ outputType: 'blob' });
  return data as Blob;
}
