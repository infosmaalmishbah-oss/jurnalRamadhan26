export interface SetPaperManualPayload {
  nisn: string;
  enabled: boolean;
  adminPassword: string;
  periodStart?: string;
  periodEnd?: string;
  catatan?: string;
  applySheetRows?: boolean;
  tanggalReferensi?: string;
}

export async function setPaperManual(gasUrl: string, payload: SetPaperManualPayload): Promise<unknown> {
  const r = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ action: 'setPaperManual', data: payload }),
  });
  const t = await r.text();
  let j: { success?: boolean; message?: string; data?: unknown };
  try {
    j = t ? JSON.parse(t) : {};
  } catch {
    throw new Error('Respons server tidak valid');
  }
  if (!j.success) throw new Error(j.message || 'Gagal menyimpan');
  return j.data;
}
