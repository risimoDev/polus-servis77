#!/usr/bin/env node
/**
 * Генерация favicon из assets/favicon.svg
 * Запуск: npm run favicon   (или: node scripts/generate-favicon.js)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const ROOT = join(__dirname, '..');
const OUT  = join(ROOT, 'assets', 'favicon');

const SVG_PATH = join(ROOT, 'assets', 'favicon.svg');

mkdirSync(OUT, { recursive: true });

const { default: sharp } = await import('sharp');

const svgBuffer = readFileSync(SVG_PATH);

// ── Размеры PNG ───────────────────────────────────────────────────────────
const sizes = [
  { name: 'favicon-16x16.png',  size: 16  },
  { name: 'favicon-32x32.png',  size: 32  },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

console.log('[favicon] Генерация PNG...');
for (const { name, size } of sizes) {
  const png = await sharp(svgBuffer)
    .resize(size, size, { fit: 'contain', background: { r: 6, g: 12, b: 24, alpha: 1 } })
    .png()
    .toBuffer();
  writeFileSync(join(OUT, name), png);
  console.log(`  ✓ ${name}`);
}

// ── ICO (16 + 32 в одном файле) ───────────────────────────────────────────
console.log('[favicon] Генерация favicon.ico...');
try {
  const { default: toIco } = await import('to-ico');
  const buf16 = await sharp(svgBuffer).resize(16, 16, { fit: 'contain', background: { r: 6, g: 12, b: 24, alpha: 1 } }).png().toBuffer();
  const buf32 = await sharp(svgBuffer).resize(32, 32, { fit: 'contain', background: { r: 6, g: 12, b: 24, alpha: 1 } }).png().toBuffer();
  const ico = await toIco([buf16, buf32]);
  writeFileSync(join(OUT, 'favicon.ico'), ico);
  console.log('  ✓ favicon.ico (16+32)');
} catch (e) {
  console.warn('  ! to-ico не удалось, используем fallback PNG-favicon:', e.message);
  // fallback: просто копируем 32x32 png как favicon.png
  const buf32 = await sharp(svgBuffer).resize(32, 32, { fit: 'contain', background: { r: 6, g: 12, b: 24, alpha: 1 } }).png().toBuffer();
  writeFileSync(join(OUT, 'favicon.png'), buf32);
  console.log('  ✓ favicon.png (32x32 fallback)');
}

console.log('[favicon] Готово. Файлы в assets/favicon/');
