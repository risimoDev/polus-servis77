'use strict';

/* ── UTILS ───────────────────────────────────────────────── */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const on = (el, ev, fn, opts) => el?.addEventListener(ev, fn, opts);

const Api = {
  base: '../api/v1',

  async get(endpoint) {
    const token = localStorage.getItem('auth_token');
    const headers = { 'X-Requested-With': 'XMLHttpRequest' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res  = await fetch(`${this.base}/${endpoint}`, { headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'HTTP ' + res.status);
    return json;
  },
};

/* ── ROUTER ──────────────────────────────────────────────── */
const pages = {
  dashboard:  { title: 'Дашборд',          init: initDashboard },
  leads:      { title: 'Заявки',            init: initLeads },
  orders:     { title: 'Заказы',            init: initOrders },
  products:   { title: 'Товары',            init: initProducts },
  categories: { title: 'Категории',         init: null },
  users:      { title: 'Пользователи',      init: null },
  forum:      { title: 'Форум',             init: null },
  settings:   { title: 'Настройки',         init: null },
};

let currentPage = null;

function navigate(pageId) {
  if (!pages[pageId]) pageId = 'dashboard';
  if (currentPage === pageId) return;
  currentPage = pageId;

  // Toggle section visibility
  $$('.page').forEach(el => {
    el.hidden = el.id !== 'page-' + pageId;
  });

  // Update sidebar links
  $$('.sidebar__link').forEach(link => {
    link.classList.toggle('is-active', link.dataset.nav === pageId);
  });

  // Update page title
  const titleEl = $('#js-page-title');
  if (titleEl) titleEl.textContent = pages[pageId]?.title ?? pageId;

  // Init page if needed
  if (pages[pageId]?.init) {
    pages[pageId].init();
    pages[pageId].init = null; // run once
  }

  location.hash = pageId;
}

/* ── SIDEBAR TOGGLE ──────────────────────────────────────── */
(function initSidebar() {
  const sidebar = $('#js-sidebar');
  const toggle  = $('#js-sidebar-toggle');

  on(toggle, 'click', () => {
    const open = sidebar.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
  });

  on(document, 'click', e => {
    if (sidebar.classList.contains('is-open') &&
        !sidebar.contains(e.target) &&
        e.target !== toggle) {
      sidebar.classList.remove('is-open');
    }
  });
})();

/* ── NAV DELEGATION ──────────────────────────────────────── */
on(document, 'click', e => {
  const btn = e.target.closest('[data-nav]');
  if (!btn) return;
  e.preventDefault();
  navigate(btn.dataset.nav);
});

/* ── TOPBAR DATE ─────────────────────────────────────────── */
(function setDate() {
  const el = $('#js-topbar-date');
  if (!el) return;
  el.textContent = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());
})();

/* ── STATUS BADGE ────────────────────────────────────────── */
const STATUS_LABELS = {
  new:       'Новый',
  confirmed: 'Подтверждён',
  shipping:  'Доставка',
  done:      'Выполнен',
  cancelled: 'Отменён',
};

function statusBadge(status) {
  return `<span class="status-badge status-badge--${status}">${STATUS_LABELS[status] ?? status}</span>`;
}

/* ── DASHBOARD ───────────────────────────────────────────── */
function initDashboard() {
  // KPI — placeholders until API is connected
  // Api.get('orders?status=new').then(r => ...) etc.

  const dashLeads  = $('#js-dash-leads');
  const dashOrders = $('#js-dash-orders');

  if (dashLeads) {
    dashLeads.innerHTML = '<tr><td colspan="3" class="data-table__empty">API не подключён</td></tr>';
  }
  if (dashOrders) {
    dashOrders.innerHTML = '<tr><td colspan="4" class="data-table__empty">API не подключён</td></tr>';
  }
}

/* ── LEADS ───────────────────────────────────────────────── */
function initLeads() {
  const table = $('#js-leads-table');
  if (table) {
    table.innerHTML = '<tr><td colspan="5" class="data-table__empty">API не подключён — данные появятся после интеграции с сервером</td></tr>';
  }
}

/* ── ORDERS ──────────────────────────────────────────────── */
function initOrders() {
  const table = $('#js-orders-table');
  if (table) {
    table.innerHTML = '<tr><td colspan="7" class="data-table__empty">API не подключён — данные появятся после интеграции с сервером</td></tr>';
  }
}

/* ── PRODUCTS ────────────────────────────────────────────── */
function initProducts() {
  const table = $('#js-products-table');
  if (table) {
    table.innerHTML = '<tr><td colspan="7" class="data-table__empty">API не подключён — данные появятся после интеграции с сервером</td></tr>';
  }
}

/* ── LOGOUT ──────────────────────────────────────────────── */
on($('#js-logout'), 'click', () => {
  localStorage.removeItem('auth_token');
  location.href = '../';
});

/* ── BOOT ────────────────────────────────────────────────── */
(function boot() {
  const hash = location.hash.slice(1);
  navigate(hash && pages[hash] ? hash : 'dashboard');
})();
