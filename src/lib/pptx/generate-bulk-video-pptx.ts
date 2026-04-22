import pptxgen from 'pptxgenjs';
import { supabase } from '@/integrations/supabase/client';
import type {
  BulkCompositionBatch,
  BulkCompositionJob,
} from '@/types/bulk-composition';

// ===== Design tokens (v4) =====
const COLORS = {
  primary: '3B82F6',
  text: '111111',
  textSub: '1F2937',
  gray: '9CA3AF',
  lightBg: 'F8F9FA',
  white: 'FFFFFF',
  border: 'E5E7EB',
  tableHeader: 'EFF6FF',
};
const FONT = 'Yu Gothic';
const LOGO_URL = '/images/offbeat_logo_transparent.png';

interface Params {
  batch: BulkCompositionBatch;
  compositionJobs: BulkCompositionJob[];
  naScriptJobs?: BulkCompositionJob[];
  storyboardJobs?: BulkCompositionJob[];
  meta: {
    client_name: string;
    product_name: string;
    project_name: string;
  };
}

interface SceneData {
  part?: string;
  time_range?: string;
  telop?: string;
  visual?: string;
  narration?: string;
}

interface StoryboardImage {
  id: string;
  file_url: string;
  sort_order: number | null;
  metadata: {
    cut_number?: number;
    time_range?: string;
    part?: string;
  } | null;
}

// ===== Helpers =====
async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function highlightAppealAxis(text: string): { text: string; bold?: boolean; color?: string }[] {
  // 「〜型」を【】+太字青で強調
  const match = text.match(/^(.*?)([^\s「」]+型)(.*)$/);
  if (!match) return [{ text }];
  return [
    { text: match[1] },
    { text: `【${match[2]}】`, bold: true, color: COLORS.primary },
    { text: match[3] },
  ];
}

function addCommonDecorations(
  slide: pptxgen.Slide,
  pageNum: number,
  totalPages: number,
  logoData: string | null
) {
  // 右上ロゴ
  if (logoData) {
    slide.addImage({
      data: logoData,
      x: 11.4,
      y: 0.2,
      w: 1.7,
      h: 0.45,
    });
  }
  // 左下 Copyright
  slide.addText('© Off Beat Inc. All Rights Reserved.', {
    x: 0.35,
    y: 7.15,
    w: 6,
    h: 0.3,
    fontSize: 9,
    fontFace: FONT,
    color: COLORS.gray,
    align: 'left',
  });
  // 右下 ページ番号
  slide.addText(`${pageNum} / ${totalPages}`, {
    x: 12.0,
    y: 7.15,
    w: 1.0,
    h: 0.3,
    fontSize: 9,
    fontFace: FONT,
    color: COLORS.gray,
    align: 'right',
  });
}

// ===== Cover slide =====
function buildCoverSlide(
  pres: pptxgen,
  meta: Params['meta'],
  durationSeconds: number,
  patternCount: number,
  appealAxesCount: number,
  copiesPerAxis: number,
  pageNum: number,
  totalPages: number,
  logoData: string | null
) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };

  // 左の青縦バー
  slide.addShape('rect', {
    x: 0.7,
    y: 2.2,
    w: 0.12,
    h: 1.6,
    fill: { color: COLORS.primary },
    line: { type: 'none' },
  });

  // タイトル
  slide.addText('動画構成案', {
    x: 1.0,
    y: 2.2,
    w: 11,
    h: 0.9,
    fontSize: 44,
    bold: true,
    fontFace: FONT,
    color: COLORS.text,
  });

  // サブタイトル
  slide.addText('Bulk Generated Composition', {
    x: 1.0,
    y: 3.05,
    w: 11,
    h: 0.5,
    fontSize: 18,
    fontFace: FONT,
    color: COLORS.gray,
  });

  // メタテーブル
  const rows: pptxgen.TableRow[] = [
    [
      { text: 'クライアント', options: { bold: true, fill: { color: COLORS.lightBg }, color: COLORS.textSub } },
      { text: meta.client_name || '-', options: { color: COLORS.text } },
    ],
    [
      { text: '商材', options: { bold: true, fill: { color: COLORS.lightBg }, color: COLORS.textSub } },
      { text: meta.product_name || '-', options: { color: COLORS.text } },
    ],
    [
      { text: '案件', options: { bold: true, fill: { color: COLORS.lightBg }, color: COLORS.textSub } },
      { text: meta.project_name || '-', options: { color: COLORS.text } },
    ],
    [
      { text: '動画尺', options: { bold: true, fill: { color: COLORS.lightBg }, color: COLORS.textSub } },
      { text: `${durationSeconds}秒`, options: { color: COLORS.text } },
    ],
    [
      {
        text: '構成案パターン数',
        options: { bold: true, fill: { color: COLORS.lightBg }, color: COLORS.textSub },
      },
      {
        text: `${patternCount}パターン(訴求軸${appealAxesCount}軸 × ${copiesPerAxis}コピー)`,
        options: { color: COLORS.text },
      },
    ],
  ];

  slide.addTable(rows, {
    x: 1.0,
    y: 4.0,
    w: 11.3,
    colW: [3.0, 8.3],
    fontSize: 13,
    fontFace: FONT,
    border: { type: 'solid', pt: 1, color: COLORS.border },
    rowH: 0.45,
  });

  addCommonDecorations(slide, pageNum, totalPages, logoData);
}

// ===== Composition text slide =====
function buildCompositionSlide(
  pres: pptxgen,
  job: BulkCompositionJob,
  naScriptJob: BulkCompositionJob | undefined,
  index: number,
  total: number,
  pageNum: number,
  totalPages: number,
  logoData: string | null
) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };

  const input = (job.input_data || {}) as Record<string, unknown>;
  const output = (job.output_data || {}) as Record<string, unknown>;
  const scenes = ((output.scenes as SceneData[]) || []).slice(0, 30);
  const appealAxis = (input.appeal_axis as string) || '';
  const copyText = (input.copy_text as string) || '';
  const intent =
    ((output.intent as string) ||
      (output.purpose as string) ||
      (output.intention as string) ||
      '') as string;

  // ===== ヘッダー: パターン番号 + 訴求軸 =====
  slide.addText(`#${index} / ${total}`, {
    x: 0.35,
    y: 0.25,
    w: 1.5,
    h: 0.4,
    fontSize: 14,
    bold: true,
    fontFace: FONT,
    color: COLORS.primary,
  });

  // 訴求軸(【型】を強調)
  slide.addText(highlightAppealAxis(appealAxis), {
    x: 1.85,
    y: 0.22,
    w: 9.4,
    h: 0.45,
    fontSize: 14,
    fontFace: FONT,
    color: COLORS.textSub,
  });

  // コピーテキスト
  slide.addText(`「${copyText}」`, {
    x: 0.35,
    y: 0.7,
    w: 11,
    h: 0.5,
    fontSize: 16,
    bold: true,
    fontFace: FONT,
    color: COLORS.text,
  });

  // ===== 字コンテテーブル(左) =====
  const sceneRows: pptxgen.TableRow[] = [
    [
      { text: '#', options: { bold: true, fill: { color: COLORS.tableHeader }, color: COLORS.textSub, align: 'center' } },
      { text: 'Time', options: { bold: true, fill: { color: COLORS.tableHeader }, color: COLORS.textSub, align: 'center' } },
      { text: 'テロップ', options: { bold: true, fill: { color: COLORS.tableHeader }, color: COLORS.textSub } },
      { text: '映像', options: { bold: true, fill: { color: COLORS.tableHeader }, color: COLORS.textSub } },
    ],
    ...scenes.map((s, i) => [
      { text: String(i + 1), options: { color: COLORS.textSub, align: 'center' as const } },
      { text: s.time_range || '-', options: { color: COLORS.textSub, align: 'center' as const, fontSize: 9 } },
      { text: s.telop || '-', options: { color: COLORS.text } },
      { text: s.visual || '-', options: { color: COLORS.textSub, fontSize: 9 } },
    ]),
  ];

  slide.addText('字コンテ', {
    x: 0.35,
    y: 1.3,
    w: 7.5,
    h: 0.35,
    fontSize: 12,
    bold: true,
    fontFace: FONT,
    color: COLORS.primary,
  });

  slide.addTable(sceneRows, {
    x: 0.35,
    y: 1.65,
    w: 7.5,
    colW: [0.4, 1.0, 3.0, 3.1],
    fontSize: 10,
    fontFace: FONT,
    border: { type: 'solid', pt: 0.5, color: COLORS.border },
    valign: 'middle',
  });

  // ===== NA原稿(右) =====
  slide.addText('NA原稿', {
    x: 8.0,
    y: 1.3,
    w: 5.0,
    h: 0.35,
    fontSize: 12,
    bold: true,
    fontFace: FONT,
    color: COLORS.primary,
  });

  let naText = '(NA原稿は生成されていません)';
  if (naScriptJob && naScriptJob.status === 'completed') {
    const naOutput = (naScriptJob.output_data || {}) as Record<string, unknown>;
    naText =
      (naOutput.full_script as string) ||
      (naOutput.script as string) ||
      '(NA原稿が空です)';
  } else if (naScriptJob) {
    naText = '(NA原稿は生成中または失敗)';
  }

  slide.addText(naText, {
    x: 8.0,
    y: 1.65,
    w: 5.0,
    h: 4.5,
    fontSize: 11,
    fontFace: FONT,
    color: COLORS.text,
    valign: 'top',
    fill: { color: COLORS.lightBg },
    margin: 8,
  });

  // ===== 狙い・意図(下) =====
  if (intent) {
    // 青縦バー
    slide.addShape('rect', {
      x: 0.35,
      y: 6.35,
      w: 0.08,
      h: 0.65,
      fill: { color: COLORS.primary },
      line: { type: 'none' },
    });
    slide.addText('狙い・意図', {
      x: 0.5,
      y: 6.3,
      w: 2,
      h: 0.3,
      fontSize: 11,
      bold: true,
      fontFace: FONT,
      color: COLORS.primary,
    });
    slide.addText(intent, {
      x: 0.5,
      y: 6.6,
      w: 12.5,
      h: 0.45,
      fontSize: 10,
      fontFace: FONT,
      color: COLORS.textSub,
    });
  }

  addCommonDecorations(slide, pageNum, totalPages, logoData);
}

// ===== Storyboard visual slide =====
function buildStoryboardSlide(
  pres: pptxgen,
  job: BulkCompositionJob,
  images: StoryboardImage[],
  imageDataMap: Map<string, string>,
  index: number,
  total: number,
  pageNum: number,
  totalPages: number,
  logoData: string | null
) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };

  const input = (job.input_data || {}) as Record<string, unknown>;
  const appealAxis = (input.appeal_axis as string) || '';

  // ===== ヘッダー =====
  slide.addText(`#${index} / ${total}  絵コンテビジュアル`, {
    x: 0.35,
    y: 0.25,
    w: 11,
    h: 0.4,
    fontSize: 14,
    bold: true,
    fontFace: FONT,
    color: COLORS.primary,
  });

  slide.addText(highlightAppealAxis(appealAxis), {
    x: 0.35,
    y: 0.65,
    w: 12.5,
    h: 0.4,
    fontSize: 12,
    fontFace: FONT,
    color: COLORS.textSub,
  });

  // ===== グリッド配置 =====
  const count = images.length;
  let cols = 4;
  let rows = 3;
  if (count <= 6) {
    cols = 3;
    rows = 2;
  } else if (count <= 12) {
    cols = 4;
    rows = 3;
  } else {
    cols = 5;
    rows = Math.ceil(count / 5);
  }

  const gridX = 0.35;
  const gridY = 1.2;
  const gridW = 12.6;
  const gridH = 5.7;
  const gap = 0.12;
  const cardW = (gridW - gap * (cols - 1)) / cols;
  const imgH = (gridH - gap * (rows - 1)) / rows - 0.35; // image + time label

  images.forEach((img, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const cardX = gridX + c * (cardW + gap);
    const cardY = gridY + r * (imgH + 0.35 + gap);

    const data = imageDataMap.get(img.id);
    if (data) {
      slide.addImage({
        data,
        x: cardX,
        y: cardY,
        w: cardW,
        h: imgH,
        sizing: { type: 'cover', w: cardW, h: imgH },
      });
    } else {
      slide.addShape('rect', {
        x: cardX,
        y: cardY,
        w: cardW,
        h: imgH,
        fill: { color: COLORS.lightBg },
        line: { color: COLORS.border, width: 0.5 },
      });
    }

    // シーン番号タグ(左上)
    const cutNum = img.metadata?.cut_number ?? i + 1;
    slide.addShape('rect', {
      x: cardX + 0.05,
      y: cardY + 0.05,
      w: 0.4,
      h: 0.28,
      fill: { color: COLORS.primary },
      line: { type: 'none' },
    });
    slide.addText(`#${cutNum}`, {
      x: cardX + 0.05,
      y: cardY + 0.05,
      w: 0.4,
      h: 0.28,
      fontSize: 9,
      bold: true,
      fontFace: FONT,
      color: COLORS.white,
      align: 'center',
      valign: 'middle',
    });

    // Part(右上)
    if (img.metadata?.part) {
      slide.addText(img.metadata.part, {
        x: cardX + cardW - 0.7,
        y: cardY + 0.05,
        w: 0.65,
        h: 0.28,
        fontSize: 8,
        bold: true,
        fontFace: FONT,
        color: COLORS.primary,
        align: 'center',
        valign: 'middle',
        fill: { color: COLORS.white },
        line: { color: COLORS.primary, width: 0.5 },
      });
    }

    // Time(画像下)
    slide.addText(img.metadata?.time_range || '-', {
      x: cardX,
      y: cardY + imgH + 0.02,
      w: cardW,
      h: 0.3,
      fontSize: 11,
      bold: true,
      fontFace: FONT,
      color: COLORS.primary,
      align: 'center',
    });
  });

  addCommonDecorations(slide, pageNum, totalPages, logoData);
}

// ===== Main entry =====
export async function generateBulkVideoPptx(params: Params): Promise<Blob> {
  const {
    batch,
    compositionJobs,
    naScriptJobs = [],
    storyboardJobs = [],
    meta,
  } = params;

  // ロゴ取得
  const logoData = await fetchLogoBase64();

  // 構成案ジョブをbulk_indexでソート
  const sortedComps = [...compositionJobs].sort(
    (a, b) =>
      (((a.input_data as Record<string, unknown>)?.bulk_index as number) ?? 0) -
      (((b.input_data as Record<string, unknown>)?.bulk_index as number) ?? 0)
  );

  // 親ジョブ -> NA/絵コンテ ジョブのマップ
  const naByParent = new Map<string, BulkCompositionJob>();
  for (const nj of naScriptJobs) {
    const pid = (nj.input_data as Record<string, unknown>)
      ?.parent_composition_job_id as string | undefined;
    if (pid) naByParent.set(pid, nj);
  }
  const sbByParent = new Map<string, BulkCompositionJob>();
  for (const sj of storyboardJobs) {
    const pid = (sj.input_data as Record<string, unknown>)
      ?.parent_composition_job_id as string | undefined;
    if (pid) sbByParent.set(pid, sj);
  }

  // 絵コンテ画像を一括取得
  const sbJobIds = storyboardJobs
    .filter((j) => j.status === 'completed')
    .map((j) => j.id);
  const imagesByJob = new Map<string, StoryboardImage[]>();
  const imageDataMap = new Map<string, string>();

  if (sbJobIds.length > 0) {
    const { data: assets } = await supabase
      .from('gen_spot_assets')
      .select('*')
      .in('job_id', sbJobIds)
      .eq('asset_type', 'storyboard_image')
      .order('sort_order', { ascending: true });

    if (assets) {
      for (const a of assets as unknown as Array<
        StoryboardImage & { job_id: string }
      >) {
        const arr = imagesByJob.get(a.job_id) || [];
        arr.push(a);
        imagesByJob.set(a.job_id, arr);
      }

      // 画像をbase64に変換(並列)
      const allImages = assets as unknown as StoryboardImage[];
      const results = await Promise.all(
        allImages.map((img) =>
          fetchImageBase64(img.file_url).then((d) => ({ id: img.id, d }))
        )
      );
      for (const r of results) {
        if (r.d) imageDataMap.set(r.id, r.d);
      }
    }
  }

  // 訴求軸の数を集計(訴求軸ごとのコピー数)
  const axesSet = new Set<string>();
  for (const j of sortedComps) {
    const ax = (j.input_data as Record<string, unknown>)?.appeal_axis as string;
    if (ax) axesSet.add(ax);
  }
  const appealAxesCount = Math.max(1, axesSet.size);
  const copiesPerAxis = Math.max(
    1,
    Math.round(sortedComps.length / appealAxesCount)
  );
  const durationSeconds = batch.duration_seconds || 30;

  // ===== 総ページ数を計算 =====
  // 表紙(1) + 構成案(N) + 絵コンテ(N or 0)
  const withSb = batch.with_storyboard_images && sbJobIds.length > 0;
  const totalPages = 1 + sortedComps.length + (withSb ? sortedComps.length : 0);

  // ===== pptx 構築 =====
  const pres = new pptxgen();
  pres.defineLayout({ name: 'WIDE_16_9', width: 13.333, height: 7.5 });
  pres.layout = 'WIDE_16_9';

  let pageNum = 1;

  // 表紙
  buildCoverSlide(
    pres,
    meta,
    durationSeconds,
    sortedComps.length,
    appealAxesCount,
    copiesPerAxis,
    pageNum++,
    totalPages,
    logoData
  );

  // 各パターン: テキスト構成案 + (オプション)絵コンテ
  sortedComps.forEach((job, i) => {
    buildCompositionSlide(
      pres,
      job,
      naByParent.get(job.id),
      i + 1,
      sortedComps.length,
      pageNum++,
      totalPages,
      logoData
    );

    if (withSb) {
      const sbJob = sbByParent.get(job.id);
      const images = sbJob ? imagesByJob.get(sbJob.id) || [] : [];
      buildStoryboardSlide(
        pres,
        job,
        images,
        imageDataMap,
        i + 1,
        sortedComps.length,
        pageNum++,
        totalPages,
        logoData
      );
    }
  });

  const blob = await pres.write({ outputType: 'blob' });
  return blob as Blob;
}

export function downloadBulkVideoPptx(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
