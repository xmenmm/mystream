import { loadDotEnv } from './dotenv';

loadDotEnv();

export async function notifyDiscord(embed: Record<string, unknown>): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!token || !channelId) return;
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MyStream-Server/1.0',
      },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (e: any) {
    console.error('[discord notify]', e.message);
  }
}

export async function discordSendContent(content: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!token || !channelId) return { ok: false, error: 'Discord token/channel not configured' };
  try {
    const r = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MyStream-Admin/1.0',
      },
      body: JSON.stringify({ content }),
    });
    if (!r.ok) return { ok: false, error: `Discord API ${r.status}` };
    const j = await r.json();
    return { ok: true, messageId: j.id };
  } catch (e: any) {
    const msg = /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(e?.message || '')
      ? 'Server tidak bisa konek ke Discord (cek koneksi internet server / firewall). Di hosting/VPS dengan internet ini otomatis jalan.'
      : (e?.message || 'unknown error');
    return { ok: false, error: msg };
  }
}

export async function discordSendEmbed(embed: Record<string, unknown>): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!token || !channelId) return { ok: false, error: 'Discord token/channel not configured' };
  try {
    const r = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MyStream-Admin/1.0',
      },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!r.ok) return { ok: false, error: `Discord API ${r.status}` };
    const j = await r.json();
    return { ok: true, messageId: j.id };
  } catch (e: any) {
    const msg = /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(e?.message || '')
      ? 'Server tidak bisa konek ke Discord (cek koneksi internet server / firewall). Di hosting/VPS dengan internet ini otomatis jalan.'
      : (e?.message || 'unknown error');
    return { ok: false, error: msg };
  }
}
