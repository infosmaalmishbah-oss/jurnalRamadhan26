import React, { useState } from 'react';
import { IdCard, LogIn, Lock, Moon, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import { GAS_URL, resolveIsAdmin } from '../config';
import type { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [nisn, setNisn] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNisn = nisn.trim();

    if (!trimmedNisn) {
      Swal.fire({
        icon: 'warning',
        title: 'NISN Kosong',
        text: 'Silakan masukkan NISN Anda',
        confirmButtonColor: '#1B5E20',
      });
      return;
    }

    if (trimmedNisn.length < 10) {
      Swal.fire({
        icon: 'warning',
        title: 'NISN Tidak Valid',
        text: 'NISN harus 10 digit angka',
        confirmButtonColor: '#1B5E20',
      });
      return;
    }

    setLoading(true);
    Swal.fire({
      title: 'Memverifikasi…',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      if (!GAS_URL) {
        throw new Error('VITE_GAS_URL belum diatur');
      }
      const response = await fetch(
        `${GAS_URL}?action=login&nisn=${encodeURIComponent(trimmedNisn)}`,
      );
      const result = await response.json();

      if (result.success) {
        const raw = result.data || {};
        const user: User = {
          nisn: String(raw.nisn || trimmedNisn),
          nama: String(raw.nama || ''),
          kelas: String(raw.kelas || ''),
          jenisKelamin: raw.jenisKelamin != null ? String(raw.jenisKelamin) : undefined,
          role: raw.role != null ? String(raw.role) : undefined,
        };
        const isAdmin = resolveIsAdmin(user.nisn, {
          isAdmin: raw.isAdmin === true || raw.isAdmin === 'true',
          role: user.role,
        });

        Swal.fire({
          icon: 'success',
          title: 'Ahlan wa Sahlan!',
          html: isAdmin
            ? `<p>Selamat datang, <strong>${user.nama}</strong></p><p class="text-sm text-gray-600 mt-2">Panel pengurus — data dari Sheet Siswa</p>`
            : `<p>Selamat datang, <strong>${user.nama}</strong></p>`,
          confirmButtonColor: '#1B5E20',
          timer: 2000,
          timerProgressBar: true,
        }).then(() => {
          onLogin({ ...user, isAdmin: isAdmin ? true : undefined });
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'NISN Tidak Ditemukan',
          text: result.message || 'Silakan hubungi admin sekolah',
          confirmButtonColor: '#1B5E20',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: 'Tidak dapat terhubung ke server. Coba lagi nanti.',
        confirmButtonColor: '#1B5E20',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-animated islamic-pattern flex flex-col items-center justify-center p-4 pb-16 pr-16 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="glass dark:bg-gray-900/70 dark:ring-gray-600 rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl ring-1 ring-white/40">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden animate-float ring-4 ring-islamic-green/10">
            <img
              src="https://lh3.googleusercontent.com/d/1dpytEcHNFlaeRB3HYDY5e0mx3Srt1wlO"
              alt="Logo SMAS Al-Mishbah"
              className="w-20 h-20 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML =
                  '<div class="text-4xl text-islamic-green">🕌</div>';
              }}
            />
          </div>
          <h1 className="text-2xl md:text-3xl text-black dark:text-white mb-2 drop-shadow-sm font-serif leading-snug">
            السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ
          </h1>
          <p className="text-black/85 dark:text-gray-200 text-sm md:text-base leading-relaxed">
            Jurnal Ramadhan
            <br />
            <span className="font-semibold text-islamic-green">
              SMAS Al-Mishbah Quranic School
            </span>
            <br />
            <span className="text-black/70 dark:text-gray-400">Banda Aceh</span>
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-islamic-green">
              <IdCard size={20} />
            </span>
            <input
              type="text"
              value={nisn}
              onChange={(e) => setNisn(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="NISN (10 digit)"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={10}
              autoComplete="username"
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/95 dark:bg-gray-800 border-2 border-white/80 dark:border-gray-600 focus:border-islamic-gold focus:bg-white dark:focus:bg-gray-800 outline-none transition-all duration-300 text-gray-800 dark:text-white placeholder-gray-400 shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-islamic-green hover:bg-green-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.99]"
          >
            <LogIn size={20} />
            <span>Masuk</span>
          </button>
        </form>

        <div className="mt-6 rounded-2xl bg-white/35 dark:bg-gray-800/60 border border-white/50 dark:border-gray-600 px-4 py-3 flex gap-3 text-left">
          <ShieldCheck
            className="text-islamic-green shrink-0 mt-0.5"
            size={22}
            strokeWidth={2}
          />
          <div className="text-xs text-black/80 dark:text-gray-300 leading-relaxed">
            <p className="font-semibold text-islamic-green dark:text-green-400 mb-1">Satu pintu masuk</p>
            <p>
              Siswa dan pengurus memakai NISN yang sama seperti di{' '}
              <strong>Sheet Siswa</strong>. Verifikasi selalu melalui Google Apps Script /
              database sekolah — tidak ada pintu tersembunyi lain.
            </p>
          </div>
        </div>

        <p className="text-center text-black/65 text-xs mt-5 flex items-center justify-center gap-1.5">
          <Lock size={12} className="shrink-0" />
          Data jurnal &amp; chat tetap lewat server yang sudah terpasang
        </p>
      </div>

      <div className="mt-10 text-center text-white/90 text-sm flex items-center justify-center gap-2 drop-shadow-md">
        <Moon size={16} /> Ramadhan Kareem 1447 H
      </div>
    </div>
  );
}
