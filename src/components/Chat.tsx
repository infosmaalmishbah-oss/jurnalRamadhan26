import React, { useEffect, useState, useRef } from 'react';
import { Send, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { GAS_URL } from '../config';
import { Message, User } from '../types';

interface ChatProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function Chat({ user, isOpen, onClose, isAdmin }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // polling when modal is open to fetch new messages periodically
  useEffect(() => {
    if (!isOpen) return;
    const iv = setInterval(() => {
      loadMessages();
    }, 15000); // 15s
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // mark replies as seen when messages load while open
  useEffect(() => {
    if (!isOpen || !user) return;
    const seenKey = `seen_chat_reply_${user.nisn}`;
    const seen: string[] = JSON.parse(sessionStorage.getItem(seenKey) || '[]');
    const repliedIds = messages.filter(m => m.reply).map(m => m.id);
    const merged = Array.from(new Set([...seen, ...repliedIds]));
    sessionStorage.setItem(seenKey, JSON.stringify(merged));
  }, [isOpen, messages, user]);

  const loadMessages = async () => {
    try {
      if (!GAS_URL) return;
      if (isAdmin) {
        const res = await fetch(`${GAS_URL}?action=getAllMessages`);
        const result = await res.json();
        if (result.success) setMessages(result.data || []);
      } else if (user) {
        const res = await fetch(`${GAS_URL}?action=getMessages&nisn=${user.nisn}`);
        const result = await res.json();
        if (result.success) setMessages(result.data || []);
      }
    } catch (err) {
      console.error('Load chat error', err);
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const msg: Message = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      tanggal: new Date().toISOString(),
      hari: '',
      nisn: user?.nisn,
      nama: user?.nama,
      kelas: user?.kelas,
      pesan: text.trim(),
      reply: ''
    };

    setSending(true);

    try {
      if (!GAS_URL) throw new Error('Server chat tidak dikonfigurasi');
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ action: 'sendMessage', data: msg })
      });
      const textRes = await response.text();
      let result;
      try { result = textRes ? JSON.parse(textRes) : {}; } catch (e) { throw new Error(`Invalid JSON: ${textRes}`); }

      if (result.success) {
        setMessages(prev => [...prev, msg]);
        setText('');
        // optional: reload to get any server-side reply
        setTimeout(loadMessages, 800);
      } else {
        throw new Error(result.message || 'Gagal mengirim pesan');
      }
    } catch (err: any) {
      console.error('Send chat error', err);
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message || 'Tidak dapat mengirim pesan' });
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (id: string, replyText: string) => {
    if (!replyText.trim()) return;
    try {
      if (!GAS_URL) throw new Error('Server chat tidak dikonfigurasi');
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ action: 'replyMessage', data: { id, reply: replyText.trim() } })
      });
      const textRes = await response.text();
      let result;
      try { result = textRes ? JSON.parse(textRes) : {}; } catch (e) { throw new Error(`Invalid JSON: ${textRes}`); }

      if (result.success) {
        loadMessages();
      } else {
        throw new Error(result.message || 'Gagal membalas pesan');
      }
    } catch (err: any) {
      console.error('Reply error', err);
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message || 'Tidak dapat membalas pesan' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-islamic-green to-green-600 text-white p-4 flex items-center justify-between">
          <div className="font-semibold">{isAdmin ? 'Inbox Chat (Admin)' : 'Kirim Pesan ke Admin'}</div>
          <button onClick={onClose} className="opacity-90 hover:opacity-100"><X size={18} /></button>
        </div>

        <div className="p-4 flex-1 overflow-auto" ref={listRef} style={{ minHeight: 200 }}>
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">Tidak ada pesan</div>
          ) : (
            <div className="space-y-3">
              {messages.map(m => (
                <div key={m.id} className="p-3 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{m.nama || m.nisn || 'Anon'}</div>
                      <div className="text-xs text-gray-500">{new Date(m.tanggal).toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-gray-400">{m.kelas}</div>
                  </div>

                  <div className="mt-2 text-gray-700">{m.pesan}</div>

                  {m.reply ? (
                    <div className="mt-3 p-2 bg-green-50 rounded">Balasan: <span className="font-medium">{m.reply}</span></div>
                  ) : null}

                  {isAdmin && !m.reply ? (
                    <div className="mt-3 flex gap-2">
                      <input placeholder="Tulis balasan..." className="flex-1 px-3 py-2 rounded border" id={`reply-${m.id}`} />
                      <button onClick={() => {
                        const el = document.getElementById(`reply-${m.id}`) as HTMLInputElement | null;
                        if (el) handleReply(m.id, el.value);
                      }} className="px-3 py-2 bg-islamic-green text-white rounded flex items-center gap-2">
                        <Send size={14} />
                        <span className="text-sm">Kirim</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {!isAdmin && (
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="flex-1 p-3 rounded-xl border" placeholder="Tulis pesan untuk admin..."></textarea>
              <button onClick={handleSend} disabled={sending} className="px-4 py-3 bg-islamic-green text-white rounded-xl flex items-center gap-2">
                <Send size={16} />
                <span>Kirim</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
