import React, { useState } from 'react';
import { IdCard, LogIn, Lock, Moon } from 'lucide-react';
import Swal from 'sweetalert2';
import { DEMO_MODE, DEMO_STUDENTS, GAS_URL } from '../config';
import { User } from '../types';

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
        confirmButtonColor: '#1B5E20'
      });
      return;
    }

    if (trimmedNisn.length < 10) {
      Swal.fire({
        icon: 'warning',
        title: 'NISN Tidak Valid',
        text: 'NISN harus 10 digit angka',
        confirmButtonColor: '#1B5E20'
      });
      return;
    }

    setLoading(true);
    Swal.fire({
      title: 'Memverifikasi...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (DEMO_STUDENTS[trimmedNisn]) {
          const user = DEMO_STUDENTS[trimmedNisn];
          Swal.fire({
            icon: 'success',
            title: 'Ahlan wa Sahlan!',
            text: `Selamat datang, ${user.nama}`,
            confirmButtonColor: '#1B5E20',
            timer: 2000,
            timerProgressBar: true
          }).then(() => {
            onLogin(user);
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'NISN Tidak Ditemukan',
            text: 'Silakan hubungi admin sekolah',
            confirmButtonColor: '#1B5E20',
            footer: '<small>Demo NISN: 1234567890, 0987654321, 1122334455</small>'
          });
        }
      } else {
        const response = await fetch(`${GAS_URL}?action=login&nisn=${trimmedNisn}`);
        const result = await response.json();
        
        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Ahlan wa Sahlan!',
            text: `Selamat datang, ${result.data.nama}`,
            confirmButtonColor: '#1B5E20',
            timer: 2000,
            timerProgressBar: true
          }).then(() => {
            onLogin(result.data);
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'NISN Tidak Ditemukan',
            text: result.message || 'Silakan hubungi admin sekolah',
            confirmButtonColor: '#1B5E20'
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: 'Tidak dapat terhubung ke server. Coba lagi nanti.',
        confirmButtonColor: '#1B5E20'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-animated islamic-pattern flex flex-col items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden animate-float">
            <img 
              src="https://lh3.googleusercontent.com/d/1dpytEcHNFlaeRB3HYDY5e0mx3Srt1wlO" 
              alt="Logo SMAS Al-Mishbah" 
              className="w-20 h-20 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="text-4xl text-islamic-green">🕌</div>';
              }}
            />
          </div>
          <h1 className="text-3xl md:text-4xl text-black mb-2 drop-shadow-lg font-serif">السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ</h1>
          <p className="text-black/90 text-sm md:text-base leading-relaxed">
            Selamat Datang di Jurnal Ramadhan<br/>
            <span className="font-semibold">SMAS Al-Mishbah Quranic School</span><br/>
            Banda Aceh
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
              placeholder="Masukkan NISN Anda" 
              pattern="[0-9]*" 
              inputMode="numeric" 
              maxLength={10} 
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/90 border-2 border-transparent focus:border-islamic-gold focus:bg-white outline-none transition-all duration-300 text-gray-700 placeholder-gray-400"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-islamic-green hover:bg-green-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <LogIn size={20} />
            <span>Masuk</span>
          </button>
        </form>

        <p className="text-center text-black/70 text-xs mt-6 flex items-center justify-center gap-1">
          <Lock size={12} /> Gunakan NISN yang terdaftar di sistem
        </p>
      </div>
      <div className="mt-8 text-center text-white/60 text-sm flex items-center justify-center gap-2">
        <Moon size={16} /> Ramadhan Kareem 1446 H
      </div>

      {/* Hidden admin access: click the small corner to enter admin password */}
      <div onClick={async () => {
        const { value: password } = await Swal.fire({
          title: 'Admin Login',
          input: 'password',
          inputLabel: 'Masukkan password admin',
          showCancelButton: true,
          confirmButtonText: 'Masuk',
          inputAttributes: { autocapitalize: 'off', autocorrect: 'off' }
        });

        if (password) {
          try {
            const res = await fetch(`${GAS_URL}?action=adminLogin&password=${encodeURIComponent(String(password))}`);
            const result = await res.json();
            if (result.success) {
              sessionStorage.setItem('isAdmin', 'true');
              Swal.fire({ icon: 'success', title: 'Akses Admin', text: 'Mengarahkan ke Dashboard...' });
              window.location.reload();
            } else {
              Swal.fire({ icon: 'error', title: 'Gagal', text: result.message || 'Password salah' });
            }
          } catch (err) {
            console.error('Admin login error', err);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Tidak dapat terhubung ke server' });
          }
        }
      }} className="fixed left-2 bottom-2 w-6 h-6 opacity-5 hover:opacity-30 cursor-pointer"></div>
    </div>
  );
}
