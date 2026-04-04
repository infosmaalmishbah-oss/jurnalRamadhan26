import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { JournalEntry } from '../types';
import { KATEGORI_CONFIG } from '../config';

interface ProgressCalendarProps {
  jurnalData: Record<string, JournalEntry[]>;
  loading?: boolean;
}

const catKeys = Object.keys(KATEGORI_CONFIG);
const totalCats = catKeys.length;

function buildFilledPerDay(data: Record<string, JournalEntry[]>): Map<string, number> {
  const map = new Map<string, Set<string>>();
  for (const cat of catKeys) {
    for (const e of data[cat] || []) {
      if (!e.tanggal) continue;
      if (!map.has(e.tanggal)) map.set(e.tanggal, new Set());
      map.get(e.tanggal)!.add(cat);
    }
  }
  const out = new Map<string, number>();
  map.forEach((set, d) => out.set(d, set.size));
  return out;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

function startWeekday(y: number, m: number): number {
  return new Date(y, m, 1).getDay();
}

export default function ProgressCalendar({ jurnalData, loading }: ProgressCalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });

  const filledMap = useMemo(() => buildFilledPerDay(jurnalData), [jurnalData]);

  const dim = daysInMonth(cursor.y, cursor.m);
  const start = startWeekday(cursor.y, cursor.m);
  const label = new Date(cursor.y, cursor.m, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dayStyle = (d: number) => {
    const iso = `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`;
    const n = filledMap.get(iso) ?? 0;
    if (n === 0)
      return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600';
    if (n >= totalCats)
      return 'bg-gradient-to-br from-islamic-green to-green-600 text-white border border-green-700 shadow-sm';
    return 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-800';
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-5 border border-islamic-green/10 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 dark:text-white">Kalender progres</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Bulan sebelumnya"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-islamic-green dark:text-green-400"
            onClick={() =>
              setCursor((c) => {
                const nm = c.m - 1;
                if (nm < 0) return { y: c.y - 1, m: 11 };
                return { y: c.y, m: nm };
              })
            }
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 min-w-[10rem] text-center capitalize">
            {label}
          </span>
          <button
            type="button"
            aria-label="Bulan berikutnya"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-islamic-green dark:text-green-400"
            onClick={() =>
              setCursor((c) => {
                const nm = c.m + 1;
                if (nm > 11) return { y: c.y + 1, m: 0 };
                return { y: c.y, m: nm };
              })
            }
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Memuat data jurnal…</p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) =>
              d === null ? (
                <div key={`e-${i}`} className="aspect-square" />
              ) : (
                <div
                  key={d}
                  title={`${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}: ${filledMap.get(`${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`) ?? 0}/${totalCats} kategori`}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm font-semibold ${dayStyle(d)}`}
                >
                  {d}
                </div>
              ),
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-gradient-to-br from-islamic-green to-green-600 border border-green-700" />
              Lengkap ({totalCats}/{totalCats})
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-amber-100 border border-amber-300" />
              Sebagian
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-gray-100 border border-gray-200" />
              Belum ada entri
            </span>
          </div>
        </>
      )}
    </div>
  );
}
