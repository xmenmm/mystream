'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useMe } from '@/components/UserContext';
import { Avatar } from '@/components/Avatar';
import { timeAgo } from '@/lib/utils';
import { useT } from '@/lib/i18n';

type Item = {
  username: string;
  avatarColor: string;
  bio: string;
  lastText: string;
  lastTs: string;
  lastFromMe: boolean;
  unread: number;
  mutual: boolean;
};

export default function MessagesPage() {
  const { me } = useMe();
  const t = useT();
  const [inbox, setInbox] = useState<Item[]>([]);
  const [requests, setRequests] = useState<Item[]>([]);
  const [tab, setTab] = useState<'inbox' | 'requests'>('inbox');

  useEffect(() => {
    if (!me) return;
    api<{ inbox: Item[]; requests: Item[] }>('/api/messages').then((r) => {
      setInbox(r.inbox);
      setRequests(r.requests);
    });
  }, [me]);

  if (!me) return null;
  const list = tab === 'inbox' ? inbox : requests;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold">{t('messages.title')}</h1>
      </header>
      <div className="flex gap-2">
        <button className={tab === 'inbox' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('inbox')}>
          Inbox {inbox.length > 0 && <span className="opacity-70">({inbox.length})</span>}
        </button>
        <button className={tab === 'requests' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('requests')}>
          Requests {requests.length > 0 && <span className="opacity-70">({requests.length})</span>}
        </button>
      </div>
      <div className="card divide-y divide-border p-0">
        {list.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('messages.empty')}</div>
        ) : (
          list.map((c) => (
            <Link
              key={c.username}
              href={`/messages/${encodeURIComponent(c.username)}`}
              className="flex items-center gap-3 p-3 hover:bg-bg-elev"
            >
              <Avatar username={c.username} color={c.avatarColor} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate font-semibold">{c.username}</span>
                  <span className="text-xs text-muted">{timeAgo(c.lastTs)}</span>
                </div>
                <div className="truncate text-sm text-muted">
                  {c.lastFromMe && '↪ '}
                  {c.lastText}
                </div>
              </div>
              {c.unread > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-grad-accent px-1.5 text-xs font-bold text-white">
                  {c.unread}
                </span>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
