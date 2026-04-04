import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';
import type { AdminStudentProgressRow } from '../types';
import {
  JURNAL_SHEET_KEYS,
  JURNAL_SHEET_KEY_LABELS,
} from '../config';

export interface ReportAnalytics {
  avgEntriesPerStudent: number;
  fullTodayCount: number;
  zeroTodayCount: number;
  perCategoryTotals: Record<string, number>;
  byKelas: { kelas: string; count: number; avgToday: number }[];
}

export function buildReportAnalytics(
  students: AdminStudentProgressRow[],
  totals: { studentCount: number; totalEntries: number; avgTodayCompletion: number },
): ReportAnalytics {
  const n = students.length || 1;
  const fullTodayCount = students.filter((s) => s.todayPercent >= 100).length;
  const zeroTodayCount = students.filter((s) => s.todayPercent === 0).length;
  const perCategoryTotals: Record<string, number> = {};
  for (const k of JURNAL_SHEET_KEYS) {
    perCategoryTotals[k] = students.reduce((s, st) => s + (st.counts[k] || 0), 0);
  }
  const kelasMap = new Map<string, { count: number; sumToday: number }>();
  for (const st of students) {
    const k = st.kelas || '(tanpa kelas)';
    const cur = kelasMap.get(k) || { count: 0, sumToday: 0 };
    cur.count += 1;
    cur.sumToday += st.todayPercent;
    kelasMap.set(k, cur);
  }
  const byKelas = Array.from(kelasMap.entries())
    .map(([kelas, v]) => ({
      kelas,
      count: v.count,
      avgToday: v.count ? Math.round(v.sumToday / v.count) : 0,
    }))
    .sort((a, b) => a.kelas.localeCompare(b.kelas, 'id'));

  return {
    avgEntriesPerStudent: Math.round((totals.totalEntries / n) * 10) / 10,
    fullTodayCount,
    zeroTodayCount,
    perCategoryTotals,
    byKelas,
  };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAdminExcel(
  students: AdminStudentProgressRow[],
  totals: { studentCount: number; totalEntries: number; avgTodayCompletion: number },
  today: string,
  generatedAt: string,
) {
  const analytics = buildReportAnalytics(students, totals);
  const wb = XLSX.utils.book_new();

  const head = [
    'NISN',
    'Nama',
    'Kelas',
    'Jenis kelamin',
    'Peran',
    ...JURNAL_SHEET_KEYS.map((k) => JURNAL_SHEET_KEY_LABELS[k]),
    'Total entri',
    'Kategori hari ini',
    '% Hari ini',
    'Terakhir aktif',
  ];
  const rows = students.map((s) => [
    s.nisn,
    s.nama,
    s.kelas,
    s.jenisKelamin || '',
    s.isAdmin ? 'Admin' : 'Siswa',
    ...JURNAL_SHEET_KEYS.map((k) => s.counts[k] ?? 0),
    s.totalEntries,
    `${s.categoriesFilledToday}/${JURNAL_SHEET_KEYS.length}`,
    s.todayPercent,
    s.lastActivity || '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
  ws['!cols'] = head.map(() => ({ wch: 12 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Siswa');

  const analisis: (string | number)[][] = [
    ['Laporan Jurnal Ramadhan — Administrasi'],
    ['Tanggal data (hari ini sheet)', today],
    ['Di-generate', generatedAt],
    [],
    ['Ringkasan'],
    ['Jumlah siswa terdaftar', totals.studentCount],
    ['Total entri jurnal (semua kategori)', totals.totalEntries],
    ['Rata-rata entri per siswa', analytics.avgEntriesPerStudent],
    ['Rata-rata % kelengkapan hari ini (semua siswa)', totals.avgTodayCompletion],
    ['Siswa 100% lengkap hari ini', analytics.fullTodayCount],
    ['Siswa 0% hari ini', analytics.zeroTodayCount],
    [],
    ['Total entri per kategori'],
    ...JURNAL_SHEET_KEYS.map((k) => [
      JURNAL_SHEET_KEY_LABELS[k],
      analytics.perCategoryTotals[k] ?? 0,
    ]),
    [],
    ['Rata-rata % hari ini per kelas'],
    ['Kelas', 'Jumlah siswa', 'Rata-rata % hari ini'],
    ...analytics.byKelas.map((b) => [b.kelas, b.count, b.avgToday]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(analisis);
  XLSX.utils.book_append_sheet(wb, ws2, 'Analisis');

  const stamp = today.replace(/-/g, '');
  XLSX.writeFile(wb, `laporan-jurnal-ramadhan-admin-${stamp}.xlsx`);
}

export async function exportAdminWord(
  students: AdminStudentProgressRow[],
  totals: { studentCount: number; totalEntries: number; avgTodayCompletion: number },
  today: string,
  generatedAt: string,
) {
  const analytics = buildReportAnalytics(students, totals);

  const intro = [
    new Paragraph({
      text: 'Laporan administrasi Jurnal Ramadhan',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'SMAS Al-Mishbah Quranic School — data dari Google Sheets via Apps Script.', italics: true }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Tanggal acuan (hari ini): ${today}`, bold: true }),
      ],
    }),
    new Paragraph({
      children: [new TextRun(`Di-generate: ${generatedAt}`)],
      spacing: { after: 240 },
    }),
    new Paragraph({
      text: 'Analisis ringkas',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun(
          `Jumlah siswa terdaftar: ${totals.studentCount}. Total entri jurnal: ${totals.totalEntries}. Rata-rata entri per siswa: ${analytics.avgEntriesPerStudent}. Rata-rata kelengkapan kategori hari ini: ${totals.avgTodayCompletion}%. Siswa dengan jurnal lengkap hari ini (100%): ${analytics.fullTodayCount}. Siswa belum mengisi kategori manapun hari ini (0%): ${analytics.zeroTodayCount}.`,
        ),
      ],
      spacing: { after: 200 },
    }),
  ];

  const tableHead = [
    'NISN',
    'Nama',
    'Kelas',
    'JK',
    ...JURNAL_SHEET_KEYS.map((k) => JURNAL_SHEET_KEY_LABELS[k]),
    'Total',
    '%Hini',
    'Terakhir',
  ];
  const headerRow = new TableRow({
    tableHeader: true,
    children: tableHead.map(
      (h) =>
        new TableCell({
          shading: { fill: 'E8F5E9' },
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })],
        }),
    ),
  });

  const dataRows = students.map(
    (s) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph(String(s.nisn))],
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
          new TableCell({
            children: [new Paragraph(String(s.nama))],
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
          new TableCell({
            children: [new Paragraph(String(s.kelas))],
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
          new TableCell({
            children: [new Paragraph(String(s.jenisKelamin || '—'))],
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
          ...JURNAL_SHEET_KEYS.map(
            (k) =>
              new TableCell({
                children: [new Paragraph(String(s.counts[k] ?? 0))],
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
              }),
          ),
          new TableCell({
            children: [new Paragraph(String(s.totalEntries))],
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
          new TableCell({
            children: [new Paragraph(String(s.todayPercent))],
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
          new TableCell({
            children: [new Paragraph(String(s.lastActivity || '—'))],
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
        ],
      }),
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
    rows: [headerRow, ...dataRows],
  });

  const kelasPara = [
    new Paragraph({
      text: 'Per kelas (rata-rata % hari ini)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
    }),
    ...analytics.byKelas.map(
      (b) =>
        new Paragraph({
          children: [
            new TextRun({ text: `${b.kelas}: `, bold: true }),
            new TextRun(`${b.count} siswa, rata-rata ${b.avgToday}% kelengkapan hari ini.`),
          ],
        }),
    ),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [...intro, table, ...kelasPara],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const stamp = today.replace(/-/g, '');
  triggerDownload(blob, `laporan-jurnal-ramadhan-admin-${stamp}.docx`);
}
