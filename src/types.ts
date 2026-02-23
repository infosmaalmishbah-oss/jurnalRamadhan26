export interface User {
  nama: string;
  kelas: string;
  nisn: string;
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
