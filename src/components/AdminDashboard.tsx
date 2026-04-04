import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { GAS_URL, JURNAL_SHEET_KEYS, JURNAL_SHEET_KEY_LABELS } from '../config';
import type { User } from '../types';
import Chat from './Chat';
import { fetchFullAdminOverview, type AdminOverview } from '../utils/adminStats';
import { exportAdminExcel, exportAdminWord } from '../utils/exportReports';

interface AdminDashboardProps {
  adminUser: User | null;
  onLogout: () => void;
}

export default function AdminDashboard({ adminUser, onLogout }: AdminDashboardProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (!GAS_URL) throw new Error('VITE_GAS_URL belum diatur');
      const data = await fetchFullAdminOverview(GAS_URL);
      setOverview(data);
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : 'Gagal memuat ringkasan');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const list = overview?.students || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.nisn.toLowerCase().includes(q) ||
        String(s.nama || '')
          .toLowerCase()
          .includes(q) ||
        String(s.kelas || '')
          .toLowerCase()
          .includes(q),
    );
  }, [overview?.students, query]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-light via-white to-green-50">
      <header className="sticky top-0 z-40 glass-dark border-b border-islamic-green/20">
        <div className="max-w-[100rem] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center overflow-hidden shrink-0">
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
              <h1 className="text-sm font-semibold text-islamic-green leading-tight flex items-center gap-2">
                <LayoutDashboard size={16} />
                Panel Admin — Jurnal Ramadhan
              </h1>
              <p className="text-xs text-gray-500">SMAS Al-Mishbah · Google Sheets + Apps Script</p>
              {adminUser ? (
                <p className="text-xs text-gray-600 mt-1 truncate">
                  <span className="font-medium text-islamic-green">{adminUser.nama}</span>
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
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-600/40 bg-white text-emerald-800 text-sm font-medium hover:bg-emerald-50 disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              Excel + analisis
            </button>
            <button
              type="button"
              onClick={() => void doWord()}
              disabled={loading || !o?.students.length}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-600/40 bg-white text-blue-900 text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
            >
              <FileText size={16} />
              Word
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-islamic-green/30 bg-white/80 text-islamic-green text-sm font-medium hover:bg-white disabled:opacity-60"
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
        <div className="max-w-[100rem] mx-auto px-4 pb-3 text-xs text-gray-600">
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
            <span className="ml-2 text-gray-500">
              · Data sheet: hari ini {o.today} · {filtered.length}/{o.students.length} baris
            </span>
          ) : null}
        </div>
      </header>

      <main className="max-w-[100rem] mx-auto px-4 py-6 space-y-6">
        {loadError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
            {loadError}
            <p className="mt-2 text-xs">
              Pastikan skrip Google memuat action <code className="bg-white/80 px-1 rounded">getAllStudentsProgress</code>{' '}
              (salin dari folder <code className="bg-white/80 px-1 rounded">google-apps-script/Code.gs</code>).
            </p>
          </div>
        ) : null}

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

        <div className="bg-white rounded-2xl shadow-lg border border-islamic-green/10 p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Progres seluruh siswa</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tabel lengkap: identitas, jumlah entri per sheet jurnal, kelengkapan hari ini, aktivitas terakhir.
            </p>
          </div>
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari NISN, nama, kelas…"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-islamic-green outline-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-islamic-green/10 overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className="bg-gray-100 text-left text-gray-700">
                  <th className="px-3 py-3 font-semibold whitespace-nowrap sticky left-0 bg-gray-100 z-20 border-r border-gray-200">
                    NISN
                  </th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap sticky left-[4.5rem] bg-gray-100 z-20 border-r border-gray-200 min-w-[8rem]">
                    Nama
                  </th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">Kelas</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">JK</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">Peran</th>
                  {JURNAL_SHEET_KEYS.map((k) => (
                    <th key={k} className="px-2 py-3 font-semibold text-center whitespace-nowrap">
                      {JURNAL_SHEET_KEY_LABELS[k]}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">Σ Entri</th>
                  <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">Hari ini</th>
                  <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">%</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5 + JURNAL_SHEET_KEYS.length + 4}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      Memuat dari Apps Script…
                    </td>
                  </tr>
                ) : null}
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5 + JURNAL_SHEET_KEYS.length + 4}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      Tidak ada baris (kosong atau tidak cocok filter).
                    </td>
                  </tr>
                ) : null}
                {!loading &&
                  filtered.map((s) => (
                    <tr key={s.nisn} className="border-t border-gray-100 hover:bg-green-50/50">
                      <td className="px-3 py-2 font-mono whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-100">
                        {s.nisn}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap sticky left-[4.5rem] bg-white z-10 border-r border-gray-100 max-w-[14rem] truncate">
                        {s.nama}
                      </td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{s.kelas}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{s.jenisKelamin || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {s.isAdmin ? (
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] font-semibold">
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
                              ? 'bg-green-100 text-green-800'
                              : s.todayPercent === 0
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {s.todayPercent}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{s.lastActivity || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogoutClick}
          className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl border border-red-200 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Keluar
        </button>
      </main>

      <footer className="max-w-[100rem] mx-auto px-4 py-6 text-center text-gray-500 text-sm border-t border-gray-200">
        <p>SMAS Al-Mishbah Quranic School Banda Aceh</p>
        <p className="text-xs mt-1">Ramadhan 1447 H / 2026 M</p>
      </footer>

      <Chat user={null} isOpen={chatOpen} onClose={() => setChatOpen(false)} isAdmin />
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
    <div className="bg-white rounded-2xl shadow-lg border border-islamic-green/10 p-4 flex gap-3">
      <div className="w-11 h-11 rounded-xl bg-islamic-light flex items-center justify-center text-islamic-green shrink-0">
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{hint}</p>
      </div>
    </div>
  );
}
