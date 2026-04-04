Salin isi Code.gs ke editor Google Apps Script (Extensions > Apps Script), simpan, lalu Deploy > New deployment > Web app (Execute as: Me, Who has access: sesuai kebutuhan).

Sheet "siswa" (disarankan):
  Kolom A: NISN | B: Nama | C: Kelas | D: Jenis kelamin | E: Peran (opsional: isi "admin" atau "pengurus" untuk akses panel admin).
  Atau set Script property ADMIN_NISNS = daftar NISN admin dipisah koma (default di kode: 0011223344,4433221100).

Action GET baru untuk panel admin web:
  getAllStudentsProgress — agregasi progres semua siswa + hitungan per sheet jurnal.
  getSettings — status { jurnalInputEnabled } untuk siswa & admin.

POST action updateSettings — body { adminPassword, jurnalInputEnabled }.
  Wajib set ADMIN_PASSWORD di Script properties. Jika jurnalInputEnabled=false,
  siswa tidak bisa saveJurnal (server menolak).

Sheet "manual_jurnal" (otomatis dibuat saat pertama kali dipakai):
  Kolom: nisn | enabled (TRUE/FALSE) | period_start | period_end | catatan | rows_synced_at | updated_at
  Menandai siswa yang jurnal aslinya di kertas; getData mengembalikan _paperManual + override _progress bila enabled;
  saveJurnal ditolak untuk siswa tersebut (hindari dobel entri digital).

POST action setPaperManual — body JSON:
  { adminPassword, nisn, enabled, periodStart?, periodEnd?, catatan?, applySheetRows?, tanggalReferensi? }
  Jika enabled=true dan applySheetRows=true, menambah paling banyak 7 baris rekonsiliasi (id berawalan PAPER|…)
  di tiap sheet jurnal yang belum punya bundel PAPER untuk NISN tersebut.

Pastikan URL deployment sama dengan VITE_GAS_URL di frontend.
