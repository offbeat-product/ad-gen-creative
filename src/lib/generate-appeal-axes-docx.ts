/**
 * 訴求軸・コピー生成結果を Word ファイル(.docx)として出力する
 *
 * 使用ライブラリ: docx (npm install docx)
 *
 * 使い方:
 *   import { generateAppealAxesDocx } from './generate-appeal-axes-docx';
 *   const blob = await generateAppealAxesDocx(data);
 *   // ダウンロード: URL.createObjectURL(blob) して <a download>
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
} from 'docx';

// ============== 型定義 ==============
export interface AppealAxesData {
  meta: {
    client_name: string;
    product_name: string;
    project_name: string;
    generated_at: string; // YYYY-MM-DD
  };
  appeal_axes: Array<{
    index: number;
    type_label?: string; // 【時間解放型】等、任意
    text: string;        // 訴求軸本文
    reasoning: string;   // 選定根拠
    copies: Array<{
      label: string;  // "A", "B"...
      text: string;   // コピー本文
      intent: string; // 狙い
    }>;
  }>;
}

// ============== カラーパレット ==============
const COLORS = {
  brand: '2E75B6',      // ブランドブルー
  dark: '1F2937',       // ダークグレー
  accent: 'F59E0B',     // アクセント(アンバー)
  lightGray: 'F3F4F6',
  mediumGray: '9CA3AF',
  border: 'E5E7EB',
  white: 'FFFFFF',
};

const FONT = 'Yu Gothic'; // 日本語対応フォント(Winでも見える)

// ============== ヘルパー ==============
const border = (color = COLORS.border, size = 1) => ({
  style: BorderStyle.SINGLE,
  size,
  color,
});

const allBorders = (color = COLORS.border, size = 1) => ({
  top: border(color, size),
  bottom: border(color, size),
  left: border(color, size),
  right: border(color, size),
});

type ParaOpts = {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  size?: number; // half-points (22 = 11pt)
  align?: typeof AlignmentType[keyof typeof AlignmentType];
  before?: number;
  after?: number;
};

function para(text: string, opts: ParaOpts = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.LEFT,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 100, line: 360 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        color: opts.color,
        size: opts.size ?? 22,
        font: FONT,
        italics: opts.italics,
      }),
    ],
  });
}

// ============== 表紙セクション ==============
function buildTitleSection(data: AppealAxesData): Array<Paragraph | Table> {
  const children: Array<Paragraph | Table> = [];

  // 大タイトル
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: '訴求軸・コピー生成結果',
          bold: true,
          size: 44, // 22pt
          color: COLORS.brand,
          font: FONT,
        }),
      ],
    })
  );

  // ブランドカラーのアンダーライン
  children.push(
    new Paragraph({
      spacing: { after: 360 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.brand, space: 4 },
      },
      children: [new TextRun({ text: '', size: 2 })],
    })
  );

  // メタ情報テーブル
  const metaRows: Array<[string, string]> = [
    ['クライアント', data.meta.client_name],
    ['商材', data.meta.product_name],
    ['案件名', data.meta.project_name],
    ['生成日', data.meta.generated_at],
  ];

  const metaTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2160, 7200],
    rows: metaRows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              borders: allBorders(COLORS.border),
              width: { size: 2160, type: WidthType.DXA },
              shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
              margins: { top: 120, bottom: 120, left: 180, right: 180 },
              children: [para(label, { bold: true, size: 20, color: COLORS.dark })],
            }),
            new TableCell({
              borders: allBorders(COLORS.border),
              width: { size: 7200, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 180, right: 180 },
              children: [para(value, { size: 20, color: COLORS.dark })],
            }),
          ],
        })
    ),
  });

  children.push(metaTable);
  children.push(para('', { after: 360 }));

  return children;
}

// ============== 訴求軸ごとのセクション ==============
function buildAxisSection(
  axis: AppealAxesData['appeal_axes'][number]
): Array<Paragraph | Table> {
  const children: Array<Paragraph | Table> = [];

  // 訴求軸タイトル
  const titleRuns: TextRun[] = [
    new TextRun({
      text: `訴求軸${axis.index}  `,
      bold: true,
      size: 32, // 16pt
      color: COLORS.brand,
      font: FONT,
    }),
  ];
  if (axis.type_label) {
    titleRuns.push(
      new TextRun({
        text: `【${axis.type_label}】`,
        bold: true,
        size: 28, // 14pt
        color: COLORS.accent,
        font: FONT,
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 480, after: 180 },
      children: titleRuns,
    })
  );

  // 訴求軸本文(左ボーダー付き引用風)
  children.push(
    new Paragraph({
      spacing: { before: 120, after: 120 },
      indent: { left: 200 },
      border: {
        left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.brand, space: 8 },
      },
      children: [
        new TextRun({
          text: axis.text,
          size: 24, // 12pt
          color: COLORS.dark,
          font: FONT,
        }),
      ],
    })
  );

  // 選定根拠
  children.push(
    new Paragraph({
      spacing: { before: 120, after: 240 },
      indent: { left: 200 },
      children: [
        new TextRun({
          text: '📌 選定根拠: ',
          bold: true,
          size: 20,
          color: COLORS.mediumGray,
          font: FONT,
        }),
        new TextRun({
          text: axis.reasoning,
          size: 20,
          color: COLORS.mediumGray,
          italics: true,
          font: FONT,
        }),
      ],
    })
  );

  // コピー一覧テーブル
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        borders: allBorders(COLORS.border),
        width: { size: 720, type: WidthType.DXA },
        shading: { fill: COLORS.brand, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          para('#', {
            bold: true,
            align: AlignmentType.CENTER,
            color: COLORS.white,
            size: 20,
          }),
        ],
      }),
      new TableCell({
        borders: allBorders(COLORS.border),
        width: { size: 5580, type: WidthType.DXA },
        shading: { fill: COLORS.brand, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        verticalAlign: VerticalAlign.CENTER,
        children: [para('コピー文', { bold: true, color: COLORS.white, size: 20 })],
      }),
      new TableCell({
        borders: allBorders(COLORS.border),
        width: { size: 3060, type: WidthType.DXA },
        shading: { fill: COLORS.brand, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        verticalAlign: VerticalAlign.CENTER,
        children: [para('コピーの狙い', { bold: true, color: COLORS.white, size: 20 })],
      }),
    ],
  });

  const copyRows = axis.copies.map((copy, idx) => {
    const fill = idx % 2 === 0 ? COLORS.white : COLORS.lightGray;
    return new TableRow({
      children: [
        new TableCell({
          borders: allBorders(COLORS.border),
          width: { size: 720, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 120, right: 120 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            para(copy.label, {
              bold: true,
              align: AlignmentType.CENTER,
              color: COLORS.brand,
              size: 24,
            }),
          ],
        }),
        new TableCell({
          borders: allBorders(COLORS.border),
          width: { size: 5580, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 140, right: 140 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(copy.text, { color: COLORS.dark, size: 22, bold: true })],
        }),
        new TableCell({
          borders: allBorders(COLORS.border),
          width: { size: 3060, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 140, right: 140 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            para(copy.intent, {
              color: COLORS.mediumGray,
              size: 18,
              italics: true,
            }),
          ],
        }),
      ],
    });
  });

  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [720, 5580, 3060],
      rows: [headerRow, ...copyRows],
    })
  );

  return children;
}

// ============== サマリーセクション ==============
function buildSummarySection(data: AppealAxesData): Paragraph[] {
  const totalAxes = data.appeal_axes.length;
  const totalCopies = data.appeal_axes.reduce((sum, a) => sum + a.copies.length, 0);

  return [
    new Paragraph({
      spacing: { before: 720, after: 180 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 12, color: COLORS.brand, space: 8 },
      },
      children: [
        new TextRun({
          text: `生成サマリー: ${totalAxes}訴求軸 / ${totalCopies}コピー`,
          bold: true,
          size: 20,
          color: COLORS.mediumGray,
          font: FONT,
        }),
      ],
    }),
    para(
      '本資料は AI により自動生成されたものです。実制作時はクリエイティブディレクターによる最終判断を推奨します。',
      { size: 18, color: COLORS.mediumGray, italics: true }
    ),
  ];
}

// ============== メイン関数 ==============
/**
 * 訴求軸・コピー生成結果を Blob として出力する(ブラウザでダウンロードに使える)
 */
export async function generateAppealAxesDocx(data: AppealAxesData): Promise<Blob> {
  const allChildren: Array<Paragraph | Table> = [];

  allChildren.push(...buildTitleSection(data));

  for (const axis of data.appeal_axes) {
    allChildren.push(...buildAxisSection(axis));
  }

  allChildren.push(...buildSummarySection(data));

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22 },
          paragraph: { spacing: { line: 360 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: allChildren,
      },
    ],
  });

  return Packer.toBlob(doc);
}

// ============== ダウンロードヘルパー ==============
/**
 * Blob を指定のファイル名でダウンロードさせる
 */
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

// ============== 使用例 ==============
/*
import { generateAppealAxesDocx, downloadDocx } from './generate-appeal-axes-docx';

const data = {
  meta: {
    client_name: 'サイバーエージェント',
    product_name: 'グリーンビーンズ',
    project_name: '003_イオンのネットスーパー│グリーンビーンズ',
    generated_at: '2026-04-22',
  },
  appeal_axes: [
    {
      index: 1,
      type_label: '時間解放型',
      text: 'スマホ注文で買い物時間ゼロ...',
      reasoning: '忙しい主婦・働く女性にとって...',
      copies: [
        { label: 'A', text: 'スマホでポチッと...', intent: '買い物の煩わしさから解放...' },
        { label: 'B', text: 'もうスーパーで...', intent: '迷い時間の無駄をなくして...' },
      ],
    },
    // ...
  ],
};

const blob = await generateAppealAxesDocx(data);
downloadDocx(blob, `訴求軸コピー_${data.meta.project_name}_${data.meta.generated_at}.docx`);
*/
