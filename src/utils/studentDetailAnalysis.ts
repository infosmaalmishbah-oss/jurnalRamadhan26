import type { AdminStudentProgressRow, JournalEntry } from '../types';
import { JURNAL_SHEET_KEYS, JURNAL_SHEET_KEY_LABELS, KATEGORI_CONFIG } from '../config';

const GAS_TO_CLIENT: Record<string, string> = {
  alquran: 'quran',
  jujur: 'kejujuran',
};

export function normalizeGetDataToClient(raw: Record<string, unknown>): Record<string, JournalEntry[]> {
  const out: Record<string, JournalEntry[]> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    const ck = GAS_TO_CLIENT[k] || k;
    if (Array.isArray(v)) {
      out[ck] = (v as JournalEntry[]).map((e) => ({
        ...e,
        tanggal:
          e.tanggal && !String(e.tanggal).match(/^\d{4}-\d{2}-\d{2}$/)
            ? new Date(e.tanggal as string).toISOString().split('T')[0]
            : String(e.tanggal || ''),
      }));
    }
  }
  for (const id of Object.keys(KATEGORI_CONFIG)) {
    if (!out[id]) out[id] = [];
  }
  return out;
}

export interface StudentAnalysisResult {
  totalEntries: number;
  distinctDays: number;
  dateRange: { min: string | null; max: string | null };
  busiestCategory: { key: string; label: string; count: number } | null;
  sparsestCategory: { key: string; label: string; count: number } | null;
  avgEntriesPerActiveDay: number;
  bullets: string[];
}

export function buildStudentDetailAnalysis(
  jurnal: Record<string, JournalEntry[]>,
  row: AdminStudentProgressRow,
): StudentAnalysisResult {
  const dates = new Set<string>();
  let total = 0;
  const perGas: Record<string, number> = {};
  for (const gk of JURNAL_SHEET_KEYS) {
    perGas[gk] = 0;
  }

  for (const gk of JURNAL_SHEET_KEYS) {
    const ck = GAS_TO_CLIENT[gk] || gk;
    const arr = jurnal[ck] || [];
    perGas[gk] = arr.length;
    total += arr.length;
    for (const e of arr) {
      if (e.tanggal) dates.add(e.tanggal);
    }
  }

  const sortedDates = Array.from(dates).sort();
  const min = sortedDates[0] || null;
  const max = sortedDates[sortedDates.length - 1] || null;
  const distinctDays = dates.size;
  const avgEntriesPerActiveDay =
    distinctDays > 0 ? Math.round((total / distinctDays) * 10) / 10 : 0;

  let maxK: string | null = null;
  let maxC = -1;
  let minK: string | null = null;
  let minC = Infinity;
  for (const gk of JURNAL_SHEET_KEYS) {
    const c = perGas[gk] ?? 0;
    if (c > maxC) {
      maxC = c;
      maxK = gk;
    }
    if (c < minC) {
      minC = c;
      minK = gk;
    }
  }

  const busiestCategory =
    maxK != null && maxC > 0
      ? { key: maxK, label: JURNAL_SHEET_KEY_LABELS[maxK as keyof typeof JURNAL_SHEET_KEY_LABELS], count: maxC }
      : null;
  const sparsestCategory =
    minK != null
      ? {
          key: minK,
          label: JURNAL_SHEET_KEY_LABELS[minK as keyof typeof JURNAL_SHEET_KEY_LABELS],
          count: perGas[minK] ?? 0,
        }
      : null;

  const bullets: string[] = [
    `Total entri jurnal: ${total} (sesuai agregasi sheet: ${row.totalEntries}).`,
    `Hari unik dengan setidaknya satu entri: ${distinctDays}.`,
    avgEntriesPerActiveDay > 0
      ? `Rata-rata ${avgEntriesPerActiveDay} entri per hari aktif.`
      : 'Belum ada pola hari aktif yang dapat dihitung.',
  ];
  if (min && max) bullets.push(`Rentang tanggal entri: ${min} → ${max}.`);
  bullets.push(
    `Hari ini (${row.todayPercent}%): ${row.categoriesFilledToday}/${JURNAL_SHEET_KEYS.length} kategori terisi.`,
  );
  if (busiestCategory) {
    bullets.push(`Kategori tersibuk: ${busiestCategory.label} (${busiestCategory.count} entri).`);
  }
  if (sparsestCategory && sparsestCategory.count === 0) {
    bullets.push(`Belum ada entri pada: ${sparsestCategory.label}.`);
  } else if (sparsestCategory && sparsestCategory.key !== busiestCategory?.key) {
    bullets.push(`Kategori paling sedikit: ${sparsestCategory.label} (${sparsestCategory.count} entri).`);
  }

  return {
    totalEntries: total,
    distinctDays,
    dateRange: { min, max },
    busiestCategory,
    sparsestCategory,
    avgEntriesPerActiveDay,
    bullets,
  };
}
