/**
 * NA(ナレーション)原稿 docx出力
 *
 * 使用ライブラリ: docx (npm install docx)
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
} from 'docx';

// ============== 型定義 ==============
export interface NAScriptData {
  meta: {
    client_name: string;
    product_name: string;
    project_name: string;
    generated_at: string;
    target_duration_seconds: number;
    char_count: number;
    char_limit_safe: number;
    char_limit_strict: number;
    warning_message?: string | null;
    appeal_axis: string;
    copy_text: string;
  };
  sections: Array<{
    part: '冒頭' | '前半' | '後半' | '締め';
    time_range: string;
    text: string;
  }>;
}

// ============== カラー ==============
const COLORS = {
  brand: '2E75B6', accent: 'F59E0B', dark: '1F2937',
  mediumGray: '6B7280', lightGray: 'F3F4F6', subtle: 'F9FAFB',
  border: 'E5E7EB', white: 'FFFFFF',
  success: '10B981', warning: 'F59E0B', danger: 'EF4444',
};
const PART_COLORS: Record<string, string> = {
  '冒頭': COLORS.success, '前半': COLORS.warning,
  '後半': COLORS.danger, '締め': '3B82F6',
};
const FONT = 'Yu Gothic';

// ヘルパー
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
export async function generateNAScriptDocx(data: NAScriptData): Promise<Blob> {
  const allChildren: Array<Paragraph | Table> = [];

  // タイトル
  allChildren.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({
        text: 'NA(ナレーション)原稿', bold: true, size: 44, color: COLORS.brand, font: FONT,
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
    ['想定尺', `${data.meta.target_duration_seconds}秒`],
    ['生成日', data.meta.generated_at],
  ];
  allChildren.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2160, 7200],
    rows: metaRows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          borders: allBorders(), width: { size: 2160, type: WidthType.DXA },
          shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 180, right: 180 },
          children: [para(label, { bold: true, size: 20, color: COLORS.dark })],
        }),
        new TableCell({
          borders: allBorders(), width: { size: 7200, type: WidthType.DXA },
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

  // 文字数ステータスカード
  const count = data.meta.char_count;
  const limitSafe = data.meta.char_limit_safe;
  const limitStrict = data.meta.char_limit_strict;
  let statusColor = COLORS.success, statusText = '適正', statusIcon = '✓';
  if (count > limitStrict) { statusColor = COLORS.danger; statusText = '超過'; statusIcon = '⚠'; }
  else if (count > limitSafe) { statusColor = COLORS.warning; statusText = '要注意'; statusIcon = '!'; }

  allChildren.push(
    new Paragraph({
      spacing: { before: 400, after: 180 },
      children: [new TextRun({
        text: '文字数チェック', bold: true, size: 28, color: COLORS.brand, font: FONT,
      })],
    }),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2160, 2400, 2400, 2400],
      rows: [new TableRow({
        children: [
          new TableCell({
            borders: allBorders(), width: { size: 2160, type: WidthType.DXA },
            shading: { fill: statusColor, type: ShadingType.CLEAR },
            margins: { top: 180, bottom: 180, left: 180, right: 180 },
            verticalAlign: VerticalAlign.CENTER,
            children: [para(`${statusIcon} ${statusText}`, {
              bold: true, color: COLORS.white, size: 24, align: AlignmentType.CENTER,
            })],
          }),
          new TableCell({
            borders: allBorders(), width: { size: 2400, type: WidthType.DXA },
            shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
            margins: { top: 180, bottom: 180, left: 180, right: 180 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER, spacing: { after: 40 },
                children: [new TextRun({
                  text: String(count), bold: true, size: 36, color: COLORS.dark, font: FONT,
                })],
              }),
              para('現在の文字数', { size: 16, color: COLORS.mediumGray, align: AlignmentType.CENTER }),
            ],
          }),
          new TableCell({
            borders: allBorders(), width: { size: 2400, type: WidthType.DXA },
            margins: { top: 180, bottom: 180, left: 180, right: 180 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER, spacing: { after: 40 },
                children: [new TextRun({
                  text: String(limitSafe), bold: true, size: 28, color: COLORS.success, font: FONT,
                })],
              }),
              para('安全圏', { size: 16, color: COLORS.mediumGray, align: AlignmentType.CENTER }),
            ],
          }),
          new TableCell({
            borders: allBorders(), width: { size: 2400, type: WidthType.DXA },
            margins: { top: 180, bottom: 180, left: 180, right: 180 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER, spacing: { after: 40 },
                children: [new TextRun({
                  text: String(limitStrict), bold: true, size: 28, color: COLORS.danger, font: FONT,
                })],
              }),
              para('上限', { size: 16, color: COLORS.mediumGray, align: AlignmentType.CENTER }),
            ],
          }),
        ],
      })],
    })
  );

  if (data.meta.warning_message) {
    allChildren.push(new Paragraph({
      spacing: { before: 180, after: 100 },
      indent: { left: 200 },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.warning, space: 8 } },
      children: [
        new TextRun({ text: '⚠ 警告: ', bold: true, size: 20, color: COLORS.warning, font: FONT }),
        new TextRun({ text: data.meta.warning_message, size: 20, color: COLORS.dark, font: FONT }),
      ],
    }));
  }

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
  for (const s of data.sections) partStats[s.part] = (partStats[s.part] || 0) + 1;
  const total = data.sections.length;

  const summaryRows: TableRow[] = [];
  for (const part of ['冒頭', '前半', '後半', '締め']) {
    if (!partStats[part]) continue;
    const cnt = partStats[part];
    const pct = Math.round(cnt / total * 100);
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
          children: [para(`${cnt} セクション`, { size: 20, color: COLORS.dark })],
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

  // 原稿(読み上げ用)
  allChildren.push(
    new Paragraph({
      spacing: { before: 400, after: 180 },
      children: [new TextRun({
        text: '原稿(読み上げ用)', bold: true, size: 28, color: COLORS.brand, font: FONT,
      })],
    }),
    para(
      '読み上げる順番・間の取り方は下記の時間配分に従ってください。',
      { size: 18, color: COLORS.mediumGray, italics: true, after: 240 }
    ),
    new Paragraph({
      spacing: { before: 120, after: 120, line: 480 },
      indent: { left: 300, right: 300 },
      border: {
        top: border(COLORS.brand, 8),
        bottom: border(COLORS.brand, 8),
        left: border(COLORS.brand, 8),
        right: border(COLORS.brand, 8),
      },
      children: data.sections.map((s, idx) =>
        new TextRun({
          text: s.text,
          size: 26, color: COLORS.dark, font: FONT,
          break: idx > 0 ? 1 : undefined,
        })
      ),
    })
  );

  // セクション詳細
  allChildren.push(
    new Paragraph({
      spacing: { before: 400, after: 180 },
      children: [new TextRun({
        text: 'セクション詳細(タイミング指定)', bold: true, size: 28, color: COLORS.brand, font: FONT,
      })],
    })
  );

  const columnWidths = [480, 960, 1200, 5760, 960];
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('#', 480, AlignmentType.CENTER),
      headerCell('Part', 960, AlignmentType.CENTER),
      headerCell('時間', 1200, AlignmentType.CENTER),
      headerCell('ナレーション', 5760),
      headerCell('文字数', 960, AlignmentType.CENTER),
    ],
  });

  const dataRows = data.sections.map((section, idx) => {
    const fill = idx % 2 === 0 ? COLORS.white : COLORS.subtle;
    const partColor = PART_COLORS[section.part] || COLORS.mediumGray;
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
          children: [para(section.part, {
            bold: true, color: COLORS.white, size: 18, align: AlignmentType.CENTER,
          })],
        }),
        new TableCell({
          borders: allBorders(), width: { size: 1200, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(section.time_range, {
            size: 18, color: COLORS.mediumGray, align: AlignmentType.CENTER, bold: true,
          })],
        }),
        new TableCell({
          borders: allBorders(), width: { size: 5760, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 160, right: 160 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(section.text, { bold: true, size: 22, color: COLORS.dark })],
        }),
        new TableCell({
          borders: allBorders(), width: { size: 960, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(String(section.text.length), {
            size: 18, color: COLORS.mediumGray, align: AlignmentType.CENTER,
          })],
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
        text: `生成サマリー: ${data.sections.length}セクション / 総尺 ${data.meta.target_duration_seconds}秒 / ${data.meta.char_count}文字`,
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
