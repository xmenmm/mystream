// Generate MyStream PWA icons (192x192 + 512x512) dari SVG.
// Run: node scripts/gen-icons.mjs

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

// SVG icon source — M with purple gradient, rounded corners.
const svgSrc = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#d946ef"/>
    </linearGradient>
    <linearGradient id="g2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#g)"/>
  <!-- "M" stylized + play arrow -->
  <path d="M 120 360 L 120 152 L 200 152 L 256 240 L 312 152 L 392 152 L 392 360 L 332 360 L 332 248 L 280 320 L 232 320 L 180 248 L 180 360 Z" fill="url(#g2)"/>
  <!-- accent dot -->
  <circle cx="430" cy="100" r="22" fill="#fbbf24"/>
</svg>`;

const sizes = [192, 512];

mkdirSync(PUBLIC_DIR, { recursive: true });

for (const sz of sizes) {
  const buf = Buffer.from(svgSrc(sz));
  const out = join(PUBLIC_DIR, `icon-${sz}.png`);
  await sharp(buf, { density: 300 }).resize(sz, sz).png({ compressionLevel: 9 }).toFile(out);
  console.log('✓', out);
}

// Apple touch icon (180x180)
const appleBuf = Buffer.from(svgSrc(180));
await sharp(appleBuf, { density: 300 })
  .resize(180, 180)
  .png({ compressionLevel: 9 })
  .toFile(join(PUBLIC_DIR, 'apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png');

// Favicon 32 + 16
for (const sz of [32, 16]) {
  const f = Buffer.from(svgSrc(sz));
  await sharp(f, { density: 300 })
    .resize(sz, sz)
    .png({ compressionLevel: 9 })
    .toFile(join(PUBLIC_DIR, `favicon-${sz}.png`));
}
console.log('✓ favicons');

console.log('\nDone — set di public/');
