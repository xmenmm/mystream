import { randomBytes } from 'node:crypto';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // skip O,0,I,1
const TTL_MS = 5 * 60 * 1000;

export const captchas = new Map<string, { code: string; expiresAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of captchas) if (v.expiresAt < now) captchas.delete(k);
}, 60 * 1000);

function generateCode(len = 5): string {
  let s = '';
  for (let i = 0; i < len; i++) s += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  return s;
}

export function generateCaptchaSvg(code: string): string {
  const W = 200, H = 70;
  const colors = ['#a78bfa', '#f0abfc', '#fbbf24', '#fb7185', '#60a5fa'];
  const rng = () => Math.random();
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  svg += `<rect width="${W}" height="${H}" fill="#1a1633"/>`;

  // Wavy lines
  for (let i = 0; i < 4; i++) {
    const y = 10 + rng() * (H - 20);
    const c = colors[Math.floor(rng() * colors.length)];
    const c1y = y + (rng() * 30 - 15), c2y = y + (rng() * 30 - 15);
    svg += `<path d="M 0 ${y.toFixed(1)} Q ${(W*0.33).toFixed(1)} ${c1y.toFixed(1)}, ${(W*0.5).toFixed(1)} ${y.toFixed(1)} T ${W} ${c2y.toFixed(1)}" stroke="${c}" stroke-width="${(1+rng()*1.5).toFixed(1)}" fill="none" opacity="${(0.4+rng()*0.3).toFixed(2)}"/>`;
  }
  // Diagonal lines
  for (let i = 0; i < 6; i++) {
    const x1 = rng() * W, y1 = rng() * H, x2 = rng() * W, y2 = rng() * H;
    const c = colors[Math.floor(rng() * colors.length)];
    svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="0.8" opacity="0.4"/>`;
  }
  // Noise
  for (let i = 0; i < 80; i++) {
    const x = rng() * W, y = rng() * H, r = 0.5 + rng() * 1.2;
    const c = colors[Math.floor(rng() * colors.length)];
    svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" opacity="${(0.2+rng()*0.4).toFixed(2)}"/>`;
  }
  // Characters dengan rotasi acak
  const charW = (W - 30) / code.length;
  for (let i = 0; i < code.length; i++) {
    const cx = 18 + i * charW + (rng() * 6 - 3);
    const cy = 45 + (rng() * 8 - 4);
    const rot = (rng() * 40 - 20).toFixed(1);
    const size = 28 + Math.floor(rng() * 6);
    const c = colors[Math.floor(rng() * colors.length)];
    svg += `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-family="Georgia, 'Comic Sans MS', serif" font-size="${size}" font-weight="900" fill="${c}" transform="rotate(${rot} ${cx.toFixed(1)} ${cy.toFixed(1)})" style="user-select:none">${code[i]}</text>`;
  }
  // Garis melintang akhir
  for (let i = 0; i < 2; i++) {
    const y = 25 + rng() * 25;
    const c = colors[Math.floor(rng() * colors.length)];
    svg += `<path d="M 5 ${y.toFixed(1)} Q ${(W/2).toFixed(1)} ${(y + (rng()*30-15)).toFixed(1)}, ${W-5} ${y.toFixed(1)}" stroke="${c}" stroke-width="2" fill="none" opacity="0.55"/>`;
  }
  svg += `</svg>`;
  return svg;
}

export function newCaptcha(): { id: string; code: string } {
  const id = 'cap_' + randomBytes(8).toString('hex');
  const code = generateCode();
  captchas.set(id, { code, expiresAt: Date.now() + TTL_MS });
  return { id, code };
}

export function verifyCaptcha(id: string | null | undefined, input: string | null | undefined): boolean {
  if (!id || !input) return false;
  const entry = captchas.get(id);
  if (!entry || entry.expiresAt < Date.now()) {
    captchas.delete(id);
    return false;
  }
  captchas.delete(id); // one-time use
  return entry.code.toUpperCase() === String(input).toUpperCase().trim();
}
