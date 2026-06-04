/*
 * merge-everest.cjs — встраивает товары партнёра Эверест в каталог сайта.
 *
 * Берёт данные, собранные scrape-everest.cjs (assets/data/everest/*.json), и
 * добавляет их в assets/data/catalog.json в формате каталога, чтобы товары
 * Эвереста показывались в catalog.html рядом с остальными.
 *
 * Идемпотентность: скрипт сначала ПЕРЕсобирает базовый каталог из yandex-фида
 * (build-catalog.cjs), а потом добавляет Эверест. Поэтому повторный запуск не
 * плодит дубли — каждый раз база чистая.
 *
 * Запуск:  node scripts/merge-everest.cjs
 *
 * Требует, чтобы заранее были выполнены:
 *   node scripts/scrape-everest.cjs catalog/plastinchatye_teploobmenniki/ --images
 */

'use strict';

const fs        = require('fs');
const path      = require('path');
const { execSync } = require('child_process');

const ROOT      = path.join(__dirname, '..');
const CATALOG   = path.join(ROOT, 'assets', 'data', 'catalog.json');
const EVEREST   = path.join(ROOT, 'assets', 'data', 'everest');

const VENDOR    = 'ЭВЕРЕСТ';   // вендор Эвереста в каталоге (как в yandex-фиде)
const CAT_ID    = '359';       // Теплообменники

/* ── 1. Пересобираем чистую базу из yandex-фида ─────────────── */
console.log('Пересборка базового каталога из yandex-фида…');
execSync('node scripts/build-catalog.cjs', { cwd: ROOT, stdio: 'inherit' });

const data = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));

/* ── 2. Находим/создаём вендор Эвереста ─────────────────────── */
let vendorIdx = data.vendors.list.findIndex(v => v.toUpperCase() === VENDOR);
if (vendorIdx === -1) {
  vendorIdx = data.vendors.list.push(VENDOR) - 1;
}
if (!data.vendors.all.includes(vendorIdx))      data.vendors.all.push(vendorIdx);
if (!data.vendors[CAT_ID].includes(vendorIdx))  data.vendors[CAT_ID].push(vendorIdx);

/* ── 3. Загружаем собранные товары Эвереста ─────────────────── */
if (!fs.existsSync(EVEREST)) {
  console.error(`Нет папки ${EVEREST}. Сначала запустите scrape-everest.cjs.`);
  process.exit(1);
}
const files = fs.readdirSync(EVEREST).filter(f => f.endsWith('.json'));
const products = files.flatMap(f => JSON.parse(fs.readFileSync(path.join(EVEREST, f), 'utf8')).products);
console.log(`Товаров Эвереста к добавлению: ${products.length} (из ${files.length} файлов)`);

/* ── 4. Убираем из базы старые позиции Эвереста с теми же названиями ─ */
const scrapedNames = new Set(products.map(p => p.name.toUpperCase()));
const before = data.items.length;
data.items = data.items.filter(it => !(it[1] === vendorIdx && scrapedNames.has((it[0] || '').toUpperCase())));
const removed = before - data.items.length;
if (removed) console.log(`Удалено устаревших позиций Эвереста: ${removed}`);

/* ── 5. Добавляем товары Эвереста в формат каталога ─────────── */
// item: [name, vendorIdx, model, price, catId, imgIdx]
const imgIndex = new Map(data.imgList.map((u, i) => [u, i]));
const imgIdxOf = url => {
  if (!url) return null;
  if (!imgIndex.has(url)) { imgIndex.set(url, data.imgList.length); data.imgList.push(url); }
  return imgIndex.get(url);
};

let added = 0;
for (const p of products) {
  const model  = (p.name || '').trim();
  const name   = `Теплообменник пластинчатый Эверест ${model}`.trim();
  const img    = (p.localImages && p.localImages[0]) || (p.images && p.images[0]) || null;
  data.items.push([name, vendorIdx, model, p.price || null, CAT_ID, imgIdxOf(img)]);
  added++;
}

/* ── 6. Сохраняем ──────────────────────────────────────────── */
const json = JSON.stringify(data);
fs.writeFileSync(CATALOG, json, 'utf8');
console.log(`Добавлено товаров Эвереста: ${added}`);
console.log(`Итого позиций в каталоге: ${data.items.length} | ${(json.length / 1024).toFixed(1)} KB`);
