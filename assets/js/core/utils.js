'use strict';

/**
 * Shared utilities for the Полюс Сервис 77 platform.
 * Used by both landing (main.js) and future SPA pages.
 */

const Utils = {
  $:   (sel, ctx = document) => ctx.querySelector(sel),
  $$:  (sel, ctx = document) => [...ctx.querySelectorAll(sel)],
  on:  (el, ev, fn, opts)   => el?.addEventListener(ev, fn, opts),
  off: (el, ev, fn)          => el?.removeEventListener(ev, fn),
  raf: requestAnimationFrame,

  debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },

  throttle(fn, ms) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last < ms) return;
      last = now;
      fn(...args);
    };
  },

  formatPrice(n, currency = 'RUB') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency', currency,
      maximumFractionDigits: 0,
    }).format(n);
  },

  formatDate(date) {
    return new Intl.DateTimeFormat('ru-RU').format(new Date(date));
  },

  clamp: (val, min, max) => Math.min(Math.max(val, min), max),

  slug(str) {
    const map = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'j',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ь:'',ъ:'',ы:'y',э:'e',ю:'yu',я:'ya' };
    return str.toLowerCase()
      .split('')
      .map(c => map[c] ?? c)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
};

export default Utils;
