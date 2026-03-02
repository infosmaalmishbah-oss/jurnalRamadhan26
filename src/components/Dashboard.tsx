import React, { useState, useEffect } from 'react';
import { User, JournalEntry } from '../types';
import { KATEGORI_CONFIG, DEMO_MODE, GAS_URL } from '../config';
import { LogOut, GraduationCap, BadgeCheck, ChartLine, Info, FileDown, MessagesSquare } from 'lucide-react';
import JournalModal from './JournalModal';
import Chat from './Chat';
import { generatePDF } from '../utils/pdf';
import Swal from 'sweetalert2';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isAdminMode] = useState(() => sessionStorage.getItem('isAdmin') === 'true');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [jurnalData, setJurnalData] = useState<Record<string, JournalEntry[]>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadJurnalData();
  }, [user.nisn]);

  // check for unread replies on login (non-admin)
  useEffect(() => {
    if (isAdminMode) return;
    const checkUnread = async () => {
      try {
        const seenKey = `seen_chat_reply_${user.nisn}`;
        const seen: string[] = JSON.parse(sessionStorage.getItem(seenKey) || '[]');

        if (DEMO_MODE) {
          const local = JSON.parse(localStorage.getItem('demo_chat') || '[]');
          const unseen = local.filter((m: any) => m.reply && !seen.includes(m.id));
          if (unseen.length > 0) {
            setHasUnread(true);
            const messagesText = unseen.map((u: any) => `${u.nama || u.nisn}: ${u.reply}`).join('\n\n');
            Swal.fire({ icon: 'info', title: 'Anda mendapat balasan', html: `<pre style="text-align:left">${messagesText}</pre>` , confirmButtonColor: '#1B5E20' });
            const merged = Array.from(new Set([...seen, ...unseen.map((u: any) => u.id)]));
            sessionStorage.setItem(seenKey, JSON.stringify(merged));
          }
        } else {
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
        }
      } catch (err) {
        console.error('Check unread error', err);
      }
    };
    checkUnread();
  }, [user.nisn, isAdminMode]);

  const loadJurnalData = async () => {
    setLoading(true);
    if (DEMO_MODE) {
      const demoData = JSON.parse(localStorage.getItem(`jurnal_${user.nisn}`) || '{}');
      setJurnalData(demoData);
      setLoading(false);
    } else {
      try {
        const response = await fetch(`${GAS_URL}?action=getData&nisn=${user.nisn}`);
        const result = await response.json();
        if (result.success) {
          const keyMap: Record<string, string> = { alquran: 'quran', jujur: 'kejujuran' };
          const normalized: Record<string, JournalEntry[]> = {};
          const raw = result.data || {};
          
          Object.entries(raw).forEach(([k, arr]) => {
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
          
          Object.keys(KATEGORI_CONFIG).forEach(k => {
            if (!normalized[k]) normalized[k] = [];
          });
          setJurnalData(normalized);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
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

    if (DEMO_MODE) {
      localStorage.setItem(`jurnal_${user.nisn}`, JSON.stringify(newData));
    }
  };

  // Calculate progress
  const todayDate = new Date();
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  
  let filledCategories = 0;
  const totalCategories = Object.keys(KATEGORI_CONFIG).length;
  
  Object.keys(KATEGORI_CONFIG).forEach(category => {
    if (jurnalData[category]) {
      const todayEntry = jurnalData[category].find(entry => entry.tanggal === today);
      if (todayEntry) filledCategories++;
    }
  });
  
  const progressPercent = Math.round((filledCategories / totalCategories) * 100) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-light via-white to-green-50">
      {/* Header Sticky */}
      <header className="sticky top-0 z-40 glass-dark border-b border-islamic-green/20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center overflow-hidden">
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
              <h1 className="text-sm font-semibold text-islamic-green leading-tight">SMAS Al-Mishbah</h1>
              <p className="text-xs text-gray-500">Quranic School Banda Aceh</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-islamic-green">
              {currentTime.toLocaleDateString('id-ID', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
              })}
            </div>
            <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-green"></span> 
              <span>Online</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profil Siswa */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-islamic-green/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-islamic-green to-green-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {user.nama.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg text-gray-800">{user.nama}</h2>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <GraduationCap size={14} /> {user.kelas}
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <BadgeCheck size={14} /> NISN: {user.nisn}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Aktif
              </span>
            </div>
          </div>
        </div>

        {/* Progress Jurnal */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-islamic-green/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <ChartLine size={18} className="text-islamic-green" /> 
              Progress Jurnal Hari Ini
            </h3>
            <span className="text-sm font-bold text-islamic-green">
              {loading ? '...' : `${progressPercent}%`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-islamic-green to-islamic-gold rounded-full transition-all duration-500 ${loading ? 'animate-pulse opacity-50' : ''}`}
              style={{ width: loading ? '100%' : `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Info size={14} /> 
            {loading 
              ? 'Memuat data progres...' 
              : progressPercent === 100 
                ? 'Alhamdulillah, jurnal hari ini sudah lengkap!' 
                : `${filledCategories}/${totalCategories} kategori terisi. Lengkapi semua kategori!`}
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.values(KATEGORI_CONFIG).map((config) => {
            const Icon = config.icon;
            return (
              <button 
                key={config.id}
                onClick={() => setActiveCategory(config.id)}
                className="bg-white rounded-2xl p-5 shadow-lg border border-islamic-green/10 text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300 active:scale-95"
              >
                <div className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white mb-3 shadow-lg`}>
                  <Icon size={24} />
                </div>
                <h4 className="font-semibold text-gray-800 text-sm">{config.title.replace('Jurnal ', '')}</h4>
                <p className="text-xs text-gray-500 mt-1">{config.subtitle}</p>
              </button>
            );
          })}
          
          <button 
            onClick={handlePrintPdf}
            className="bg-white rounded-2xl p-5 shadow-lg border border-islamic-green/10 text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300 active:scale-95"
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white mb-3 shadow-lg">
              <FileDown size={24} />
            </div>
            <h4 className="font-semibold text-gray-800 text-sm">Cetak PDF</h4>
            <p className="text-xs text-gray-500 mt-1">Unduh Laporan</p>
          </button>
        </div>

        <button 
          onClick={handleLogoutClick}
          className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl border border-red-200 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm border-t border-gray-200">
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
        />
      )}

      {/* Floating Chat Button */}
      <button onClick={() => { setChatOpen(true); setHasUnread(false); }} className="fixed right-6 bottom-6 z-50 bg-islamic-green text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center">
        <MessagesSquare size={22} />
        {hasUnread && <span className="absolute right-4 top-2 w-3 h-3 bg-red-600 rounded-full ring-2 ring-white" />}
      </button>

      <Chat user={user} isOpen={chatOpen} onClose={() => setChatOpen(false)} isAdmin={isAdminMode} />
    </div>
  );
}
