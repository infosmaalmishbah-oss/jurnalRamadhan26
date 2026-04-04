import {
  Coffee,
  BookOpen,
  HeartHandshake,
  Utensils,
  Book,
  HandHeart,
  Moon
} from 'lucide-react';
import type { CategoryConfig } from './types';

export const GAS_URL = import.meta.env.VITE_GAS_URL;

/** Peringatan di dashboard siswa (bisa override `VITE_STUDENT_DASHBOARD_WARNING`). */
export const STUDENT_DASHBOARD_WARNING =
  (import.meta.env.VITE_STUDENT_DASHBOARD_WARNING as string | undefined)?.trim() ||
  'Isi jurnal Ramadhan setiap hari dengan jujur dan tepat waktu. Data tersimpan ke server sekolah (Google Apps Script). Pastikan jaringan stabil; hubungi wali kelas bila ada kendala.';

/**
 * NISN akun admin (baris di Sheet Siswa). Login tetap lewat `action=login` GAS;
 * jika script mengembalikan `isAdmin: true` atau `role: "admin"`, itu yang dipakai.
 * Daftar ini hanya fallback jika response belum menyertakan flag (koma/spasi di .env).
 */
const DEFAULT_ADMIN_NISNS = ['0011223344', '4433221100'] as const;

function parseAdminNisnsFromEnv(): string[] {
  const raw = (import.meta.env.VITE_ADMIN_NISNS as string | undefined)?.trim();
  if (!raw) return [...DEFAULT_ADMIN_NISNS];
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const ADMIN_NISNS = parseAdminNisnsFromEnv();

function normalizeNisnDigits(nisn: string): string {
  return String(nisn)
    .replace(/^['\s]+/, '')
    .replace(/\D/g, '')
    .replace(/^0+/, '');
}

export function isAdminNisn(nisn: string): boolean {
  const t = nisn.trim();
  if (ADMIN_NISNS.includes(t)) return true;
  const nt = normalizeNisnDigits(t);
  return ADMIN_NISNS.some((a) => normalizeNisnDigits(a) === nt && nt.length > 0);
}

/** Setelah `login` GAS sukses: tentukan akses admin dari payload + NISN. */
export function resolveIsAdmin(
  nisn: string,
  data: { isAdmin?: boolean; role?: string },
): boolean {
  if (data.isAdmin === true) return true;
  const r = String(data.role || '')
    .toLowerCase()
    .trim();
  if (r === 'admin' || r === 'administrator' || r === 'pengurus') return true;
  return isAdminNisn(nisn);
}

/** Sinkron dengan `JURNAL_CATEGORIES` di `google-apps-script/Code.gs` */
export const JURNAL_SHEET_KEYS = [
  'sahur',
  'shalat',
  'belajar',
  'silaturahmi',
  'berbuka',
  'alquran',
  'jujur',
] as const;

export const JURNAL_SHEET_KEY_LABELS: Record<(typeof JURNAL_SHEET_KEYS)[number], string> = {
  sahur: 'Sahur',
  shalat: 'Shalat',
  belajar: 'Belajar',
  silaturahmi: 'Silaturahmi',
  berbuka: 'Berbuka',
  alquran: 'Al-Quran',
  jujur: 'Kejujuran',
};

export const KATEGORI_CONFIG: Record<string, CategoryConfig> = {
  sahur: {
    id: 'sahur',
    title: 'Jurnal Sahur',
    subtitle: 'Catatan makan sahur harian',
    icon: Coffee,
    gradient: 'from-amber-400 to-orange-500',
    fields: [
      { id: 'waktuSahur', label: 'Waktu Sahur', type: 'time', required: true },
      { id: 'menuSahur', label: 'Menu Sahur', type: 'text', placeholder: 'Nasi, lauk, sayur, dll' },
      { id: 'doaSahur', label: 'Sudah Baca Doa?', type: 'select', options: ['Ya', 'Tidak'] },
      { id: 'catatanSahur', label: 'Catatan Tambahan', type: 'textarea', placeholder: 'Catatan lainnya...' }
    ]
  },
  shalat: {
    id: 'shalat',
    title: 'Jurnal Ibadah Shalat',
    subtitle: 'Shalat 5 waktu & sunnah',
    icon: Moon,
    gradient: 'from-emerald-600 to-green-600',
    fields: [
      { id: 'subuh', label: 'Shalat Subuh', type: 'select', options: ['Tepat Waktu', 'Terlambat', 'Tidak Shalat'] },
      { id: 'dzuhur', label: 'Shalat Dzuhur', type: 'select', options: ['Tepat Waktu', 'Terlambat', 'Tidak Shalat'] },
      { id: 'ashar', label: 'Shalat Ashar', type: 'select', options: ['Tepat Waktu', 'Terlambat', 'Tidak Shalat'] },
      { id: 'maghrib', label: 'Shalat Maghrib', type: 'select', options: ['Tepat Waktu', 'Terlambat', 'Tidak Shalat'] },
      { id: 'isya', label: 'Shalat Isya', type: 'select', options: ['Tepat Waktu', 'Terlambat', 'Tidak Shalat'] },
      { id: 'tarawih', label: 'Shalat Tarawih', type: 'select', options: ['Ya (8 Rakaat)', 'Ya (20 Rakaat)', 'Tidak'] },
      { id: 'tahajud', label: 'Shalat Tahajud', type: 'select', options: ['Ya', 'Tidak'] },
      { id: 'dhuha', label: 'Shalat Dhuha', type: 'select', options: ['Ya', 'Tidak'] }
    ]
  },
  belajar: {
    id: 'belajar',
    title: 'Jurnal Gemar Belajar',
    subtitle: 'Aktivitas belajar harian',
    icon: BookOpen,
    gradient: 'from-blue-500 to-indigo-600',
    fields: [
      { id: 'materiBelajar', label: 'Materi yang Dipelajari', type: 'text', placeholder: 'Matematika, Bahasa Arab, dll' },
      { id: 'durasiBelajar', label: 'Durasi Belajar (menit)', type: 'number', placeholder: '60' },
      { id: 'metodeBelajar', label: 'Metode Belajar', type: 'select', options: ['Mandiri', 'Kelompok', 'Bimbingan Guru', 'Online'] },
      { id: 'intisariBelajar', label: 'Intisari/Kesimpulan', type: 'textarea', placeholder: 'Apa yang dipahami hari ini...' }
    ]
  },
  silaturahmi: {
    id: 'silaturahmi',
    title: 'Jurnal Silaturahmi',
    subtitle: 'Kegiatan sosial & kebaikan',
    icon: HeartHandshake,
    gradient: 'from-pink-500 to-rose-500',
    fields: [
      { id: 'kegiatanSilaturahmi', label: 'Jenis Kegiatan', type: 'select', options: ['Mengunjungi Kerabat', 'Membantu Orang Tua', 'Berbagi Takjil', 'Menyantuni Anak Yatim', 'Lainnya'] },
      { id: 'denganSiapa', label: 'Bersama/Kepada Siapa', type: 'text', placeholder: 'Nenek, tetangga, dll' },
      { id: 'ceritaSilaturahmi', label: 'Ceritakan Kegiatannya', type: 'textarea', placeholder: 'Bagaimana perasaan dan pengalamanmu...' }
    ]
  },
  berbuka: {
    id: 'berbuka',
    title: 'Jurnal Berbuka Puasa',
    subtitle: 'Catatan berbuka harian',
    icon: Utensils,
    gradient: 'from-purple-500 to-violet-600',
    fields: [
      { id: 'waktuBerbuka', label: 'Waktu Berbuka', type: 'time', required: true },
      { id: 'menuBerbuka', label: 'Menu Berbuka', type: 'text', placeholder: 'Kurma, es buah, nasi, dll' },
      { id: 'tempatBerbuka', label: 'Tempat Berbuka', type: 'select', options: ['Rumah', 'Masjid', 'Sekolah', 'Lainnya'] },
      { id: 'doaBerbuka', label: 'Sudah Baca Doa?', type: 'select', options: ['Ya', 'Tidak'] },
      { id: 'catatanBerbuka', label: 'Catatan Tambahan', type: 'textarea', placeholder: 'Pengalaman berbuka hari ini...' }
    ]
  },
  quran: {
    id: 'quran',
    title: 'Jurnal Baca Al-Quran',
    subtitle: 'Tilawah harian Ramadhan',
    icon: Book,
    gradient: 'from-yellow-500 to-amber-600',
    fields: [
      { id: 'suratDibaca', label: 'Surat yang Dibaca', type: 'text', placeholder: 'Al-Baqarah, Ali Imran, dll' },
      { id: 'ayatMulai', label: 'Ayat Mulai', type: 'number', placeholder: '1' },
      { id: 'ayatSelesai', label: 'Ayat Selesai', type: 'number', placeholder: '50' },
      { id: 'juzDibaca', label: 'Juz ke-', type: 'select', options: Array.from({length: 30}, (_, i) => `Juz ${i + 1}`) },
      { id: 'lamaTilawah', label: 'Durasi (menit)', type: 'number', placeholder: '30' },
      { id: 'intisariQuran', label: 'Intisari/Tadabbur', type: 'textarea', placeholder: 'Pelajaran dari ayat yang dibaca...' }
    ]
  },
  kejujuran: {
    id: 'kejujuran',
    title: 'Jurnal Kejujuran',
    subtitle: 'Refleksi diri harian',
    icon: HandHeart,
    gradient: 'from-teal-500 to-cyan-600',
    fields: [
      { id: 'puasaPenuh', label: 'Puasa Penuh Hari Ini?', type: 'select', options: ['Ya, Alhamdulillah', 'Batal (Uzur)', 'Batal (Lainnya)'] },
      { id: 'alasanBatal', label: 'Jika Batal, Alasannya', type: 'text', placeholder: 'Sakit, haid, dll (kosongkan jika tidak batal)' },
      { id: 'menjagaLisan', label: 'Menjaga Lisan?', type: 'select', options: ['Ya', 'Kurang'] },
      { id: 'menjagaPandangan', label: 'Menjaga Pandangan?', type: 'select', options: ['Ya', 'Kurang'] },
      { id: 'berbohong', label: 'Berbohong Hari Ini?', type: 'select', options: ['Tidak', 'Ya (Akan lebih baik besok)'] },
      { id: 'refleksiDiri', label: 'Refleksi Diri', type: 'textarea', placeholder: 'Apa yang bisa diperbaiki besok...' }
    ]
  }
};
