/**
 * Полюс Сервис 77 — main.js
 * Modules: loader · cursor · scroll-progress · header · nav · reveals · counters · reviews · faq · form · magnetic · phone-mask
 */

'use strict';

/* ── PAGE LOADER ────────────────────────────────────────────── */
(function initLoader() {
  var loader = document.getElementById('page-loader');
  if (!loader) return;

  function hide() {
    loader.classList.add('is-hidden');
    setTimeout(function () { loader.remove(); }, 600);
  }

  /* Minimum display time so the animation is always visible */
  var MIN_MS = 900;
  var start  = Date.now();

  function scheduleHide() {
    var elapsed = Date.now() - start;
    var delay   = Math.max(0, MIN_MS - elapsed);
    setTimeout(hide, delay);
  }

  if (document.readyState === 'complete') {
    scheduleHide();
  } else {
    window.addEventListener('load', scheduleHide, { once: true });
  }
})();

/* ── UTILS ──────────────────────────────────────────────────── */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
const raf = requestAnimationFrame;

/* Страница успешной отправки заявки — туда ведут все формы после успеха */
const LEAD_OK_URL = 'spasibo.html';

/* Отправка заявки на Node-бэкенд (/api/v1/contact). Бросает исключение при ошибке. */
async function postLead(form) {
  const fd = new FormData(form);
  const payload = {
    name:    (fd.get('name')    || '').toString().trim(),
    phone:   (fd.get('phone')   || '').toString().trim(),
    message: (fd.get('message') || '').toString().trim(),
    website: (fd.get('website') || '').toString(), // honeypot для ботов
  };
  const res  = await fetch('/api/v1/contact', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || ('HTTP ' + res.status));
  }
  return true;
}


/* ── SCROLL PROGRESS ────────────────────────────────────────── */
(function initScrollProgress() {
  const bar = $('#js-scroll-progress');
  if (!bar) return;

  let scrollRaf = 0;
  on(window, 'scroll', () => {
    cancelAnimationFrame(scrollRaf);
    scrollRaf = raf(() => {
      const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100;
      bar.style.width = Math.min(pct, 100) + '%';
    });
  }, { passive: true });
})();

/* ── HEADER: scroll state + active nav ─────────────────────── */
(function initHeader() {
  const header = $('#js-header');
  if (!header) return;

  const sections = $$('section[id]');
  const navLinks = $$('.nav__link');

  function update() {
    const scrolled = window.scrollY > 40;
    header.classList.toggle('is-scrolled', scrolled);

    // Active nav link
    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    navLinks.forEach(link => {
      const matches = link.getAttribute('href') === '#' + current;
      link.classList.toggle('is-active', matches);
    });
  }

  let headerRaf = 0;
  on(window, 'scroll', () => {
    cancelAnimationFrame(headerRaf);
    headerRaf = raf(update);
  }, { passive: true });
  update();
})();

/* ── MOBILE BURGER ──────────────────────────────────────────── */
(function initBurger() {
  const burger = $('#js-burger');
  const nav    = $('#js-nav');
  if (!burger || !nav) return;

  let savedScroll = 0;

  function lockScroll() {
    savedScroll = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top      = `-${savedScroll}px`;
    document.body.style.width    = '100%';
  }

  function unlockScroll() {
    document.body.style.position = '';
    document.body.style.top      = '';
    document.body.style.width    = '';
    window.scrollTo(0, savedScroll);
  }

  function closeNav() {
    burger.classList.remove('is-open');
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    unlockScroll();
  }

  burger.addEventListener('click', () => {
    const open = burger.classList.toggle('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    open ? lockScroll() : unlockScroll();
  });

  // Close on nav link click
  $$('.nav__link').forEach(link => on(link, 'click', closeNav));

  // Close on click anywhere in the overlay that isn't a link
  on(nav, 'click', e => {
    if (!e.target.closest('.nav__link')) closeNav();
  });

  // Close on Escape key
  on(document, 'keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) closeNav();
  });
})();

/* ── INTERSECTION OBSERVER: reveals ────────────────────────── */
(function initReveals() {
  const targets = $$('.js-reveal, .js-reveal-left, .js-reveal-right');
  if (!targets.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => io.observe(el));
})();

/* ── ANIMATED COUNTERS ──────────────────────────────────────── */
(function initCounters() {
  const counters = $$('.js-counter');
  if (!counters.length) return;

  const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  function animateCounter(el) {
    const target   = +el.dataset.target;
    const duration = 1800;
    let start      = null;

    function step(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      el.textContent = Math.round(ease(progress) * target);
      if (progress < 1) raf(step);
      else el.textContent = target;
    }
    raf(step);
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => io.observe(el));
})();

/* ── REVIEWS SLIDER ─────────────────────────────────────────── */
(function initReviews() {
  const track  = $('#js-reviews-track');
  const dotsWr = $('#js-reviews-dots');
  const btnP   = $('#js-rev-prev');
  const btnN   = $('#js-rev-next');
  if (!track) return;

  const cards      = $$('.rev-card', track);
  const total      = cards.length;
  let current      = 0;
  let perView      = window.innerWidth < 640 ? 1 : 2;
  let maxSlide     = Math.ceil(total / perView) - 1;
  let autoTimer    = null;

  function buildDots() {
    if (!dotsWr) return;
    dotsWr.innerHTML = '';
    for (let i = 0; i <= maxSlide; i++) {
      const d = document.createElement('button');
      d.className = 'reviews__dot' + (i === current ? ' is-active' : '');
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', 'Отзыв ' + (i + 1));
      d.addEventListener('click', () => goTo(i));
      dotsWr.appendChild(d);
    }
  }

  function goTo(idx) {
    current = Math.max(0, Math.min(idx, maxSlide));
    const cardW    = cards[0].offsetWidth + 24; // gap
    track.style.transform = `translateX(-${current * perView * cardW}px)`;

    if (dotsWr) {
      $$('.reviews__dot', dotsWr).forEach((d, i) => {
        d.classList.toggle('is-active', i === current);
      });
    }
  }

  on(btnP, 'click', () => { goTo(current - 1); resetAuto(); });
  on(btnN, 'click', () => { goTo(current + 1); resetAuto(); });

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1 > maxSlide ? 0 : current + 1), 5000);
  }

  let resizeTimer;
  on(window, 'resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      perView   = window.innerWidth < 640 ? 1 : 2;
      maxSlide  = Math.ceil(total / perView) - 1;
      current   = Math.min(current, maxSlide);
      buildDots();
      goTo(current);
    }, 200);
  });

  // Touch swipe
  let startX = 0;
  on(track, 'touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  on(track, 'touchend',   e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goTo(diff > 0 ? current + 1 : current - 1);
  });

  buildDots();
  resetAuto();
})();

/* ── FAQ ACCORDION ──────────────────────────────────────────── */
(function initFaq() {
  const items = $$('.faq-item');

  items.forEach(item => {
    const btn = $('.faq-item__q', item);
    const ans = $('.faq-item__a', item);
    if (!btn || !ans) return;

    on(btn, 'click', () => {
      const open = item.classList.contains('is-open');

      // Close all
      items.forEach(other => {
        const oa = $('.faq-item__a', other);
        if (oa) oa.hidden = true;
        other.classList.remove('is-open');
        const ob = $('.faq-item__q', other);
        if (ob) ob.setAttribute('aria-expanded', 'false');
      });

      // Toggle clicked
      if (!open) {
        item.classList.add('is-open');
        ans.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();

/* ── PHONE MASK ─────────────────────────────────────────────── */
(function initPhoneMask() {
  const input = $('#f-phone');
  if (!input) return;

  function format(raw) {
    const digits = raw.replace(/\D/g, '').replace(/^7|^8/, '');
    let out = '+7';
    if (digits.length > 0) out += ' ' + digits.slice(0, 3);
    if (digits.length > 3) out += ' ' + digits.slice(3, 6);
    if (digits.length > 6) out += '-' + digits.slice(6, 8);
    if (digits.length > 8) out += '-' + digits.slice(8, 10);
    return out;
  }

  on(input, 'input', () => {
    const pos = input.selectionStart;
    input.value = format(input.value);
    try { input.setSelectionRange(pos, pos); } catch (e) { /* ok */ }
  });

  on(input, 'keydown', e => {
    if (e.key === 'Backspace' && input.value.length <= 2) e.preventDefault();
  });

  on(input, 'focus', () => {
    if (input.value.length < 2) input.value = '+7 ';
  });
})();

/* ── CONTACT FORM ───────────────────────────────────────────── */
(function initForm() {
  const form   = $('#js-contact-form');
  const submit = $('#js-submit');
  const okMsg  = $('#js-form-ok');
  const errMsg = $('#js-form-err');
  if (!form) return;

  function validate(field) {
    const wrap = field.closest('.field');
    if (!wrap) return true;
    const valid = field.checkValidity() && field.value.trim().length > 0;
    wrap.classList.toggle('is-error', !valid);
    return valid;
  }

  // Live validation on blur
  $$('.field__input', form).forEach(f => {
    on(f, 'blur', () => f.value && validate(f));
    on(f, 'input', () => {
      if (f.closest('.field').classList.contains('is-error')) validate(f);
    });
  });

  on(form, 'submit', async e => {
    e.preventDefault();

    // Validate all required fields
    let ok = true;
    $$('.field__input[required], .field__input--ta[required]', form).forEach(f => {
      if (!validate(f)) ok = false;
    });

    // Check policy checkbox
    const policy = $('#f-policy');
    if (policy && !policy.checked) { ok = false; }

    if (!ok) return;

    // Loading state
    submit.classList.add('is-loading');
    submit.disabled = true;
    if (okMsg)  okMsg.hidden  = true;
    if (errMsg) errMsg.hidden = true;

    try {
      await postLead(form);

      // Yandex Metrika goal — replace XXXXXXXX with real counter ID
      if (window.ym) window.ym(/* XXXXXXXX */ 0, 'reachGoal', 'form_submit');
      // Переход на страницу успешной отправки
      window.location.assign(LEAD_OK_URL);
    } catch (err) {
      console.error('Form error:', err);
      if (errMsg) errMsg.hidden = false;
    } finally {
      submit.classList.remove('is-loading');
      submit.disabled = false;
    }
  });
})();

/* ── MODAL: ЗАЯВКА ──────────────────────────────────────────── */
(function initModal() {
  const modal   = $('#js-modal');
  const backdrop = $('#js-modal-backdrop');
  const closeBtn = $('#js-modal-close');
  const form    = $('#js-modal-form');
  const submitBtn = $('#js-modal-submit');
  const success = $('#js-modal-success');
  const errorEl = $('#js-modal-error');
  if (!modal) return;

  let previousFocus = null;

  function openModal() {
    previousFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    raf(() => $('#mf-name')?.focus());
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    previousFocus?.focus();
  }

  function resetModal() {
    if (form)    { form.hidden = false; form.reset(); $$('.field', form).forEach(f => f.classList.remove('is-error')); }
    if (success) success.hidden = true;
    if (errorEl) errorEl.hidden = true;
  }

  // Open on any .js-modal-open click
  on(document, 'click', e => {
    if (e.target.closest('.js-modal-open')) {
      e.preventDefault();
      resetModal();
      openModal();
    }
  });

  on(closeBtn,  'click', closeModal);
  on(backdrop,  'click', closeModal);
  on(document, 'keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Focus trap
  on(modal, 'keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = $$('button, input, textarea, a[href]', modal).filter(el => !el.disabled);
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first)?.focus();
    }
  });

  // Phone mask (modal field)
  const phoneInput = $('#mf-phone');
  if (phoneInput) {
    function fmtPhone(raw) {
      const d = raw.replace(/\D/g, '').replace(/^[78]/, '');
      let o = '+7';
      if (d.length > 0) o += ' ' + d.slice(0, 3);
      if (d.length > 3) o += ' ' + d.slice(3, 6);
      if (d.length > 6) o += '-' + d.slice(6, 8);
      if (d.length > 8) o += '-' + d.slice(8, 10);
      return o;
    }
    on(phoneInput, 'input',   () => { phoneInput.value = fmtPhone(phoneInput.value); });
    on(phoneInput, 'keydown', e  => { if (e.key === 'Backspace' && phoneInput.value.length <= 2) e.preventDefault(); });
    on(phoneInput, 'focus',   () => { if (phoneInput.value.length < 2) phoneInput.value = '+7 '; });
  }

  // Field validation helper
  function validateField(field) {
    const wrap = field.closest('.field');
    if (!wrap) return true;
    const valid = field.checkValidity() && field.value.trim().length > 0;
    wrap.classList.toggle('is-error', !valid);
    return valid;
  }

  $$('.field__input', form || document).forEach(f => {
    on(f, 'blur',  () => f.value && validateField(f));
    on(f, 'input', () => { if (f.closest('.field')?.classList.contains('is-error')) validateField(f); });
  });

  // Submit
  on(form, 'submit', async e => {
    e.preventDefault();
    let ok = true;
    $$('.field__input[required]', form).forEach(f => { if (!validateField(f)) ok = false; });
    if (!ok) return;

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;
    if (errorEl) errorEl.hidden = true;

    try {
      await postLead(form);

      if (window.ym) window.ym(0, 'reachGoal', 'form_submit');
      // Переход на страницу успешной отправки
      window.location.assign(LEAD_OK_URL);
    } catch {
      if (errorEl) errorEl.hidden = false;
    } finally {
      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;
    }
  });
})();

/* ── MAGNETIC BUTTONS ───────────────────────────────────────── */
(function initMagnetic() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  $$('.magnetic').forEach(btn => {
    on(btn, 'mousemove', e => {
      const r   = btn.getBoundingClientRect();
      const x   = e.clientX - r.left - r.width / 2;
      const y   = e.clientY - r.top  - r.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
    });
    on(btn, 'mouseleave', () => {
      btn.style.transform = '';
    });
  });
})();

/* ── SMOOTH ANCHOR SCROLL ───────────────────────────────────── */
(function initSmoothScroll() {
  on(document, 'click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

/* ── ITP BLUEPRINT ANIMATION ────────────────────────────────── */
(function initITPBlueprint() {
  const svg = document.getElementById('itp-svg');
  if (!svg) return;

  // Trigger draw-in when SVG enters viewport (or immediately if already visible)
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          svg.classList.add('itp-drawn');
          observer.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );

  observer.observe(svg);
})();

/* ── BRANDS MARQUEE ─────────────────────────────────────────── */
(function initBrandsMarquee() {
  const row = document.querySelector('.brands__row');
  if (!row) return;

  // Clone children for seamless loop
  const items = row.innerHTML;
  const track = document.createElement('div');
  track.className = 'brands__track';
  track.innerHTML = items + items; // duplicate for seamless loop
  row.innerHTML = '';
  row.classList.add('is-marquee');
  row.appendChild(track);

  // Pause on reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    track.style.animation = 'none';
  }
})();

/* ── MOBILE: pause SMIL animations in hero SVG ──────────────── */
(function pauseMobileSvgAnimations() {
  if (window.innerWidth > 640) return;
  const pipes = document.querySelector('.hero__pipes');
  if (pipes && typeof pipes.pauseAnimations === 'function') {
    pipes.pauseAnimations();
  }
})();

