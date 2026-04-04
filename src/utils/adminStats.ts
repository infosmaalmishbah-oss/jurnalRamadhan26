import type { AdminProgressPayload, AdminStudentProgressRow, Message } from '../types';

export type { AdminStudentProgressRow };

export interface AdminOverview {
  generatedAt: string;
  today: string;
  students: AdminStudentProgressRow[];
  totals: AdminProgressPayload['totals'];
  pendingChat: number;
  totalChatMessages: number;
}

export async function fetchFullAdminOverview(gasUrl: string): Promise<AdminOverview> {
  const [progRes, msgRes] = await Promise.all([
    fetch(`${gasUrl}?action=getAllStudentsProgress`),
    fetch(`${gasUrl}?action=getAllMessages`),
  ]);
  const prog = await progRes.json();
  const msg = await msgRes.json();
  if (!prog.success) {
    throw new Error(prog.message || 'Gagal memuat progres siswa (getAllStudentsProgress)');
  }
  if (!msg.success) {
    throw new Error(msg.message || 'Gagal memuat pesan chat');
  }
  const payload = prog.data as AdminProgressPayload;
  const messages = (msg.data || []) as Message[];
  return {
    generatedAt: payload.generatedAt,
    today: payload.today,
    students: payload.students || [],
    totals: payload.totals,
    pendingChat: messages.filter((m) => !m.reply?.trim()).length,
    totalChatMessages: messages.length,
  };
}
