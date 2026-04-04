import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { AdminStudentProgressRow, JournalEntry } from '../types';
import { JURNAL_SHEET_KEYS, JURNAL_SHEET_KEY_LABELS, KATEGORI_CONFIG } from '../config';
import {
  normalizeGetDataToClient,
  buildStudentDetailAnalysis,
} from '../utils/studentDetailAnalysis';

const GAS_TO_CLIENT: Record<string, string> = {
  alquran: 'quran',
  jujur: 'kejujuran',
};

interface Props {
  student: AdminStudentProgressRow;
  gasUrl: string;
  sheetToday: string;
  onClose: () => void;
}

function entryPreview(e: JournalEntry): string {
  const parts: string[] = [];
  if (e.puasaKe) parts.push(`Puasa ke-${e.puasaKe}`);
  if (e.ringkasan) parts.push(String(e.ringkasan));
  else {
    const skip = new Set(['uniqueId', 'tanggal', 'puasaKe', 'nisn', 'nama', 'kelas', 'kategori', 'timestamp', 'ringkasan', 'id', 'hari']);
    for (const [k, v] of Object.entries(e)) {
      if (skip.has(k) || v == null || v === '') continue;
      parts.push(`${k}: ${v}`);
      if (parts.length >= 4) break;
    }
  }
  return parts.join(' · ') || '(tanpa ringkasan)';
}

export default function StudentDetailModal({
  student,
  gasUrl,
  sheetToday,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'ringkasan' | 'analisis' | 'entri'>('ringkasan');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [jurnal, setJurnal] = useState<Record<string, JournalEntry[]>>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `${gasUrl}?action=getData&nisn=${encodeURIComponent(student.nisn)}`,
        );
        const j = await res.json();
        if (!j.success) throw new Error(j.message || 'Gagal memuat data');
        const norm = normalizeGetDataToClient(j.data || {});
        if (!cancel) setJurnal(norm);
      } catch (e) {
        if (!cancel) setErr(e instanceof Error ? e.message : 'Terjadi kesalahan');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [gasUrl, student.nisn]);

  const analysis = useMemo(
    () => buildStudentDetailAnalysis(jurnal, student),
    [jurnal, student],
  );

  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const tabBtn = (id: typeof tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
        tab === id
          ? 'bg-islamic-green text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Tutup"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 flex flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-gradient-to-r from-islamic-green/10 to-transparent dark:from-islamic-green/20">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {student.nama}
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              NISN {student.nisn} · {student.kelas}
              {student.jenisKelamin ? ` · ${student.jenisKelamin}` : ''}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1">
              Tanggal sheet (hari ini): {sheetToday}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800">
          {tabBtn('ringkasan', 'Ringkasan')}
          {tabBtn('analisis', 'Analisis penuh')}
          {tabBtn('entri', 'Entri per kategori')}
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-800 dark:text-gray-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-500">
              <Loader2 className="animate-spin" size={28} />
              Memuat jurnal dari server…
            </div>
          ) : err ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {err}
            </div>
          ) : tab === 'ringkasan' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total entri</p>
                  <p className="text-xl font-bold text-islamic-green">{student.totalEntries}</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Hari ini</p>
                  <p className="text-xl font-bold">{student.todayPercent}%</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Hari unik</p>
                  <p className="text-xl font-bold">{analysis.distinctDays}</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Terakhir</p>
                  <p className="text-sm font-semibold">{student.lastActivity || '—'}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Entri per kategori (sheet)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {JURNAL_SHEET_KEYS.map((gk) => (
                    <div
                      key={gk}
                      className="flex justify-between rounded-lg bg-gray-50 dark:bg-gray-800/80 px-3 py-2 text-xs"
                    >
                      <span>{JURNAL_SHEET_KEY_LABELS[gk]}</span>
                      <span className="font-bold tabular-nums">{student.counts[gk] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : tab === 'analisis' ? (
            <div className="space-y-4">
              <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                {analysis.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              {analysis.dateRange.min ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Catatan: analisis memakai tanggal unik dari seluruh entri yang berhasil dimuat dari
                  server; jumlah bisa sedikit berbeda jika ada duplikat baris di sheet.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              {JURNAL_SHEET_KEYS.map((gk) => {
                const ck = GAS_TO_CLIENT[gk] || gk;
                const arr = [...(jurnal[ck] || [])].sort((a, b) =>
                  String(b.tanggal).localeCompare(String(a.tanggal)),
                );
                const open = openCats[gk] ?? false;
                const title = KATEGORI_CONFIG[ck]?.title || JURNAL_SHEET_KEY_LABELS[gk];
                return (
                  <div
                    key={gk}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenCats((o) => ({ ...o, [gk]: !open }))}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/80 text-left font-medium text-gray-900 dark:text-white"
                    >
                      <span>
                        {title}{' '}
                        <span className="text-gray-500 font-normal">({arr.length})</span>
                      </span>
                      {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {open ? (
                      <div className="px-3 py-2 space-y-2 max-h-56 overflow-y-auto border-t border-gray-100 dark:border-gray-700">
                        {arr.length === 0 ? (
                          <p className="text-xs text-gray-500">Belum ada entri.</p>
                        ) : (
                          arr.map((e, idx) => (
                            <div
                              key={e.uniqueId || e.id || idx}
                              className="text-xs rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 p-2"
                            >
                              <div className="font-semibold text-islamic-green dark:text-green-400">
                                {e.tanggal} · Puasa ke-{e.puasaKe || '?'}
                              </div>
                              <div className="text-gray-600 dark:text-gray-400 mt-1">
                                {entryPreview(e)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
