'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useMe } from '@/components/UserContext';
import { Avatar } from '@/components/Avatar';
import { timeAgo, fmtBytes } from '@/lib/utils';

type Msg = {
  id: string; from: string; to: string; text: string; ts: string; read: boolean;
  imageFilename?: string; imageMime?: string; imageSize?: number;
  isSystem?: boolean;
};
type Partner = { username: string; avatarColor: string; bio: string; mutual: boolean };

const TOPIC_TEMPLATES: Record<string, string> = {
  'upgrade-premium': 'Halo admin, saya mau upgrade ke Premium. Mohon info cara bayar/aktifasi & berapa lama paketnya. Terima kasih 🙏',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function ThreadPage() {
  const { username } = useParams<{ username: string }>();
  const search = useSearchParams();
  const other = decodeURIComponent(username);
  const { me } = useMe();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () =>
    api<{ messages: Msg[]; partner: Partner }>(`/api/messages/${encodeURIComponent(other)}`).then((r) => {
      setMsgs(r.messages);
      setPartner(r.partner);
    });

  useEffect(() => { if (me) load(); /* eslint-disable-next-line */ }, [me, other]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // Pre-fill template kalau ada ?topic=...
  useEffect(() => {
    const topic = search.get('topic');
    if (topic && TOPIC_TEMPLATES[topic] && !text) setText(TOPIC_TEMPLATES[topic]);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('File harus gambar (JPG, PNG, GIF, WEBP)');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Gambar terlalu besar (max 5 MB, kamu kirim ${fmtBytes(file.size)})`);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !imageFile) return;
    setSending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('text', text.trim());
      if (imageFile) fd.append('image', imageFile);
      const res = await fetch(`/api/messages/${encodeURIComponent(other)}`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal kirim pesan');
        setSending(false);
        return;
      }
      setText('');
      clearImage();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setSending(false);
    }
  }

  if (!me) return null;

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col gap-3">
      <header className="flex items-center gap-3">
        <Link href="/messages" className="text-2xl text-muted hover:text-white" aria-label="Back">←</Link>
        {partner && (
          <>
            <Avatar username={partner.username} color={partner.avatarColor} size={40} />
            <div>
              <div className="font-semibold">{partner.username}</div>
              <div className="text-xs text-muted">
                {partner.mutual ? '✓ Mutual following' : '⚠ Belum mutual follow — request mode'}
              </div>
            </div>
          </>
        )}
      </header>
      <div className="card flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.map((m) => {
          const mine = m.from === me.username;
          const isSystemMsg = m.isSystem;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                isSystemMsg
                  ? 'border-2 border-warn/50 bg-warn/10 text-text'
                  : mine
                  ? 'bg-grad-accent text-white'
                  : 'border border-border bg-bg-elev'
              }`}>
                {isSystemMsg && (
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-warn">
                    🤖 Pesan Otomatis Admin
                  </div>
                )}
                {m.imageFilename && (
                  <a
                    href={`/api/msg-files/${encodeURIComponent(m.imageFilename)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 block overflow-hidden rounded-xl"
                  >
                    <img
                      src={`/api/msg-files/${encodeURIComponent(m.imageFilename)}`}
                      alt="attachment"
                      className="max-h-80 w-auto rounded-xl"
                    />
                  </a>
                )}
                {m.text && (
                  <div className="whitespace-pre-wrap break-words text-sm">{m.text}</div>
                )}
                <div className={`mt-0.5 text-[10px] ${mine && !isSystemMsg ? 'text-white/70' : 'text-muted'}`}>
                  {timeAgo(m.ts)}
                  {m.imageSize && <span> · 📎 {fmtBytes(m.imageSize)}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Image preview before send */}
      {imagePreview && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 p-2">
          <img src={imagePreview} alt="preview" className="h-16 w-16 rounded-lg object-cover" />
          <div className="flex-1 text-xs">
            <div className="font-bold">📎 {imageFile?.name}</div>
            <div className="text-muted">{fmtBytes(imageFile?.size || 0)}</div>
          </div>
          <button type="button" onClick={clearImage} className="rounded-lg bg-danger px-2 py-1 text-xs font-bold text-white hover:opacity-80">
            ✕ Hapus
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
          {error}
        </div>
      )}

      <form onSubmit={send} className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFilePick}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-ghost px-3"
          title="Kirim gambar (max 5 MB)"
          disabled={sending}
        >
          📎
        </button>
        <input
          className="input flex-1"
          placeholder="Tulis pesan..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          disabled={sending}
        />
        <button className="btn-primary" disabled={(!text.trim() && !imageFile) || sending}>
          {sending ? 'Kirim…' : 'Kirim'}
        </button>
      </form>
    </div>
  );
}
