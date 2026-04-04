import React, { useState, useEffect } from 'react';
import { User, JournalEntry, type PaperManualClientInfo } from '../types';
import { KATEGORI_CONFIG, GAS_URL, STUDENT_DASHBOARD_WARNING } from '../config';
import { LogOut, GraduationCap, BadgeCheck, ChartLine, Info, FileDown, MessagesSquare, AlertTriangle, Lock } from 'lucide-react';
import JournalModal from './JournalModal';
import Chat from './Chat';
import ProgressCalendar from './ProgressCalendar';
import { generatePDF } from '../utils/pdf';
import { fetchAppSettings } from '../utils/appSettings';
import Swal from 'sweetalert2';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [jurnalData, setJurnalData] = useState<Record<string, JournalEntry[]>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [jurnalInputEnabled, setJurnalInputEnabled] = useState(true);
  const [paperManual, setPaperManual] = useState<PaperManualClientInfo | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadSettings = async () => {
    if (!GAS_URL) return;
    try {
      const s = await fetchAppSettings(GAS_URL);
      setJurnalInputEnabled(s.jurnalInputEnabled);
    } catch {
      setJurnalInputEnabled(true);
    }
  };

  useEffect(() => {
    void loadSettings();
    const iv = setInterval(() => void loadSettings(), 120_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    loadJurnalData();
  }, [user.nisn]);

  useEffect(() => {
    const checkUnread = async () => {
      try {
        const seenKey = `seen_chat_reply_${user.nisn}`;
        const seen: string[] = JSON.parse(sessionStorage.getItem(seenKey) || '[]');

        if (!GAS_URL) return;
        const res = await fetch(`${GAS_URL}?action=getMessages&nisn=${user.nisn}`);
        const result = await res.json();
        if (result.success) {
          const unseen = (result.data || []).filter((m: any) => m.reply && !seen.includes(m.id));
          if (unseen.length > 0) {
            setHasUnread(true);
            const messagesText = unseen.map((u: any) => `${u.nama || u.nisn}: ${u.reply}`).join('\n\n');
            Swal.fire({ icon: 'info', title: 'Anda mendapat balasan', html: `<pre style="text-align:left">${messagesText}</pre>` , confirmButtonColor: '#1B5E20' });
            const merged = Array.from(new Set([...seen, ...unseen.map((u: any) => u.id)]));
            sessionStorage.setItem(seenKey, JSON.stringify(merged));
          }
        }
      } catch (err) {
        console.error('Check unread error', err);
      }
    };
    checkUnread();
  }, [user.nisn]);

  const loadJurnalData = async () => {
    setLoading(true);
    try {
      if (!GAS_URL) throw new Error('VITE_GAS_URL belum diatur');
      const response = await fetch(`${GAS_URL}?action=getData&nisn=${user.nisn}`);
      const result = await response.json();
      if (result.success) {
        const keyMap: Record<string, string> = { alquran: 'quran', jujur: 'kejujuran' };
        const normalized: Record<string, JournalEntry[]> = {};
        const raw = result.data || {};

        const pm = raw._paperManual as PaperManualClientInfo | undefined;
        if (pm && typeof pm === 'object') {
          setPaperManual({
            enabled: !!pm.enabled,
            periodStart: pm.periodStart,
            periodEnd: pm.periodEnd,
            note: pm.note,
          });
        } else {
          setPaperManual(null);
        }

        Object.entries(raw).forEach(([k, arr]) => {
          if (k.startsWith('_')) return;
          const clientKey = keyMap[k] || k;
          if (!Array.isArray(arr)) {
            normalized[clientKey] = [];
            return;
          }
          normalized[clientKey] = arr.map((entry: any) => {
            const e = { ...entry };

            if (e.tanggal) {
              const d = new Date(e.tanggal);
              if (!isNaN(d.getTime())) e.tanggal = d.toISOString().split('T')[0];
            }
            if (e.puasaKe === undefined && e.puasa_ke !== undefined) e.puasaKe = parseInt(e.puasa_ke, 10);
            if (e.puasaKe !== undefined) e.puasaKe = parseInt(e.puasaKe, 10) || 0;

            e.uniqueId = e.uniqueId || e.id || `${e.nisn || ''}-${e.tanggal || ''}-${e.puasaKe || ''}`;
            return e;
          });
        });

        Object.keys(KATEGORI_CONFIG).forEach((k) => {
          if (!normalized[k]) normalized[k] = [];
        });
        setJurnalData(normalized);
      }
      void loadSettings();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    Swal.fire({
      title: 'Keluar?',
      text: 'Apakah Anda yakin ingin keluar?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1B5E20',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        onLogout();
        Swal.fire({
          icon: 'success',
          title: 'Sampai Jumpa!',
          text: 'Wassalamualaikum wr. wb.',
          confirmButtonColor: '#1B5E20',
          timer: 2000,
          timerProgressBar: true
        });
      }
    });
  };

  const handlePrintPdf = () => {
    if (Object.keys(jurnalData).length === 0 || Object.values(jurnalData).every((arr: any) => arr.length === 0)) {
      Swal.fire({
        icon: 'info',
        title: 'Belum Ada Data',
        text: 'Silakan isi jurnal terlebih dahulu sebelum mencetak laporan',
        confirmButtonColor: '#1B5E20'
      });
      return;
    }
    generatePDF(user, jurnalData);
  };

  const handleSaveEntry = async (category: string, entry: JournalEntry) => {
    const newData = { ...jurnalData };
    if (!newData[category]) newData[category] = [];
    newData[category].push(entry);
    setJurnalData(newData);

  };

  // Calculate progress
  const todayDate = new Date();
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  
  let filledCategories = 0;
  const totalCategories = Object.keys(KATEGORI_CONFIG).length;

  Object.keys(KATEGORI_CONFIG).forEach((category) => {
    if (jurnalData[category]) {
      const todayEntry = jurnalData[category].find((entry) => entry.tanggal === today);
      if (todayEntry) filledCategories++;
    }
  });

  if (paperManual?.enabled) {
    filledCategories = totalCategories;
  }

  const progressPercent = Math.round((filledCategories / totalCategories) * 100) || 0;

  const inputLocked = !jurnalInputEnabled;
  const paperLocked = !!paperManual?.enabled;

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-light via-white to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pr-14">
      {/* Header Sticky */}
      <header className="sticky top-0 z-40 glass-dark border-b border-islamic-green/20 dark:border-gray-700 dark:bg-gray-900/85">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow flex items-center justify-center overflow-hidden">
              <img 
                src="https://lh3.googleusercontent.com/d/1dpytEcHNFlaeRB3HYDY5e0mx3Srt1wlO" 
                alt="Logo" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="text-islamic-green">🕌</div>';
                }}
              />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-islamic-green dark:text-green-400 leading-tight">SMAS Al-Mishbah</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Quranic School Banda Aceh</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-islamic-green dark:text-green-400">
              {currentTime.toLocaleDateString('id-ID', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
              })}
            </div>
            <div className="flex items-center justify-end gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-green"></span> 
              <span>Online</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div
          role="alert"
          className="rounded-2xl border border-amber-300/80 bg-amber-50/95 dark:border-amber-800 dark:bg-amber-950/40 p-4 flex gap-3 shadow-sm"
        >
          <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={22} />
          <p className="text-sm text-amber-950 dark:text-amber-100 leading-relaxed">{STUDENT_DASHBOARD_WARNING}</p>
        </div>

        {inputLocked ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 flex gap-3 shadow-sm"
          >
            <Lock className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={22} />
            <p className="text-sm text-red-900 dark:text-red-100 leading-relaxed">
              <strong>Pengisian jurnal ditutup</strong> oleh admin sekolah. Anda masih dapat melihat data dan
              mengunduh PDF; penyimpanan entri baru dinonaktifkan hingga admin membuka kembali.
            </p>
          </div>
        ) : null}

        {paperLocked ? (
          <div
            role="alert"
            className="rounded-2xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 p-4 flex gap-3 shadow-sm"
          >
            <Info className="text-sky-700 dark:text-sky-300 shrink-0 mt-0.5" size={22} />
            <p className="text-sm text-sky-950 dark:text-sky-100 leading-relaxed">
              <strong>Jurnal pada media kertas.</strong> Sekolah mencatat bahwa dokumentasi asli Anda berupa
              laporan tertulis/fisik. Entri di aplikasi ini hanya untuk rekonsiliasi administrasi; isi resmi
              mengacu pada arsip di wali kelas.
              {paperManual?.periodStart && paperManual?.periodEnd ? (
                <>
                  {' '}
                  Catatan period (administrasi): {paperManual.periodStart} s.d. {paperManual.periodEnd}.
                </>
              ) : null}
            </p>
          </div>
        ) : null}

        {/* Profil Siswa */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-5 border border-islamic-green/10 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-islamic-green to-green-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {user.nama.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg text-gray-800 dark:text-white">{user.nama}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <GraduationCap size={14} /> {user.kelas}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <BadgeCheck size={14} /> NISN: {user.nisn}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                {inputLocked ? 'Baca saja' : 'Aktif'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Jurnal */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-5 border border-islamic-green/10 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <ChartLine size={18} className="text-islamic-green dark:text-green-400" /> 
              Progress Jurnal Hari Ini
            </h3>
            <span className="text-sm font-bold text-islamic-green dark:text-green-400">
              {loading ? '...' : `${progressPercent}%`}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-islamic-green to-islamic-gold rounded-full transition-all duration-500 ${loading ? 'animate-pulse opacity-50' : ''}`}
              style={{ width: loading ? '100%' : `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
            <Info size={14} /> 
            {loading 
              ? 'Memuat data progres...' 
              : progressPercent === 100 
                ? 'Alhamdulillah, jurnal hari ini sudah lengkap!' 
                : `${filledCategories}/${totalCategories} kategori terisi. Lengkapi semua kategori!`}
          </p>
        </div>

        <ProgressCalendar jurnalData={jurnalData} loading={loading} />

        {/* Menu Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.values(KATEGORI_CONFIG).map((config) => {
            const Icon = config.icon;
            return (
              <button 
                key={config.id}
                type="button"
                onClick={() => setActiveCategory(config.id)}
                className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border border-islamic-green/10 dark:border-gray-700 text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300 active:scale-95"
              >
                <div className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white mb-3 shadow-lg`}>
                  <Icon size={24} />
                </div>
                <h4 className="font-semibold text-gray-800 dark:text-white text-sm">{config.title.replace('Jurnal ', '')}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {inputLocked || paperLocked ? 'Ketuk untuk lihat riwayat' : config.subtitle}
                </p>
              </button>
            );
          })}
          
          <button 
            type="button"
            onClick={handlePrintPdf}
            className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border border-islamic-green/10 dark:border-gray-700 text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300 active:scale-95"
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white mb-3 shadow-lg">
              <FileDown size={24} />
            </div>
            <h4 className="font-semibold text-gray-800 dark:text-white text-sm">Cetak PDF</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unduh Laporan</p>
          </button>
        </div>

        <button 
          type="button"
          onClick={handleLogoutClick}
          className="w-full py-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-300 font-semibold rounded-xl border border-red-200 dark:border-red-900 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-gray-800">
        <p>SMAS Al-Mishbah Quranic School Banda Aceh</p>
        <p className="text-xs mt-1">Ramadhan 1447 H / 2026 M</p>
      </footer>

      {activeCategory && (
        <JournalModal 
          user={user}
          category={activeCategory}
          config={KATEGORI_CONFIG[activeCategory]}
          history={jurnalData[activeCategory] || []}
          onClose={() => setActiveCategory(null)}
          onSave={(entry) => handleSaveEntry(activeCategory, entry)}
          readOnly={inputLocked || paperLocked}
        />
      )}

      {/* Floating Chat Button */}
      <button onClick={() => { setChatOpen(true); setHasUnread(false); }} className="fixed right-6 bottom-6 z-50 bg-islamic-green text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center">
        <MessagesSquare size={22} />
        {hasUnread && <span className="absolute right-4 top-2 w-3 h-3 bg-red-600 rounded-full ring-2 ring-white" />}
      </button>

      <Chat user={user} isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
