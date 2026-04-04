export interface User {
  nama: string;
  kelas: string;
  nisn: string;
  /** Dari Sheet Siswa / response `login` GAS (opsional). */
  jenisKelamin?: string;
  /** Jika true, pengguna diarahkan ke panel admin (disarankan diset di Google Apps Script). */
  isAdmin?: boolean;
  /** Alias umum dari sheet: peran `admin` / `siswa`. */
  role?: string;
}

export interface JournalEntry {
  uniqueId: string;
  tanggal: string;
  puasaKe: number;
  nisn: string;
  nama: string;
  kelas: string;
  kategori: string;
  timestamp: string;
  ringkasan: string;
  [key: string]: any;
}

export interface FieldConfig {
  id: string;
  label: string;
  type: 'text' | 'number' | 'time' | 'select' | 'textarea' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface CategoryConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  gradient: string;
  fields: FieldConfig[];
}

export interface Message {
  id: string;
  tanggal: string; // ISO or date string
  hari?: string; // optional day number
  nisn?: string;
  nama?: string;
  kelas?: string;
  pesan: string;
  reply?: string;
}

/** Baris agregasi dari GAS `getAllStudentsProgress` */
export interface AdminStudentProgressRow {
  nisn: string;
  nama: string;
  kelas: string;
  jenisKelamin?: string;
  isAdmin?: boolean;
  /** Jurnal di kertas — rekonsiliasi administratif (sheet `manual_jurnal` di GAS). */
  paperManual?: boolean;
  paperPeriodStart?: string;
  paperPeriodEnd?: string;
  paperNote?: string;
  counts: Record<string, number>;
  totalEntries: number;
  categoriesFilledToday: number;
  todayPercent: number;
  lastActivity: string | null;
}

/** Metadata dari `getData` → `_paperManual` */
export interface PaperManualClientInfo {
  enabled: boolean;
  periodStart?: string;
  periodEnd?: string;
  note?: string;
}

export interface AdminProgressPayload {
  generatedAt: string;
  today: string;
  students: AdminStudentProgressRow[];
  totals: {
    studentCount: number;
    totalEntries: number;
    avgTodayCompletion: number;
  };
}
