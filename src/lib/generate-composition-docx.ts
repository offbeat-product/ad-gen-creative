/**
 * 構成案・字コンテ docx出力
 *
 * 使用ライブラリ: docx (npm install docx)
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
} from 'docx';

// ============== 型定義 ==============
export interface CompositionData {
  meta: {
    client_name: string;
    product_name: string;
    project_name: string;
    generated_at: string;
    creative_type: 'video' | 'static';
    duration_seconds: number;
    appeal_axis: string;
    copy_text: string;
  };
  scenes: Array<{
    part: '冒頭' | '前半' | '後半' | '締め';
    time_range: string;
    telop: string;
    visual: string;
    narration?: string;
  }>;
}

// ============== カラー ==============
const COLORS = {
  brand: '2E75B6', accent: 'F59E0B', dark: '1F2937',
  mediumGray: '6B7280', lightGray: 'F3F4F6', subtle: 'F9FAFB',
  border: 'E5E7EB', white: 'FFFFFF',
};
const PART_COLORS: Record<string, string> = {
  '冒頭': '10B981', '前半': 'F59E0B', '後半': 'EF4444', '締め': '3B82F6',
};
const FONT = 'Yu Gothic';

// ============== ヘルパー ==============
const border = (color = COLORS.border, size = 1) => ({ style: BorderStyle.SINGLE, size, color });
const allBorders = (color = COLORS.border, size = 1) => ({
  top: border(color, size), bottom: border(color, size),
  left: border(color, size), right: border(color, size),
});

type ParaOpts = {
  bold?: boolean; italics?: boolean; color?: string; size?: number;
  align?: any; before?: number; after?: number; line?: number;
};

function para(text: string, opts: ParaOpts = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before || 0, after: opts.after || 100, line: opts.line || 340 },
    children: [new TextRun({
      text, bold: opts.bold, italics: opts.italics, color: opts.color,
      size: opts.size || 22, font: FONT,
    })],
  });
}

function headerCell(text: string, width: number, align?: any): TableCell {
  return new TableCell({
    borders: allBorders(), width: { size: width, type: WidthType.DXA },
    shading: { fill: COLORS.brand, type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER,
    children: [para(text, {
      bold: true, color: COLORS.white, size: 20, align: align || AlignmentType.LEFT,
    })],
  });
}

// ============== メイン関数 ==============
export async function generateCompositionDocx(data: CompositionData): Promise<Blob> {
  const allChildren: Array<Paragraph | Table> = [];

  // タイトル
  allChildren.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({
        text: '構成案・字コンテ', bold: true, size: 44, color: COLORS.brand, font: FONT,
      })],
    }),
    new Paragraph({
      spacing: { after: 300 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.brand, space: 4 } },
      children: [new TextRun({ text: '', size: 2 })],
    })
  );

  // メタ情報
  const metaRows: Array<[string, string]> = [
    ['クライアント', data.meta.client_name],
    ['商材', data.meta.product_name],
    ['案件名', data.meta.project_name],
    ['クリエイティブ種別', `${data.meta.creative_type === 'video' ? '動画' : '静止画'} / ${data.meta.duration_seconds}秒`],
    ['生成日', data.meta.generated_at],
  ];
  allChildren.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 6960],
    rows: metaRows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          borders: allBorders(), width: { size: 2400, type: WidthType.DXA },
          shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 180, right: 180 },
          children: [para(label, { bold: true, size: 20, color: COLORS.dark })],
        }),
        new TableCell({
          borders: allBorders(), width: { size: 6960, type: WidthType.DXA },
          margins: { top: 120, bottom: 120, left: 180, right: 180 },
          children: [para(value, { size: 20, color: COLORS.dark })],
        }),
      ],
    })),
  }));

  // クリエイティブ方針
  allChildren.push(
    new Paragraph({
      spacing: { before: 400, after: 180 },
      children: [new TextRun({
        text: 'クリエイティブ方針', bold: true, size: 28, color: COLORS.brand, font: FONT,
      })],
    }),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [new TextRun({ text: '採用訴求軸', bold: true, size: 20, color: COLORS.mediumGray, font: FONT })],
    }),
    new Paragraph({
      spacing: { before: 80, after: 180 },
      indent: { left: 200 },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.brand, space: 8 } },
      children: [new TextRun({ text: data.meta.appeal_axis, size: 22, color: COLORS.dark, font: FONT })],
    }),
    new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [new TextRun({ text: 'キーコピー', bold: true, size: 20, color: COLORS.mediumGray, font: FONT })],
    }),
    new Paragraph({
      spacing: { before: 80, after: 180 },
      indent: { left: 200 },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.accent, space: 8 } },
      children: [new TextRun({ text: data.meta.copy_text, size: 24, bold: true, color: COLORS.dark, font: FONT })],
    })
  );

  // タイムライン概要
  allChildren.push(
    new Paragraph({
      spacing: { before: 400, after: 180 },
      children: [new TextRun({
        text: '構成タイムライン', bold: true, size: 28, color: COLORS.brand, font: FONT,
      })],
    })
  );

  const partStats: Record<string, number> = {};
  for (const s of data.scenes) partStats[s.part] = (partStats[s.part] || 0) + 1;
  const total = data.scenes.length;

  const summaryRows: TableRow[] = [];
  for (const part of ['冒頭', '前半', '後半', '締め']) {
    if (!partStats[part]) continue;
    const count = partStats[part];
    const pct = Math.round(count / total * 100);
    summaryRows.push(new TableRow({
      children: [
        new TableCell({
          borders: allBorders(), width: { size: 1200, type: WidthType.DXA },
          shading: { fill: PART_COLORS[part], type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(part, { bold: true, color: COLORS.white, size: 20, align: AlignmentType.CENTER })],
        }),
        new TableCell({
          borders: allBorders(), width: { size: 1500, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 140, right: 140 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(`${count} シーン`, { size: 20, color: COLORS.dark })],
        }),
        new TableCell({
          borders: allBorders(), width: { size: 6660, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 140, right: 140 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(`${'█'.repeat(Math.max(1, Math.round(pct / 3)))} ${pct}%`, {
            size: 18, color: PART_COLORS[part],
          })],
        }),
      ],
    }));
  }
  allChildren.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 1500, 6660],
    rows: summaryRows,
  }));

  // シーン詳細
  allChildren.push(
    new Paragraph({
      spacing: { before: 400, after: 180 },
      children: [new TextRun({
        text: 'シーン詳細', bold: true, size: 28, color: COLORS.brand, font: FONT,
      })],
    })
  );

  const columnWidths = [480, 960, 1080, 2400, 4440];
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('#', 480, AlignmentType.CENTER),
      headerCell('Part', 960, AlignmentType.CENTER),
      headerCell('時間', 1080, AlignmentType.CENTER),
      headerCell('テロップ', 2400),
      headerCell('映像・ビジュアル', 4440),
    ],
  });

  const dataRows = data.scenes.map((scene, idx) => {
    const fill = idx % 2 === 0 ? COLORS.white : COLORS.subtle;
    const partColor = PART_COLORS[scene.part] || COLORS.mediumGray;
    return new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          borders: allBorders(), width: { size: 480, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(String(idx + 1), {
            bold: true, size: 22, color: COLORS.mediumGray, align: AlignmentType.CENTER,
          })],
        }),
        new TableCell({
          borders: allBorders(), width: { size: 960, type: WidthType.DXA },
          shading: { fill: partColor, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(scene.part, {
            bold: true, color: COLORS.white, size: 18, align: AlignmentType.CENTER,
          })],
        }),
        new TableCell({
          borders: allBorders(), width: { size: 1080, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(scene.time_range, {
            size: 18, color: COLORS.mediumGray, align: AlignmentType.CENTER, bold: true,
          })],
        }),
        new TableCell({
          borders: allBorders(), width: { size: 2400, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 140, right: 140 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(scene.telop || '(なし)', {
            bold: true, size: 22, color: scene.telop ? COLORS.dark : COLORS.mediumGray,
          })],
        }),
        new TableCell({
          borders: allBorders(), width: { size: 4440, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 140, right: 140 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(scene.visual, { size: 20, color: COLORS.dark })],
        }),
      ],
    });
  });

  allChildren.push(new Table({
    width: { size: columnWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths,
    rows: [headerRow, ...dataRows],
  }));

  // フッター
  allChildren.push(
    new Paragraph({
      spacing: { before: 720, after: 180 },
      border: { top: { style: BorderStyle.SINGLE, size: 12, color: COLORS.brand, space: 8 } },
      children: [new TextRun({
        text: `生成サマリー: ${data.scenes.length}シーン / 総尺 ${data.meta.duration_seconds}秒`,
        bold: true, size: 20, color: COLORS.mediumGray, font: FONT,
      })],
    }),
    para(
      '本資料は AI により自動生成されたものです。実制作時はクリエイティブディレクターによる最終判断を推奨します。',
      { size: 18, color: COLORS.mediumGray, italics: true }
    )
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22 },
          paragraph: { spacing: { line: 340 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: allChildren,
    }],
  });

  return Packer.toBlob(doc);
}

// ============== ダウンロードヘルパー ==============
export function downloadDocx(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
