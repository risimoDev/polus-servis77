const fs = require('fs');

const SRC  = 'yandex_522493.json';
const DEST = 'assets/data/catalog.json';
const MAX  = Infinity; // all items

const data   = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const offers = data.yml_catalog.shop.offers.offer;
const cats   = data.yml_catalog.shop.categories.category;

const parentMap = {};
cats.forEach(c => { parentMap[c['@id']] = c['@parentId'] || c['@id']; });

const ROOT_IDS  = { '280': 'Пластины', '281': 'Уплотнения', '359': 'Теплообменники' };
const ROOT_IMGS = {
  '280': 'assets/images/catalog/h8ty2nm3sudf59qvw49nqrf7n1p4bqkm.webp',
  '281': 'assets/images/catalog/wrdmv4rhxpv5aj3vluj3hk7to726pait.webp',
  '359': 'assets/images/catalog/4xah6ktk5cjnwi6panlwtkiu4ge2iiew.webp',
};

// Deduplicated image list (index → URL)
const imgList = [];
const imgMap  = {}; // url → index

function rootOf(catId) {
  const s = String(catId);
  const p = parentMap[s];
  return (p && p !== s) ? p : s;
}

const sorted = [...offers].sort((a, b) => (a.price ? 0 : 1) - (b.price ? 0 : 1));

const buckets = {};
const items   = [];

for (const o of sorted) {
  const root   = rootOf(o.categoryId);
  if (!ROOT_IDS[root]) continue;
  const vendor = (o.vendor || '').trim();
  const key    = vendor + '|' + root;
  buckets[key] = (buckets[key] || 0);
  if (buckets[key] >= MAX) continue;
  buckets[key]++;

  // First picture URL → deduplicated index (null if none)
  const pics = Array.isArray(o.picture) ? o.picture : (o.picture ? [o.picture] : []);
  const url  = pics[0] || null;
  let imgIdx = null;
  if (url) {
    if (imgMap[url] === undefined) { imgMap[url] = imgList.length; imgList.push(url); }
    imgIdx = imgMap[url];
  }

  items.push([
    (o.name  || '').trim(),
    vendor,
    (o.model || '').trim(),
    o.price  || null,
    root,
    imgIdx,          // index into output.imgList, or null
  ]);
}

const vendorsByCat = { '280': new Set(), '281': new Set(), '359': new Set(), all: new Set() };
items.forEach(([,v,,,c]) => { vendorsByCat[c] && vendorsByCat[c].add(v); vendorsByCat.all.add(v); });

// Encode vendor as index to reduce file size
const vendorList = [...vendorsByCat.all].sort();
const vendorIdx  = {};
vendorList.forEach((v, i) => { vendorIdx[v] = i; });

// Replace vendor string with index in items (keep imgIdx — the 6th field)
const compactItems = items.map(([n, v, m, p, c, img]) => [n, vendorIdx[v], m, p, c, img]);

const output = {
  cats:    ROOT_IDS,
  imgs:    ROOT_IMGS,   // category fallback images
  imgList,              // deduplicated per-product image URLs
  vendors: {
    list:  vendorList,
    all:   vendorList.map((_, i) => i),
    '280': [...vendorsByCat['280']].sort().map(v => vendorIdx[v]),
    '281': [...vendorsByCat['281']].sort().map(v => vendorIdx[v]),
    '359': [...vendorsByCat['359']].sort().map(v => vendorIdx[v]),
  },
  items: compactItems,
};

const json = JSON.stringify(output);
fs.writeFileSync(DEST, json, 'utf8');
console.log('Items:', items.length, '| KB:', (json.length/1024).toFixed(1));
Object.entries(output.vendors).forEach(([k,v]) => console.log(' ',k+':',v.length,'vendors'));
