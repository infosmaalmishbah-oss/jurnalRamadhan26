import React, { useState } from 'react';
import { User, CategoryConfig, JournalEntry } from '../types';
import { X, History, PlusCircle, Calendar, Hash, Save, Check } from 'lucide-react';
import Swal from 'sweetalert2';
import { DEMO_MODE, GAS_URL } from '../config';

interface JournalModalProps {
  user: User;
  category: string;
  config: CategoryConfig;
  history: JournalEntry[];
  onClose: () => void;
  onSave: (entry: JournalEntry) => void;
}

export default function JournalModal({ user, category, config, history, onClose, onSave }: JournalModalProps) {
  const [tanggal, setTanggal] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [puasaKe, setPuasaKe] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const Icon = config.icon;

  const handleInputChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tanggal || !puasaKe) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Belum Lengkap',
        text: 'Harap isi tanggal dan hari puasa',
        confirmButtonColor: '#1B5E20'
      });
      return;
    }

    const uniqueId = `${tanggal}-${user.nisn}-${puasaKe}`;
    const isDuplicate = history.some(entry => entry.uniqueId === uniqueId);
    
    if (isDuplicate) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Sudah Ada',
        text: `Jurnal ${config.title} untuk hari ke-${puasaKe} sudah diisi sebelumnya`,
        confirmButtonColor: '#1B5E20'
      });
      return;
    }

    const ringkasanItems: string[] = [];
    config.fields.forEach(field => {
      const val = formData[field.id];
      if (val && field.type !== 'textarea') {
        ringkasanItems.push(`${field.label}: ${val}`);
      }
    });

    const entry: JournalEntry = {
      uniqueId,
      tanggal,
      puasaKe: parseInt(puasaKe),
      nisn: user.nisn,
      nama: user.nama,
      kelas: user.kelas,
      kategori: category,
      timestamp: new Date().toISOString(),
      ringkasan: ringkasanItems.slice(0, 2).join(', ') || 'Tercatat',
      ...formData
    };

    setIsSubmitting(true);
    Swal.fire({
      title: 'Menyimpan...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        onSave(entry);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Disimpan!',
          text: 'Jurnal Anda telah tercatat',
          confirmButtonColor: '#1B5E20',
          timer: 2000,
          timerProgressBar: true
        });
        setFormData({});
      } else {
        const response = await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({ action: 'saveJurnal', data: entry })
        });
        
        const respText = await response.text();
        let result;
        try {
          result = respText ? JSON.parse(respText) : {};
        } catch (err) {
          throw new Error(`Invalid JSON response: ${respText}`);
        }

        if (result.success) {
          onSave(entry);
          Swal.fire({
            icon: 'success',
            title: 'Berhasil Disimpan!',
            text: 'Jurnal Anda telah tercatat',
            confirmButtonColor: '#1B5E20',
            timer: 2000,
            timerProgressBar: true
          });
          setFormData({});
        } else {
          throw new Error(result.message || 'Gagal menyimpan data');
        }
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: error.message || 'Terjadi kesalahan saat menyimpan data',
        confirmButtonColor: '#1B5E20'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedHistory = [...history].sort((a, b) => a.puasaKe - b.puasaKe);

  const renderHistoryDetails = (entry: any, category: string) => {
    switch(category) {
      case 'sahur':
        return (
          <div>
            <div className="font-medium text-gray-800">{entry.jam || entry.waktuSahur || '-'} | {entry.menu || entry.menuSahur || '-'}</div>
            <div className="text-xs text-gray-600 mt-0.5">Doa: <span className={entry.doaSahur === 'Ya' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{entry.doaSahur || '-'}</span></div>
            {entry.catatanSahur && <div className="text-xs text-gray-500 mt-1 italic">"{entry.catatanSahur}"</div>}
          </div>
        );
      case 'shalat':
        return (
          <div className="space-y-1.5">
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Wajib</div>
              <div className="flex flex-wrap gap-1">
                {['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'].map(w => (
                  <span key={w} className={`text-[10px] px-1.5 py-0.5 rounded ${entry[w] === 'Tepat Waktu' ? 'bg-green-100 text-green-700' : entry[w] === 'Terlambat' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Sunnah</div>
              <div className="flex flex-wrap gap-1">
                {['tarawih', 'tahajud', 'dhuha'].map(w => (
                  <span key={w} className={`text-[10px] px-1.5 py-0.5 rounded ${entry[w] && entry[w] !== 'Tidak' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {w.charAt(0).toUpperCase() + w.slice(1)}: {entry[w] || 'Tidak'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      case 'belajar':
        return (
          <div>
            <div className="font-medium text-gray-800">{entry.materi || entry.materiBelajar || '-'} <span className="text-xs font-normal text-gray-500">({entry.durasiBelajar || 0} mnt)</span></div>
            {entry.intisariBelajar && <div className="text-xs text-gray-500 mt-1 italic">"{entry.intisariBelajar}"</div>}
          </div>
        );
      case 'silaturahmi':
        return (
          <div>
            <div className="font-medium text-gray-800">{entry.kegiatan || entry.kegiatanSilaturahmi || '-'} <span className="text-xs font-normal text-gray-500">dgn {entry.denganSiapa || '-'}</span></div>
            {(entry.keterangan || entry.ceritaSilaturahmi) && <div className="text-xs text-gray-500 mt-1 italic">"{entry.keterangan || entry.ceritaSilaturahmi}"</div>}
          </div>
        );
      case 'berbuka':
        return (
          <div>
            <div className="font-medium text-gray-800">{entry.jam || entry.waktuBerbuka || '-'} | {entry.menu || entry.menuBerbuka || '-'}</div>
            <div className="text-xs text-gray-600 mt-0.5">Doa: <span className={entry.doaBerbuka === 'Ya' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{entry.doaBerbuka || '-'}</span></div>
            {entry.catatanBerbuka && <div className="text-xs text-gray-500 mt-1 italic">"{entry.catatanBerbuka}"</div>}
          </div>
        );
      case 'quran':
        return (
          <div>
            <div className="font-medium text-gray-800">Surat {entry.suratAyat || entry.suratDibaca || '-'}</div>
            {(entry.intisari || entry.intisariQuran) && <div className="text-xs text-gray-500 mt-1 italic">"{entry.intisari || entry.intisariQuran}"</div>}
          </div>
        );
      case 'kejujuran':
        return (
          <div>
            <div className="font-medium text-gray-800">Puasa: {entry.tingkatKejujuran || entry.puasaPenuh || '-'}</div>
            {entry.refleksiDiri && <div className="text-xs text-gray-500 mt-1 italic">"{entry.refleksiDiri}"</div>}
          </div>
        );
      default:
        return <div className="text-gray-600">{entry.ringkasan || '-'}</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.gradient} text-white p-5 flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <Icon size={28} />
            <div>
              <h2 className="font-bold text-lg">{config.title}</h2>
              <p className="text-sm text-white/80">{config.subtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Form Section */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <PlusCircle size={18} className="text-islamic-green" /> 
              Tambah Jurnal Hari Ini
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar size={14} /> Tanggal
                  </label>
                  <input 
                    type="date" 
                    required 
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-islamic-green focus:ring-2 focus:ring-islamic-green/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Hash size={14} /> Puasa Ke-
                  </label>
                  <select 
                    required 
                    value={puasaKe}
                    onChange={(e) => setPuasaKe(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-islamic-green focus:ring-2 focus:ring-islamic-green/20 outline-none transition-all"
                  >
                    <option value="">Pilih Hari</option>
                    {Array.from({ length: 30 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Hari ke-{i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.fields.map(field => (
                  <div key={field.id} className={field.type === 'textarea' ? 'col-span-full' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-islamic-green focus:ring-2 focus:ring-islamic-green/20 outline-none transition-all"
                      >
                        <option value="">Pilih...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-islamic-green focus:ring-2 focus:ring-islamic-green/20 outline-none transition-all resize-none"
                      />
                    ) : (
                      <input
                        type={field.type}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-islamic-green focus:ring-2 focus:ring-islamic-green/20 outline-none transition-all"
                      />
                    )}
                  </div>
                ))}
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 bg-islamic-green hover:bg-green-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
              >
                <Save size={20} />
                <span>Simpan Jurnal</span>
              </button>
            </form>
          </div>

          {/* History Section */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <History size={18} className="text-islamic-green" /> 
              Riwayat Jurnal (Hari 1-30)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-islamic-green text-white">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Puasa Ke-</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Tanggal</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Catatan</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        Belum ada data jurnal
                      </td>
                    </tr>
                  ) : (
                    sortedHistory.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-islamic-green">Hari {entry.puasaKe}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {new Date(entry.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs">
                          {renderHistoryDetails(entry, category)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <Check size={12} className="mr-1" /> Terisi
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
