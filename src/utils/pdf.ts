import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Swal from 'sweetalert2';
import { User, JournalEntry } from '../types';
import { KATEGORI_CONFIG } from '../config';

export const generatePDF = (user: User, jurnalData: Record<string, JournalEntry[]>) => {
  Swal.fire({
    title: 'Membuat PDF...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;
    
    // Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('PEMERINTAH KOTA BANDA ACEH', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text('DINAS PENDIDIKAN', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SMAS AL-MISHBAH QURANIC SCHOOL', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Prof. A. Majid Ibrahim, Kec. Meuraxa, Kota Banda Aceh', pageWidth / 2, yPos, { align: 'center' });
    yPos += 3;
    
    // Line
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineWidth(0.2);
    doc.line(margin, yPos + 1, pageWidth - margin, yPos + 1);
    yPos += 8;
    
    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN JURNAL RAMADHAN 1446 H', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    // Student Data
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nama Siswa  : ${user.nama}`, margin, yPos);
    yPos += 5;
    doc.text(`NISN        : ${user.nisn}`, margin, yPos);
    yPos += 5;
    doc.text(`Kelas       : ${user.kelas}`, margin, yPos);
    yPos += 5;
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, margin, yPos);
    yPos += 10;
    
    // Tables per category
    Object.keys(KATEGORI_CONFIG).forEach(category => {
      const categoryData = jurnalData[category] || [];
      if (categoryData.length === 0) return;
      
      const config = KATEGORI_CONFIG[category];
      
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(config.title.toUpperCase(), margin, yPos);
      yPos += 5;
      
      const tableData = categoryData
        .sort((a, b) => a.puasaKe - b.puasaKe)
        .map(entry => {
          const tanggalFormatted = new Date(entry.tanggal).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
          
          let catatan = '-';
          if (category === 'sahur') catatan = `${entry.jam || entry.waktuSahur || '-'} | ${entry.menu || entry.menuSahur || '-'} | Doa: ${entry.doaSahur || '-'}\n${entry.catatanSahur || ''}`;
          else if (category === 'shalat') catatan = `Subuh: ${entry.subuh||'-'}, Dzuhur: ${entry.dzuhur||'-'}, Ashar: ${entry.ashar||'-'}, Maghrib: ${entry.maghrib||'-'}, Isya: ${entry.isya||'-'}\nTarawih: ${entry.tarawih||'-'}, Tahajud: ${entry.tahajud||'-'}, Dhuha: ${entry.dhuha||'-'}`;
          else if (category === 'belajar') catatan = `${entry.materi || entry.materiBelajar || '-'} (${entry.durasiBelajar || 0} mnt)\n${entry.intisariBelajar || ''}`;
          else if (category === 'silaturahmi') catatan = `${entry.kegiatan || entry.kegiatanSilaturahmi || '-'} dgn ${entry.denganSiapa || '-'}\n${entry.keterangan || entry.ceritaSilaturahmi || ''}`;
          else if (category === 'berbuka') catatan = `${entry.jam || entry.waktuBerbuka || '-'} | ${entry.menu || entry.menuBerbuka || '-'} | Doa: ${entry.doaBerbuka || '-'}\n${entry.catatanBerbuka || ''}`;
          else if (category === 'quran') catatan = `Surat ${entry.suratAyat || entry.suratDibaca || '-'}\n${entry.intisari || entry.intisariQuran || ''}`;
          else if (category === 'kejujuran') catatan = `Puasa: ${entry.tingkatKejujuran || entry.puasaPenuh || '-'}\n${entry.refleksiDiri || ''}`;
          
          return [
            `Hari ${entry.puasaKe}`,
            tanggalFormatted,
            catatan.trim()
          ];
        });
      
      (doc as any).autoTable({
        startY: yPos,
        head: [['Puasa Ke-', 'Tanggal', 'Catatan']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [27, 94, 32],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 'auto' }
        },
        margin: { left: margin, right: margin }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    });
    
    // Footer
    const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Halaman ${i} dari ${totalPages} - Dicetak dari Sistem Jurnal Ramadhan SMAS Al-Mishbah`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    const filename = `Jurnal_Ramadhan_${user.nama.replace(/\s+/g, '_')}_${user.nisn}.pdf`;
    doc.save(filename);
    
    Swal.fire({
      icon: 'success',
      title: 'PDF Berhasil Dibuat!',
      text: 'Laporan akan otomatis terunduh',
      confirmButtonColor: '#1B5E20'
    });
    
  } catch (error) {
    console.error('PDF error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Membuat PDF',
      text: 'Terjadi kesalahan saat membuat laporan',
      confirmButtonColor: '#1B5E20'
    });
  }
};
