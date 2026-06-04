'use strict';

/* ── CATALOG PAGE ────────────────────────────────────────────── */
(function initCatalog() {
  const PAGE = 24;
  let catalog         = null;
  let filtered        = [];
  let page            = 0;
  let activeCat       = 'all';
  const activeVendors = new Set(); // stores vendor indices (numbers)
  let searchQ         = '';

  const gridEl   = document.getElementById('js-cat-grid');
  const metaEl   = document.getElementById('js-cat-meta');
  const vendorEl = document.getElementById('js-cat-vendors');
  const searchEl = document.getElementById('js-cat-search');
  const moreWrap = document.getElementById('js-cat-more-wrap');
  const moreBtn  = document.getElementById('js-cat-more');
  const moreCnt  = document.getElementById('js-cat-more-count');

  if (!gridEl) return;

  // Read ?cat= URL param and pre-select tab
  const urlCat = new URLSearchParams(window.location.search).get('cat');
  if (urlCat && ['280', '281', '359'].includes(urlCat)) activeCat = urlCat;

  // Start loading immediately (no IntersectionObserver — we're on the catalog page)
  load();

  async function load() {
    gridEl.innerHTML = Array(12).fill('<div class="prod-skeleton"></div>').join('');
    try {
      const res = await fetch('assets/data/catalog.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      catalog = await res.json();
      applyTabUI();
      buildChips();
      filter();
    } catch (e) {
      gridEl.innerHTML = '<p class="cat-error">Не удалось загрузить каталог — обновите страницу.</p>';
    }
  }

  function applyTabUI() {
    document.querySelectorAll('.cat-tab').forEach(t => {
      const active = t.dataset.cat === activeCat;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
    // Update hero subtitle
    const sub = document.getElementById('js-cat-sub');
    if (sub && activeCat !== 'all') {
      const name = catalog.cats[activeCat] || '';
      sub.textContent = name + ' — ' + sub.dataset.base;
    }
  }

  function vName(idx) { return catalog.vendors.list[idx] || ''; }

  function buildChips() {
    const idxList = activeCat === 'all'
      ? catalog.vendors.all
      : (catalog.vendors[activeCat] || []);

    vendorEl.innerHTML = idxList.map(idx => {
      const active = activeVendors.has(idx);
      return `<button class="cat-vendor-chip${active ? ' is-active' : ''}"
                      data-idx="${idx}" type="button"
                      aria-pressed="${active}">${vName(idx)}</button>`;
    }).join('');

    vendorEl.querySelectorAll('.cat-vendor-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.idx;
        const on  = activeVendors.has(idx);
        on ? activeVendors.delete(idx) : activeVendors.add(idx);
        btn.classList.toggle('is-active', !on);
        btn.setAttribute('aria-pressed', String(!on));
        page = 0;
        filter();
      });
    });
  }

  function filter() {
    const q = searchQ.toLowerCase();
    // item: [name, vendorIdx, model, price, catId]
    filtered = catalog.items.filter(([name, vIdx, model,, cat]) => {
      const catOk    = activeCat === 'all' || cat === activeCat;
      const vendorOk = activeVendors.size === 0 || activeVendors.has(vIdx);
      const searchOk = !q
        || name.toLowerCase().includes(q)
        || model.toLowerCase().includes(q)
        || vName(vIdx).toLowerCase().includes(q);
      return catOk && vendorOk && searchOk;
    });
    renderMeta();
    page = 0;
    renderGrid(true);
  }

  function renderMeta() {
    const total = filtered.length;
    if (!total) {
      metaEl.innerHTML = '<span>Ничего не найдено — попробуйте изменить фильтры или запрос</span>';
      return;
    }
    metaEl.innerHTML = `Найдено: <strong>${total.toLocaleString('ru-RU')}</strong> позиций`;
  }

  function renderGrid(reset) {
    const slice = filtered.slice(page * PAGE, (page + 1) * PAGE);

    if (reset && !slice.length) {
      gridEl.innerHTML = '<p class="cat-empty">Ничего не найдено — попробуйте изменить запрос.</p>';
      moreWrap.hidden = true;
      return;
    }

    const html = slice.map(([name, vIdx, model, price, cat, imgIdx]) => {
      const vendor = vName(vIdx);
      // Use per-product image from JSON; fall back to category placeholder
      const img    = (imgIdx !== null && catalog.imgList?.[imgIdx])
                   || catalog.imgs[cat]
                   || catalog.imgs['280'];
      const cname  = catalog.cats[cat] || '';
      const short  = name.length > 80 ? name.slice(0, 77) + '…' : name;
      // Цены показываем как «По запросу» для всех товаров
      const priceH = `<span class="prod-price prod-price--req">По запросу</span>`;

      return `<article class="prod-card">
        <div class="prod-card__img">
          <img src="${img}" alt="${vendor} ${model}" loading="lazy" decoding="async">
        </div>
        <div class="prod-card__body">
          <div class="prod-card__meta">
            <span class="prod-vendor">${vendor}</span>
            <span class="prod-type">${cname}</span>
          </div>
          <h3 class="prod-name" title="${name}">${short}</h3>
          <div class="prod-model">Модель: <strong>${model || '—'}</strong></div>
          ${priceH}
          <button class="btn btn--primary btn--sm js-modal-open prod-cta" type="button">Запросить цену</button>
        </div>
      </article>`;
    }).join('');

    reset ? (gridEl.innerHTML = html) : gridEl.insertAdjacentHTML('beforeend', html);

    const shown   = Math.min((page + 1) * PAGE, filtered.length);
    const hasMore = shown < filtered.length;
    moreWrap.hidden = !hasMore;
    if (hasMore) moreCnt.textContent = ` (ещё ${(filtered.length - shown).toLocaleString('ru-RU')})`;
  }

  // Tab clicks
  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (!catalog) return;
      document.querySelectorAll('.cat-tab').forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      activeCat = tab.dataset.cat;
      activeVendors.clear();
      page = 0;
      // Push URL param without reload
      const url = new URL(window.location.href);
      activeCat !== 'all'
        ? url.searchParams.set('cat', activeCat)
        : url.searchParams.delete('cat');
      window.history.replaceState({}, '', url);
      buildChips();
      filter();
    });
  });

  // Search (debounced)
  let searchTimer;
  searchEl?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQ = searchEl.value.trim();
      page = 0;
      if (catalog) filter();
    }, 300);
  });

  // Show more
  moreBtn?.addEventListener('click', () => {
    page++;
    renderGrid(false);
    // Scroll to first new card
    const cards = gridEl.querySelectorAll('.prod-card');
    cards[(page - 1) * PAGE + PAGE]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
