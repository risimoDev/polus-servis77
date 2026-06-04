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
      const svc  = (data.services || []).find(s => s.slug === slug);
      if (!svc) return renderNotFound();
      render(svc);
    } catch (e) {
      renderNotFound();
    }
  }

  const ORIGIN = 'https://polus-servis77.ru';

  function render(s) {
    // ── SEO: заголовок, мета-теги, канонический URL ──
    const pageUrl   = `${ORIGIN}/service.html?id=${s.slug}`;
    const pageTitle = `${s.title} — Полюс Сервис`;
    const imgUrl    = s.hero ? `${ORIGIN}/${s.hero.replace(/^\//, '')}` : '';

    document.title = pageTitle;
    const setAttr = (id, attr, val) => {
      const el = document.getElementById(id);
      if (el && val) el.setAttribute(attr, val);
    };
    setAttr('js-meta-desc', 'content', s.summary || s.title);
    setAttr('js-og-title', 'content', pageTitle);
    setAttr('js-og-desc',  'content', s.summary || s.title);
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
            <a href="index.html#services">Услуги</a> &nbsp;/&nbsp; ${esc(s.title)}
          </p>
          <div class="srv-detail__hero-grid">
            <div class="srv-detail__hero-text">
              <div class="section-label">Услуга ${esc(s.num || '')}</div>
              <h1 class="srv-detail__title">${esc(s.title)} ${badge}</h1>
              <p class="srv-detail__summary">${esc(s.summary)}</p>
              <div class="srv-detail__hero-cta">
                <a href="#" class="btn btn--primary js-modal-open">Оставить заявку</a>
                <a href="tel:+79082698047" class="btn btn--outline">+7 908 269-80-47</a>
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

            ${steps ? `<section class="srv-detail__block">
              <h2 class="srv-detail__h2">Как это происходит</h2>
              <ol class="srv-steps" role="list">${steps}</ol>
            </section>` : ''}

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

      <div class="srv-detail__more container">
        <a href="index.html#services" class="srv-detail__back">← Все услуги</a>
      </div>
    `;
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
        'name': s.title,
        'description': s.summary || s.title,
        'url': pageUrl,
        'image': imgUrl || undefined,
        'provider': {
          '@type': 'LocalBusiness',
          'name': 'Полюс Сервис',
          'telephone': '+79082698047',
          'url': ORIGIN
        },
        'areaServed': { '@type': 'Country', 'name': 'Россия' }
      },
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Главная',  'item': `${ORIGIN}/` },
          { '@type': 'ListItem', 'position': 2, 'name': 'Услуги',   'item': `${ORIGIN}/index.html#services` },
          { '@type': 'ListItem', 'position': 3, 'name': s.title,    'item': pageUrl }
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
