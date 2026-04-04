Salin isi Code.gs ke editor Google Apps Script (Extensions > Apps Script), simpan, lalu Deploy > New deployment > Web app (Execute as: Me, Who has access: sesuai kebutuhan).

Sheet "siswa" (disarankan):
  Kolom A: NISN | B: Nama | C: Kelas | D: Jenis kelamin | E: Peran (opsional: isi "admin" atau "pengurus" untuk akses panel admin).
  Atau set Script property ADMIN_NISNS = daftar NISN admin dipisah koma (default di kode: 0011223344,4433221100).

Action GET baru untuk panel admin web:
  getAllStudentsProgress — agregasi progres semua siswa + hitungan per sheet jurnal.

Pastikan URL deployment sama dengan VITE_GAS_URL di frontend.
