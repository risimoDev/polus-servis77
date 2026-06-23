'use strict';

/* ── SERVICE DETAIL PAGE ─────────────────────────────────────────
 * Читает ?id=<slug> из URL, берёт данные из assets/data/services.json
 * и рендерит страницу услуги в #js-service. Шапка, подвал и модалка —
 * статичные в service.html; модалка открывается делегированием в main.js.
 * ─────────────────────────────────────────────────────────────── */
(function initServicePage() {
  const root = document.getElementById('js-service');
  if (!root) return;

  const slug = new URLSearchParams(window.location.search).get('id');

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  load();

  async function load() {
    try {
      const res = await fetch('assets/data/services.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const list = data.services || [];

      // Без ?id= — показываем общий список всех услуг
      if (!slug) return renderIndex(list);

      const svc  = list.find(s => s.slug === slug);
      if (!svc) return renderNotFound();

      // Подробная статья услуги (опционально) — отдельный HTML-фрагмент
      let article = '';
      if (svc.article) {
        try {
          const ar = await fetch(svc.article);
          if (ar.ok) article = await ar.text();
        } catch { /* статья опциональна */ }
      }
      render(svc, article);
    } catch (e) {
      renderNotFound();
    }
  }

  const ORIGIN = 'https://polus-servis77.ru';

  function render(s, article = '') {
    // ── SEO: заголовок, мета-теги, канонический URL ──
    const pageUrl   = `${ORIGIN}/service.html?id=${s.slug}`;
    const heading   = s.h1 || s.title;
    const pageTitle = s.metaTitle || `${heading} — Полюс Сервис`;
    const metaDesc  = s.metaDescription || s.summary || heading;
    const imgUrl    = s.hero ? `${ORIGIN}/${s.hero.replace(/^\//, '')}` : '';

    document.title = pageTitle;
    const setAttr = (id, attr, val) => {
      const el = document.getElementById(id);
      if (el && val) el.setAttribute(attr, val);
    };
    setAttr('js-meta-desc', 'content', metaDesc);
    setAttr('js-og-title', 'content', s.ogTitle || pageTitle);
    setAttr('js-og-desc',  'content', s.ogDescription || metaDesc);
    setAttr('js-og-url',   'content', pageUrl);
    setAttr('js-og-image', 'content', imgUrl);
    setAttr('js-canonical', 'href',   pageUrl);

    injectJsonLd(s, pageUrl, imgUrl);

    const badge = s.soon
      ? '<span class="srv-detail__badge">Скоро</span>' : '';

    const features = (s.features || []).map(f =>
      `<li>${esc(f)}</li>`).join('');

    const steps = (s.process || []).map((p, i) => `
      <li class="srv-step">
        <span class="srv-step__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <div class="srv-step__body">
          <h3 class="srv-step__title">${esc(p.title)}</h3>
          <p class="srv-step__text">${esc(p.text)}</p>
        </div>
      </li>`).join('');

    const gallery = (s.gallery || []).map(src => `
      <figure class="srv-gallery__item">
        <img src="${esc(src)}" alt="${esc(s.title)}" loading="lazy" decoding="async">
      </figure>`).join('');

    const faq = (s.faq || []).map(f => `
      <details class="srv-faq__item">
        <summary class="srv-faq__q">${esc(f.q)}</summary>
        <div class="srv-faq__a">${esc(f.a)}</div>
      </details>`).join('');

    root.innerHTML = `
      <section class="srv-detail__hero">
        <div class="container">
          <p class="srv-detail__breadcrumb">
            <a href="index.html">Главная</a> &nbsp;/&nbsp;
            <a href="index.html#services">Услуги</a> &nbsp;/&nbsp; ${esc(heading)}
          </p>
          <div class="srv-detail__hero-grid">
            <div class="srv-detail__hero-text">
              <div class="section-label">Услуга ${esc(s.num || '')}</div>
              <h1 class="srv-detail__title">${esc(heading)} ${badge}</h1>
              <p class="srv-detail__summary">${esc(s.subtitle || s.summary)}</p>
              <div class="srv-detail__hero-cta">
                <a href="#" class="btn btn--primary js-modal-open">Оставить заявку</a>
                <a href="tel:+79299233392" class="btn btn--outline">+7 929 92-333-92</a>
              </div>
            </div>
            <div class="srv-detail__hero-img">
              <img src="${esc(s.hero)}" alt="${esc(s.title)}" loading="eager" decoding="async">
            </div>
          </div>
        </div>
      </section>

      <div class="srv-detail__body">
        <div class="container srv-detail__layout">
          <div class="srv-detail__main">

            ${s.intro ? `<section class="srv-detail__block">
              <p class="srv-detail__intro">${esc(s.intro)}</p>
            </section>` : ''}

            ${article
              ? `<article class="srv-article">${article}</article>`
              : `${steps ? `<section class="srv-detail__block">
              <h2 class="srv-detail__h2">Как это происходит</h2>
              <ol class="srv-steps" role="list">${steps}</ol>
            </section>` : ''}`}

            ${gallery ? `<section class="srv-detail__block">
              <h2 class="srv-detail__h2">Фотографии</h2>
              <div class="srv-gallery">${gallery}</div>
            </section>` : ''}

            ${faq ? `<section class="srv-detail__block">
              <h2 class="srv-detail__h2">Частые вопросы</h2>
              <div class="srv-faq">${faq}</div>
            </section>` : ''}

          </div>

          <aside class="srv-detail__aside">
            ${features ? `<div class="srv-detail__card">
              <h2 class="srv-detail__card-h">Что входит</h2>
              <ul class="srv-detail__features" role="list">${features}</ul>
            </div>` : ''}
            <div class="srv-detail__card srv-detail__card--cta">
              <h2 class="srv-detail__card-h">Нужна консультация?</h2>
              <p class="srv-detail__card-text">Перезвоним в течение 15 минут в рабочее время и поможем с подбором.</p>
              <a href="#" class="btn btn--primary btn--block js-modal-open">Оставить заявку</a>
            </div>
          </aside>
        </div>
      </div>

      <section class="srv-detail__lead" id="zayavka" aria-labelledby="srv-lead-title">
        <div class="container">
          <div class="srv-detail__lead-card">
            <div class="srv-detail__lead-head">
              <div class="section-label">Оставить заявку</div>
              <h2 class="srv-detail__h2" id="srv-lead-title">${esc(heading)}</h2>
              <p class="srv-detail__lead-sub">Перезвоним в близжайшее рабочее время, поможем с подбором и расчётом.</p>
            </div>
            <form class="srv-form" id="js-service-form" novalidate>
              <div class="field">
                <input type="text" id="sf-name" name="name" class="field__input" placeholder=" " required minlength="2" maxlength="100" autocomplete="name">
                <label class="field__label" for="sf-name">Ваше имя <span aria-hidden="true">*</span></label>
              </div>
              <div class="field">
                <input type="tel" id="sf-phone" name="phone" class="field__input" placeholder=" " required autocomplete="tel">
                <label class="field__label" for="sf-phone">Телефон <span aria-hidden="true">*</span></label>
              </div>
              <div class="field">
                <textarea id="sf-msg" name="message" class="field__input field__input--ta" placeholder=" " rows="3" maxlength="2000"></textarea>
                <label class="field__label" for="sf-msg">Опишите задачу</label>
              </div>
              <div style="display:none" aria-hidden="true">
                <input type="text" name="website" tabindex="-1" autocomplete="off">
              </div>
              <button class="btn btn--primary btn--block" type="submit" id="js-service-submit">
                <span class="btn__spinner" aria-hidden="true"></span>
                <span class="btn__label">Отправить заявку</span>
              </button>
              <p class="modal__policy">
                Нажимая кнопку, вы соглашаетесь с
                <a href="privacy-policy.html" class="modal__policy-link" target="_blank" rel="noopener">политикой конфиденциальности</a>
                и даёте <a href="consent.html" class="modal__policy-link" target="_blank" rel="noopener">согласие на обработку персональных данных</a>
              </p>
              <p class="modal__error" id="js-service-error" hidden role="alert">
                Ошибка отправки &ndash; попробуйте ещё раз или позвоните нам напрямую
              </p>
            </form>
          </div>
        </div>
      </section>

      <div class="srv-detail__more container">
        <a href="index.html#services" class="srv-detail__back">← Все услуги</a>
      </div>
    `;

    bindServiceForm();
  }

  /* Инлайн-форма заявки на странице услуги.
   * Те же поля, валидация и редирект на spasibo.html, что и на главной —
   * через общий postLead() и psGoal() из main.js. */
  function bindServiceForm() {
    const form   = document.getElementById('js-service-form');
    const submit = document.getElementById('js-service-submit');
    const errEl  = document.getElementById('js-service-error');
    if (!form) return;

    // Маска телефона (как в модалке/контактной форме)
    const phone = document.getElementById('sf-phone');
    if (phone) {
      const fmt = raw => {
        const d = raw.replace(/\D/g, '').replace(/^[78]/, '');
        let o = '+7';
        if (d.length > 0) o += ' ' + d.slice(0, 3);
        if (d.length > 3) o += ' ' + d.slice(3, 6);
        if (d.length > 6) o += '-' + d.slice(6, 8);
        if (d.length > 8) o += '-' + d.slice(8, 10);
        return o;
      };
      phone.addEventListener('input',   () => { phone.value = fmt(phone.value); });
      phone.addEventListener('keydown', e => { if (e.key === 'Backspace' && phone.value.length <= 2) e.preventDefault(); });
      phone.addEventListener('focus',   () => { if (phone.value.length < 2) phone.value = '+7 '; });
    }

    const validate = field => {
      const wrap = field.closest('.field');
      if (!wrap) return true;
      const valid = field.checkValidity() && field.value.trim().length > 0;
      wrap.classList.toggle('is-error', !valid);
      return valid;
    };
    form.querySelectorAll('.field__input').forEach(f => {
      f.addEventListener('blur',  () => f.value && validate(f));
      f.addEventListener('input', () => { if (f.closest('.field').classList.contains('is-error')) validate(f); });
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      let ok = true;
      form.querySelectorAll('.field__input[required]').forEach(f => { if (!validate(f)) ok = false; });
      if (!ok) return;

      submit.classList.add('is-loading');
      submit.disabled = true;
      if (errEl) errEl.hidden = true;

      try {
        // postLead() и psGoal() объявлены глобально в main.js
        await window.postLead(form);
        if (typeof window.psGoal === 'function') window.psGoal('form_submit');
        window.location.assign('spasibo.html');
      } catch {
        if (errEl) errEl.hidden = false;
      } finally {
        submit.classList.remove('is-loading');
        submit.disabled = false;
      }
    });
  }

  // Общий список услуг — когда открыт /service.html без ?id=
  function renderIndex(list) {
    const pageUrl = `${ORIGIN}/service.html`;
    document.title = 'Услуги — Полюс Сервис, Пермь';
    const setAttr = (id, attr, val) => {
      const el = document.getElementById(id);
      if (el && val) el.setAttribute(attr, val);
    };
    const desc = 'Услуги компании Полюс Сервис: промывка пластинчатых теплообменников, монтаж ИТП, техническое обслуживание, поставка оборудования, запчасти и реагенты. Пермь и Пермский край.';
    setAttr('js-meta-desc', 'content', desc);
    setAttr('js-og-title', 'content', 'Услуги — Полюс Сервис, Пермь');
    setAttr('js-og-desc',  'content', desc);
    setAttr('js-og-url',   'content', pageUrl);
    setAttr('js-canonical', 'href',   pageUrl);

    const cards = (list || []).map(s => {
      const h = s.h1 || s.title;
      return `
        <article class="srv-card">
          ${s.hero ? `<div class="srv-card__bg" style="background-image:url('${esc(s.hero)}')" aria-hidden="true"></div>` : ''}
          <div class="srv-card__top">
            <span class="srv-card__num" aria-hidden="true">${esc(s.num || '')}</span>
          </div>
          <h2 class="srv-card__title">${esc(h)}</h2>
          <p class="srv-card__text">${esc(s.subtitle || s.summary || '')}</p>
          <a href="service.html?id=${esc(s.slug)}" class="srv-card__cta">
            Подробнее
            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true"><path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </article>`;
    }).join('');

    root.innerHTML = `
      <section class="srv-detail__hero">
        <div class="container">
          <p class="srv-detail__breadcrumb">
            <a href="index.html">Главная</a> &nbsp;/&nbsp; Услуги
          </p>
          <div class="section-label">Услуги</div>
          <h1 class="srv-detail__title">Услуги по тепловому оборудованию</h1>
          <p class="srv-detail__summary">Промывка теплообменников, монтаж ИТП, техническое обслуживание, поставка оборудования и комплектующих. Пермь и Пермский край.</p>
        </div>
      </section>
      <div class="srv-detail__body">
        <div class="container">
          <div class="srv-grid">${cards}</div>
        </div>
      </div>`;
  }

  function renderNotFound() {
    document.title = 'Услуга не найдена — Полюс Сервис';
    root.innerHTML = `
      <div class="srv-detail__hero">
        <div class="container">
          <p class="srv-detail__breadcrumb">
            <a href="index.html">Главная</a> &nbsp;/&nbsp;
            <a href="index.html#services">Услуги</a>
          </p>
          <h1 class="srv-detail__title">Услуга не найдена</h1>
          <p class="srv-detail__summary">Возможно, ссылка устарела. Посмотрите все наши услуги.</p>
          <div class="srv-detail__hero-cta">
            <a href="index.html#services" class="btn btn--primary">Все услуги</a>
          </div>
        </div>
      </div>`;
  }

  // Структурированные данные для поисковиков (Service + хлебные крошки + FAQ)
  function injectJsonLd(s, pageUrl, imgUrl) {
    const graph = [
      {
        '@type': 'Service',
        'name': s.h1 || s.title,
        'description': s.schemaDescription || s.metaDescription || s.summary || s.title,
        'url': pageUrl,
        'image': imgUrl || undefined,
        'provider': {
          '@type': 'LocalBusiness',
          'name': 'Полюс Сервис',
          'telephone': '+79299233392',
          'url': ORIGIN
        },
        'areaServed': 'Пермский край'
      },
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Главная',  'item': `${ORIGIN}/` },
          { '@type': 'ListItem', 'position': 2, 'name': 'Услуги',   'item': `${ORIGIN}/index.html#services` },
          { '@type': 'ListItem', 'position': 3, 'name': s.h1 || s.title, 'item': pageUrl }
        ]
      }
    ];

    if (Array.isArray(s.faq) && s.faq.length) {
      graph.push({
        '@type': 'FAQPage',
        'mainEntity': s.faq.map(f => ({
          '@type': 'Question',
          'name': f.q,
          'acceptedAnswer': { '@type': 'Answer', 'text': f.a }
        }))
      });
    }

    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    document.head.appendChild(el);
  }
})();
