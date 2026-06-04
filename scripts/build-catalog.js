/**
 * build-catalog.js
 * Generates assets/data/catalog.json from yandex_522493.json
 * Run: node scripts/build-catalog.js
 */

const fs   = require('fs');
const path = require('path');

const SRC  = path.join(__dirname, '..', 'yandex_522493.json');
const DEST = path.join(__dirname, '..', 'assets', 'data', 'catalog.json');

const MAX_PER_VENDOR_CAT = 150; // max items per vendor × root-category combo

const data   = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const offers = data.yml_catalog.shop.offers.offer;
const cats   = data.yml_catalog.shop.categories.category;

// Build sub-category → root-category map
const parentMap = {};
cats.forEach(c => { parentMap[c['@id']] = c['@parentId'] || c['@id']; });

const ROOT_IDS  = { '280': 'Пластины', '281': 'Уплотнения', '359': 'Теплообменники' };
const ROOT_IMGS = {
  '280': 'assets/images/catalog/h8ty2nm3sudf59qvw49nqrf7n1p4bqkm.png',
  '281': 'assets/images/catalog/wrdmv4rhxpv5aj3vluj3hk7to726pait.png',
  '359': 'assets/images/catalog/4xah6ktk5cjnwi6panlwtkiu4ge2iiew.png',
};

function rootOf(catId) {
  const s = String(catId);
  const p = parentMap[s];
  return (p && p !== s) ? p : s;
}

// Sort: priced items first
const sorted = [...offers].sort((a, b) => {
  if (a.price && !b.price) return -1;
  if (!a.price && b.price) return  1;
  return 0;
});

// Limit per vendor×cat
const buckets = {};
const items   = [];

for (const o of sorted) {
  const root   = rootOf(o.categoryId);
  if (!ROOT_IDS[root]) continue; // skip unknown root cats

  const vendor = (o.vendor || '').trim();
  const key    = vendor + '|' + root;

  if (!buckets[key]) buckets[key] = 0;
  if (buckets[key] >= MAX_PER_VENDOR_CAT) continue;
  buckets[key]++;

  // item format: [name, vendor, model, price, rootCatId]
  items.push([
    (o.name  || '').trim(),
    vendor,
    (o.model || '').trim(),
    o.price  || null,
    root,
  ]);
}

// Collect unique vendors per category for filter building
const vendorsByCat = { '280': new Set(), '281': new Set(), '359': new Set(), 'all': new Set() };
items.forEach(([,v,,, c]) => {
  if (vendorsByCat[c]) vendorsByCat[c].add(v);
  vendorsByCat.all.add(v);
});

const output = {
  cats: ROOT_IDS,
  imgs: ROOT_IMGS,
  vendors: {
    all:  [...vendorsByCat.all ].sort(),
    '280': [...vendorsByCat['280']].sort(),
    '281': [...vendorsByCat['281']].sort(),
    '359': [...vendorsByCat['359']].sort(),
  },
  items,
};

const json = JSON.stringify(output);
fs.writeFileSync(DEST, json, 'utf8');

const kb = (json.length / 1024).toFixed(1);
console.log(`✓ catalog.json — ${items.length} items — ${kb} KB`);
console.log('  Vendors per cat:', Object.fromEntries(
  Object.entries(output.vendors).map(([k,v]) => [k, v.length])
));
