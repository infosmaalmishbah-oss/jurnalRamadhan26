import type { JournalEntry } from '../types';

/** Muat `getData` mentah dan kembalikan map kategori → entri (kunci sama seperti dashboard siswa). */
export async function fetchStudentJurnalFromGas(
  gasUrl: string,
  nisn: string,
): Promise<Record<string, JournalEntry[]>> {
  const res = await fetch(`${gasUrl}?action=getData&nisn=${encodeURIComponent(nisn)}`);
  const j = await res.json();
  if (!j.success) throw new Error(j.message || 'Gagal memuat jurnal');

  const keyMap: Record<string, string> = { alquran: 'quran', jujur: 'kejujuran' };
  const raw = j.data || {};
  const normalized: Record<string, JournalEntry[]> = {};

  for (const [k, arr] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    const clientKey = keyMap[k] || k;
    if (!Array.isArray(arr)) {
      normalized[clientKey] = [];
      continue;
    }
    normalized[clientKey] = (arr as JournalEntry[]).map((entry) => {
      const e = { ...entry };
      if (e.tanggal) {
        const d = new Date(e.tanggal as string);
        if (!isNaN(d.getTime())) e.tanggal = d.toISOString().split('T')[0];
      }
      if (e.puasaKe !== undefined) e.puasaKe = parseInt(String(e.puasaKe), 10) || 0;
      e.uniqueId = e.uniqueId || e.id || `${e.nisn || ''}-${e.tanggal || ''}-${e.puasaKe || ''}`;
      return e;
    });
  }

  return normalized;
}
