export interface AppSettingsPayload {
  jurnalInputEnabled: boolean;
  serverTime?: string;
}

export async function fetchAppSettings(gasUrl: string): Promise<AppSettingsPayload> {
  const r = await fetch(`${gasUrl}?action=getSettings`);
  const j = await r.json();
  if (!j.success) throw new Error(j.message || 'Gagal memuat pengaturan');
  return j.data as AppSettingsPayload;
}

export async function updateAppSettings(
  gasUrl: string,
  adminPassword: string,
  jurnalInputEnabled: boolean,
): Promise<AppSettingsPayload> {
  const r = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({
      action: 'updateSettings',
      data: { adminPassword, jurnalInputEnabled },
    }),
  });
  const t = await r.text();
  let j: { success?: boolean; message?: string; data?: AppSettingsPayload };
  try {
    j = t ? JSON.parse(t) : {};
  } catch {
    throw new Error('Respons server tidak valid');
  }
  if (!j.success) throw new Error(j.message || 'Gagal memperbarui pengaturan');
  return j.data as AppSettingsPayload;
}
