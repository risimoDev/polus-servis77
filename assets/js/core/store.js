'use strict';

/**
 * Minimal reactive state store.
 * Lightweight alternative to Redux/Vuex for this project's scale.
 * Usage:
 *   Store.set('user', { name: 'Admin' });
 *   Store.get('user');
 *   Store.on('user', (user) => renderHeader(user));
 */

const Store = (() => {
  const state      = {};
  const listeners  = {};

  return {
    get(key) {
      return state[key];
    },

    set(key, value) {
      state[key] = value;
      (listeners[key] ?? []).forEach(fn => fn(value));
    },

    on(key, fn) {
      if (!listeners[key]) listeners[key] = [];
      listeners[key].push(fn);
      return () => this.off(key, fn);
    },

    off(key, fn) {
      if (!listeners[key]) return;
      listeners[key] = listeners[key].filter(f => f !== fn);
    },

    reset(key) {
      delete state[key];
      (listeners[key] ?? []).forEach(fn => fn(undefined));
    },

    // Auth helpers
    setUser(user) {
      this.set('user', user);
      if (user?.token) localStorage.setItem('auth_token', user.token);
    },

    clearUser() {
      this.reset('user');
      localStorage.removeItem('auth_token');
    },

    getUser() {
      return this.get('user');
    },

    isLoggedIn() {
      return !!this.get('user');
    },
  };
})();

export default Store;
