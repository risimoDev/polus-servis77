'use strict';

/**
 * Hash-based SPA router.
 * Used by admin panel and future catalog SPA.
 * Usage:
 *   Router.on('dashboard', () => showPage('dashboard'));
 *   Router.on('products/:id', ({ id }) => showProduct(id));
 *   Router.start();
 */

const Router = {
  _routes: [],
  _current: null,

  on(pattern, handler) {
    const regex = new RegExp(
      '^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'
    );
    this._routes.push({ pattern, regex, handler });
    return this;
  },

  navigate(path, pushState = true) {
    if (pushState) {
      history.pushState(null, '', '#' + path);
    }
    this._dispatch(path);
  },

  _dispatch(path) {
    const clean = path.replace(/^\//, '');

    for (const route of this._routes) {
      const match = clean.match(route.regex);
      if (match) {
        this._current = clean;
        route.handler(match.groups ?? {});
        return;
      }
    }

    // 404 fallback
    const fallback = this._routes.find(r => r.pattern === '404');
    if (fallback) fallback.handler({});
  },

  start() {
    window.addEventListener('popstate', () => {
      this._dispatch(location.hash.slice(1) || '/');
    });

    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-nav]');
      if (!link) return;
      e.preventDefault();
      this.navigate(link.dataset.nav);
    });

    this._dispatch(location.hash.slice(1) || '/');
    return this;
  },

  current() {
    return this._current;
  },
};

export default Router;
