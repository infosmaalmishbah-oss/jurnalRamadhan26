import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BookOpen,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  Settings2,
  TrendingUp,
  Users,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { GAS_URL, JURNAL_SHEET_KEYS, JURNAL_SHEET_KEY_LABELS } from '../config';
import type { AdminStudentProgressRow, User } from '../types';
import Chat from './Chat';
import StudentDetailModal from './StudentDetailModal';
import { fetchFullAdminOverview, type AdminOverview } from '../utils/adminStats';
import { exportAdminExcel, exportAdminWord } from '../utils/exportReports';
import { fetchAppSettings, updateAppSettings } from '../utils/appSettings';

interface AdminDashboardProps {
  adminUser: User | null;
  onLogout: () => void;
}

type SortKey =
  | 'nama'
  | 'nisn'
  | 'kelas'
  | 'totalEntries'
  | 'todayPercent'
  | 'lastActivity';
type SortDir = 'asc' | 'desc';

function compareRow(
  a: AdminStudentProgressRow,
  b: AdminStudentProgressRow,
  key: SortKey,
  dir: SortDir,
): number {
  const m = dir === 'asc' ? 1 : -1;
  switch (key) {
    case 'nisn':
      return m * String(a.nisn).localeCompare(String(b.nisn), 'id', { numeric: true });
    case 'nama':
      return m * String(a.nama).localeCompare(String(b.nama), 'id');
    case 'kelas':
      return m * String(a.kelas).localeCompare(String(b.kelas), 'id');
    case 'totalEntries':
      return m * (a.totalEntries - b.totalEntries);
    case 'todayPercent':
      return m * (a.todayPercent - b.todayPercent);
    case 'lastActivity': {
      const da = a.lastActivity || '';
      const db = b.lastActivity || '';
      return m * da.localeCompare(db);
    }
    default:
      return 0;
  }
}

export default function AdminDashboard({ adminUser, onLogout }: AdminDashboardProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [kelasFilter, setKelasFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'siswa' | 'admin'>('all');
  const [completionFilter, setCompletionFilter] = useState<'all' | '100' | 'partial' | '0'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('nama');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [detailStudent, setDetailStudent] = useState<AdminStudentProgressRow | null>(null);
  const [jurnalInputEnabled, setJurnalInputEnabled] = useState<boolean | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadSettings = useCallback(async () => {
    if (!GAS_URL) return;
    try {
      const s = await fetchAppSettings(GAS_URL);
      setJurnalInputEnabled(s.jurnalInputEnabled);
    } catch {
      setJurnalInputEnabled(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (!GAS_URL) throw new Error('VITE_GAS_URL belum diatur');
      const [data] = await Promise.all([fetchFullAdminOverview(GAS_URL), loadSettings()]);
      setOverview(data);
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : 'Gagal memuat ringkasan');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [loadSettings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const kelasOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of overview?.students || []) {
      if (s.kelas) set.add(String(s.kelas));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [overview?.students]);

  const filteredSorted = useMemo(() => {
    const list = overview?.students || [];
    const q = query.trim().toLowerCase();
    let out = q
      ? list.filter(
          (s) =>
            s.nisn.toLowerCase().includes(q) ||
            String(s.nama || '')
              .toLowerCase()
              .includes(q) ||
            String(s.kelas || '')
              .toLowerCase()
              .includes(q),
        )
      : [...list];

    if (kelasFilter) out = out.filter((s) => String(s.kelas) === kelasFilter);
    if (roleFilter === 'siswa') out = out.filter((s) => !s.isAdmin);
    if (roleFilter === 'admin') out = out.filter((s) => !!s.isAdmin);
    if (completionFilter === '100') out = out.filter((s) => s.todayPercent >= 100);
    if (completionFilter === 'partial')
      out = out.filter((s) => s.todayPercent > 0 && s.todayPercent < 100);
    if (completionFilter === '0') out = out.filter((s) => s.todayPercent === 0);

    out.sort((a, b) => compareRow(a, b, sortKey, sortDir));
    return out;
  }, [
    overview?.students,
    query,
    kelasFilter,
    roleFilter,
    completionFilter,
    sortKey,
    sortDir,
  ]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'totalEntries' || key === 'todayPercent' ? 'desc' : 'asc');
    }
  };

  const SortTh = ({
    k,
    children,
    className = '',
  }: {
    k: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => {
    const active = sortKey === k;
    return (
      <th className={`${className} px-3 py-3`}>
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className="inline-flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-200 hover:text-islamic-green dark:hover:text-green-400"
        >
          {children}
          {active ? (
            sortDir === 'asc' ? (
              <ArrowUpAZ size={14} />
            ) : (
              <ArrowDownAZ size={14} />
            )
          ) : (
            <span className="opacity-30">
              <ArrowDownAZ size={14} />
            </span>
          )}
        </button>
      </th>
    );
  };

  const handleLogoutClick = () => {
    Swal.fire({
      title: 'Keluar dari admin?',
      text: 'Sesi admin akan diakhiri.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1B5E20',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
    }).then((r) => {
      if (r.isConfirmed) {
        sessionStorage.removeItem('isAdmin');
        onLogout();
      }
    });
  };

  const changeJurnalGate = async (enabled: boolean) => {
    if (!GAS_URL) return;
    const r = await Swal.fire({
      title: enabled ? 'Izinkan siswa mengisi jurnal?' : 'Blokir input jurnal siswa?',
      html: '<p class="text-sm text-gray-600">Masukkan <strong>ADMIN_PASSWORD</strong> (Script properties di Google Apps Script).</p>',
      input: 'password',
      inputPlaceholder: 'Password admin',
      showCancelButton: true,
      confirmButtonColor: '#1B5E20',
      confirmButtonText: 'Simpan',
    });
    if (!r.isConfirmed || !r.value) return;
    try {
      setSettingsBusy(true);
      const res = await updateAppSettings(GAS_URL, String(r.value), enabled);
      setJurnalInputEnabled(res.jurnalInputEnabled);
      await Swal.fire({
        icon: 'success',
        title: 'Pengaturan tersimpan',
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: e instanceof Error ? e.message : 'Tidak dapat memperbarui',
      });
    } finally {
      setSettingsBusy(false);
    }
  };

  const o = overview;

  const doExcel = () => {
    if (!o?.students.length) {
      Swal.fire({ icon: 'info', title: 'Belum ada data', text: 'Muat ulang setelah ada siswa di sheet.' });
      return;
    }
    try {
      exportAdminExcel(o.students, o.totals, o.today, o.generatedAt);
      Swal.fire({ icon: 'success', title: 'Excel diunduh', timer: 1600, showConfirmButton: false });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Ekspor Excel gagal.' });
    }
  };

  const doWord = async () => {
    if (!o?.students.length) {
      Swal.fire({ icon: 'info', title: 'Belum ada data', text: 'Muat ulang setelah ada siswa di sheet.' });
      return;
    }
    try {
      await exportAdminWord(o.students, o.totals, o.today, o.generatedAt);
      Swal.fire({ icon: 'success', title: 'Word diunduh', timer: 1600, showConfirmButton: false });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Ekspor Word gagal.' });
    }
  };

  const colCount = 5 + JURNAL_SHEET_KEYS.length + 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-light via-white to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-40 glass-dark border-b border-islamic-green/20 dark:border-gray-700 dark:bg-gray-900/80">
        <div className="max-w-[100rem] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow flex items-center justify-center overflow-hidden shrink-0">
              <img
                src="https://lh3.googleusercontent.com/d/1dpytEcHNFlaeRB3HYDY5e0mx3Srt1wlO"
                alt="Logo"
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML =
                    '<div class="text-islamic-green text-lg">🕌</div>';
                }}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-islamic-green dark:text-green-400 leading-tight flex items-center gap-2">
                <LayoutDashboard size={16} />
                Panel Admin — Jurnal Ramadhan
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">SMAS Al-Mishbah · Google Sheets + Apps Script</p>
              {adminUser ? (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">
                  <span className="font-medium text-islamic-green dark:text-green-400">{adminUser.nama}</span>
                  <span className="text-gray-400"> · </span>
                  NISN {adminUser.nisn}
                  {adminUser.kelas ? (
                    <>
                      <span className="text-gray-400"> · </span>
                      {adminUser.kelas}
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={doExcel}
              disabled={loading || !o?.students.length}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-600/40 bg-white dark:bg-gray-800 text-emerald-800 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              Excel + analisis
            </button>
            <button
              type="button"
              onClick={() => void doWord()}
              disabled={loading || !o?.students.length}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-600/40 bg-white dark:bg-gray-800 text-blue-900 dark:text-blue-300 text-sm font-medium hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <FileText size={16} />
              Word
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-islamic-green/30 bg-white/80 dark:bg-gray-800 text-islamic-green dark:text-green-400 text-sm font-medium hover:bg-white dark:hover:bg-gray-700 disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Muat ulang
            </button>
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-islamic-green text-white text-sm font-medium shadow hover:bg-green-800"
            >
              <MessageSquare size={16} />
              Inbox chat
              {o && o.pendingChat > 0 ? (
                <span className="ml-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
                  {o.pendingChat > 99 ? '99+' : o.pendingChat}
                </span>
              ) : null}
            </button>
          </div>
        </div>
        <div className="max-w-[100rem] mx-auto px-4 pb-3 text-xs text-gray-600 dark:text-gray-400">
          {currentTime.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })}
          {o ? (
            <span className="ml-2 text-gray-500 dark:text-gray-500">
              · Data sheet: hari ini {o.today} · {filteredSorted.length}/{o.students.length} baris
            </span>
          ) : null}
        </div>
      </header>

      <main className="max-w-[100rem] mx-auto px-4 py-6 space-y-6 pr-14">
        {loadError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 px-4 py-3 text-sm">
            {loadError}
            <p className="mt-2 text-xs">
              Pastikan skrip Google memuat <code className="bg-white/80 dark:bg-gray-800 px-1 rounded">getAllStudentsProgress</code> dan{' '}
              <code className="bg-white/80 dark:bg-gray-800 px-1 rounded">getSettings</code>.
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-islamic-green/20 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-lg p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Settings2 className="text-islamic-green dark:text-green-400" size={20} />
            <h2 className="font-semibold text-gray-900 dark:text-white">Pengaturan sistem</h2>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Matikan input jurnal agar siswa tidak dapat menyimpan entri baru (server menolak{' '}
            <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">saveJurnal</code>). Perlu{' '}
            <strong>ADMIN_PASSWORD</strong> di Script properties Google.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Status input siswa:{' '}
              <strong className={jurnalInputEnabled === false ? 'text-red-600' : 'text-green-700 dark:text-green-400'}>
                {jurnalInputEnabled === null ? '…' : jurnalInputEnabled ? 'Dibuka' : 'Ditutup'}
              </strong>
            </span>
            <button
              type="button"
              disabled={settingsBusy || !GAS_URL}
              onClick={() => void changeJurnalGate(false)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-sm font-medium border border-red-200 dark:border-red-900 disabled:opacity-50"
            >
              <Lock size={16} />
              Tutup input
            </button>
            <button
              type="button"
              disabled={settingsBusy || !GAS_URL}
              onClick={() => void changeJurnalGate(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 text-sm font-medium border border-green-200 dark:border-green-900 disabled:opacity-50"
            >
              Buka input
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Siswa terdaftar"
            value={loading ? '…' : String(o?.totals.studentCount ?? '—')}
            hint="Sheet siswa"
            icon={Users}
          />
          <StatCard
            label="Total entri jurnal"
            value={loading ? '…' : String(o?.totals.totalEntries ?? '—')}
            hint="Semua kategori"
            icon={BookOpen}
          />
          <StatCard
            label="Rata-rata hari ini"
            value={loading ? '…' : `${o?.totals.avgTodayCompletion ?? 0}%`}
            hint="% kategori terisi (semua siswa)"
            icon={TrendingUp}
          />
          <StatCard
            label="Chat"
            value={loading ? '…' : `${o?.pendingChat ?? 0} belum dibalas`}
            hint={`${o?.totalChatMessages ?? 0} pesan total`}
            icon={MessageSquare}
          />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-islamic-green/10 dark:border-gray-700 p-4 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-white">Filter &amp; urutan</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Klik header kolom untuk mengurutkan. Klik baris siswa untuk detail &amp; analisis.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari NISN, nama, kelas…"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:border-islamic-green outline-none"
              />
            </div>
            <select
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2.5"
            >
              <option value="">Semua kelas</option>
              {kelasOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2.5"
            >
              <option value="all">Semua peran</option>
              <option value="siswa">Siswa saja</option>
              <option value="admin">Admin saja</option>
            </select>
            <select
              value={completionFilter}
              onChange={(e) => setCompletionFilter(e.target.value as typeof completionFilter)}
              className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2.5"
            >
              <option value="all">Progres hari ini: semua</option>
              <option value="100">100% hari ini</option>
              <option value="partial">Sebagian (1–99%)</option>
              <option value="0">0% hari ini</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-islamic-green/10 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className="bg-gray-100 dark:bg-gray-800 text-left text-gray-700 dark:text-gray-200">
                  <SortTh k="nisn" className="whitespace-nowrap sticky left-0 z-20 border-r border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
                    NISN
                  </SortTh>
                  <SortTh
                    k="nama"
                    className="whitespace-nowrap sticky left-[4.5rem] z-20 border-r border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 min-w-[8rem]"
                  >
                    Nama
                  </SortTh>
                  <SortTh k="kelas" className="whitespace-nowrap font-semibold px-3 py-3">
                    Kelas
                  </SortTh>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">JK</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">Peran</th>
                  {JURNAL_SHEET_KEYS.map((k) => (
                    <th key={k} className="px-2 py-3 font-semibold text-center whitespace-nowrap">
                      {JURNAL_SHEET_KEY_LABELS[k]}
                    </th>
                  ))}
                  <SortTh k="totalEntries" className="text-center whitespace-nowrap">
                    Σ Entri
                  </SortTh>
                  <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">Hari ini</th>
                  <SortTh k="todayPercent" className="text-center whitespace-nowrap">
                    %
                  </SortTh>
                  <SortTh k="lastActivity" className="whitespace-nowrap">
                    Terakhir
                  </SortTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                      Memuat dari Apps Script…
                    </td>
                  </tr>
                ) : null}
                {!loading && filteredSorted.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                      Tidak ada baris (kosong atau tidak cocok filter).
                    </td>
                  </tr>
                ) : null}
                {!loading &&
                  filteredSorted.map((s) => (
                    <tr
                      key={s.nisn}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailStudent(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailStudent(s);
                        }
                      }}
                      className="border-t border-gray-100 dark:border-gray-800 hover:bg-green-50/50 dark:hover:bg-green-950/30 cursor-pointer transition"
                    >
                      <td className="px-3 py-2 font-mono whitespace-nowrap sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                        {s.nisn}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap sticky left-[4.5rem] z-10 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 max-w-[14rem] truncate">
                        {s.nama}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{s.kelas}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {s.jenisKelamin || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {s.isAdmin ? (
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-200 text-[10px] font-semibold">
                            Admin
                          </span>
                        ) : (
                          <span className="text-gray-500">Siswa</span>
                        )}
                      </td>
                      {JURNAL_SHEET_KEYS.map((k) => (
                        <td key={k} className="px-2 py-2 text-center tabular-nums">
                          {s.counts[k] ?? 0}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-semibold tabular-nums">{s.totalEntries}</td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {s.categoriesFilledToday}/{JURNAL_SHEET_KEYS.length}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex min-w-[2.5rem] justify-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            s.todayPercent >= 100
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                              : s.todayPercent === 0
                                ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
                          }`}
                        >
                          {s.todayPercent}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {s.lastActivity || '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogoutClick}
          className="w-full py-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 text-red-600 dark:text-red-300 font-semibold rounded-xl border border-red-200 dark:border-red-900 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Keluar
        </button>
      </main>

      <footer className="max-w-[100rem] mx-auto px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-gray-800">
        <p>SMAS Al-Mishbah Quranic School Banda Aceh</p>
        <p className="text-xs mt-1">Ramadhan 1447 H / 2026 M</p>
      </footer>

      <Chat user={null} isOpen={chatOpen} onClose={() => setChatOpen(false)} isAdmin />

      {detailStudent && GAS_URL && o ? (
        <StudentDetailModal
          student={detailStudent}
          gasUrl={GAS_URL}
          sheetToday={o.today}
          onClose={() => setDetailStudent(null)}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-islamic-green/10 dark:border-gray-700 p-4 flex gap-3">
      <div className="w-11 h-11 rounded-xl bg-islamic-light dark:bg-green-950/50 flex items-center justify-center text-islamic-green dark:text-green-400 shrink-0">
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{hint}</p>
      </div>
    </div>
  );
}
