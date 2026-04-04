import * as XLSX from 'xlsx';
import JSZip from 'jszip';
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
import type { AdminStudentProgressRow, JournalEntry, PaperManualClientInfo, User } from '../types';
import { JURNAL_SHEET_KEYS, JURNAL_SHEET_KEY_LABELS, KATEGORI_CONFIG } from '../config';
import { fetchStudentJurnalFromGas } from './fetchStudentJurnal';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const DINAS_LINES = [
  'PEMERINTAH ACEH',
  'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  'Cq. Kepala Satuan Pendidikan',
  'SMAS Al-Mishbah Quranic School',
  'Jl. Prof. A. Majid Ibrahim, Kec. Meuraxa, Kota Banda Aceh',
];

export function entrySummaryForDinas(category: string, entry: JournalEntry): string {
  if (category === 'sahur') {
    return `${entry.waktuSahur || '—'} | ${entry.menuSahur || '—'} | Doa: ${entry.doaSahur || '—'} | ${entry.catatanSahur || ''}`.trim();
  }
  if (category === 'shalat') {
    return `Subuh ${entry.subuh || '—'}, Dzuhur ${entry.dzuhur || '—'}, Ashar ${entry.ashar || '—'}, Maghrib ${entry.maghrib || '—'}, Isya ${entry.isya || '—'} | Tarawih ${entry.tarawih || '—'}, Tahajud ${entry.tahajud || '—'}, Dhuha ${entry.dhuha || '—'}`;
  }
  if (category === 'belajar') {
    return `${entry.materiBelajar || '—'} (${entry.durasiBelajar || '—'}) ${entry.metodeBelajar || ''} — ${entry.intisariBelajar || ''}`.trim();
  }
  if (category === 'silaturahmi') {
    return `${entry.kegiatanSilaturahmi || '—'} dengan ${entry.denganSiapa || '—'} — ${entry.ceritaSilaturahmi || ''}`.trim();
  }
  if (category === 'berbuka') {
    return `${entry.waktuBerbuka || '—'} | ${entry.menuBerbuka || '—'} | ${entry.tempatBerbuka || '—'} | ${entry.doaBerbuka || '—'} | ${entry.catatanBerbuka || ''}`.trim();
  }
  if (category === 'quran') {
    return `Surat ${entry.suratDibaca || '—'} ayat ${entry.ayatMulai || '—'}-${entry.ayatSelesai || '—'} juz ${entry.juzDibaca || '—'} (${entry.lamaTilawah || '—'}) — ${entry.intisariQuran || ''}`.trim();
  }
  if (category === 'kejujuran') {
    return `Puasa penuh: ${entry.puasaPenuh || '—'} | lisan/pandangan/bohong: ${entry.menjagaLisan || '—'} / ${entry.menjagaPandangan || '—'} / ${entry.berbohong || '—'} — ${entry.refleksiDiri || ''}`.trim();
  }
  return entry.ringkasan || '—';
}

function studentHeaderParas(title: string, user: Pick<User, 'nama' | 'nisn' | 'kelas' | 'jenisKelamin'>) {
  const stamp = new Date().toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return [
    ...DINAS_LINES.map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line, bold: line.includes('SMAS') })],
          alignment: AlignmentType.CENTER,
          spacing: { after: line.includes('SMAS') ? 120 : 40 },
        }),
    ),
    new Paragraph({ text: '', spacing: { after: 120 } }),
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Nama: ${user.nama}`, bold: true })],
    }),
    new Paragraph({ children: [new TextRun(`NISN: ${user.nisn}`)] }),
    new Paragraph({ children: [new TextRun(`Kelas: ${user.kelas}`)] }),
    user.jenisKelamin
      ? new Paragraph({ children: [new TextRun(`Jenis kelamin: ${user.jenisKelamin}`)] })
      : new Paragraph({ text: '' }),
    new Paragraph({
      children: [new TextRun({ text: `Dicetak: ${stamp}`, italics: true })],
      spacing: { after: 200 },
    }),
  ];
}

function paperNotePara(paper?: PaperManualClientInfo) {
  if (!paper?.enabled) return [];
  const bits = [
    'Siswa tercatat mengumpulkan jurnal Ramadhan pada media kertas / laporan fisik. Dokumen digital ini merupakan ringkasan administratif; arsip asli di sekolah menjadi rujukan utama.',
  ];
  if (paper.periodStart && paper.periodEnd) {
    bits.push(`Catatan period (administrasi): ${paper.periodStart} s.d. ${paper.periodEnd}.`);
  }
  if (paper.note) bits.push(`Catatan sekolah: ${paper.note}`);
  return [
    new Paragraph({
      text: 'Keterangan laporan fisik',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 120, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun(bits.join(' '))],
      spacing: { after: 200 },
    }),
  ];
}

function categoryTableDocx(category: string, entries: JournalEntry[]): Table | null {
  const sorted = [...entries].sort((a, b) => (a.puasaKe || 0) - (b.puasaKe || 0));
  if (sorted.length === 0) return null;
  const title = KATEGORI_CONFIG[category]?.title || category;
  const head = new TableRow({
    tableHeader: true,
    children: ['Puasa ke-', 'Tanggal', 'Ringkasan'].map(
      (h) =>
        new TableCell({
          shading: { fill: 'E8F5E9' },
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })],
        }),
    ),
  });
  const rows = sorted.map(
    (e) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph(String(e.puasaKe || '—'))],
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
          new TableCell({
            children: [new Paragraph(String(e.tanggal || '—'))],
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
          new TableCell({
            children: [new Paragraph(entrySummaryForDinas(category, e))],
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
        ],
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
    rows: [head, ...rows],
  });
}

export async function buildDinasStudentDocxBlob(
  user: Pick<User, 'nama' | 'nisn' | 'kelas' | 'jenisKelamin'>,
  jurnal: Record<string, JournalEntry[]>,
  paper?: PaperManualClientInfo,
): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    ...studentHeaderParas(
      'BERITA ACARA JURNAL RAMADHAN (INDIVIDU SISWA)\n1447 H / 2026 M',
      user,
    ),
    ...paperNotePara(paper),
    new Paragraph({
      text: 'Rekapitulasi entri per kategori',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 120, after: 120 },
    }),
  ];

  for (const cat of Object.keys(KATEGORI_CONFIG)) {
    const t = categoryTableDocx(cat, jurnal[cat] || []);
    if (!t) continue;
    children.push(
      new Paragraph({
        text: KATEGORI_CONFIG[cat]?.title || cat,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      t,
    );
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  return Packer.toBlob(doc);
}

export async function downloadDinasStudentWord(
  user: Pick<User, 'nama' | 'nisn' | 'kelas' | 'jenisKelamin'>,
  jurnal: Record<string, JournalEntry[]>,
  paper?: PaperManualClientInfo,
) {
  const blob = await buildDinasStudentDocxBlob(user, jurnal, paper);
  const safe = String(user.nisn).replace(/\W/g, '');
  triggerDownload(blob, `dinas-jurnal-ramadhan-${safe}.docx`);
}

export function downloadDinasStudentExcel(
  user: Pick<User, 'nama' | 'nisn' | 'kelas' | 'jenisKelamin'>,
  jurnal: Record<string, JournalEntry[]>,
  paper?: PaperManualClientInfo,
) {
  const wb = XLSX.utils.book_new();
  const cover: (string | number)[][] = [
    ...DINAS_LINES.map((l) => [l]),
    [],
    ['BERITA ACARA JURNAL RAMADHAN — INDIVIDU SISWA'],
    ['1447 H / 2026 M'],
    [],
    ['Nama', user.nama],
    ['NISN', user.nisn],
    ['Kelas', user.kelas],
    ['Jenis kelamin', user.jenisKelamin || '—'],
    ['Dicetak', new Date().toISOString()],
  ];
  if (paper?.enabled) {
    cover.push(
      [],
      ['Laporan fisik (kertas)', 'Ya'],
      ['Period (admin)', paper.periodStart && paper.periodEnd ? `${paper.periodStart} s.d. ${paper.periodEnd}` : '—'],
      ['Catatan', paper.note || '—'],
    );
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cover), 'Sampul');

  const agg: (string | number)[][] = [['Kategori', 'Jumlah entri']];
  let total = 0;
  for (const cat of Object.keys(KATEGORI_CONFIG)) {
    const n = (jurnal[cat] || []).length;
    total += n;
    agg.push([KATEGORI_CONFIG[cat]?.title || cat, n]);
  }
  agg.push(['Total', total]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(agg), 'Ringkasan');

  for (const cat of Object.keys(KATEGORI_CONFIG)) {
    const rows = (jurnal[cat] || [])
      .slice()
      .sort((a, b) => (a.puasaKe || 0) - (b.puasaKe || 0))
      .map((e) => [e.puasaKe, e.tanggal, entrySummaryForDinas(cat, e)]);
    const sh = XLSX.utils.aoa_to_sheet([['Puasa ke-', 'Tanggal', 'Ringkasan'], ...rows]);
    const name = (KATEGORI_CONFIG[cat]?.title || cat).slice(0, 28);
    XLSX.utils.book_append_sheet(wb, sh, name);
  }

  const safe = String(user.nisn).replace(/\W/g, '');
  XLSX.writeFile(wb, `dinas-jurnal-ramadhan-${safe}.xlsx`);
}

export async function downloadDinasSchoolWord(
  students: AdminStudentProgressRow[],
  totals: { studentCount: number; totalEntries: number; avgTodayCompletion: number },
  today: string,
  generatedAt: string,
) {
  const intro = [
    ...DINAS_LINES.map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line, bold: line.includes('SMAS') })],
          alignment: AlignmentType.CENTER,
          spacing: { after: line.includes('SMAS') ? 120 : 40 },
        }),
    ),
    new Paragraph({ text: '', spacing: { after: 120 } }),
    new Paragraph({
      text: 'LAPORAN REKAPITULASI JURNAL RAMADHAN TINGKAT SEKOLAH\n1447 H / 2026 M',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Lampiran administrasi untuk pemantauan kegiatan jurnal Ramadhan peserta didik. Tanggal acuan (hari ini): ${today}.`,
        }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({ children: [new TextRun(`Di-generate: ${generatedAt}`)], spacing: { after: 240 } }),
    new Paragraph({
      children: [
        new TextRun(
          `Jumlah siswa: ${totals.studentCount}. Total entri jurnal (semua kategori): ${totals.totalEntries}. Rata-rata kelengkapan kategori hari ini: ${totals.avgTodayCompletion}%.`,
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
    'Lap. kertas',
    ...JURNAL_SHEET_KEYS.map((k) => JURNAL_SHEET_KEY_LABELS[k]),
    'Σ Entri',
    '%Hini',
  ];
  const headerRow = new TableRow({
    tableHeader: true,
    children: tableHead.map(
      (h) =>
        new TableCell({
          shading: { fill: 'E3F2FD' },
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16 })] })],
        }),
    ),
  });
  const dataRows = students.map(
    (s) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(String(s.nisn))], margins: { top: 50, bottom: 50, left: 50, right: 50 } }),
          new TableCell({ children: [new Paragraph(String(s.nama))], margins: { top: 50, bottom: 50, left: 50, right: 50 } }),
          new TableCell({ children: [new Paragraph(String(s.kelas))], margins: { top: 50, bottom: 50, left: 50, right: 50 } }),
          new TableCell({
            children: [new Paragraph(String(s.jenisKelamin || '—'))],
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
          }),
          new TableCell({
            children: [new Paragraph(s.paperManual ? 'Ya' : 'Tidak')],
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
          }),
          ...JURNAL_SHEET_KEYS.map(
            (k) =>
              new TableCell({
                children: [new Paragraph(String(s.counts[k] ?? 0))],
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
              }),
          ),
          new TableCell({
            children: [new Paragraph(String(s.totalEntries))],
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
          }),
          new TableCell({
            children: [new Paragraph(String(s.todayPercent))],
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
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

  const doc = new Document({
    sections: [{ properties: {}, children: [...intro, table] }],
  });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `dinas-sekolah-jurnal-ramadhan-${today.replace(/-/g, '')}.docx`);
}

export function downloadDinasSchoolExcel(
  students: AdminStudentProgressRow[],
  totals: { studentCount: number; totalEntries: number; avgTodayCompletion: number },
  today: string,
  generatedAt: string,
) {
  const wb = XLSX.utils.book_new();
  const meta: (string | number)[][] = [
    ...DINAS_LINES.map((l) => [l]),
    [],
    ['LAPORAN SEKOLAH — JURNAL RAMADHAN'],
    ['Tanggal acuan', today],
    ['Di-generate', generatedAt],
    [],
    ['Jumlah siswa', totals.studentCount],
    ['Total entri', totals.totalEntries],
    ['Rata-rata % hari ini', totals.avgTodayCompletion],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), 'Sampul');

  const head = [
    'NISN',
    'Nama',
    'Kelas',
    'JK',
    'Laporan kertas',
    'Period mulai',
    'Period selesai',
    ...JURNAL_SHEET_KEYS.map((k) => JURNAL_SHEET_KEY_LABELS[k]),
    'Total entri',
    '% Hari ini',
    'Terakhir',
  ];
  const rows = students.map((s) => [
    s.nisn,
    s.nama,
    s.kelas,
    s.jenisKelamin || '',
    s.paperManual ? 'Ya' : 'Tidak',
    s.paperPeriodStart || '',
    s.paperPeriodEnd || '',
    ...JURNAL_SHEET_KEYS.map((k) => s.counts[k] ?? 0),
    s.totalEntries,
    s.todayPercent,
    s.lastActivity || '',
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head, ...rows]), 'Siswa');
  XLSX.writeFile(wb, `dinas-sekolah-jurnal-ramadhan-${today.replace(/-/g, '')}.xlsx`);
}

export async function downloadDinasBulkStudentZip(
  gasUrl: string,
  students: AdminStudentProgressRow[],
  format: 'docx' | 'xlsx',
) {
  const zip = new JSZip();
  const folder = zip.folder('laporan-dinas-per-siswa');
  if (!folder) throw new Error('ZIP gagal');

  for (const s of students) {
    const j = await fetchStudentJurnalFromGas(gasUrl, s.nisn);
    const paper: PaperManualClientInfo | undefined = s.paperManual
      ? {
          enabled: true,
          periodStart: s.paperPeriodStart,
          periodEnd: s.paperPeriodEnd,
          note: s.paperNote,
        }
      : undefined;
    const user = {
      nama: s.nama,
      nisn: s.nisn,
      kelas: s.kelas,
      jenisKelamin: s.jenisKelamin,
    };
    const safe = String(s.nisn).replace(/\W/g, '');
    if (format === 'docx') {
      const blob = await buildDinasStudentDocxBlob(user, j, paper);
      folder.file(`dinas-${safe}.docx`, blob);
    } else {
      const wb = XLSX.utils.book_new();
      const cover: (string | number)[][] = [
        ...DINAS_LINES.map((l) => [l]),
        [],
        ['BERITA ACARA JURNAL RAMADHAN — INDIVIDU'],
        ['Nama', s.nama],
        ['NISN', s.nisn],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cover), 'Sampul');
      for (const cat of Object.keys(KATEGORI_CONFIG)) {
        const rowz = (j[cat] || [])
          .slice()
          .sort((a, b) => (a.puasaKe || 0) - (b.puasaKe || 0))
          .map((e) => [e.puasaKe, e.tanggal, entrySummaryForDinas(cat, e)]);
        const sh = XLSX.utils.aoa_to_sheet([['Puasa ke-', 'Tanggal', 'Ringkasan'], ...rowz]);
        XLSX.utils.book_append_sheet(wb, sh, (KATEGORI_CONFIG[cat]?.title || cat).slice(0, 28));
      }
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      folder.file(`dinas-${safe}.xlsx`, buf);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `bulk-dinas-siswa-${format}-${new Date().toISOString().slice(0, 10)}.zip`);
}
