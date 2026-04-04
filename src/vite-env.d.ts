/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAS_URL?: string;
  /** Opsional: override daftar NISN admin (koma/spasi), default 0011223344 & 4433221100 */
  readonly VITE_ADMIN_NISNS?: string;
  /** Teks peringatan di dashboard siswa */
  readonly VITE_STUDENT_DASHBOARD_WARNING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
