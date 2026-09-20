/**
 * Generates PWA icons into public/icons from an inline SVG matching the
 * app's branding: dark charcoal background + orange flame mark.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BG = "#0a0a0a"; // neutral-950, matches the app background
const FILL = "#f97316"; // orange-500 accent

function iconSvg({ size, maskable }) {
  // Maskable icons need the artwork within a safe zone (~80% of the canvas)
  const flameScale = maskable ? 0.52 : 0.62;
  const cx = size / 2;
  const cy = size / 2;
  const s = size * flameScale;

  const flame = `
    <g transform="translate(${cx - s / 2} ${cy - s / 2}) scale(${s / 512})">
      <path fill="${FILL}" d="M256 24c14 90-38 132-84 178-44 44-76 92-76 154 0 106 82 168 160 168s160-62 160-168c0-72-40-116-76-152-8 40-24 58-48 74 12-88-8-196-36-254z"/>
      <path fill="${BG}" opacity="0.35" d="M256 524c-52 0-96-40-96-104 0-44 22-76 50-104-2 30 8 48 26 62 4-46 22-84 44-110 30 34 72 78 72 152 0 64-44 104-96 104z"/>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${BG}" ${maskable ? "" : 'rx="' + Math.round(size * 0.18) + '"'}/>
    ${flame}
  </svg>`;
}

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
await mkdir(outDir, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-256.png", size: 256, maskable: false },
  { file: "icon-384.png", size: 384, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-192.png", size: 192, maskable: true },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: true },
];

for (const t of targets) {
  await sharp(Buffer.from(iconSvg({ size: t.size, maskable: t.maskable })))
    .png()
    .toFile(outDir + t.file);
  console.log("wrote", t.file);
}
