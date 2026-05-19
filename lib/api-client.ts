'use client';

export type ApiOpts = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, any> | null;
};

export async function api<T = any>(path: string, opts: ApiOpts = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  let body: BodyInit | null | undefined = opts.body as any;
  if (
    body && typeof body === 'object' &&
    !(body instanceof Blob) && !(body instanceof ArrayBuffer) &&
    !(body instanceof FormData) && !(body instanceof URLSearchParams)
  ) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }
  const r = await fetch(path, { ...opts, body, headers, credentials: 'include' });
  if (r.status === 204) return null as T;
  const isJson = (r.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await r.json().catch(() => ({})) : await r.text();
  if (!r.ok) {
    const msg = (isJson && (data as any).error) || (typeof data === 'string' && data) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export const fileUrl = (id: string) => `/api/videos/${encodeURIComponent(id)}/file`;
export const thumbUrl = (id: string) => `/api/videos/${encodeURIComponent(id)}/thumb`;
export const avatarUrl = (username: string) => `/api/avatar/${encodeURIComponent(username)}?t=${Date.now()}`;

export function uploadBytes(url: string, file: File | Blob, onProgress?: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', (file as File).type || 'application/octet-stream');
    if (onProgress) xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('upload failed: ' + xhr.status));
    xhr.onerror = () => reject(new Error('network error'));
    xhr.send(file);
  });
}

/**
 * Upload file LANGSUNG ke Supabase Storage via signed URL — lewati Vercel
 * (Vercel batas body ~4.5MB; ini bisa file besar sampai limit plan).
 * TANPA credentials (cross-origin ke Supabase; token sudah di URL).
 */
export function uploadToSignedUrl(
  uploadUrl: string,
  file: File | Blob,
  onProgress?: (p: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    // Format PERSIS seperti Supabase storage-js uploadToSignedUrl untuk Blob:
    // multipart/form-data — field "cacheControl" + file (nama field kosong "").
    // JANGAN set Content-Type manual (browser yang set boundary multipart).
    const form = new FormData();
    form.append('cacheControl', '3600');
    form.append('', file);
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('x-upsert', 'true');
    if (onProgress) xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error('upload ke storage gagal (' + xhr.status + ') ' + xhr.responseText));
    xhr.onerror = () => reject(new Error('network error saat upload ke storage'));
    xhr.send(form);
  });
}

export function makeVideoThumb(file: File): Promise<{ thumb: string; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true; v.src = url;
    v.onloadeddata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); };
    v.onseeked = () => {
      const c = document.createElement('canvas');
      const w = 480;
      c.width = w; c.height = Math.round((w * (v.videoHeight || 270)) / (v.videoWidth || 480));
      c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
      const thumb = c.toDataURL('image/jpeg', 0.65);
      URL.revokeObjectURL(url);
      resolve({ thumb, duration: v.duration || 0 });
    };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('video error')); };
  });
}

export function makeImageThumb(file: File): Promise<{ thumb: string; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      const w = 480;
      c.width = w; c.height = Math.round((w * img.height) / img.width);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      const thumb = c.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(url);
      resolve({ thumb, duration: 0 });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image error')); };
    img.src = url;
  });
}

// ===== Premium quota =====
export const apiGetMyQuota = () => api('/api/me/quota');
export type GrantPremiumPayload = {
  days?: number;
  months?: number;
  untilISO?: string;
  mode?: 'extend' | 'set';
};
export const apiAdminGrantPremium = (username: string, payload: GrantPremiumPayload) =>
  api<{ ok: boolean; isPremium: boolean; premiumUntil: string | null; lifetime: boolean }>(
    `/api/admin/users/${encodeURIComponent(username)}/premium`,
    { method: 'POST', body: payload },
  );
export const apiAdminRevokePremium = (username: string) =>
  api(`/api/admin/users/${encodeURIComponent(username)}/premium`, { method: 'DELETE' });

// ===== 2FA =====
export const api2faSetup = () => api('/api/me/2fa/setup', { method: 'POST' });
export const api2faEnable = (secret: string, code: string) => api('/api/me/2fa/enable', { method: 'POST', body: { secret, code } });
export const api2faDisable = (password: string) => api('/api/me/2fa/disable', { method: 'POST', body: { password } });
export const apiVerify2FA = (tempToken: string, code: string) => api<{ token: string; user: any }>('/api/login/verify-2fa', { method: 'POST', body: { tempToken, code } });

// ===== Captcha =====
export const apiGetCaptcha = () => api<{ id: string; image: string }>('/api/captcha');

// ===== Admin =====
export const apiAdminStats = () => api('/api/admin/stats');
export const apiAdminUsers = () => api<{ users: any[] }>('/api/admin/users').then((r) => r.users);
export const apiAdminTop = (by = 'views', limit = 10) => api(`/api/admin/top?by=${by}&limit=${limit}`);
export const apiAdminActivity = (limit = 40) => api(`/api/admin/activity?limit=${limit}`);
export const apiAdminSuspend = (u: string, reason: string) => api(`/api/admin/users/${encodeURIComponent(u)}/suspend`, { method: 'POST', body: { reason } });
export const apiAdminUnsuspend = (u: string) => api(`/api/admin/users/${encodeURIComponent(u)}/unsuspend`, { method: 'POST' });
export const apiAdminWarn = (u: string, text: string) => api(`/api/admin/users/${encodeURIComponent(u)}/warn`, { method: 'POST', body: { text } });

// ===== Announcement & Warning =====
export const apiGetAnnouncement = () => api<{ announcement: any | null }>('/api/announcement').then((r) => r.announcement);
export const apiSetAnnouncement = (text: string, type = 'info') => api('/api/admin/announcement', { method: 'POST', body: { text, type } });
export const apiClearAnnouncement = () => api('/api/admin/announcement', { method: 'DELETE' });
export const apiGetMyWarnings = () => api<{ warnings: any[] }>('/api/me/warnings').then((r) => r.warnings);
export const apiMarkWarningRead = (id: string) => api(`/api/me/warnings/${encodeURIComponent(id)}/read`, { method: 'POST' });

// ===== Discord (admin) =====
export const apiDiscordSend = (content: string) => api('/api/admin/discord/send', { method: 'POST', body: { content } });
export const apiDailyReport = () => api('/api/admin/daily-report', { method: 'POST' });

// ===== Banner & Side-Banner (admin) =====
export const apiGetBanner = () => api<{ banner: any }>('/api/banner').then((r) => r.banner);
export const apiSetBanner = (banner: any) => api('/api/banner', { method: 'PUT', body: banner });
export const apiGetSideBanner = () => api<{ banner: any }>('/api/side-banner').then((r) => r.banner);
export const apiSetSideBanner = (banner: any) => api('/api/side-banner', { method: 'PUT', body: banner });

// ===== Running Text (global, admin-set) =====
export const apiGetRunningText = () => api<{ runningText: any }>('/api/running-text').then((r) => r.runningText);
export const apiSetRunningText = (cfg: any) => api('/api/running-text', { method: 'PUT', body: cfg });

// ===== Upload banner image (admin) — returns hosted URL =====
export const apiUploadBanner = (file: File) =>
  api<{ url: string; filename: string; size: number }>('/api/admin/upload-banner', {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });

// ===== Global Player Layers (admin-set, berlaku ke SEMUA video) =====
export type GlobalLayers = { enabled: boolean; layers: { url: string; label?: string }[]; updatedBy?: string; updatedAt?: string };
export const apiGetGlobalLayers = () => api<{ globalLayers: GlobalLayers }>('/api/global-layers').then((r) => r.globalLayers);
export const apiSetGlobalLayers = (cfg: { enabled: boolean; layers: { url: string; label?: string }[] }) =>
  api<{ globalLayers: GlobalLayers }>('/api/global-layers', { method: 'PUT', body: cfg });

// ===== Admin contact (for upgrade premium DM) =====
export const apiGetAdminContact = () => api<{ admin: string | null }>('/api/admin-contact').then((r) => r.admin);

// ===== Admin: Generate Image (Pollinations) =====
export const apiGenerateImage = (prompt: string, opts?: { width?: number; height?: number; model?: string }) =>
  api<{ url: string; prompt: string; width: number; height: number; model: string; seed: number }>(
    '/api/admin/generate-image', { method: 'POST', body: { prompt, ...opts } },
  );

// ===== Video edit (admin/owner) =====
export const apiPatchVideo = (id: string, patch: { title?: string; description?: string; playerLayers?: { url: string; label?: string }[] }) =>
  api<{ video: any }>(`/api/videos/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
