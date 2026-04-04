import Swal from 'sweetalert2';
import type { AdminStudentProgressRow } from '../types';
import type { SetPaperManualPayload } from './paperManualApi';

function isFemale(jk?: string): boolean {
  const s = String(jk || '')
    .toLowerCase()
    .trim();
  return s.includes('perempuan') || s === 'p' || s === 'pr' || s === 'wanita';
}

/** Dialog alur set `setPaperManual` GAS. */
export async function promptPaperManualPayload(
  row: AdminStudentProgressRow,
): Promise<SetPaperManualPayload | null> {
  const today = new Date().toISOString().slice(0, 10);

  if (row.paperManual) {
    const r = await Swal.fire({
      title: 'Nonaktifkan mode laporan kertas?',
      html: `<p class="text-sm text-gray-600 text-left">Siswa dapat kembali mengisi jurnal digital. Baris rekonsiliasi di sheet tidak dihapus otomatis.</p>
        <input id="pm-pw-off" type="password" class="swal2-input" placeholder="Password admin" autocomplete="off" />`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#1B5E20',
      confirmButtonText: 'Simpan',
      preConfirm: () => {
        const pw = (document.getElementById('pm-pw-off') as HTMLInputElement)?.value?.trim();
        if (!pw) {
          Swal.showValidationMessage('Password wajib');
          return false;
        }
        return pw;
      },
    });
    if (!r.isConfirmed || typeof r.value !== 'string') return null;
    return {
      nisn: row.nisn,
      enabled: false,
      adminPassword: r.value,
      applySheetRows: false,
    };
  }

  const periodHint = isFemale(row.jenisKelamin)
    ? '<p class="text-xs text-amber-800 dark:text-amber-200 mt-1">Opsional: rentang <strong>period</strong> untuk catatan administrasi (bukan pengganti dokumentasi medis).</p>'
    : '';

  const r = await Swal.fire({
    title: 'Aktifkan laporan manual (kertas)',
    width: 520,
    html: `<p class="text-xs text-gray-600 text-left mb-2">Mencatat bahwa jurnal asli pada kertas; opsional menulis 7 baris rekonsiliasi (satu per kategori) ke spreadsheet.</p>
      ${periodHint}
      <label class="block text-left text-xs font-semibold mt-2">Password admin</label>
      <input id="pm-pw" type="password" class="swal2-input" placeholder="ADMIN_PASSWORD" autocomplete="off" />
      <label class="block text-left text-xs font-semibold mt-2">Tanggal referensi rekonsiliasi</label>
      <input id="pm-tgl" type="date" class="swal2-input" value="${today}" />
      <div class="grid grid-cols-2 gap-2 mt-2">
        <div><label class="block text-left text-xs">Period mulai (opsional)</label><input id="pm-p1" type="date" class="swal2-input" /></div>
        <div><label class="block text-left text-xs">Period selesai (opsional)</label><input id="pm-p2" type="date" class="swal2-input" /></div>
      </div>
      <label class="block text-left text-xs font-semibold mt-2">Catatan sekolah (opsional)</label>
      <textarea id="pm-note" class="swal2-textarea" placeholder="Mis. nomor bundel arsip wali kelas"></textarea>
      <label class="flex items-center gap-2 mt-3 text-sm text-left cursor-pointer">
        <input id="pm-sheet" type="checkbox" checked />
        Tulis baris rekonsiliasi ke sheet (7 kategori, id PAPER|…)
      </label>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonColor: '#1B5E20',
    confirmButtonText: 'Aktifkan',
    preConfirm: () => {
      const pw = (document.getElementById('pm-pw') as HTMLInputElement)?.value?.trim();
      const tgl = (document.getElementById('pm-tgl') as HTMLInputElement)?.value?.trim();
      const p1 = (document.getElementById('pm-p1') as HTMLInputElement)?.value?.trim();
      const p2 = (document.getElementById('pm-p2') as HTMLInputElement)?.value?.trim();
      const note = (document.getElementById('pm-note') as HTMLTextAreaElement)?.value?.trim() || '';
      const sheet = (document.getElementById('pm-sheet') as HTMLInputElement)?.checked ?? true;
      if (!pw) {
        Swal.showValidationMessage('Password admin wajib');
        return false;
      }
      if (!tgl) {
        Swal.showValidationMessage('Tanggal referensi wajib');
        return false;
      }
      return { pw, tgl, p1, p2, note, sheet };
    },
  });

  if (!r.isConfirmed || !r.value || typeof r.value !== 'object') return null;
  const v = r.value as { pw: string; tgl: string; p1: string; p2: string; note: string; sheet: boolean };
  return {
    nisn: row.nisn,
    enabled: true,
    adminPassword: v.pw,
    tanggalReferensi: v.tgl,
    periodStart: v.p1 || undefined,
    periodEnd: v.p2 || undefined,
    catatan: v.note || undefined,
    applySheetRows: v.sheet,
  };
}
