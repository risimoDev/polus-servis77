#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────
 * Prerender service pages (SSG)
 *
 * Зачем: краулеры (Яндекс/Google) читают исходный HTML ДО выполнения JS.
 * service.js подменяет <title>/meta/canonical и тело уже в браузере —
 * поисковик этого не видит. Поэтому для каждой услуги мы генерируем
 * НАСТОЯЩИЙ статический HTML-файл с готовыми мета-тегами и контентом в <head>/<body>.
 *
 * Источник истины — assets/data/services.json (+ статьи assets/data/services/*.html).
 * Шаблон-оболочка (шапка/подвал/модалка/скрипты) — service.html.
 * Результат — service/<slug>.html. Nginx отдаёт их по /service.html?id=<slug>
 * (см. map в nginx/nginx.conf). service.js остаётся как progressive enhancement.
 *
 * Запуск:  node scripts/prerender-services.cjs
 * ──────────────────────────────────────────────────────────────────────── */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const ORIGIN   = 'https://polus-servis77.ru';
const OUT_DIR  = path.join(ROOT, 'service');

const shell    = fs.readFileSync(path.join(ROOT, 'service.html'), 'utf8');
const data     = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/services.json'), 'utf8'));
const services = data.services || [];

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/* ── Тело страницы услуги (зеркало render() из assets/js/service.js) ──────── */
function buildBody(s, article) {
  const heading = s.h1 || s.title;
  const badge   = s.soon ? '<span class="srv-detail__badge">Скоро</span>' : '';

  const features = (s.features || []).map(f => `<li>${esc(f)}</li>`).join('');

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
        <img src="${esc(src)}" alt="${esc(heading)}" loading="lazy" decoding="async">
      </figure>`).join('');

  const faq = (s.faq || []).map(f => `
      <details class="srv-faq__item">
        <summary class="srv-faq__q">${esc(f.q)}</summary>
        <div class="srv-faq__a">${esc(f.a)}</div>
      </details>`).join('');

  return `
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
                <a href="#zayavka" class="btn btn--primary js-modal-open">Оставить заявку</a>
                <a href="tel:+79299233392" class="btn btn--outline">+7 929 92-333-92</a>
              </div>
            </div>
            <div class="srv-detail__hero-img">
              <img src="${esc(s.hero)}" alt="${esc(heading)}" loading="eager" decoding="async">
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
              <a href="#zayavka" class="btn btn--primary btn--block js-modal-open">Оставить заявку</a>
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
}

/* ── JSON-LD (зеркало injectJsonLd) ──────────────────────────────────────── */
function buildJsonLd(s, pageUrl, imgUrl) {
  const heading = s.h1 || s.title;
  const graph = [
    {
      '@type': 'Service',
      'name': heading,
      'description': s.schemaDescription || s.metaDescription || s.summary || heading,
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
        { '@type': 'ListItem', 'position': 1, 'name': 'Главная', 'item': `${ORIGIN}/` },
        { '@type': 'ListItem', 'position': 2, 'name': 'Услуги',  'item': `${ORIGIN}/index.html#services` },
        { '@type': 'ListItem', 'position': 3, 'name': heading,   'item': pageUrl }
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
  return '<script type="application/ld+json">' +
    JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) +
    '</script>';
}

/* ── Подстановка значений в <head> оболочки ─────────────────────────────── */
function setHeadAttr(html, id, attr, value) {
  // Меняем атрибут (content/href) у элемента с нужным id, не трогая остальные.
  const re = new RegExp(`(<[^>]*\\bid="${id}"[^>]*\\b${attr}=")[^"]*(")`);
  return html.replace(re, `$1${value.replace(/\$/g, '$$$$')}$2`);
}

function buildPage(s) {
  const heading  = s.h1 || s.title;
  const pageUrl  = `${ORIGIN}/service.html?id=${s.slug}`;
  const title    = s.metaTitle || `${heading} — Полюс Сервис`;
  const desc     = s.metaDescription || s.summary || heading;
  const ogTitle  = s.ogTitle || title;
  const ogDesc   = s.ogDescription || desc;
  const imgUrl   = s.hero ? `${ORIGIN}/${s.hero.replace(/^\//, '')}` : '';

  let article = '';
  if (s.article) {
    const p = path.join(ROOT, s.article);
    if (fs.existsSync(p)) article = fs.readFileSync(p, 'utf8');
  }

  let html = shell;

  // <head>: title + мета + canonical + og
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = setHeadAttr(html, 'js-meta-desc', 'content', esc(desc));
  html = setHeadAttr(html, 'js-og-title',  'content', esc(ogTitle));
  html = setHeadAttr(html, 'js-og-desc',   'content', esc(ogDesc));
  html = setHeadAttr(html, 'js-og-url',    'content', pageUrl);
  html = setHeadAttr(html, 'js-canonical', 'href',    pageUrl);

  // JSON-LD перед </head>
  html = html.replace('</head>', `${buildJsonLd(s, pageUrl, imgUrl)}\n</head>`);

  // Тело: заменяем «скелет» внутри <main id="js-service"> на готовый контент
  const body = buildBody(s, article);
  html = html.replace(
    /(<main class="service-page" id="js-service"[^>]*>)[\s\S]*?(<\/main>)/,
    (_, open, close) => `${open}\n${body}\n  ${close}`
  );

  return html;
}

/* ── main ───────────────────────────────────────────────────────────────── */
fs.mkdirSync(OUT_DIR, { recursive: true });
let n = 0;
for (const s of services) {
  const out = path.join(OUT_DIR, `${s.slug}.html`);
  fs.writeFileSync(out, buildPage(s), 'utf8');
  console.log(`  ✓ service/${s.slug}.html`);
  n++;
}
console.log(`\nГотово: ${n} страниц услуг отрендерено в /service/`);
