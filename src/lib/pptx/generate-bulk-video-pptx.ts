/**
 * 動画構成案 一括出力 pptx 生成関数
 * サンプルv4 レイアウト準拠
 * 
 * 使い方:
 *   const blob = await generateBulkVideoPptx({
 *     batch, compositionJobs, naScriptJobs, storyboardJobs, storyboardAssets, meta
 *   });
 *   // blob を download する
 */

import pptxgen from 'pptxgenjs';
import { supabase } from '@/integrations/supabase/client'; // あなたのSupabaseクライアントのパスに合わせてください

// ==================== Off Beat ブランドカラー ====================
const COLORS = {
  textBlack: '111111',
  primaryBlue: '3B82F6',
  blueHover: '2563EB',
  gradEnd: '1E40AF',
  gradAccent: '7DD3FC',
  bgWhite: 'FFFFFF',
  textGray: '9CA3AF',
  textDark: '1F2937',
  bgLightGray: 'F8F9FA',
  border: 'E5E7EB',
  naBgLight: 'EFF6FF',
  partTagBg: 'EFF6FF',
  partTagText: '1E40AF',
  imagePlaceholder: 'E5E7EB',
};
const FONT = 'Yu Gothic';

// ==================== ロゴ(Base64) ====================
// offbeat_logo_transparent.png を base64 エンコードして埋め込み
// 実装時: /public/images/offbeat_logo_transparent.png を fetch して base64 に変換
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
    console.error('[pptx] Logo load failed:', err);
    return ''; // ロゴなしで続行
  }
}

// ==================== 型定義 ====================
interface Scene {
  part: string;           // 冒頭/前半/後半/締め
  time_range: string;     // 0:00-0:02
  telop: string;          // テロップ
  visual: string;         // 映像指示
}

interface NarrationSection {
  part: string;
  time_range: string;
  text: string;
}

interface CompositionData {
  label: string;              // "パターンA"
  appealAxis: string;         // 訴求軸テキスト(全文)
  copyText: string;           // コピー
  intent: string;             // 狙い・意図
  scenes: Scene[];
  narration: {
    sections: NarrationSection[];
    charCount: number;
    charLimitSafe: number;
  };
  storyboardImages?: Array<{  // 絵コンテ画像URLとメタデータ
    cut_number: number;
    image_url: string;
    part: string;
    time_range: string;
  }>;
}

interface Meta {
  client_name: string;
  product_name: string;
  project_name: string;
  duration_seconds: number;
  total_patterns: number;
  appeal_axes_count: number;
  copies_per_axis: number;
  with_storyboard_images: boolean;
}

// ==================== 訴求軸パース ====================
function parseAppealAxis(text: string): { tag: string; body: string } {
  const m = text.match(/^([^:]+?型)[:](.+)$/s);
  if (m) return { tag: m[1], body: m[2].trim() };
  const m2 = text.match(/^([^:]+?)[:](.+)$/s);
  if (m2) return { tag: m2[1], body: m2[2].trim() };
  return { tag: '', body: text };
}

// ==================== スライドサイズ定数 ====================
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const LOGO_RATIO = 1004 / 227;

// ==================== 画像URL→Base64変換 ====================
async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[pptx] Image fetch failed:', url, err);
    return null;
  }
}

// ==================== 表紙スライド ====================
function addCoverSlide(pres: pptxgen, meta: Meta, logoBase64: string) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.bgWhite };

  // ロゴ(左上)
  if (logoBase64) {
    const logoH = 0.6;
    slide.addImage({
      data: logoBase64,
      x: 0.5, y: 0.4, w: logoH * LOGO_RATIO, h: logoH,
    });
  }

  // タイトル(縦青バー + 「動画構成案」)
  slide.addShape('rect', {
    x: 3.5, y: 2.6, w: 0.1, h: 1.0,
    fill: { color: COLORS.primaryBlue }, line: { type: 'none' },
  });
  slide.addText('動画構成案', {
    x: 3.75, y: 2.5, w: 9.0, h: 0.7,
    fontSize: 40, bold: true, fontFace: FONT,
    color: COLORS.textBlack, align: 'left', valign: 'middle',
  });
  slide.addText('Video Composition Brief', {
    x: 3.75, y: 3.15, w: 9.0, h: 0.5,
    fontSize: 16, italic: true, fontFace: FONT,
    color: COLORS.textGray, align: 'left', valign: 'middle',
  });

  // メタテーブル(生成日時なし、「絵コンテ画像含む」なし)
  const patternLabel = `${meta.total_patterns}パターン(訴求軸${meta.appeal_axes_count}軸 × ${meta.copies_per_axis}コピー)`;
  const metaRows: [string, string][] = [
    ['クライアント', meta.client_name],
    ['商材', meta.product_name],
    ['案件', meta.project_name],
    ['動画尺', `${meta.duration_seconds}秒`],
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

  // Copyright(左下)
  slide.addText('©Off Beat Inc. All Rights Reserved.', {
    x: 0.5, y: SLIDE_H - 0.35, w: 5.0, h: 0.25,
    fontSize: 8, fontFace: FONT, color: COLORS.textGray,
    align: 'left', valign: 'middle',
  });
}

// ==================== テキスト構成案スライド ====================
function addCompositionSlide(
  pres: pptxgen,
  comp: CompositionData,
  idx: number,
  total: number,
  pageNum: number,
  meta: Meta,
  logoBase64: string
) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.bgWhite };

  // ヘッダー: 左上タイトル(青縦バー + パターンA)
  slide.addShape('rect', {
    x: 0.5, y: 0.3, w: 0.08, h: 0.5,
    fill: { color: COLORS.primaryBlue }, line: { type: 'none' },
  });
  slide.addText(comp.label, {
    x: 0.65, y: 0.25, w: 4.0, h: 0.5,
    fontSize: 20, bold: true, fontFace: FONT,
    color: COLORS.textBlack, valign: 'middle',
  });
  slide.addText(`動画尺 ${meta.duration_seconds}秒  /  全${comp.scenes.length}シーン`, {
    x: 0.65, y: 0.7, w: 6.0, h: 0.3,
    fontSize: 10, fontFace: FONT, color: COLORS.textGray,
    valign: 'middle',
  });

  // 右上: ロゴ + パターン番号
  if (logoBase64) {
    const logoH = 0.4;
    const logoW = logoH * LOGO_RATIO;
    slide.addImage({
      data: logoBase64,
      x: SLIDE_W - logoW - 0.5, y: 0.25, w: logoW, h: logoH,
    });
    slide.addText(`${idx + 1} / ${total}`, {
      x: SLIDE_W - logoW - 1.4, y: 0.3, w: 0.8, h: 0.4,
      fontSize: 11, fontFace: FONT, color: COLORS.textGray,
      align: 'right', valign: 'middle',
    });
  }

  // 装飾ライン
  slide.addShape('rect', {
    x: 0.5, y: 1.05, w: SLIDE_W - 1.0, h: 0.025,
    fill: { color: COLORS.primaryBlue }, line: { type: 'none' },
  });

  // 訴求軸【タグ】+ 本文
  const topY = 1.25;
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

  // 字コンテテーブル(左)
  const contentY = copyY + 0.55;
  slide.addText('■ 字コンテ', {
    x: 0.5, y: contentY, w: 5.0, h: 0.3,
    fontSize: 11, bold: true, fontFace: FONT,
    color: COLORS.primaryBlue, valign: 'middle',
  });

  const sceneTableY = contentY + 0.35;
  const sceneTableX = 0.5;
  const sceneTableW = 7.2;
  const numColW = 0.35;
  const partColW = 0.65;
  const timeColW = 0.8;
  const telopColW = 1.55;
  const visualColW = sceneTableW - numColW - partColW - timeColW - telopColW;

  const sceneHeaderH = 0.3;
  const sceneHeaders: [string, number, 'center' | 'left'][] = [
    ['#', numColW, 'center'],
    ['Part', partColW, 'center'],
    ['Time', timeColW, 'center'],
    ['テロップ', telopColW, 'center'],
    ['映像指示', visualColW, 'center'],
  ];
  let hx = sceneTableX;
  sceneHeaders.forEach(([label, w, align]) => {
    slide.addText(label, {
      x: hx, y: sceneTableY, w, h: sceneHeaderH,
      fontSize: 9, bold: true, fontFace: FONT,
      color: COLORS.bgWhite, fill: { color: COLORS.textBlack },
      valign: 'middle', align, margin: 2,
      line: { color: COLORS.border, width: 0.5 },
    });
    hx += w;
  });

  const bottomReserveY = 6.2;
  const availH = bottomReserveY - (sceneTableY + sceneHeaderH);
  const rowH = Math.min(0.28, availH / comp.scenes.length);
  let ry = sceneTableY + sceneHeaderH;
  comp.scenes.forEach((scene, i) => {
    let cx = sceneTableX;
    const cells: [string, number, 'center' | 'left', string, boolean, boolean][] = [
      [String(i + 1), numColW, 'center', COLORS.textDark, false, false],
      [scene.part || '', partColW, 'center', COLORS.partTagText, true, true],
      [scene.time_range || '', timeColW, 'center', COLORS.textGray, false, false],
      [scene.telop || '', telopColW, 'left', COLORS.textBlack, true, false],
      [scene.visual || '', visualColW, 'left', COLORS.textGray, false, false],
    ];
    cells.forEach(([text, w, align, color, bold, isPartCell]) => {
      slide.addText(text, {
        x: cx, y: ry, w, h: rowH,
        fontSize: 8, bold, fontFace: FONT, color,
        fill: isPartCell ? { color: COLORS.partTagBg } : { color: COLORS.bgWhite },
        valign: 'middle', align, margin: 2,
        line: { color: COLORS.border, width: 0.3 },
      });
      cx += w;
    });
    ry += rowH;
  });

  // NA原稿テーブル(右)
  const naX = sceneTableX + sceneTableW + 0.2;
  const naW = SLIDE_W - 0.5 - naX;
  const n = comp.narration;
  const withinLimit = n.charCount <= n.charLimitSafe;
  const naHeaderText = `■ NA原稿  ${n.charCount}文字 / 目安${n.charLimitSafe}文字 ${withinLimit ? '✓' : '⚠'}`;

  slide.addText(naHeaderText, {
    x: naX, y: contentY, w: naW, h: 0.3,
    fontSize: 11, bold: true, fontFace: FONT,
    color: COLORS.primaryBlue, valign: 'middle',
  });

  const naTableY = contentY + 0.35;
  const naPartW = 0.65;
  const naTimeW = 0.85;
  const naTextW = naW - naPartW - naTimeW;

  const naHeaders: [string, number, 'center' | 'left'][] = [
    ['Part', naPartW, 'center'],
    ['Time', naTimeW, 'center'],
    ['ナレーション', naTextW, 'center'],
  ];
  hx = naX;
  naHeaders.forEach(([label, w, align]) => {
    slide.addText(label, {
      x: hx, y: naTableY, w, h: sceneHeaderH,
      fontSize: 9, bold: true, fontFace: FONT,
      color: COLORS.bgWhite, fill: { color: COLORS.primaryBlue },
      valign: 'middle', align, margin: 2,
      line: { color: COLORS.border, width: 0.5 },
    });
    hx += w;
  });

  const naRowH = Math.min(0.28, availH / n.sections.length);
  let naY = naTableY + sceneHeaderH;
  n.sections.forEach((sec) => {
    let nx = naX;
    const cells: [string, number, 'center' | 'left', string, boolean, 'part' | 'na'][] = [
      [sec.part, naPartW, 'center', COLORS.partTagText, true, 'part'],
      [sec.time_range, naTimeW, 'center', COLORS.textGray, false, 'na'],
      [sec.text, naTextW, 'left', COLORS.textBlack, true, 'na'],
    ];
    cells.forEach(([text, w, align, color, bold, style]) => {
      const fillColor = style === 'part' ? COLORS.partTagBg : COLORS.naBgLight;
      slide.addText(text, {
        x: nx, y: naY, w, h: naRowH,
        fontSize: 8, bold, fontFace: FONT, color,
        fill: { color: fillColor },
        valign: 'middle', align, margin: 2,
        line: { color: COLORS.border, width: 0.3 },
      });
      nx += w;
    });
    naY += naRowH;
  });

  // 狙い・意図(青縦バー + 絵文字なし)
  const intentY = 6.35;
  slide.addShape('rect', {
    x: 0.5, y: intentY, w: 0.06, h: 0.28,
    fill: { color: COLORS.primaryBlue }, line: { type: 'none' },
  });
  slide.addText('狙い・意図', {
    x: 0.65, y: intentY - 0.02, w: 3.0, h: 0.32,
    fontSize: 11, bold: true, fontFace: FONT,
    color: COLORS.primaryBlue, valign: 'middle',
  });
  slide.addText(comp.intent || '', {
    x: 0.5, y: intentY + 0.3, w: SLIDE_W - 1.0, h: 0.7,
    fontSize: 8.5, fontFace: FONT, color: COLORS.textDark,
    fill: { color: COLORS.bgLightGray },
    valign: 'top', align: 'left', margin: 8,
  });

  // フッター
  slide.addText('©Off Beat Inc. All Rights Reserved.', {
    x: 0.5, y: SLIDE_H - 0.3, w: 5.0, h: 0.2,
    fontSize: 8, fontFace: FONT, color: COLORS.textGray,
    align: 'left', valign: 'middle',
  });
  slide.addText(`${pageNum}`, {
    x: SLIDE_W - 0.8, y: SLIDE_H - 0.3, w: 0.3, h: 0.2,
    fontSize: 9, fontFace: FONT, color: COLORS.textGray,
    align: 'right', valign: 'middle',
  });
}

// ==================== 絵コンテビジュアルスライド ====================
async function addStoryboardVisualSlide(
  pres: pptxgen,
  comp: CompositionData,
  idx: number,
  total: number,
  pageNum: number,
  logoBase64: string
) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.bgWhite };

  // ヘッダー
  slide.addShape('rect', {
    x: 0.5, y: 0.3, w: 0.08, h: 0.5,
    fill: { color: COLORS.primaryBlue }, line: { type: 'none' },
  });
  slide.addText(comp.label, {
    x: 0.65, y: 0.25, w: 4.0, h: 0.5,
    fontSize: 20, bold: true, fontFace: FONT,
    color: COLORS.textBlack, valign: 'middle',
  });
  slide.addText(`絵コンテビジュアル  /  全${comp.scenes.length}カット`, {
    x: 0.65, y: 0.7, w: 6.0, h: 0.3,
    fontSize: 10, fontFace: FONT, color: COLORS.textGray,
    valign: 'middle',
  });

  if (logoBase64) {
    const logoH = 0.4;
    const logoW = logoH * LOGO_RATIO;
    slide.addImage({
      data: logoBase64,
      x: SLIDE_W - logoW - 0.5, y: 0.25, w: logoW, h: logoH,
    });
    slide.addText(`${idx + 1} / ${total}`, {
      x: SLIDE_W - logoW - 1.4, y: 0.3, w: 0.8, h: 0.4,
      fontSize: 11, fontFace: FONT, color: COLORS.textGray,
      align: 'right', valign: 'middle',
    });
  }

  slide.addShape('rect', {
    x: 0.5, y: 1.05, w: SLIDE_W - 1.0, h: 0.025,
    fill: { color: COLORS.primaryBlue }, line: { type: 'none' },
  });

  // グリッド計算(シーン数に応じた最適配置)
  const gridStartY = 1.3;
  const gridEndY = SLIDE_H - 0.5;
  const availGridH = gridEndY - gridStartY;
  const gridW = SLIDE_W - 1.0;

  const n = comp.scenes.length;
  let cols: number, rows: number;
  if (n <= 4) { cols = 4; rows = 1; }
  else if (n <= 6) { cols = 3; rows = 2; }
  else if (n <= 8) { cols = 4; rows = 2; }
  else if (n <= 9) { cols = 3; rows = 3; }
  else if (n <= 12) { cols = 4; rows = 3; }
  else if (n <= 15) { cols = 5; rows = 3; }
  else { cols = 5; rows = Math.ceil(n / 5); }

  const cellGap = 0.15;
  const cellW = (gridW - cellGap * (cols - 1)) / cols;
  const cellH = (availGridH - cellGap * (rows - 1)) / rows;
  const captionH = 0.35;
  let imgW = cellW;
  let imgH = imgW * 9 / 16; // 16:9
  if (imgH > cellH - captionH) {
    imgH = cellH - captionH;
    imgW = imgH * 16 / 9;
  }

  // 各シーンに対応する画像URLを取得(cut_numberで紐付け)
  const imageByNumber = new Map<number, string>();
  if (comp.storyboardImages) {
    comp.storyboardImages.forEach(img => {
      imageByNumber.set(img.cut_number, img.image_url);
    });
  }

  // 各シーンを描画(順次にawait)
  for (let i = 0; i < comp.scenes.length; i++) {
    const scene = comp.scenes[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = 0.5 + col * (cellW + cellGap);
    const cy = gridStartY + row * (cellH + cellGap);

    const imgX = cx + (cellW - imgW) / 2;
    const imgY = cy;

    // 画像を埋め込む(画像URLがあれば)
    const imageUrl = imageByNumber.get(i + 1);
    if (imageUrl) {
      try {
        // PowerPointはURLから直接読めるが、CORSで落ちるケース多いのでbase64変換
        const base64 = await imageUrlToBase64(imageUrl);
        if (base64) {
          slide.addImage({
            data: base64,
            x: imgX, y: imgY, w: imgW, h: imgH,
          });
        } else {
          // base64化失敗 → プレースホルダー
          slide.addShape('rect', {
            x: imgX, y: imgY, w: imgW, h: imgH,
            fill: { color: COLORS.imagePlaceholder },
            line: { color: COLORS.border, width: 0.5 },
          });
          slide.addText('⚠ 画像読込失敗', {
            x: imgX, y: imgY, w: imgW, h: imgH,
            fontSize: 9, fontFace: FONT, color: COLORS.textGray,
            align: 'center', valign: 'middle',
          });
        }
      } catch (err) {
        console.error('[pptx] Image error for cut', i + 1, err);
      }
    } else {
      // 画像URLなし → プレースホルダー
      slide.addShape('rect', {
        x: imgX, y: imgY, w: imgW, h: imgH,
        fill: { color: COLORS.imagePlaceholder },
        line: { color: COLORS.border, width: 0.5 },
      });
      slide.addText('🖼 AI絵コンテ画像', {
        x: imgX, y: imgY, w: imgW, h: imgH,
        fontSize: 10, fontFace: FONT, color: COLORS.textGray,
        align: 'center', valign: 'middle',
      });
    }

    // シーン番号(左上青タグ)
    slide.addShape('rect', {
      x: imgX, y: imgY, w: 0.6, h: 0.35,
      fill: { color: COLORS.primaryBlue }, line: { type: 'none' },
    });
    slide.addText(`#${i + 1}`, {
      x: imgX, y: imgY, w: 0.6, h: 0.35,
      fontSize: 13, bold: true, fontFace: FONT, color: COLORS.bgWhite,
      align: 'center', valign: 'middle',
    });

    // Part(右上白背景+青枠)
    slide.addShape('rect', {
      x: imgX + imgW - 0.6, y: imgY, w: 0.6, h: 0.35,
      fill: { color: COLORS.bgWhite },
      line: { color: COLORS.primaryBlue, width: 1.0 },
    });
    slide.addText(scene.part, {
      x: imgX + imgW - 0.6, y: imgY, w: 0.6, h: 0.35,
      fontSize: 10, bold: true, fontFace: FONT, color: COLORS.primaryBlue,
      align: 'center', valign: 'middle',
    });

    // Time(画像下に大きな青文字)
    slide.addText(scene.time_range, {
      x: cx, y: cy + imgH + 0.05, w: cellW, h: captionH - 0.05,
      fontSize: 14, bold: true, fontFace: FONT, color: COLORS.primaryBlue,
      align: 'center', valign: 'middle',
    });
  }

  // フッター
  slide.addText('©Off Beat Inc. All Rights Reserved.', {
    x: 0.5, y: SLIDE_H - 0.3, w: 5.0, h: 0.2,
    fontSize: 8, fontFace: FONT, color: COLORS.textGray,
    align: 'left', valign: 'middle',
  });
  slide.addText(`${pageNum}`, {
    x: SLIDE_W - 0.8, y: SLIDE_H - 0.3, w: 0.3, h: 0.2,
    fontSize: 9, fontFace: FONT, color: COLORS.textGray,
    align: 'right', valign: 'middle',
  });
}

// ==================== メインエクスポート ====================
interface GenerateBulkVideoPptxParams {
  batch: any; // bulk_composition_batches 行
  compositionJobs: any[]; // tool_type='composition' のジョブ
  naScriptJobs?: any[]; // tool_type='narration_script' のジョブ
  storyboardJobs?: any[]; // tool_type='image_generation' のジョブ
  meta: {
    client_name: string;
    product_name: string;
    project_name: string;
    appeal_axes_count: number;
    copies_per_axis: number;
  };
}

export async function generateBulkVideoPptx(params: GenerateBulkVideoPptxParams): Promise<Blob> {
  const { batch, compositionJobs, naScriptJobs = [], storyboardJobs = [], meta: metaInput } = params;

  // ロゴ読み込み
  const logoBase64 = await loadLogoAsBase64();

  // 絵コンテ画像アセット取得(空URL除外 + 重複排除)
  let storyboardAssets: any[] = [];
  if (storyboardJobs.length > 0) {
    const { data: rawAssets } = await supabase
      .from('gen_spot_assets')
      .select('*')
      .in('job_id', storyboardJobs.map((j: any) => j.id))
      .eq('asset_type', 'storyboard_image')
      .not('file_url', 'is', null)
      .neq('file_url', '')
      .order('sort_order');

    // job_id + cut_number 単位で重複排除(最新のcreated_atを採用)
    const seen = new Map<string, any>();
    (rawAssets || []).forEach((a: any) => {
      const cutNumber = a.metadata?.cut_number || a.sort_order;
      const key = `${a.job_id}-${cutNumber}`;
      const existing = seen.get(key);
      if (!existing || new Date(a.created_at) > new Date(existing.created_at)) {
        seen.set(key, a);
      }
    });
    storyboardAssets = Array.from(seen.values()).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
  }

  // compositionJobs を bulk_index 順にソート
  const sortedComps = [...compositionJobs].sort((a, b) => {
    const ai = (a.input_data?.bulk_index ?? 0) as number;
    const bi = (b.input_data?.bulk_index ?? 0) as number;
    return ai - bi;
  });

  // NA原稿を parent_composition_job_id で紐付け
  const naByParent = new Map<string, any>();
  naScriptJobs.forEach(nj => {
    const parentId = nj.input_data?.parent_composition_job_id;
    if (parentId) naByParent.set(parentId, nj);
  });

  // 絵コンテ画像ジョブを parent_composition_job_id で紐付け
  const sbByParent = new Map<string, any>();
  storyboardJobs.forEach(sj => {
    const parentId = sj.input_data?.parent_composition_job_id;
    if (parentId) sbByParent.set(parentId, sj);
  });

  // 絵コンテ画像アセットを job_id で紐付け
  const assetsByJob = new Map<string, any[]>();
  storyboardAssets.forEach(a => {
    const arr = assetsByJob.get(a.job_id) || [];
    arr.push(a);
    assetsByJob.set(a.job_id, arr);
  });

  // 各パターンを CompositionData に変換
  const compositions: CompositionData[] = sortedComps.map((job, idx) => {
    const label = `パターン${String.fromCharCode(65 + idx)}`; // A, B, C...
    const outputData = job.output_data || {};
    const inputData = job.input_data || {};
    const scenes: Scene[] = outputData.scenes || [];

    // NA原稿
    const naJob = naByParent.get(job.id);
    const naOutput = naJob?.output_data || {};
    const naSections: NarrationSection[] = (naOutput.sections || naOutput.narration_sections || []).map((s: any) => ({
      part: s.part || '',
      time_range: s.time_range || s.time || '',
      text: s.text || s.narration || '',
    }));
    const charCount = naSections.reduce((sum, s) => sum + (s.text?.length || 0), 0);

    // 絵コンテ画像
    const sbJob = sbByParent.get(job.id);
    const assets = sbJob ? (assetsByJob.get(sbJob.id) || []) : [];
    const storyboardImages = assets.map(a => ({
      cut_number: a.metadata?.cut_number || a.sort_order,
      image_url: a.file_url,
      part: a.metadata?.part || '',
      time_range: a.metadata?.time_range || '',
    }));

    return {
      label,
      appealAxis: inputData.appeal_axis || outputData.appeal_axis || '',
      copyText: inputData.copy_text || outputData.copy_text || '',
      intent: outputData.intent || '', // WF3が出力してなければ空
      scenes,
      narration: {
        sections: naSections,
        charCount,
        charLimitSafe: 120, // 30秒動画の目安
      },
      storyboardImages,
    };
  });

  // Meta
  const meta: Meta = {
    client_name: metaInput.client_name,
    product_name: metaInput.product_name,
    project_name: metaInput.project_name,
    duration_seconds: batch.duration_seconds || 30,
    total_patterns: compositions.length,
    appeal_axes_count: metaInput.appeal_axes_count,
    copies_per_axis: metaInput.copies_per_axis,
    with_storyboard_images: batch.with_storyboard_images === true,
  };

  // pptx 生成
  const pres = new pptxgen();
  pres.defineLayout({ name: 'VIDEO_WIDE', width: SLIDE_W, height: SLIDE_H });
  pres.layout = 'VIDEO_WIDE';

  // 表紙
  addCoverSlide(pres, meta, logoBase64);

  // 各パターンスライド
  let pageNum = 2;
  for (let idx = 0; idx < compositions.length; idx++) {
    const comp = compositions[idx];
    addCompositionSlide(pres, comp, idx, compositions.length, pageNum, meta, logoBase64);
    pageNum++;

    // 絵コンテ画像ON、かつ画像がある場合のみビジュアルスライドを追加
    if (meta.with_storyboard_images && comp.storyboardImages && comp.storyboardImages.length > 0) {
      await addStoryboardVisualSlide(pres, comp, idx, compositions.length, pageNum, logoBase64);
      pageNum++;
    }
  }

  // Blobで出力
  const data = await pres.write({ outputType: 'blob' });
  return data as Blob;
}
