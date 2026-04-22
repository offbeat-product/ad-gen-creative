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
  PageBreak,
} from 'docx';
import type {
  BulkCompositionBatch,
  BulkCompositionJob,
} from '@/types/bulk-composition';

const COLORS = {
  brand: '2E75B6',
  accent: 'F59E0B',
  dark: '1F2937',
  mediumGray: '6B7280',
  lightGray: 'F3F4F6',
  border: 'E5E7EB',
  white: 'FFFFFF',
  tableHeader: '4472C4',
};
const FONT = 'Yu Gothic';

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

interface ParaOpts {
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  before?: number;
  after?: number;
  line?: number;
  bold?: boolean;
  italics?: boolean;
  color?: string;
  size?: number;
}

function para(text: string, opts: ParaOpts = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.LEFT,
    spacing: {
      before: opts.before ?? 0,
      after: opts.after ?? 80,
      line: opts.line ?? 300,
    },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color,
        size: opts.size ?? 22,
        font: FONT,
      }),
    ],
  });
}

interface Params {
  batch: BulkCompositionBatch;
  jobs: BulkCompositionJob[];
  meta: {
    client_name: string;
    product_name: string;
    project_name: string;
  };
}

export async function generateBulkCompositionDocx(
  params: Params
): Promise<Blob> {
  const { batch, jobs, meta } = params;
  const sortedJobs = [...jobs].sort(
    (a, b) =>
      (a.input_data.bulk_index ?? 0) - (b.input_data.bulk_index ?? 0)
  );

  const children: Array<Paragraph | Table> = [];
  children.push(...buildCoverPage(batch, meta, sortedJobs.length));

  sortedJobs.forEach((job, idx) => {
    if (idx > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
    children.push(...buildCompositionPage(job, idx + 1, sortedJobs.length));
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22 },
          paragraph: { spacing: { line: 300 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

function buildCoverPage(
  batch: BulkCompositionBatch,
  meta: Params['meta'],
  count: number
): Array<Paragraph | Table> {
  const rows: Array<[string, string]> = [
    ['クライアント', meta.client_name || '-'],
    ['商材', meta.product_name || '-'],
    ['案件', meta.project_name || '-'],
    ['構成案パターン数', `${count}パターン`],
    ['動画尺', `${batch.duration_seconds}秒`],
    ['生成日時', new Date(batch.created_at).toLocaleString('ja-JP')],
  ];

  return [
    new Paragraph({
      spacing: { before: 2000, after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: '構成案 一括出力',
          bold: true,
          size: 56,
          color: COLORS.brand,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 600 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Bulk Composition Document',
          size: 24,
          color: COLORS.mediumGray,
          font: FONT,
          italics: true,
        }),
      ],
    }),
    new Table({
      width: { size: 8000, type: WidthType.DXA },
      alignment: AlignmentType.CENTER,
      columnWidths: [2800, 5200],
      rows: rows.map(
        ([label, value]) =>
          new TableRow({
            children: [
              new TableCell({
                borders: allBorders(),
                width: { size: 2800, type: WidthType.DXA },
                shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
                margins: { top: 160, bottom: 160, left: 200, right: 200 },
                children: [
                  para(label, { bold: true, size: 22, color: COLORS.dark }),
                ],
              }),
              new TableCell({
                borders: allBorders(),
                width: { size: 5200, type: WidthType.DXA },
                margins: { top: 160, bottom: 160, left: 200, right: 200 },
                children: [para(value, { size: 22, color: COLORS.dark })],
              }),
            ],
          })
      ),
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function buildCompositionPage(
  job: BulkCompositionJob,
  indexNum: number,
  totalCount: number
): Array<Paragraph | Table> {
  const output = job.output_data || {};
  const scenes = output.scenes || [];

  const result: Array<Paragraph | Table> = [];

  result.push(
    new Paragraph({
      spacing: { before: 0, after: 100 },
      children: [
        new TextRun({
          text: `構成案 #${indexNum} / ${totalCount}`,
          bold: true,
          size: 32,
          color: COLORS.brand,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 12,
          color: COLORS.brand,
          space: 4,
        },
      },
      children: [new TextRun({ text: '', size: 2 })],
    })
  );

  result.push(
    new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: [2400, 6600],
      rows: [
        buildInfoRow(
          '訴求軸',
          (output.appeal_axis as string) || job.input_data.appeal_axis,
          false
        ),
        buildInfoRow(
          'コピー',
          (output.copy_text as string) || job.input_data.copy_text,
          true
        ),
      ],
    })
  );

  result.push(
    new Paragraph({
      spacing: { before: 300, after: 200 },
      children: [new TextRun({ text: '', size: 2 })],
    })
  );

  if (scenes.length === 0) {
    result.push(
      para('(構成案データが取得できませんでした)', {
        size: 20,
        color: COLORS.mediumGray,
        italics: true,
      })
    );
    return result;
  }

  const headers: Array<[string, number]> = [
    ['#', 700],
    ['Part', 1100],
    ['Time', 1400],
    ['テロップ', 2900],
    ['映像指示', 2900],
  ];

  const sceneRows = [
    new TableRow({
      tableHeader: true,
      children: headers.map(
        ([label, width]) =>
          new TableCell({
            borders: allBorders(),
            width: { size: width, type: WidthType.DXA },
            shading: {
              fill: COLORS.tableHeader,
              type: ShadingType.CLEAR,
            },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              para(label, {
                bold: true,
                color: COLORS.white,
                size: 18,
                align: AlignmentType.CENTER,
              }),
            ],
          })
      ),
    }),
    ...scenes.map(
      (scene, idx) =>
        new TableRow({
          cantSplit: true,
          children: [
            buildSceneCell(`${idx + 1}`, 700, {
              shading: COLORS.lightGray,
              bold: true,
              align: 'center',
            }),
            buildSceneCell(scene.part || '-', 1100, { align: 'center' }),
            buildSceneCell(scene.time_range || '-', 1400, {
              size: 16,
              color: COLORS.mediumGray,
              align: 'center',
            }),
            buildSceneCell(scene.telop || '-', 2900, { bold: true }),
            buildSceneCell(scene.visual || '-', 2900, { size: 16 }),
          ],
        })
    ),
  ];

  result.push(
    new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: [700, 1100, 1400, 2900, 2900],
      rows: sceneRows,
    })
  );

  return result;
}

function buildInfoRow(
  label: string,
  value: string,
  valueBold: boolean
): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        borders: allBorders(),
        width: { size: 2400, type: WidthType.DXA },
        shading: { fill: COLORS.tableHeader, type: ShadingType.CLEAR },
        margins: { top: 140, bottom: 140, left: 180, right: 180 },
        children: [
          para(label, { bold: true, color: COLORS.white, size: 20 }),
        ],
      }),
      new TableCell({
        borders: allBorders(),
        width: { size: 6600, type: WidthType.DXA },
        margins: { top: 140, bottom: 140, left: 180, right: 180 },
        children: [
          para(value, { size: 20, color: COLORS.dark, bold: valueBold }),
        ],
      }),
    ],
  });
}

interface SceneCellOpts {
  size?: number;
  color?: string;
  bold?: boolean;
  align?: 'center' | 'left';
  shading?: string;
}

function buildSceneCell(
  text: string,
  width: number,
  opts: SceneCellOpts = {}
): TableCell {
  return new TableCell({
    borders: allBorders(),
    width: { size: width, type: WidthType.DXA },
    shading: opts.shading
      ? { fill: opts.shading, type: ShadingType.CLEAR }
      : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      para(text, {
        size: opts.size ?? 18,
        color: opts.color ?? COLORS.dark,
        bold: opts.bold,
        align:
          opts.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }),
    ],
  });
}

export function downloadBulkDocx(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
