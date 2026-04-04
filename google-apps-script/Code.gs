// ========== KONFIGURASI SPREADSHEET ==========
const SPREADSHEET_ID = '1zQ1O7mBOyYWm7_y0esvykO0T7aVpiNYduEmjdBkH_fY';
const TIMEZONE = 'Asia/Jakarta';

const SHEET_NAMES = {
  siswa: 'siswa',
  sahur: 'sahur',
  shalat: 'shalat',
  belajar: 'belajar',
  silaturahmi: 'silaturahmi',
  berbuka: 'berbuka',
  alquran: 'alquran',
  jujur: 'jujur',
  chat: 'chat'
};

/** Kolom jurnal: urutan kategori untuk agregasi admin */
const JURNAL_CATEGORIES = ['sahur', 'shalat', 'belajar', 'silaturahmi', 'berbuka', 'alquran', 'jujur'];

// ========== HANDLE REQUEST ==========
function doGet(e) {
  const action = (e.parameter.action || '').toString();
  try {
    switch (action) {
      case 'login':
        return handleLogin(e.parameter.nisn);
      case 'getData':
        return handleGetData(e.parameter.nisn);
      case 'getMessages':
        return handleGetMessages(e.parameter.nisn);
      case 'getAllMessages':
        return handleGetAllMessages();
      case 'getAllStudentsProgress':
        return handleGetAllStudentsProgress();
      case 'adminLogin':
        return handleAdminLogin(e.parameter.password);
      default:
        return sendError('Action tidak dikenali');
    }
  } catch (error) {
    return sendError(error.toString());
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const action = payload.action;
    const data = payload.data;
    switch (action) {
      case 'saveJurnal':
        return handleSaveJurnal(data);
      case 'sendMessage':
        return handleSendMessage(data);
      case 'replyMessage':
        return handleReplyMessage(data);
      default:
        return sendError('Action tidak dikenali');
    }
  } catch (error) {
    return sendError(error.toString());
  }
}

// ========== UTIL ==========
function getSS() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}
function getSheet(name) {
  return getSS().getSheetByName(name);
}
function formatDateString(dateInput) {
  if (!dateInput) return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  if (dateInput instanceof Date) return Utilities.formatDate(dateInput, TIMEZONE, 'yyyy-MM-dd');
  if (typeof dateInput === 'string') {
    if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) return dateInput;
    const date = new Date(dateInput);
    if (!isNaN(date)) return Utilities.formatDate(date, TIMEZONE, 'yyyy-MM-dd');
  }
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
}
function formatTime(val) {
  if (!val) return '';
  if (val instanceof Date) return Utilities.formatDate(val, TIMEZONE, 'HH:mm');
  if (typeof val === 'string') {
    const match = val.match(/(\d{2}:\d{2})/);
    if (match) return match[1];
  }
  return val;
}
function getHariFromTanggal(tanggal) {
  const date = new Date(tanggal);
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return hari[date.getDay()];
}

function sendSuccess(data) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: data })).setMimeType(
    ContentService.MimeType.JSON
  );
}
function sendError(message) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, message: message })).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ========== NISN & ADMIN ==========
function normalizeNisn(val) {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/^['\s]+/, '')
    .replace(/\D/g, '')
    .replace(/^0+/, '');
}

/**
 * Admin: kolom E (index 4) sheet siswa = peran (admin / pengurus), ATAU NISN ada di Script Property ADMIN_NISNS (koma).
 * Set ADMIN_NISNS di Project Settings → Script properties, contoh: 0011223344,4433221100
 */
function isUserAdmin(nisnRaw, peranCell) {
  const n = normalizeNisn(nisnRaw);
  const props = PropertiesService.getScriptProperties().getProperty('ADMIN_NISNS') || '0011223344,4433221100';
  const list = props
    .split(/[\s,]+/)
    .map(function (x) {
      return normalizeNisn(x);
    })
    .filter(Boolean);
  if (n && list.indexOf(n) >= 0) return true;
  const p = String(peranCell || '')
    .toLowerCase()
    .trim();
  return p === 'admin' || p === 'pengurus' || p === 'administrator';
}

// ========== AUTH ADMIN (password — opsional, cadangan) ==========
function handleAdminLogin(password) {
  const p = (password || '').toString();
  const props = PropertiesService.getScriptProperties();
  const adminPwd = props.getProperty('ADMIN_PASSWORD') || '';
  if (!adminPwd) return sendError('Admin password not configured on GAS project properties');
  if (p === adminPwd) return sendSuccess({ message: 'OK' });
  return sendError('Password salah');
}

// ========== LOGIN ==========
function handleLogin(nisn) {
  const target = normalizeNisn(nisn || '');
  const sheet = getSheet(SHEET_NAMES.siswa);
  if (!sheet) return sendError('Sheet siswa tidak ditemukan');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowNisn = normalizeNisn(data[i][0]);
    if (rowNisn && rowNisn === target) {
      const admin = isUserAdmin(String(data[i][0]), data[i][4]);
      return sendSuccess({
        nisn: String(data[i][0]),
        nama: data[i][1],
        kelas: data[i][2],
        jenisKelamin: data[i][3],
        role: admin ? 'admin' : 'siswa',
        isAdmin: admin
      });
    }
  }
  return sendError('NISN tidak ditemukan');
}

// ========== AGREGASI PROGRES SEMUA SISWA (ADMIN) ==========
function handleGetAllStudentsProgress() {
  const ss = getSS();
  const today = formatDateString(new Date());
  const generatedAt = new Date().toISOString();
  const sheetSiswa = getSheet(SHEET_NAMES.siswa);
  if (!sheetSiswa) return sendError('Sheet siswa tidak ditemukan');

  const sd = sheetSiswa.getDataRange().getValues();
  /** @type {Object.<string, Object>} */
  var students = {};

  for (var i = 1; i < sd.length; i++) {
    var nRaw = sd[i][0];
    var nKey = normalizeNisn(nRaw);
    if (!nKey) continue;
    students[nKey] = {
      nisn: String(nRaw),
      nama: sd[i][1],
      kelas: sd[i][2],
      jenisKelamin: sd[i][3] != null ? String(sd[i][3]) : '',
      isAdmin: isUserAdmin(String(nRaw), sd[i][4]),
      counts: {},
      lastActivity: null,
      todayCats: {}
    };
    for (var c = 0; c < JURNAL_CATEGORIES.length; c++) {
      students[nKey].counts[JURNAL_CATEGORIES[c]] = 0;
    }
  }

  for (var ci = 0; ci < JURNAL_CATEGORIES.length; ci++) {
    var cat = JURNAL_CATEGORIES[ci];
    var sh = ss.getSheetByName(SHEET_NAMES[cat]);
    if (!sh) continue;
    var rows = sh.getDataRange().getValues();
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      var nk = normalizeNisn(row[2]);
      if (!students[nk]) continue;
      var tgl = formatDateString(row[1]);
      students[nk].counts[cat]++;
      var cur = students[nk].lastActivity;
      if (!cur || tgl > cur) students[nk].lastActivity = tgl;
      if (tgl === today) students[nk].todayCats[cat] = true;
    }
  }

  var totalCat = JURNAL_CATEGORIES.length;
  var list = [];
  var totalEntriesAll = 0;
  var sumTodayPct = 0;

  for (var key in students) {
    if (!Object.prototype.hasOwnProperty.call(students, key)) continue;
    var s = students[key];
    var filledToday = 0;
    for (var t = 0; t < JURNAL_CATEGORIES.length; t++) {
      if (s.todayCats[JURNAL_CATEGORIES[t]]) filledToday++;
    }
    var totalEntries = 0;
    for (var k in s.counts) {
      if (Object.prototype.hasOwnProperty.call(s.counts, k)) totalEntries += s.counts[k];
    }
    var todayPercent = totalCat > 0 ? Math.round((filledToday / totalCat) * 100) : 0;
    totalEntriesAll += totalEntries;
    sumTodayPct += todayPercent;

    list.push({
      nisn: s.nisn,
      nama: s.nama,
      kelas: s.kelas,
      jenisKelamin: s.jenisKelamin,
      isAdmin: s.isAdmin,
      counts: s.counts,
      totalEntries: totalEntries,
      categoriesFilledToday: filledToday,
      todayPercent: todayPercent,
      lastActivity: s.lastActivity
    });
  }

  list.sort(function (a, b) {
    return String(a.nama).localeCompare(String(b.nama), 'id');
  });

  var nStudents = list.length;
  var avgToday = nStudents > 0 ? Math.round(sumTodayPct / nStudents) : 0;

  return sendSuccess({
    generatedAt: generatedAt,
    today: today,
    students: list,
    totals: {
      studentCount: nStudents,
      totalEntries: totalEntriesAll,
      avgTodayCompletion: avgToday
    }
  });
}

// ========== GET DATA JURNAL ==========
function handleGetData(nisn) {
  const target = normalizeNisn(nisn || '');
  const ss = getSS();
  const result = {};
  for (const [category, sheetName] of Object.entries(SHEET_NAMES)) {
    if (category === 'siswa' || category === 'chat') continue;
    try {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        result[category] = [];
        continue;
      }
      const data = sheet.getDataRange().getValues();
      const entries = [];
      for (let i = 1; i < data.length; i++) {
        const rowNisn = normalizeNisn(data[i][2]);
        if (rowNisn && rowNisn === target) {
          entries.push(parseJurnalEntry(data[i], category));
        }
      }
      result[category] = entries;
    } catch (e) {
      result[category] = [];
    }
  }
  try {
    const today = formatDateString(new Date());
    const totalCategories = Object.keys(SHEET_NAMES).length - 2;
    let filled = 0;
    Object.values(result).forEach(function (arr) {
      if (Array.isArray(arr) && arr.some(function (en) { return en.tanggal === today; })) filled++;
    });
    result._progress = {
      date: today,
      filled: filled,
      total: totalCategories,
      percent: Math.round((filled / totalCategories) * 100)
    };
  } catch (e) {
    result._progress = { date: formatDateString(new Date()), filled: 0, total: 7, percent: 0 };
  }
  return sendSuccess(result);
}

// ========== PARSE JURNAL ==========
function parseJurnalEntry(row, category) {
  var entry = {
    id: row[0],
    tanggal: formatDateString(row[1]),
    nisn: row[2],
    puasaKe: parseInt(row[3]) || 0,
    hari: row[4],
    nama: row[5],
    kelas: row[6]
  };
  if (category === 'sahur') {
    entry.waktuSahur = formatTime(row[7]);
    entry.menuSahur = row[8];
    entry.doaSahur = row[9];
    entry.catatanSahur = row[10];
  } else if (category === 'shalat') {
    entry.subuh = row[7];
    entry.dzuhur = row[8];
    entry.ashar = row[9];
    entry.maghrib = row[10];
    entry.isya = row[11];
    entry.tarawih = row[12];
    entry.tahajud = row[13];
    entry.dhuha = row[14];
  } else if (category === 'belajar') {
    entry.materiBelajar = row[7];
    entry.durasiBelajar = row[8];
    entry.metodeBelajar = row[9];
    entry.intisariBelajar = row[10];
  } else if (category === 'silaturahmi') {
    entry.kegiatanSilaturahmi = row[7];
    entry.denganSiapa = row[8];
    entry.ceritaSilaturahmi = row[9];
  } else if (category === 'berbuka') {
    entry.waktuBerbuka = formatTime(row[7]);
    entry.menuBerbuka = row[8];
    entry.tempatBerbuka = row[9];
    entry.doaBerbuka = row[10];
    entry.catatanBerbuka = row[11];
  } else if (category === 'alquran') {
    entry.suratDibaca = row[7];
    entry.ayatMulai = row[8];
    entry.ayatSelesai = row[9];
    entry.juzDibaca = row[10];
    entry.lamaTilawah = row[11];
    entry.intisariQuran = row[12];
  } else if (category === 'jujur') {
    entry.puasaPenuh = row[7];
    entry.alasanBatal = row[8];
    entry.menjagaLisan = row[9];
    entry.menjagaPandangan = row[10];
    entry.berbohong = row[11];
    entry.refleksiDiri = row[12];
  }
  return entry;
}

// ========== SAVE JURNAL ==========
function handleSaveJurnal(data) {
  const ss = getSS();
  const category = data.kategori;
  const sheetMap = {
    sahur: 'sahur',
    shalat: 'shalat',
    belajar: 'belajar',
    silaturahmi: 'silaturahmi',
    berbuka: 'berbuka',
    quran: 'alquran',
    kejujuran: 'jujur'
  };
  const sheetName = sheetMap[category];
  if (!sheetName) return sendError('Kategori tidak valid');
  const sheet = getSheet(sheetName);
  if (!sheet) return sendError('Sheet ' + sheetName + ' tidak ditemukan');

  const id = data.nisn + '-' + data.tanggal + '-' + data.puasaKe;

  const safeNisn = data.nisn ? "'" + data.nisn : '';

  let newRow = [];
  if (category === 'sahur') {
    newRow = [
      id,
      data.tanggal,
      safeNisn,
      data.puasaKe,
      getHariFromTanggal(data.tanggal),
      data.nama,
      data.kelas,
      data.waktuSahur || '',
      data.menuSahur || '',
      data.doaSahur || '',
      data.catatanSahur || ''
    ];
  } else if (category === 'shalat') {
    newRow = [
      id,
      data.tanggal,
      safeNisn,
      data.puasaKe,
      getHariFromTanggal(data.tanggal),
      data.nama,
      data.kelas,
      data.subuh || '',
      data.dzuhur || '',
      data.ashar || '',
      data.maghrib || '',
      data.isya || '',
      data.tarawih || '',
      data.tahajud || '',
      data.dhuha || ''
    ];
  } else if (category === 'belajar') {
    newRow = [
      id,
      data.tanggal,
      safeNisn,
      data.puasaKe,
      getHariFromTanggal(data.tanggal),
      data.nama,
      data.kelas,
      data.materiBelajar || '',
      data.durasiBelajar || '',
      data.metodeBelajar || '',
      data.intisariBelajar || ''
    ];
  } else if (category === 'silaturahmi') {
    newRow = [
      id,
      data.tanggal,
      safeNisn,
      data.puasaKe,
      getHariFromTanggal(data.tanggal),
      data.nama,
      data.kelas,
      data.kegiatanSilaturahmi || '',
      data.denganSiapa || '',
      data.ceritaSilaturahmi || ''
    ];
  } else if (category === 'berbuka') {
    newRow = [
      id,
      data.tanggal,
      safeNisn,
      data.puasaKe,
      getHariFromTanggal(data.tanggal),
      data.nama,
      data.kelas,
      data.waktuBerbuka || '',
      data.menuBerbuka || '',
      data.tempatBerbuka || '',
      data.doaBerbuka || '',
      data.catatanBerbuka || ''
    ];
  } else if (category === 'quran') {
    newRow = [
      id,
      data.tanggal,
      safeNisn,
      data.puasaKe,
      getHariFromTanggal(data.tanggal),
      data.nama,
      data.kelas,
      data.suratDibaca || '',
      data.ayatMulai || '',
      data.ayatSelesai || '',
      data.juzDibaca || '',
      data.lamaTilawah || '',
      data.intisariQuran || ''
    ];
  } else if (category === 'kejujuran') {
    newRow = [
      id,
      data.tanggal,
      safeNisn,
      data.puasaKe,
      getHariFromTanggal(data.tanggal),
      data.nama,
      data.kelas,
      data.puasaPenuh || '',
      data.alasanBatal || '',
      data.menjagaLisan || '',
      data.menjagaPandangan || '',
      data.berbohong || '',
      data.refleksiDiri || ''
    ];
  }

  if (newRow.length === 0) return sendError('Format data tidak valid');
  sheet.appendRow(newRow);
  return sendSuccess({ message: 'Data berhasil disimpan', id: id });
}

// ========== CHAT ==========
function getChatRows() {
  const sh = getSheet(SHEET_NAMES.chat);
  if (!sh) return [];
  const rows = sh.getDataRange().getValues();
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    data.push({
      id: String(r[0] || ''),
      tanggal: String(r[1] || ''),
      hari: String(r[2] || ''),
      nisn: String(r[3] || ''),
      nama: String(r[4] || ''),
      kelas: String(r[5] || ''),
      pesan: String(r[6] || ''),
      reply: String(r[7] || '')
    });
  }
  return data;
}

function handleSendMessage(msg) {
  const sh = getSheet(SHEET_NAMES.chat);
  if (!sh) throw new Error('Sheet chat tidak ditemukan');

  const safeNisn = msg.nisn ? "'" + msg.nisn : '';

  sh.appendRow([
    msg.id || '',
    msg.tanggal || '',
    msg.hari || '',
    safeNisn,
    msg.nama || '',
    msg.kelas || '',
    msg.pesan || '',
    msg.reply || ''
  ]);
  return sendSuccess({ message: 'ok' });
}

function handleGetAllMessages() {
  return sendSuccess(getChatRows());
}

function handleGetMessages(nisn) {
  const target = normalizeNisn(nisn || '');
  const arr = getChatRows();
  const filtered = arr.filter(function (m) {
    return normalizeNisn(m.nisn) === target;
  });
  return sendSuccess(filtered);
}

function handleReplyMessage(payload) {
  const id = payload.id;
  const reply = payload.reply || '';
  const sh = getSheet(SHEET_NAMES.chat);
  if (!sh) throw new Error('Sheet chat tidak ditemukan');
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '') === String(id)) {
      sh.getRange(i + 1, 8).setValue(reply);
      return sendSuccess({ message: 'ok' });
    }
  }
  return sendError('Message id tidak ditemukan');
}
