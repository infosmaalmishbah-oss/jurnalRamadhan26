import {
  Coffee,
  BookOpen,
  HeartHandshake,
  Utensils,
  Book,
  HandHeart,
  Moon
} from 'lucide-react';
import { CategoryConfig } from './types';

export const GAS_URL = 'https://script.google.com/macros/s/AKfycbyMZp_Ee7Y4UJTkKK_EkNpjj2-EDhd1InDM3eecBorwsnRYavoy2nxbXHn_3_uCa6b4/exec';
export const DEMO_MODE = false;

export const DEMO_STUDENTS: Record<string, any> = {
  '1234567890': { nama: 'Ahmad Fauzan', kelas: 'XII IPA 1', nisn: '1234567890' },
  '0987654321': { nama: 'Siti Aisyah', kelas: 'XI IPS 2', nisn: '0987654321' },
  '1122334455': { nama: 'Muhammad Rizki', kelas: 'X IPA 3', nisn: '1122334455' }
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
